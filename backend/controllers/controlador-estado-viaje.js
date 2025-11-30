import SolicitudViaje from '../models/SolicitudViaje.js';
import Usuario from '../models/Usuario.js';
import { io } from '../server.js';
import utilidadesGeoespaciales from '../utils/utilidades-geoespaciales.js';

/**
 * Controlador de Estado de Viaje
 * Maneja las actualizaciones de estado de los viajes (en ruta, en progreso, completado)
 */

/**
 * Actualizar estado del viaje: asignado -> conductor_en_ruta
 * El conductor indica que está yendo al punto de recogida
 * @param {Object} req - Request con ID del viaje
 * @param {Object} res - Response
 */
export const iniciarEnRuta = async (req, res) => {
  try {
    const idConductor = req.usuario.id;
    const { idViaje } = req.params;
    const { tiempo_estimado_minutos } = req.body;

    // Validar que sea conductor
    if (req.usuario.tipoUsuario !== 'conductor') {
      return res.status(403).json({
        exito: false,
        error: 'Solo conductores pueden actualizar el estado del viaje',
      });
    }

    const viaje = await SolicitudViaje.findById(idViaje);

    if (!viaje) {
      return res.status(404).json({
        exito: false,
        error: 'Viaje no encontrado',
      });
    }

    // Validar que el viaje esté asignado a este conductor
    if (viaje.id_conductor_asignado?.toString() !== idConductor) {
      return res.status(403).json({
        exito: false,
        error: 'Este viaje no está asignado a ti',
      });
    }

    // Validar que el estado sea 'asignado'
    if (viaje.estado !== 'asignado') {
      return res.status(400).json({
        exito: false,
        error: `No se puede cambiar a 'en ruta' desde el estado actual: ${viaje.estado}`,
      });
    }

    // Calcular ETA al punto de recogida
    const conductor = await Usuario.findById(idConductor);
    let tiempoEstimadoLlegada = null;
    
    // Usar el tiempo estimado proporcionado por el conductor, o calcularlo
    if (tiempo_estimado_minutos) {
      tiempoEstimadoLlegada = parseFloat(tiempo_estimado_minutos);
    } else if (conductor.informacion_conductor?.latitud_actual && conductor.informacion_conductor?.longitud_actual) {
      const distancia = utilidadesGeoespaciales.calcularDistanciaHaversine(
        conductor.informacion_conductor.latitud_actual,
        conductor.informacion_conductor.longitud_actual,
        viaje.origen_lat,
        viaje.origen_lon
      );
      const velocidadPromedioKmh = 25;
      tiempoEstimadoLlegada = Math.ceil((distancia / velocidadPromedioKmh) * 60);
    }

    // Actualizar estado
    await SolicitudViaje.findByIdAndUpdate(idViaje, {
      estado: 'conductor_en_ruta',
    });

    // Notificar al pasajero
    if (io) {
      io.to(`usuario:${viaje.id_pasajero}`).emit('viaje:conductor_en_ruta', {
        idViaje: idViaje.toString(),
        idConductor: idConductor.toString(),
        tiempoEstimadoLlegada,
        mensaje: `El conductor está en camino al punto de recogida. Tiempo estimado: ${tiempoEstimadoLlegada} minutos`,
        timestamp: new Date(),
      });
    }

    res.json({
      exito: true,
      mensaje: 'Estado actualizado: En camino al punto de recogida',
      datos: {
        estado: 'conductor_en_ruta',
        tiempoEstimadoLlegada,
      },
    });
  } catch (error) {
    console.error('❌ Error actualizando estado a en ruta:', error);
    res.status(500).json({
      exito: false,
      error: 'Error al actualizar estado del viaje',
    });
  }
};

/**
 * Actualizar estado del viaje: conductor_en_ruta -> conductor_llego_punto_recogida
 * El conductor indica que llegó al punto de recogida
 * @param {Object} req - Request con ID del viaje
 * @param {Object} res - Response
 */
