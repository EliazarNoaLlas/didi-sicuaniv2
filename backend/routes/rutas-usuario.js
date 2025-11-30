import express from 'express';
import { autenticar } from '../middleware/middleware-autenticacion.js';
import { obtenerHistorialPasajero } from '../controllers/controlador-historial.js';
import { obtenerMejoresConductores } from '../controllers/controlador-mejores-conductores.js';
import { obtenerEstadisticasPasajero } from '../controllers/controlador-estadisticas.js';

const enrutador = express.Router();

// Todas las rutas requieren autenticación
enrutador.use(autenticar);

/**
 * @swagger
 * /api/usuarios/profile:
 *   get:
 *     summary: Obtener perfil del usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario
 */
enrutador.get('/profile', (req, res) => {
  res.json({
    exito: true,
    datos: req.user,
  });
});

/**
 * @swagger
 * /api/usuarios/history:
 *   get:
 *     summary: Obtener historial de viajes del cliente (RF-013)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [pendiente, subasta_activa, asignado, completado, cancelado]
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: precioMinimo
 *         schema:
 *           type: number
 *       - in: query
 *         name: precioMaximo
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Historial de viajes del cliente
 */
enrutador.get('/history', obtenerHistorialPasajero);

/**
 * @swagger
 * /api/usuarios/stats:
 *   get:
 *     summary: Obtener estadísticas personales del cliente (RF-023)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas del cliente
 */
enrutador.get('/stats', obtenerEstadisticasPasajero);

/**
 * @swagger
 * /api/usuarios/mejores-conductores:
 *   get:
 *     summary: Obtener mejores conductores del pasajero
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de mejores conductores
 */
enrutador.get('/mejores-conductores', obtenerMejoresConductores);

/**
 * @swagger
 * /api/usuarios/history/delete:
 *   post:
 *     summary: Borrar historial del pasajero
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               borrarTodo:
 *                 type: boolean
 *                 description: Si es true, borra todo el historial
 *               idsViajes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: IDs de viajes específicos a borrar
 *     responses:
 *       200:
 *         description: Historial borrado exitosamente
 */
enrutador.post('/history/delete', async (req, res) => {
  const { borrarHistorialPasajero } = await import('../controllers/controlador-historial.js');
  return borrarHistorialPasajero(req, res);
});

export default enrutador;
