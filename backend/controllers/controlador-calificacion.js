import Rating from '../models/Calificacion.js';
import SolicitudViaje from '../models/SolicitudViaje.js';
import User from '../models/Usuario.js';
import { io } from '../server.js';

/**
 * RF-018: Cliente califica viaje
 */
export const calificarConductor = async (req, res) => {
  try {
    const idPasajero = req.usuario?.id || req.user?.id;
    const { idViaje } = req.params;
    const { calificacion, comentario } = req.body;

    // Validar que el usuario sea un cliente
    const tipoUsuario = req.usuario?.tipoUsuario || req.user?.tipoUsuario || req.user?.userType;
    if (tipoUsuario !== 'pasajero' && tipoUsuario !== 'passenger') {
      return res.status(403).json({
        exito: false,
        error: 'Solo los clientes pueden calificar conductores',
      });
    }

    // Validar calificación
    if (!calificacion || calificacion < 1 || calificacion > 5) {
      return res.status(400).json({
        exito: false,
        error: 'La calificación debe estar entre 1 y 5',
      });
    }

    // Obtener el viaje
    const viaje = await SolicitudViaje.findById(idViaje);

    if (!viaje) {
      return res.status(404).json({
        exito: false,
        error: 'Viaje no encontrado',
      });
    }

    // Validar que el viaje pertenezca al cliente
    if (viaje.id_pasajero.toString() !== idPasajero) {
      return res.status(403).json({
        exito: false,
        error: 'No autorizado para calificar este viaje',
      });
    }

    // Validar que el viaje esté completado o pueda ser considerado completado
    const estadoCompletado = viaje.estado === 'completado' || viaje.estado === 'completed';
    const estadoEnProgreso = viaje.estado === 'en_progreso' || viaje.estado === 'in_progress';
    const estadoAsignado = viaje.estado === 'asignado' || viaje.estado === 'assigned';
    const estadoConductorEnRuta = viaje.estado === 'conductor_en_ruta' || viaje.estado === 'driver_en_route';
    const estadoConductorLlego = viaje.estado === 'conductor_llego_punto_recogida' || viaje.estado === 'driver_arrived';
    
    // Calcular tiempo desde la asignación
    const fechaAsignacion = viaje.fecha_asignacion || viaje.createdAt;
    const tiempoDesdeAsignacion = fechaAsignacion ? (new Date() - new Date(fechaAsignacion)) / (1000 * 60 * 60) : 0; // en horas
    const esViajeAntiguo = tiempoDesdeAsignacion > 1; // Más de 1 hora
    
    // Permitir calificar si:
    // 1. Está completado
    // 2. Está en progreso
    // 3. Está en cualquier estado intermedio pero tiene más de 1 hora (considerarlo completado implícitamente)
    const puedeCalificar = estadoCompletado || estadoEnProgreso || 
                          (estadoAsignado && esViajeAntiguo) ||
                          (estadoConductorEnRuta && esViajeAntiguo) ||
                          (estadoConductorLlego && esViajeAntiguo);
    
    if (!puedeCalificar) {
      console.log(`⚠️ Intento de calificar viaje ${idViaje} con estado: ${viaje.estado}, tiempo desde asignación: ${tiempoDesdeAsignacion.toFixed(2)} horas`);
      return res.status(400).json({
        exito: false,
        error: `Solo se pueden calificar viajes completados. Estado actual: ${viaje.estado}. El viaje debe estar completado o tener más de 1 hora desde su asignación.`,
        estadoActual: viaje.estado,
        tiempoDesdeAsignacion: tiempoDesdeAsignacion.toFixed(2),
      });
    }
    
    // Si el viaje no está en 'completado' pero puede ser calificado, actualizarlo automáticamente
    let viajeFinal = viaje;
    if (!estadoCompletado && puedeCalificar) {
      console.log(`🔄 Actualizando automáticamente el viaje ${idViaje} de '${viaje.estado}' a 'completado'...`);
      try {
        viajeFinal = await SolicitudViaje.findByIdAndUpdate(
          idViaje,
          { estado: 'completado' },
          { new: true }
        );
        
        if (viajeFinal && viajeFinal.estado === 'completado') {
          console.log(`✅ Viaje ${idViaje} actualizado automáticamente a completado`);
          
          // Si el conductor estaba asignado, marcarlo como disponible
          if (viajeFinal.id_conductor_asignado) {
            await User.findByIdAndUpdate(viajeFinal.id_conductor_asignado, {
              'informacion_conductor.esta_disponible': true,
            });
          }
        } else {
          console.warn(`⚠️ No se pudo actualizar el viaje ${idViaje}, continuando con el estado actual`);
        }
      } catch (error) {
        console.error(`❌ Error actualizando viaje automáticamente:`, error);
        // Continuar con el viaje original si falla la actualización
      }
    }

    // Validar que no haya sido calificado previamente
    const calificacionExistente = await Rating.findOne({
      id_viaje: idViaje,
      id_calificador: idPasajero,
    });

    if (calificacionExistente) {
      return res.status(400).json({
        exito: false,
        error: 'Este viaje ya fue calificado',
      });
    }

    // Validar que haya un conductor asignado (usar viajeFinal después de la actualización)
    const viajeParaCalificar = viajeFinal || viaje;
    if (!viajeParaCalificar.id_conductor_asignado) {
      return res.status(400).json({
        exito: false,
        error: 'Este viaje no tiene conductor asignado',
      });
    }

    // Crear la calificación
    const nuevaCalificacion = await Rating.create({
      id_viaje: idViaje,
      id_calificador: idPasajero,
      id_calificado: viajeParaCalificar.id_conductor_asignado,
      calificacion,
      comentario: comentario || '',
      tipo_calificador: 'pasajero',
    });

    // Actualizar el rating del conductor
    await actualizarCalificacionConductor(viajeParaCalificar.id_conductor_asignado);

    // Notificar al conductor
    if (io) {
      io.to(`usuario:${viajeParaCalificar.id_conductor_asignado}`).emit('rating:received', {
        rideId: idViaje,
        rating: calificacion,
        comment: comentario,
        message: 'Has recibido una nueva calificación',
      });
    }

    res.json({
      exito: true,
      datos: nuevaCalificacion,
      mensaje: 'Calificación registrada exitosamente',
    });
  } catch (error) {
    console.error('❌ Error calificando viaje:', error);
    res.status(500).json({
      exito: false,
      error: 'Error al calificar viaje',
    });
  }
};

