import { getRedisClient } from '../config/redis.js';
import servicioPrecios from './servicio-precios.js';
import utilidadesGeoespaciales from '../utils/utilidades-geoespaciales.js';
import SolicitudViaje from '../models/SolicitudViaje.js';
import Oferta from '../models/Oferta.js';
import Usuario from '../models/Usuario.js';
import { io } from '../server.js';

/**
 * Servicio de Subasta
 * Maneja la lógica de creación de solicitudes de viaje, ofertas de conductores,
 * asignación de viajes y notificaciones en tiempo real
 */
class ServicioSubasta {
  constructor() {
    // Tiempo de espera para recibir ofertas (5 minutos según RF-009)
    this.TIEMPO_ESPERA_SUBASTA = 300; // segundos
    // Tiempo de expiración de una oferta individual (1 minuto)
    this.TIEMPO_EXPIRACION_OFERTA = 60; // segundos
    // Máximo de rondas de negociación permitidas
    this.MAX_RONDAS_NEGOCIACION = 2;
    // Radio inicial de notificación a conductores (km)
    this.RADIO_NOTIFICACION_INICIAL_KM = 5;
    // Radio máximo de notificación si no hay ofertas (km)
    this.RADIO_NOTIFICACION_MAXIMO_KM = 15;
  }

