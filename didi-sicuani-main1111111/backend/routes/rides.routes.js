import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware.js';
import biddingService from '../services/bidding.service.js';
import pricingService from '../services/pricing.service.js';
import geospatialUtils from '../utils/geospatial.js';

const router = express.Router();

/**
 * @swagger
 * /api/rides/calculate-price:
 *   post:
 *     summary: Calcular precio sugerido sin crear viaje
 *     tags: [Viajes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - origin_lat
 *               - origin_lon
 *               - destination_lat
 *               - destination_lon
 *             properties:
 *               origin_lat:
 *                 type: number
 *                 example: -14.2694
 *               origin_lon:
 *                 type: number
 *                 example: -71.2256
 *               destination_lat:
 *                 type: number
 *                 example: -14.2700
 *               destination_lon:
 *                 type: number
 *                 example: -71.2260
 *               vehicle_type:
 *                 type: string
 *                 enum: [taxi, mototaxi, any]
 *                 example: taxi
 *     responses:
 *       200:
 *         description: Precio calculado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     suggested_price:
 *                       type: number
 *                       example: 15.50
 *                     distance_km:
 *                       type: number
 *                       example: 2.5
 *                     estimated_duration_min:
 *                       type: number
 *                       example: 8
 *                     price_range:
 *                       type: object
 *                       properties:
 *                         min:
 *                           type: number
 *                           example: 10.85
 *                         max:
 *                           type: number
 *                           example: 20.15
 */
