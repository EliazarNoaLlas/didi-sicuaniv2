import utilidadesGeoespaciales from '../utils/utilidades-geoespaciales.js';
import Usuario from '../models/Usuario.js';
import SolicitudViaje from '../models/SolicitudViaje.js';

/**
 * Servicio de Precios
 * Calcula precios sugeridos para viajes basado en distancia, duración,
 * tipo de vehículo, hora del día, zona turística y demanda
 */
class ServicioPrecios {
  constructor() {
    // Tarifas base en soles peruanos
    this.TARIFA_BASE = 8.0; // Banderazo S/ 8
    this.TARIFA_POR_KM = 1.5; // S/ 3.5 por kilómetro
    this.TARIFA_POR_MIN = 0.6; // S/ 0.60 por minuto
    this.TARIFA_MINIMA = 5.0; // Tarifa mínima del viaje
    this.DISTANCIA_MINIMA_KM = 0.5; // Distancia mínima considerada

    // Factores multiplicadores para ajustar precios
    this.MULTIPLICADOR_HORA_PICO = 1.3; // 7-9am, 5-7pm
    this.MULTIPLICADOR_MADRUGADA = 2.5; // 11pm-5am

  }

  /**
   * Calcular precio sugerido para un viaje
   * @param {Object} solicitudViaje - Datos de la solicitud de viaje
   * @returns {Number} Precio sugerido en soles peruanos
   */
  async calcularPrecioSugerido(solicitudViaje) {
    const {
      origen_lat,
      origen_lon,
      destino_lat,
      destino_lon,
      tipo_vehiculo,
    } = solicitudViaje;

    // Calcular distancia y tiempo usando cálculos geoespaciales
    const metricasRuta = await this.obtenerMetricasRuta(
      origen_lat,
      origen_lon,
      destino_lat,
      destino_lon
    );

    // Precio base (obtenerMetricasRuta ya asegura valores mínimos)
    let precioBase =
      this.TARIFA_BASE +
      metricasRuta.distancia_km * this.TARIFA_POR_KM +
      metricasRuta.duracion_min * this.TARIFA_POR_MIN;

    // Aplicar ajustes por tipo de vehículo
 

    // Aplicar multiplicadores por hora del día
    const horaActual = new Date().getHours();
    if (this.esHoraPico(horaActual)) {
      precioBase *= this.MULTIPLICADOR_HORA_PICO;
    } else if (this.esMadrugada(horaActual)) {
      precioBase *= this.MULTIPLICADOR_MADRUGADA;
    }


    // Ajustar por demanda actual
    const ratioOfertaDemanda = await this.obtenerRatioOfertaDemanda(
      origen_lat,
      origen_lon
    );
    const multiplicadorDemanda = this.calcularMultiplicadorDemanda(ratioOfertaDemanda);
    precioBase *= multiplicadorDemanda;

    // Aplicar tarifa mínima
    const precioFinal = Math.max(precioBase, this.TARIFA_MINIMA);

    // Redondear a 0.50
    return Math.round(precioFinal * 2) / 2;
  }

  /**
   * Obtener métricas de ruta (distancia y duración)
   * @param {Number} latitudOrigen - Latitud del origen
   * @param {Number} longitudOrigen - Longitud del origen
   * @param {Number} latitudDestino - Latitud del destino
   * @param {Number} longitudDestino - Longitud del destino
   * @returns {Object} Objeto con distancia_km y duracion_min
   */
  async obtenerMetricasRuta(latitudOrigen, longitudOrigen, latitudDestino, longitudDestino) {
    // Validar que las coordenadas sean números válidos
    if (isNaN(latitudOrigen) || isNaN(longitudOrigen) || isNaN(latitudDestino) || isNaN(longitudDestino)) {
      console.error('⚠️ Coordenadas inválidas recibidas:', {
        latitudOrigen,
        longitudOrigen,
        latitudDestino,
        longitudDestino
      });
      // Retornar valores por defecto si las coordenadas son inválidas
      return {
        distancia_km: this.DISTANCIA_MINIMA_KM,
        duracion_min: 5, // 5 minutos por defecto
      };
    }

    // Usar cálculo geoespacial sin PostgreSQL
    const metricas = utilidadesGeoespaciales.calcularMetricasRuta(
      latitudOrigen,
      longitudOrigen,
      latitudDestino,
      longitudDestino
    );
    
    // Mapear campos de inglés a español y asegurar valores mínimos
    const distanciaKm = metricas.distancia_km || metricas.distance_km || this.DISTANCIA_MINIMA_KM;
    const duracionMin = metricas.duracion_min || metricas.duration_min || 3;
    
    // Validar que los valores sean números válidos
    const distanciaFinal = isNaN(distanciaKm) || !isFinite(distanciaKm) 
      ? this.DISTANCIA_MINIMA_KM 
      : Math.max(distanciaKm, this.DISTANCIA_MINIMA_KM);
    
    const duracionFinal = isNaN(duracionMin) || !isFinite(duracionMin) 
      ? 3 
      : Math.max(duracionMin, 3);
    
    return {
      distancia_km: distanciaFinal,
      duracion_min: duracionFinal,
    };
  }

