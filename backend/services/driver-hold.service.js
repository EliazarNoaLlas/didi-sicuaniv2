import DriverHold from '../models/DriverHold.js';
import RideRequest from '../models/RideRequest.js';
import { io } from '../server.js';

class DriverHoldService {
  constructor() {
    this.DEFAULT_HOLD_DURATION_MINUTES = 5;
  }

  /**
   * Pone un viaje en espera para un conductor
   */
  async putRideOnHold(rideId, driverId, holdDurationMinutes = null) {
    const duration = holdDurationMinutes || this.DEFAULT_HOLD_DURATION_MINUTES;
    const expiresAt = new Date(Date.now() + duration * 60 * 1000);

    // Verificar que el viaje esté disponible
    const rideRequest = await RideRequest.findById(rideId);
    if (!rideRequest) {
      throw new Error('Viaje no encontrado');
    }

    if (rideRequest.status !== 'bidding_active') {
      throw new Error('Este viaje ya no está disponible');
    }

    // Crear o actualizar hold
    const hold = await DriverHold.findOneAndUpdate(
      {
        driver_id: driverId,
        ride_request_id: rideId,
        status: 'active',
      },
      {
        driver_id: driverId,
        ride_request_id: rideId,
        expires_at: expiresAt,
        status: 'active',
      },
      {
        upsert: true,
        new: true,
      }
    );

    // Notificar al pasajero (opcional)
    if (io) {
      io.to(`user:${rideRequest.passenger_id}`).emit('ride:on_hold', {
        rideRequestId: rideId,
        message: 'Un conductor está considerando tu solicitud',
      });
    }

    return {
      success: true,
      hold_until: expiresAt,
      message: `Viaje puesto en espera hasta ${expiresAt.toLocaleTimeString()}`,
    };
  }

  /**
   * Libera un viaje de espera
   */
  async releaseHold(rideId, driverId) {
    const hold = await DriverHold.findOne({
      driver_id: driverId,
      ride_request_id: rideId,
      status: 'active',
    });

    if (!hold) {
      throw new Error('Viaje no está en espera para este conductor');
    }

    await DriverHold.findByIdAndUpdate(hold._id, {
      status: 'released',
    });

    return { success: true, message: 'Viaje liberado de espera' };
  }

  /**
   * Acepta un viaje que está en espera
   */
  async acceptHeldRide(rideId, driverId) {
    const hold = await DriverHold.findOne({
      driver_id: driverId,
      ride_request_id: rideId,
      status: 'active',
    });

    if (!hold) {
      throw new Error('Viaje no está en espera para este conductor');
    }

    // Marcar hold como aceptado
    await DriverHold.findByIdAndUpdate(hold._id, {
      status: 'accepted',
    });

    // El bid se crea normalmente a través del endpoint de bids
    return { success: true, message: 'Viaje aceptado desde espera' };
  }

  /**
   * Obtiene viajes en espera de un conductor
   */
  async getDriverHeldRides(driverId) {
    const holds = await DriverHold.find({
      driver_id: driverId,
      status: 'active',
      expires_at: { $gt: new Date() },
    })
      .populate('ride_request_id')
      .sort({ created_at: -1 });

    return holds.map((hold) => ({
      ...hold.ride_request_id.toObject(),
      hold_expires_at: hold.expires_at,
      hold_id: hold._id,
    }));
  }

  /**
   * Limpia holds expirados
   */
  async cleanExpiredHolds() {
    const result = await DriverHold.updateMany(
      {
        status: 'active',
        expires_at: { $lt: new Date() },
      },
      {
        status: 'expired',
      }
    );

    return result;
  }
}

export default new DriverHoldService();

