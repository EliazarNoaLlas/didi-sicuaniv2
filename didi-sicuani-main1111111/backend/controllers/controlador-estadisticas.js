import RideRequest from '../models/SolicitudViaje.js';
import Bid from '../models/Oferta.js';
import User from '../models/Usuario.js';

/**
 * RF-022: Estadísticas personales del conductor
 */
export const obtenerEstadisticasConductor = async (req, res) => {
  try {
    const idConductor = req.user.id;

    // Obtener viajes completados
    const viajesCompletados = await RideRequest.find({
      id_conductor_asignado: idConductor,
      estado: 'completado',
    }).lean();

    // Obtener todas las ofertas realizadas
    const todasLasOfertas = await Bid.find({ id_conductor: idConductor }).lean();
    const ofertasAceptadas = todasLasOfertas.filter((o) => o.estado === 'aceptada');
    const tasaAceptacion = todasLasOfertas.length > 0 ? (ofertasAceptadas.length / todasLasOfertas.length) * 100 : 0;

    // Obtener información del conductor
    const conductor = await User.findById(idConductor);
    const calificacionPromedio = conductor?.informacion_conductor?.calificacion || 0;
    const gananciasTotales = viajesCompletados.reduce(
      (suma, v) => suma + (v.precio_final_acordado || 0),
      0
    );
    const gananciasMensuales = viajesCompletados
      .filter((v) => {
        const fechaViaje = new Date(v.fecha_asignacion || v.createdAt);
        const ahora = new Date();
        return (
          fechaViaje.getMonth() === ahora.getMonth() &&
          fechaViaje.getFullYear() === ahora.getFullYear()
        );
      })
      .reduce((suma, v) => suma + (v.precio_final_acordado || 0), 0);

    // Calcular promedios
    const viajesEsteMes = viajesCompletados.filter((v) => {
      const fechaViaje = new Date(v.fecha_asignacion || v.createdAt);
      const ahora = new Date();
      return (
        fechaViaje.getMonth() === ahora.getMonth() &&
        fechaViaje.getFullYear() === ahora.getFullYear()
      );
    }).length;

    const viajesEstaSemana = viajesCompletados.filter((v) => {
      const fechaViaje = new Date(v.fecha_asignacion || v.createdAt);
      const ahora = new Date();
      const haceUnaSemana = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
      return fechaViaje >= haceUnaSemana;
    }).length;

    const viajesEsteDia = viajesCompletados.filter((v) => {
      const fechaViaje = new Date(v.fecha_asignacion || v.createdAt);
      const ahora = new Date();
      return (
        fechaViaje.getDate() === ahora.getDate() &&
        fechaViaje.getMonth() === ahora.getMonth() &&
        fechaViaje.getFullYear() === ahora.getFullYear()
      );
    }).length;

    // Calcular tiempo promedio de respuesta
    const ofertasConTiempoRespuesta = todasLasOfertas
      .filter((o) => o.createdAt)
      .map((o) => {
        const tiempoOferta = new Date(o.createdAt);
        const viaje = viajesCompletados.find(
          (v) => v._id.toString() === o.id_solicitud_viaje.toString()
        );
        if (viaje && viaje.createdAt) {
          const tiempoSolicitud = new Date(viaje.createdAt);
          return (tiempoOferta - tiempoSolicitud) / 1000; // en segundos
        }
        return null;
      })
      .filter((t) => t !== null);

    const tiempoPromedioRespuesta =
      ofertasConTiempoRespuesta.length > 0
        ? ofertasConTiempoRespuesta.reduce((suma, t) => suma + t, 0) / ofertasConTiempoRespuesta.length
        : 0;

    res.json({
      exito: true,
      datos: {
        totalViajes: viajesCompletados.length,
        totalOfertas: todasLasOfertas.length,
        ofertasAceptadas: ofertasAceptadas.length,
        tasaAceptacion: tasaAceptacion.toFixed(2),
        calificacionPromedio: calificacionPromedio.toFixed(2),
        gananciasTotales: gananciasTotales.toFixed(2),
        gananciasMensuales: gananciasMensuales.toFixed(2),
        promedioPorViaje: viajesCompletados.length > 0 ? (gananciasTotales / viajesCompletados.length).toFixed(2) : 0,
        viajesPorDia: viajesEsteDia,
        viajesPorSemana: viajesEstaSemana,
        viajesPorMes: viajesEsteMes,
        tiempoPromedioRespuestaSegundos: Math.round(tiempoPromedioRespuesta),
      },
    });
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas del conductor:', error);
    res.status(500).json({
      exito: false,
      error: 'Error obteniendo estadísticas',
    });
  }
};

/**
 * RF-023: Estadísticas personales del cliente
 */
export const obtenerEstadisticasPasajero = async (req, res) => {
  try {
    const idPasajero = req.user.id;

    // Obtener todos los viajes del cliente
    const todosLosViajes = await RideRequest.find({ id_pasajero: idPasajero }).lean();
    const viajesCompletados = todosLosViajes.filter((v) => v.estado === 'completado');

    // Calcular gastos
    const totalGastado = viajesCompletados.reduce(
      (suma, v) => suma + (v.precio_final_acordado || 0),
      0
    );

    const gastosMensuales = viajesCompletados
      .filter((v) => {
        const fechaViaje = new Date(v.fecha_asignacion || v.createdAt);
        const ahora = new Date();
        return (
          fechaViaje.getMonth() === ahora.getMonth() &&
          fechaViaje.getFullYear() === ahora.getFullYear()
        );
      })
      .reduce((suma, v) => suma + (v.precio_final_acordado || 0), 0);

    // Calcular tiempo promedio de espera para asignación
    const viajesConTiempoEspera = viajesCompletados
      .filter((v) => v.fecha_asignacion && v.createdAt)
      .map((v) => {
        const tiempoSolicitud = new Date(v.createdAt);
        const tiempoAsignacion = new Date(v.fecha_asignacion);
        return (tiempoAsignacion - tiempoSolicitud) / 1000; // en segundos
      });

    const tiempoPromedioEspera =
      viajesConTiempoEspera.length > 0
        ? viajesConTiempoEspera.reduce((suma, t) => suma + t, 0) / viajesConTiempoEspera.length
        : 0;

    // Obtener calificación promedio recibida (si existe)
    // TODO: Implementar cuando se agregue calificación para clientes

    res.json({
      exito: true,
      datos: {
        totalViajes: todosLosViajes.length,
        viajesCompletados: viajesCompletados.length,
        totalGastado: totalGastado.toFixed(2),
        gastosMensuales: gastosMensuales.toFixed(2),
        tiempoPromedioEsperaSegundos: Math.round(tiempoPromedioEspera),
        tiempoPromedioEsperaMinutos: Math.round(tiempoPromedioEspera / 60),
      },
    });
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas del cliente:', error);
    res.status(500).json({
      exito: false,
      error: 'Error obteniendo estadísticas',
    });
  }
};

// Exportar también con los nombres anteriores para compatibilidad
export { obtenerEstadisticasConductor as getDriverStats };
export { obtenerEstadisticasPasajero as getPassengerStats };
