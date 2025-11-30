/**
 * Script para crear o actualizar usuario administrador
 * 
 * Uso:
 *   node scripts/crear-usuario-admin.js
 * 
 * Esto crea o actualiza:
 * - Usuario administrador: admin@example.com / Soloyo_12
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import conectarBD from '../config/database.js';

dotenv.config();

const crearUsuarioAdmin = async () => {
  try {
    // Conectar a MongoDB
    await conectarBD();
    console.log('✅ Conectado a MongoDB');

    const Usuario = (await import('../models/Usuario.js')).default;

    // Datos del administrador
    const correoAdmin = 'admin@example.com';
    const contrasenaAdmin = 'Soloyo_12';
    const contrasenaHasheada = await bcrypt.hash(contrasenaAdmin, 10);

    const datosAdmin = {
      nombre: 'Administrador',
      correo: correoAdmin,
      contrasena: contrasenaHasheada,
      tipo_usuario: 'administrador',
      telefono: '+51999999999',
      esta_activo: true,
    };

    // Buscar si el usuario ya existe
    let admin = await Usuario.findOne({ correo: correoAdmin });
    
    if (admin) {
      console.log('⚠️  Usuario admin ya existe, actualizando contraseña...');
      admin.nombre = datosAdmin.nombre;
      admin.contrasena = contrasenaHasheada;
      admin.tipo_usuario = 'administrador';
      admin.telefono = datosAdmin.telefono;
      admin.esta_activo = true;
      await admin.save();
      console.log('✅ Usuario admin actualizado');
    } else {
      admin = await Usuario.create(datosAdmin);
      console.log('✅ Usuario admin creado');
    }

    // Mostrar resumen
    console.log('\n📋 Usuario Administrador:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 ADMINISTRADOR:');
    console.log(`   Correo: ${admin.correo}`);
    console.log(`   Contraseña: ${contrasenaAdmin}`);
    console.log(`   Tipo: ${admin.tipo_usuario}`);
    console.log(`   ID: ${admin._id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creando usuario admin:', error);
    process.exit(1);
  }
};

crearUsuarioAdmin();

