import { getRedisClient } from '../config/redis.js';
import pricingService from './pricing.service.js';
import geospatialUtils from '../utils/geospatial.js';
import RideRequest from '../models/RideRequest.js';
import Bid from '../models/Bid.js';
import User from '../models/User.js';
import { io } from '../server.js';

class BiddingService {
  constructor() {
    this.BIDDING_TIMEOUT = 500; // segundos para recibir bids
    this.BID_EXPIRY = 500; // segundos para que conductor responda
    this.MAX_NEGOTIATION_ROUNDS = 2;
    this.NOTIFICATION_RADIUS_KM = 5; // Radio de notificación inicial
    this.MAX_NOTIFICATION_RADIUS_KM = 15; // Radio máximo si no hay bids
  }

  async createRideRequest(passengerId, rideData) {
    const {
      origin_lat,
      origin_lon,
      origin_address,
      destination_lat,
      destination_lon,
      destination_address,
      passenger_offered_price,
      vehicle_type,
      payment_method,
    } = rideData;

    // 1. Calcular precio sugerido del sistema
    const suggestedPrice = await pricingService.calculateSuggestedPrice({
      origin_lat,
      origin_lon,
      destination_lat,
      destination_lon,
      vehicle_type,
    });

    // 2. Validar oferta del pasajero
    const validation = pricingService.validatePassengerOffer(
      suggestedPrice,
      passenger_offered_price
    );

    if (!validation.isValid) {
      throw new Error(
        `Precio ofrecido fuera de rango. Rango aceptable: S/${validation.minAcceptable.toFixed(2)} - S/${validation.maxAcceptable.toFixed(2)}`
      );
    }

    // 3. Calcular métricas del viaje
    const routeMetrics = await pricingService.getRouteMetrics(
      origin_lat,
      origin_lon,
      destination_lat,
      destination_lon
    );

    // 4. Crear solicitud de viaje en MongoDB
    const expiresAt = new Date(Date.now() + this.BIDDING_TIMEOUT * 1000);

    const rideRequestData = {
      passenger_id: passengerId,
      origin_lat,
      origin_lon,
      origin_address,
      destination_lat,
      destination_lon,
      destination_address,
      suggested_price_soles: suggestedPrice,
      passenger_offered_price,
      estimated_distance_km: routeMetrics.distance_km,
      estimated_duration_min: routeMetrics.duration_min,
      vehicle_type,
      payment_method: payment_method || 'cash',
      status: 'bidding_active',
      expires_at: expiresAt,
    };

    const rideRequest = await RideRequest.create(rideRequestData);

    // 5. Guardar en Redis para acceso rápido (opcional, no crítico)
    try {
      const redis = getRedisClient();
      if (redis && redis.isOpen) {
        await redis.setEx(
          `ride_request:${rideRequest._id}`,
          this.BIDDING_TIMEOUT,
          JSON.stringify(rideRequest)
        );
      }
    } catch (redisError) {
      // Redis no es crítico, continuar sin cache
      console.warn('Redis cache no disponible, continuando sin cache');
    }

    // 6. Notificar a conductores cercanos
    await this.notifyNearbyDrivers(rideRequest);

    // 7. Programar timeout automático
    setTimeout(
      () => this.handleBiddingTimeout(rideRequest._id.toString()),
      this.BIDDING_TIMEOUT * 1000
    );

    return {
      rideRequest,
      suggestedPrice,
      validation,
    };
  }

