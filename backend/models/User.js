import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true, // Esto crea un índice automáticamente
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // No incluir en queries por defecto
    },
    phone: {
      type: String,
      trim: true,
    },
    userType: {
      type: String,
      enum: ['passenger', 'driver', 'admin'],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Campos específicos para conductores
    driverInfo: {
      vehicleType: {
        type: String,
        enum: ['taxi', 'mototaxi'],
      },
      vehiclePlate: String,
      vehicleModel: String,
      licenseNumber: String,
      rating: {
        type: Number,
        default: 5.0,
        min: 0,
        max: 5,
      },
      totalRides: {
        type: Number,
        default: 0,
      },
      isOnline: {
        type: Boolean,
        default: false,
      },
      isAvailable: {
        type: Boolean,
        default: false,
      },
      currentLatitude: Number,
      currentLongitude: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Índices
// Nota: email ya tiene índice único por 'unique: true', no duplicar
userSchema.index({ userType: 1 });
userSchema.index({ 'driverInfo.isOnline': 1, 'driverInfo.isAvailable': 1 });

const User = mongoose.model('User', userSchema);

export default User;

