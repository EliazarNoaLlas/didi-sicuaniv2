import express from 'express';
import { autenticar, autorizar } from '../middleware/middleware-autenticacion.js';
import { obtenerCola } from '../controllers/controlador-conductor.js';
import { obtenerHistorialConductor } from '../controllers/controlador-historial.js';
import { obtenerCalificacionesConductor } from '../controllers/controlador-calificaciones-conductor.js';
import { obtenerGananciasConductor } from '../controllers/controlador-ganancias.js';
import { obtenerEstadisticasConductor } from '../controllers/controlador-estadisticas.js';
import {
  iniciarEnRuta,
  conductorLlegoPuntoRecogida,
  iniciarViaje,
  completarViaje,
  obtenerViajeActivo,
} from '../controllers/controlador-estado-viaje.js';
import servicioBloqueoConductor from '../services/servicio-bloqueo-conductor.js';
import servicioRetencionConductor from '../services/servicio-retencion-conductor.js';
import servicioSubasta from '../services/servicio-subasta.js';

const enrutador = express.Router();

enrutador.use(autenticar);
enrutador.use(autorizar('conductor'));

/**
 * @swagger
 * /api/conductores/queue:
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
enrutador.get('/queue', obtenerCola);

/**
 * @swagger
 * /api/conductores/history:
 *   get:
 *     summary: Obtener historial de viajes del conductor (RF-014)
 *     tags: [Conductores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Historial de viajes del conductor
 */
enrutador.get('/history', obtenerHistorialConductor);
enrutador.get('/historial', obtenerHistorialConductor); // Ruta en español

/**
 * @swagger
 * /api/conductores/earnings:
 *   get:
 *     summary: Obtener ganancias del conductor (RF-015)
 *     tags: [Conductores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year, custom]
 *           default: month
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Ganancias del conductor
 */
enrutador.get('/earnings', obtenerGananciasConductor);

/**
 * @swagger
 * /api/conductores/rides/{rideId}/rate:
 *   post:
 *     summary: Conductor califica cliente (RF-019)
 *     tags: [Conductores]
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
enrutador.post('/rides/:idViaje/rate', async (req, res) => {
  const { calificarPasajero } = await import('../controllers/controlador-calificacion.js');
  return calificarPasajero(req, res);
});

/**
 * @swagger
 * /api/conductores/stats:
 *   get:
 *     summary: Obtener estadísticas personales del conductor (RF-022)
 *     tags: [Conductores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas del conductor
 */
enrutador.get('/stats', obtenerEstadisticasConductor);

/**
 * @swagger
 * /api/conductores/calificaciones:
 *   get:
 *     summary: Obtener calificaciones y reseñas del conductor
 *     tags: [Conductores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Calificaciones del conductor
 */
enrutador.get('/calificaciones', obtenerCalificacionesConductor);

/**
 * @swagger
 * /api/conductores/viaje-activo:
 *   get:
 *     summary: Obtener viaje activo del conductor
 *     tags: [Conductores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Viaje activo del conductor
 */
enrutador.get('/viaje-activo', obtenerViajeActivo);

/**
 * @swagger
 * /api/conductores/rides/{rideId}/en-route:
 *   post:
 *     summary: Conductor indica que está yendo al punto de recogida
 *     tags: [Conductores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Estado actualizado
 */
enrutador.post('/rides/:idViaje/en-route', iniciarEnRuta);

/**
 * @swagger
 * /api/conductores/rides/{rideId}/arrived:
 *   post:
 *     summary: Conductor indica que llegó al punto de recogida
 *     tags: [Conductores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Estado actualizado
 */
enrutador.post('/rides/:idViaje/arrived', conductorLlegoPuntoRecogida);

/**
 * @swagger
 * /api/conductores/rides/{rideId}/start:
 *   post:
 *     summary: Conductor indica que recogió al pasajero (iniciar viaje)
 *     tags: [Conductores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Viaje iniciado
 */
enrutador.post('/rides/:idViaje/start', iniciarViaje);

/**
 * @swagger
 * /api/conductores/rides/{rideId}/complete:
 *   post:
 *     summary: Conductor indica que completó el viaje
 *     tags: [Conductores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Viaje completado
 */
