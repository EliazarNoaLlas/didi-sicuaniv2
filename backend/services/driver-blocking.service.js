import DriverBlock from '../models/DriverBlock.js';

class DriverBlockingService {
  /**
   * Bloquea un usuario específico para un conductor
   */
  async blockUser(driverId, userId, reason = null, isPermanent = false) {
    const expiresAt = isPermanent
      ? null
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días

    const block = await DriverBlock.create({
      driver_id: driverId,
      blocked_user_id: userId,
      block_type: 'user',
      reason,
      is_permanent: isPermanent,
      expires_at: expiresAt,
    });

    return block;
  }

  /**
   * Bloquea una zona específica
   */
  async blockZone(driverId, address, reason = null, durationHours = 24) {
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    const block = await DriverBlock.create({
      driver_id: driverId,
      blocked_address: address,
      block_type: 'zone',
      reason,
      expires_at: expiresAt,
    });

    return block;
  }

  /**
   * Desbloquea un usuario
   */
  async unblockUser(driverId, userId) {
    await DriverBlock.deleteMany({
      driver_id: driverId,
      blocked_user_id: userId,
      block_type: 'user',
    });

    return { success: true };
  }

  /**
   * Verifica si un viaje está bloqueado para un conductor
   */
  async isRideBlocked(driverId, rideRequest) {
    // Verificar bloqueo de usuario
    const userBlock = await DriverBlock.findOne({
      driver_id: driverId,
      blocked_user_id: rideRequest.passenger_id,
      block_type: 'user',
      $or: [{ expires_at: null }, { expires_at: { $gt: new Date() } }],
    });

    if (userBlock) {
      return { blocked: true, reason: 'user_blocked', block: userBlock };
    }

    // Verificar bloqueo de zona origen
    if (rideRequest.origin_address) {
      const zoneBlock = await DriverBlock.findOne({
        driver_id: driverId,
        blocked_address: rideRequest.origin_address,
        block_type: 'zone',
        $or: [{ expires_at: null }, { expires_at: { $gt: new Date() } }],
      });

      if (zoneBlock) {
        return { blocked: true, reason: 'zone_blocked', block: zoneBlock };
      }
    }

    return { blocked: false };
  }

  /**
   * Obtiene lista de bloqueos activos de un conductor
   */
  async getDriverBlocks(driverId) {
    const blocks = await DriverBlock.find({
      driver_id: driverId,
      $or: [{ expires_at: null }, { expires_at: { $gt: new Date() } }],
    })
      .populate('blocked_user_id', 'name email')
      .sort({ created_at: -1 });

    return blocks;
  }

  /**
   * Limpia bloqueos expirados
   */
  async cleanExpiredBlocks() {
    const result = await DriverBlock.deleteMany({
      expires_at: { $lt: new Date() },
      is_permanent: false,
    });

    return result;
  }
}

export default new DriverBlockingService();

