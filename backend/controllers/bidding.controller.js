import pricingService from '../services/pricing.service.js';
import { getRedisClient } from '../config/redis.js';
import RideRequest from '../models/RideRequest.js';
import Bid from '../models/Bid.js';
import { io } from '../server.js';

export const createRideRequest = async (req, res) => {
  try {
    const {
      origin_address,
      destination_address,
      passenger_offered_price,
      vehicle_type,
      payment_method,
    } = req.body;

    const passengerId = req.user.id;

    // Calcular precio sugerido
    // NOTA: El cálculo de precio sugerido debe adaptarse para usar solo direcciones
    const suggestedPrice = await pricingService.calculateSuggestedPrice({
      origin_address,
      destination_address,
      vehicle_type,
    });

    // Validar oferta del pasajero
    const validation = pricingService.validatePassengerOffer(
      suggestedPrice,
      passenger_offered_price
    );

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Price offer is outside acceptable range',
        validation,
      });
    }

    // Calcular métricas del viaje
    // NOTA: Adaptar getRouteMetrics para usar solo direcciones
    const routeMetrics = await pricingService.getRouteMetrics(
      origin_address,
      destination_address
    );

    // Crear solicitud de viaje (guardar en MongoDB)
    const rideRequestData = {
      passenger_id: passengerId,
      origin_address,
      destination_address,
      suggested_price_soles: suggestedPrice,
      passenger_offered_price,
      estimated_distance_km: routeMetrics.distance_km,
      estimated_duration_min: routeMetrics.duration_min,
      vehicle_type,
      payment_method: payment_method || 'cash',
      status: 'bidding_active',
      expires_at: new Date(Date.now() + 120 * 1000), // 2 minutos
    };

    // Guardar en MongoDB
    const rideRequest = await RideRequest.create(rideRequestData);

    // Guardar en Redis para acceso rápido (opcional, no crítico)
    try {
      const redis = getRedisClient();
      if (redis && redis.isOpen) {
        await redis.setEx(
          `ride_request:${rideRequest._id}`,
          120,
          JSON.stringify(rideRequest)
        );
      }
    } catch (redisError) {
      // Redis no es crítico, continuar sin cache
      console.warn('Redis cache no disponible, continuando sin cache');
    }

    // Notificar a conductores cercanos vía Socket.io
    io.to('drivers').emit('ride:new', rideRequest);

    res.status(201).json({
      success: true,
      data: rideRequest,
    });
  } catch (error) {
    console.error('Error creating ride request:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating ride request',
    });
  }
};

export const submitBid = async (req, res) => {
  try {
    const { ride_request_id, bid_type, offered_price } = req.body;
    const driverId = req.user.id;

    // Validar que el usuario es conductor
    if (req.user.userType !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Only drivers can submit bids',
      });
    }

    // Guardar bid en MongoDB
    const bidData = {
      ride_request_id,
      driver_id: driverId,
      bid_type,
      offered_price: bid_type === 'counteroffer' ? offered_price : null,
      status: 'pending',
      created_at: new Date(),
      expires_at: new Date(Date.now() + 30 * 1000), // 30 segundos
    };

    const bid = await Bid.create(bidData);

    // Obtener ride request para notificar al pasajero
    const rideRequest = await RideRequest.findById(ride_request_id);
    if (rideRequest) {
      io.to(`user:${rideRequest.passenger_id}`).emit('bid:received', bid);
    }

    res.status(201).json({
      success: true,
      data: bid,
    });
  } catch (error) {
    console.error('Error submitting bid:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting bid',
    });
  }
};

export const acceptBid = async (req, res) => {
  try {
    const { bidId } = req.params;
    const passengerId = req.user.id;

    // Buscar la oferta
    const bid = await Bid.findById(bidId);
    if (!bid) {
      return res.status(404).json({ success: false, message: 'Bid not found' });
    }

    // Validar que el bid pertenece a un ride del pasajero
    const rideRequest = await RideRequest.findById(bid.ride_request_id);
    if (!rideRequest) {
      return res.status(404).json({ success: false, message: 'Ride request not found' });
    }
    if (rideRequest.passenger_id.toString() !== passengerId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Determinar precio acordado correctamente
    let precioAcordado = rideRequest.passenger_offered_price;
    if (bid.bid_type === 'counteroffer' && bid.offered_price) {
      precioAcordado = bid.offered_price;
    }

    // Actualizar estado del ride request y guardar precio acordado
    rideRequest.status = 'matched';
    rideRequest.matched_driver_id = bid.driver_id;
    rideRequest.matched_at = new Date();
    rideRequest.final_agreed_price = precioAcordado;
    await rideRequest.save();

    // Actualizar estado del bid
    bid.status = 'accepted';
    bid.responded_at = new Date();
    await bid.save();

    // Notificar al pasajero (evento socket)
    io.to(`user:${rideRequest.passenger_id}`).emit('ride:accepted', {
      ...bid.toObject(),
      precioAcordado,
      agreedPrice: precioAcordado,
      driverName: bid.driver_id?.name || '',
      tipoVehiculo: rideRequest.vehicle_type,
      // Puedes agregar más datos relevantes aquí
    });

    res.json({
      success: true,
      message: 'Bid accepted',
      precioAcordado,
      agreedPrice: precioAcordado,
    });
  } catch (error) {
    console.error('Error accepting bid:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting bid',
    });
  }
};

export const rejectBid = async (req, res) => {
  try {
    const { bidId } = req.params;

    // TODO: Implementar lógica de rechazar bid

    res.json({
      success: true,
      message: 'Bid rejected',
    });
  } catch (error) {
    console.error('Error rejecting bid:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting bid',
    });
  }
};

export const getBidsForRide = async (req, res) => {
  try {
    const { rideId } = req.params;

    // TODO: Obtener todos los bids de un ride request

    res.json({
      success: true,
      data: [],
    });
  } catch (error) {
    console.error('Error getting bids:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting bids',
    });
  }
};

