import express from 'express';
import { autenticar, autorizar } from '../middleware/middleware-autenticacion.js';
import servicioMetricas from '../services/servicio-metricas.js';
import { obtenerGananciasSistema } from '../controllers/controlador-ganancias.js';
import { io } from '../server.js';

const enrutador = express.Router();

enrutador.use(autenticar);
enrutador.use(autorizar('administrador'));

// Métricas en tiempo real
enrutador.get('/metrics', async (req, res) => {
  try {
    const metricas = await servicioMetricas.obtenerMetricasDashboard();
    
    // Emitir actualización vía Socket.io
    if (io) {
      io.to('admins').emit('metrics:update', metricas);
    }
    
    res.json({
      exito: true,
      datos: metricas,
    });
  } catch (error) {
    res.status(500).json({
      exito: false,
      error: error.message,
    });
  }
});

enrutador.get('/metrics/rides', async (req, res) => {
  try {
    const datos = await servicioMetricas.obtenerMetricasViajes();
    res.json({
      exito: true,
      datos,
    });
  } catch (error) {
    res.status(500).json({
      exito: false,
      error: error.message,
    });
  }
});

enrutador.get('/metrics/drivers', async (req, res) => {
  try {
    const datos = await servicioMetricas.obtenerMetricasConductores();
    res.json({
      exito: true,
      datos,
    });
  } catch (error) {
    res.status(500).json({
      exito: false,
      error: error.message,
    });
  }
});

enrutador.get('/metrics/revenue', async (req, res) => {
  try {
    const datos = await servicioMetricas.obtenerMetricasIngresos();
    res.json({
      exito: true,
      datos,
    });
  } catch (error) {
    res.status(500).json({
      exito: false,
      error: error.message,
    });
  }
});