export const conductorLlegoPuntoRecogida = async (req, res) => {
  try {
    const idConductor = req.usuario.id;
    const { idViaje } = req.params;

    // Validar que sea conductor
    if (req.usuario.tipoUsuario !== 'conductor') {
      return res.status(403).json({
        exito: false,
        error: 'Solo conductores pueden actualizar el estado del viaje',
      });
    }

    const viaje = await SolicitudViaje.findById(idViaje);

    if (!viaje) {
      return res.status(404).json({
        exito: false,
        error: 'Viaje no encontrado',
      });
    }

    // Validar que el viaje esté asignado a este conductor
    if (viaje.id_conductor_asignado?.toString() !== idConductor) {
      return res.status(403).json({
        exito: false,
        error: 'Este viaje no está asignado a ti',
      });
    }

    // Validar que el estado sea 'conductor_en_ruta'
    if (viaje.estado !== 'conductor_en_ruta') {
      return res.status(400).json({
        exito: false,
        error: `No se puede marcar como llegado desde el estado actual: ${viaje.estado}`,
      });
    }

    // Actualizar estado
    await SolicitudViaje.findByIdAndUpdate(idViaje, {
      estado: 'conductor_llego_punto_recogida',
    });

    // Notificar al pasajero que el conductor llegó al punto de recogida
    if (io) {
      io.to(`usuario:${viaje.id_pasajero}`).emit('viaje:conductor_llego_punto_recogida', {
        idViaje: idViaje.toString(),
        idConductor: idConductor.toString(),
        mensaje: 'El conductor ha llegado al punto de recogida. Prepárate para abordar.',
        timestamp: new Date(),
      });
    }

    res.json({
      exito: true,
      mensaje: 'Estado actualizado: Llegaste al punto de recogida',
      datos: {
        estado: 'conductor_llego_punto_recogida',
      },
    });
  } catch (error) {
    console.error('❌ Error actualizando estado a llegado:', error);
    res.status(500).json({
      exito: false,
      error: 'Error al actualizar estado del viaje',
    });
  }
};

/**
 * Actualizar estado del viaje: conductor_llego_punto_recogida -> en_progreso
 * El conductor indica que recogió al pasajero
 * @param {Object} req - Request con ID del viaje
 * @param {Object} res - Response
 */
export const iniciarViaje = async (req, res) => {
  try {
    const idConductor = req.usuario.id;
    const { idViaje } = req.params;

    // Validar que sea conductor
    if (req.usuario.tipoUsuario !== 'conductor') {
      return res.status(403).json({
        exito: false,
        error: 'Solo conductores pueden actualizar el estado del viaje',
      });
    }

    const viaje = await SolicitudViaje.findById(idViaje);

    if (!viaje) {
      return res.status(404).json({
        exito: false,
        error: 'Viaje no encontrado',
      });
    }

    // Validar que el viaje esté asignado a este conductor
    if (viaje.id_conductor_asignado?.toString() !== idConductor) {
      return res.status(403).json({
        exito: false,
        error: 'Este viaje no está asignado a ti',
      });
    }

    // Validar que el estado sea 'conductor_llego_punto_recogida' o 'conductor_en_ruta' (compatibilidad)
    if (viaje.estado !== 'conductor_llego_punto_recogida' && viaje.estado !== 'conductor_en_ruta') {
      return res.status(400).json({
        exito: false,
        error: `No se puede iniciar el viaje desde el estado actual: ${viaje.estado}`,
      });
    }

    // Actualizar estado
    await SolicitudViaje.findByIdAndUpdate(idViaje, {
      estado: 'en_progreso',
    });

    // Notificar al pasajero que el viaje inició
    if (io) {
      io.to(`usuario:${viaje.id_pasajero}`).emit('viaje:iniciado', {
        idViaje: idViaje.toString(),
        idConductor: idConductor.toString(),
        mensaje: 'Viaje iniciado. En camino al destino',
        timestamp: new Date(),
      });
    }

    res.json({
      exito: true,
      mensaje: 'Viaje iniciado. En camino al destino',
      datos: {
        estado: 'en_progreso',
      },
    });
  } catch (error) {
    console.error('❌ Error iniciando viaje:', error);
    res.status(500).json({
      exito: false,
      error: 'Error al iniciar viaje',
    });
  }
};

