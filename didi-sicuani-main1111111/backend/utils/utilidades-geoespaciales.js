/**
 * Utilidades Geoespaciales
 * Utilidades para cálculos geoespaciales usando solo cálculos matemáticos
 * Sin dependencia de PostgreSQL/PostGIS
 */

class UtilidadesGeoespaciales {
  /**
   * Calcula la distancia entre dos puntos usando la fórmula de Haversine
   * @param {number} lat1 - Latitud del primer punto
   * @param {number} lon1 - Longitud del primer punto
   * @param {number} lat2 - Latitud del segundo punto
   * @param {number} lon2 - Longitud del segundo punto
   * @returns {number} Distancia en kilómetros
   */
  calcularDistanciaHaversine(lat1, lon1, lat2, lon2) {
    const RADIO_TIERRA_KM = 6371; // Radio de la Tierra en km
    const dLat = this.convertirARadianes(lat2 - lat1);
    const dLon = this.convertirARadianes(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.convertirARadianes(lat1)) *
        Math.cos(this.convertirARadianes(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return RADIO_TIERRA_KM * c;
  }

  /**
   * Convierte grados a radianes
   * @param {number} grados - Grados a convertir
   * @returns {number} Radianes
   */
  convertirARadianes(grados) {
    return (grados * Math.PI) / 180;
  }

  /**
   * Calcula métricas de ruta (distancia y duración estimada)
   * @param {number} latOrigen - Latitud de origen
   * @param {number} lonOrigen - Longitud de origen
   * @param {number} latDestino - Latitud de destino
   * @param {number} lonDestino - Longitud de destino
   * @returns {Object} { distancia_km, duracion_min }
   */
  calcularMetricasRuta(latOrigen, lonOrigen, latDestino, lonDestino) {
    // Validar que las coordenadas sean números válidos
    if (isNaN(latOrigen) || isNaN(lonOrigen) || isNaN(latDestino) || isNaN(lonDestino)) {
      console.error('⚠️ Coordenadas inválidas en calcularMetricasRuta:', {
        latOrigen,
        lonOrigen,
        latDestino,
        lonDestino
      });
      return {
        distancia_km: 0.5,
        duracion_min: 5,
        distance_km: 0.5, // Compatibilidad
        duration_min: 5, // Compatibilidad
      };
    }

    // Calcular distancia en línea recta (Haversine)
    const distanciaKm = this.calcularDistanciaHaversine(
      latOrigen,
      lonOrigen,
      latDestino,
      lonDestino
    );

    // Validar que la distancia sea un número válido
    if (isNaN(distanciaKm) || !isFinite(distanciaKm)) {
      console.error('⚠️ Distancia calculada es inválida:', distanciaKm);
      return {
        distancia_km: 0.5,
        duracion_min: 5,
        distance_km: 0.5, // Compatibilidad
        duration_min: 5, // Compatibilidad
      };
    }

    // Asegurar distancia mínima
    const distanciaMinimaKm = 0.5;
    const distanciaFinal = Math.max(distanciaKm, distanciaMinimaKm);

    // Estimar duración basada en distancia
    // Velocidad promedio en ciudad: 30 km/h
    // Añadir factor de ruta (1.3x para rutas reales vs línea recta)
    const distanciaAjustada = distanciaFinal * 1.3; // Factor de ruta
    const velocidadPromedioKmh = 30; // km/h
    const duracionMin = Math.ceil((distanciaAjustada / velocidadPromedioKmh) * 60);

    // Validar que la duración sea un número válido
    const duracionFinal = isNaN(duracionMin) || !isFinite(duracionMin) ? 5 : duracionMin;

    return {
      distancia_km: Math.round(distanciaFinal * 100) / 100, // Redondear a 2 decimales
      duracion_min: duracionFinal,
      distance_km: Math.round(distanciaFinal * 100) / 100, // Compatibilidad con inglés
      duration_min: duracionFinal, // Compatibilidad con inglés
    };
  }

  /**
   * Verifica si un punto está dentro de un radio (en km)
   * @param {number} latCentro - Latitud del centro
   * @param {number} lonCentro - Longitud del centro
   * @param {number} latPunto - Latitud del punto
   * @param {number} lonPunto - Longitud del punto
   * @param {number} radioKm - Radio en kilómetros
   * @returns {boolean} True si el punto está dentro del radio
   */
  estaDentroDelRadio(latCentro, lonCentro, latPunto, lonPunto, radioKm) {
    const distancia = this.calcularDistanciaHaversine(
      latCentro,
      lonCentro,
      latPunto,
      lonPunto
    );
    return distancia <= radioKm;
  }

  /**
   * Calcula el bearing (dirección) entre dos puntos
   * @param {number} lat1 - Latitud del primer punto
   * @param {number} lon1 - Longitud del primer punto
   * @param {number} lat2 - Latitud del segundo punto
   * @param {number} lon2 - Longitud del segundo punto
   * @returns {number} Bearing en grados (0-360)
   */
  calcularDireccion(lat1, lon1, lat2, lon2) {
    const dLon = this.convertirARadianes(lon2 - lon1);
    const lat1Rad = this.convertirARadianes(lat1);
    const lat2Rad = this.convertirARadianes(lat2);

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    const bearing = Math.atan2(y, x);
    const bearingGrados = ((bearing * 180) / Math.PI + 360) % 360;

    return bearingGrados;
  }
}

export default new UtilidadesGeoespaciales();