/**
 * RF-019: Conductor califica cliente
 */
export const calificarPasajero = async (req, res) => {
  try {
    const idConductor = req.usuario?.id || req.user?.id;
    const { idViaje } = req.params;
    const { calificacion, comentario } = req.body;

    // Validar que el usuario sea un conductor
    const tipoUsuario = req.usuario?.tipoUsuario || req.user?.tipoUsuario || req.user?.userType;
    if (tipoUsuario !== 'conductor' && tipoUsuario !== 'driver') {
      return res.status(403).json({
        exito: false,
        error: 'Solo los conductores pueden calificar clientes',
      });
    }

    // Validar calificación
    if (!calificacion || calificacion < 1 || calificacion > 5) {
      return res.status(400).json({
        exito: false,
        error: 'La calificación debe estar entre 1 y 5',
      });
    }

    // Obtener el viaje
    const viaje = await SolicitudViaje.findById(idViaje);

    if (!viaje) {
      return res.status(404).json({
        exito: false,
        error: 'Viaje no encontrado',
      });
    }

    // Validar que el viaje haya sido asignado al conductor
    if (viaje.id_conductor_asignado?.toString() !== idConductor) {
      return res.status(403).json({
        exito: false,
        error: 'No autorizado para calificar este viaje',
      });
    }

    // Validar que el viaje esté completado
    if (viaje.estado !== 'completado') {
      return res.status(400).json({
        exito: false,
        error: 'Solo se pueden calificar viajes completados',
      });
    }

    // Validar que no haya sido calificado previamente por este conductor
    const calificacionExistente = await Rating.findOne({
      id_viaje: idViaje,
      id_calificador: idConductor,
    });

    if (calificacionExistente) {
      return res.status(400).json({
        exito: false,
        error: 'Este viaje ya fue calificado por ti',
      });
    }

    // Crear la calificación
    const nuevaCalificacion = await Rating.create({
      id_viaje: idViaje,
      id_calificador: idConductor,
      id_calificado: viaje.id_pasajero,
      calificacion,
      comentario: comentario || '',
      tipo_calificador: 'conductor',
    });

    // Actualizar el rating del cliente (si existe en el modelo)
    await actualizarCalificacionPasajero(viaje.id_pasajero);

    // Notificar al cliente
    if (io) {
      io.to(`user:${viaje.id_pasajero}`).emit('rating:received', {
        rideId: idViaje,
        rating: calificacion,
        comment: comentario,
        message: 'Has recibido una nueva calificación',
      });
    }

    res.json({
      exito: true,
      datos: nuevaCalificacion,
      mensaje: 'Calificación registrada exitosamente',
    });
  } catch (error) {
    console.error('❌ Error calificando cliente:', error);
    res.status(500).json({
      exito: false,
      error: 'Error al calificar cliente',
    });
  }
};

/**
 * Actualizar calificación promedio de un conductor
 */
async function actualizarCalificacionConductor(idConductor) {
  const calificaciones = await Rating.find({
    id_calificado: idConductor,
    tipo_calificador: 'pasajero',
  });

  if (calificaciones.length === 0) return;

  const calificacionPromedio =
    calificaciones.reduce((suma, c) => suma + c.calificacion, 0) / calificaciones.length;

  await User.findByIdAndUpdate(idConductor, {
    'informacion_conductor.calificacion': Math.round(calificacionPromedio * 10) / 10, // Redondear a 1 decimal
  });
}

/**
 * Actualizar calificación promedio de un cliente
 * (Por ahora solo actualizamos si el modelo lo soporta)
 */
async function actualizarCalificacionPasajero(idPasajero) {
  // Por ahora, los clientes no tienen calificación en el modelo
  // Pero podemos calcularla si se necesita en el futuro
  // TODO: Agregar campo de calificación para clientes si es necesario
}

// Exportar también con los nombres anteriores para compatibilidad
export { calificarConductor as rateDriver };
export { calificarPasajero as ratePassenger };
