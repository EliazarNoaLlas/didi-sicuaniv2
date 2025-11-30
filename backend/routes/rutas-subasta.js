import express from 'express';
import { body, param } from 'express-validator';
import { crearSolicitudViaje, enviarOferta, aceptarOferta, rechazarOferta, obtenerOfertasPorViaje } from '../controllers/controlador-subasta.js';
import { autenticar } from '../middleware/middleware-autenticacion.js';

const enrutador = express.Router();

/**
 * @swagger
 * /api/subasta/request:
 *   post:
 *     summary: Crear solicitud de viaje con subasta inversa
 *     tags: [Subasta]
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
 *               passenger_offered_price:
 *                 type: number
 *                 example: 15.50
 *               vehicle_type:
 *                 type: string
 *                 enum: [taxi, mototaxi, cualquiera]
 *                 example: cualquiera
 *     responses:
 *       201:
 *         description: Solicitud de viaje creada exitosamente
 */
// Crear solicitud de viaje con subasta inversa
enrutador.post(
  '/request',
  autenticar,
  [
    body('origin_lat').isFloat().withMessage('Se requiere la latitud de origen'),
    body('origin_lon').isFloat().withMessage('Se requiere la longitud de origen'),
    body('destination_lat').isFloat().withMessage('Se requiere la latitud de destino'),
    body('destination_lon').isFloat().withMessage('Se requiere la longitud de destino'),
    body('passenger_offered_price').isFloat({ min: 0 }).withMessage('Se requiere un precio válido'),
    body('vehicle_type').isIn(['taxi', 'mototaxi', 'cualquiera']).withMessage('Se requiere un tipo de vehículo válido'),
  ],
  crearSolicitudViaje
);

/**
 * @swagger
 * /api/subasta/bid:
 *   post:
 *     summary: Enviar oferta (conductor acepta/contraofrece)
 *     tags: [Subasta]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ride_request_id
 *               - tipo_oferta
 *             properties:
 *               ride_request_id:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *               tipo_oferta:
 *                 type: string
 *                 enum: [aceptar, contraoferta, rechazar]
 *                 example: contraoferta
 *               precio_ofrecido:
 *                 type: number
 *                 example: 18.00
 *     responses:
 *       201:
 *         description: Oferta enviada exitosamente
 */
// Enviar oferta (conductor acepta/contraofrece)
enrutador.post(
  '/bid',
  autenticar,
  [
    body('ride_request_id').isMongoId().withMessage('Se requiere el ID de la solicitud de viaje'),
    body('tipo_oferta').isIn(['aceptar', 'contraoferta', 'rechazar']).withMessage('Se requiere un tipo de oferta válido'),
    body('precio_ofrecido').optional().isFloat({ min: 0 }),
  ],
  enviarOferta
);

/**
 * @swagger
 * /api/subasta/accept/{idOferta}:
 *   post:
 *     summary: Aceptar oferta (pasajero acepta oferta del conductor)
 *     tags: [Subasta]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idOferta
 *         required: true
 *         schema:
 *           type: string
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Oferta aceptada exitosamente
 */
// Aceptar oferta (pasajero acepta oferta del conductor)
enrutador.post(
  '/accept/:idOferta',
  autenticar,
  [param('idOferta').isMongoId().withMessage('Se requiere un ID de oferta válido')],
  aceptarOferta
);

/**
 * @swagger
 * /api/subasta/reject/{idOferta}:
 *   post:
 *     summary: Rechazar oferta
 *     tags: [Subasta]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idOferta
 *         required: true
 *         schema:
 *           type: string
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Oferta rechazada exitosamente
 */
// Rechazar oferta
enrutador.post(
  '/reject/:idOferta',
  autenticar,
  [param('idOferta').isMongoId().withMessage('Se requiere un ID de oferta válido')],
  rechazarOferta
);

/**
 * @swagger
 * /api/subasta/ride/{idViaje}:
 *   get:
 *     summary: Obtener ofertas de un viaje
 *     tags: [Subasta]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idViaje
 *         required: true
 *         schema:
 *           type: string
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Lista de ofertas del viaje
 */
// Obtener ofertas de un viaje
enrutador.get(
  '/ride/:idViaje',
  autenticar,
  [param('idViaje').isMongoId().withMessage('Se requiere un ID de viaje válido')],
  obtenerOfertasPorViaje
);

export default enrutador;