enrutador.get('/metrics/bidding', async (req, res) => {
  try {
    const datos = await servicioMetricas.obtenerMetricasSubastas();
    res.json({
      exito: true,
      datos,
    });
  } catch (error) {
    res.status(500).json({
      exito: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/administrador/earnings:
 *   get:
 *     summary: Obtener ganancias del sistema (RF-016)
 *     tags: [Administración]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year, custom]
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
 *         description: Ganancias del sistema
 */
enrutador.get('/earnings', obtenerGananciasSistema);

/**
 * @swagger
 * /api/administrador/users:
 *   get:
 *     summary: Obtener lista de usuarios (RF-011)
 *     tags: [Administración]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userType
 *         schema:
 *           type: string
 *           enum: [passenger, driver, admin]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Lista de usuarios
 */
enrutador.get('/users', async (req, res) => {
  const { obtenerUsuarios } = await import('../controllers/controlador-admin.js');
  return obtenerUsuarios(req, res);
});

/**
 * @swagger
 * /api/administrador/users/{userId}:
 *   get:
 *     summary: Obtener detalles de un usuario (RF-011)
 *     tags: [Administración]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalles del usuario
 */
enrutador.get('/users/:idUsuario', async (req, res) => {
  const { obtenerDetallesUsuario } = await import('../controllers/controlador-admin.js');
  return obtenerDetallesUsuario(req, res);
});

/**
 * @swagger
 * /api/administrador/users/{userId}/status:
 *   patch:
 *     summary: Activar/desactivar usuario (RF-011)
 *     tags: [Administración]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Estado actualizado
 */
enrutador.patch('/users/:idUsuario/status', async (req, res) => {
  const { actualizarEstadoUsuario } = await import('../controllers/controlador-admin.js');
  return actualizarEstadoUsuario(req, res);
});

/**
 * @swagger
 * /api/administrador/rides:
 *   get:
 *     summary: Obtener lista de viajes (RF-012)
 *     tags: [Administración]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Lista de viajes
 */
enrutador.get('/rides', async (req, res) => {
  const { obtenerViajes } = await import('../controllers/controlador-admin.js');
  return obtenerViajes(req, res);
});

/**
 * @swagger
 * /api/administrador/rides/{rideId}:
 *   get:
 *     summary: Obtener detalles de un viaje (RF-012)
 *     tags: [Administración]
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
 *         description: Detalles del viaje
 */
enrutador.get('/rides/:idViaje', async (req, res) => {
  const { obtenerDetallesViaje } = await import('../controllers/controlador-admin.js');
  return obtenerDetallesViaje(req, res);
});

/**
 * @swagger
 * /api/administrador/rides/{rideId}/cancel:
 *   post:
 *     summary: Cancelar un viaje (RF-012)
 *     tags: [Administración]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Viaje cancelado
 */
enrutador.post('/rides/:idViaje/cancel', async (req, res) => {
  const { cancelarViaje } = await import('../controllers/controlador-admin.js');
  return cancelarViaje(req, res);
});

/**
 * @swagger
 * /api/administrador/config/commission:
 *   get:
 *     summary: Obtener tasa de comisión actual (RF-024)
 *     tags: [Administración]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tasa de comisión actual
 */
enrutador.get('/config/commission', async (req, res) => {
  const { obtenerTasaComision } = await import('../controllers/controlador-configuracion.js');
  return obtenerTasaComision(req, res);
});

/**
 * @swagger
 * /api/administrador/config/commission:
 *   put:
 *     summary: Actualizar tasa de comisión (RF-024)
 *     tags: [Administración]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - commissionRate
 *             properties:
 *               commissionRate:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 example: 0.15
 *     responses:
 *       200:
 *         description: Tasa de comisión actualizada
 */
enrutador.put('/config/commission', async (req, res) => {
  const { actualizarTasaComision } = await import('../controllers/controlador-configuracion.js');
  return actualizarTasaComision(req, res);
});

/**
 * @swagger
 * /api/administrador/reports/export:
 *   get:
 *     summary: Exportar reportes (RF-017)
 *     tags: [Administración]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [metrics, users, rides, earnings]
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, pdf]
 *           default: json
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
 *         name: filters
 *         schema:
 *           type: string
 *           description: JSON string con filtros adicionales
 *     responses:
 *       200:
 *         description: Reporte generado
 */
enrutador.get('/reports/export', async (req, res) => {
  const { exportarReporte } = await import('../controllers/controlador-reporte.js');
  return exportarReporte(req, res);
});

/**
 * @swagger
 * /api/administrador/audit:
 *   get:
 *     summary: Obtener logs de auditoría (RF-025)
 *     tags: [Administración]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: resourceType
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
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 100
 *       - in: query
 *         name: skip
 *         schema:
 *           type: number
 *           default: 0
 *     responses:
 *       200:
 *         description: Logs de auditoría
 */
enrutador.get('/audit', async (req, res) => {
  const { obtenerLogsAuditoria } = await import('../controllers/controlador-auditoria.js');
  return obtenerLogsAuditoria(req, res);
});

/**
 * @swagger
 * /api/administrador/history/delete-all:
 *   post:
 *     summary: Borrar todos los historiales del sistema (admin)
 *     tags: [Administración]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - confirm
 *             properties:
 *               confirm:
 *                 type: string
 *                 example: DELETE_ALL_HISTORY
 *               deleteBids:
 *                 type: boolean
 *                 description: Si es true, también borra todas las ofertas
 *     responses:
 *       200:
 *         description: Historiales borrados exitosamente
 */
enrutador.post('/history/delete-all', async (req, res) => {
  const { borrarTodoElHistorial } = await import('../controllers/controlador-historial-admin.js');
  return borrarTodoElHistorial(req, res);
});

/**
 * @swagger
 * /api/administrador/history/users/{userId}:
 *   delete:
 *     summary: Borrar historial de un usuario específico (admin)
 *     tags: [Administración]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deleteBids:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Historial del usuario borrado
 */
enrutador.delete('/history/users/:idUsuario', async (req, res) => {
  const { borrarHistorialUsuario } = await import('../controllers/controlador-historial-admin.js');
  return borrarHistorialUsuario(req, res);
});

/**
 * @swagger
 * /api/administrador/history/restore:
 *   post:
 *     summary: Restaurar historial eliminado (admin)
 *     tags: [Administración]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               restoreAll:
 *                 type: boolean
 *               userId:
 *                 type: string
 *                 description: Requerido si restoreAll es true
 *               rideIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Historial restaurado
 */
enrutador.post('/history/restore', async (req, res) => {
  const { restaurarHistorial } = await import('../controllers/controlador-historial-admin.js');
  return restaurarHistorial(req, res);
});

export default enrutador;

