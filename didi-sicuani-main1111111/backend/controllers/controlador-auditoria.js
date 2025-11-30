import servicioAuditoria from '../services/servicio-auditoria.js';

/**
 * RF-025: Auditoría y logs del sistema (admin)
 */
export const obtenerLogsAuditoria = async (req, res) => {
  try {
    // Validar que sea administrador
    const tipoUsuario = req.user.tipoUsuario || req.user.userType;
    if (tipoUsuario !== 'administrador' && tipoUsuario !== 'admin') {
      return res.status(403).json({
        exito: false,
        error: 'Solo administradores pueden acceder a los logs de auditoría',
      });
    }

    const { action: accion, resourceType: tipoRecurso, startDate: fechaInicio, endDate: fechaFin, userId: idUsuario, limit: limite, skip: saltar } = req.query;

    // Construir filtros
    const filtros = {};

    if (accion) {
      filtros.action = accion;
    }

    if (tipoRecurso) {
      filtros.resource_type = tipoRecurso;
    }

    if (idUsuario) {
      filtros.user_id = idUsuario;
    }

    if (fechaInicio || fechaFin) {
      filtros.createdAt = {};
      if (fechaInicio) {
        filtros.createdAt.$gte = new Date(fechaInicio);
      }
      if (fechaFin) {
        filtros.createdAt.$lte = new Date(fechaFin);
      }
    }

    const resultado = await servicioAuditoria.obtenerLogs(
      filtros,
      parseInt(limite) || 100,
      parseInt(saltar) || 0
    );

    res.json({
      exito: true,
      datos: resultado,
    });
  } catch (error) {
    console.error('❌ Error obteniendo logs de auditoría:', error);
    res.status(500).json({
      exito: false,
      error: 'Error obteniendo logs de auditoría',
    });
  }
};

// Exportar también con el nombre anterior para compatibilidad
export { obtenerLogsAuditoria as getAuditLogs };
