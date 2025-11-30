import mongoose from 'mongoose';

const driverHoldSchema = new mongoose.Schema(
  {
    driver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ride_request_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RideRequest',
      required: true,
    },
    expires_at: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'accepted', 'released', 'expired'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Índices
driverHoldSchema.index({ driver_id: 1, status: 1 });
driverHoldSchema.index({ ride_request_id: 1 });
driverHoldSchema.index({ expires_at: 1 });

const DriverHold = mongoose.model('DriverHold', driverHoldSchema);

export default DriverHold;