  /**
   * Crear una nueva solicitud de viaje
   * @param {String} idPasajero - ID del pasajero que solicita el viaje
   * @param {Object} datosViaje - Datos del viaje (origen, destino, etc.)
   * @returns {Object} Objeto con la solicitud creada y precio sugerido
   */
  async crearSolicitudViaje(idPasajero, datosViaje) {
    const {
      origen_lat,
      origen_lon,
      origen_direccion,
      destino_lat,
      destino_lon,
      destino_direccion,
    } = datosViaje;

    // 1. Validar direcciones (requeridas)
    if (!origen_direccion || !destino_direccion) {
      throw new Error('Las direcciones de origen y destino son requeridas');
    }

    // 2. Si no hay coordenadas, usar coordenadas por defecto de Sicuani
    // En producción, aquí se podría integrar un servicio de geocodificación
    let latOrigen = origen_lat;
    let lonOrigen = origen_lon;
    let latDestino = destino_lat;
    let lonDestino = destino_lon;

    // Si faltan coordenadas de origen, usar coordenadas por defecto de Sicuani
    if (latOrigen === null || latOrigen === undefined || isNaN(latOrigen) || !isFinite(latOrigen)) {
      console.warn('⚠️ No se proporcionaron coordenadas de origen, usando coordenadas por defecto de Sicuani');
      latOrigen = -14.2694; // Coordenadas por defecto de Sicuani
    }
    if (lonOrigen === null || lonOrigen === undefined || isNaN(lonOrigen) || !isFinite(lonOrigen)) {
      console.warn('⚠️ No se proporcionó longitud de origen, usando coordenadas por defecto de Sicuani');
      lonOrigen = -71.2256;
    }

    // Si faltan coordenadas de destino, usar coordenadas por defecto de Sicuani
    if (latDestino === null || latDestino === undefined || isNaN(latDestino) || !isFinite(latDestino)) {
      console.warn('⚠️ No se proporcionaron coordenadas de destino, usando coordenadas por defecto de Sicuani');
      latDestino = -14.2700; // Coordenadas por defecto de Sicuani
    }
    if (lonDestino === null || lonDestino === undefined || isNaN(lonDestino) || !isFinite(lonDestino)) {
      console.warn('⚠️ No se proporcionó longitud de destino, usando coordenadas por defecto de Sicuani');
      lonDestino = -71.2260;
    }

    // Asegurar que todas las coordenadas sean números válidos
    latOrigen = parseFloat(latOrigen);
    lonOrigen = parseFloat(lonOrigen);
    latDestino = parseFloat(latDestino);
    lonDestino = parseFloat(lonDestino);

    // 3. Calcular métricas del viaje (distancia, duración)
    const metricasRuta = await servicioPrecios.obtenerMetricasRuta(
      latOrigen,
      lonOrigen,
      latDestino,
      lonDestino
    );

    // Validar que las métricas sean válidas
    if (!metricasRuta || isNaN(metricasRuta.distancia_km) || isNaN(metricasRuta.duracion_min)) {
      console.error('⚠️ Métricas de ruta inválidas:', metricasRuta);
      throw new Error('Error al calcular métricas de ruta. Por favor, verifica las coordenadas.');
    }

    // 4. Calcular precio sugerido del sistema
    const precioSugerido = await servicioPrecios.calcularPrecioSugerido({
      origen_lat: latOrigen,
      origen_lon: lonOrigen,
      destino_lat: latDestino,
      destino_lon: lonDestino,
      tipo_vehiculo: datosViaje.tipo_vehiculo || 'cualquiera', // Por defecto cualquier tipo según RF-009
    });

    // Validar que el precio sea válido
    if (!precioSugerido || isNaN(precioSugerido) || !isFinite(precioSugerido)) {
      console.error('⚠️ Precio sugerido inválido:', precioSugerido);
      throw new Error('Error al calcular precio sugerido. Por favor, verifica las coordenadas.');
    }

    // 5. Crear solicitud de viaje en MongoDB
    const fechaExpiracion = new Date(Date.now() + this.TIEMPO_ESPERA_SUBASTA * 1000);

    const datosSolicitudViaje = {
      id_pasajero: idPasajero,
      origen_lat: latOrigen,
      origen_lon: lonOrigen,
      origen_direccion,
      destino_lat: latDestino,
      destino_lon: lonDestino,
      destino_direccion,
      precio_sugerido_soles: precioSugerido,
      precio_ofrecido_pasajero: datosViaje.precio_ofrecido_pasajero || null,
      distancia_estimada_km: metricasRuta.distancia_km,
      duracion_estimada_min: metricasRuta.duracion_min,
      tipo_vehiculo: datosViaje.tipo_vehiculo || 'cualquiera', // Por defecto cualquier tipo
      metodo_pago: datosViaje.metodo_pago || 'efectivo',
      estado: 'subasta_activa',
      fecha_expiracion: fechaExpiracion,
    };

    const solicitudViaje = await SolicitudViaje.create(datosSolicitudViaje);

    // 5. Guardar en Redis para acceso rápido (opcional, no crítico)
    try {
      const redis = getRedisClient();
      if (redis && redis.isOpen) {
        await redis.setEx(
          `solicitud_viaje:${solicitudViaje._id}`,
          this.TIEMPO_ESPERA_SUBASTA,
          JSON.stringify(solicitudViaje)
        );
      }
    } catch (errorRedis) {
      // Redis no es crítico, continuar sin cache
      console.warn('Cache Redis no disponible, continuando sin cache');
    }

    // 6. Notificar a conductores cercanos vía Socket.io
    await this.notificarConductoresCercanos(solicitudViaje);

    // 7. Programar timeout automático para cancelar si no hay ofertas
    setTimeout(
      () => this.manejarTiempoExpirado(solicitudViaje._id.toString()),
      this.TIEMPO_ESPERA_SUBASTA * 1000
    );

    return {
      solicitudViaje,
      precioSugerido,
    };
  }

