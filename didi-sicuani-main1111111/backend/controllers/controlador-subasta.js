import servicioPrecios from '../services/servicio-precios.js';
import { getRedisClient } from '../config/redis.js';
import SolicitudViaje from '../models/SolicitudViaje.js';
import Oferta from '../models/Oferta.js';
import { io } from '../server.js';

/**
 * Controlador de Subasta
 * Maneja la creación de solicitudes de viaje y el proceso de ofertas
 */

/**
 * Crear una nueva solicitud de viaje
 * RF-001: El cliente hace una solicitud de viaje
 * @param {Object} req - Request con datos del viaje (origen, destino, etc.)
 * @param {Object} res - Response
 */
export const crearSolicitudViaje = async (req, res) => {
  try {
    const {
      origen_lat,
      origen_lon,
      origen_direccion,
      destino_lat,
      destino_lon,
      destino_direccion,
      precio_ofrecido_pasajero,
      tipo_vehiculo,
      metodo_pago,
    } = req.body;

    const idPasajero = req.usuario.id;

    // Calcular precio sugerido usando el servicio de precios
    const precioSugerido = await servicioPrecios.calcularPrecioSugerido({
      origen_lat,
      origen_lon,
      destino_lat,
      destino_lon,
      tipo_vehiculo,
    });

    // Validar oferta del pasajero (si se proporciona)
    if (precio_ofrecido_pasajero) {
      const validacion = servicioPrecios.validarOfertaPasajero(
        precioSugerido,
        precio_ofrecido_pasajero
      );

      if (!validacion.esValido) {
        return res.status(400).json({
          exito: false,
          mensaje: 'El precio ofrecido está fuera del rango aceptable',
          validacion,
        });
      }
    }

    // Calcular métricas del viaje (distancia, duración)
    const metricasRuta = await servicioPrecios.obtenerMetricasRuta(
      origen_lat,
      origen_lon,
      destino_lat,
      destino_lon
    );

    // Crear solicitud de viaje (guardar en MongoDB)
    const datosSolicitudViaje = {
      id_pasajero: idPasajero,
      origen_lat,
      origen_lon,
      origen_direccion,
      destino_lat,
      destino_lon,
      destino_direccion,
      precio_sugerido_soles: precioSugerido,
      precio_ofrecido_pasajero,
      distancia_estimada_km: metricasRuta.distancia_km,
      duracion_estimada_min: metricasRuta.duracion_min,
      tipo_vehiculo: tipo_vehiculo || 'cualquiera',
      metodo_pago: metodo_pago || 'efectivo',
      estado: 'subasta_activa',
      fecha_expiracion: new Date(Date.now() + 120 * 1000), // 2 minutos
    };

    // Guardar en MongoDB
    const solicitudViaje = await SolicitudViaje.create(datosSolicitudViaje);

    // Guardar en Redis para acceso rápido (opcional, no crítico)
    try {
      const redis = getRedisClient();
      if (redis && redis.isOpen) {
        await redis.setEx(
          `solicitud_viaje:${solicitudViaje._id}`,
          120,
          JSON.stringify(solicitudViaje)
        );
      }
    } catch (errorRedis) {
      // Redis no es crítico, continuar sin cache
      console.warn('Cache Redis no disponible, continuando sin cache');
    }

    // Notificar a conductores cercanos vía Socket.io
    io.to('conductores').emit('viaje:nuevo', solicitudViaje);

    res.status(201).json({
      exito: true,
      datos: solicitudViaje,
    });
  } catch (error) {
    console.error('❌ Error creando solicitud de viaje:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error al crear solicitud de viaje',
    });
  }
};

/**
 * Enviar una oferta de precio por parte de un conductor
 * RF-003: Cada conductor puede ofrecer un precio
 * @param {Object} req - Request con datos de la oferta
 * @param {Object} res - Response
 */
export const enviarOferta = async (req, res) => {
  try {
    const { id_solicitud_viaje, tipo_oferta, precio_ofrecido } = req.body;
    const idConductor = req.usuario.id;

    // Validar que el usuario es conductor
    if (req.usuario.tipoUsuario !== 'conductor') {
      return res.status(403).json({
        exito: false,
        mensaje: 'Solo los conductores pueden enviar ofertas',
      });
    }

    // Guardar oferta en MongoDB
    const datosOferta = {
      id_solicitud_viaje,
      id_conductor: idConductor,
      tipo_oferta,
      precio_ofrecido: tipo_oferta === 'contraoferta' ? precio_ofrecido : null,
      estado: 'pendiente',
      fecha_creacion: new Date(),
      fecha_expiracion: new Date(Date.now() + 30 * 1000), // 30 segundos
    };

    const oferta = await Oferta.create(datosOferta);

    // Obtener solicitud de viaje para notificar al pasajero
    const solicitudViaje = await SolicitudViaje.findById(id_solicitud_viaje);
    if (solicitudViaje) {
      io.to(`usuario:${solicitudViaje.id_pasajero}`).emit('oferta:recibida', oferta);
    }

    res.status(201).json({
      exito: true,
      datos: oferta,
    });
  } catch (error) {
    console.error('❌ Error enviando oferta:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error al enviar oferta',
    });
  }
};

/**
 * Aceptar una oferta de un conductor
 * RF-005: El cliente recibe una notificación si su pedido fue aceptado
 * @param {Object} req - Request con ID de la oferta
 * @param {Object} res - Response
 */
export const aceptarOferta = async (req, res) => {
  try {
    const { idOferta } = req.params;
    const idPasajero = req.usuario.id;

    // TODO: Implementar lógica de aceptar oferta
    // - Validar que la oferta pertenece a un viaje del pasajero
    // - Actualizar estado del viaje a 'asignado'
    // - Notificar al conductor

    res.json({
      exito: true,
      mensaje: 'Oferta aceptada',
    });
  } catch (error) {
    console.error('❌ Error aceptando oferta:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error al aceptar oferta',
    });
  }
};

/**
 * Rechazar una oferta de un conductor
 * @param {Object} req - Request con ID de la oferta
 * @param {Object} res - Response
 */
export const rechazarOferta = async (req, res) => {
  try {
    const { idOferta } = req.params;

    // TODO: Implementar lógica de rechazar oferta

    res.json({
      exito: true,
      mensaje: 'Oferta rechazada',
    });
  } catch (error) {
    console.error('❌ Error rechazando oferta:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error al rechazar oferta',
    });
  }
};

/**
 * Obtener todas las ofertas de una solicitud de viaje
 * RF-004: El cliente debe ver todas las ofertas en tiempo real
 * @param {Object} req - Request con ID del viaje
 * @param {Object} res - Response
 */
export const obtenerOfertasPorViaje = async (req, res) => {
  try {
    const { idViaje } = req.params;

    // TODO: Obtener todos los ofertas de una solicitud de viaje

    res.json({
      exito: true,
      datos: [],
    });
  } catch (error) {
    console.error('❌ Error obteniendo ofertas:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error al obtener ofertas',
    });
  }
};

// Exportar también con nombres en inglés para compatibilidad temporal
export const createRideRequest = crearSolicitudViaje;
export const submitBid = enviarOferta;
export const acceptBid = aceptarOferta;
export const rejectBid = rechazarOferta;
export const getBidsForRide = obtenerOfertasPorViaje;


