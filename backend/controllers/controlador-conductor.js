import SolicitudViaje from '../models/SolicitudViaje.js';
import Usuario from '../models/Usuario.js';
import Oferta from '../models/Oferta.js';
import utilidadesGeoespaciales from '../utils/utilidades-geoespaciales.js';
import servicioBloqueoConductor from '../services/servicio-bloqueo-conductor.js';

/**
 * Controlador de Conductor
 * Maneja las operaciones relacionadas con conductores
 */

/**
 * Obtener cola de viajes disponibles para el conductor
 * RF-002: Los conductores reciben esa solicitud en real
 * RF-009: Todos los conductores deben ver todas las solicitudes
 * @param {Object} req - Request con información del conductor
 * @param {Object} res - Response
 */
export const obtenerCola = async (req, res) => {
  try {
    const idConductor = req.usuario.id;
    const conductor = await Usuario.findById(idConductor);

    // El middleware authorize('conductor') ya verifica el tipoUsuario, pero verificamos que el usuario exista
    if (!conductor) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Usuario no encontrado',
      });
    }

    // Verificación adicional: asegurar que el tipoUsuario en la BD coincide con el token
    console.log('Controlador Conductor:', {
      id: idConductor,
      tipoUsuarioBD: conductor.tipo_usuario,
      tipoUsuarioToken: req.user.tipoUsuario || req.user.userType
    });

    if (conductor.tipo_usuario !== 'conductor' && conductor.tipo_usuario !== 'driver') {
      return res.status(403).json({
        exito: false,
        mensaje: `Tu cuenta no tiene permisos de conductor. Tienes: ${conductor.tipo_usuario}`,
      });
    }

    // RF-021: Búsqueda y filtrado de solicitudes
    const { origen, destino, precioMinimo, precioMaximo, fecha, tieneOfertas } = req.query;

    // Buscar TODAS las solicitudes activas (sin filtrar por tipo de vehículo)
    // Según RF-009: Todos los conductores deben ver todas las solicitudes
    // IMPORTANTE: No mostrar solicitudes ya asignadas a otros conductores
    const solicitudesActivas = await SolicitudViaje.find({
      estado: 'subasta_activa',
      fecha_expiracion: { $gt: new Date() }, // Solo solicitudes que no han expirado
      fecha_eliminacion: null, // Excluir viajes eliminados
      $or: [
        { id_conductor_asignado: { $exists: false } }, // Sin conductor asignado
        { id_conductor_asignado: null }, // Sin conductor asignado
        { id_conductor_asignado: idConductor }, // O asignado a este conductor
      ],
    }).populate('id_pasajero', 'nombre correo telefono');

    // Calcular distancias y preparar datos
    // Según RF-009: Todos los conductores ven todas las solicitudes (sin filtro por tipo de vehículo)
    const viajesConDatos = solicitudesActivas
      .map((viaje) => {
        // No filtrar por tipo de vehículo - todos los conductores ven todas las solicitudes

        // Calcular distancia si el conductor tiene ubicación
        let distancia_km = null;
        let tiempo_estimado_llegada_min = null;

        if (
          conductor.informacion_conductor?.latitud_actual &&
          conductor.informacion_conductor?.longitud_actual
        ) {
          distancia_km = utilidadesGeoespaciales.calcularDistanciaHaversine(
            viaje.origen_lat,
            viaje.origen_lon,
            conductor.informacion_conductor.latitud_actual,
            conductor.informacion_conductor.longitud_actual
          );

          // Calcular ETA (estimado basado en distancia)
          const velocidadPromedioKmh = 25; // Velocidad promedio en ciudad
          tiempo_estimado_llegada_min = Math.ceil((distancia_km / velocidadPromedioKmh) * 60);
        }

        // Validar que id_pasajero existe (puede ser null si el usuario fue eliminado)
        if (!viaje.id_pasajero) {
          console.warn(`⚠️ Viaje ${viaje._id} tiene id_pasajero null, omitiendo...`);
          return null; // Filtrar viajes sin pasajero
        }

        return {
          _id: viaje._id,
          viaje: viaje, // Guardar el objeto completo para verificación de bloqueo
          pasajero: {
            id: viaje.id_pasajero._id || viaje.id_pasajero,
            nombre: viaje.id_pasajero.nombre || 'Usuario eliminado',
            correo: viaje.id_pasajero.correo || 'N/A',
            telefono: viaje.id_pasajero.telefono || 'N/A',
          },
          origen: {
            lat: viaje.origen_lat,
            lon: viaje.origen_lon,
            direccion: viaje.origen_direccion,
          },
          destino: {
            lat: viaje.destino_lat,
            lon: viaje.destino_lon,
            direccion: viaje.destino_direccion,
          },
          precios: {
            precio_sugerido: viaje.precio_sugerido_soles,
          },
          viaje_info: {
            distancia_km: viaje.distancia_estimada_km,
            duracion_min: viaje.duracion_estimada_min,
          },
          tipo_vehiculo: viaje.tipo_vehiculo,
          metodo_pago: viaje.metodo_pago,
          distancia_desde_conductor_km: distancia_km
            ? Math.round(distancia_km * 100) / 100
            : null,
          tiempo_estimado_llegada_min: tiempo_estimado_llegada_min,
          fecha_expiracion: viaje.fecha_expiracion,
          fecha_creacion: viaje.createdAt,
        };
      })
      .filter((viaje) => viaje !== null);

    // Verificar bloqueos para cada viaje (operación asíncrona)
    const viajesDespuesBloqueo = await Promise.all(
      viajesConDatos.map(async (datosViaje) => {
        // Verificar si el viaje está bloqueado para este conductor
        const verificacionBloqueo = await servicioBloqueoConductor.estaViajeBloqueado(
          idConductor,
          datosViaje.viaje
        );

        if (verificacionBloqueo.bloqueado) {
          return null; // No mostrar viajes bloqueados
        }

        // Remover el objeto viaje completo antes de retornar
        const { viaje, ...informacionViaje } = datosViaje;
        return informacionViaje;
      })
    );

    // Filtrar nulos y ordenar
    const viajesDisponibles = viajesDespuesBloqueo
      .filter((viaje) => viaje !== null)
      .sort((a, b) => {
        // Ordenar por: 1) Distancia (más cercanos primero), 2) Tiempo de creación
        if (a.distancia_desde_conductor_km !== null && b.distancia_desde_conductor_km !== null) {
          return a.distancia_desde_conductor_km - b.distancia_desde_conductor_km;
        }
        if (a.distancia_desde_conductor_km !== null) return -1;
        if (b.distancia_desde_conductor_km !== null) return 1;
        return new Date(b.fecha_creacion) - new Date(a.fecha_creacion);
      });

    res.json({
      exito: true,
      datos: viajesDisponibles,
      cantidad: viajesDisponibles.length,
    });
  } catch (error) {
    console.error('Error obteniendo cola de viajes:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error obteniendo cola de viajes',
      error: error.message,
    });
  }
};

// Exportar también con nombre en inglés para compatibilidad temporal
export const getQueue = obtenerCola;