  /**
   * Notificar a conductores cercanos sobre una nueva solicitud de viaje
   * @param {Object} solicitudViaje - La solicitud de viaje a notificar
   * @param {Number} radioKm - Radio de búsqueda en kilómetros (opcional)
   * @returns {Array} Lista de conductores notificados con información adicional
   */
  async notificarConductoresCercanos(solicitudViaje, radioKm = null) {
    // Buscar TODOS los conductores disponibles (sin filtrar por distancia ni tipo de vehículo)
    // Según RF-002: Todos los conductores disponibles reciben todas las solicitudes
    const todosConductores = await Usuario.find({
      tipo_usuario: 'conductor',
      'informacion_conductor.esta_en_linea': true,
      'informacion_conductor.esta_disponible': true,
    });

    // No filtrar por tipo de vehículo - todos los conductores reciben todas las solicitudes
    const conductoresFiltrados = todosConductores;

    // Calcular información adicional para cada conductor (distancia, ETA, etc.)
    const conductoresConInfo = conductoresFiltrados.map((conductor) => {
      let distancia_km = null;
      let tiempo_estimado_llegada_min = null;

      // Si el conductor tiene ubicación, calcular distancia
      if (
        conductor.informacion_conductor?.latitud_actual &&
        conductor.informacion_conductor?.longitud_actual
      ) {
        distancia_km = utilidadesGeoespaciales.calcularDistanciaHaversine(
          solicitudViaje.origen_lat,
          solicitudViaje.origen_lon,
          conductor.informacion_conductor.latitud_actual,
          conductor.informacion_conductor.longitud_actual
        );

        // Calcular ETA (estimado basado en distancia)
        const velocidadPromedioKmh = 25; // Velocidad promedio en ciudad
        tiempo_estimado_llegada_min = Math.ceil((distancia_km / velocidadPromedioKmh) * 60);
      }

      return {
        id_conductor: conductor._id.toString(),
        latitud_conductor: conductor.informacion_conductor?.latitud_actual || null,
        longitud_conductor: conductor.informacion_conductor?.longitud_actual || null,
        distancia_km: distancia_km ? Math.round(distancia_km * 100) / 100 : null,
        tiempo_estimado_llegada_min: tiempo_estimado_llegada_min,
        calificacion: conductor.informacion_conductor?.calificacion || 5.0,
        tipo_vehiculo: conductor.informacion_conductor?.tipo_vehiculo,
      };
    });

    // Notificar a TODOS los conductores filtrados vía Socket.io
    if (io) {
      // Notificar a la room global de conductores
      io.to('conductores').emit('viaje:nuevo', {
        _id: solicitudViaje._id.toString(),
        idSolicitudViaje: solicitudViaje._id.toString(),
        id_pasajero: solicitudViaje.id_pasajero.toString(),
        origen: {
          lat: solicitudViaje.origen_lat,
          lon: solicitudViaje.origen_lon,
          direccion: solicitudViaje.origen_direccion,
        },
        destino: {
          lat: solicitudViaje.destino_lat,
          lon: solicitudViaje.destino_lon,
          direccion: solicitudViaje.destino_direccion,
        },
        precio_ofrecido_pasajero: solicitudViaje.precio_ofrecido_pasajero,
        precio_sugerido_soles: solicitudViaje.precio_sugerido_soles,
        precioOfrecido: solicitudViaje.precio_ofrecido_pasajero,
        precioSugerido: solicitudViaje.precio_sugerido_soles,
        distancia_estimada_km: solicitudViaje.distancia_estimada_km,
        duracion_estimada_min: solicitudViaje.duracion_estimada_min,
        distancia: solicitudViaje.distancia_estimada_km,
        duracion: solicitudViaje.duracion_estimada_min,
        tipo_vehiculo: solicitudViaje.tipo_vehiculo,
        metodo_pago: solicitudViaje.metodo_pago,
        metodoPago: solicitudViaje.metodo_pago,
        estado: solicitudViaje.estado,
        fecha_expiracion: solicitudViaje.fecha_expiracion,
        fechaExpiracion: solicitudViaje.fecha_expiracion,
        fecha_creacion: solicitudViaje.createdAt,
      });

      // También notificar individualmente a cada conductor
      conductoresFiltrados.forEach((conductor) => {
        io.to(`conductor:${conductor._id.toString()}`).emit('viaje:nuevo', {
          _id: solicitudViaje._id.toString(),
          idSolicitudViaje: solicitudViaje._id.toString(),
          id_pasajero: solicitudViaje.id_pasajero.toString(),
          origen: {
            lat: solicitudViaje.origen_lat,
            lon: solicitudViaje.origen_lon,
            direccion: solicitudViaje.origen_direccion,
          },
          destino: {
            lat: solicitudViaje.destino_lat,
            lon: solicitudViaje.destino_lon,
            direccion: solicitudViaje.destino_direccion,
          },
          precio_ofrecido_pasajero: solicitudViaje.precio_ofrecido_pasajero,
          precio_sugerido_soles: solicitudViaje.precio_sugerido_soles,
          precioOfrecido: solicitudViaje.precio_ofrecido_pasajero,
          precioSugerido: solicitudViaje.precio_sugerido_soles,
          distancia_estimada_km: solicitudViaje.distancia_estimada_km,
          duracion_estimada_min: solicitudViaje.duracion_estimada_min,
          distancia: solicitudViaje.distancia_estimada_km,
          duracion: solicitudViaje.duracion_estimada_min,
          tipo_vehiculo: solicitudViaje.tipo_vehiculo,
          metodo_pago: solicitudViaje.metodo_pago,
          metodoPago: solicitudViaje.metodo_pago,
          estado: solicitudViaje.estado,
          fecha_expiracion: solicitudViaje.fecha_expiracion,
          fechaExpiracion: solicitudViaje.fecha_expiracion,
          fecha_creacion: solicitudViaje.createdAt,
        });
      });
    }

    console.log(
      `🔔 Notificados ${conductoresFiltrados.length} conductores (tipo: ${solicitudViaje.tipo_vehiculo}) para viaje ${solicitudViaje._id}`
    );

    return conductoresConInfo;
  }

