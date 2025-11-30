import Rating from '../models/Calificacion.js';
import SolicitudViaje from '../models/SolicitudViaje.js';
import Usuario from '../models/Usuario.js';

/**
 * Obtener todas las calificaciones recibidas por un conductor
 * Similar a Play Store - muestra todas las reseñas con comentarios
 */
export const obtenerCalificacionesConductor = async (req, res) => {
  try {
    const idConductor = req.usuario?.id || req.user?.id;
    
    if (!idConductor) {
      return res.status(401).json({
        exito: false,
        error: 'Usuario no autenticado',
      });
    }

    // Validar que sea conductor
    const tipoUsuario = req.usuario?.tipoUsuario || req.user?.tipoUsuario || req.user?.userType;
    if (tipoUsuario !== 'conductor' && tipoUsuario !== 'driver') {
      return res.status(403).json({
        exito: false,
        error: 'Solo los conductores pueden ver sus calificaciones',
      });
    }

    // Obtener todas las calificaciones recibidas por este conductor
    const calificaciones = await Rating.find({
      id_calificado: idConductor,
      tipo_calificador: 'pasajero',
    })
      .populate('id_calificador', 'nombre correo telefono')
      .populate('id_viaje', 'origen_direccion destino_direccion precio_final_acordado createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Calcular estadísticas
    const totalCalificaciones = calificaciones.length;
    const promedio = totalCalificaciones > 0
      ? calificaciones.reduce((sum, c) => sum + c.calificacion, 0) / totalCalificaciones
      : 0;
    
    // Distribución de calificaciones (1-5 estrellas)
    const distribucion = {
      5: calificaciones.filter(c => c.calificacion === 5).length,
      4: calificaciones.filter(c => c.calificacion === 4).length,
      3: calificaciones.filter(c => c.calificacion === 3).length,
      2: calificaciones.filter(c => c.calificacion === 2).length,
      1: calificaciones.filter(c => c.calificacion === 1).length,
    };

    // Formatear calificaciones con información del pasajero y viaje
    const calificacionesFormateadas = calificaciones.map(cal => ({
      id: cal._id,
      calificacion: cal.calificacion,
      comentario: cal.comentario,
      fecha: cal.createdAt,
      pasajero: {
        id: cal.id_calificador._id,
        nombre: cal.id_calificador.nombre,
        correo: cal.id_calificador.correo,
        telefono: cal.id_calificador.telefono,
      },
      viaje: cal.id_viaje ? {
        id: cal.id_viaje._id,
        origen: cal.id_viaje.origen_direccion,
        destino: cal.id_viaje.destino_direccion,
        precio: cal.id_viaje.precio_final_acordado,
        fecha: cal.id_viaje.createdAt,
      } : null,
    }));

    // Obtener información del conductor
    const conductor = await Usuario.findById(idConductor).lean();
    const calificacionPromedio = conductor?.informacion_conductor?.calificacion || promedio;

    res.json({
      exito: true,
      datos: {
        conductor: {
          id: conductor._id,
          nombre: conductor.nombre,
          calificacionPromedio: calificacionPromedio.toFixed(1),
          totalViajes: conductor.informacion_conductor?.total_viajes || 0,
        },
        estadisticas: {
          totalCalificaciones,
          promedio: promedio.toFixed(1),
          distribucion,
        },
        calificaciones: calificacionesFormateadas,
      },
    });
  } catch (error) {
    console.error('Error obteniendo calificaciones del conductor:', error);
    res.status(500).json({
      exito: false,
      error: 'Error al obtener calificaciones',
    });
  }
};

