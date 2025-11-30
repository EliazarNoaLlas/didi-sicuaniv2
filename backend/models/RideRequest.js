import mongoose from 'mongoose';

const rideRequestSchema = new mongoose.Schema(
  {
    passenger_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    origin_address: {
      type: String,
      required: true,
    },
    destination_address: {
      type: String,
      required: true,
    },
    // Pricing
    suggested_price_soles: {
      type: Number,
      required: true,
    },
    passenger_offered_price: {
      type: Number,
      required: true,
    },
    final_agreed_price: Number,
    // Trip metrics
    estimated_distance_km: Number,
    estimated_duration_min: Number,
    // Preferencias
    vehicle_type: {
      type: String,
      enum: ['taxi', 'mototaxi', 'any'],
      default: 'any',
    },
    payment_method: {
      type: String,
      enum: ['cash', 'card', 'wallet'],
      default: 'cash',
    },
    // Estado
    status: {
      type: String,
      enum: [
        'pending',
        'bidding_active',
        'matched',
        'accepted',
        'in_progress',
        'completed',
        'cancelled',
      ],
      default: 'pending',
    },
    // Matching
    matched_driver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    matched_at: Date,
    // Control de tiempo
    expires_at: Date,
  },
  {
    timestamps: true,
  }
);

// Índices
rideRequestSchema.index({ passenger_id: 1 });
rideRequestSchema.index({ status: 1 });
rideRequestSchema.index({ expires_at: 1 });
rideRequestSchema.index({ 'origin_lat': 1, 'origin_lon': 1 }); // Para búsquedas geoespaciales

const RideRequest = mongoose.model('RideRequest', rideRequestSchema);

export default RideRequest;