  /**
   * Enviar una oferta de precio por parte de un conductor
   * @param {String} idConductor - ID del conductor que envía la oferta
   * @param {String} idSolicitudViaje - ID de la solicitud de viaje
   * @param {Number} precioOfrecido - Precio ofrecido por el conductor
   * @returns {Object} La oferta creada
   */
  async enviarOferta(idConductor, idSolicitudViaje, precioOfrecido) {
    // 1. Validar que el viaje aún esté aceptando ofertas
    const solicitudViaje = await SolicitudViaje.findById(idSolicitudViaje);

    if (!solicitudViaje) {
      throw new Error('Viaje no encontrado');
    }

    if (solicitudViaje.estado !== 'subasta_activa') {
      throw new Error('Este viaje ya no está aceptando ofertas');
    }

    if (new Date() > new Date(solicitudViaje.fecha_expiracion)) {
      throw new Error('El tiempo para ofertar ha expirado');
    }

    // 2. Obtener información del conductor
    const conductor = await Usuario.findById(idConductor);

    if (!conductor || conductor.tipo_usuario !== 'conductor') {
      throw new Error('Usuario no es conductor');
    }

    // 3. Calcular distancia y ETA del conductor al punto de recogida
    const latitudConductor = conductor.informacion_conductor?.latitud_actual || 0;
    const longitudConductor = conductor.informacion_conductor?.longitud_actual || 0;

    const distancia = utilidadesGeoespaciales.calcularDistanciaHaversine(
      latitudConductor,
      longitudConductor,
      solicitudViaje.origen_lat,
      solicitudViaje.origen_lon
    );

    // Calcular ETA basado en distancia (velocidad promedio 25 km/h en ciudad)
    const velocidadPromedioKmh = 25;
    const tiempo_estimado_llegada_min = Math.ceil((distancia / velocidadPromedioKmh) * 60);

    const metricasConductor = {
      distancia_km: Math.round(distancia * 100) / 100,
      tiempo_estimado_llegada_min: tiempo_estimado_llegada_min,
    };

    // 4. Validar precio ofrecido
    if (!precioOfrecido || precioOfrecido <= 0) {
      throw new Error('Debe especificar un precio válido mayor a cero');
    }

    // 5. Verificar si ya existe una oferta de este conductor para este viaje
    let oferta = await Oferta.findOne({
      id_solicitud_viaje: idSolicitudViaje,
      id_conductor: idConductor,
      estado: 'pendiente'
    });

    const fechaExpiracionOferta = new Date(Date.now() + this.TIEMPO_EXPIRACION_OFERTA * 1000);

    if (oferta) {
      // Actualizar oferta existente
      oferta.precio_ofrecido = precioOfrecido;
      oferta.distancia_conductor_km = metricasConductor.distancia_km;
      oferta.tiempo_estimado_llegada_min = metricasConductor.tiempo_estimado_llegada_min;
      oferta.fecha_expiracion = fechaExpiracionOferta;
      oferta.fecha_actualizacion = new Date(); // Campo opcional para tracking
      await oferta.save();
      console.log(`🔄 Oferta actualizada para viaje ${idSolicitudViaje} por conductor ${idConductor}`);
    } else {
      // Crear nueva oferta
      const datosOferta = {
        id_solicitud_viaje: idSolicitudViaje,
        id_conductor: idConductor,
        tipo_oferta: 'contraoferta', // Todos los bids son ofertas de precio
        precio_ofrecido: precioOfrecido,
        distancia_conductor_km: metricasConductor.distancia_km,
        tiempo_estimado_llegada_min: metricasConductor.tiempo_estimado_llegada_min,
        calificacion_conductor: conductor.informacion_conductor?.calificacion || 5.0,
        estado: 'pendiente',
        fecha_expiracion: fechaExpiracionOferta,
      };
      oferta = await Oferta.create(datosOferta);
      console.log(`✨ Nueva oferta creada para viaje ${idSolicitudViaje} por conductor ${idConductor}`);
    }

    // 6. Notificar al pasajero vía Socket.io
    if (io) {
      // Notificar sobre la oferta recibida/actualizada
      const objetoOferta = oferta.toObject();
      io.to(`usuario:${solicitudViaje.id_pasajero}`).emit('oferta:recibida', {
        ...objetoOferta,
        id: oferta._id.toString(), // Asegurar que tenga el campo 'id'
        _id: oferta._id.toString(), // También incluir _id como string
        nombre_conductor: conductor.nombre,
        tipo_vehiculo: conductor.informacion_conductor?.tipo_vehiculo,
        total_viajes: conductor.informacion_conductor?.total_viajes || 0,
        calificacion_conductor: conductor.informacion_conductor?.calificacion || 5.0,
        es_actualizacion: true // Flag para indicar que puede ser una actualización
      });

      // Notificar a otros conductores sobre la nueva oferta
      io.to('conductores').emit('oferta:nueva', {
        idSolicitudViaje: idSolicitudViaje.toString(),
        idOferta: oferta._id.toString(),
        idConductor: idConductor.toString(),
        precioOfrecido: oferta.precio_ofrecido,
        timestamp: new Date(),
      });
    }

    return oferta;
  }

