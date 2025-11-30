import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { getQueue } from '../controllers/driver.controller.js';
import driverBlockingService from '../services/driver-blocking.service.js';
import driverHoldService from '../services/driver-hold.service.js';
import biddingService from '../services/bidding.service.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('driver'));

/**
 * @swagger
 * /api/drivers/queue:
 *   get:
 *     summary: Obtener cola de viajes disponibles para conductores
 *     tags: [Conductores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de viajes disponibles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 507f1f77bcf86cd799439011
 *                       passenger:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                           phone:
 *                             type: string
 *                       origin:
 *                         type: object
 *                         properties:
 *                           lat:
 *                             type: number
 *                           lon:
 *                             type: number
 *                           address:
 *                             type: string
 *                       destination:
 *                         type: object
 *                         properties:
 *                           lat:
 *                             type: number
 *                           lon:
 *                             type: number
 *                           address:
 *                             type: string
 *                       pricing:
 *                         type: object
 *                         properties:
 *                           passenger_offered_price:
 *                             type: number
 *                           suggested_price:
 *                             type: number
 *                       trip:
 *                         type: object
 *                         properties:
 *                           distance_km:
 *                             type: number
 *                           duration_min:
 *                             type: number
 *                       vehicle_type:
 *                         type: string
 *                         enum: [taxi, mototaxi, any]
 *                       payment_method:
 *                         type: string
 *                       distance_from_driver_km:
 *                         type: number
 *                         nullable: true
 *                       eta_minutes:
 *                         type: number
 *                         nullable: true
 *                       expires_at:
 *                         type: string
 *                         format: date-time
 *                 count:
 *                   type: number
 *                   example: 5
 */
router.get('/queue', getQueue);

/**
 * @swagger
 * /api/drivers/hold:
 *   post:
 *     summary: Poner un viaje en espera
 *     tags: [Conductores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ride_id
 *             properties:
 *               ride_id:
 *                 type: string
 *               duration_minutes:
 *                 type: number
 *                 default: 5
 *     responses:
 *       200:
 *         description: Viaje puesto en espera
 */
router.post('/hold', async (req, res) => {
  try {
    const driverId = req.user.id;
    const { ride_id, duration_minutes } = req.body;

    const result = await driverHoldService.putRideOnHold(
      ride_id,
      driverId,
      duration_minutes
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/drivers/release-hold:
 *   post:
 *     summary: Liberar un viaje de espera
 *     tags: [Conductores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ride_id
 *             properties:
 *               ride_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Viaje liberado
 */
router.post('/release-hold', async (req, res) => {
  try {
    const driverId = req.user.id;
    const { ride_id } = req.body;

    const result = await driverHoldService.releaseHold(ride_id, driverId);

    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/drivers/held-rides:
 *   get:
 *     summary: Obtener viajes en espera del conductor
 *     tags: [Conductores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de viajes en espera
 */
router.get('/held-rides', async (req, res) => {
  try {
    const driverId = req.user.id;
    const heldRides = await driverHoldService.getDriverHeldRides(driverId);

    res.json({
      success: true,
      data: heldRides,
      count: heldRides.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/drivers/block-user:
 *   post:
 *     summary: Bloquear un usuario
 *     tags: [Conductores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *             properties:
 *               user_id:
 *                 type: string
 *               reason:
 *                 type: string
 *               is_permanent:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Usuario bloqueado
 */
router.post('/block-user', async (req, res) => {
  try {
    const driverId = req.user.id;
    const { user_id, reason, is_permanent } = req.body;

    const block = await driverBlockingService.blockUser(
      driverId,
      user_id,
      reason,
      is_permanent || false
    );

    res.json({
      success: true,
      data: block,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/drivers/block-zone:
 *   post:
 *     summary: Bloquear una zona
 *     tags: [Conductores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *             properties:
 *               address:
 *                 type: string
 *               reason:
 *                 type: string
 *               duration_hours:
 *                 type: number
 *                 default: 24
 *     responses:
 *       200:
 *         description: Zona bloqueada
 */
router.post('/block-zone', async (req, res) => {
  try {
    const driverId = req.user.id;
    const { address, reason, duration_hours } = req.body;

    const block = await driverBlockingService.blockZone(
      driverId,
      address,
      reason,
      duration_hours || 24
    );

    res.json({
      success: true,
      data: block,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/drivers/blocks:
 *   get:
 *     summary: Obtener bloqueos del conductor
 *     tags: [Conductores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de bloqueos
 */
router.get('/blocks', async (req, res) => {
  try {
    const driverId = req.user.id;
    const blocks = await driverBlockingService.getDriverBlocks(driverId);

    res.json({
      success: true,
      data: blocks,
      count: blocks.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/drivers/unblock-user:
 *   post:
 *     summary: Desbloquear un usuario
 *     tags: [Conductores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *             properties:
 *               user_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usuario desbloqueado
 */
router.post('/unblock-user', async (req, res) => {
  try {
    const driverId = req.user.id;
    const { user_id } = req.body;

    const result = await driverBlockingService.unblockUser(driverId, user_id);

    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;

