import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { autenticar } from '../middleware/middleware-autenticacion.js';
import servicioSubasta from '../services/servicio-subasta.js';
import servicioPrecios from '../services/servicio-precios.js';
import utilidadesGeoespaciales from '../utils/utilidades-geoespaciales.js';
import { obtenerViajeActivoPasajero } from '../controllers/controlador-estado-viaje.js';

const enrutador = express.Router();

/**
 * @swagger
 * /api/viajes/calculate-price:
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
enrutador.post(
  '/calculate-price',
  autenticar,
  [
    body('origin_lat').isFloat().withMessage('Se requiere la latitud de origen'),
    body('origin_lon').isFloat().withMessage('Se requiere la longitud de origen'),
    body('destination_lat').isFloat().withMessage('Se requiere la latitud de destino'),
    body('destination_lon').isFloat().withMessage('Se requiere la longitud de destino'),
    body('vehicle_type').optional().isIn(['taxi', 'mototaxi', 'cualquiera']),
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

      const precioSugerido = await servicioPrecios.calculateSuggestedPrice({
        origin_lat,
        origin_lon,
        destination_lat,
        destination_lon,
        vehicle_type: vehicle_type || 'taxi',
      });

      const metricas = await servicioPrecios.getRouteMetrics(
        origin_lat,
        origin_lon,
        destination_lat,
        destination_lon
      );

      res.json({
        exito: true,
        datos: {
          precio_sugerido: precioSugerido,
          distancia_km: metricas.distance_km,
          duracion_estimada_min: metricas.duration_min,
          rango_precio: {
            minimo: Math.round(precioSugerido * 0.7 * 2) / 2, // -30%
            maximo: Math.round(precioSugerido * 1.3 * 2) / 2, // +30%
          },
        },
      });
    } catch (error) {
      res.status(500).json({ exito: false, error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/viajes/request:
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
enrutador.post(
  '/request',
  autenticar,
  [
    body('origin_lat').optional({ nullable: true, checkFalsy: true }).isFloat().withMessage('La latitud de origen debe ser un número válido'),
    body('origin_lon').optional({ nullable: true, checkFalsy: true }).isFloat().withMessage('La longitud de origen debe ser un número válido'),
    body('origin_address').notEmpty().withMessage('Se requiere la dirección de origen'),
    body('destination_lat').optional({ nullable: true, checkFalsy: true }).isFloat().withMessage('La latitud de destino debe ser un número válido'),
    body('destination_lon').optional({ nullable: true, checkFalsy: true }).isFloat().withMessage('La longitud de destino debe ser un número válido'),
    body('destination_address').notEmpty().withMessage('Se requiere la dirección de destino'),
  ],
  async (req, res) => {
    try {
      const errores = validationResult(req);
      if (!errores.isEmpty()) {
        return res.status(400).json({
          exito: false,
          error: 'Datos de entrada inválidos',
          detalles: errores.array(),
        });
      }

      const idPasajero = req.user.id;
      
      // Mapear campos de inglés a español y parsear coordenadas
      const datosViaje = {
        // Mapear origen (aceptar ambos nombres: inglés y español)
        origen_lat: req.body.origen_lat || req.body.origin_lat ? 
          parseFloat(req.body.origen_lat || req.body.origin_lat) : null,
        origen_lon: req.body.origen_lon || req.body.origin_lon ? 
          parseFloat(req.body.origen_lon || req.body.origin_lon) : null,
        origen_direccion: req.body.origen_direccion || req.body.origin_address || '',
        // Mapear destino (aceptar ambos nombres: inglés y español)
        destino_lat: req.body.destino_lat || req.body.destination_lat ? 
          parseFloat(req.body.destino_lat || req.body.destination_lat) : null,
        destino_lon: req.body.destino_lon || req.body.destination_lon ? 
          parseFloat(req.body.destino_lon || req.body.destination_lon) : null,
        destino_direccion: req.body.destino_direccion || req.body.destination_address || '',
        // Otros campos
        precio_ofrecido_pasajero: req.body.precio_ofrecido_pasajero || req.body.passenger_offered_price || null,
        tipo_vehiculo: req.body.tipo_vehiculo || req.body.vehicle_type || 'cualquiera',
        metodo_pago: req.body.metodo_pago || req.body.payment_method || 'efectivo',
      };

      const resultado = await servicioSubasta.crearSolicitudViaje(idPasajero, datosViaje);

      res.status(201).json({
        exito: true,
        datos: resultado,
      });
    } catch (error) {
      console.error('Error en crearSolicitudViaje:', error);
      res.status(400).json({ exito: false, error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/viajes/activo:
 *   get:
 *     summary: Obtener viaje activo del pasajero
 *     tags: [Viajes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Viaje activo del pasajero
 *       404:
 *         description: No hay viaje activo
 */
