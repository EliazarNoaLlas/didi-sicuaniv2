import mongoose from 'mongoose';

const bidNegotiationSchema = new mongoose.Schema(
  {
    ride_request_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RideRequest',
      required: true,
    },
    driver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Negociación
    round_number: {
      type: Number,
      default: 1,
      max: 2, // Máximo 2 rondas
    },
    initiator: {
      type: String,
      enum: ['passenger', 'driver'],
      required: true,
    },
    offered_price: {
      type: Number,
      required: true,
    },
    message: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Índices
bidNegotiationSchema.index({ ride_request_id: 1, driver_id: 1 });
bidNegotiationSchema.index({ round_number: 1 });

const BidNegotiation = mongoose.model('BidNegotiation', bidNegotiationSchema);

export default BidNegotiation;

