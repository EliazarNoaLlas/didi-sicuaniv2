import mongoose from 'mongoose';

const bidSchema = new mongoose.Schema(
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
    // Bid info
    bid_type: {
      type: String,
      enum: ['accept', 'counteroffer', 'reject'],
      required: true,
    },
    offered_price: {
      type: Number,
      required: function () {
        return this.bid_type === 'counteroffer';
      },
    },
    // Driver metrics en el momento del bid
    driver_distance_km: Number,
    driver_eta_min: Number,
    driver_rating: Number,
    // Estado
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired'],
      default: 'pending',
    },
    // Timestamps
    responded_at: Date,
    expires_at: Date,
  },
  {
    timestamps: true,
  }
);

// Índices
bidSchema.index({ ride_request_id: 1 });
bidSchema.index({ driver_id: 1 });
bidSchema.index({ status: 1 });
bidSchema.index({ expires_at: 1 });

const Bid = mongoose.model('Bid', bidSchema);

export default Bid;

