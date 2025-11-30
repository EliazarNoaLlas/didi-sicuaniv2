import RetencionConductor from '../models/RetencionConductor.js';
import SolicitudViaje from '../models/SolicitudViaje.js';
import { io } from '../server.js';

/**
 * Servicio de Retención de Conductor
 * Maneja la retención temporal de viajes por parte de conductores
 */
class ServicioRetencionConductor {
  constructor() {
    this.DURACION_RETENCION_POR_DEFECTO_MINUTOS = 5;
  }

  /**
   * Pone un viaje en espera para un conductor
   * @param {String} idViaje - ID del viaje
   * @param {String} idConductor - ID del conductor
   * @param {Number} duracionMinutos - Duración de la retención en minutos
   * @returns {Object} Resultado de la operación
   */
  async ponerViajeEnEspera(idViaje, idConductor, duracionMinutos = null) {
    const duracion = duracionMinutos || this.DURACION_RETENCION_POR_DEFECTO_MINUTOS;
    const fechaExpiracion = new Date(Date.now() + duracion * 60 * 1000);

    // Verificar que el viaje esté disponible
    const solicitudViaje = await SolicitudViaje.findById(idViaje);
    if (!solicitudViaje) {
      throw new Error('Viaje no encontrado');
    }

    if (solicitudViaje.estado !== 'subasta_activa') {
      throw new Error('Este viaje ya no está disponible');
    }

    // Crear o actualizar retención
    const retencion = await RetencionConductor.findOneAndUpdate(
      {
        id_conductor: idConductor,
        id_solicitud_viaje: idViaje,
        estado: 'activa',
      },
      {
        id_conductor: idConductor,
        id_solicitud_viaje: idViaje,
        fecha_expiracion: fechaExpiracion,
        estado: 'activa',
      },
      {
        upsert: true,
        new: true,
      }
    );

    // Notificar al pasajero (opcional)
    if (io) {
      io.to(`user:${solicitudViaje.id_pasajero}`).emit('ride:on_hold', {
        idSolicitudViaje: idViaje,
        mensaje: 'Un conductor está considerando tu solicitud',
      });
    }

    return {
      exito: true,
      retencion_hasta: fechaExpiracion,
      mensaje: `Viaje puesto en espera hasta ${fechaExpiracion.toLocaleTimeString()}`,
    };
  }

  /**
   * Libera un viaje de espera
   * @param {String} idViaje - ID del viaje
   * @param {String} idConductor - ID del conductor
   * @returns {Object} Resultado de la operación
   */
  async liberarEspera(idViaje, idConductor) {
    const retencion = await RetencionConductor.findOne({
      id_conductor: idConductor,
      id_solicitud_viaje: idViaje,
      estado: 'activa',
    });

    if (!retencion) {
      throw new Error('Viaje no está en espera para este conductor');
    }

    await RetencionConductor.findByIdAndUpdate(retencion._id, {
      estado: 'liberada',
    });

    return { exito: true, mensaje: 'Viaje liberado de espera' };
  }

  /**
   * Acepta un viaje que está en espera
   * @param {String} idViaje - ID del viaje
   * @param {String} idConductor - ID del conductor
   * @returns {Object} Resultado de la operación
   */
  async aceptarViajeEnEspera(idViaje, idConductor) {
    const retencion = await RetencionConductor.findOne({
      id_conductor: idConductor,
      id_solicitud_viaje: idViaje,
      estado: 'activa',
    });

    if (!retencion) {
      throw new Error('Viaje no está en espera para este conductor');
    }

    // Marcar retención como aceptada
    await RetencionConductor.findByIdAndUpdate(retencion._id, {
      estado: 'aceptada',
    });

    // La oferta se crea normalmente a través del endpoint de ofertas
    return { exito: true, mensaje: 'Viaje aceptado desde espera' };
  }

  /**
   * Obtiene viajes en espera de un conductor
   * @param {String} idConductor - ID del conductor
   * @returns {Array} Lista de viajes en espera
   */
  async obtenerViajesEnEsperaConductor(idConductor) {
    const retenciones = await RetencionConductor.find({
      id_conductor: idConductor,
      estado: 'activa',
      fecha_expiracion: { $gt: new Date() },
    })
      .populate('id_solicitud_viaje')
      .sort({ createdAt: -1 });

    return retenciones.map((retencion) => ({
      ...retencion.id_solicitud_viaje.toObject(),
      fecha_expiracion_retencion: retencion.fecha_expiracion,
      id_retencion: retencion._id,
    }));
  }

  /**
   * Limpia retenciones expiradas
   * @returns {Object} Resultado de la operación
   */
  async limpiarRetencionesExpiradas() {
    const resultado = await RetencionConductor.updateMany(
      {
        estado: 'activa',
        fecha_expiracion: { $lt: new Date() },
      },
      {
        estado: 'expirada',
      }
    );

    return resultado;
  }
}

export default new ServicioRetencionConductor();
