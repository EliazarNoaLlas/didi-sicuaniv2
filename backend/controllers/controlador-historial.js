import SolicitudViaje from '../models/SolicitudViaje.js';
import Oferta from '../models/Oferta.js';
import Usuario from '../models/Usuario.js';

/**
 * Controlador de Historial
 * Maneja las operaciones relacionadas con el historial de viajes
 */

/**
 * RF-013: Obtener historial de viajes de un cliente
 * @param {Object} req - Request con información del usuario
 * @param {Object} res - Response
 */
export const obtenerHistorialPasajero = async (req, res) => {
  try {
    const idPasajero = req.user?.id || req.usuario?.id;
    
    if (!idPasajero) {
      return res.status(401).json({
        exito: false,
        error: 'Usuario no autenticado',
      });
    }
    // Aceptar parámetros en español e inglés
    const estado = req.query.estado || req.query.status;
    const fechaInicio = req.query.fechaInicio || req.query.startDate;
    const fechaFin = req.query.fechaFin || req.query.endDate;
    const precioMinimo = req.query.precioMinimo || req.query.minPrice;
    const precioMaximo = req.query.precioMaximo || req.query.maxPrice;

    // Construir filtros
    const filtros = { id_pasajero: idPasajero };

    if (estado) {
      filtros.estado = estado;
    }

    if (fechaInicio || fechaFin) {
      filtros.createdAt = {};
      if (fechaInicio) {
        filtros.createdAt.$gte = new Date(fechaInicio);
      }
      if (fechaFin) {
        filtros.createdAt.$lte = new Date(fechaFin);
      }
    }

    // Obtener viajes (excluir eliminados)
    const viajes = await SolicitudViaje.find({
      ...filtros,
      fecha_eliminacion: null, // Excluir viajes eliminados
    })
      .populate('id_conductor_asignado', 'nombre correo telefono informacion_conductor')
      .sort({ createdAt: -1 })
      .lean();

    // Filtrar por rango de precios si se especifica
    let viajesFiltrados = viajes;
    if (precioMinimo || precioMaximo) {
      viajesFiltrados = viajes.filter((viaje) => {
        const precio = viaje.precio_final_acordado || viaje.precio_sugerido_soles || 0;
        if (precioMinimo && precio < parseFloat(precioMinimo)) return false;
        if (precioMaximo && precio > parseFloat(precioMaximo)) return false;
        return true;
      });
    }

    // Calcular estadísticas
    const totalViajes = viajesFiltrados.length;
    const viajesCompletados = viajesFiltrados.filter((v) => v.estado === 'completado').length;
    const totalGastado = viajesFiltrados
      .filter((v) => v.estado === 'completado')
      .reduce((suma, v) => suma + (v.precio_final_acordado || 0), 0);

    // Formatear respuesta
    const viajesFormateados = viajesFiltrados.map((viaje) => ({
      id: viaje._id,
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
      fecha: viaje.createdAt,
      estado: viaje.estado,
      precioAcordado: viaje.precio_final_acordado,
      precioSugerido: viaje.precio_sugerido_soles,
      distancia: viaje.distancia_estimada_km,
      duracion: viaje.duracion_estimada_min,
      conductor: viaje.id_conductor_asignado
        ? {
            id: viaje.id_conductor_asignado._id,
            nombre: viaje.id_conductor_asignado.nombre,
            correo: viaje.id_conductor_asignado.correo,
            telefono: viaje.id_conductor_asignado.telefono,
            calificacion: viaje.id_conductor_asignado.informacion_conductor?.calificacion,
            tipoVehiculo: viaje.id_conductor_asignado.informacion_conductor?.tipo_vehiculo,
          }
        : null,
    }));

    res.json({
      exito: true,
      datos: {
        viajes: viajesFormateados,
        estadisticas: {
          totalViajes,
          viajesCompletados,
          totalGastado: totalGastado.toFixed(2),
        },
      },
    });
  } catch (error) {
    console.error('Error obteniendo historial de pasajero:', error);
    res.status(500).json({
      exito: false,
      error: 'Error obteniendo historial de viajes',
    });
  }
};