/**
 * Actualizar estado del viaje: en_progreso -> completado
 * El conductor indica que completó el viaje
 * @param {Object} req - Request con ID del viaje
 * @param {Object} res - Response
 */
export const completarViaje = async (req, res) => {
  try {
    const idConductor = req.usuario.id;
    const { idViaje } = req.params;

    // Validar que sea conductor
    if (req.usuario.tipoUsuario !== 'conductor') {
      return res.status(403).json({
        exito: false,
        error: 'Solo conductores pueden completar viajes',
      });
    }

    const viaje = await SolicitudViaje.findById(idViaje);

    if (!viaje) {
      return res.status(404).json({
        exito: false,
        error: 'Viaje no encontrado',
      });
    }

    // Validar que el viaje esté asignado a este conductor
    if (viaje.id_conductor_asignado?.toString() !== idConductor) {
      return res.status(403).json({
        exito: false,
        error: 'Este viaje no está asignado a ti',
      });
    }

    // Validar que el estado sea 'en_progress'
    if (viaje.estado !== 'en_progreso') {
      return res.status(400).json({
        exito: false,
        error: `No se puede completar el viaje desde el estado actual: ${viaje.estado}`,
      });
    }

    // Actualizar estado a completado
    const viajeActualizado = await SolicitudViaje.findByIdAndUpdate(
      idViaje,
      {
        estado: 'completado',
      },
      { new: true }
    );

    // Verificar que se actualizó correctamente
    if (!viajeActualizado || viajeActualizado.estado !== 'completado') {
      console.error(`❌ Error: No se pudo actualizar el estado del viaje ${idViaje} a completado`);
      return res.status(500).json({
        exito: false,
        error: 'Error al actualizar el estado del viaje',
      });
    }

    console.log(`✅ Viaje ${idViaje} completado exitosamente. Estado: ${viajeActualizado.estado}`);

    // Marcar conductor como disponible nuevamente
    await Usuario.findByIdAndUpdate(idConductor, {
      'informacion_conductor.esta_disponible': true,
    });

    // Actualizar estadísticas del conductor
    const conductor = await Usuario.findById(idConductor);
    await Usuario.findByIdAndUpdate(idConductor, {
      'informacion_conductor.total_viajes': (conductor.informacion_conductor?.total_viajes || 0) + 1,
    });

    // Notificar al pasajero
    if (io) {
      io.to(`usuario:${viaje.id_pasajero}`).emit('viaje:completado', {
        idViaje: idViaje.toString(),
        idConductor: idConductor.toString(),
        precioFinal: viaje.precio_final_acordado,
        estado: 'completado',
        mensaje: 'Viaje completado. ¡Gracias por usar nuestro servicio!',
        timestamp: new Date(),
      });
    }

    res.json({
      exito: true,
      mensaje: 'Viaje completado exitosamente',
      datos: {
        estado: 'completado',
        viaje: viajeActualizado,
      },
      datos: {
        estado: 'completado',
        viaje: viajeActualizado,
      },
    });
  } catch (error) {
    console.error('❌ Error completando viaje:', error);
    res.status(500).json({
      exito: false,
      error: 'Error al completar viaje',
    });
  }
};

/**
 * Obtener viaje activo del conductor
 * @param {Object} req - Request con información del conductor
 * @param {Object} res - Response
 */