  /**
   * Asignar un viaje a un conductor después de que el pasajero acepta su oferta
   * @param {String} idSolicitudViaje - ID de la solicitud de viaje
   * @param {String} idConductor - ID del conductor asignado
   * @param {String} idOferta - ID de la oferta aceptada
   */
  async asignarViajeAConductor(idSolicitudViaje, idConductor, idOferta) {
    const ahora = new Date();

    // 1. Actualizar solicitud de viaje con conductor asignado
    const oferta = await Oferta.findById(idOferta);
    const solicitudViaje = await SolicitudViaje.findById(idSolicitudViaje);

    await SolicitudViaje.findByIdAndUpdate(idSolicitudViaje, {
      estado: 'asignado',
      id_conductor_asignado: idConductor,
      fecha_asignacion: ahora,
      precio_final_acordado: oferta.precio_ofrecido,
    });

    // 2. Marcar oferta como aceptada
    await Oferta.findByIdAndUpdate(idOferta, {
      estado: 'aceptada',
      fecha_respuesta: ahora,
    });

    // 3. Rechazar todas las otras ofertas
    await Oferta.updateMany(
      {
        id_solicitud_viaje: idSolicitudViaje,
        _id: { $ne: idOferta },
      },
      {
        estado: 'rechazada',
      }
    );

    // 4. Marcar conductor como no disponible
    await Usuario.findByIdAndUpdate(idConductor, {
      'informacion_conductor.esta_disponible': false,
    });

    // 5. Obtener información completa para notificaciones
    const conductor = await Usuario.findById(idConductor).populate('informacion_conductor');
    const pasajero = await Usuario.findById(solicitudViaje.id_pasajero);

    // 6. Notificar vía Socket.io
    if (io) {
      // Notificar al CONDUCTOR con información completa
      io.to(`usuario:${idConductor}`).emit('viaje:aceptado_por_pasajero', {
        idSolicitudViaje: idSolicitudViaje.toString(),
        idOferta: idOferta.toString(),
        pasajero: {
          id: pasajero._id.toString(),
          nombre: pasajero.nombre,
          correo: pasajero.correo,
          telefono: pasajero.telefono,
        },
        origen: {
          lat: solicitudViaje.origen_lat,
          lon: solicitudViaje.origen_lon,
          direccion: solicitudViaje.origen_direccion,
        },
        destino: {
          lat: solicitudViaje.destino_lat,
          lon: solicitudViaje.destino_lon,
          direccion: solicitudViaje.destino_direccion,
        },
        precioAcordado: oferta.precio_ofrecido,
        distancia: solicitudViaje.distancia_estimada_km,
        duracion: solicitudViaje.duracion_estimada_min,
        mensaje: '¡Tu oferta fue aceptada! Dirígete al punto de recogida',
        estado: 'asignado',
        timestamp: new Date(),
      });

      // Notificar al PASAJERO
      io.to(`usuario:${solicitudViaje.id_pasajero}`).emit('viaje:aceptado', {
        idSolicitudViaje: idSolicitudViaje.toString(),
        idOferta: idOferta.toString(),
        idConductor: idConductor.toString(),
        nombreConductor: conductor.nombre,
        correoConductor: conductor.correo,
        telefonoConductor: conductor.telefono,
        calificacionConductor: conductor.informacion_conductor?.calificacion || 5.0,
        totalViajesConductor: conductor.informacion_conductor?.total_viajes || 0,
        tipoVehiculo: conductor.informacion_conductor?.tipo_vehiculo,
        placaVehiculo: conductor.informacion_conductor?.placa_vehiculo,
        modeloVehiculo: conductor.informacion_conductor?.modelo_vehiculo,
        colorVehiculo: conductor.informacion_conductor?.color_vehiculo,
        precioAcordado: oferta.precio_ofrecido,
        direccionOrigen: solicitudViaje.origen_direccion,
        direccionDestino: solicitudViaje.destino_direccion,
        mensaje: '¡Conductor asignado! Está en camino',
        estado: 'asignado',
        timestamp: new Date(),
      });

      // Notificar a OTROS CONDUCTORES que la subasta cerró
      io.to('conductores').emit('viaje:asignado', {
        idSolicitudViaje: idSolicitudViaje.toString(),
        mensaje: 'Esta solicitud ya fue asignada a otro conductor',
        timestamp: new Date(),
      });
    }

    console.log(`✅ Viaje ${idSolicitudViaje} asignado a conductor ${idConductor}`);
  }

