# Metodología Profesional: Sistema de Geolocalización Basado en Base de Datos
## Plataforma Eber-Ride - Cusco, Perú

---

## RESUMEN EJECUTIVO

Esta metodología propone reemplazar el sistema de GPS en tiempo real por una **base de datos de geolocalización** que almacena direcciones, rutas predefinidas y puntos de referencia. El sistema utiliza **algoritmos de asignación inteligente** que consideran proximidad, calificación del conductor y tipo de vehículo, permitiendo a los clientes proponer precios y verificar cuál opción les conviene mejor.

**Inspiración en la industria:** Basado en metodologías de Uber, DiDi, y sistemas de ruteo como GraphHopper y OpenRouteService.

---

## 1. ARQUITECTURA DEL SISTEMA DE GEOLOCALIZACIÓN

### 1.1 Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                      │
│  (Frontend - Angular/React Native)                          │
│  - Selección de origen/destino                              │
│  - Visualización de rutas                                   │
│  - Propuesta de precio del cliente                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    API GATEWAY                              │
│  - Autenticación                                            │
│  - Rate Limiting                                            │
│  - Routing de requests                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              MICROSERVICIOS                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Geocoding    │  │ Route        │  │ Driver       │     │
│  │ Service      │  │ Calculation  │  │ Matching     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Pricing      │  │ Offer        │  │ Notification │     │
│  │ Engine       │  │ Validation   │  │ Service      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              BASE DE DATOS                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ PostgreSQL   │  │ Redis Cache  │  │ MongoDB      │     │
│  │ + PostGIS    │  │ (Sessions)   │  │ (Users/      │     │
│  │ (Geospatial) │  │              │  │  Rides)       │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Stack Tecnológico Recomendado

**Base de Datos Geográfica:**
- **PostgreSQL 14+ con extensión PostGIS 3.3+**
  - Almacenamiento de geometrías (puntos, líneas, polígonos)
  - Índices espaciales (GIST) para búsquedas rápidas
  - Funciones geoespaciales nativas

**Cache y Sesiones:**
- **Redis 7+**
  - Cache de rutas calculadas
  - Cache de direcciones geocodificadas
  - Sesiones de usuarios activos
  - Cola de solicitudes de viaje

**Base de Datos Principal:**
- **MongoDB** (actual) o **PostgreSQL** (recomendado para consistencia)
  - Usuarios, conductores, viajes
  - Historial y transacciones

**Lenguaje y Framework:**
- **Node.js + Express/NestJS**
- **TypeScript** (recomendado para type safety)

---

## 2. CONSTRUCCIÓN DE LA BASE DE DATOS DE GEOLOCALIZACIÓN

### 2.1 Estructura de Datos Geográficos

#### 2.1.1 Tabla: `addresses` (Direcciones y Puntos de Referencia)

```sql
CREATE TABLE addresses (
    id SERIAL PRIMARY KEY,
    address_text VARCHAR(500) NOT NULL,
    normalized_address VARCHAR(500) NOT NULL, -- Para búsqueda
    location GEOMETRY(POINT, 4326) NOT NULL, -- Coordenadas WGS84
    city_id INTEGER REFERENCES cities(id),
    district VARCHAR(100),
    zone VARCHAR(50), -- Zona de Cusco (Centro, San Blas, etc.)
    address_type VARCHAR(20), -- 'street', 'landmark', 'intersection', 'poi'
    popularity_score INTEGER DEFAULT 0, -- Frecuencia de uso
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices espaciales para búsquedas rápidas
CREATE INDEX idx_addresses_location ON addresses USING GIST(location);
CREATE INDEX idx_addresses_normalized ON addresses USING GIN(to_tsvector('spanish', normalized_address));
CREATE INDEX idx_addresses_city ON addresses(city_id);
```

#### 2.1.2 Tabla: `road_network` (Red Vial - Calles y Avenidas)

```sql
CREATE TABLE road_network (
    id SERIAL PRIMARY KEY,
    road_name VARCHAR(200) NOT NULL,
    road_type VARCHAR(20), -- 'avenue', 'street', 'highway', 'path'
    geometry GEOMETRY(LINESTRING, 4326) NOT NULL,
    length_meters NUMERIC(10,2), -- Longitud calculada
    max_speed_kmh INTEGER DEFAULT 40, -- Velocidad máxima
    one_way BOOLEAN DEFAULT FALSE,
    city_id INTEGER REFERENCES cities(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_road_network_geometry ON road_network USING GIST(geometry);
```

#### 2.1.3 Tabla: `route_segments` (Segmentos de Ruta Precalculados)

```sql
CREATE TABLE route_segments (
    id SERIAL PRIMARY KEY,
    from_address_id INTEGER REFERENCES addresses(id),
    to_address_id INTEGER REFERENCES addresses(id),
    route_geometry GEOMETRY(LINESTRING, 4326) NOT NULL,
    distance_meters NUMERIC(10,2) NOT NULL,
    estimated_time_seconds INTEGER NOT NULL,
    base_price_soles NUMERIC(8,2) NOT NULL,
    route_type VARCHAR(20), -- 'direct', 'via_highway', 'scenic'
    popularity INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW(),
    UNIQUE(from_address_id, to_address_id, route_type)
);

CREATE INDEX idx_route_segments_from ON route_segments(from_address_id);
CREATE INDEX idx_route_segments_to ON route_segments(to_address_id);
CREATE INDEX idx_route_segments_geometry ON route_segments USING GIST(route_geometry);
```

#### 2.1.4 Tabla: `popular_routes` (Rutas Populares Predefinidas)

```sql
CREATE TABLE popular_routes (
    id SERIAL PRIMARY KEY,
    route_name VARCHAR(200) NOT NULL, -- "Aeropuerto - Plaza de Armas"
    from_address_id INTEGER REFERENCES addresses(id),
    to_address_id INTEGER REFERENCES addresses(id),
    route_geometry GEOMETRY(LINESTRING, 4326),
    distance_meters NUMERIC(10,2),
    avg_time_minutes INTEGER,
    base_price_taxi NUMERIC(8,2),
    base_price_mototaxi NUMERIC(8,2),
    request_count INTEGER DEFAULT 0,
    last_requested TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2.1.5 Tabla: `driver_locations` (Ubicaciones de Conductores - Sin GPS)

```sql
CREATE TABLE driver_locations (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(id),
    current_address_id INTEGER REFERENCES addresses(id), -- Última dirección conocida
    current_zone VARCHAR(50), -- Zona de Cusco
    status VARCHAR(20) DEFAULT 'available', -- 'available', 'busy', 'offline'
    last_known_location GEOMETRY(POINT, 4326),
    last_update TIMESTAMP DEFAULT NOW(),
    vehicle_type VARCHAR(20), -- 'taxi', 'mototaxi'
    rating NUMERIC(3,2) DEFAULT 5.0
);

