import RideRequest from '../models/SolicitudViaje.js';
import User from '../models/Usuario.js';

const TASA_COMISION = 0.15; // 15% comisión del sistema

/**
 * RF-015: Calcular y visualizar ganancias de un conductor
 */
export const obtenerGananciasConductor = async (req, res) => {
  try {
    const idConductor = req.user.id;
    const { period: periodo } = req.query; // 'day', 'week', 'month', 'year', 'custom'
    const { startDate: fechaInicio, endDate: fechaFin } = req.query;

    // Calcular rango de fechas según período
    let fechaInicioCalculada, fechaFinCalculada;
    const ahora = new Date();

    switch (periodo) {
      case 'day':
        fechaInicioCalculada = new Date(ahora.setHours(0, 0, 0, 0));
        fechaFinCalculada = new Date(ahora.setHours(23, 59, 59, 999));
        break;
      case 'week':
        fechaInicioCalculada = new Date(ahora);
        fechaInicioCalculada.setDate(ahora.getDate() - 7);
        fechaFinCalculada = ahora;
        break;
      case 'month':
        fechaInicioCalculada = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        fechaFinCalculada = ahora;
        break;
      case 'year':
        fechaInicioCalculada = new Date(ahora.getFullYear(), 0, 1);
        fechaFinCalculada = ahora;
        break;
      case 'custom':
        if (fechaInicio && fechaFin) {
          fechaInicioCalculada = new Date(fechaInicio);
          fechaFinCalculada = new Date(fechaFin);
        } else {
          return res.status(400).json({
            exito: false,
            error: 'startDate y endDate son requeridos para período personalizado',
          });
        }
        break;
      default:
        // Por defecto, último mes
        fechaInicioCalculada = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        fechaFinCalculada = ahora;
    }

    // Obtener viajes completados del conductor en el período
    const viajesCompletados = await RideRequest.find({
      id_conductor_asignado: idConductor,
      estado: 'completado',
      fecha_asignacion: {
        $gte: fechaInicioCalculada,
        $lte: fechaFinCalculada,
      },
    }).lean();

    // Calcular ganancias
    const gananciasBrutas = viajesCompletados.reduce(
      (suma, viaje) => suma + (viaje.precio_final_acordado || 0),
      0
    );
    const comision = gananciasBrutas * TASA_COMISION;
    const gananciasNetas = gananciasBrutas - comision;
    const numeroViajes = viajesCompletados.length;
    const promedioPorViaje = numeroViajes > 0 ? gananciasBrutas / numeroViajes : 0;

    res.json({
      exito: true,
      datos: {
        periodo: {
          inicio: fechaInicioCalculada,
          fin: fechaFinCalculada,
          tipo: periodo || 'month',
        },
        ganancias: {
          brutas: gananciasBrutas.toFixed(2),
          comision: comision.toFixed(2),
          netas: gananciasNetas.toFixed(2),
        },
        viajes: {
          total: numeroViajes,
          promedioPorViaje: promedioPorViaje.toFixed(2),
        },
        desglose: viajesCompletados.map((viaje) => ({
          id: viaje._id,
          fecha: viaje.fecha_asignacion,
          precio: viaje.precio_final_acordado,
          comision: (viaje.precio_final_acordado || 0) * TASA_COMISION,
          neto: (viaje.precio_final_acordado || 0) * (1 - TASA_COMISION),
        })),
      },
    });
  } catch (error) {
    console.error('❌ Error calculando ganancias del conductor:', error);
    res.status(500).json({
      exito: false,
      error: 'Error calculando ganancias',
    });
  }
};

/**
 * RF-016: Calcular y visualizar ganancias del sistema (admin)
 */
