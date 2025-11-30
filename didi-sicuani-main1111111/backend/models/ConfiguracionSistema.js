import mongoose from 'mongoose';

/**
 * Modelo de Configuración del Sistema
 * Almacena configuraciones generales del sistema que pueden ser modificadas por administradores
 */
const esquemaConfiguracionSistema = new mongoose.Schema(
  {
    // Clave única de la configuración
    clave: {
      type: String,
      required: true,
      unique: true,
      comment: 'Clave única que identifica la configuración',
    },
    // Valor de la configuración (puede ser cualquier tipo)
    valor: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      comment: 'Valor de la configuración (puede ser string, número, objeto, etc.)',
    },
    // Descripción de la configuración
    descripcion: {
      type: String,
      comment: 'Descripción de qué representa esta configuración',
    },
    // Usuario que actualizó la configuración
    actualizado_por: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      comment: 'ID del usuario que actualizó esta configuración',
    },
  },
  {
    timestamps: true, // Crea automáticamente createdAt y updatedAt
  }
);

// Índices para optimizar consultas
esquemaConfiguracionSistema.index({ clave: 1 });

const ConfiguracionSistema = mongoose.model('ConfiguracionSistema', esquemaConfiguracionSistema);

export default ConfiguracionSistema;
// Exportar también con el nombre en inglés para compatibilidad
export { ConfiguracionSistema as SystemConfig };
