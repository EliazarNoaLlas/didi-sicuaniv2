import mongoose from 'mongoose';

/**
 * Modelo de Solicitud de Viaje
 * Representa una solicitud de viaje realizada por un pasajero
 * 
 * @description Este modelo almacena toda la información relacionada con una solicitud de viaje,
 * incluyendo origen, destino, precios, estado, conductor asignado, etc.
 */
const solicitudViajeSchema = new mongoose.Schema(
  {
    // ID del pasajero que realiza la solicitud
    id_pasajero: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      comment: 'ID del pasajero que realiza la solicitud de viaje',
    },
    
    // Geolocalización del origen
    origen_lat: {
      type: Number,
      required: true,
      comment: 'Latitud del punto de origen del viaje',
    },
    origen_lon: {
      type: Number,
      required: true,
      comment: 'Longitud del punto de origen del viaje',
    },
    origen_direccion: {
      type: String,
      required: true,
      comment: 'Dirección completa del punto de origen',
    },
    
    // Geolocalización del destino
    destino_lat: {
      type: Number,
      required: true,
      comment: 'Latitud del punto de destino del viaje',
    },
    destino_lon: {
      type: Number,
      required: true,
      comment: 'Longitud del punto de destino del viaje',
    },
    destino_direccion: {
      type: String,
      required: true,
      comment: 'Dirección completa del punto de destino',
    },
    
    // Información de precios
    precio_sugerido_soles: {
      type: Number,
      required: true,
      comment: 'Precio sugerido calculado por el sistema en soles peruanos',
    },
    precio_ofrecido_pasajero: {
      type: Number,
      required: false,
      comment: 'Precio ofrecido por el pasajero (opcional según RF-001)',
    },
    precio_final_acordado: {
      type: Number,
      comment: 'Precio final acordado entre pasajero y conductor',
    },
    
    // Métricas del viaje
    distancia_estimada_km: {
      type: Number,
      comment: 'Distancia estimada del viaje en kilómetros',
    },
    duracion_estimada_min: {
      type: Number,
      comment: 'Duración estimada del viaje en minutos',
    },
    
    // Preferencias del viaje
    tipo_vehiculo: {
      type: String,
      enum: ['taxi', 'mototaxi', 'cualquiera'],
      default: 'cualquiera',
      comment: 'Tipo de vehículo solicitado por el pasajero',
    },
    metodo_pago: {
      type: String,
      enum: ['efectivo', 'tarjeta', 'billetera'],
      default: 'efectivo',
      comment: 'Método de pago preferido por el pasajero',
    },
    
    // Estado de la solicitud
    estado: {
      type: String,
      enum: [
        'pendiente',
        'subasta_activa',
        'asignado',
        'conductor_en_ruta', // Conductor yendo al pasajero
        'en_progreso', // Conductor recogió al pasajero, en camino al destino
        'completado',
        'cancelado',
      ],
      default: 'pendiente',
      comment: 'Estado actual de la solicitud de viaje',
    },
    
    // Información de asignación
    id_conductor_asignado: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      comment: 'ID del conductor asignado al viaje',
    },
    fecha_asignacion: {
      type: Date,
      comment: 'Fecha y hora en que se asignó el conductor al viaje',
    },
    
    // Control de tiempo
    fecha_expiracion: {
      type: Date,
      comment: 'Fecha y hora de expiración de la solicitud (5 minutos después de creada según RF-009)',
    },
    
    // Soft delete - Eliminación lógica
    fecha_eliminacion: {
      type: Date,
      default: null,
      comment: 'Fecha en que se eliminó el registro (soft delete)',
    },
    eliminado_por: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      default: null,
      comment: 'ID del usuario que eliminó el registro',
    },
  },
  {
    timestamps: true, // Crea automáticamente createdAt y updatedAt
  }
);

// Índices para optimizar consultas frecuentes
solicitudViajeSchema.index({ id_pasajero: 1 });
solicitudViajeSchema.index({ estado: 1 });
solicitudViajeSchema.index({ fecha_expiracion: 1 });
solicitudViajeSchema.index({ origen_lat: 1, origen_lon: 1 }); // Para búsquedas geoespaciales
solicitudViajeSchema.index({ id_conductor_asignado: 1 });
solicitudViajeSchema.index({ fecha_eliminacion: 1 }); // Para filtrar eliminados

// Mantener compatibilidad con el nombre anterior durante la migración
const SolicitudViaje = mongoose.model('SolicitudViaje', solicitudViajeSchema);
const RideRequest = mongoose.model('RideRequest', solicitudViajeSchema); // Compatibilidad temporal

export default SolicitudViaje;
export { RideRequest }; // Exportar también el nombre anterior para compatibilidad

