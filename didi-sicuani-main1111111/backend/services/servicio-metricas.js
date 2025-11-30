import SolicitudViaje from '../models/SolicitudViaje.js';
import Oferta from '../models/Oferta.js';
import Usuario from '../models/Usuario.js';

/**
 * Servicio de Métricas
 * Proporciona métricas del sistema en tiempo real
 */
class ServicioMetricas {
  /**
   * Obtener métricas del dashboard
   * @returns {Object} Métricas en tiempo real
   */
  async obtenerMetricasDashboard() {
    // Métricas en tiempo real
    const [
      totalViajes,
      viajesActivos,
      totalConductores,
      conductoresEnLinea,
      totalPasajeros,
      ingresos,
    ] = await Promise.all([
      SolicitudViaje.countDocuments(),
      SolicitudViaje.countDocuments({ estado: { $in: ['subasta_activa', 'asignado', 'en_progreso'] } }),
      Usuario.countDocuments({ tipo_usuario: 'conductor' }),
      Usuario.countDocuments({ tipo_usuario: 'conductor', 'informacion_conductor.esta_en_linea': true }),
      Usuario.countDocuments({ tipo_usuario: 'pasajero' }),
      this.calcularIngresos(),
    ]);

    return {
      totalViajes,
      viajesActivos,
      totalConductores,
      conductoresEnLinea,
      totalPasajeros,
      ingresos,
    };
  }

  /**
   * Obtener métricas de viajes por hora
   * @returns {Array} Array de objetos con hora y cantidad de viajes
   */
  async obtenerMetricasViajes() {
    // Viajes por hora (últimas 24 horas)
    const ahora = new Date();
    const horas = [];
    
    for (let i = 23; i >= 0; i--) {
      const inicioHora = new Date(ahora);
      inicioHora.setHours(ahora.getHours() - i, 0, 0, 0);
      const finHora = new Date(inicioHora);
      finHora.setHours(inicioHora.getHours() + 1);

      const cantidad = await SolicitudViaje.countDocuments({
        createdAt: {
          $gte: inicioHora,
          $lt: finHora,
        },
      });

      horas.push({
        hora: inicioHora.getHours(),
        viajes: cantidad,
      });
    }

    return horas;
  }

  /**
   * Obtener métricas de conductores
   * @returns {Array} Distribución por tipo de vehículo
   */
  async obtenerMetricasConductores() {
    // Distribución por tipo de vehículo
    const conductores = await Usuario.aggregate([
      {
        $match: { tipo_usuario: 'conductor' },
      },
      {
        $group: {
          _id: '$informacion_conductor.tipo_vehiculo',
          cantidad: { $sum: 1 },
        },
      },
    ]);

    return conductores.map((c) => ({
      tipo: c._id || 'desconocido',
      cantidad: c.cantidad,
    }));
  }

  /**
   * Obtener métricas de ingresos
   * @returns {Array} Ingresos diarios (últimos 7 días)
   */
  async obtenerMetricasIngresos() {
    // Ingresos diarios (últimos 7 días)
    const ahora = new Date();
    const dias = [];

    for (let i = 6; i >= 0; i--) {
      const inicioDia = new Date(ahora);
      inicioDia.setDate(ahora.getDate() - i);
      inicioDia.setHours(0, 0, 0, 0);
      const finDia = new Date(inicioDia);
      finDia.setHours(23, 59, 59, 999);

      const viajes = await SolicitudViaje.find({
        estado: 'completado',
        fecha_asignacion: {
          $gte: inicioDia,
          $lte: finDia,
        },
      });

      const ingresos = viajes.reduce((suma, viaje) => {
        const comision = (viaje.precio_final_acordado || 0) * 0.15; // 15% comisión
        return suma + comision;
      }, 0);

      dias.push({
        fecha: inicioDia.toISOString().split('T')[0],
        ingresos: ingresos.toFixed(2),
      });
    }

    return dias;
  }

  /**
   * Calcular ingresos totales
   * @returns {Number} Ingresos totales del sistema
   */
  async calcularIngresos() {
    // Calcular ingresos totales (comisión del 15%)
    const viajesCompletados = await SolicitudViaje.find({
      estado: 'completado',
    });

    const ingresosTotales = viajesCompletados.reduce((suma, viaje) => {
      const comision = (viaje.precio_final_acordado || 0) * 0.15;
      return suma + comision;
    }, 0);

    return ingresosTotales;
  }

  /**
   * Obtener métricas de subastas
   * @returns {Object} Métricas de subastas
   */
  async obtenerMetricasSubastas() {
    // Métricas de subastas
    const totalOfertas = await Oferta.countDocuments();
    const ofertasAceptadas = await Oferta.countDocuments({ estado: 'aceptada' });
    const contraofertas = await Oferta.countDocuments({ tipo_oferta: 'contraoferta' });

    const promedioOfertasPorViaje = await SolicitudViaje.aggregate([
      {
        $lookup: {
          from: 'ofertas',
          localField: '_id',
          foreignField: 'id_solicitud_viaje',
          as: 'ofertas',
        },
      },
      {
        $project: {
          cantidadOfertas: { $size: '$ofertas' },
        },
      },
      {
        $group: {
          _id: null,
          promedioOfertas: { $avg: '$cantidadOfertas' },
        },
      },
    ]);

    return {
      totalOfertas,
      ofertasAceptadas,
      contraofertas,
      tasaAceptacion: totalOfertas > 0 ? (ofertasAceptadas / totalOfertas) * 100 : 0,
      promedioOfertasPorViaje: promedioOfertasPorViaje[0]?.promedioOfertas || 0,
    };
  }
}

export default new ServicioMetricas();
