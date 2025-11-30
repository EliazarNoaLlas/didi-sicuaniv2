import connectRedis, { getRedisClient } from './config/redis.js';
import dotenv from 'dotenv';

dotenv.config();

const testConnection = async () => {
  try {
    console.log('🔍 Intentando conectar a Redis...');
    console.log(`Host: ${process.env.REDIS_HOST || 'localhost'}`);
    console.log(`Port: ${process.env.REDIS_PORT || 6379}`);
    console.log('');
    
    // Conectar
    await connectRedis();
    const redis = getRedisClient();
    
    console.log('✅ Redis conectado exitosamente');
    console.log('');
    
    // Test 1: PING
    console.log('📡 Test 1: PING');
    const pong = await redis.ping();
    console.log(`   Respuesta: ${pong}`);
    console.log('');
    
    // Test 2: SET/GET
    console.log('📡 Test 2: SET/GET');
    await redis.set('test:connection', 'DiDi-Sicuani Redis Test', { EX: 60 });
    const value = await redis.get('test:connection');
    console.log(`   Valor guardado: ${value}`);
    console.log('');
    
    // Test 3: TTL (Time To Live)
    console.log('📡 Test 3: TTL (Time To Live)');
    const ttl = await redis.ttl('test:connection');
    console.log(`   Tiempo restante: ${ttl} segundos`);
    console.log('');
    
    // Test 4: Sorted Set (para colas)
    console.log('📡 Test 4: Sorted Set (Colas)');
    const now = Date.now();
    await redis.zAdd('test:queue', {
      score: now,
      value: 'ride_request_1'
    });
    await redis.zAdd('test:queue', {
      score: now + 1000,
      value: 'ride_request_2'
    });
    
    const queueItems = await redis.zRangeWithScores('test:queue', 0, -1);
    console.log(`   Items en cola: ${queueItems.length}`);
    queueItems.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.value} (score: ${item.score})`);
    });
    console.log('');
    
    // Test 5: Hash (para datos estructurados)
    console.log('📡 Test 5: Hash (Datos Estructurados)');
    await redis.hSet('test:user:1', {
      name: 'Juan Pérez',
      email: 'juan@example.com',
      userType: 'driver'
    });
    const userData = await redis.hGetAll('test:user:1');
    console.log('   Datos del usuario:');
    Object.entries(userData).forEach(([key, value]) => {
      console.log(`     ${key}: ${value}`);
    });
    console.log('');
    
    // Test 6: List (para colas FIFO)
    console.log('📡 Test 6: List (Cola FIFO)');
    await redis.lPush('test:notifications', 'notification_1', 'notification_2', 'notification_3');
    const listLength = await redis.lLen('test:notifications');
    console.log(`   Notificaciones en cola: ${listLength}`);
    const firstNotification = await redis.rPop('test:notifications');
    console.log(`   Primera notificación procesada: ${firstNotification}`);
    console.log('');
    
    // Limpiar datos de prueba
    console.log('🧹 Limpiando datos de prueba...');
    await redis.del('test:connection', 'test:queue', 'test:user:1', 'test:notifications');
    console.log('✅ Datos de prueba eliminados');
    console.log('');
    
    // Cerrar conexión
    await redis.quit();
    console.log('✅ Test completado exitosamente');
    console.log('');
    console.log('🎉 ¡Redis está funcionando correctamente!');
    console.log('');
    console.log('💡 Próximos pasos:');
    console.log('   1. Inicia el servidor: npm run dev');
    console.log('   2. Redis se conectará automáticamente al iniciar');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('💡 Verifica:');
    console.error('  1. Redis está corriendo');
    console.error('     - Redis Windows: Get-Service -Name Redis');
    console.error('     - Memurai: Get-Service -Name Memurai');
    console.error('  2. El puerto 6379 está disponible: netstat -ano | findstr :6379');
    console.error('  3. Las variables en .env son correctas');
    console.error('  4. No hay firewall bloqueando el puerto');
    console.error('');
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('🔧 Solución: Inicia Redis:');
      console.error('   - Redis Windows: cd C:\\Redis && .\\redis-server.exe --service-start');
      console.error('   - Memurai: Start-Service -Name Memurai');
    }
    
    if (error.message.includes('NOAUTH')) {
      console.error('🔧 Solución: Verifica la contraseña en .env:');
      console.error('   REDIS_PASSWORD=tu_password');
    }
    
    process.exit(1);
  }
};

testConnection();

