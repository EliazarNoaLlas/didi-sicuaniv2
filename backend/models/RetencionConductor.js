import mongoose from 'mongoose';

/**
 * Modelo de Retención de Conductor
 * Representa un viaje que un conductor ha puesto en espera (hold) temporalmente
 */
const esquemaRetencionConductor = new mongoose.Schema(
  {
    // ID del conductor que pone el viaje en espera
    id_conductor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      comment: 'ID del conductor que pone el viaje en espera',
    },
    // ID de la solicitud de viaje
    id_solicitud_viaje: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SolicitudViaje',
      required: true,
      comment: 'ID de la solicitud de viaje puesta en espera',
    },
    // Fecha y hora de expiración de la retención
    fecha_expiracion: {
      type: Date,
      required: true,
      comment: 'Fecha y hora en que expira la retención del viaje',
    },
    // Estado de la retención
    estado: {
      type: String,
      enum: ['activa', 'aceptada', 'liberada', 'expirada'],
      default: 'activa',
      comment: 'Estado actual de la retención',
    },
  },
  {
    timestamps: true, // Crea automáticamente createdAt y updatedAt
  }
);

// Índices para optimizar consultas frecuentes
esquemaRetencionConductor.index({ id_conductor: 1, estado: 1 });
esquemaRetencionConductor.index({ id_solicitud_viaje: 1 });
esquemaRetencionConductor.index({ fecha_expiracion: 1 }); // Para encontrar retenciones expiradas

const RetencionConductor = mongoose.model('RetencionConductor', esquemaRetencionConductor);

export default RetencionConductor;
// Exportar también con el nombre en inglés para compatibilidad
export { RetencionConductor as DriverHold };
