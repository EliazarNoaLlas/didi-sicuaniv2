import mongoose from 'mongoose';

/**
 * Modelo de Bloqueo de Conductor
 * Representa un bloqueo realizado por un conductor (usuario, zona o ruta)
 */
const esquemaBloqueoConductor = new mongoose.Schema(
  {
    // ID del conductor que realiza el bloqueo
    id_conductor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      comment: 'ID del conductor que realiza el bloqueo',
    },
    // ID del usuario bloqueado (si es bloqueo de usuario)
    id_usuario_bloqueado: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      comment: 'ID del usuario bloqueado (si el tipo de bloqueo es "usuario")',
    },
    // Dirección bloqueada (si es bloqueo de zona)
    direccion_bloqueada: {
      type: String,
      comment: 'Dirección o zona bloqueada (si el tipo de bloqueo es "zona")',
    },
    // Tipo de bloqueo
    tipo_bloqueo: {
      type: String,
      enum: ['usuario', 'zona', 'ruta'],
      required: true,
      comment: 'Tipo de bloqueo: usuario, zona o ruta',
    },
    // Razón del bloqueo
    razon: {
      type: String,
      comment: 'Razón por la cual se realizó el bloqueo',
    },
    // Fecha de expiración del bloqueo
    fecha_expiracion: {
      type: Date,
      comment: 'Fecha y hora en que expira el bloqueo (null si es permanente)',
    },
    // Indica si el bloqueo es permanente
    es_permanente: {
      type: Boolean,
      default: false,
      comment: 'Indica si el bloqueo es permanente o temporal',
    },
  },
  {
    timestamps: true, // Crea automáticamente createdAt y updatedAt
  }
);

// Índices para optimizar consultas frecuentes
esquemaBloqueoConductor.index({ id_conductor: 1 });
esquemaBloqueoConductor.index({ id_usuario_bloqueado: 1 });
esquemaBloqueoConductor.index({ fecha_expiracion: 1 }); // Para encontrar bloqueos expirados

const BloqueoConductor = mongoose.model('BloqueoConductor', esquemaBloqueoConductor);

export default BloqueoConductor;
// Exportar también con el nombre en inglés para compatibilidad
export { BloqueoConductor as DriverBlock };