/**
 * RF-014: Obtener historial de viajes de un conductor
 * @param {Object} req - Request con información del conductor
 * @param {Object} res - Response
 */
export const obtenerHistorialConductor = async (req, res) => {
  try {
    const idConductor = req.user?.id || req.usuario?.id;
    
    if (!idConductor) {
      return res.status(401).json({
        exito: false,
        error: 'Usuario no autenticado',
      });
    }
    // Aceptar parámetros en español e inglés
    const estado = req.query.estado || req.query.status;
    const fechaInicio = req.query.fechaInicio || req.query.startDate;
    const fechaFin = req.query.fechaFin || req.query.endDate;
    const precioMinimo = req.query.precioMinimo || req.query.minPrice;
    const precioMaximo = req.query.precioMaximo || req.query.maxPrice;
    
    // Mapear estados en inglés a español si es necesario
    const estadoMapeado = estado === 'completed' ? 'completado' :
                         estado === 'cancelled' ? 'cancelado' :
                         estado === 'matched' ? 'asignado' :
                         estado === 'in_progress' ? 'en_progreso' :
                         estado === 'driver_en_route' ? 'conductor_en_ruta' :
                         estado;

    // Obtener viajes asignados al conductor (excluir eliminados)
    const viajesAsignados = await SolicitudViaje.find({
      id_conductor_asignado: idConductor,
      fecha_eliminacion: null, // Excluir viajes eliminados
      ...(estadoMapeado && { estado: estadoMapeado }),
      ...(fechaInicio || fechaFin
        ? {
            createdAt: {
              ...(fechaInicio && { $gte: new Date(fechaInicio) }),
              ...(fechaFin && { $lte: new Date(fechaFin) }),
            },
          }
        : {}),
    })
      .populate('id_pasajero', 'nombre correo telefono')
      .sort({ createdAt: -1 })
      .lean();

    // Obtener todas las ofertas realizadas por el conductor (excluir de viajes eliminados)
    const ofertas = await Oferta.find({
      id_conductor: idConductor,
      fecha_eliminacion: null, // Excluir ofertas eliminadas
      ...(fechaInicio || fechaFin
        ? {
            createdAt: {
              ...(fechaInicio && { $gte: new Date(fechaInicio) }),
              ...(fechaFin && { $lte: new Date(fechaFin) }),
            },
          }
        : {}),
    })
      .populate({
        path: 'id_solicitud_viaje',
        match: { fecha_eliminacion: null }, // Solo incluir si el viaje no está eliminado
      })
      .sort({ createdAt: -1 })
      .lean();

    // Filtrar ofertas donde el id_solicitud_viaje es null (fue eliminado)
    const ofertasValidas = ofertas.filter((oferta) => oferta.id_solicitud_viaje !== null);

    // Combinar y formatear
    const todosLosViajes = [
      ...viajesAsignados.map((v) => ({ ...v, tipo: 'asignado' })),
      ...ofertasValidas.map((o) => ({ ...o.id_solicitud_viaje, oferta: o, tipo: 'oferta' })),
    ];

    // Filtrar por rango de precios
    let viajesFiltrados = todosLosViajes;
    if (precioMinimo || precioMaximo) {
      viajesFiltrados = todosLosViajes.filter((viaje) => {
        const precio = viaje.precio_final_acordado || viaje.oferta?.precio_ofrecido || viaje.precio_sugerido_soles || 0;
        if (precioMinimo && precio < parseFloat(precioMinimo)) return false;
        if (precioMaximo && precio > parseFloat(precioMaximo)) return false;
        return true;
      });
    }

    // Calcular estadísticas
    const viajesCompletados = viajesAsignados.filter((v) => v.estado === 'completado');
    const gananciasTotales = viajesCompletados.reduce(
      (suma, v) => suma + (v.precio_final_acordado || 0),
      0
    );
    const tasaComision = 0.15; // 15% comisión
    const gananciasNetas = gananciasTotales * (1 - tasaComision);
    const totalOfertas = ofertasValidas.length;
    const ofertasAceptadas = ofertasValidas.filter((o) => o.estado === 'aceptada').length;

    // Obtener calificación promedio del conductor
    const conductor = await Usuario.findById(idConductor);
    const calificacionPromedio = conductor?.informacion_conductor?.calificacion || 0;

    // Formatear respuesta
    const viajesFormateados = viajesFiltrados.map((viaje) => ({
      id: viaje._id,
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
      fecha: viaje.createdAt || viaje.created_at,
      estado: viaje.estado,
      precioAcordado: viaje.precio_final_acordado || viaje.oferta?.precio_ofrecido,
      precioSugerido: viaje.precio_sugerido_soles,
      distancia: viaje.distancia_estimada_km,
      duracion: viaje.duracion_estimada_min,
      tipo: viaje.tipo, // 'asignado' o 'oferta'
      estadoOferta: viaje.oferta?.estado,
      pasajero: viaje.id_pasajero
        ? {
            id: viaje.id_pasajero._id,
            nombre: viaje.id_pasajero.nombre,
            correo: viaje.id_pasajero.correo,
            telefono: viaje.id_pasajero.telefono,
          }
        : null,
    }));

    res.json({
      exito: true,
      datos: {
        viajes: viajesFormateados,
        estadisticas: {
          totalViajes: viajesAsignados.length,
          viajesCompletados: viajesCompletados.length,
          totalOfertas,
          ofertasAceptadas,
          tasaAceptacion: totalOfertas > 0 ? ((ofertasAceptadas / totalOfertas) * 100).toFixed(2) : 0,
          gananciasTotales: gananciasTotales.toFixed(2),
          gananciasNetas: gananciasNetas.toFixed(2),
          calificacionPromedio: calificacionPromedio.toFixed(2),
        },
      },
    });
  } catch (error) {
    console.error('Error obteniendo historial de conductor:', error);
    res.status(500).json({
      exito: false,
      error: 'Error obteniendo historial de viajes',
    });
  }
};