  async notifyNearbyDrivers(rideRequest, radiusKm = null) {
    // Buscar TODOS los conductores disponibles (sin filtrar por distancia)
    // Solo filtrar por tipo de vehículo y estado online/disponible
    const allDrivers = await User.find({
      userType: 'driver',
      'driverInfo.isOnline': true,
      'driverInfo.isAvailable': true,
    });

    // Filtrar por tipo de vehículo si es específico
    // Si el pasajero solicita "taxi", solo notificar a conductores de taxi
    // Si el pasajero solicita "mototaxi", solo notificar a conductores de mototaxi
    // Si el pasajero solicita "any", notificar a todos los conductores
    let filteredDrivers = allDrivers;
    if (rideRequest.vehicle_type !== 'any') {
      filteredDrivers = allDrivers.filter(
        (driver) => driver.driverInfo?.vehicleType === rideRequest.vehicle_type
      );
    }

    // Calcular información adicional para cada conductor (distancia, ETA, etc.)
    const driversWithInfo = filteredDrivers.map((driver) => {
      let distance_km = null;
      let eta_minutes = null;

      // Si el conductor tiene ubicación, calcular distancia
      if (
        driver.driverInfo?.currentLatitude &&
        driver.driverInfo?.currentLongitude
      ) {
        distance_km = geospatialUtils.haversineDistance(
          rideRequest.origin_lat,
          rideRequest.origin_lon,
          driver.driverInfo.currentLatitude,
          driver.driverInfo.currentLongitude
        );

        // Calcular ETA (estimado basado en distancia)
        const averageSpeedKmh = 25; // Velocidad promedio en ciudad
        eta_minutes = Math.ceil((distance_km / averageSpeedKmh) * 60);
      }

      return {
        driver_id: driver._id.toString(),
        driver_lat: driver.driverInfo?.currentLatitude || null,
        driver_lon: driver.driverInfo?.currentLongitude || null,
        distance_km: distance_km ? Math.round(distance_km * 100) / 100 : null,
        eta_minutes: eta_minutes,
        rating: driver.driverInfo?.rating || 5.0,
        vehicle_type: driver.driverInfo?.vehicleType,
      };
    });

    // Notificar a TODOS los conductores filtrados vía Socket.io
    // Esto asegura que todos los conductores del tipo de vehículo solicitado
    // reciban la notificación, independientemente de su ubicación
    if (io) {
      // Notificar a la room global de conductores
      io.to('drivers').emit('ride:new', {
        _id: rideRequest._id.toString(),
        rideRequestId: rideRequest._id.toString(),
        passenger_id: rideRequest.passenger_id.toString(),
        origin: {
          lat: rideRequest.origin_lat,
          lon: rideRequest.origin_lon,
          address: rideRequest.origin_address,
        },
        destination: {
          lat: rideRequest.destination_lat,
          lon: rideRequest.destination_lon,
          address: rideRequest.destination_address,
        },
        passenger_offered_price: rideRequest.passenger_offered_price,
        suggested_price_soles: rideRequest.suggested_price_soles,
        offeredPrice: rideRequest.passenger_offered_price,
        suggestedPrice: rideRequest.suggested_price_soles,
        estimated_distance_km: rideRequest.estimated_distance_km,
        estimated_duration_min: rideRequest.estimated_duration_min,
        distance: rideRequest.estimated_distance_km,
        duration: rideRequest.estimated_duration_min,
        vehicle_type: rideRequest.vehicle_type,
        payment_method: rideRequest.payment_method,
        paymentMethod: rideRequest.payment_method,
        status: rideRequest.status,
        expires_at: rideRequest.expires_at,
        expiresAt: rideRequest.expires_at,
        created_at: rideRequest.createdAt,
      });

      // También notificar individualmente a cada conductor
      // para asegurar que reciban la notificación incluso si no están en la room 'drivers'
      filteredDrivers.forEach((driver) => {
        io.to(`driver:${driver._id.toString()}`).emit('ride:new', {
          _id: rideRequest._id.toString(),
          rideRequestId: rideRequest._id.toString(),
          passenger_id: rideRequest.passenger_id.toString(),
          origin: {
            lat: rideRequest.origin_lat,
            lon: rideRequest.origin_lon,
            address: rideRequest.origin_address,
          },
          destination: {
            lat: rideRequest.destination_lat,
            lon: rideRequest.destination_lon,
            address: rideRequest.destination_address,
          },
          passenger_offered_price: rideRequest.passenger_offered_price,
          suggested_price_soles: rideRequest.suggested_price_soles,
          offeredPrice: rideRequest.passenger_offered_price,
          suggestedPrice: rideRequest.suggested_price_soles,
          estimated_distance_km: rideRequest.estimated_distance_km,
          estimated_duration_min: rideRequest.estimated_duration_min,
          distance: rideRequest.estimated_distance_km,
          duration: rideRequest.estimated_duration_min,
          vehicle_type: rideRequest.vehicle_type,
          payment_method: rideRequest.payment_method,
          paymentMethod: rideRequest.payment_method,
          status: rideRequest.status,
          expires_at: rideRequest.expires_at,
          expiresAt: rideRequest.expires_at,
          created_at: rideRequest.createdAt,
        });
      });
    }

    console.log(
      `🔔 Notificados ${filteredDrivers.length} conductores (tipo: ${rideRequest.vehicle_type}) para viaje ${rideRequest._id}`
    );

    return driversWithInfo;
  }

