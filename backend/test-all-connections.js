import dotenv from 'dotenv';
import connectDB from './config/database.js';
import connectRedis from './config/redis.js';
import mongoose from 'mongoose';

dotenv.config();

const testAllConnections = async () => {
  console.log('🔍 Verificando todas las conexiones...\n');
  console.log('='.repeat(60));
  console.log('');
  console.log('ℹ️  Nota: PostgreSQL ha sido removido. El proyecto ahora usa solo MongoDB.\n');
  console.log('');
  
  const results = {
    mongodb: false,
    redis: false
  };
  
  // ========== TEST 1: MONGODB ==========
  console.log('📊 TEST 1: MongoDB');
  console.log('-'.repeat(60));
  try {
    await connectDB();
    console.log('✅ MongoDB: Conectado');
    console.log(`   URI: ${process.env.MONGODB_URI || 'No configurado'}`);
    
    // Listar bases de datos
    const adminDb = mongoose.connection.db.admin();
    const { databases } = await adminDb.listDatabases();
    const dbExists = databases.some(db => db.name === 'didi-sicuani');
    
    if (dbExists) {
      console.log('✅ Base de datos "didi-sicuani" existe');
    } else {
      console.log('⚠️  Base de datos "didi-sicuani" no existe (se creará automáticamente)');
    }
    
    results.mongodb = true;
  } catch (error) {
    console.error('❌ MongoDB: Error -', error.message);
    results.mongodb = false;
  }
  console.log('');
  
  // ========== TEST 2: REDIS ==========
  console.log('📊 TEST 2: Redis');
  console.log('-'.repeat(60));
  try {
    await connectRedis();
    const redis = (await import('./config/redis.js')).getRedisClient();
    
    const pong = await redis.ping();
    console.log('✅ Redis: Conectado');
    console.log(`   Host: ${process.env.REDIS_HOST || 'localhost'}`);
    console.log(`   Port: ${process.env.REDIS_PORT || 6379}`);
    console.log(`   PING: ${pong}`);
    
    // Test básico
    await redis.set('test:all_connections', 'ok', { EX: 10 });
    const testValue = await redis.get('test:all_connections');
    if (testValue === 'ok') {
      console.log('✅ Redis: SET/GET funcionando');
    }
    await redis.del('test:all_connections');
    
    await redis.quit();
    results.redis = true;
  } catch (error) {
    console.error('❌ Redis: Error -', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.error('   💡 Verifica que Redis esté corriendo:');
      console.error('      - Redis Windows: Get-Service -Name Redis');
      console.error('      - Memurai: Get-Service -Name Memurai');
    }
    results.redis = false;
  }
  console.log('');
  
  // ========== RESUMEN ==========
  console.log('='.repeat(60));
  console.log('📋 RESUMEN');
  console.log('='.repeat(60));
  console.log('');
  
  const allConnected = results.mongodb && results.redis;
  
  console.log(`MongoDB: ${results.mongodb ? '✅ Conectado' : '❌ Error'}`);
  console.log(`Redis:   ${results.redis ? '✅ Conectado' : '❌ Error'}`);
  console.log('');
  console.log('ℹ️  PostgreSQL ha sido removido del proyecto');
  console.log('   Todas las operaciones geoespaciales ahora usan cálculos matemáticos');
  console.log('');
  
  if (allConnected) {
    console.log('🎉 ¡Todas las conexiones están funcionando correctamente!');
    console.log('');
    console.log('💡 Próximos pasos:');
    console.log('   1. Inicia el servidor: npm run dev');
    console.log('   2. Todas las conexiones se establecerán automáticamente');
  } else {
    console.log('⚠️  Algunas conexiones fallaron. Revisa los errores arriba.');
    console.log('');
    console.log('💡 Guías disponibles:');
    if (!results.mongodb) {
      console.log('   - MongoDB: Ver GUIA_MONGODB_WEBSTORM.md');
    }
    if (!results.redis) {
      console.log('   - Redis: Ver GUIA_REDIS_WINDOWS.md');
    }
  }
  console.log('');
  
  // Cerrar conexiones
  try {
    if (results.mongodb) {
      await mongoose.connection.close();
    }
  } catch (err) {
    // Ignorar errores al cerrar
  }
  
  process.exit(allConnected ? 0 : 1);
};

testAllConnections();

