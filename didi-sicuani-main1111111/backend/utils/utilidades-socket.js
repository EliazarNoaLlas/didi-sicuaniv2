import jwt from 'jsonwebtoken';

/**
 * Utilidades de Socket.io
 * Configuración y manejo de conexiones Socket.io
 */

/**
 * Inicializar Socket.io con autenticación y manejo de eventos
 * @param {Object} io - Instancia de Socket.io Server
 * @returns {Object} Instancia de Socket.io configurada
 */
export const inicializarSocket = (io) => {
  // Middleware de autenticación
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Error de autenticación'));
    }

    try {
      const decodificado = jwt.verify(token, process.env.JWT_SECRET);
      socket.idUsuario = decodificado.id;
      socket.tipoUsuario = decodificado.tipoUsuario || decodificado.userType;
      next();
    } catch (err) {
      next(new Error('Error de autenticación'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ Usuario conectado: ${socket.idUsuario} (${socket.tipoUsuario})`);

    // Unirse a sala específica del usuario (compatibilidad con inglés y español)
    socket.join(`user:${socket.idUsuario}`);
    socket.join(`usuario:${socket.idUsuario}`);
    
    // Unirse a sala específica del rol
    const tipoUsuario = socket.tipoUsuario;
    if (tipoUsuario === 'conductor' || tipoUsuario === 'driver') {
      socket.join('conductores');
      socket.join(`conductor:${socket.idUsuario}`); // Sala individual del conductor
    } else if (tipoUsuario === 'pasajero' || tipoUsuario === 'passenger') {
      socket.join('pasajeros');
    } else if (tipoUsuario === 'administrador' || tipoUsuario === 'admin') {
      socket.join('administradores');
    }

    // Manejar solicitud de viaje (compatibilidad con inglés)
    socket.on('ride:request', async (datos) => {
      // Transmitir a conductores cercanos
      socket.to('conductores').emit('viaje:nuevo', datos);
    });
    
    // Manejar solicitud de viaje (español)
    socket.on('viaje:solicitar', async (datos) => {
      // Transmitir a conductores cercanos
      socket.to('conductores').emit('viaje:nuevo', datos);
    });

    // Manejar aceptación del conductor (compatibilidad con inglés)
    socket.on('ride:accept', async (datos) => {
      const { idViaje, idConductor } = datos;
      // Notificar al pasajero
      io.to(`usuario:${datos.idPasajero}`).emit('viaje:aceptado', {
        idViaje,
        idConductor,
      });
    });
    
    // Manejar aceptación del conductor (español)
    socket.on('viaje:aceptar', async (datos) => {
      const { idViaje, idConductor } = datos;
      // Notificar al pasajero
      io.to(`usuario:${datos.idPasajero}`).emit('viaje:aceptado', {
        idViaje,
        idConductor,
      });
    });

    // Manejar oferta de subasta (compatibilidad con inglés)
    socket.on('bid:submit', async (datos) => {
      const { idViaje, idConductor, tipoOferta, precio } = datos;
      // Notificar al pasajero sobre la oferta
      io.to(`usuario:${datos.idPasajero}`).emit('oferta:recibida', {
        idViaje,
        idConductor,
        tipoOferta,
        precio,
      });
    });
    
    // Manejar oferta de subasta (español)
    socket.on('oferta:enviar', async (datos) => {
      const { idViaje, idConductor, tipoOferta, precio } = datos;
      // Notificar al pasajero sobre la oferta
      io.to(`usuario:${datos.idPasajero}`).emit('oferta:recibida', {
        idViaje,
        idConductor,
        tipoOferta,
        precio,
      });
    });

    // Manejar actualización de ubicación del conductor (compatibilidad con inglés)
    socket.on('driver:location', async (datos) => {
      const { idConductor, latitud, longitud } = datos;
      // Transmitir a pasajeros esperando por este conductor
      socket.broadcast.emit('conductor:ubicacion:actualizada', {
        idConductor,
        latitud,
        longitud,
      });
    });
    
    // Manejar actualización de ubicación del conductor (español)
    socket.on('conductor:ubicacion', async (datos) => {
      const { idConductor, latitud, longitud } = datos;
      // Transmitir a pasajeros esperando por este conductor
      socket.broadcast.emit('conductor:ubicacion:actualizada', {
        idConductor,
        latitud,
        longitud,
      });
    });

    // Manejar desconexión
    socket.on('disconnect', (razon) => {
      console.log(`❌ Usuario desconectado: ${socket.idUsuario} (razón: ${razon})`);
      
      // Si fue una desconexión involuntaria, el cliente intentará reconectar automáticamente
      // No necesitamos hacer nada aquí, solo loguear
    });
  });

  return io;
};