export const obtenerViajeActivo = async (req, res) => {
  try {
    const idConductor = req.usuario.id;

    // Buscar viaje activo del conductor
    // IMPORTANTE: Más reciente primero y no eliminados
    const viajeActivo = await SolicitudViaje.findOne({
      id_conductor_asignado: idConductor,
      estado: { $in: ['asignado', 'conductor_en_ruta', 'conductor_llego_punto_recogida', 'en_progreso'] },
      fecha_eliminacion: null, // Excluir viajes eliminados
    })
      .sort({ fecha_asignacion: -1, createdAt: -1 }) // Más reciente primero
      .populate('id_pasajero', 'nombre correo telefono')
      .lean();

    if (!viajeActivo) {
      return res.json({
        exito: true,
        datos: null,
        mensaje: 'No hay viaje activo',
      });
    }

    // Calcular ETA si está en ruta
    let tiempoEstimadoLlegada = null;
    let tiempoEstimadoDestino = null;

    if (viajeActivo.estado === 'conductor_en_ruta' || viajeActivo.estado === 'conductor_llego_punto_recogida') {
      const conductor = await Usuario.findById(idConductor);
      if (conductor.informacion_conductor?.latitud_actual && conductor.informacion_conductor?.longitud_actual) {
        const distancia = utilidadesGeoespaciales.calcularDistanciaHaversine(
          conductor.informacion_conductor.latitud_actual,
          conductor.informacion_conductor.longitud_actual,
          viajeActivo.origen_lat,
          viajeActivo.origen_lon
        );
        const velocidadPromedioKmh = 25;
        tiempoEstimadoLlegada = Math.ceil((distancia / velocidadPromedioKmh) * 60);
      }
    }

    if (viajeActivo.estado === 'en_progreso') {
      tiempoEstimadoDestino = viajeActivo.duracion_estimada_min;
    }

    res.json({
      exito: true,
      datos: {
        ...viajeActivo,
        tiempoEstimadoLlegada,
        tiempoEstimadoDestino,
      },
    });
  } catch (error) {
    console.error('❌ Error obteniendo viaje activo:', error);
    res.status(500).json({
      exito: false,
      error: 'Error al obtener viaje activo',
    });
  }
};

/**
 * Obtener viaje activo del pasajero
 * @param {Object} req - Request con información del pasajero
 * @param {Object} res - Response
 */
export const obtenerViajeActivoPasajero = async (req, res) => {
  try {
    const idPasajero = req.usuario.id;

    // Buscar viaje activo del pasajero
    // IMPORTANTE: Solo viajes con conductor asignado, más reciente primero, y no eliminados
    const viajeActivo = await SolicitudViaje.findOne({
      id_pasajero: idPasajero,
      estado: { $in: ['asignado', 'conductor_en_ruta', 'conductor_llego_punto_recogida', 'en_progreso'] },
      id_conductor_asignado: { $exists: true, $ne: null }, // Solo viajes con conductor asignado
      fecha_eliminacion: null, // Excluir viajes eliminados
    })
      .sort({ fecha_asignacion: -1, createdAt: -1 }) // Más reciente primero
      .populate('id_conductor_asignado', 'nombre correo telefono informacion_conductor')
      .lean();

    if (!viajeActivo) {
      return res.status(404).json({
        exito: false,
        datos: null,
        mensaje: 'No hay viaje activo',
      });
    }

    // Calcular ETA si el conductor está en ruta
    let tiempoEstimadoLlegada = null;
    let tiempoEstimadoDestino = null;

    if (viajeActivo.estado === 'conductor_en_ruta' && viajeActivo.id_conductor_asignado) {
      const conductor = viajeActivo.id_conductor_asignado;
      if (conductor.informacion_conductor?.latitud_actual && conductor.informacion_conductor?.longitud_actual) {
        const distancia = utilidadesGeoespaciales.calcularDistanciaHaversine(
          conductor.informacion_conductor.latitud_actual,
          conductor.informacion_conductor.longitud_actual,
          viajeActivo.origen_lat,
          viajeActivo.origen_lon
        );
        const velocidadPromedioKmh = 25;
        tiempoEstimadoLlegada = Math.ceil((distancia / velocidadPromedioKmh) * 60);
      }
    }

    if (viajeActivo.estado === 'en_progreso') {
      tiempoEstimadoDestino = viajeActivo.duracion_estimada_min;
    }

    res.json({
      exito: true,
      datos: {
        ...viajeActivo,
        tiempoEstimadoLlegada,
        tiempoEstimadoDestino,
        conductor: viajeActivo.id_conductor_asignado,
      },
    });
  } catch (error) {
    console.error('❌ Error obteniendo viaje activo del pasajero:', error);
    res.status(500).json({
      exito: false,
      error: 'Error al obtener viaje activo',
    });
  }
};

// Exportar también con nombres en inglés para compatibilidad temporal
export const startEnRoute = iniciarEnRuta;
export const driverArrived = conductorLlegoPuntoRecogida;
export const startTrip = iniciarViaje;
export const completeTrip = completarViaje;
export const getActiveRide = obtenerViajeActivo;


