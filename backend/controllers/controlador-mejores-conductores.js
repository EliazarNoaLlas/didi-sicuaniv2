import Rating from '../models/Calificacion.js';
import SolicitudViaje from '../models/SolicitudViaje.js';
import Usuario from '../models/Usuario.js';

/**
 * Obtener los mejores conductores de un pasajero
 * Aquellos que le han dado el mejor servicio (calificación 4 o 5)
 */
export const obtenerMejoresConductores = async (req, res) => {
  try {
    const idPasajero = req.usuario?.id || req.user?.id;
    
    if (!idPasajero) {
      return res.status(401).json({
        exito: false,
        error: 'Usuario no autenticado',
      });
    }

    // Validar que sea pasajero
    const tipoUsuario = req.usuario?.tipoUsuario || req.user?.tipoUsuario || req.user?.userType;
    if (tipoUsuario !== 'pasajero' && tipoUsuario !== 'passenger') {
      return res.status(403).json({
        exito: false,
        error: 'Solo los pasajeros pueden ver sus mejores conductores',
      });
    }

    // Obtener todas las calificaciones que el pasajero ha dado a conductores (4 o 5 estrellas)
    const calificacionesPositivas = await Rating.find({
      id_calificador: idPasajero,
      id_calificado: { $exists: true },
      calificacion: { $gte: 4 }, // Solo calificaciones de 4 o 5 estrellas
      tipo_calificador: 'pasajero',
    })
      .populate('id_calificado', 'nombre correo telefono informacion_conductor')
      .populate('id_viaje', 'origen_direccion destino_direccion precio_final_acordado createdAt')
      .sort({ calificacion: -1, createdAt: -1 })
      .lean();

    // Agrupar por conductor y obtener información consolidada
    const conductoresMap = new Map();

    calificacionesPositivas.forEach(cal => {
      const idConductor = cal.id_calificado._id.toString();
      
      if (!conductoresMap.has(idConductor)) {
        const conductor = cal.id_calificado;
        conductoresMap.set(idConductor, {
          conductor: {
            id: conductor._id,
            nombre: conductor.nombre,
            correo: conductor.correo,
            telefono: conductor.telefono,
            calificacionPromedio: conductor.informacion_conductor?.calificacion || 0,
            totalViajes: conductor.informacion_conductor?.total_viajes || 0,
            tipoVehiculo: conductor.informacion_conductor?.tipo_vehiculo || 'N/A',
            placaVehiculo: conductor.informacion_conductor?.placa_vehiculo || 'N/A',
          },
          calificaciones: [],
          promedioCalificacion: 0,
          totalViajes: 0,
          ultimaCalificacion: null,
        });
      }

      const conductorData = conductoresMap.get(idConductor);
      conductorData.calificaciones.push({
        id: cal._id,
        calificacion: cal.calificacion,
        comentario: cal.comentario,
        fecha: cal.createdAt,
        viaje: cal.id_viaje ? {
          id: cal.id_viaje._id,
          origen: cal.id_viaje.origen_direccion,
          destino: cal.id_viaje.destino_direccion,
          precio: cal.id_viaje.precio_final_acordado,
          fecha: cal.id_viaje.createdAt,
        } : null,
      });

      // Actualizar última calificación
      if (!conductorData.ultimaCalificacion || new Date(cal.createdAt) > new Date(conductorData.ultimaCalificacion.fecha)) {
        conductorData.ultimaCalificacion = {
          calificacion: cal.calificacion,
          comentario: cal.comentario,
          fecha: cal.createdAt,
        };
      }
    });

    // Calcular promedios y ordenar por mejor calificación promedio
    const conductoresArray = Array.from(conductoresMap.values()).map(data => {
      const promedio = data.calificaciones.reduce((sum, c) => sum + c.calificacion, 0) / data.calificaciones.length;
      return {
        ...data,
        promedioCalificacion: promedio.toFixed(1),
        totalViajes: data.calificaciones.length,
      };
    });

    // Ordenar por promedio de calificación (descendente) y luego por total de viajes
    conductoresArray.sort((a, b) => {
      if (parseFloat(b.promedioCalificacion) !== parseFloat(a.promedioCalificacion)) {
        return parseFloat(b.promedioCalificacion) - parseFloat(a.promedioCalificacion);
      }
      return b.totalViajes - a.totalViajes;
    });

    res.json({
      exito: true,
      datos: {
        totalConductores: conductoresArray.length,
        conductores: conductoresArray,
      },
    });
  } catch (error) {
    console.error('Error obteniendo mejores conductores:', error);
    res.status(500).json({
      exito: false,
      error: 'Error al obtener mejores conductores',
    });
  }
};

