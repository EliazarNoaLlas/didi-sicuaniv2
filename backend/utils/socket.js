import jwt from 'jsonwebtoken';

export const initializeSocket = (io) => {
  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userType = decoded.userType;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userId} (${socket.userType})`);

    // Join user-specific room
    socket.join(`user:${socket.userId}`);
    
    // Join role-specific room
    if (socket.userType === 'driver') {
      socket.join('drivers');
    } else if (socket.userType === 'passenger') {
      socket.join('passengers');
    } else if (socket.userType === 'admin') {
      socket.join('admins');
    }

    // Handle ride request
    socket.on('ride:request', async (data) => {
      // Broadcast to nearby drivers
      socket.to('drivers').emit('ride:new', data);
    });

    // Handle driver acceptance
    socket.on('ride:accept', async (data) => {
      const { rideId, driverId } = data;
      // Notify passenger
      io.to(`user:${data.passengerId}`).emit('ride:accepted', {
        rideId,
        driverId,
      });
    });

    // Handle bidding
    socket.on('bid:submit', async (data) => {
      const { rideId, driverId, bidType, price } = data;
      // Notify passenger about bid
      io.to(`user:${data.passengerId}`).emit('bid:received', {
        rideId,
        driverId,
        bidType,
        price,
      });
    });

    // Handle driver location update
    socket.on('driver:location', async (data) => {
      const { driverId, latitude, longitude } = data;
      // Broadcast to passengers waiting for this driver
      socket.broadcast.emit('driver:location:update', {
        driverId,
        latitude,
        longitude,
      });
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`❌ User disconnected: ${socket.userId} (reason: ${reason})`);
      
      // Si fue una desconexión involuntaria, el cliente intentará reconectar automáticamente
      // No necesitamos hacer nada aquí, solo loguear
    });
  });

  return io;
};

