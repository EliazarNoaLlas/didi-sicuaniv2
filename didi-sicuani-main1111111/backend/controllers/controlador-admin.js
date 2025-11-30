import User from '../models/Usuario.js';
import RideRequest from '../models/SolicitudViaje.js';
import Bid from '../models/Oferta.js';
import { io } from '../server.js';

/**
 * RF-011: Gestionar usuarios (admin)
 */
export const obtenerUsuarios = async (req, res) => {
  try {
    const { tipoUsuario, busqueda, estaActivo } = req.query;

    // Construir filtros
    const filtros = {};
    if (tipoUsuario) {
      // Mapear tipos de usuario a español
      const tipoMap = {
        'passenger': 'pasajero',
        'driver': 'conductor',
        'admin': 'administrador',
      };
      filtros.tipo_usuario = tipoMap[tipoUsuario] || tipoUsuario;
    }
    if (estaActivo !== undefined) {
      filtros.esta_activo = estaActivo === 'true';
    }
    if (busqueda) {
      filtros.$or = [
        { nombre: { $regex: busqueda, $options: 'i' } },
        { correo: { $regex: busqueda, $options: 'i' } },
        { telefono: { $regex: busqueda, $options: 'i' } },
      ];
    }

    const usuarios = await User.find(filtros)
      .select('-contrasena')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      exito: true,
      datos: usuarios,
      cantidad: usuarios.length,
    });
  } catch (error) {
    console.error('❌ Error obteniendo usuarios:', error);
    res.status(500).json({
      exito: false,
      error: 'Error al obtener usuarios',
    });
  }
};

export const obtenerDetallesUsuario = async (req, res) => {
  try {
    const { idUsuario } = req.params;

    const usuario = await User.findById(idUsuario).select('-contrasena').lean();

    if (!usuario) {
      return res.status(404).json({
        exito: false,
        error: 'Usuario no encontrado',
      });
    }

    // Obtener historial de viajes del usuario
    let historialViajes = [];
    if (usuario.tipo_usuario === 'pasajero') {
      historialViajes = await RideRequest.find({ id_pasajero: idUsuario })
        .populate('id_conductor_asignado', 'nombre correo telefono informacion_conductor')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
    } else if (usuario.tipo_usuario === 'conductor') {
      historialViajes = await RideRequest.find({ id_conductor_asignado: idUsuario })
        .populate('id_pasajero', 'nombre correo telefono')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      // Obtener ofertas realizadas
      const ofertas = await Bid.find({ id_conductor: idUsuario })
        .populate('id_solicitud_viaje')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      historialViajes = [
        ...historialViajes.map((r) => ({ ...r, tipo: 'asignado' })),
        ...ofertas.map((o) => ({ ...o.id_solicitud_viaje, oferta: o, tipo: 'oferta' })),
      ];
    }

    // Calcular estadísticas
    const estadisticas = {
      totalViajes: historialViajes.length,
      viajesCompletados: historialViajes.filter((v) => v.estado === 'completado').length,
    };

    if (usuario.tipo_usuario === 'conductor') {
      const completados = historialViajes.filter((v) => v.estado === 'completado' && v.tipo === 'asignado');
      estadisticas.gananciasTotales = completados.reduce((suma, v) => suma + (v.precio_final_acordado || 0), 0);
      estadisticas.calificacionPromedio = usuario.informacion_conductor?.calificacion || 0;
    } else if (usuario.tipo_usuario === 'pasajero') {
      const completados = historialViajes.filter((v) => v.estado === 'completado');
      estadisticas.totalGastado = completados.reduce((suma, v) => suma + (v.precio_final_acordado || 0), 0);
    }

    res.json({
      exito: true,
      datos: {
        usuario,
        historialViajes: historialViajes.slice(0, 20), // Limitar a 20 más recientes
        estadisticas,
      },
    });
  } catch (error) {
    console.error('❌ Error obteniendo detalles de usuario:', error);
    res.status(500).json({
      exito: false,
      error: 'Error al obtener detalles de usuario',
    });
  }
};

export const actualizarEstadoUsuario = async (req, res) => {
  try {
    const { idUsuario } = req.params;
    const { estaActivo } = req.body;

    if (typeof estaActivo !== 'boolean') {
      return res.status(400).json({
        exito: false,
        error: 'estaActivo debe ser un booleano',
      });
    }

    const usuario = await User.findByIdAndUpdate(
      idUsuario,
      { esta_activo: estaActivo },
      { new: true }
    ).select('-contrasena');

    if (!usuario) {
      return res.status(404).json({
        exito: false,
        error: 'Usuario no encontrado',
      });
    }

    // Notificar al usuario si está siendo desactivado
    if (!estaActivo && io) {
      io.to(`usuario:${idUsuario}`).emit('cuenta:desactivada', {
        mensaje: 'Tu cuenta ha sido desactivada por un administrador',
      });
    }

    res.json({
      exito: true,
      datos: usuario,
      mensaje: `Usuario ${estaActivo ? 'activado' : 'desactivado'} exitosamente`,
    });
  } catch (error) {
    console.error('❌ Error actualizando estado de usuario:', error);
    res.status(500).json({
      exito: false,
      error: 'Error al actualizar estado de usuario',
    });
  }
};

/**
 * RF-012: Gestionar viajes (admin)
 */
