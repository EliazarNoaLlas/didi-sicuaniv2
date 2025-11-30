import RideRequest from '../models/RideRequest.js';
import User from '../models/User.js';
import geospatialUtils from '../utils/geospatial.js';
import driverBlockingService from '../services/driver-blocking.service.js';

/**
 * Obtener cola de viajes disponibles para el conductor
 * Muestra todas las solicitudes activas que coinciden con el tipo de vehículo del conductor
 */
export const getQueue = async (req, res) => {
  try {
    const driverId = req.user.id;
    const driver = await User.findById(driverId);

    if (!driver || driver.userType !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Solo conductores pueden acceder a la cola',
      });
    }

    const driverVehicleType = driver.driverInfo?.vehicleType;

    // Buscar todas las solicitudes activas
    const activeRides = await RideRequest.find({
      status: 'bidding_active',
      expires_at: { $gt: new Date() }, // Solo solicitudes que no han expirado
    }).populate('passenger_id', 'name email phone');

    // Filtrar solicitudes según tipo de vehículo y calcular distancias
    const ridesWithData = activeRides
      .map((ride) => {
        // Si el conductor tiene un tipo de vehículo específico
        // Solo mostrar solicitudes que coincidan con su tipo o que acepten "any"
        if (driverVehicleType) {
          if (
            ride.vehicle_type !== 'any' &&
            ride.vehicle_type !== driverVehicleType
          ) {
            return null; // No coincide con el tipo de vehículo del conductor
          }
        }

        // Calcular distancia si el conductor tiene ubicación
        let distance_km = null;
        let eta_minutes = null;

        if (
          driver.driverInfo?.currentLatitude &&
          driver.driverInfo?.currentLongitude
        ) {
          distance_km = geospatialUtils.haversineDistance(
            ride.origin_lat,
            ride.origin_lon,
            driver.driverInfo.currentLatitude,
            driver.driverInfo.currentLongitude
          );

          // Calcular ETA (estimado basado en distancia)
          const averageSpeedKmh = 25; // Velocidad promedio en ciudad
          eta_minutes = Math.ceil((distance_km / averageSpeedKmh) * 60);
        }

        return {
          _id: ride._id,
          ride: ride, // Guardar el objeto completo para verificación de bloqueo
          passenger: {
            id: ride.passenger_id._id,
            name: ride.passenger_id.name,
            email: ride.passenger_id.email,
            phone: ride.passenger_id.phone,
          },
          origin: {
            lat: ride.origin_lat,
            lon: ride.origin_lon,
            address: ride.origin_address,
          },
          destination: {
            lat: ride.destination_lat,
            lon: ride.destination_lon,
            address: ride.destination_address,
          },
          pricing: {
            passenger_offered_price: ride.passenger_offered_price,
            suggested_price: ride.suggested_price_soles,
          },
          trip: {
            distance_km: ride.estimated_distance_km,
            duration_min: ride.estimated_duration_min,
          },
          vehicle_type: ride.vehicle_type,
          payment_method: ride.payment_method,
          distance_from_driver_km: distance_km
            ? Math.round(distance_km * 100) / 100
            : null,
          eta_minutes: eta_minutes,
          expires_at: ride.expires_at,
          created_at: ride.createdAt,
        };
      })
      .filter((ride) => ride !== null);

    // Verificar bloqueos para cada viaje (operación asíncrona)
    const ridesAfterBlockCheck = await Promise.all(
      ridesWithData.map(async (rideData) => {
        // Verificar si el viaje está bloqueado para este conductor
        const blockCheck = await driverBlockingService.isRideBlocked(
          driverId,
          rideData.ride
        );

        if (blockCheck.blocked) {
          return null; // No mostrar viajes bloqueados
        }

        // Remover el objeto ride completo antes de retornar
        const { ride, ...rideInfo } = rideData;
        return rideInfo;
      })
    );

    // Filtrar nulos y ordenar
    const availableRides = ridesAfterBlockCheck
      .filter((ride) => ride !== null)
      .sort((a, b) => {
        // Ordenar por: 1) Distancia (más cercanos primero), 2) Tiempo de creación
        if (a.distance_from_driver_km !== null && b.distance_from_driver_km !== null) {
          return a.distance_from_driver_km - b.distance_from_driver_km;
        }
        if (a.distance_from_driver_km !== null) return -1;
        if (b.distance_from_driver_km !== null) return 1;
        return new Date(b.created_at) - new Date(a.created_at);
      });

    res.json({
      success: true,
      data: availableRides,
      count: availableRides.length,
    });
  } catch (error) {
    console.error('Error obteniendo cola de viajes:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo cola de viajes',
      error: error.message,
    });
  }
};