enrutador.get('/activo', autenticar, obtenerViajeActivoPasajero);

/**
 * @swagger
 * /api/viajes/{id}:
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
enrutador.get(
  '/:id',
  autenticar,
  [param('id').isMongoId().withMessage('Se requiere un ID de viaje válido')],
  async (req, res) => {
    try {
      const idViaje = req.params.id;
      const SolicitudViaje = (await import('../models/SolicitudViaje.js')).default;
      const Oferta = (await import('../models/Oferta.js')).default;

      const solicitudViaje = await SolicitudViaje.findById(idViaje);

      if (!solicitudViaje) {
        return res.status(404).json({
          exito: false,
          error: 'Viaje no encontrado',
        });
      }

      // Obtener ofertas asociadas
      const ofertas = await Oferta.find({ id_solicitud_viaje: idViaje })
        .populate('id_conductor', 'nombre informacion_conductor')
        .sort({ createdAt: -1 });

      res.json({
        exito: true,
        datos: {
          viaje: solicitudViaje,
          ofertas: ofertas.map((oferta) => ({
            id: oferta._id,
            id_conductor: oferta.id_conductor._id,
            nombre_conductor: oferta.id_conductor.nombre,
            tipo_vehiculo: oferta.id_conductor.informacion_conductor?.tipo_vehiculo,
            calificacion: oferta.calificacion_conductor,
            total_viajes: oferta.id_conductor.informacion_conductor?.total_viajes || 0,
            tipo_oferta: oferta.tipo_oferta,
            precio_ofrecido: oferta.precio_ofrecido,
            tiempo_estimado_llegada_min: oferta.tiempo_estimado_llegada_min,
            distancia_conductor_km: oferta.distancia_conductor_km,
            estado: oferta.estado,
            fecha_creacion: oferta.createdAt,
          })),
        },
      });
    } catch (error) {
      res.status(500).json({ exito: false, error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/viajes/{id}/cancel:
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
enrutador.post(
  '/:id/cancel',
  autenticar,
  [param('id').isMongoId().withMessage('Se requiere un ID de viaje válido')],
  async (req, res) => {
    try {
      const idViaje = req.params.id;
      const { razon } = req.body;

      await servicioSubasta.cancelarSolicitudViaje(idViaje, razon || 'cancelado_por_usuario');

      res.json({ exito: true, mensaje: 'Viaje cancelado' });
    } catch (error) {
      res.status(500).json({ exito: false, error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/viajes/{id}/bids:
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
enrutador.post(
  '/:id/bids',
  autenticar,
  [
    param('id').isMongoId().withMessage('Se requiere un ID de viaje válido'),
    body('offered_price').isFloat({ min: 0.01 }).withMessage('Se requiere un precio válido mayor a 0'),
  ],
  async (req, res) => {
    try {
      const idSolicitudViaje = req.params.id;
      const idConductor = req.user.id;
      const { offered_price: precioOfrecido } = req.body;

      // Validar que el usuario es conductor
      const tipoUsuario = req.user.tipoUsuario || req.user.userType;
      if (tipoUsuario !== 'conductor' && tipoUsuario !== 'driver') {
        return res.status(403).json({
          exito: false,
          error: 'Solo los conductores pueden realizar ofertas',
        });
      }

      const oferta = await servicioSubasta.enviarOferta(
        idConductor,
        idSolicitudViaje,
        precioOfrecido
      );

      res.json({ exito: true, datos: oferta });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/viajes/{id}/bids/{bidId}/respond:
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
enrutador.post(
  '/:id/bids/:idOferta/respond',
  autenticar,
  [
    param('id').isMongoId().withMessage('Se requiere un ID de viaje válido'),
    param('idOferta').isMongoId().withMessage('Se requiere un ID de oferta válido'),
    body('action').isIn(['accept', 'reject', 'aceptar', 'rechazar']).withMessage('Se requiere una acción válida (accept/reject o aceptar/rechazar)'),
  ],
  async (req, res) => {
    try {
      const idPasajero = req.user.id;
      const idOferta = req.params.idOferta;
      const { action } = req.body;

      // Mapear acciones en inglés a español
      const mapeoAcciones = {
        'accept': 'aceptar',
        'reject': 'rechazar',
        'aceptar': 'aceptar', // Compatibilidad con español
        'rechazar': 'rechazar', // Compatibilidad con español
      };
      
      const accion = mapeoAcciones[action];
      
      if (!accion) {
        return res.status(400).json({
          exito: false,
          error: 'Acción no válida. Use "aceptar" o "rechazar" (o "accept"/"reject")',
        });
      }

      await servicioSubasta.manejarContraoferta(idPasajero, idOferta, accion);

      res.json({ exito: true, mensaje: 'Respuesta registrada' });
    } catch (error) {
      res.status(400).json({ exito: false, error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/viajes/{rideId}/rate:
 *   post:
 *     summary: Cliente califica viaje (RF-018)
 *     tags: [Viajes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Calificación registrada
 */
