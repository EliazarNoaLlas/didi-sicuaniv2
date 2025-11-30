import mongoose from 'mongoose';

/**
 * Modelo de Usuario
 * Representa un usuario del sistema (pasajero, conductor o administrador)
 */
const esquemaUsuario = new mongoose.Schema(
  {
    // Información básica del usuario
    nombre: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true,
      comment: 'Nombre completo del usuario',
    },
    correo: {
      type: String,
      required: [true, 'El correo electrónico es requerido'],
      unique: true, // Esto crea un índice automáticamente
      lowercase: true,
      trim: true,
      comment: 'Correo electrónico del usuario (único)',
    },
    contrasena: {
      type: String,
      required: [true, 'La contraseña es requerida'],
      minlength: 6,
      select: false, // No incluir en queries por defecto por seguridad
      comment: 'Contraseña encriptada del usuario',
    },
    telefono: {
      type: String,
      trim: true,
      comment: 'Número de teléfono del usuario',
    },
    // Tipo de usuario
    tipo_usuario: {
      type: String,
      enum: ['pasajero', 'conductor', 'administrador'],
      required: true,
      comment: 'Tipo de usuario: pasajero, conductor o administrador',
    },
    // Estado del usuario
    esta_activo: {
      type: Boolean,
      default: true,
      comment: 'Indica si el usuario está activo en el sistema',
    },
    // Campos específicos para conductores
    informacion_conductor: {
      tipo_vehiculo: {
        type: String,
        enum: ['taxi', 'mototaxi'],
        comment: 'Tipo de vehículo del conductor',
      },
      placa_vehiculo: {
        type: String,
        comment: 'Placa del vehículo',
      },
      modelo_vehiculo: {
        type: String,
        comment: 'Modelo del vehículo',
      },
      numero_licencia: {
        type: String,
        comment: 'Número de licencia de conducir',
      },
      calificacion: {
        type: Number,
        default: 5.0,
        min: 0,
        max: 5,
        comment: 'Calificación promedio del conductor (0-5)',
      },
      total_viajes: {
        type: Number,
        default: 0,
        comment: 'Total de viajes completados por el conductor',
      },
      esta_en_linea: {
        type: Boolean,
        default: false,
        comment: 'Indica si el conductor está en línea',
      },
      esta_disponible: {
        type: Boolean,
        default: false,
        comment: 'Indica si el conductor está disponible para aceptar viajes',
      },
      latitud_actual: {
        type: Number,
        comment: 'Latitud actual del conductor (GPS)',
      },
      longitud_actual: {
        type: Number,
        comment: 'Longitud actual del conductor (GPS)',
      },
    },
  },
  {
    timestamps: true, // Crea automáticamente createdAt y updatedAt
  }
);

// Índices para optimizar consultas frecuentes
// Nota: correo ya tiene índice único por 'unique: true', no duplicar
esquemaUsuario.index({ tipo_usuario: 1 });
esquemaUsuario.index({ 'informacion_conductor.esta_en_linea': 1, 'informacion_conductor.esta_disponible': 1 });

const Usuario = mongoose.model('Usuario', esquemaUsuario);

export default Usuario;
// Exportar también con el nombre en inglés para compatibilidad
export { Usuario as User };
