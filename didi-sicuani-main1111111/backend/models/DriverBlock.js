import mongoose from 'mongoose';

const driverBlockSchema = new mongoose.Schema(
  {
    driver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    blocked_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    blocked_address: {
      type: String,
    },
    block_type: {
      type: String,
      enum: ['user', 'zone', 'route'],
      required: true,
    },
    reason: {
      type: String,
    },
    expires_at: {
      type: Date,
    },
    is_permanent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Índices
driverBlockSchema.index({ driver_id: 1 });
driverBlockSchema.index({ blocked_user_id: 1 });
driverBlockSchema.index({ expires_at: 1 });

const DriverBlock = mongoose.model('DriverBlock', driverBlockSchema);

export default DriverBlock;

