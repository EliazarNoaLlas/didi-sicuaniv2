import Mapbox from '@rnmapbox/maps';

// Configurar token de Mapbox (gratuito hasta 50K usuarios activos/mes)
// Obtener token en: https://account.mapbox.com/
Mapbox.setAccessToken('YOUR_MAPBOX_TOKEN');

// Configurar tiles offline para Sicuani
export const SICUANI_BOUNDS = {
  ne: [-71.1, -14.1],  // NorEste
  sw: [-71.3, -14.4],  // SurOeste
};

export const SICUANI_CENTER = {
  latitude: -14.2694,
  longitude: -71.2256
};

// Estilo de mapa personalizado (vectorial, más ligero)
export const MAP_STYLE = 'mapbox://styles/mapbox/streets-v11';

// Configuración de pack offline
export const OFFLINE_PACK_CONFIG = {
  name: 'sicuani-offline',
  styleURL: MAP_STYLE,
  bounds: SICUANI_BOUNDS,
  minZoom: 10,
  maxZoom: 18
};

// Configuración de API
export const API_URL = __DEV__ 
  ? 'http://localhost:5000/api'
  : 'https://api.didi-sicuani.com/api';

export const SOCKET_URL = __DEV__
  ? 'http://localhost:5000'
  : 'https://api.didi-sicuani.com';

