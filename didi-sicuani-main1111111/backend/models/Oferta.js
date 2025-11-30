import mongoose from 'mongoose';

/**
 * Modelo de Oferta
 * Representa una oferta de precio realizada por un conductor para una solicitud de viaje
 */
const esquemaOferta = new mongoose.Schema(
  {
    // ID de la solicitud de viaje a la que pertenece esta oferta
    id_solicitud_viaje: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SolicitudViaje',
      required: true,
      comment: 'ID de la solicitud de viaje',
    },
    // ID del conductor que realiza la oferta
    id_conductor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      comment: 'ID del conductor que realiza la oferta',
    },
    // Información de la oferta
    tipo_oferta: {
      type: String,
      enum: ['aceptar', 'contraoferta', 'rechazar'],
      required: true,
      comment: 'Tipo de oferta: aceptar precio, contraoferta o rechazar',
    },
    precio_ofrecido: {
      type: Number,
      required: function () {
        return this.tipo_oferta === 'contraoferta';
      },
      comment: 'Precio ofrecido por el conductor (requerido si es contraoferta)',
    },
    // Métricas del conductor en el momento de la oferta
    distancia_conductor_km: {
      type: Number,
      comment: 'Distancia del conductor al punto de recogida en kilómetros',
    },
    tiempo_estimado_llegada_min: {
      type: Number,
      comment: 'Tiempo estimado de llegada del conductor en minutos',
    },
    calificacion_conductor: {
      type: Number,
      comment: 'Calificación del conductor en el momento de la oferta',
    },
    // Estado de la oferta
    estado: {
      type: String,
      enum: ['pendiente', 'aceptada', 'rechazada', 'expirada'],
      default: 'pendiente',
      comment: 'Estado actual de la oferta',
    },
    // Timestamps
    fecha_respuesta: {
      type: Date,
      comment: 'Fecha y hora en que se respondió la oferta',
    },
    fecha_expiracion: {
      type: Date,
      comment: 'Fecha y hora de expiración de la oferta',
    },
    // Soft delete - Eliminación lógica
    fecha_eliminacion: {
      type: Date,
      default: null,
      comment: 'Fecha en que se eliminó el registro (soft delete)',
    },
  },
  {
    timestamps: true, // Crea automáticamente createdAt y updatedAt
  }
);

// Índices para optimizar consultas frecuentes
esquemaOferta.index({ id_solicitud_viaje: 1 });
esquemaOferta.index({ id_conductor: 1 });
esquemaOferta.index({ estado: 1 });
esquemaOferta.index({ fecha_expiracion: 1 });
esquemaOferta.index({ fecha_eliminacion: 1 }); // Para filtrar eliminadas

const Oferta = mongoose.model('Oferta', esquemaOferta);

export default Oferta;
// Exportar también con el nombre en inglés para compatibilidad
export { Oferta as Bid };
