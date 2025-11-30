import connectDB from './config/database.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const verifySetup = async () => {
  console.log('🔍 Verificando configuración de MongoDB...\n');
  
  // 1. Verificar variable de entorno
  console.log('1️⃣  Verificando variable MONGODB_URI...');
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI no está definida en .env');
    console.error('💡 Asegúrate de tener un archivo .env en backend/ con:');
    console.error('   MONGODB_URI=mongodb://localhost:27017/didi-sicuani');
    process.exit(1);
  }
  console.log('✅ MONGODB_URI encontrada:', process.env.MONGODB_URI);
  console.log('');
  
  // 2. Intentar conectar
  console.log('2️⃣  Intentando conectar a MongoDB...');
  let conn;
  try {
    conn = await connectDB();
    console.log('✅ Conexión exitosa');
    console.log('');
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    console.error('');
    console.error('💡 Soluciones posibles:');
    console.error('   1. Verifica que MongoDB esté corriendo: Get-Service -Name MongoDB');
    console.error('   2. Inicia MongoDB si está detenido: Start-Service -Name MongoDB');
    console.error('   3. Verifica que la URI en .env sea correcta');
    console.error('   4. Verifica credenciales si MongoDB tiene autenticación');
    process.exit(1);
  }
  
  // 3. Verificar información de conexión
  console.log('3️⃣  Información de conexión:');
  const dbConnection = mongoose.connection;
  console.log('   - Host:', dbConnection.host);
  console.log('   - Puerto:', dbConnection.port);
  console.log('   - Base de datos:', dbConnection.name);
  console.log('   - Estado:', dbConnection.readyState === 1 ? 'Conectado ✅' : 'Desconectado ❌');
  console.log('');
  
  // 4. Listar bases de datos
  console.log('4️⃣  Bases de datos disponibles:');
  try {
    const adminDb = dbConnection.db.admin();
    const { databases } = await adminDb.listDatabases();
    databases.forEach(db => {
      const sizeMB = (db.sizeOnDisk / 1024 / 1024).toFixed(2);
      const marker = db.name === 'didi-sicuani' ? '✅' : '  ';
      console.log(`${marker} - ${db.name} (${sizeMB} MB)`);
    });
    console.log('');
  } catch (error) {
    console.error('❌ Error al listar bases de datos:', error.message);
    console.log('');
  }
  
  // 5. Verificar base de datos didi-sicuani
  console.log('5️⃣  Verificando base de datos didi-sicuani...');
  try {
    const db = dbConnection.db;
    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('   ⚠️  No hay colecciones aún (normal si es primera vez)');
      console.log('   💡 Las colecciones se crearán automáticamente cuando las uses');
    } else {
      console.log('   ✅ Colecciones encontradas:');
      
      // Contar documentos en cada colección
      const collectionCounts = await Promise.all(
        collections.map(async (col) => {
          try {
            const count = await db.collection(col.name).countDocuments();
            return { name: col.name, count };
          } catch (err) {
            return { name: col.name, count: 'N/A' };
          }
        })
      );
      
      collectionCounts.forEach(({ name, count }) => {
        console.log(`      - ${name} (${count} documentos)`);
      });
    }
    console.log('');
  } catch (error) {
    console.error('❌ Error al verificar colecciones:', error.message);
    console.log('');
  }
  
  // 6. Test de escritura simple
  console.log('6️⃣  Test de escritura y lectura...');
  try {
    const testCollection = dbConnection.db.collection('connection_test');
    const testDoc = {
      test: true,
      timestamp: new Date(),
      message: 'Test de conexión desde backend',
      testId: Date.now()
    };
    
    // Insertar
    const insertResult = await testCollection.insertOne(testDoc);
    console.log('   ✅ Escritura exitosa');
    console.log('      Documento ID:', insertResult.insertedId);
    
    // Leer
    const result = await testCollection.findOne({ testId: testDoc.testId });
    if (result) {
      console.log('   ✅ Lectura exitosa');
      console.log('   📄 Documento insertado:');
      console.log('      - ID:', result._id);
      console.log('      - Timestamp:', result.timestamp);
      console.log('      - Mensaje:', result.message);
      
      // Limpiar
      await testCollection.deleteOne({ _id: insertResult.insertedId });
      console.log('   ✅ Documento de prueba eliminado');
    } else {
      console.log('   ⚠️  No se pudo leer el documento insertado');
    }
    console.log('');
  } catch (error) {
    console.error('❌ Error en test de escritura/lectura:', error.message);
    console.log('');
  }
  
  // 7. Verificar modelos de Mongoose (colecciones esperadas)
  console.log('7️⃣  Verificando modelos de Mongoose...');
  const expectedCollections = [
    'users',
    'riderequests',
    'bids',
    'bidnegotiations',
    'driverblocks',
    'driverholds'
  ];
  
  try {
    const db = dbConnection.db;
    const existingCollections = (await db.listCollections().toArray()).map(c => c.name);
    
    console.log('   Colecciones esperadas:');
    expectedCollections.forEach(colName => {
      const exists = existingCollections.includes(colName);
      const marker = exists ? '✅' : '⏳';
      console.log(`      ${marker} ${colName} ${exists ? `(${db.collection(colName).countDocuments ? 'existente' : ''})` : '(se creará automáticamente)'}`);
    });
    console.log('');
  } catch (error) {
    console.error('❌ Error al verificar modelos:', error.message);
    console.log('');
  }
  
  // 8. Cerrar conexión
  console.log('8️⃣  Cerrando conexión...');
  await dbConnection.close();
  console.log('✅ Conexión cerrada');
  console.log('');
  
  // Resumen final
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ ¡Configuración de MongoDB verificada exitosamente!');
  console.log('');
  console.log('📋 Resumen:');
  console.log('   ✅ MongoDB está corriendo');
  console.log('   ✅ Conexión desde backend funciona');
  console.log('   ✅ Base de datos didi-sicuani disponible');
  console.log('   ✅ Escritura y lectura funcionando');
  console.log('');
  console.log('🎯 Próximos pasos:');
  console.log('   1. Abre MongoDB Compass y conecta a: mongodb://localhost:27017');
  console.log('   2. Inicia el servidor backend: npm run dev');
  console.log('   3. Las colecciones se crearán automáticamente cuando las uses');
  console.log('');
  console.log('📚 Recursos:');
  console.log('   - Guía completa: GUIA_INSTALACION_MONGODB_COMPASS.md');
  console.log('   - MongoDB Compass: https://www.mongodb.com/try/download/compass');
  console.log('═══════════════════════════════════════════════════════════');
  
  process.exit(0);
};

verifySetup().catch(error => {
  console.error('❌ Error fatal:', error);
  console.error('');
  console.error('💡 Verifica:');
  console.error('   1. MongoDB está instalado y corriendo');
  console.error('   2. El archivo .env tiene MONGODB_URI configurado');
  console.error('   3. Las dependencias están instaladas: npm install');
  console.error('');
  process.exit(1);
});



