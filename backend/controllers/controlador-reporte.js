import RideRequest from '../models/SolicitudViaje.js';
import User from '../models/Usuario.js';
import Bid from '../models/Oferta.js';
import servicioMetricas from '../services/servicio-metricas.js';
import { obtenerGananciasSistema } from './controlador-ganancias.js';

/**
 * RF-017: Exportar reportes (admin)
 */
export const exportarReporte = async (req, res) => {
  try {
    // Validar que sea administrador
    const tipoUsuario = req.user.tipoUsuario || req.user.userType;
    if (tipoUsuario !== 'administrador' && tipoUsuario !== 'admin') {
      return res.status(403).json({
        exito: false,
        error: 'Solo administradores pueden exportar reportes',
      });
    }

    const { type: tipo, format: formato, startDate: fechaInicio, endDate: fechaFin, filters: filtros } = req.query;

    let datosReporte;

    switch (tipo) {
      case 'metrics':
        datosReporte = await generarReporteMetricas(fechaInicio, fechaFin);
        break;
      case 'users':
        datosReporte = await generarReporteUsuarios(filtros);
        break;
      case 'rides':
        datosReporte = await generarReporteViajes(fechaInicio, fechaFin, filtros);
        break;
      case 'earnings':
        datosReporte = await generarReporteGanancias(fechaInicio, fechaFin);
        break;
      default:
        return res.status(400).json({
          exito: false,
          error: 'Tipo de reporte no válido',
        });
    }

    // Formatear según el formato solicitado
    switch (formato) {
      case 'json':
        res.json({
          exito: true,
          datos: datosReporte,
        });
        break;
      case 'csv':
        const csv = convertirACSV(datosReporte);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=reporte-${tipo}-${Date.now()}.csv`);
        res.send(csv);
        break;
      case 'pdf':
        // TODO: Implementar generación de PDF
        res.status(501).json({
          exito: false,
          error: 'Exportación a PDF no implementada aún',
        });
        break;
      default:
        res.json({
          exito: true,
          datos: datosReporte,
        });
    }
  } catch (error) {
    console.error('❌ Error generando reporte:', error);
    res.status(500).json({
      exito: false,
      error: 'Error generando reporte',
    });
  }
};

async function generarReporteMetricas(fechaInicio, fechaFin) {
  const metricas = await servicioMetricas.obtenerMetricasDashboard();
  const metricasViajes = await servicioMetricas.obtenerMetricasViajes();
  const metricasConductores = await servicioMetricas.obtenerMetricasConductores();
  const metricasIngresos = await servicioMetricas.obtenerMetricasIngresos();
  const metricasSubastas = await servicioMetricas.obtenerMetricasSubastas();

  return {
    periodo: { fechaInicio, fechaFin },
    panel: metricas,
    viajes: metricasViajes,
    conductores: metricasConductores,
    ingresos: metricasIngresos,
    subastas: metricasSubastas,
  };
}

async function generarReporteUsuarios(filtros) {
  const objetoFiltros = filtros ? JSON.parse(filtros) : {};
  const usuarios = await User.find(objetoFiltros).select('-contrasena').lean();

  return {
    total: usuarios.length,
    usuarios: usuarios.map((usuario) => ({
      id: usuario._id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      telefono: usuario.telefono,
      tipoUsuario: usuario.tipo_usuario,
      estaActivo: usuario.esta_activo,
      fechaCreacion: usuario.createdAt,
    })),
  };
}

async function generarReporteViajes(fechaInicio, fechaFin, filtros) {
  const objetoFiltros = {
    ...(fechaInicio || fechaFin
      ? {
          createdAt: {
            ...(fechaInicio && { $gte: new Date(fechaInicio) }),
            ...(fechaFin && { $lte: new Date(fechaFin) }),
          },
        }
      : {}),
    ...(filtros ? JSON.parse(filtros) : {}),
  };

  const viajes = await RideRequest.find(objetoFiltros)
    .populate('id_pasajero', 'nombre correo')
    .populate('id_conductor_asignado', 'nombre correo')
    .lean();

  return {
    total: viajes.length,
    viajes: viajes.map((viaje) => ({
      id: viaje._id,
      pasajero: viaje.id_pasajero?.nombre || 'N/A',
      conductor: viaje.id_conductor_asignado?.nombre || 'N/A',
      origen: viaje.origen_direccion,
      destino: viaje.destino_direccion,
      estado: viaje.estado,
      precio: viaje.precio_final_acordado || viaje.precio_sugerido_soles,
      fechaCreacion: viaje.createdAt,
    })),
  };
}

async function generarReporteGanancias(fechaInicio, fechaFin) {
  // Usar la lógica de ganancias del sistema
  const req = {
    query: {
      period: fechaInicio && fechaFin ? 'custom' : 'month',
      startDate: fechaInicio,
      endDate: fechaFin,
    },
    user: { tipoUsuario: 'administrador' },
  };
  const res = {
    json: (datos) => datos,
    status: () => res,
  };

  // Simular respuesta para obtener datos
  let datosGanancias;
  try {
    datosGanancias = await new Promise((resolver, rechazar) => {
      const resMock = {
        json: (datos) => resolver(datos),
        status: () => resMock,
      };
      obtenerGananciasSistema(req, resMock).catch(rechazar);
    });
  } catch (error) {
    datosGanancias = { exito: false, error: error.message };
  }

  return datosGanancias;
}

function convertirACSV(datos) {
  if (!datos || typeof datos !== 'object') return '';

  // Si es un array, convertir cada objeto a CSV
  if (Array.isArray(datos)) {
    if (datos.length === 0) return '';
    const encabezados = Object.keys(datos[0]).join(',');
    const filas = datos.map((fila) => Object.values(fila).join(','));
    return [encabezados, ...filas].join('\n');
  }

  // Si es un objeto con arrays, convertir cada array
  const lineasCSV = [];
  for (const [clave, valor] of Object.entries(datos)) {
    if (Array.isArray(valor) && valor.length > 0) {
      lineasCSV.push(`\n${clave}:`);
      const encabezados = Object.keys(valor[0]).join(',');
      const filas = valor.map((fila) => Object.values(fila).join(','));
      lineasCSV.push(encabezados);
      lineasCSV.push(...filas);
    }
  }

  return lineasCSV.join('\n');
}

// Exportar también con el nombre anterior para compatibilidad
export { exportarReporte as exportReport };
