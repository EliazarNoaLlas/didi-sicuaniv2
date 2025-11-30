import geospatialUtils from '../utils/geospatial.js';
import User from '../models/User.js';
import RideRequest from '../models/RideRequest.js';

class PricingService {
  constructor() {
    this.BASE_FARE = 5.0; // Banderazo S/ 5
    this.PER_KM_RATE = 2.5; // S/ 2.5 por km
    this.PER_MIN_RATE = 0.5; // S/ 0.50 por minuto
    this.MIN_FARE = 10.0; // Tarifa mínima

    // Factores multiplicadores
    this.PEAK_HOURS_MULTIPLIER = 1.3; // 7-9am, 5-7pm
    this.LATE_NIGHT_MULTIPLIER = 1.5; // 11pm-5am
    this.TOURIST_ZONE_MULTIPLIER = 1.2;
    this.MOTOTAXI_DISCOUNT = 0.7; // Mototaxis 30% más baratos
  }

  async calculateSuggestedPrice(rideRequest) {
    const {
      origin_lat,
      origin_lon,
      destination_lat,
      destination_lon,
      vehicle_type,
    } = rideRequest;

    // Calcular distancia y tiempo usando cálculos geoespaciales
    const routeMetrics = await this.getRouteMetrics(
      origin_lat,
      origin_lon,
      destination_lat,
      destination_lon
    );

    // Precio base
    let basePrice =
      this.BASE_FARE +
      routeMetrics.distance_km * this.PER_KM_RATE +
      routeMetrics.duration_min * this.PER_MIN_RATE;

    // Aplicar ajustes por tipo de vehículo
    if (vehicle_type === 'mototaxi') {
      basePrice *= this.MOTOTAXI_DISCOUNT;
    }

    // Aplicar multiplicadores por hora del día
    const currentHour = new Date().getHours();
    if (this.isPeakHour(currentHour)) {
      basePrice *= this.PEAK_HOURS_MULTIPLIER;
    } else if (this.isLateNight(currentHour)) {
      basePrice *= this.LATE_NIGHT_MULTIPLIER;
    }

    // Ajustar por zona turística
    if (await this.isTouristZone(origin_lat, origin_lon)) {
      basePrice *= this.TOURIST_ZONE_MULTIPLIER;
    }

    // Ajustar por demanda actual
    const supplyDemandRatio = await this.getSupplyDemandRatio(
      origin_lat,
      origin_lon
    );
    const demandMultiplier = this.calculateDemandMultiplier(supplyDemandRatio);
    basePrice *= demandMultiplier;

    // Aplicar tarifa mínima
    const finalPrice = Math.max(basePrice, this.MIN_FARE);

    // Redondear a 0.50
    return Math.round(finalPrice * 2) / 2;
  }

  async getRouteMetrics(originLat, originLon, destLat, destLon) {
    // Usar cálculo geoespacial sin PostgreSQL
    return geospatialUtils.calculateRouteMetrics(
      originLat,
      originLon,
      destLat,
      destLon
    );
  }

  isPeakHour(hour) {
    return (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
  }

  isLateNight(hour) {
    return hour >= 23 || hour <= 5;
  }

  async isTouristZone(lat, lon) {
    // Zonas turísticas de Sicuani
    const touristZones = [
      { name: 'Plaza Principal', lat: -14.2694, lon: -71.2256, radius_km: 0.5 },
      // Agregar más zonas según necesidad
    ];

    for (const zone of touristZones) {
      const distance = this.haversineDistance(lat, lon, zone.lat, zone.lon);
      if (distance <= zone.radius_km) {
        return true;
      }
    }
    return false;
  }

  async getSupplyDemandRatio(lat, lon) {
    // Radio de búsqueda: 5km
    const radiusKm = 5;
    
    // Obtener conductores disponibles en MongoDB
    const drivers = await User.find({
      userType: 'driver',
      'driverInfo.isOnline': true,
      'driverInfo.isAvailable': true,
      'driverInfo.currentLatitude': { $exists: true },
      'driverInfo.currentLongitude': { $exists: true },
    });

    // Filtrar conductores dentro del radio usando cálculo Haversine
    const nearbyDrivers = drivers.filter((driver) => {
      const driverLat = driver.driverInfo.currentLatitude;
      const driverLon = driver.driverInfo.currentLongitude;
      return geospatialUtils.isWithinRadius(
        lat,
        lon,
        driverLat,
        driverLon,
        radiusKm
      );
    });

    const supply = nearbyDrivers.length;

    // Obtener viajes pendientes en MongoDB
    const pendingRides = await RideRequest.find({
      status: { $in: ['pending', 'bidding_active'] },
      origin_lat: { $exists: true },
      origin_lon: { $exists: true },
    });

    // Filtrar viajes dentro del radio
    const nearbyRides = pendingRides.filter((ride) => {
      return geospatialUtils.isWithinRadius(
        lat,
        lon,
        ride.origin_lat,
        ride.origin_lon,
        radiusKm
      );
    });

    const demand = nearbyRides.length;

    return demand > 0 ? supply / demand : 2.0;
  }

  calculateDemandMultiplier(ratio) {
    if (ratio < 0.5) return 1.4;
    if (ratio < 0.8) return 1.2;
    if (ratio <= 1.2) return 1.0;
    if (ratio <= 2.0) return 0.9;
    return 0.85;
  }

  haversineDistance(lat1, lon1, lat2, lon2) {
    // Usar utilidad geoespacial
    return geospatialUtils.haversineDistance(lat1, lon1, lat2, lon2);
  }

  validatePassengerOffer(suggestedPrice, offeredPrice) {
    const minAcceptable = suggestedPrice * 0.5; // Mínimo 50% del sugerido
    const maxAcceptable = suggestedPrice * 2.0; // Máximo 200% del sugerido

    return {
      isValid: offeredPrice >= minAcceptable && offeredPrice <= maxAcceptable,
      minAcceptable,
      maxAcceptable,
      percentageOfSuggested: (offeredPrice / suggestedPrice) * 100,
    };
  }
}

export default new PricingService();

