/**
 * Script para verificar el rol de un usuario en la base de datos
 * Uso: node scripts/check-user-role.js <correo>
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Usuario from '../models/Usuario.js';

dotenv.config();

const verificarRolUsuario = async (correo) => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Buscar usuario
    const usuario = await Usuario.findOne({ correo });

    if (!usuario) {
      console.log(`❌ Usuario con correo "${correo}" no encontrado`);
      process.exit(1);
    }

    // Mostrar información del usuario
    console.log('📋 Información del Usuario:');
    console.log('─'.repeat(50));
    console.log(`ID: ${usuario._id}`);
    console.log(`Nombre: ${usuario.nombre}`);
    console.log(`Correo: ${usuario.correo}`);
    console.log(`Tipo de Usuario: ${usuario.tipo_usuario}`);
    console.log(`Activo: ${usuario.esta_activo ? 'Sí' : 'No'}`);
    
    if (usuario.tipo_usuario === 'conductor') {
      console.log(`\n🚗 Información del Conductor:`);
      console.log(`Tipo de Vehículo: ${usuario.informacion_conductor?.tipo_vehiculo || 'No especificado'}`);
      console.log(`En Línea: ${usuario.informacion_conductor?.esta_en_linea ? 'Sí' : 'No'}`);
      console.log(`Disponible: ${usuario.informacion_conductor?.esta_disponible ? 'Sí' : 'No'}`);
      console.log(`Calificación: ${usuario.informacion_conductor?.calificacion || 'N/A'}`);
    }

    console.log('\n✅ Verificación completada');

    // Verificar si puede acceder a endpoints de conductor
    if (usuario.tipo_usuario !== 'conductor') {
      console.log('\n⚠️  ADVERTENCIA: Este usuario NO es conductor');
      console.log('   Para acceder a /api/drivers/queue, el usuario debe tener tipo_usuario: "conductor"');
      console.log('\n💡 Solución:');
      console.log('   1. Actualiza el tipo_usuario en la base de datos:');
      console.log(`      db.usuarios.updateOne({correo: "${correo}"}, {$set: {tipo_usuario: "conductor"}})`);
      console.log('   2. O crea un nuevo usuario con tipo_usuario: "conductor"');
    } else {
      console.log('\n✅ Este usuario PUEDE acceder a endpoints de conductor');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

// Obtener correo de argumentos
const correo = process.argv[2];

if (!correo) {
  console.log('❌ Uso: node scripts/check-user-role.js <correo>');
  console.log('   Ejemplo: node scripts/check-user-role.js conductor@example.com');
  process.exit(1);
}

verificarRolUsuario(correo);
