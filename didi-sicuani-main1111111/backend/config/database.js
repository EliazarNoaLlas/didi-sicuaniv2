import mongoose from 'mongoose';

/**
 * Conecta a la base de datos MongoDB
 * @returns {Promise<mongoose.Connection>} Conexión a MongoDB
 */
const conectarBD = async () => {
  try {
    const conexion = await mongoose.connect(process.env.MONGODB_URI, {
      // Opciones de conexión a MongoDB
    });

    console.log(`✅ MongoDB conectado: ${conexion.connection.host}`);
    
    // Manejar eventos de conexión
    mongoose.connection.on('error', (error) => {
      console.error('❌ Error de conexión a MongoDB:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB desconectado');
    });

    return conexion;
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB:', error);
    throw error;
  }
};

export default conectarBD;
// Exportar también con el nombre anterior para compatibilidad
export { conectarBD as connectDB };