  /**
   * Verificar si es hora pico
   * @param {Number} hora - Hora del día (0-23)
   * @returns {Boolean} True si es hora pico
   */
  esHoraPico(hora) {
    return (hora >= 7 && hora <= 9) || (hora >= 17 && hora <= 19);
  }

  /**
   * Verificar si es madrugada (horario nocturno)
   * @param {Number} hora - Hora del día (0-23)
   * @returns {Boolean} True si es madrugada
   */
  esMadrugada(hora) {
    return hora >= 23 || hora <= 5;
  }

  /**
   * Verificar si el origen está en una zona turística
   * @param {Number} latitud - Latitud del punto
   * @param {Number} longitud - Longitud del punto
   * @returns {Boolean} True si está en zona turística
   */
  async esZonaTuristica(latitud, longitud) {
    // Zonas turísticas de Sicuani
    const zonasTuristicas = [
      { nombre: 'Plaza Principal', lat: -14.2694, lon: -71.2256, radio_km: 0.5 },
      // Agregar más zonas según necesidad
    ];

    for (const zona of zonasTuristicas) {
      const distancia = utilidadesGeoespaciales.calcularDistanciaHaversine(latitud, longitud, zona.lat, zona.lon);
      if (distancia <= zona.radio_km) {
        return true;
      }
    }
    return false;
  }

  /**
   * Obtener ratio de oferta/demanda en un área
   * @param {Number} latitud - Latitud del punto
   * @param {Number} longitud - Longitud del punto
   * @returns {Number} Ratio de oferta/demanda (conductores disponibles / viajes pendientes)
   */
  async obtenerRatioOfertaDemanda(latitud, longitud) {
    // Radio de búsqueda: 5km
    const radioKm = 5;
    
    // Obtener conductores disponibles en MongoDB
    const conductores = await Usuario.find({
      tipo_usuario: 'conductor',
      'informacion_conductor.esta_en_linea': true,
      'informacion_conductor.esta_disponible': true,
      'informacion_conductor.latitud_actual': { $exists: true },
      'informacion_conductor.longitud_actual': { $exists: true },
    });

    // Filtrar conductores dentro del radio usando cálculo Haversine
    const conductoresCercanos = conductores.filter((conductor) => {
      const latConductor = conductor.informacion_conductor.latitud_actual;
      const lonConductor = conductor.informacion_conductor.longitud_actual;
      return utilidadesGeoespaciales.estaDentroDelRadio(
        latitud,
        longitud,
        latConductor,
        lonConductor,
        radioKm
      );
    });

    const oferta = conductoresCercanos.length;

    // Obtener viajes pendientes en MongoDB
    const viajesPendientes = await SolicitudViaje.find({
      estado: { $in: ['pendiente', 'subasta_activa'] },
      origen_lat: { $exists: true },
      origen_lon: { $exists: true },
    });

    // Filtrar viajes dentro del radio
    const viajesCercanos = viajesPendientes.filter((viaje) => {
      return utilidadesGeoespaciales.estaDentroDelRadio(
        latitud,
        longitud,
        viaje.origen_lat,
        viaje.origen_lon,
        radioKm
      );
    });

    const demanda = viajesCercanos.length;

    return demanda > 0 ? oferta / demanda : 2.0;
  }

  /**
   * Calcular multiplicador de demanda basado en ratio oferta/demanda
   * @param {Number} ratio - Ratio de oferta/demanda
   * @returns {Number} Multiplicador a aplicar al precio
   */
  calcularMultiplicadorDemanda(ratio) {
    if (ratio < 0.5) return 1.4; // Alta demanda, pocos conductores
    if (ratio < 0.8) return 1.2; // Demanda moderada
    if (ratio <= 1.2) return 1.0; // Equilibrio
    if (ratio <= 2.0) return 0.9; // Más oferta que demanda
    return 0.85; // Mucha oferta
  }


  /**
   * Validar oferta de precio del pasajero
   * @param {Number} precioSugerido - Precio sugerido por el sistema
   * @param {Number} precioOfrecido - Precio ofrecido por el pasajero
   * @returns {Object} Objeto con isValid, minAcceptable, maxAcceptable, percentageOfSuggested
   */
  validarOfertaPasajero(precioSugerido, precioOfrecido) {
    const minimoAceptable = precioSugerido * 0.5; // Mínimo 50% del sugerido
    const maximoAceptable = precioSugerido * 2.0; // Máximo 200% del sugerido

    return {
      esValido: precioOfrecido >= minimoAceptable && precioOfrecido <= maximoAceptable,
      minimoAceptable,
      maximoAceptable,
      porcentajeDelSugerido: (precioOfrecido / precioSugerido) * 100,
    };
  }
}

export default new ServicioPrecios();

// Exportar también con nombre en inglés para compatibilidad temporal
export { ServicioPrecios as PricingService };

