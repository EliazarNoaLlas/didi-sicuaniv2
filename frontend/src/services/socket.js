import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

/**
 * Servicio de Socket.io
 * Maneja la conexión en tiempo real con el servidor
 */

const URL_SOCKET = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;
let estaConectando = false;
let intentosReconexion = 0;
const MAX_INTENTOS_RECONEXION = 10;

/**
 * Inicializa la conexión Socket.io con reconexión automática
 * Mantiene una única instancia (singleton)
 * @returns {Object|null} Instancia del socket o null si no hay token
 */
export const inicializarSocket = () => {
  // Si ya hay una conexión activa, retornarla
  if (socket && socket.connected) {
    return socket;
  }

  // Si ya está intentando conectar, esperar
  if (estaConectando) {
    return socket;
  }

  estaConectando = true;
  const token = useAuthStore.getState().token;

  if (!token) {
    console.warn('⚠️ No hay token disponible para Socket.io');
    estaConectando = false;
    return null;
  }

  // Si hay un socket desconectado, limpiarlo primero
  if (socket && !socket.connected) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  // Crear nueva conexión
  socket = io(URL_SOCKET, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: MAX_INTENTOS_RECONEXION,
    timeout: 20000,
    forceNew: false, // Reutilizar conexión si es posible
    upgrade: true,
    rememberUpgrade: true,
    withCredentials: true,
  });

  // Evento: Conexión exitosa
  socket.on('connect', () => {
    console.log('✅ Socket conectado:', socket.id);
    intentosReconexion = 0;
    estaConectando = false;
  });

  // Evento: Desconexión
  socket.on('disconnect', (razon) => {
    // Solo loguear desconexiones importantes, no "transport close" que es normal durante upgrade
    if (razon !== 'transport close') {
      console.log('❌ Socket desconectado:', razon);
    }
    estaConectando = false;

    // Si fue una desconexión involuntaria, intentar reconectar
    if (razon === 'io server disconnect') {
      // El servidor desconectó el socket, reconectar manualmente
      socket.connect();
    }
  });

  // Evento: Intentando reconectar
  socket.on('reconnect_attempt', (numeroIntento) => {
    intentosReconexion = numeroIntento;
    console.log(`🔄 Intentando reconectar... (intento ${numeroIntento}/${MAX_INTENTOS_RECONEXION})`);
  });

  // Evento: Reconexión exitosa
  socket.on('reconnect', (numeroIntento) => {
    console.log(`✅ Socket reconectado después de ${numeroIntento} intentos`);
    intentosReconexion = 0;
  });

  // Evento: Error de reconexión
  socket.on('reconnect_error', (error) => {
    console.error('❌ Error de reconexión:', error.message);
  });

  // Evento: Fallo de reconexión
  socket.on('reconnect_failed', () => {
    console.error('❌ Fallo al reconectar después de', MAX_INTENTOS_RECONEXION, 'intentos');
    // Opcional: Notificar al usuario o intentar reconectar manualmente
  });

  // Evento: Error de conexión
  socket.on('connect_error', (error) => {
    console.error('❌ Error de conexión del socket:', error.message);
    estaConectando = false;
  });

  // Evento: Error general
  socket.on('error', (error) => {
    console.error('❌ Error del socket:', error);
  });

  return socket;
};

/**
 * Obtiene la instancia del socket, inicializándola si es necesario
 * @returns {Object|null} Instancia del socket o null si no se puede conectar
 */
export const obtenerSocket = () => {
  // Si el socket existe y está conectado, retornarlo
  if (socket && socket.connected) {
    return socket;
  }
  
  // Si el socket existe pero no está conectado y no estamos intentando conectar, inicializar
  if (socket && !socket.connected && !estaConectando) {
    return inicializarSocket();
  }
  
  // Si no hay socket y no estamos intentando conectar, inicializar
  if (!socket && !estaConectando) {
    return inicializarSocket();
  }
  
  // Si estamos intentando conectar, retornar el socket existente (puede ser null)
  return socket;
};

/**
 * Desconecta el socket completamente
 */
export const desconectarSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    estaConectando = false;
    intentosReconexion = 0;
  }
};

/**
 * Actualiza el token de autenticación del socket
 * Útil cuando el usuario hace login o el token se renueva
 * @param {string} nuevoToken - Nuevo token JWT
 * @returns {Object|null} Nueva instancia del socket
 */
export const actualizarTokenSocket = (nuevoToken) => {
  if (socket) {
    // Desconectar y reconectar con nuevo token
    desconectarSocket();
  }
  return inicializarSocket();
};

// Exportar también con nombres en inglés para compatibilidad
export const initSocket = inicializarSocket;
export const getSocket = obtenerSocket;
export const disconnectSocket = desconectarSocket;
export const updateSocketToken = actualizarTokenSocket;