  /**
   * Manejar la respuesta del pasajero a una oferta (aceptar o rechazar)
   * @param {String} idPasajero - ID del pasajero
   * @param {String} idOferta - ID de la oferta
   * @param {String} accion - 'aceptar' o 'rechazar'
   * @param {Number} nuevoPrecio - Nuevo precio si es contraoferta (opcional)
   */
  async manejarContraoferta(idPasajero, idOferta, accion, nuevoPrecio = null) {
    const oferta = await Oferta.findById(idOferta).populate('id_solicitud_viaje');

    if (!oferta) throw new Error('Oferta no encontrada');

    const solicitudViaje = oferta.id_solicitud_viaje;

    // Validar que el pasajero sea el dueño del viaje
    if (solicitudViaje.id_pasajero.toString() !== idPasajero) {
      throw new Error('No autorizado');
    }

    // Validar que la oferta esté pendiente
    if (oferta.estado !== 'pendiente') {
      throw new Error('Esta oferta ya fue procesada');
    }

    // Validar que la solicitud siga activa
    if (solicitudViaje.estado !== 'subasta_activa') {
      throw new Error('Esta solicitud ya no está activa');
    }

    if (accion === 'aceptar') {
      // Aceptar oferta del conductor
      await this.asignarViajeAConductor(
        solicitudViaje._id.toString(),
        oferta.id_conductor.toString(),
        idOferta
      );
    } else if (accion === 'rechazar') {
      // Rechazar oferta
      await Oferta.findByIdAndUpdate(idOferta, {
        estado: 'rechazada',
        fecha_respuesta: new Date(),
      });

      if (io) {
        io.to(`usuario:${oferta.id_conductor}`).emit('oferta:rechazada', {
          idOferta,
          idSolicitudViaje: solicitudViaje._id.toString(),
          mensaje: 'El pasajero rechazó tu oferta',
        });
      }
    } else {
      throw new Error('Acción no válida. Use "aceptar" o "rechazar"');
    }
  }