enrutador.post('/rides/:idViaje/complete', completarViaje);

/**
 * @swagger
 * /api/conductores/history/delete:
 *   post:
 *     summary: Borrar historial del conductor
 *     tags: [Conductores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deleteAll:
 *                 type: boolean
 *                 description: Si es true, borra todo el historial
 *               deleteBids:
 *                 type: boolean
 *                 description: Si es true, también borra las ofertas (solo con deleteAll)
 *               rideIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: IDs de viajes específicos a borrar
 *     responses:
 *       200:
 *         description: Historial borrado exitosamente
 */
enrutador.post('/history/delete', async (req, res) => {
  const { borrarHistorialConductor } = await import('../controllers/controlador-historial.js');
  return borrarHistorialConductor(req, res);
});
enrutador.post('/historial/eliminar', async (req, res) => {
  const { borrarHistorialConductor } = await import('../controllers/controlador-historial.js');
  return borrarHistorialConductor(req, res);
}); // Ruta en español

/**
 * @swagger
 * /api/conductores/hold:
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
enrutador.post('/hold', async (req, res) => {
  try {
    const idConductor = req.user.id;
    const { ride_id: idViaje, duration_minutes: duracionMinutos } = req.body;

    const resultado = await servicioRetencionConductor.ponerViajeEnEspera(
      idViaje,
      idConductor,
      duracionMinutos
    );

    res.json(resultado);
  } catch (error) {
    res.status(400).json({ exito: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/conductores/release-hold:
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
enrutador.post('/release-hold', async (req, res) => {
  try {
    const idConductor = req.user.id;
    const { ride_id: idViaje } = req.body;

    const resultado = await servicioRetencionConductor.liberarEspera(idViaje, idConductor);

    res.json(resultado);
  } catch (error) {
    res.status(400).json({ exito: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/conductores/held-rides:
 *   get:
 *     summary: Obtener viajes en espera del conductor
 *     tags: [Conductores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de viajes en espera
 */
enrutador.get('/held-rides', async (req, res) => {
  try {
    const idConductor = req.user.id;
    const viajesEnEspera = await servicioRetencionConductor.obtenerViajesEnEsperaConductor(idConductor);

    res.json({
      exito: true,
      datos: viajesEnEspera,
      cantidad: viajesEnEspera.length,
    });
  } catch (error) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/conductores/block-user:
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
enrutador.post('/block-user', async (req, res) => {
  try {
    const idConductor = req.user.id;
    const { user_id: idUsuario, reason: razon, is_permanent: esPermanente } = req.body;

    const bloqueo = await servicioBloqueoConductor.bloquearUsuario(
      idConductor,
      idUsuario,
      razon,
      esPermanente || false
    );

    res.json({
      exito: true,
      datos: bloqueo,
    });
  } catch (error) {
    res.status(400).json({ exito: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/conductores/block-zone:
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
enrutador.post('/block-zone', async (req, res) => {
  try {
    const idConductor = req.user.id;
    const { address: direccion, reason: razon, duration_hours: duracionHoras } = req.body;

    const bloqueo = await servicioBloqueoConductor.bloquearZona(
      idConductor,
      direccion,
      razon,
      duracionHoras || 24
    );

    res.json({
      exito: true,
      datos: bloqueo,
    });
  } catch (error) {
    res.status(400).json({ exito: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/conductores/blocks:
 *   get:
 *     summary: Obtener bloqueos del conductor
 *     tags: [Conductores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de bloqueos
 */
enrutador.get('/blocks', async (req, res) => {
  try {
    const idConductor = req.user.id;
    const bloqueos = await servicioBloqueoConductor.obtenerBloqueosConductor(idConductor);

    res.json({
      exito: true,
      datos: bloqueos,
      cantidad: bloqueos.length,
    });
  } catch (error) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/conductores/unblock-user:
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
enrutador.post('/unblock-user', async (req, res) => {
  try {
    const idConductor = req.user.id;
    const { user_id: idUsuario } = req.body;

    const resultado = await servicioBloqueoConductor.desbloquearUsuario(idConductor, idUsuario);

    res.json(resultado);
  } catch (error) {
    res.status(400).json({ exito: false, error: error.message });
  }
});

export default enrutador;