  async submitBid(driverId, rideRequestId, bidType, offeredPrice = null) {
    // 1. Validar que el viaje aún esté aceptando bids
    const rideRequest = await RideRequest.findById(rideRequestId);

    if (!rideRequest) {
      throw new Error('Viaje no encontrado');
    }

    if (rideRequest.status !== 'bidding_active') {
      throw new Error('Este viaje ya no está aceptando ofertas');
    }

    if (new Date() > new Date(rideRequest.expires_at)) {
      throw new Error('El tiempo para ofertar ha expirado');
    }

    // 2. Obtener información del conductor
    const driver = await User.findById(driverId);

    if (!driver || driver.userType !== 'driver') {
      throw new Error('Usuario no es conductor');
    }

    // 3. Calcular distancia y ETA del conductor al pickup usando cálculos geoespaciales
    const driverLat = driver.driverInfo?.currentLatitude || 0;
    const driverLon = driver.driverInfo?.currentLongitude || 0;

    const distance = geospatialUtils.haversineDistance(
      driverLat,
      driverLon,
      rideRequest.origin_lat,
      rideRequest.origin_lon
    );

    // Calcular ETA basado en distancia (velocidad promedio 25 km/h en ciudad)
    const averageSpeedKmh = 25;
    const eta_minutes = Math.ceil((distance / averageSpeedKmh) * 60);

    const driverMetrics = {
      distance_km: Math.round(distance * 100) / 100,
      eta_min: eta_minutes,
    };

    // 4. Validar tipo de bid
    if (bidType === 'counteroffer' && !offeredPrice) {
      throw new Error('Debe especificar un precio para contraoferta');
    }

    if (bidType === 'accept') {
      offeredPrice = rideRequest.passenger_offered_price;
    }

    // 5. Crear bid en MongoDB
    const bidExpiresAt = new Date(Date.now() + this.BID_EXPIRY * 1000);

    const bidData = {
      ride_request_id: rideRequestId,
      driver_id: driverId,
      bid_type: bidType,
      offered_price: bidType === 'accept' ? rideRequest.passenger_offered_price : offeredPrice,
      driver_distance_km: driverMetrics.distance_km,
      driver_eta_min: driverMetrics.eta_min,
      driver_rating: driver.driverInfo?.rating || 5.0,
      status: 'pending',
      expires_at: bidExpiresAt,
    };

    const bid = await Bid.create(bidData);

    // 6. Notificar al pasajero vía Socket.io
    if (io) {
      // Notificar sobre el bid recibido
      io.to(`user:${rideRequest.passenger_id}`).emit('bid:received', {
        ...bid.toObject(),
        driver_name: driver.name,
        vehicle_type: driver.driverInfo?.vehicleType,
        total_trips: driver.driverInfo?.totalRides || 0,
        driver_rating: driver.driverInfo?.rating || 5.0,
      });

      // Si es "accept", notificar específicamente que fue aceptado con información completa
      if (bidType === 'accept') {
        io.to(`user:${rideRequest.passenger_id}`).emit('ride:accepted', {
          rideRequestId: rideRequestId.toString(),
          bidId: bid._id.toString(),
          driverId: driverId.toString(),
          driverName: driver.name,
          driverEmail: driver.email,
          driverPhone: driver.phone,
          driverRating: driver.driverInfo?.rating || 5.0,
          driverTotalRides: driver.driverInfo?.totalRides || 0,
          vehicleType: driver.driverInfo?.vehicleType,
          vehiclePlate: driver.driverInfo?.vehiclePlate,
          vehicleModel: driver.driverInfo?.vehicleModel,
          vehicleColor: driver.driverInfo?.vehicleColor,
          driverDistanceKm: driverMetrics.distance_km,
          driverEtaMin: driverMetrics.eta_min,
          agreedPrice: bid.offered_price,
          originAddress: rideRequest.origin_address,
          destinationAddress: rideRequest.destination_address,
          message: '¡Conductor aceptó tu solicitud!',
          timestamp: new Date(),
        });
      }
    }

    // 7. Si es "accept", evaluar auto-match
    if (bidType === 'accept') {
      await this.evaluateAutoMatch(rideRequestId, bid);
    }

    return bid;
  }

