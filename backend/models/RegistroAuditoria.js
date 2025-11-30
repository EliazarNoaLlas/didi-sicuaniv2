import mongoose from 'mongoose';

/**
 * Modelo de Registro de Auditoría
 * Almacena logs de todas las acciones importantes realizadas en el sistema
 */
const esquemaRegistroAuditoria = new mongoose.Schema(
  {
    // ID del usuario que realizó la acción
    id_usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      comment: 'ID del usuario que realizó la acción',
    },
    // Acción realizada
    accion: {
      type: String,
      required: true,
      comment: 'Tipo de acción realizada (ej: crear, actualizar, eliminar, iniciar_sesion, etc.)',
    },
    // Tipo de recurso afectado
    tipo_recurso: {
      type: String,
      enum: ['usuario', 'viaje', 'oferta', 'sistema', 'configuracion'],
      comment: 'Tipo de recurso afectado por la acción',
    },
    // ID del recurso afectado
    id_recurso: {
      type: mongoose.Schema.Types.ObjectId,
      comment: 'ID del recurso afectado por la acción',
    },
    // Detalles adicionales de la acción
    detalles: {
      type: mongoose.Schema.Types.Mixed,
      comment: 'Información adicional sobre la acción realizada',
    },
    // Información de la solicitud
    direccion_ip: {
      type: String,
      comment: 'Dirección IP desde la que se realizó la acción',
    },
    agente_usuario: {
      type: String,
      comment: 'User agent del navegador/cliente que realizó la acción',
    },
  },
  {
    timestamps: true, // Crea automáticamente createdAt y updatedAt
  }
);

// Índices para optimizar consultas frecuentes
esquemaRegistroAuditoria.index({ id_usuario: 1 });
esquemaRegistroAuditoria.index({ accion: 1 });
esquemaRegistroAuditoria.index({ tipo_recurso: 1 });
esquemaRegistroAuditoria.index({ createdAt: -1 }); // Para ordenar por fecha más reciente

const RegistroAuditoria = mongoose.model('RegistroAuditoria', esquemaRegistroAuditoria);

export default RegistroAuditoria;
// Exportar también con el nombre en inglés para compatibilidad
export { RegistroAuditoria as AuditLog };
