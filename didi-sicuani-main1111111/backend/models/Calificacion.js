import mongoose from 'mongoose';

/**
 * Modelo de Calificación
 * Representa una calificación realizada por un usuario (pasajero o conductor) a otro usuario
 */
const esquemaCalificacion = new mongoose.Schema(
  {
    // ID del viaje relacionado
    id_viaje: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SolicitudViaje',
      required: true,
      comment: 'ID del viaje relacionado con esta calificación',
    },
    // ID del usuario que realiza la calificación
    id_calificador: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      comment: 'ID del usuario que realiza la calificación',
    },
    // ID del usuario que recibe la calificación
    id_calificado: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      comment: 'ID del usuario que recibe la calificación',
    },
    // Calificación numérica
    calificacion: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      comment: 'Calificación numérica (1-5)',
    },
    // Comentario opcional
    comentario: {
      type: String,
      trim: true,
      comment: 'Comentario opcional sobre la calificación',
    },
    // Tipo de calificador
    tipo_calificador: {
      type: String,
      enum: ['pasajero', 'conductor'],
      required: true,
      comment: 'Tipo de usuario que realiza la calificación: pasajero o conductor',
    },
  },
  {
    timestamps: true, // Crea automáticamente createdAt y updatedAt
  }
);

// Índices para optimizar consultas frecuentes
esquemaCalificacion.index({ id_viaje: 1 });
esquemaCalificacion.index({ id_calificador: 1 });
esquemaCalificacion.index({ id_calificado: 1 });
// Un usuario solo puede calificar un viaje una vez
esquemaCalificacion.index({ id_viaje: 1, id_calificador: 1 }, { unique: true });

const Calificacion = mongoose.model('Calificacion', esquemaCalificacion);

export default Calificacion;
// Exportar también con el nombre en inglés para compatibilidad
export { Calificacion as Rating };