export const obtenerGananciasSistema = async (req, res) => {
  try {
    // Validar que sea administrador
    const tipoUsuario = req.user.tipoUsuario || req.user.userType;
    if (tipoUsuario !== 'administrador' && tipoUsuario !== 'admin') {
      return res.status(403).json({
        exito: false,
        error: 'Solo administradores pueden acceder a esta información',
      });
    }

    const { period: periodo } = req.query;
    const { startDate: fechaInicio, endDate: fechaFin } = req.query;

    // Calcular rango de fechas según período
    let fechaInicioCalculada, fechaFinCalculada;
    const ahora = new Date();

    switch (periodo) {
      case 'day':
        fechaInicioCalculada = new Date(ahora.setHours(0, 0, 0, 0));
        fechaFinCalculada = new Date(ahora.setHours(23, 59, 59, 999));
        break;
      case 'week':
        fechaInicioCalculada = new Date(ahora);
        fechaInicioCalculada.setDate(ahora.getDate() - 7);
        fechaFinCalculada = ahora;
        break;
      case 'month':
        fechaInicioCalculada = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        fechaFinCalculada = ahora;
        break;
      case 'year':
        fechaInicioCalculada = new Date(ahora.getFullYear(), 0, 1);
        fechaFinCalculada = ahora;
        break;
      case 'custom':
        if (fechaInicio && fechaFin) {
          fechaInicioCalculada = new Date(fechaInicio);
          fechaFinCalculada = new Date(fechaFin);
        } else {
          return res.status(400).json({
            exito: false,
            error: 'startDate y endDate son requeridos para período personalizado',
          });
        }
        break;
      default:
        // Por defecto, último mes
        fechaInicioCalculada = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        fechaFinCalculada = ahora;
    }

    // Obtener todos los viajes completados en el período
    const viajesCompletados = await RideRequest.find({
      estado: 'completado',
      fecha_asignacion: {
        $gte: fechaInicioCalculada,
        $lte: fechaFinCalculada,
      },
    })
      .populate('id_conductor_asignado', 'informacion_conductor')
      .lean();

    // Calcular ganancias totales del sistema
    const ingresosTotales = viajesCompletados.reduce(
      (suma, viaje) => suma + (viaje.precio_final_acordado || 0),
      0
    );
    const comisionTotal = ingresosTotales * TASA_COMISION;
    const numeroViajes = viajesCompletados.length;
    const promedioPorViaje = numeroViajes > 0 ? ingresosTotales / numeroViajes : 0;

    // Distribución por tipo de vehículo
    const distribucionPorVehiculo = viajesCompletados.reduce((acumulador, viaje) => {
      const tipoVehiculo = viaje.id_conductor_asignado?.informacion_conductor?.tipo_vehiculo || 'desconocido';
      if (!acumulador[tipoVehiculo]) {
        acumulador[tipoVehiculo] = { cantidad: 0, ingresos: 0 };
      }
      acumulador[tipoVehiculo].cantidad += 1;
      acumulador[tipoVehiculo].ingresos += viaje.precio_final_acordado || 0;
      return acumulador;
    }, {});

    // Tendencias (comparación con período anterior)
    const inicioPeriodoAnterior = new Date(fechaInicioCalculada);
    const finPeriodoAnterior = new Date(fechaInicioCalculada);
    const duracionPeriodo = fechaFinCalculada - fechaInicioCalculada;
    inicioPeriodoAnterior.setTime(inicioPeriodoAnterior.getTime() - duracionPeriodo);
    finPeriodoAnterior.setTime(fechaInicioCalculada.getTime() - 1);

    const viajesPeriodoAnterior = await RideRequest.find({
      estado: 'completado',
      fecha_asignacion: {
        $gte: inicioPeriodoAnterior,
        $lte: finPeriodoAnterior,
      },
    }).lean();

    const ingresosPeriodoAnterior = viajesPeriodoAnterior.reduce(
      (suma, viaje) => suma + (viaje.precio_final_acordado || 0),
      0
    );
    const cambioIngresos = ingresosPeriodoAnterior > 0
      ? ((ingresosTotales - ingresosPeriodoAnterior) / ingresosPeriodoAnterior) * 100
      : 0;

    res.json({
      exito: true,
      datos: {
        periodo: {
          inicio: fechaInicioCalculada,
          fin: fechaFinCalculada,
          tipo: periodo || 'month',
        },
        ganancias: {
          ingresosTotales: ingresosTotales.toFixed(2),
          comisionTotal: comisionTotal.toFixed(2),
          promedioPorViaje: promedioPorViaje.toFixed(2),
        },
        viajes: {
          total: numeroViajes,
          periodoAnterior: viajesPeriodoAnterior.length,
          cambio: viajesPeriodoAnterior.length > 0
            ? (((numeroViajes - viajesPeriodoAnterior.length) / viajesPeriodoAnterior.length) * 100).toFixed(2)
            : '0.00',
        },
        tendencias: {
          cambioIngresos: cambioIngresos.toFixed(2),
          ingresosPeriodoAnterior: ingresosPeriodoAnterior.toFixed(2),
        },
        distribucionPorVehiculo: Object.entries(distribucionPorVehiculo).map(([tipo, datos]) => ({
          tipoVehiculo: tipo,
          cantidad: datos.cantidad,
          ingresos: datos.ingresos.toFixed(2),
          porcentaje: numeroViajes > 0 ? ((datos.cantidad / numeroViajes) * 100).toFixed(2) : 0,
        })),
      },
    });
  } catch (error) {
    console.error('❌ Error calculando ganancias del sistema:', error);
    res.status(500).json({
      exito: false,
      error: 'Error calculando ganancias del sistema',
    });
  }
};

// Exportar también con los nombres anteriores para compatibilidad
export { obtenerGananciasConductor as getDriverEarnings };
export { obtenerGananciasSistema as getSystemEarnings };
