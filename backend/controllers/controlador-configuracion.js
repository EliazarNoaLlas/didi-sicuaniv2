import SystemConfig from '../models/ConfiguracionSistema.js';
import { io } from '../server.js';

/**
 * RF-024: Configurar comisiones del sistema
 */
export const obtenerTasaComision = async (req, res) => {
  try {
    let configuracion = await SystemConfig.findOne({ key: 'commission_rate' });

    if (!configuracion) {
      // Crear configuración por defecto si no existe
      configuracion = await SystemConfig.create({
        key: 'commission_rate',
        value: 0.15, // 15% por defecto
        description: 'Porcentaje de comisión del sistema (0-1)',
      });
    }

    res.json({
      exito: true,
      datos: {
        tasaComision: configuracion.value,
        porcentaje: (configuracion.value * 100).toFixed(2),
        ultimaActualizacion: configuracion.updatedAt,
      },
    });
  } catch (error) {
    console.error('❌ Error obteniendo tasa de comisión:', error);
    res.status(500).json({
      exito: false,
      error: 'Error al obtener tasa de comisión',
    });
  }
};

export const actualizarTasaComision = async (req, res) => {
  try {
    // Validar que sea administrador
    const tipoUsuario = req.user.tipoUsuario || req.user.userType;
    if (tipoUsuario !== 'administrador' && tipoUsuario !== 'admin') {
      return res.status(403).json({
        exito: false,
        error: 'Solo administradores pueden configurar comisiones',
      });
    }

    const { commissionRate: tasaComision } = req.body;

    // Validar que el porcentaje esté en el rango válido (0-100%)
    if (typeof tasaComision !== 'number' || tasaComision < 0 || tasaComision > 1) {
      return res.status(400).json({
        exito: false,
        error: 'La tasa de comisión debe estar entre 0 y 1 (0% - 100%)',
      });
    }

    // Actualizar o crear configuración
    const configuracion = await SystemConfig.findOneAndUpdate(
      { key: 'commission_rate' },
      {
        value: tasaComision,
        updatedBy: req.user.id,
        description: 'Porcentaje de comisión del sistema (0-1)',
      },
      { upsert: true, new: true }
    );

    // Notificar a conductores sobre el cambio
    if (io) {
      io.to('drivers').emit('commission:updated', {
        commissionRate: configuracion.value,
        percentage: (configuracion.value * 100).toFixed(2),
        message: `La tasa de comisión ha sido actualizada a ${(configuracion.value * 100).toFixed(2)}%`,
      });
    }

    res.json({
      exito: true,
      datos: {
        tasaComision: configuracion.value,
        porcentaje: (configuracion.value * 100).toFixed(2),
        ultimaActualizacion: configuracion.updatedAt,
      },
      mensaje: 'Tasa de comisión actualizada exitosamente',
    });
  } catch (error) {
    console.error('❌ Error actualizando tasa de comisión:', error);
    res.status(500).json({
      exito: false,
      error: 'Error al actualizar tasa de comisión',
    });
  }
};

// Exportar también con los nombres anteriores para compatibilidad
export { obtenerTasaComision as getCommissionRate };
export { actualizarTasaComision as updateCommissionRate };