/**
 * Borrar historial del pasajero (soft delete)
 * @param {Object} req - Request con información del usuario
 * @param {Object} res - Response
 */
export const eliminarHistorialPasajero = async (req, res) => {
  try {
    const usuario = req.user || req.usuario;
    const idPasajero = usuario?.id;
    
    if (!idPasajero) {
      return res.status(401).json({
        exito: false,
        error: 'Usuario no autenticado',
      });
    }
    
    const { idsViajes, borrarTodo } = req.body;

    // Validar que sea pasajero
    const tipoUsuario = usuario.tipoUsuario || usuario.userType;
    if (tipoUsuario !== 'pasajero' && tipoUsuario !== 'passenger') {
      return res.status(403).json({
        exito: false,
        error: 'Solo los pasajeros pueden borrar su historial',
      });
    }

    let cantidadEliminados = 0;

    if (borrarTodo) {
      // Borrar todo el historial del pasajero
      const resultado = await SolicitudViaje.updateMany(
        {
          id_pasajero: idPasajero,
          fecha_eliminacion: null, // Solo los que no están eliminados
        },
        {
          fecha_eliminacion: new Date(),
          eliminado_por: idPasajero,
        }
      );
      cantidadEliminados = resultado.modifiedCount;
    } else if (idsViajes && Array.isArray(idsViajes) && idsViajes.length > 0) {
      // Borrar viajes específicos
      const resultado = await SolicitudViaje.updateMany(
        {
          _id: { $in: idsViajes },
          id_pasajero: idPasajero, // Validar que pertenezcan al pasajero
          fecha_eliminacion: null,
        },
        {
          fecha_eliminacion: new Date(),
          eliminado_por: idPasajero,
        }
      );
      cantidadEliminados = resultado.modifiedCount;
    } else {
      return res.status(400).json({
        exito: false,
        error: 'Debe especificar idsViajes o borrarTodo: true',
      });
    }

    res.json({
      exito: true,
      mensaje: `${cantidadEliminados} viaje(s) eliminado(s) del historial`,
      cantidadEliminados,
    });
  } catch (error) {
    console.error('Error borrando historial de pasajero:', error);
    res.status(500).json({
      exito: false,
      error: 'Error al borrar historial',
    });
  }
};

