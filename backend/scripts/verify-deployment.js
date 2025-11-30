import conectarBD from '../config/database.js';
import conectarRedis from '../config/redis.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const verificarDespliegue = async () => {
  console.log('🔍 Verificando despliegue de DiDi-Sicuani...\n');
  
  const resultados = {
    mongodb: false,
    redis: false,
    variablesEntorno: false,
  };
  
  // 1. Verificar variables de entorno
  console.log('1️⃣  Verificando variables de entorno...');
  const variablesRequeridas = ['MONGODB_URI', 'JWT_SECRET', 'PORT', 'NODE_ENV'];
  const variablesFaltantes = variablesRequeridas.filter(nombreVar => !process.env[nombreVar]);
  
  if (variablesFaltantes.length > 0) {
    console.error('❌ Variables de entorno faltantes:', variablesFaltantes.join(', '));
    resultados.variablesEntorno = false;
  } else {
    console.log('✅ Todas las variables de entorno requeridas están configuradas');
    resultados.variablesEntorno = true;
  }
  console.log('');
  
  // 2. Verificar MongoDB
  console.log('2️⃣  Verificando conexión a MongoDB...');
  try {
    await conectarBD();
    const conexion = mongoose.connection;
    
    // Probar operación simple
    const adminDb = conexion.db.admin();
    const { databases } = await adminDb.listDatabases();
    
    console.log('✅ MongoDB conectado exitosamente');
    console.log(`   - Host: ${conexion.host}`);
    console.log(`   - Base de datos: ${conexion.name}`);
    console.log(`   - Bases de datos disponibles: ${databases.length}`);
    resultados.mongodb = true;
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    console.error('   Verifica MONGODB_URI en tus variables de entorno');
    resultados.mongodb = false;
  }
  console.log('');
  
  // 3. Verificar Redis (opcional)
  console.log('3️⃣  Verificando conexión a Redis (opcional)...');
  try {
    const redis = await conectarRedis();
    if (redis && redis.isOpen) {
      await redis.ping();
      console.log('✅ Redis conectado exitosamente');
      resultados.redis = true;
    } else {
      console.log('⚠️  Redis no está disponible (opcional, la app funciona sin Redis)');
      resultados.redis = false;
    }
  } catch (error) {
    console.log('⚠️  Redis no está disponible:', error.message);
    console.log('   (Esto es opcional, la aplicación funciona sin Redis)');
    resultados.redis = false;
  }
  console.log('');
  
  // 4. Resumen
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 Resumen de Verificación:');
  console.log('');
  console.log(`   Variables de entorno: ${resultados.variablesEntorno ? '✅' : '❌'}`);
  console.log(`   MongoDB: ${resultados.mongodb ? '✅' : '❌'}`);
  console.log(`   Redis: ${resultados.redis ? '✅' : '⚠️  (opcional)'}`);
  console.log('');
  
  if (resultados.variablesEntorno && resultados.mongodb) {
    console.log('✅ ¡Despliegue verificado exitosamente!');
    console.log('');
    console.log('🎯 Próximos pasos:');
    console.log('   1. Verifica que el servidor esté corriendo');
    console.log('   2. Prueba el endpoint /health');
    console.log('   3. Verifica que el frontend pueda conectarse');
    process.exit(0);
  } else {
    console.log('❌ Hay problemas con la configuración');
    console.log('');
    console.log('💡 Soluciones:');
    if (!resultados.variablesEntorno) {
      console.log('   - Verifica que todas las variables de entorno estén configuradas');
    }
    if (!resultados.mongodb) {
      console.log('   - Verifica MONGODB_URI en tus variables de entorno');
      console.log('   - Asegúrate de que MongoDB Atlas esté accesible');
      console.log('   - Verifica que tu IP esté en la whitelist de MongoDB Atlas');
    }
    process.exit(1);
  }
  console.log('═══════════════════════════════════════════════════════════');
};

verificarDespliegue().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