router.post(
  '/calculate-price',
  authenticate,
  [
    body('origin_lat').isFloat().withMessage('Origin latitude is required'),
    body('origin_lon').isFloat().withMessage('Origin longitude is required'),
    body('destination_lat').isFloat().withMessage('Destination latitude is required'),
    body('destination_lon').isFloat().withMessage('Destination longitude is required'),
    body('vehicle_type').optional().isIn(['taxi', 'mototaxi', 'any']),
  ],
  async (req, res) => {
    try {
      const {
        origin_lat,
        origin_lon,
        destination_lat,
        destination_lon,
        vehicle_type,
      } = req.body;

      const suggestedPrice = await pricingService.calculateSuggestedPrice({
        origin_lat,
        origin_lon,
        destination_lat,
        destination_lon,
        vehicle_type: vehicle_type || 'taxi',
      });

      const metrics = await pricingService.getRouteMetrics(
        origin_lat,
        origin_lon,
        destination_lat,
        destination_lon
      );

      res.json({
        success: true,
        data: {
          suggested_price: suggestedPrice,
          distance_km: metrics.distance_km,
          estimated_duration_min: metrics.duration_min,
          price_range: {
            min: Math.round(suggestedPrice * 0.7 * 2) / 2, // -30%
            max: Math.round(suggestedPrice * 1.3 * 2) / 2, // +30%
          },
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/rides/request:
 *   post:
 *     summary: Crear solicitud de viaje con precio propuesto por pasajero
 *     tags: [Viajes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - origin_lat
 *               - origin_lon
 *               - destination_lat
 *               - destination_lon
 *               - passenger_offered_price
 *               - vehicle_type
 *             properties:
 *               origin_lat:
 *                 type: number
 *                 example: -14.2694
 *               origin_lon:
 *                 type: number
 *                 example: -71.2256
 *               origin_address:
 *                 type: string
 *                 example: Plaza Principal, Sicuani
 *               destination_lat:
 *                 type: number
 *                 example: -14.2700
 *               destination_lon:
 *                 type: number
 *                 example: -71.2260
 *               destination_address:
 *                 type: string
 *                 example: Mercado Central, Sicuani
 *               passenger_offered_price:
 *                 type: number
 *                 example: 12.00
 *               vehicle_type:
 *                 type: string
 *                 enum: [taxi, mototaxi, any]
 *                 example: taxi
 *               payment_method:
 *                 type: string
 *                 enum: [cash, card, wallet]
 *                 example: cash
 *     responses:
 *       201:
 *         description: Solicitud de viaje creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     rideRequest:
 *                       $ref: '#/components/schemas/RideRequest'
 *                     suggestedPrice:
 *                       type: number
 *                       example: 15.50
 */
router.post(
  '/request',
  authenticate,
  [
    body('origin_lat').isFloat().withMessage('Origin latitude is required'),
    body('origin_lon').isFloat().withMessage('Origin longitude is required'),
    body('destination_lat').isFloat().withMessage('Destination latitude is required'),
    body('destination_lon').isFloat().withMessage('Destination longitude is required'),
    body('passenger_offered_price').isFloat({ min: 0 }).withMessage('Valid price is required'),
    body('vehicle_type').isIn(['taxi', 'mototaxi', 'any']).withMessage('Valid vehicle type is required'),
  ],
  async (req, res) => {
    try {
      const passengerId = req.user.id;
      const rideData = req.body;

      const result = await biddingService.createRideRequest(passengerId, rideData);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/rides/{id}:
 *   get:
 *     summary: Obtener detalles de un viaje con sus ofertas
 *     tags: [Viajes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del viaje (MongoDB ObjectId)
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Detalles del viaje y ofertas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     ride:
 *                       $ref: '#/components/schemas/RideRequest'
 *                     bids:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Bid'
 *       404:
 *         description: Viaje no encontrado
 *         $ref: '#/components/schemas/Error'
 */
router.get(
  '/:id',
  authenticate,
  [param('id').isMongoId().withMessage('Valid ride ID is required')],
  async (req, res) => {
    try {
      const rideId = req.params.id;
      const RideRequest = (await import('../models/RideRequest.js')).default;
      const Bid = (await import('../models/Bid.js')).default;

      const rideRequest = await RideRequest.findById(rideId);

      if (!rideRequest) {
        return res.status(404).json({
          success: false,
          error: 'Viaje no encontrado',
        });
      }

      // Obtener bids asociados
      const bids = await Bid.find({ ride_request_id: rideId })
        .populate('driver_id', 'name driverInfo')
        .sort({ created_at: -1 });

      res.json({
        success: true,
        data: {
          ride: rideRequest,
          bids: bids.map((bid) => ({
            id: bid._id,
            driver_id: bid.driver_id._id,
            driver_name: bid.driver_id.name,
            vehicle_type: bid.driver_id.driverInfo?.vehicleType,
            rating: bid.driver_rating,
            total_trips: bid.driver_id.driverInfo?.totalRides || 0,
            bid_type: bid.bid_type,
            offered_price: bid.offered_price,
            driver_eta_min: bid.driver_eta_min,
            driver_distance_km: bid.driver_distance_km,
            status: bid.status,
            created_at: bid.created_at,
          })),
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/rides/{id}/cancel:
 *   post:
 *     summary: Cancelar un viaje
 *     tags: [Viajes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del viaje
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: user_cancelled
 *     responses:
 *       200:
 *         description: Viaje cancelado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Viaje cancelado
 */
router.post(
  '/:id/cancel',
  authenticate,
  [param('id').isMongoId().withMessage('Valid ride ID is required')],
  async (req, res) => {
    try {
      const rideId = req.params.id;
      const { reason } = req.body;

      await biddingService.cancelRideRequest(rideId, reason || 'user_cancelled');

      res.json({ success: true, message: 'Viaje cancelado' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/rides/{id}/bids:
 *   post:
 *     summary: Conductor envía oferta (aceptar o contraoferta)
 *     tags: [Viajes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del viaje
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bid_type
 *             properties:
 *               bid_type:
 *                 type: string
 *                 enum: [accept, counteroffer, reject]
 *                 example: accept
 *               offered_price:
 *                 type: number
 *                 example: 12.50
 *                 description: Requerido si bid_type es 'counteroffer'
 *     responses:
 *       201:
 *         description: Oferta enviada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Bid'
 *       400:
 *         description: Error en la solicitud
 *         $ref: '#/components/schemas/Error'
 */
router.post(
  '/:id/bids',
  authenticate,
  [
    param('id').isMongoId().withMessage('Valid ride ID is required'),
    body('bid_type').isIn(['accept', 'counteroffer', 'reject']).withMessage('Valid bid type is required'),
    body('offered_price').optional().isFloat({ min: 0 }),
  ],
  async (req, res) => {
    try {
      const rideRequestId = req.params.id;
      const driverId = req.user.id;
      const { bid_type, offered_price } = req.body;

      const bid = await biddingService.submitBid(
        driverId,
        rideRequestId,
        bid_type,
        offered_price
      );

      res.json({ success: true, data: bid });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/rides/{id}/bids/{bidId}/respond:
 *   post:
 *     summary: Pasajero responde a contraoferta del conductor
 *     tags: [Viajes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del viaje
 *       - in: path
 *         name: bidId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la oferta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [accept, counter, reject]
 *                 example: accept
 *               new_price:
 *                 type: number
 *                 example: 11.50
 *                 description: Requerido si action es 'counter'
 *     responses:
 *       200:
 *         description: Respuesta registrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Respuesta registrada
 */
router.post(
  '/:id/bids/:bidId/respond',
  authenticate,
  [
    param('id').isMongoId().withMessage('Valid ride ID is required'),
    param('bidId').isMongoId().withMessage('Valid bid ID is required'),
    body('action').isIn(['accept', 'counter', 'reject']).withMessage('Valid action is required'),
    body('new_price').optional().isFloat({ min: 0 }),
  ],
  async (req, res) => {
    try {
      const passengerId = req.user.id;
      const bidId = req.params.bidId;
      const { action, new_price } = req.body;

      await biddingService.handleCounteroffer(passengerId, bidId, action, new_price);

      res.json({ success: true, message: 'Respuesta registrada' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/rides/route:
 *   get:
 *     summary: Obtener geometría de ruta para visualización en mapa
 *     tags: [Rutas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: origin_lat
 *         required: true
 *         schema:
 *           type: number
 *         example: -14.2694
 *       - in: query
 *         name: origin_lon
 *         required: true
 *         schema:
 *           type: number
 *         example: -71.2256
 *       - in: query
 *         name: dest_lat
 *         required: true
 *         schema:
 *           type: number
 *         example: -14.2700
 *       - in: query
 *         name: dest_lon
 *         required: true
 *         schema:
 *           type: number
 *         example: -71.2260
 *     responses:
 *       200:
 *         description: Geometría de la ruta en formato GeoJSON
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     route_geometry:
 *                       type: object
 *                       description: GeoJSON LineString
 *                     total_minutes:
 *                       type: number
 *                       example: 8.5
 *                     total_km:
 *                       type: number
 *                       example: 2.5
 */
router.get(
  '/route',
  authenticate,
  [
    query('origin_lat').isFloat().withMessage('Origin latitude is required'),
    query('origin_lon').isFloat().withMessage('Origin longitude is required'),
    query('dest_lat').isFloat().withMessage('Destination latitude is required'),
    query('dest_lon').isFloat().withMessage('Destination longitude is required'),
  ],
  async (req, res) => {
    try {
      const { origin_lat, origin_lon, dest_lat, dest_lon } = req.query;

      // Calcular métricas de ruta
      const metrics = geospatialUtils.calculateRouteMetrics(
        parseFloat(origin_lat),
        parseFloat(origin_lon),
        parseFloat(dest_lat),
        parseFloat(dest_lon)
      );

      // Generar geometría de ruta simple (línea recta) en formato GeoJSON
      // En producción, podrías usar una API externa como Mapbox Directions API
      const routeGeometry = {
        type: 'LineString',
        coordinates: [
          [parseFloat(origin_lon), parseFloat(origin_lat)],
          [parseFloat(dest_lon), parseFloat(dest_lat)],
        ],
      };

      res.json({
        success: true,
        data: {
          route_geometry: routeGeometry,
          total_minutes: metrics.duration_min,
          total_km: metrics.distance_km,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;