/**
 * Borrar historial del conductor (soft delete)
 * @param {Object} req - Request con información del conductor
 * @param {Object} res - Response
 */
export const eliminarHistorialConductor = async (req, res) => {
  try {
    const usuario = req.user || req.usuario;
    const idConductor = usuario?.id;
    
    if (!idConductor) {
      return res.status(401).json({
        exito: false,
        error: 'Usuario no autenticado',
      });
    }
    
    // Aceptar parámetros en español e inglés
    const idsViajes = req.body.idsViajes || req.body.rideIds;
    const borrarTodo = req.body.borrarTodo || req.body.deleteAll;
    const borrarOfertas = req.body.borrarOfertas || req.body.deleteBids;

    // Validar que sea conductor
    const tipoUsuario = usuario.tipoUsuario || usuario.userType;
    if (tipoUsuario !== 'conductor' && tipoUsuario !== 'driver') {
      return res.status(403).json({
        exito: false,
        error: 'Solo los conductores pueden borrar su historial',
      });
    }

    let cantidadViajesEliminados = 0;
    let cantidadOfertasEliminadas = 0;

    if (borrarTodo) {
      // Borrar todos los viajes asignados al conductor
      const resultadoViajes = await SolicitudViaje.updateMany(
        {
          id_conductor_asignado: idConductor,
          fecha_eliminacion: null,
        },
        {
          fecha_eliminacion: new Date(),
          eliminado_por: idConductor,
        }
      );
      cantidadViajesEliminados = resultadoViajes.modifiedCount;

      // Opcionalmente borrar también las ofertas
      if (borrarOfertas) {
        const resultadoOfertas = await Oferta.updateMany(
          {
            id_conductor: idConductor,
            fecha_eliminacion: null,
          },
          {
            fecha_eliminacion: new Date(),
          }
        );
        cantidadOfertasEliminadas = resultadoOfertas.modifiedCount;
      }
    } else if (idsViajes && Array.isArray(idsViajes) && idsViajes.length > 0) {
      // Borrar viajes específicos
      const resultadoViajes = await SolicitudViaje.updateMany(
        {
          _id: { $in: idsViajes },
          id_conductor_asignado: idConductor, // Validar que pertenezcan al conductor
          fecha_eliminacion: null,
        },
        {
          fecha_eliminacion: new Date(),
          eliminado_por: idConductor,
        }
      );
      cantidadViajesEliminados = resultadoViajes.modifiedCount;
    } else {
      return res.status(400).json({
        exito: false,
        error: 'Debe especificar idsViajes o borrarTodo: true',
      });
    }

    res.json({
      exito: true,
      mensaje: `${cantidadViajesEliminados} viaje(s) y ${cantidadOfertasEliminadas} oferta(s) eliminado(s) del historial`,
      cantidadViajesEliminados,
      cantidadOfertasEliminadas,
    });
  } catch (error) {
    console.error('Error borrando historial de conductor:', error);
    res.status(500).json({
      exito: false,
      error: 'Error al borrar historial',
    });
  }
};

// Exportar también con nombres en inglés para compatibilidad temporal
export const getPassengerHistory = obtenerHistorialPasajero;
export const getDriverHistory = obtenerHistorialConductor;
export const deletePassengerHistory = eliminarHistorialPasajero;
export const deleteDriverHistory = eliminarHistorialConductor;
export const borrarHistorialConductor = eliminarHistorialConductor; // Alias en español


