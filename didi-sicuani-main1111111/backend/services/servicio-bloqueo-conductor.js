import BloqueoConductor from '../models/BloqueoConductor.js';

/**
 * Servicio de Bloqueo de Conductor
 * Maneja el bloqueo de usuarios y zonas por parte de conductores
 */
class ServicioBloqueoConductor {
  /**
   * Bloquea un usuario específico para un conductor
   * @param {String} idConductor - ID del conductor
   * @param {String} idUsuario - ID del usuario a bloquear
   * @param {String} razon - Razón del bloqueo
   * @param {Boolean} esPermanente - Si el bloqueo es permanente
   * @returns {Object} Objeto de bloqueo creado
   */
  async bloquearUsuario(idConductor, idUsuario, razon = null, esPermanente = false) {
    const fechaExpiracion = esPermanente
      ? null
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días

    const bloqueo = await BloqueoConductor.create({
      id_conductor: idConductor,
      id_usuario_bloqueado: idUsuario,
      tipo_bloqueo: 'usuario',
      razon,
      es_permanente: esPermanente,
      fecha_expiracion: fechaExpiracion,
    });

    return bloqueo;
  }

  /**
   * Bloquea una zona específica
   * @param {String} idConductor - ID del conductor
   * @param {String} direccion - Dirección de la zona a bloquear
   * @param {String} razon - Razón del bloqueo
   * @param {Number} duracionHoras - Duración del bloqueo en horas
   * @returns {Object} Objeto de bloqueo creado
   */
  async bloquearZona(idConductor, direccion, razon = null, duracionHoras = 24) {
    const fechaExpiracion = new Date(Date.now() + duracionHoras * 60 * 60 * 1000);

    const bloqueo = await BloqueoConductor.create({
      id_conductor: idConductor,
      direccion_bloqueada: direccion,
      tipo_bloqueo: 'zona',
      razon,
      fecha_expiracion: fechaExpiracion,
    });

    return bloqueo;
  }

  /**
   * Desbloquea un usuario
   * @param {String} idConductor - ID del conductor
   * @param {String} idUsuario - ID del usuario a desbloquear
   * @returns {Object} Resultado de la operación
   */
  async desbloquearUsuario(idConductor, idUsuario) {
    await BloqueoConductor.deleteMany({
      id_conductor: idConductor,
      id_usuario_bloqueado: idUsuario,
      tipo_bloqueo: 'usuario',
    });

    return { exito: true };
  }

  /**
   * Verifica si un viaje está bloqueado para un conductor
   * @param {String} idConductor - ID del conductor
   * @param {Object} solicitudViaje - Objeto de solicitud de viaje
   * @returns {Object} Objeto con información de bloqueo
   */
  async estaViajeBloqueado(idConductor, solicitudViaje) {
    // Verificar bloqueo de usuario
    const bloqueoUsuario = await BloqueoConductor.findOne({
      id_conductor: idConductor,
      id_usuario_bloqueado: solicitudViaje.id_pasajero,
      tipo_bloqueo: 'usuario',
      $or: [{ fecha_expiracion: null }, { fecha_expiracion: { $gt: new Date() } }],
    });

    if (bloqueoUsuario) {
      return { bloqueado: true, razon: 'usuario_bloqueado', bloqueo: bloqueoUsuario };
    }

    // Verificar bloqueo de zona origen
    if (solicitudViaje.origen_direccion) {
      const bloqueoZona = await BloqueoConductor.findOne({
        id_conductor: idConductor,
        direccion_bloqueada: solicitudViaje.origen_direccion,
        tipo_bloqueo: 'zona',
        $or: [{ fecha_expiracion: null }, { fecha_expiracion: { $gt: new Date() } }],
      });

      if (bloqueoZona) {
        return { bloqueado: true, razon: 'zona_bloqueada', bloqueo: bloqueoZona };
      }
    }

    return { bloqueado: false };
  }

  /**
   * Obtiene lista de bloqueos activos de un conductor
   * @param {String} idConductor - ID del conductor
   * @returns {Array} Lista de bloqueos activos
   */
  async obtenerBloqueosConductor(idConductor) {
    const bloqueos = await BloqueoConductor.find({
      id_conductor: idConductor,
      $or: [{ fecha_expiracion: null }, { fecha_expiracion: { $gt: new Date() } }],
    })
      .populate('id_usuario_bloqueado', 'nombre correo')
      .sort({ createdAt: -1 });

    return bloqueos;
  }

  /**
   * Limpia bloqueos expirados
   * @returns {Object} Resultado de la operación
   */
  async limpiarBloqueosExpirados() {
    const resultado = await BloqueoConductor.deleteMany({
      fecha_expiracion: { $lt: new Date() },
      es_permanente: false,
    });

    return resultado;
  }
}

export default new ServicioBloqueoConductor();
