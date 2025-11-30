/**
 * Script para probar Socket.io con múltiples clientes (pasajero y conductor)
 * 
 * Uso:
 *   npm install socket.io-client axios  # Instalar dependencias si no están
 *   node scripts/test-socket-clients.js
 * 
 * Requisitos:
 *   1. Tener usuarios de prueba creados (create-test-users.js)
 *   2. Obtener tokens JWT de cada usuario
 *   3. Servidor corriendo en http://localhost:5000
 *   4. Instalar: npm install socket.io-client axios
 */

import io from 'socket.io-client';
import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

// Colores para console
const colors = {
  passenger: '\x1b[36m', // Cyan
  driver: '\x1b[33m',    // Yellow
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
};

// Función para login y obtener token
async function getToken(email, password) {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email,
      password,
    });
    return response.data.data.token;
  } catch (error) {
    console.error(`❌ Error login ${email}:`, error.response?.data || error.message);
    return null;
  }
}

// Función para crear cliente Socket.io
function createSocketClient(token, role) {
  const color = colors[role] || colors.reset;
  
  const socket = io(SOCKET_URL, {
    auth: {
      token: token,
    },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log(`${color}✅ ${role.toUpperCase()} conectado${colors.reset}`);
    console.log(`   Socket ID: ${socket.id}`);
  });

  socket.on('disconnect', (reason) => {
    console.log(`${color}❌ ${role.toUpperCase()} desconectado: ${reason}${colors.reset}`);
  });

  socket.on('connect_error', (error) => {
    console.error(`${color}❌ Error de conexión ${role}: ${error.message}${colors.reset}`);
  });

  // Eventos específicos para pasajero
  if (role === 'passenger') {
    socket.on('bid:received', (bid) => {
      console.log(`${color}💰 [PASAJERO] Oferta recibida:${colors.reset}`);
      console.log(`   Bid ID: ${bid._id || bid.id}`);
      console.log(`   Tipo: ${bid.bid_type}`);
      console.log(`   Precio: S/ ${bid.offered_price || 'N/A'}`);
      console.log(`   Conductor: ${bid.driver_id || bid.driver_name || 'N/A'}`);
    });

    socket.on('ride:accepted', (data) => {
      console.log(`${color}✅ [PASAJERO] Viaje aceptado:${colors.reset}`);
      console.log(`   Ride ID: ${data.rideId}`);
      console.log(`   Driver ID: ${data.driverId}`);
    });
  }

  // Eventos específicos para conductor
  if (role === 'driver') {
    socket.on('ride:new', (ride) => {
      console.log(`${color}🚗 [CONDUCTOR] Nueva solicitud de viaje:${colors.reset}`);
      console.log(`   Ride ID: ${ride._id || ride.rideId}`);
      console.log(`   Origen: ${ride.origin_address || ride.origin?.address}`);
      console.log(`   Destino: ${ride.destination_address || ride.destination?.address}`);
      console.log(`   Precio pasajero: S/ ${ride.passenger_offered_price || ride.passengerPrice}`);
      console.log(`   Precio sugerido: S/ ${ride.suggested_price_soles || ride.suggestedPrice}`);
      console.log(`   Distancia: ${ride.estimated_distance_km || ride.distance} km`);
      console.log(`   Duración: ${ride.estimated_duration_min || ride.duration} min`);
      
      // Simular respuesta automática después de 3 segundos
      setTimeout(() => {
        console.log(`${color}💰 [CONDUCTOR] Enviando oferta de aceptación...${colors.reset}`);
        socket.emit('bid:submit', {
          rideId: ride._id || ride.rideId,
          bidType: 'accept',
        });
      }, 3000);
    });

    socket.on('bid:accepted', (data) => {
      console.log(`${color}✅ [CONDUCTOR] Oferta aceptada:${colors.reset}`);
      console.log(`   Ride ID: ${data.rideId}`);
    });
  }

  return socket;
}

// Función principal
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  PRUEBA DE SOCKET.IO CON MÚLTIPLES CLIENTES');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // 1. Obtener tokens
  console.log('🔐 Obteniendo tokens...\n');
  
  const passengerToken = await getToken('pasajero@test.com', 'test123');
  const driverToken = await getToken('conductor.taxi@test.com', 'test123');

  if (!passengerToken || !driverToken) {
    console.error('❌ No se pudieron obtener los tokens. Verifica que:');
    console.error('   1. El servidor está corriendo');
    console.error('   2. Los usuarios de prueba existen (ejecuta create-test-users.js)');
    process.exit(1);
  }

  console.log(`${colors.green}✅ Tokens obtenidos${colors.reset}\n`);

  // 2. Crear clientes Socket.io
  console.log('🔌 Conectando clientes Socket.io...\n');
  
  const passengerSocket = createSocketClient(passengerToken, 'passenger');
  const driverSocket = createSocketClient(driverToken, 'driver');

  // 3. Esperar conexiones
  await new Promise((resolve) => {
    let connected = 0;
    const checkConnection = () => {
      connected++;
      if (connected === 2) {
        console.log(`\n${colors.green}✅ Ambos clientes conectados${colors.reset}\n`);
        resolve();
      }
    };
    
    passengerSocket.on('connect', checkConnection);
    driverSocket.on('connect', checkConnection);
    
    // Timeout de 5 segundos
    setTimeout(() => {
      if (connected < 2) {
        console.error(`${colors.red}❌ Timeout esperando conexiones${colors.reset}`);
        process.exit(1);
      }
    }, 5000);
  });

  // 4. Simular creación de solicitud de viaje (desde pasajero)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SIMULANDO FLUJO DE VIAJE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  console.log('🚗 [PASAJERO] Creando solicitud de viaje...\n');
  
  try {
    const rideResponse = await axios.post(
      `${BASE_URL}/rides/request`,
      {
        origin_lat: -14.2694,
        origin_lon: -71.2256,
        origin_address: 'Plaza Principal, Sicuani',
        destination_lat: -14.27,
        destination_lon: -71.226,
        destination_address: 'Mercado Central, Sicuani',
        passenger_offered_price: 12,
        vehicle_type: 'taxi',
        payment_method: 'cash',
      },
      {
        headers: {
          Authorization: `Bearer ${passengerToken}`,
        },
      }
    );

    const rideId = rideResponse.data.data.rideRequest._id;
    console.log(`${colors.green}✅ Solicitud creada: ${rideId}${colors.reset}\n`);
    console.log('⏳ Esperando notificaciones...\n');
    console.log('   (El conductor debería recibir notificación en 1-2 segundos)');
    console.log('   (El conductor enviará oferta automáticamente después de 3 segundos)\n');

    // Mantener conexiones abiertas por 30 segundos
    setTimeout(() => {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  ✅ PRUEBA COMPLETADA');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n💡 Presiona Ctrl+C para salir\n');
    }, 30000);

  } catch (error) {
    console.error(`${colors.red}❌ Error creando solicitud:${colors.reset}`);
    console.error(error.response?.data || error.message);
    process.exit(1);
  }

  // Mantener el proceso vivo
  process.on('SIGINT', () => {
    console.log('\n\n👋 Cerrando conexiones...');
    passengerSocket.disconnect();
    driverSocket.disconnect();
    process.exit(0);
  });
}

// Ejecutar
main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