enrutador.post(
  '/:idViaje/rate',
  autenticar,
  [
    param('idViaje').isMongoId().withMessage('Se requiere un ID de viaje válido'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('La calificación debe estar entre 1 y 5'),
    body('comment').optional().isString(),
  ],
  async (req, res) => {
    const { calificarConductor } = await import('../controllers/controlador-calificacion.js');
    return calificarConductor(req, res);
  }
);

/**
 * @swagger
 * /api/viajes/route:
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
enrutador.get(
  '/route',
  autenticar,
  [
    query('origin_lat').isFloat().withMessage('Se requiere la latitud de origen'),
    query('origin_lon').isFloat().withMessage('Se requiere la longitud de origen'),
    query('dest_lat').isFloat().withMessage('Se requiere la latitud de destino'),
    query('dest_lon').isFloat().withMessage('Se requiere la longitud de destino'),
  ],
  async (req, res) => {
    try {
      const { origin_lat, origin_lon, dest_lat, dest_lon } = req.query;

      // Calcular métricas de ruta
      const metricas = utilidadesGeoespaciales.calcularMetricasRuta(
        parseFloat(origin_lat),
        parseFloat(origin_lon),
        parseFloat(dest_lat),
        parseFloat(dest_lon)
      );

      // Generar geometría de ruta simple (línea recta) en formato GeoJSON
      // En producción, podrías usar una API externa como Mapbox Directions API
      const geometriaRuta = {
        type: 'LineString',
        coordinates: [
          [parseFloat(origin_lon), parseFloat(origin_lat)],
          [parseFloat(dest_lon), parseFloat(dest_lat)],
        ],
      };

      res.json({
        exito: true,
        datos: {
          geometria_ruta: geometriaRuta,
          total_minutos: metricas.duration_min,
          total_km: metricas.distance_km,
        },
      });
    } catch (error) {
      res.status(500).json({ exito: false, error: error.message });
    }
  }
);

export default enrutador;