  async evaluateAutoMatch(rideRequestId, newBid) {
    // Obtener todos los bids tipo "accept" para este viaje
    const bids = await Bid.find({
      ride_request_id: rideRequestId,
      bid_type: 'accept',
      status: 'pending',
    })
      .populate('driver_id')
      .sort({ created_at: 1 });

    if (bids.length === 0) return;

    // Calcular score de matching para cada bid
    const scoredBids = await Promise.all(
      bids.map(async (bid) => {
        const driver = bid.driver_id;
        const score = this.calculateMatchingScore(bid, driver);
        return { bid, score };
      })
    );

    // Ordenar por matching score (mayor a menor)
    scoredBids.sort((a, b) => b.score - a.score);

    const bestBid = scoredBids[0];

    // Auto-asignar al mejor conductor si su score supera threshold
    if (bestBid.score >= 0.75) {
      await this.assignRideToDriver(
        rideRequestId,
        bestBid.bid.driver_id._id.toString(),
        bestBid.bid._id.toString()
      );
    }
  }

  calculateMatchingScore(bid, driver) {
    // Score basado en múltiples factores:
    // 40% - Proximidad (menor distancia = mejor)
    // 30% - Rating del conductor
    // 20% - Tiempo de respuesta (más rápido = mejor)
    // 10% - Experiencia (total de viajes)

    const proximityScore =
      Math.max(0, 1 - (bid.driver_distance_km / 10)) * 0.4;
    const ratingScore = ((driver.driverInfo?.rating || 5) / 5.0) * 0.3;

    const responseTimeSeconds =
      (Date.now() - new Date(bid.created_at).getTime()) / 1000;
    const responseScore = Math.max(0, 1 - responseTimeSeconds / 60) * 0.2;

    const experienceScore =
      Math.min(1, (driver.driverInfo?.totalRides || 0) / 500) * 0.1;

    return proximityScore + ratingScore + responseScore + experienceScore;
  }

  async assignRideToDriver(rideRequestId, driverId, bidId) {
    const now = new Date();

    // 1. Actualizar ride request con driver asignado
    const bid = await Bid.findById(bidId);
    const rideRequest = await RideRequest.findById(rideRequestId);

    await RideRequest.findByIdAndUpdate(rideRequestId, {
      status: 'matched',
      matched_driver_id: driverId,
      matched_at: now,
      final_agreed_price: bid.offered_price,
    });

    // 2. Marcar bid como aceptado
    await Bid.findByIdAndUpdate(bidId, {
      status: 'accepted',
      responded_at: now,
    });

    // 3. Rechazar todos los otros bids
    await Bid.updateMany(
      {
        ride_request_id: rideRequestId,
        _id: { $ne: bidId },
      },
      {
        status: 'rejected',
      }
    );

    // 4. Marcar conductor como no disponible
    await User.findByIdAndUpdate(driverId, {
      'driverInfo.isAvailable': false,
    });

    // 5. Notificar vía Socket.io
    if (io) {
      io.to(`user:${driverId}`).emit('ride:assigned', {
        rideRequestId,
        message: '¡Viaje confirmado! Dirígete al punto de recogida',
      });

      io.to(`user:${rideRequest.passenger_id}`).emit('ride:accepted', {
        rideRequestId,
        driverId,
        message: '¡Conductor asignado! Está en camino',
      });
    }

    console.log(`✅ Viaje ${rideRequestId} asignado a conductor ${driverId}`);
  }