  /**
   * Manejar el tiempo expirado de una subasta sin ofertas
   * @param {String} idSolicitudViaje - ID de la solicitud de viaje
   */
  async manejarTiempoExpirado(idSolicitudViaje) {
    const solicitudViaje = await SolicitudViaje.findById(idSolicitudViaje);

    if (!solicitudViaje || solicitudViaje.estado !== 'subasta_activa') {
      return; // Ya fue asignado o cancelado
    }

    // Verificar si hay ofertas pendientes
    const cantidadOfertas = await Oferta.countDocuments({
      id_solicitud_viaje: idSolicitudViaje,
      estado: 'pendiente',
    });

    if (cantidadOfertas === 0) {
      // No hay ofertas - expandir radio de búsqueda
      if (this.RADIO_NOTIFICACION_INICIAL_KM < this.RADIO_NOTIFICACION_MAXIMO_KM) {
        console.log(
          `⚠️ Expandiendo radio de búsqueda para viaje ${idSolicitudViaje}`
        );
        await this.notificarConductoresCercanos(
          solicitudViaje,
          this.RADIO_NOTIFICACION_INICIAL_KM + 5
        );

        // Extender timeout
        await SolicitudViaje.findByIdAndUpdate(idSolicitudViaje, {
          fecha_expiracion: new Date(Date.now() + 60000),
        });

        setTimeout(
          () => this.manejarTiempoExpirado(idSolicitudViaje),
          60000
        );
      } else {
        // Cancelar por falta de conductores
        await this.cancelarSolicitudViaje(idSolicitudViaje, 'no_hay_conductores_disponibles');
      }
    }
  }

  /**
   * Cancelar una solicitud de viaje
   * @param {String} idSolicitudViaje - ID de la solicitud de viaje
   * @param {String} razon - Razón de la cancelación
   */
  async cancelarSolicitudViaje(idSolicitudViaje, razon) {
    await SolicitudViaje.findByIdAndUpdate(idSolicitudViaje, {
      estado: 'cancelado',
    });

    const solicitudViaje = await SolicitudViaje.findById(idSolicitudViaje);

    if (io && solicitudViaje) {
      io.to(`usuario:${solicitudViaje.id_pasajero}`).emit('viaje:cancelado', {
        razon,
        mensaje:
          razon === 'no_hay_conductores_disponibles'
            ? 'No hay conductores disponibles en este momento'
            : 'Tu viaje ha sido cancelado',
      });
    }

    console.log(`❌ Viaje ${idSolicitudViaje} cancelado: ${razon}`);
  }

  /**
   * Actualizar el estado de un viaje
   * @param {String} idSolicitudViaje - ID de la solicitud de viaje
   * @param {String} nuevoEstado - Nuevo estado del viaje
   */
  async actualizarEstadoViaje(idSolicitudViaje, nuevoEstado) {
    await SolicitudViaje.findByIdAndUpdate(idSolicitudViaje, {
      estado: nuevoEstado,
    });
  }
}

export default new ServicioSubasta();

// Exportar también con nombre en inglés para compatibilidad temporal
export { ServicioSubasta as BiddingService };