CREATE INDEX idx_driver_locations_address ON driver_locations(current_address_id);
CREATE INDEX idx_driver_locations_status ON driver_locations(status, vehicle_type);
CREATE INDEX idx_driver_locations_location ON driver_locations USING GIST(last_known_location);
```

### 2.2 Proceso de Población de Datos

#### Fase 1: Recopilación de Datos Iniciales

**Fuentes de Datos:**
1. **OpenStreetMap (OSM)**
   - Exportar datos de Cusco usando Overpass API
   - Extraer calles, avenidas, puntos de interés
   - Script de importación a PostGIS

2. **Datos Municipales**
   - Registro de calles oficiales
   - Nomenclatura oficial
   - Zonas administrativas

3. **Mapeo Manual de Rutas Críticas**
   - Aeropuerto → Centro
   - Centro → Sacsayhuamán
   - Centro → Valle Sagrado
   - Rutas turísticas principales

4. **Puntos de Referencia (POIs)**
   - Hoteles, hostels
   - Restaurantes populares
   - Atracciones turísticas
   - Mercados principales

#### Fase 2: Scripts de Importación

```javascript
// Ejemplo: Importar datos de OpenStreetMap a PostGIS
const { Client } = require('pg');
const fs = require('fs');
const { parse } = require('osmtogeojson');

async function importOSMData(osmFilePath) {
    const client = new Client({
        host: 'localhost',
        database: 'eberride',
        user: 'postgres',
        password: 'password'
    });
    
    await client.connect();
    
    // Leer archivo OSM
    const osmData = fs.readFileSync(osmFilePath, 'utf8');
    const geojson = parse(osmData);
    
    // Insertar calles
    for (const feature of geojson.features) {
        if (feature.geometry.type === 'LineString') {
            const roadName = feature.properties.name || 'Sin nombre';
            const geom = `ST_GeomFromGeoJSON('${JSON.stringify(feature.geometry)}')`;
            
            await client.query(`
                INSERT INTO road_network (road_name, geometry, length_meters)
                VALUES ($1, ${geom}, ST_Length(${geom}::geography))
            `, [roadName]);
        }
    }
    
    await client.end();
}
```

---

## 3. SERVICIO DE GEOCODIFICACIÓN (Geocoding Service)

### 3.1 Geocodificación Directa (Address → Coordinates)

```javascript
// services/geocodingService.js
const { Client } = require('pg');
const similarity = require('string-similarity');

class GeocodingService {
    constructor() {
        this.db = new Client({
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });
        this.db.connect();
    }

    /**
     * Geocodifica una dirección a coordenadas
     * @param {string} address - Dirección en texto libre
     * @param {number} cityId - ID de la ciudad (Cusco)
     * @returns {Promise<Object>} { address_id, location: {lat, lng}, confidence }
     */
    async geocode(address, cityId = 1) {
        // 1. Normalizar dirección
        const normalized = this.normalizeAddress(address);
        
        // 2. Búsqueda exacta
        let result = await this.db.query(`
            SELECT id, address_text, location, 
                   ST_X(location::geometry) as lng,
                   ST_Y(location::geometry) as lat,
                   popularity_score
            FROM addresses
            WHERE city_id = $1 
            AND normalized_address = $2
            ORDER BY popularity_score DESC
            LIMIT 1
        `, [cityId, normalized]);
        
        if (result.rows.length > 0) {
            return {
                address_id: result.rows[0].id,
                location: {
                    lat: parseFloat(result.rows[0].lat),
                    lng: parseFloat(result.rows[0].lng)
                },
                confidence: 1.0,
                address_text: result.rows[0].address_text
            };
        }
        
        // 3. Búsqueda por similitud (fuzzy matching)
        const fuzzyResults = await this.db.query(`
            SELECT id, address_text, location,
                   ST_X(location::geometry) as lng,
                   ST_Y(location::geometry) as lat,
                   popularity_score,
                   similarity(normalized_address, $2) as sim_score
            FROM addresses
            WHERE city_id = $1
            AND similarity(normalized_address, $2) > 0.3
            ORDER BY sim_score DESC, popularity_score DESC
            LIMIT 5
        `, [cityId, normalized]);
        
        if (fuzzyResults.rows.length > 0) {
            const bestMatch = fuzzyResults.rows[0];
            return {
                address_id: bestMatch.id,
                location: {
                    lat: parseFloat(bestMatch.lat),
                    lng: parseFloat(bestMatch.lng)
                },
                confidence: parseFloat(bestMatch.sim_score),
                address_text: bestMatch.address_text,
                alternatives: fuzzyResults.rows.slice(1).map(r => ({
                    address_id: r.id,
                    address_text: r.address_text,
                    confidence: parseFloat(r.sim_score)
                }))
            };
        }
        
        // 4. Si no se encuentra, retornar null para creación manual
        return null;
    }

    /**
     * Normaliza una dirección para búsqueda
     */
    normalizeAddress(address) {
        return address
            .toLowerCase()
            .trim()
            .replace(/[.,]/g, '')
            .replace(/\s+/g, ' ')
            .replace(/calle|av|avenida|jr|jiron/gi, (match) => {
                const map = {
                    'calle': 'cal',
                    'avenida': 'av',
                    'av.': 'av',
                    'jiron': 'jr',
                    'jr.': 'jr'
                };
                return map[match.toLowerCase()] || match;
            });
    }

    /**
     * Geocodificación inversa (Coordinates → Address)
     */
    async reverseGeocode(lat, lng, radiusMeters = 50) {
        const result = await this.db.query(`
            SELECT id, address_text, 
                   ST_Distance(
                       location::geography,
                       ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
                   ) as distance_meters
            FROM addresses
            WHERE ST_DWithin(
                location::geography,
                ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
                $3
            )
            ORDER BY distance_meters ASC
            LIMIT 1
        `, [lat, lng, radiusMeters]);
        
        if (result.rows.length > 0) {
            return {
                address_id: result.rows[0].id,
                address_text: result.rows[0].address_text,
                distance_meters: parseFloat(result.rows[0].distance_meters)
            };
        }
        
        return null;
    }
}

module.exports = GeocodingService;
```

### 3.2 API Endpoints de Geocodificación

```javascript
// routes/geocoding.js
const express = require('express');
const router = express.Router();
const GeocodingService = require('../services/geocodingService');
const geocodingService = new GeocodingService();

/**
 * POST /api/geocoding/geocode
 * Geocodifica una dirección
 */
