import RegistroAuditoria from '../models/RegistroAuditoria.js';

/**
 * Servicio de Auditoría
 * Maneja el registro de acciones del sistema para auditoría
 */
class ServicioAuditoria {
  /**
   * Registrar una acción en el log de auditoría
   * @param {String} accion - Acción realizada
   * @param {String} idUsuario - ID del usuario que realizó la acción
   * @param {String} tipoRecurso - Tipo de recurso afectado
   * @param {String} idRecurso - ID del recurso afectado
   * @param {Object} detalles - Detalles adicionales
   * @param {Object} req - Objeto request (opcional)
   */
  async registrar(accion, idUsuario, tipoRecurso = null, idRecurso = null, detalles = null, req = null) {
    try {
      const datosLog = {
        id_usuario: idUsuario,
        accion,
        tipo_recurso: tipoRecurso,
        id_recurso: idRecurso,
        detalles,
      };

      if (req) {
        datosLog.direccion_ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        datosLog.agente_usuario = req.headers['user-agent'];
      }

      await RegistroAuditoria.create(datosLog);
    } catch (error) {
      console.error('Error registrando en auditoría:', error);
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  /**
   * Obtener logs de auditoría
   * @param {Object} filtros - Filtros de búsqueda
   * @param {Number} limite - Límite de resultados
   * @param {Number} saltar - Cantidad de resultados a saltar
   * @returns {Object} Objeto con logs, total, limite y saltar
   */
  async obtenerLogs(filtros = {}, limite = 100, saltar = 0) {
    try {
      const logs = await RegistroAuditoria.find(filtros)
        .populate('id_usuario', 'nombre correo tipo_usuario')
        .sort({ createdAt: -1 })
        .limit(limite)
        .skip(saltar)
        .lean();

      const total = await RegistroAuditoria.countDocuments(filtros);

      return {
        logs,
        total,
        limite,
        saltar,
      };
    } catch (error) {
      console.error('Error obteniendo logs de auditoría:', error);
      throw error;
    }
  }
}

export default new ServicioAuditoria();