  async handleCounteroffer(passengerId, bidId, action, newPrice = null) {
    const bid = await Bid.findById(bidId).populate('ride_request_id');

    if (!bid) throw new Error('Bid no encontrado');

    const rideRequest = bid.ride_request_id;

    // Validar que el pasajero sea el dueño del viaje
    if (rideRequest.passenger_id.toString() !== passengerId) {
      throw new Error('No autorizado');
    }

    if (action === 'accept') {
      // Aceptar contraoferta del conductor
      await this.assignRideToDriver(
        rideRequest._id.toString(),
        bid.driver_id.toString(),
        bidId
      );
    } else if (action === 'counter') {
      // Pasajero hace contraoferta
      // TODO: Implementar tabla de negociaciones
      if (io) {
        io.to(`user:${bid.driver_id}`).emit('counteroffer:from_passenger', {
          bidId,
          newPrice,
          message: `El pasajero ofrece S/${newPrice.toFixed(2)}`,
        });
      }
    } else if (action === 'reject') {
      // Rechazar contraoferta
      await Bid.findByIdAndUpdate(bidId, {
        status: 'rejected',
        responded_at: new Date(),
      });

      if (io) {
        io.to(`user:${bid.driver_id}`).emit('counteroffer:rejected', {
          message: 'El pasajero rechazó tu contraoferta',
        });
      }
    }
  }

  async handleBiddingTimeout(rideRequestId) {
    const rideRequest = await RideRequest.findById(rideRequestId);

    if (!rideRequest || rideRequest.status !== 'bidding_active') {
      return; // Ya fue asignado o cancelado
    }

    // Verificar si hay bids pendientes
    const bidsCount = await Bid.countDocuments({
      ride_request_id: rideRequestId,
      status: 'pending',
    });

    if (bidsCount === 0) {
      // No hay bids - expandir radio de búsqueda
      if (this.NOTIFICATION_RADIUS_KM < this.MAX_NOTIFICATION_RADIUS_KM) {
        console.log(
          `⚠️ Expandiendo radio de búsqueda para viaje ${rideRequestId}`
        );
        await this.notifyNearbyDrivers(
          rideRequest,
          this.NOTIFICATION_RADIUS_KM + 5
        );

        // Extender timeout
        await RideRequest.findByIdAndUpdate(rideRequestId, {
          expires_at: new Date(Date.now() + 60000),
        });

        setTimeout(
          () => this.handleBiddingTimeout(rideRequestId),
          60000
        );
      } else {
        // Cancelar por falta de conductores
        await this.cancelRideRequest(rideRequestId, 'no_drivers_available');
      }
    }
  }

  async cancelRideRequest(rideRequestId, reason) {
    await RideRequest.findByIdAndUpdate(rideRequestId, {
      status: 'cancelled',
    });

    const rideRequest = await RideRequest.findById(rideRequestId);

    if (io && rideRequest) {
      io.to(`user:${rideRequest.passenger_id}`).emit('ride:cancelled', {
        reason,
        message:
          reason === 'no_drivers_available'
            ? 'No hay conductores disponibles en este momento'
            : 'Tu viaje ha sido cancelado',
      });
    }

    console.log(`❌ Viaje ${rideRequestId} cancelado: ${reason}`);
  }
}

export default new BiddingService();

