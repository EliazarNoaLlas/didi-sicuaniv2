/**
 * Este archivo contiene la documentación Swagger para todos los endpoints
 * que no están documentados directamente en los archivos de rutas.
 * 
 * Para endpoints documentados directamente en las rutas, ver:
 * - auth.routes.js (login, register)
 * - rides.routes.js (todos los endpoints de viajes)
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: No autenticado
 *         $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/drivers/queue:
 *   get:
 *     summary: Obtener cola de viajes para conductores
 *     tags: [Conductores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cola de viajes
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
 *                     $ref: '#/components/schemas/RideRequest'
 *       403:
 *         description: Solo para conductores
 *         $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/bidding/request:
 *   post:
 *     summary: Crear solicitud de viaje (legacy - usar /api/rides/request)
 *     tags: [Bidding]
 *     security:
 *       - bearerAuth: []
 *     deprecated: true
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
 *             properties:
 *               origin_lat:
 *                 type: number
 *                 example: -14.2694
 *               origin_lon:
 *                 type: number
 *                 example: -71.2256
 *               origin_address:
 *                 type: string
 *                 example: Plaza Principal
 *               destination_lat:
 *                 type: number
 *                 example: -14.2700
 *               destination_lon:
 *                 type: number
 *                 example: -71.2260
 *               destination_address:
 *                 type: string
 *                 example: Mercado Central
 *               passenger_offered_price:
 *                 type: number
 *                 example: 12.00
 *               vehicle_type:
 *                 type: string
 *                 enum: [taxi, mototaxi, any]
 *                 example: taxi
 *     responses:
 *       201:
 *         description: Solicitud creada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/RideRequest'
 */

/**
 * @swagger
 * /api/bidding/bid:
 *   post:
 *     summary: Enviar oferta (legacy - usar /api/rides/:id/bids)
 *     tags: [Bidding]
 *     security:
 *       - bearerAuth: []
 *     deprecated: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ride_request_id
 *               - bid_type
 *             properties:
 *               ride_request_id:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *               bid_type:
 *                 type: string
 *                 enum: [accept, counteroffer, reject]
 *                 example: accept
 *               offered_price:
 *                 type: number
 *                 example: 12.50
 *     responses:
 *       201:
 *         description: Oferta enviada
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
 */

/**
 * @swagger
 * /api/admin/metrics:
 *   get:
 *     summary: Obtener métricas generales del dashboard
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Métricas del dashboard
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
 *                     totalRides:
 *                       type: number
 *                       example: 150
 *                     activeRides:
 *                       type: number
 *                       example: 12
 *                     totalDrivers:
 *                       type: number
 *                       example: 45
 *                     onlineDrivers:
 *                       type: number
 *                       example: 28
 *                     totalPassengers:
 *                       type: number
 *                       example: 320
 *                     revenue:
 *                       type: number
 *                       example: 12500.50
 *       403:
 *         description: Solo para administradores
 *         $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/admin/metrics/rides:
 *   get:
 *     summary: Obtener métricas de viajes por hora
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Métricas de viajes (últimas 24 horas)
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
 *                       hour:
 *                         type: number
 *                         example: 14
 *                       rides:
 *                         type: number
 *                         example: 8
 */

/**
 * @swagger
 * /api/admin/metrics/drivers:
 *   get:
 *     summary: Obtener métricas de conductores por tipo de vehículo
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Distribución de conductores
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
 *                       type:
 *                         type: string
 *                         example: taxi
 *                       count:
 *                         type: number
 *                         example: 25
 */

/**
 * @swagger
 * /api/admin/metrics/revenue:
 *   get:
 *     summary: Obtener métricas de ingresos (últimos 7 días)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ingresos diarios
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
 *                       date:
 *                         type: string
 *                         example: 2024-01-15
 *                       revenue:
 *                         type: string
 *                         example: 1850.75
 */

/**
 * @swagger
 * /api/admin/metrics/bidding:
 *   get:
 *     summary: Obtener métricas del sistema de bidding
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Métricas de bidding
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
 *                     totalBids:
 *                       type: number
 *                       example: 450
 *                     acceptedBids:
 *                       type: number
 *                       example: 320
 *                     counteroffers:
 *                       type: number
 *                       example: 85
 *                     acceptanceRate:
 *                       type: number
 *                       example: 71.11
 *                     avgBidsPerRide:
 *                       type: number
 *                       example: 3.2
 */

export default {};

