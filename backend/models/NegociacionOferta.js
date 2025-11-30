import mongoose from 'mongoose';

/**
 * Modelo de Negociación de Oferta
 * Representa una negociación de precio entre un pasajero y un conductor
 */
const esquemaNegociacionOferta = new mongoose.Schema(
  {
    // ID de la solicitud de viaje
    id_solicitud_viaje: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SolicitudViaje',
      required: true,
      comment: 'ID de la solicitud de viaje en negociación',
    },
    // ID del conductor involucrado en la negociación
    id_conductor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      comment: 'ID del conductor involucrado en la negociación',
    },
    // Información de la negociación
    numero_ronda: {
      type: Number,
      default: 1,
      max: 2, // Máximo 2 rondas de negociación
      comment: 'Número de ronda de negociación (máximo 2 rondas)',
    },
    // Iniciador de la negociación
    iniciador: {
      type: String,
      enum: ['pasajero', 'conductor'],
      required: true,
      comment: 'Quién inició esta ronda de negociación: pasajero o conductor',
    },
    // Precio ofrecido en esta ronda
    precio_ofrecido: {
      type: Number,
      required: true,
      comment: 'Precio ofrecido en esta ronda de negociación',
    },
    // Mensaje opcional
    mensaje: {
      type: String,
      comment: 'Mensaje opcional asociado a la oferta de negociación',
    },
  },
  {
    timestamps: true, // Crea automáticamente createdAt y updatedAt
  }
);

// Índices para optimizar consultas frecuentes
esquemaNegociacionOferta.index({ id_solicitud_viaje: 1, id_conductor: 1 });
esquemaNegociacionOferta.index({ numero_ronda: 1 });

const NegociacionOferta = mongoose.model('NegociacionOferta', esquemaNegociacionOferta);

export default NegociacionOferta;
// Exportar también con el nombre en inglés para compatibilidad
export { NegociacionOferta as BidNegotiation };