export const obtenerViajes = async (req, res) => {
  try {
    const { estado, busqueda, ordenarPor, orden } = req.query;

    // Construir filtros
    const filtros = {};
    if (estado) {
      // Mapear estados a español si vienen en inglés
      const estadoMap = {
        'pending': 'pendiente',
        'bidding_active': 'subasta_activa',
        'matched': 'asignado',
        'accepted': 'asignado',
        'in_progress': 'en_progreso',
        'completed': 'completado',
        'cancelled': 'cancelado',
      };
      filtros.estado = estadoMap[estado] || estado;
    }
    if (busqueda) {
      // Buscar por ID de viaje, ID de cliente o ID de conductor
      const esObjectId = /^[0-9a-fA-F]{24}$/.test(busqueda);
      if (esObjectId) {
        filtros.$or = [
          { _id: busqueda },
          { id_pasajero: busqueda },
          { id_conductor_asignado: busqueda },
        ];
      }
    }

    // Ordenamiento
    const ordenamiento = {};
    if (ordenarPor) {
      // Mapear campos de ordenamiento a español
      const campoMap = {
        'createdAt': 'createdAt',
        'status': 'estado',
        'matched_at': 'fecha_asignacion',
      };
      ordenamiento[campoMap[ordenarPor] || ordenarPor] = orden === 'desc' ? -1 : 1;
    } else {
      ordenamiento.createdAt = -1; // Por defecto, más recientes primero
    }

    const viajes = await RideRequest.find(filtros)
      .populate('id_pasajero', 'nombre correo telefono')
      .populate('id_conductor_asignado', 'nombre correo telefono informacion_conductor')
      .sort(ordenamiento)
      .limit(100)
      .lean();

    res.json({
      exito: true,
      datos: viajes,
      cantidad: viajes.length,
    });
  } catch (error) {
    console.error('❌ Error obteniendo viajes:', error);
    res.status(500).json({
      exito: false,
      error: 'Error al obtener viajes',
    });
  }
};

export const obtenerDetallesViaje = async (req, res) => {
  try {
    const { idViaje } = req.params;

    const viaje = await RideRequest.findById(idViaje)
      .populate('id_pasajero', 'nombre correo telefono')
      .populate('id_conductor_asignado', 'nombre correo telefono informacion_conductor')
      .lean();

    if (!viaje) {
      return res.status(404).json({
        exito: false,
        error: 'Viaje no encontrado',
      });
    }

    // Obtener todas las ofertas asociadas
    const ofertas = await Bid.find({ id_solicitud_viaje: idViaje })
      .populate('id_conductor', 'nombre correo telefono informacion_conductor')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      exito: true,
      datos: {
        viaje,
        ofertas: ofertas.map((oferta) => ({
          id: oferta._id,
          conductor: {
            id: oferta.id_conductor._id,
            nombre: oferta.id_conductor.nombre,
            correo: oferta.id_conductor.correo,
            telefono: oferta.id_conductor.telefono,
            calificacion: oferta.id_conductor.informacion_conductor?.calificacion,
            tipoVehiculo: oferta.id_conductor.informacion_conductor?.tipo_vehiculo,
          },
          precioOfrecido: oferta.precio_ofrecido,
          estado: oferta.estado,
          fechaCreacion: oferta.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('❌ Error obteniendo detalles de viaje:', error);
    res.status(500).json({
      exito: false,
      error: 'Error al obtener detalles de viaje',
    });
  }
};

export const cancelarViaje = async (req, res) => {
  try {
    const { idViaje } = req.params;
    const { razon } = req.body;

    const viaje = await RideRequest.findById(idViaje);

    if (!viaje) {
      return res.status(404).json({
        exito: false,
        error: 'Viaje no encontrado',
      });
    }

    // Validar que el viaje pueda ser cancelado
    if (viaje.estado === 'completado' || viaje.estado === 'cancelado') {
      return res.status(400).json({
        exito: false,
        error: 'Este viaje no puede ser cancelado',
      });
    }

    // Cancelar el viaje
    viaje.estado = 'cancelado';
    await viaje.save();

    // Actualizar todas las ofertas pendientes
    await Bid.updateMany(
      { id_solicitud_viaje: idViaje, estado: 'pendiente' },
      { estado: 'expirada' }
    );

    // Notificar al cliente y conductores
    if (io) {
      io.to(`user:${viaje.id_pasajero}`).emit('ride:cancelled', {
        rideId: idViaje,
        reason: razon || 'admin_cancelled',
        message: 'Tu viaje ha sido cancelado por un administrador',
      });

      // Notificar a conductores que realizaron ofertas
      const ofertas = await Bid.find({ id_solicitud_viaje: idViaje });
      ofertas.forEach((oferta) => {
        io.to(`user:${oferta.id_conductor}`).emit('ride:cancelled', {
          rideId: idViaje,
          message: 'El viaje ha sido cancelado',
        });
      });
    }

    res.json({
      exito: true,
      mensaje: 'Viaje cancelado exitosamente',
    });
  } catch (error) {
    console.error('❌ Error cancelando viaje:', error);
    res.status(500).json({
      exito: false,
      error: 'Error al cancelar viaje',
    });
  }
};

// Exportar también con los nombres anteriores para compatibilidad
export { obtenerUsuarios as getUsers };
export { obtenerDetallesUsuario as getUserDetails };
export { actualizarEstadoUsuario as updateUserStatus };
export { obtenerViajes as getRides };
export { obtenerDetallesViaje as getRideDetails };
export { cancelarViaje as cancelRide };