router.post('/geocode', async (req, res) => {
    try {
        const { address, city_id } = req.body;
        
        if (!address) {
            return res.status(400).json({
                error: 'Address is required'
            });
        }
        
        const result = await geocodingService.geocode(address, city_id);
        
        if (!result) {
            return res.status(404).json({
                error: 'Address not found',
                suggestion: 'Please provide more details or select from suggestions'
            });
        }
        
        res.json(result);
    } catch (error) {
        console.error('Geocoding error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/geocoding/reverse
 * Geocodificación inversa
 */
router.post('/reverse', async (req, res) => {
    try {
        const { lat, lng, radius } = req.body;
        
        if (!lat || !lng) {
            return res.status(400).json({
                error: 'Latitude and longitude are required'
            });
        }
        
        const result = await geocodingService.reverseGeocode(
            lat, 
            lng, 
            radius || 50
        );
        
        if (!result) {
            return res.status(404).json({
                error: 'No address found near this location'
            });
        }
        
        res.json(result);
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/geocoding/suggestions
 * Autocompletado de direcciones
 */
router.get('/suggestions', async (req, res) => {
    try {
        const { query, city_id, limit = 10 } = req.query;
        
        if (!query || query.length < 2) {
            return res.json([]);
        }
        
        const normalized = geocodingService.normalizeAddress(query);
        
        const result = await geocodingService.db.query(`
            SELECT id, address_text, 
                   popularity_score,
                   similarity(normalized_address, $1) as score
            FROM addresses
            WHERE city_id = $2
            AND normalized_address LIKE $3 || '%'
            ORDER BY score DESC, popularity_score DESC
            LIMIT $4
        `, [normalized, city_id || 1, normalized, limit]);
        
        res.json(result.rows.map(row => ({
            address_id: row.id,
            address_text: row.address_text,
            score: parseFloat(row.score)
        })));
    } catch (error) {
        console.error('Suggestions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
```

---

## 4. SERVICIO DE CÁLCULO DE RUTAS (Route Calculation Service)

### 4.1 Algoritmo de Ruteo Basado en Grafo

```javascript
// services/routeCalculationService.js
const { Client } = require('pg');
const Graph = require('graph-data-structure');

class RouteCalculationService {
    constructor() {
        this.db = new Client({
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });
        this.db.connect();
    }

    /**
     * Calcula la ruta entre dos direcciones
     * @param {number} fromAddressId - ID de dirección origen
     * @param {number} toAddressId - ID de dirección destino
     * @param {string} vehicleType - 'taxi' o 'mototaxi'
     * @returns {Promise<Object>} Ruta con distancia, tiempo y precio
     */
    async calculateRoute(fromAddressId, toAddressId, vehicleType = 'taxi') {
        // 1. Verificar si existe ruta precalculada
        const cachedRoute = await this.getCachedRoute(
            fromAddressId, 
            toAddressId, 
            vehicleType
        );
        
        if (cachedRoute) {
            return cachedRoute;
        }
        
        // 2. Obtener coordenadas de origen y destino
        const [fromCoords, toCoords] = await Promise.all([
            this.getAddressCoordinates(fromAddressId),
            this.getAddressCoordinates(toAddressId)
        ]);
        
        if (!fromCoords || !toCoords) {
            throw new Error('Invalid address IDs');
        }
        
        // 3. Calcular ruta usando algoritmo de Dijkstra en red vial
        const route = await this.calculateRouteDijkstra(
            fromCoords,
            toCoords,
            vehicleType
        );
        
        // 4. Calcular precio
        const pricing = await this.calculatePricing(
            route.distance_meters,
            route.estimated_time_seconds,
            vehicleType
        );
        
        // 5. Guardar ruta en cache
        await this.cacheRoute(
            fromAddressId,
            toAddressId,
            route,
            pricing,
            vehicleType
        );
        
        return {
            from_address_id: fromAddressId,
            to_address_id: toAddressId,
            route_geometry: route.geometry,
            distance_meters: route.distance_meters,
            estimated_time_seconds: route.estimated_time_seconds,
            estimated_time_minutes: Math.ceil(route.estimated_time_seconds / 60),
            base_price_soles: pricing.base_price,
            final_price_soles: pricing.final_price,
            vehicle_type: vehicleType,
            route_type: route.route_type
        };
    }

    /**
     * Algoritmo de Dijkstra para encontrar ruta más corta
     */
    async calculateRouteDijkstra(fromCoords, toCoords, vehicleType) {
        // Construir grafo de red vial
        const graph = await this.buildRoadGraph(fromCoords, toCoords, vehicleType);
        
        // Implementar Dijkstra
        const startNode = this.findNearestNode(fromCoords, graph.nodes);
        const endNode = this.findNearestNode(toCoords, graph.nodes);
        
        const path = this.dijkstra(graph, startNode, endNode);
        
        if (!path) {
            // Fallback: distancia euclidiana
            return this.calculateEuclideanRoute(fromCoords, toCoords);
        }
        
        // Construir geometría de ruta
        const routeGeometry = this.buildRouteGeometry(path, graph);
        const distance = this.calculatePathDistance(path, graph);
        const estimatedTime = this.estimateTravelTime(distance, vehicleType);
        
        return {
            geometry: routeGeometry,
            distance_meters: distance,
            estimated_time_seconds: estimatedTime,
            route_type: 'road_network'
        };
    }

    /**
     * Construye grafo de red vial desde PostGIS
     */
    async buildRoadGraph(fromCoords, toCoords, vehicleType) {
        // Obtener calles dentro de un radio razonable
        const bufferRadius = 5000; // 5km
        
        const roads = await this.db.query(`
            SELECT id, road_name, geometry, length_meters, max_speed_kmh
            FROM road_network
            WHERE ST_DWithin(
                geometry,
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                $5
            ) OR ST_DWithin(
                geometry,
                ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography,
                $5
            )
        `, [
            fromCoords.lng, fromCoords.lat,
            toCoords.lng, toCoords.lat,
            bufferRadius
        ]);
        
        // Construir grafo
        const graph = Graph();
        const nodes = new Map();
        const edges = [];
        
        for (const road of roads.rows) {
            const points = await this.extractPointsFromLineString(road.geometry);
            
            for (let i = 0; i < points.length - 1; i++) {
                const fromNode = `${road.id}_${i}`;
                const toNode = `${road.id}_${i + 1}`;
                
                const distance = this.calculateDistance(
                    points[i],
                    points[i + 1]
                );
                
                // Peso = distancia / velocidad (tiempo estimado)
                const speed = vehicleType === 'mototaxi' 
                    ? Math.min(road.max_speed_kmh, 40) 
                    : road.max_speed_kmh;
                const weight = distance / (speed / 3.6); // Convertir km/h a m/s
                
                graph.addEdge(fromNode, toNode, weight);
                nodes.set(fromNode, points[i]);
                nodes.set(toNode, points[i + 1]);
            }
        }
        
        return { graph, nodes, edges };
    }

    /**
     * Implementación de Dijkstra
     */
    dijkstra(graph, start, end) {
        const distances = new Map();
        const previous = new Map();
        const unvisited = new Set();
        
        // Inicializar distancias
        for (const node of graph.nodes()) {
            distances.set(node, Infinity);
            unvisited.add(node);
        }
        distances.set(start, 0);
        
        while (unvisited.size > 0) {
            // Nodo con menor distancia
            let current = null;
            let minDistance = Infinity;
            
            for (const node of unvisited) {
                if (distances.get(node) < minDistance) {
                    minDistance = distances.get(node);
                    current = node;
                }
            }
            
            if (current === null || current === end) {
                break;
            }
            
            unvisited.delete(current);
            
            // Actualizar distancias de vecinos
            const neighbors = graph.adjacent(current);
            for (const neighbor of neighbors) {
                const weight = graph.getEdgeWeight(current, neighbor);
                const alt = distances.get(current) + weight;
                
                if (alt < distances.get(neighbor)) {
                    distances.set(neighbor) = alt;
                    previous.set(neighbor, current);
                }
            }
        }
        
        // Reconstruir camino
        const path = [];
        let current = end;
        
        while (current !== undefined) {
            path.unshift(current);
            current = previous.get(current);
        }
        
        return path.length > 1 ? path : null;
    }

    /**
     * Fallback: Ruta euclidiana (línea recta)
     */
    calculateEuclideanRoute(fromCoords, toCoords) {
        const distance = this.calculateDistance(fromCoords, toCoords);
        const estimatedTime = Math.ceil(distance / 10); // Asumiendo 10 m/s promedio
        
        return {
            geometry: {
                type: 'LineString',
                coordinates: [
                    [fromCoords.lng, fromCoords.lat],
                    [toCoords.lng, toCoords.lat]
                ]
            },
            distance_meters: distance,
            estimated_time_seconds: estimatedTime,
            route_type: 'euclidean'
        };
    }

    /**
     * Calcula distancia entre dos puntos (Haversine)
     */
    calculateDistance(point1, point2) {
        const R = 6371000; // Radio de la Tierra en metros
        const lat1 = point1.lat * Math.PI / 180;
        const lat2 = point2.lat * Math.PI / 180;
        const deltaLat = (point2.lat - point1.lat) * Math.PI / 180;
        const deltaLng = (point2.lng - point1.lng) * Math.PI / 180;
        
        const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return R * c;
    }

    /**
     * Obtiene coordenadas de una dirección
     */
    async getAddressCoordinates(addressId) {
        const result = await this.db.query(`
            SELECT ST_X(location::geometry) as lng,
                   ST_Y(location::geometry) as lat
            FROM addresses
            WHERE id = $1
        `, [addressId]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return {
            lat: parseFloat(result.rows[0].lat),
            lng: parseFloat(result.rows[0].lng)
        };
    }

    /**
     * Cache de rutas
     */
    async getCachedRoute(fromAddressId, toAddressId, vehicleType) {
        const result = await this.db.query(`
            SELECT route_geometry, distance_meters, estimated_time_seconds,
                   base_price_soles
            FROM route_segments
            WHERE from_address_id = $1
            AND to_address_id = $2
            AND route_type = 'direct'
            LIMIT 1
        `, [fromAddressId, toAddressId]);
        
        if (result.rows.length > 0) {
            const route = result.rows[0];
            const pricing = await this.calculatePricing(
                parseFloat(route.distance_meters),
                route.estimated_time_seconds,
                vehicleType
            );
            
            return {
                from_address_id: fromAddressId,
                to_address_id: toAddressId,
                route_geometry: route.route_geometry,
                distance_meters: parseFloat(route.distance_meters),
                estimated_time_seconds: route.estimated_time_seconds,
                base_price_soles: parseFloat(route.base_price_soles),
                final_price_soles: pricing.final_price,
                vehicle_type: vehicleType
            };
        }
        
        return null;
    }

    async cacheRoute(fromAddressId, toAddressId, route, pricing, vehicleType) {
        await this.db.query(`
            INSERT INTO route_segments (
                from_address_id, to_address_id, route_geometry,
                distance_meters, estimated_time_seconds, base_price_soles, route_type
            ) VALUES ($1, $2, ST_GeomFromGeoJSON($3), $4, $5, $6, $7)
            ON CONFLICT (from_address_id, to_address_id, route_type)
            DO UPDATE SET
                distance_meters = EXCLUDED.distance_meters,
                estimated_time_seconds = EXCLUDED.estimated_time_seconds,
                base_price_soles = EXCLUDED.base_price_soles,
                last_updated = NOW()
        `, [
            fromAddressId,
            toAddressId,
            JSON.stringify(route.geometry),
            route.distance_meters,
            route.estimated_time_seconds,
            pricing.base_price,
            route.route_type || 'direct'
        ]);
    }
}

module.exports = RouteCalculationService;
```

---

## 5. ALGORITMO DE ASIGNACIÓN INTELIGENTE DE CONDUCTORES

### 5.1 Sistema de Scoring y Matching

```javascript
// services/driverMatchingService.js
const { Client } = require('pg');

class DriverMatchingService {
    constructor() {
        this.db = new Client({
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });
        this.db.connect();
    }

    /**
     * Encuentra el mejor conductor para un viaje
     * @param {number} fromAddressId - Dirección origen
     * @param {number} toAddressId - Dirección destino
     * @param {string} vehicleType - 'taxi' o 'mototaxi'
     * @param {Object} preferences - Preferencias del cliente
     * @returns {Promise<Array>} Lista de conductores ordenados por score
     */
    async findBestDrivers(fromAddressId, toAddressId, vehicleType, preferences = {}) {
        // 1. Obtener conductores disponibles
        const availableDrivers = await this.getAvailableDrivers(
            fromAddressId,
            vehicleType
        );
        
        if (availableDrivers.length === 0) {
            return [];
        }
        
        // 2. Calcular score para cada conductor
        const scoredDrivers = await Promise.all(
            availableDrivers.map(driver => 
                this.calculateDriverScore(
                    driver,
                    fromAddressId,
                    toAddressId,
                    vehicleType,
                    preferences
                )
            )
        );
        
        // 3. Ordenar por score descendente
        scoredDrivers.sort((a, b) => b.total_score - a.total_score);
        
        return scoredDrivers;
    }

    /**
     * Obtiene conductores disponibles cerca del origen
     */
    async getAvailableDrivers(fromAddressId, vehicleType, maxDistanceMeters = 5000) {
        // Obtener ubicación del origen
        const originResult = await this.db.query(`
            SELECT location
            FROM addresses
            WHERE id = $1
        `, [fromAddressId]);
        
        if (originResult.rows.length === 0) {
            return [];
        }
        
        const originLocation = originResult.rows[0].location;
        
        // Buscar conductores en radio
        const drivers = await this.db.query(`
            SELECT 
                dl.driver_id,
                dl.current_address_id,
                dl.current_zone,
                dl.rating,
                dl.vehicle_type,
                d.name,
                d.phone,
                d.vehicle_model,
                d.vehicle_plate,
                ST_Distance(
                    dl.last_known_location::geography,
                    $1::geography
                ) as distance_meters
            FROM driver_locations dl
            JOIN drivers d ON dl.driver_id = d.id
            WHERE dl.status = 'available'
            AND dl.vehicle_type = $2
            AND ST_DWithin(
                dl.last_known_location::geography,
                $1::geography,
                $3
            )
            ORDER BY distance_meters ASC
        `, [originLocation, vehicleType, maxDistanceMeters]);
        
        return drivers.rows;
    }

    /**
     * Calcula score total de un conductor
     */
    async calculateDriverScore(driver, fromAddressId, toAddressId, vehicleType, preferences) {
        const scores = {
            proximity_score: 0,      // Peso: 40%
            rating_score: 0,          // Peso: 30%
            vehicle_type_score: 0,   // Peso: 10%
            availability_score: 0,    // Peso: 10%
            history_score: 0,        // Peso: 10%
        };
        
        // 1. Score de Proximidad (0-100)
        scores.proximity_score = this.calculateProximityScore(
            driver.distance_meters
        );
        
        // 2. Score de Calificación (0-100)
        scores.rating_score = this.calculateRatingScore(driver.rating);
        
        // 3. Score de Tipo de Vehículo (0-100)
        scores.vehicle_type_score = driver.vehicle_type === vehicleType ? 100 : 0;
        
        // 4. Score de Disponibilidad (0-100)
        scores.availability_score = this.calculateAvailabilityScore(driver);
        
        // 5. Score Histórico (0-100)
        scores.history_score = await this.calculateHistoryScore(
            driver.driver_id,
            fromAddressId,
            toAddressId
        );
        
        // Calcular score ponderado
        const weights = {
            proximity_score: 0.40,
            rating_score: 0.30,
            vehicle_type_score: 0.10,
            availability_score: 0.10,
            history_score: 0.10
        };
        
        const total_score = 
            scores.proximity_score * weights.proximity_score +
            scores.rating_score * weights.rating_score +
            scores.vehicle_type_score * weights.vehicle_type_score +
            scores.availability_score * weights.availability_score +
            scores.history_score * weights.history_score;
        
        return {
            driver_id: driver.driver_id,
            driver_name: driver.name,
            driver_phone: driver.phone,
            vehicle_type: driver.vehicle_type,
            vehicle_model: driver.vehicle_model,
            vehicle_plate: driver.vehicle_plate,
            rating: parseFloat(driver.rating),
            distance_meters: parseFloat(driver.distance_meters),
            distance_km: (parseFloat(driver.distance_meters) / 1000).toFixed(2),
            total_score: Math.round(total_score * 100) / 100,
            scores: scores
        };
    }

    /**
     * Calcula score de proximidad (más cercano = mayor score)
     */
    calculateProximityScore(distanceMeters) {
        // Fórmula: score = 100 * e^(-distance/1000)
        // Convierte distancia a score entre 0-100
        const normalizedDistance = Math.min(distanceMeters / 1000, 5); // Max 5km
        return Math.max(0, 100 * Math.exp(-normalizedDistance));
    }

    /**
     * Calcula score de calificación
     */
    calculateRatingScore(rating) {
        // Rating de 0-5 se convierte a 0-100
        return (rating / 5) * 100;
    }

    /**
     * Calcula score de disponibilidad
     */
    calculateAvailabilityScore(driver) {
        // Conductores que han estado disponibles más tiempo tienen mayor score
        // Esto se puede calcular basado en last_update
        return 100; // Por ahora, todos iguales
    }

    /**
     * Calcula score histórico (viajes previos en esta ruta)
     */
    async calculateHistoryScore(driverId, fromAddressId, toAddressId) {
        const result = await this.db.query(`
            SELECT COUNT(*) as route_count,
                   AVG(rating) as avg_rating
            FROM ride_history
            WHERE driver_id = $1
            AND from_address_id = $2
            AND to_address_id = $3
            AND status = 'completed'
        `, [driverId, fromAddressId, toAddressId]);
        
        if (result.rows[0].route_count === '0') {
            return 50; // Score neutro si no hay historial
        }
        
        // Más viajes en esta ruta = mayor score
        const routeCount = parseInt(result.rows[0].route_count);
        const bonus = Math.min(routeCount * 5, 30); // Max +30 puntos
        
        return 50 + bonus;
    }
}

module.exports = DriverMatchingService;
```

### 5.2 API de Matching

```javascript
// routes/matching.js
const express = require('express');
const router = express.Router();
const DriverMatchingService = require('../services/driverMatchingService');
const matchingService = new DriverMatchingService();

/**
 * POST /api/matching/find-drivers
 * Encuentra conductores disponibles para un viaje
 */
router.post('/find-drivers', async (req, res) => {
    try {
        const { from_address_id, to_address_id, vehicle_type, preferences } = req.body;
        
        if (!from_address_id || !to_address_id || !vehicle_type) {
            return res.status(400).json({
                error: 'from_address_id, to_address_id, and vehicle_type are required'
            });
        }
        
        const drivers = await matchingService.findBestDrivers(
            from_address_id,
            to_address_id,
            vehicle_type,
            preferences || {}
        );
        
        res.json({
            count: drivers.length,
            drivers: drivers,
            best_match: drivers.length > 0 ? drivers[0] : null
        });
    } catch (error) {
        console.error('Matching error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
```

---

## 6. SISTEMA DE PRECIOS Y OFERTAS DEL CLIENTE

### 6.1 Motor de Precios Dinámicos

```javascript
// services/pricingService.js
const { Client } = require('pg');

class PricingService {
    constructor() {
        this.db = new Client({
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });
        this.db.connect();
    }

    /**
     * Calcula precio base de un viaje
     */
    async calculatePricing(distanceMeters, timeSeconds, vehicleType, cityId = 1) {
        // Obtener configuración de precios
        const pricingConfig = await this.getPricingConfig(vehicleType, cityId);
        
        if (!pricingConfig) {
            throw new Error('Pricing configuration not found');
        }
        
        const distanceKm = distanceMeters / 1000;
        const timeMinutes = timeSeconds / 60;
        
        // Cálculo de precio
        let price = pricingConfig.base_price;
        
        // Precio por distancia
        if (distanceKm > pricingConfig.free_distance_km) {
            const chargeableDistance = distanceKm - pricingConfig.free_distance_km;
            price += chargeableDistance * pricingConfig.price_per_km;
        }
        
        // Precio por tiempo
        if (timeMinutes > pricingConfig.free_time_minutes) {
            const chargeableTime = timeMinutes - pricingConfig.free_time_minutes;
            price += chargeableTime * pricingConfig.price_per_minute;
        }
        
        // Aplicar precio mínimo
        price = Math.max(price, pricingConfig.min_fare);
        
        return {
            base_price: Math.round(price * 100) / 100,
            distance_km: Math.round(distanceKm * 100) / 100,
            time_minutes: Math.round(timeMinutes * 10) / 10,
            breakdown: {
                base: pricingConfig.base_price,
                distance: distanceKm > pricingConfig.free_distance_km 
                    ? (distanceKm - pricingConfig.free_distance_km) * pricingConfig.price_per_km 
                    : 0,
                time: timeMinutes > pricingConfig.free_time_minutes
                    ? (timeMinutes - pricingConfig.free_time_minutes) * pricingConfig.price_per_minute
                    : 0
            }
        };
    }

    /**
     * Valida oferta del cliente y encuentra opciones
     */
    async validateCustomerOffer(customerOffer, distanceMeters, timeSeconds, vehicleType) {
        // Calcular precio base
        const basePricing = await this.calculatePricing(
            distanceMeters,
            timeSeconds,
            vehicleType
        );
        
        // Calcular rango aceptable
        const minAcceptablePrice = basePricing.base_price * 0.85; // 15% descuento máximo
        const maxAcceptablePrice = basePricing.base_price * 1.20; // 20% sobreprecio máximo
        
        const isOfferValid = customerOffer >= minAcceptablePrice && 
                            customerOffer <= maxAcceptablePrice;
        
        // Buscar conductores que acepten el precio
        const availableDrivers = await this.findDriversForOffer(
            customerOffer,
            basePricing.base_price,
            vehicleType
        );
        
        return {
            customer_offer: customerOffer,
            base_price: basePricing.base_price,
            min_acceptable: Math.round(minAcceptablePrice * 100) / 100,
            max_acceptable: Math.round(maxAcceptablePrice * 100) / 100,
            is_valid: isOfferValid,
            savings: isOfferValid ? basePricing.base_price - customerOffer : 0,
            premium: isOfferValid ? customerOffer - basePricing.base_price : 0,
            available_drivers: availableDrivers.length,
            drivers: availableDrivers,
            recommendation: this.getPriceRecommendation(
                customerOffer,
                basePricing.base_price,
                minAcceptablePrice,
                maxAcceptablePrice
            )
        };
    }

    /**
     * Encuentra conductores dispuestos a aceptar el precio ofrecido
     */
    async findDriversForOffer(customerOffer, basePrice, vehicleType) {
        // Lógica para encontrar conductores
        // Por ahora, retornamos todos los disponibles
        // En producción, esto consultaría preferencias de conductores
        
        const priceDifference = customerOffer - basePrice;
        const priceRatio = customerOffer / basePrice;
        
        // Conductores más propensos a aceptar:
        // - Si el precio es igual o mayor al base
        // - Si la diferencia es pequeña (hasta 10% menos)
        
        if (priceRatio >= 0.90) { // Al menos 90% del precio base
            // Buscar conductores disponibles
            // Por ahora retornamos placeholder
            return [
                {
                    driver_id: 1,
                    name: "Conductor Ejemplo",
                    accepts_offer: true,
                    reason: priceRatio >= 1.0 
                        ? "Precio igual o superior al base" 
                        : "Precio aceptable (dentro del rango)"
                }
            ];
        }
        
        return [];
    }

    /**
     * Genera recomendación de precio para el cliente
     */
    getPriceRecommendation(customerOffer, basePrice, minAcceptable, maxAcceptable) {
        if (customerOffer < minAcceptable) {
            return {
                type: 'too_low',
                message: `Tu oferta es muy baja. El precio mínimo sugerido es S/ ${minAcceptable.toFixed(2)}`,
                suggested_price: minAcceptable
            };
        }
        
        if (customerOffer > maxAcceptable) {
            return {
                type: 'too_high',
                message: `Tu oferta es muy alta. El precio base es S/ ${basePrice.toFixed(2)}`,
                suggested_price: basePrice
            };
        }
        
        if (customerOffer < basePrice) {
            return {
                type: 'good_deal',
                message: `¡Buen precio! Ahorras S/ ${(basePrice - customerOffer).toFixed(2)}`,
                suggested_price: customerOffer
            };
        }
        
        return {
            type: 'fair',
            message: 'Precio justo para este viaje',
            suggested_price: customerOffer
        };
    }

    /**
     * Obtiene configuración de precios
     */
    async getPricingConfig(vehicleType, cityId) {
        // Consultar desde MongoDB (modelo actual) o PostgreSQL
        // Por ahora, valores por defecto para Cusco
        
        const defaultPricing = {
            taxi: {
                base_price: 5.00,
                price_per_km: 2.50,
                price_per_minute: 0.30,
                min_fare: 8.00,
                free_distance_km: 1.0,
                free_time_minutes: 5
            },
            mototaxi: {
                base_price: 3.00,
                price_per_km: 1.50,
                price_per_minute: 0.20,
                min_fare: 5.00,
                free_distance_km: 1.0,
                free_time_minutes: 5
            }
        };
        
        return defaultPricing[vehicleType] || defaultPricing.taxi;
    }
}

module.exports = PricingService;
```

### 6.2 API de Precios y Ofertas

```javascript
// routes/pricing.js
const express = require('express');
const router = express.Router();
const PricingService = require('../services/pricingService');
const RouteCalculationService = require('../services/routeCalculationService');
const pricingService = new PricingService();
const routeService = new RouteCalculationService();

/**
 * POST /api/pricing/calculate
 * Calcula precio de un viaje
 */
router.post('/calculate', async (req, res) => {
    try {
        const { from_address_id, to_address_id, vehicle_type } = req.body;
        
        // Calcular ruta
        const route = await routeService.calculateRoute(
            from_address_id,
            to_address_id,
            vehicle_type
        );
        
        // Calcular precio
        const pricing = await pricingService.calculatePricing(
            route.distance_meters,
            route.estimated_time_seconds,
            vehicle_type
        );
        
        res.json({
            route: {
                distance_km: (route.distance_meters / 1000).toFixed(2),
                time_minutes: Math.ceil(route.estimated_time_seconds / 60)
            },
            pricing: {
                base_price: pricing.base_price,
                final_price: pricing.base_price,
                breakdown: pricing.breakdown,
                currency: 'PEN'
            }
        });
    } catch (error) {
        console.error('Pricing calculation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/pricing/validate-offer
 * Valida oferta del cliente
 */
router.post('/validate-offer', async (req, res) => {
    try {
        const { 
            customer_offer, 
            from_address_id, 
            to_address_id, 
            vehicle_type 
        } = req.body;
        
        if (!customer_offer || !from_address_id || !to_address_id) {
            return res.status(400).json({
                error: 'customer_offer, from_address_id, and to_address_id are required'
            });
        }
        
        // Calcular ruta
        const route = await routeService.calculateRoute(
            from_address_id,
            to_address_id,
            vehicle_type
        );
        
        // Validar oferta
        const validation = await pricingService.validateCustomerOffer(
            parseFloat(customer_offer),
            route.distance_meters,
            route.estimated_time_seconds,
            vehicle_type
        );
        
        res.json(validation);
    } catch (error) {
        console.error('Offer validation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/pricing/suggest-price
 * Sugiere precio óptimo para un viaje
 */
router.get('/suggest-price', async (req, res) => {
    try {
        const { from_address_id, to_address_id, vehicle_type } = req.query;
        
        const route = await routeService.calculateRoute(
            parseInt(from_address_id),
            parseInt(to_address_id),
            vehicle_type
        );
        
        const pricing = await pricingService.calculatePricing(
            route.distance_meters,
            route.estimated_time_seconds,
            vehicle_type
        );
        
        res.json({
            suggested_price: pricing.base_price,
            price_range: {
                min: pricing.base_price * 0.90,
                max: pricing.base_price * 1.10
            },
            route_info: {
                distance_km: (route.distance_meters / 1000).toFixed(2),
                time_minutes: Math.ceil(route.estimated_time_seconds / 60)
            }
        });
    } catch (error) {
        console.error('Price suggestion error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
```

---

## 7. FLUJO COMPLETO DE SOLICITUD DE VIAJE

### 7.1 Proceso End-to-End

```javascript
// services/rideRequestService.js
const GeocodingService = require('./geocodingService');
const RouteCalculationService = require('./routeCalculationService');
const DriverMatchingService = require('./driverMatchingService');
const PricingService = require('./pricingService');

class RideRequestService {
    constructor() {
        this.geocoding = new GeocodingService();
        this.routeCalculation = new RouteCalculationService();
        this.driverMatching = new DriverMatchingService();
        this.pricing = new PricingService();
    }

    /**
     * Procesa solicitud completa de viaje
     */
    async processRideRequest(requestData) {
        const {
            from_address_text,
            to_address_text,
            vehicle_type,
            customer_offer,
            user_id,
            city_id
        } = requestData;
        
        // Paso 1: Geocodificar direcciones
        const [fromGeocode, toGeocode] = await Promise.all([
            this.geocoding.geocode(from_address_text, city_id),
            this.geocoding.geocode(to_address_text, city_id)
        ]);
        
        if (!fromGeocode || !toGeocode) {
            throw new Error('Could not geocode one or both addresses');
        }
        
        // Paso 2: Calcular ruta
        const route = await this.routeCalculation.calculateRoute(
            fromGeocode.address_id,
            toGeocode.address_id,
            vehicle_type
        );
        
        // Paso 3: Calcular precio base
        const basePricing = await this.pricing.calculatePricing(
            route.distance_meters,
            route.estimated_time_seconds,
            vehicle_type,
            city_id
        );
        
        // Paso 4: Validar oferta del cliente (si existe)
        let offerValidation = null;
        if (customer_offer) {
            offerValidation = await this.pricing.validateCustomerOffer(
                customer_offer,
                route.distance_meters,
                route.estimated_time_seconds,
                vehicle_type
            );
        }
        
        // Paso 5: Encontrar conductores disponibles
        const drivers = await this.driverMatching.findBestDrivers(
            fromGeocode.address_id,
            toGeocode.address_id,
            vehicle_type
        );
        
        // Paso 6: Preparar respuesta
        return {
            request_id: this.generateRequestId(),
            from: {
                address_id: fromGeocode.address_id,
                address_text: fromGeocode.address_text,
                location: fromGeocode.location
            },
            to: {
                address_id: toGeocode.address_id,
                address_text: toGeocode.address_text,
                location: toGeocode.location
            },
            route: {
                distance_km: (route.distance_meters / 1000).toFixed(2),
                time_minutes: Math.ceil(route.estimated_time_seconds / 60),
                geometry: route.route_geometry
            },
            pricing: {
                base_price: basePricing.base_price,
                final_price: customer_offer && offerValidation?.is_valid 
                    ? customer_offer 
                    : basePricing.base_price,
                breakdown: basePricing.breakdown
            },
            offer_validation: offerValidation,
            available_drivers: {
                count: drivers.length,
                best_matches: drivers.slice(0, 5) // Top 5
            },
            recommendations: this.generateRecommendations(
                route,
                basePricing,
                offerValidation,
                drivers
            )
        };
    }

    /**
     * Genera recomendaciones para el usuario
     */
    generateRecommendations(route, pricing, offerValidation, drivers) {
        const recommendations = [];
        
        // Recomendación de precio
        if (offerValidation) {
            recommendations.push({
                type: 'price',
                message: offerValidation.recommendation.message,
                action: offerValidation.recommendation.type
            });
        }
        
        // Recomendación de tipo de vehículo
        if (route.distance_meters < 2000) { // Menos de 2km
            recommendations.push({
                type: 'vehicle',
                message: 'Para distancias cortas, un mototaxi es más económico',
                suggestion: 'mototaxi'
            });
        }
        
        // Recomendación de disponibilidad
        if (drivers.length === 0) {
            recommendations.push({
                type: 'availability',
                message: 'No hay conductores disponibles en este momento. Intenta en unos minutos.',
                action: 'retry'
            });
        } else if (drivers.length < 3) {
            recommendations.push({
                type: 'availability',
                message: 'Pocos conductores disponibles. Considera aumentar tu oferta para mayor probabilidad de aceptación.',
                action: 'increase_offer'
            });
        }
        
        return recommendations;
    }

    generateRequestId() {
        return `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}

module.exports = RideRequestService;
```

### 7.2 API Endpoint Principal

```javascript
// routes/rideRequest.js
const express = require('express');
const router = express.Router();
const RideRequestService = require('../services/rideRequestService');
const rideRequestService = new RideRequestService();

/**
 * POST /api/rides/request
 * Solicitud completa de viaje
 */
router.post('/request', async (req, res) => {
    try {
        const requestData = req.body;
        
        // Validar datos requeridos
        if (!requestData.from_address_text || !requestData.to_address_text) {
            return res.status(400).json({
                error: 'from_address_text and to_address_text are required'
            });
        }
        
        if (!requestData.vehicle_type) {
            return res.status(400).json({
                error: 'vehicle_type is required (taxi or mototaxi)'
            });
        }
        
        const result = await rideRequestService.processRideRequest(requestData);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Ride request error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});

module.exports = router;
```

---

## 8. PLAN DE IMPLEMENTACIÓN

### Fase 1: Setup de Infraestructura (2 semanas)

**Semana 1:**
- Instalación de PostgreSQL + PostGIS
- Configuración de base de datos
- Creación de esquema de tablas geográficas
- Setup de Redis para cache

**Semana 2:**
- Importación de datos de OpenStreetMap
- Mapeo manual de rutas críticas de Cusco
- Población inicial de direcciones y puntos de referencia
- Configuración de índices espaciales

### Fase 2: Desarrollo de Servicios Core (4 semanas)

**Semana 3-4: Servicio de Geocodificación**
- Implementación de geocodingService
- API de geocodificación directa e inversa
- Sistema de autocompletado
- Testing con direcciones reales de Cusco

**Semana 5-6: Servicio de Cálculo de Rutas**
- Implementación de routeCalculationService
- Algoritmo de Dijkstra
- Cache de rutas
- API de cálculo de rutas

### Fase 3: Sistema de Matching y Precios (3 semanas)

**Semana 7-8: Algoritmo de Asignación**
- Implementación de driverMatchingService
- Sistema de scoring
- API de matching

**Semana 9: Motor de Precios**
- Implementación de pricingService
- Sistema de validación de ofertas
- API de precios

### Fase 4: Integración y Testing (2 semanas)

**Semana 10:**
- Integración de todos los servicios
- API endpoint principal de solicitud de viaje
- Testing end-to-end

**Semana 11:**
- Optimización de performance
- Ajustes de algoritmos
- Documentación de API

### Fase 5: Población de Datos y Refinamiento (2 semanas)

**Semana 12-13:**
- Población masiva de direcciones de Cusco
- Mapeo de rutas populares
- Ajustes basados en datos reales
- Preparación para producción

---

## 9. VENTAJAS Y DESVENTAJAS DEL ENFOQUE

### Ventajas

1. **Sin dependencia de GPS en tiempo real**
   - Funciona sin conexión GPS constante
   - Menor consumo de batería
   - Menor uso de datos móviles

2. **Precisión predecible**
   - Rutas precalculadas y validadas
   - Precios consistentes
   - Tiempos estimados más confiables

3. **Escalabilidad**
   - Cache de rutas reduce carga computacional
   - Búsquedas rápidas con índices espaciales
   - Menor latencia en respuestas

4. **Costo reducido**
   - No requiere servicios de mapas en tiempo real (Google Maps API, etc.)
   - Menor costo de infraestructura

5. **Privacidad**
   - No rastrea ubicación GPS constante
   - Solo actualiza ubicación cuando conductor reporta cambio

### Desventajas

1. **Precisión limitada**
   - Depende de calidad de datos en BD
   - Puede no reflejar cambios en tiempo real (obras, cierres)

2. **Mantenimiento de datos**
   - Requiere actualización periódica de rutas
   - Necesita mapeo manual de nuevas áreas

3. **Experiencia de usuario**
   - Menos "mágico" que ver conductor en tiempo real
   - Requiere que conductor reporte ubicación manualmente

4. **Complejidad inicial**
   - Mayor esfuerzo en setup inicial
   - Requiere conocimiento de PostGIS y algoritmos de grafo

---

## 10. COMPARACIÓN CON UBER/DIDI

### Enfoque de Uber/DiDi (GPS en Tiempo Real)

- **Tracking constante:** GPS actualiza ubicación cada pocos segundos
- **Rutas dinámicas:** Calcula ruta en tiempo real considerando tráfico
- **Precisión alta:** Ubicación exacta en todo momento
- **Costo alto:** Requiere servicios de mapas premium
- **Consumo:** Alto consumo de batería y datos

### Enfoque Propuesto (Base de Datos)

- **Tracking discreto:** Ubicación se actualiza cuando conductor reporta cambio
- **Rutas precalculadas:** Usa rutas conocidas y validadas
- **Precisión moderada:** Depende de calidad de datos
- **Costo bajo:** Datos propios, sin APIs externas
- **Consumo:** Bajo consumo de recursos

### Cuándo Usar Cada Enfoque

**GPS en Tiempo Real (Uber/DiDi):**
- Mercados grandes y competitivos
- Presupuesto alto para infraestructura
- Necesidad de máxima precisión
- Usuarios que valoran experiencia premium

**Base de Datos (Propuesto):**
- Mercados regionales/medianos
- Presupuesto limitado
- Rutas conocidas y estables
- Enfoque en costo-efectividad

---

## 11. MÉTRICAS DE ÉXITO

### KPIs Técnicos

- **Tiempo de respuesta de geocodificación:** < 200ms
- **Tiempo de cálculo de ruta:** < 500ms (con cache), < 2s (sin cache)
- **Precisión de matching:** > 85% de asignaciones exitosas
- **Tasa de cache hit:** > 70% para rutas populares

### KPIs de Negocio

- **Tiempo promedio de matching:** < 3 minutos
- **Tasa de aceptación de ofertas:** > 60%
- **Satisfacción de usuarios:** > 4.5/5
- **Precisión de precios:** ±5% del precio real

---

## 12. CONCLUSIÓN

Esta metodología proporciona una alternativa viable y profesional al uso de GPS en tiempo real, especialmente adecuada para mercados regionales como Cusco donde:

1. Las rutas son relativamente estables
2. El presupuesto es limitado
3. La precisión "suficientemente buena" es aceptable
4. Se busca diferenciación mediante sistema de ofertas del cliente

El sistema combina lo mejor de ambos mundos: la eficiencia de datos precalculados con la flexibilidad de un algoritmo de matching inteligente, creando una experiencia única donde el cliente puede proponer precios y el sistema encuentra la mejor opción disponible.

---

**Documento creado:** 2025
**Versión:** 1.0
**Autor:** Metodología Profesional para Eber-Ride

