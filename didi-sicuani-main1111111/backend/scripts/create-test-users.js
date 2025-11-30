/**
 * Script para crear usuarios de prueba (pasajero y conductor)
 * 
 * Uso:
 *   node scripts/create-test-users.js
 * 
 * Esto crea:
 * - 1 pasajero de prueba
 * - 1 conductor de prueba (taxi)
 * - 1 conductor de prueba (mototaxi)
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import conectarBD from '../config/database.js';

dotenv.config();

const crearUsuariosPrueba = async () => {
  try {
    // Conectar a MongoDB
    await conectarBD();
    console.log('✅ Conectado a MongoDB');

    const Usuario = (await import('../models/Usuario.js')).default;

    // Contraseña para todos los usuarios de prueba
    const contrasenaPrueba = 'test123';
    const contrasenaHasheada = await bcrypt.hash(contrasenaPrueba, 10);

    // 1. Crear Pasajero de Prueba
    const datosPasajero = {
      nombre: 'Juan Pasajero',
      correo: 'pasajero@test.com',
      contrasena: contrasenaHasheada,
      tipo_usuario: 'pasajero',
      telefono: '+51987654321',
      esta_activo: true,
    };

    let pasajero = await Usuario.findOne({ correo: datosPasajero.correo });
    if (pasajero) {
      console.log('⚠️  Pasajero ya existe, actualizando...');
      pasajero.nombre = datosPasajero.nombre;
      pasajero.contrasena = contrasenaHasheada;
      pasajero.telefono = datosPasajero.telefono;
      await pasajero.save();
    } else {
      pasajero = await Usuario.create(datosPasajero);
      console.log('✅ Pasajero creado');
    }

    // 2. Crear Conductor Taxi
    const datosConductorTaxi = {
      nombre: 'Carlos Conductor Taxi',
      correo: 'conductor.taxi@test.com',
      contrasena: contrasenaHasheada,
      tipo_usuario: 'conductor',
      telefono: '+51987654322',
      esta_activo: true,
      informacion_conductor: {
        tipo_vehiculo: 'taxi',
        placa_vehiculo: 'ABC-123',
        modelo_vehiculo: 'Toyota Corolla',
        numero_licencia: 'LIC-12345',
        calificacion: 4.8,
        total_viajes: 150,
        esta_en_linea: true,
        esta_disponible: true,
        latitud_actual: -14.2694,
        longitud_actual: -71.2256,
      },
    };

    let conductorTaxi = await Usuario.findOne({ correo: datosConductorTaxi.correo });
    if (conductorTaxi) {
      console.log('⚠️  Conductor Taxi ya existe, actualizando...');
      conductorTaxi.nombre = datosConductorTaxi.nombre;
      conductorTaxi.contrasena = contrasenaHasheada;
      conductorTaxi.informacion_conductor = datosConductorTaxi.informacion_conductor;
      await conductorTaxi.save();
    } else {
      conductorTaxi = await Usuario.create(datosConductorTaxi);
      console.log('✅ Conductor Taxi creado');
    }

    // 3. Crear Conductor Mototaxi
    const datosConductorMototaxi = {
      nombre: 'Pedro Conductor Mototaxi',
      correo: 'conductor.mototaxi@test.com',
      contrasena: contrasenaHasheada,
      tipo_usuario: 'conductor',
      telefono: '+51987654323',
      esta_activo: true,
      informacion_conductor: {
        tipo_vehiculo: 'mototaxi',
        placa_vehiculo: 'XYZ-789',
        modelo_vehiculo: 'Honda Biz',
        numero_licencia: 'LIC-67890',
        calificacion: 4.5,
        total_viajes: 200,
        esta_en_linea: true,
        esta_disponible: true,
        latitud_actual: -14.2700,
        longitud_actual: -71.2260,
      },
    };

    let conductorMototaxi = await Usuario.findOne({ correo: datosConductorMototaxi.correo });
    if (conductorMototaxi) {
      console.log('⚠️  Conductor Mototaxi ya existe, actualizando...');
      conductorMototaxi.nombre = datosConductorMototaxi.nombre;
      conductorMototaxi.contrasena = contrasenaHasheada;
      conductorMototaxi.informacion_conductor = datosConductorMototaxi.informacion_conductor;
      await conductorMototaxi.save();
    } else {
      conductorMototaxi = await Usuario.create(datosConductorMototaxi);
      console.log('✅ Conductor Mototaxi creado');
    }

    // Mostrar resumen
    console.log('\n📋 Usuarios de Prueba Creados:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 PASAJERO:');
    console.log(`   Correo: ${pasajero.correo}`);
    console.log(`   Contraseña: ${contrasenaPrueba}`);
    console.log(`   ID: ${pasajero._id}`);
    console.log('\n🚕 CONDUCTOR TAXI:');
    console.log(`   Correo: ${conductorTaxi.correo}`);
    console.log(`   Contraseña: ${contrasenaPrueba}`);
    console.log(`   ID: ${conductorTaxi._id}`);
    console.log(`   Ubicación: ${conductorTaxi.informacion_conductor.latitud_actual}, ${conductorTaxi.informacion_conductor.longitud_actual}`);
    console.log('\n🏍️  CONDUCTOR MOTOTAXI:');
    console.log(`   Correo: ${conductorMototaxi.correo}`);
    console.log(`   Contraseña: ${contrasenaPrueba}`);
    console.log(`   ID: ${conductorMototaxi._id}`);
    console.log(`   Ubicación: ${conductorMototaxi.informacion_conductor.latitud_actual}, ${conductorMototaxi.informacion_conductor.longitud_actual}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('💡 Próximos pasos:');
    console.log('   1. Inicia sesión con cada usuario para obtener tokens JWT');
    console.log('   2. Usa diferentes herramientas (Postman, navegadores) para cada sesión');
    console.log('   3. Consulta GUIA_MULTIPLES_SESIONES.md para más detalles\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creando usuarios de prueba:', error);
    process.exit(1);
  }
};

crearUsuariosPrueba();
