/**
 * Utilidades geoespaciales usando solo cálculos matemáticos
 * Sin dependencia de PostgreSQL/PostGIS
 */

class GeospatialUtils {
  /**
   * Calcula la distancia entre dos puntos usando la fórmula de Haversine
   * @param {number} lat1 - Latitud del primer punto
   * @param {number} lon1 - Longitud del primer punto
   * @param {number} lat2 - Latitud del segundo punto
   * @param {number} lon2 - Longitud del segundo punto
   * @returns {number} Distancia en kilómetros
   */
  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convierte grados a radianes
   */
  toRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Calcula métricas de ruta (distancia y duración estimada)
   * @param {number} originLat - Latitud de origen
   * @param {number} originLon - Longitud de origen
   * @param {number} destLat - Latitud de destino
   * @param {number} destLon - Longitud de destino
   * @returns {Object} { distance_km, duration_min }
   */
  calculateRouteMetrics(originLat, originLon, destLat, destLon) {
    // Calcular distancia en línea recta (Haversine)
    const distance_km = this.haversineDistance(
      originLat,
      originLon,
      destLat,
      destLon
    );

    // Estimar duración basada en distancia
    // Velocidad promedio en ciudad: 30 km/h
    // Añadir factor de ruta (1.3x para rutas reales vs línea recta)
    const adjustedDistance = distance_km * 1.3; // Factor de ruta
    const averageSpeedKmh = 30; // km/h
    const duration_min = Math.ceil((adjustedDistance / averageSpeedKmh) * 60);

    return {
      distance_km: Math.round(distance_km * 100) / 100, // Redondear a 2 decimales
      duration_min: duration_min,
    };
  }

  /**
   * Verifica si un punto está dentro de un radio (en km)
   * @param {number} centerLat - Latitud del centro
   * @param {number} centerLon - Longitud del centro
   * @param {number} pointLat - Latitud del punto
   * @param {number} pointLon - Longitud del punto
   * @param {number} radiusKm - Radio en kilómetros
   * @returns {boolean}
   */
  isWithinRadius(centerLat, centerLon, pointLat, pointLon, radiusKm) {
    const distance = this.haversineDistance(
      centerLat,
      centerLon,
      pointLat,
      pointLon
    );
    return distance <= radiusKm;
  }

  /**
   * Calcula el bearing (dirección) entre dos puntos
   * @param {number} lat1 - Latitud del primer punto
   * @param {number} lon1 - Longitud del primer punto
   * @param {number} lat2 - Latitud del segundo punto
   * @param {number} lon2 - Longitud del segundo punto
   * @returns {number} Bearing en grados (0-360)
   */
  calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = this.toRadians(lon2 - lon1);
    const lat1Rad = this.toRadians(lat1);
    const lat2Rad = this.toRadians(lat2);

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    const bearing = Math.atan2(y, x);
    const bearingDegrees = ((bearing * 180) / Math.PI + 360) % 360;

    return bearingDegrees;
  }
}

export default new GeospatialUtils();

