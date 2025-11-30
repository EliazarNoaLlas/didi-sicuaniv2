# Metodología Profesional: Sistema de Optimización para Conductores de Mototaxi
## Plataforma Eber-Ride - Cusco, Perú

---

## RESUMEN EJECUTIVO

Esta metodología implementa un **sistema inteligente de gestión de solicitudes para conductores de mototaxi**, utilizando **teoría de colas**, **optimización de rutas** y **algoritmos de priorización** para permitir que los conductores:

1. **Seleccionen de manera óptima** qué cliente atender
2. **Bloqueen o pongan en espera** solicitudes no deseadas
3. **Reciban rutas optimizadas** considerando múltiples factores
4. **Maximicen sus ganancias** mediante decisiones inteligentes

**Inspiración en la industria:** Basado en sistemas de Uber Driver, DiDi Driver, y algoritmos de optimización de rutas como TSP (Traveling Salesman Problem) y Vehicle Routing Problem (VRP).

---

## 1. ARQUITECTURA DEL SISTEMA PARA CONDUCTORES

### 1.1 Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│              APP DEL CONDUCTOR (React Native)                │
│  - Dashboard de solicitudes                                  │
│  - Visualización de cola de viajes                          │
│  - Selección/Rechazo/Bloqueo                                │
│  - Optimización de rutas                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    API GATEWAY                              │
│  - Autenticación de conductores                             │
│  - Rate Limiting                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              MICROSERVICIOS PARA CONDUCTORES                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Queue        │  │ Route        │  │ Driver       │     │
│  │ Management   │  │ Optimization │  │ Decision     │     │
│  │ Service      │  │ Service      │  │ Engine       │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Blocking     │  │ Earnings     │  │ Notification │     │
│  │ Service      │  │ Optimizer    │  │ Service      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              BASE DE DATOS                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ PostgreSQL   │  │ Redis        │  │ MongoDB      │     │
│  │ + PostGIS    │  │ (Queues)     │  │ (Rides/      │     │
│  │ (Routes)     │  │              │  │  Drivers)     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. SISTEMA DE COLAS (TEORÍA DE COLAS)

### 2.1 Modelo de Cola M/M/c

**Modelo:** Cola con llegadas de Poisson (M), tiempos de servicio exponenciales (M), y múltiples servidores (c = conductores)

**Parámetros:**
- **λ (lambda):** Tasa de llegada de solicitudes por minuto
- **μ (mu):** Tasa de servicio (viajes completados por minuto por conductor)
- **c:** Número de conductores disponibles
- **ρ (rho):** Intensidad de tráfico = λ/(c*μ)

### 2.2 Estructura de Datos de Cola

```sql
-- Tabla: ride_queue (Cola de Solicitudes)
CREATE TABLE ride_queue (
    id SERIAL PRIMARY KEY,
    ride_id INTEGER REFERENCES rides(id),
    user_id INTEGER REFERENCES users(id),
    from_address_id INTEGER REFERENCES addresses(id),
    to_address_id INTEGER REFERENCES addresses(id),
    vehicle_type VARCHAR(20) NOT NULL, -- 'taxi', 'mototaxi'
    customer_offer NUMERIC(8,2),
    base_price NUMERIC(8,2),
    priority_score NUMERIC(10,4) DEFAULT 0, -- Score calculado
    queue_position INTEGER,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'assigned', 'on_hold', 'blocked', 'expired'
    assigned_driver_id INTEGER REFERENCES drivers(id),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP, -- Tiempo de expiración
    wait_time_seconds INTEGER DEFAULT 0,
    rejection_count INTEGER DEFAULT 0
);

CREATE INDEX idx_ride_queue_status ON ride_queue(status, vehicle_type);
CREATE INDEX idx_ride_queue_priority ON ride_queue(priority_score DESC);
CREATE INDEX idx_ride_queue_driver ON ride_queue(assigned_driver_id) WHERE assigned_driver_id IS NOT NULL;
```

```sql
-- Tabla: driver_queue_preferences (Preferencias del Conductor)
CREATE TABLE driver_queue_preferences (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(id) UNIQUE,
    max_wait_time_minutes INTEGER DEFAULT 10, -- Tiempo máximo de espera
    min_price_soles NUMERIC(8,2) DEFAULT 5.00, -- Precio mínimo aceptado
    preferred_zones TEXT[], -- Zonas preferidas
    blocked_zones TEXT[], -- Zonas bloqueadas
    max_distance_km NUMERIC(5,2) DEFAULT 20.0, -- Distancia máxima
    min_rating_required NUMERIC(3,2) DEFAULT 3.5, -- Rating mínimo del cliente
    auto_accept_enabled BOOLEAN DEFAULT FALSE, -- Auto-aceptar viajes
    auto_accept_conditions JSONB, -- Condiciones para auto-aceptar
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

```sql
-- Tabla: driver_blocks (Bloqueos de Conductores)
CREATE TABLE driver_blocks (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(id),
    blocked_user_id INTEGER REFERENCES users(id),
    blocked_address_id INTEGER REFERENCES addresses(id), -- Bloquear zona
    block_type VARCHAR(20), -- 'user', 'zone', 'route'
    reason VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP, -- Bloqueo temporal
    is_permanent BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_driver_blocks_driver ON driver_blocks(driver_id);
CREATE INDEX idx_driver_blocks_user ON driver_blocks(blocked_user_id);
```

### 2.3 Servicio de Gestión de Colas

```javascript
// services/queueManagementService.js
const { Client } = require('pg');
const Redis = require('redis');

class QueueManagementService {
    constructor() {
        this.db = new Client({
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });
        this.db.connect();
        
        // Redis para colas en tiempo real
        this.redis = Redis.createClient({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379
        });
        this.redis.connect();
    }

    /**
     * Agrega una solicitud a la cola
     */
    async addToQueue(rideData) {
        const {
            ride_id,
            user_id,
            from_address_id,
            to_address_id,
            vehicle_type,
            customer_offer,
            base_price
        } = rideData;
        
        // Calcular priority score
        const priorityScore = await this.calculatePriorityScore(rideData);
        
        // Insertar en cola
        const result = await this.db.query(`
            INSERT INTO ride_queue (
                ride_id, user_id, from_address_id, to_address_id,
                vehicle_type, customer_offer, base_price, priority_score,
                status, expires_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            ride_id,
            user_id,
            from_address_id,
            to_address_id,
            vehicle_type,
            customer_offer,
            base_price,
            priorityScore,
            'pending',
            new Date(Date.now() + 15 * 60 * 1000) // Expira en 15 minutos
        ]);
        
        // Agregar a Redis para acceso rápido
        await this.redis.zAdd(
            `queue:${vehicle_type}`,
            {
                score: priorityScore,
                value: ride_id.toString()
            }
        );
        
        // Notificar a conductores disponibles
        await this.notifyAvailableDrivers(vehicle_type, result.rows[0]);
        
        return result.rows[0];
    }

    /**
     * Calcula score de prioridad para una solicitud
     */
    async calculatePriorityScore(rideData) {
        let score = 0;
        
        // Factor 1: Precio (40% del score)
        const priceFactor = this.calculatePriceScore(
            rideData.customer_offer,
            rideData.base_price
        );
        score += priceFactor * 0.40;
        
        // Factor 2: Tiempo de espera (30% del score)
        const waitTimeFactor = this.calculateWaitTimeScore(rideData.wait_time_seconds || 0);
        score += waitTimeFactor * 0.30;
        
        // Factor 3: Distancia (20% del score)
        const distanceFactor = await this.calculateDistanceScore(
            rideData.from_address_id,
            rideData.to_address_id
        );
        score += distanceFactor * 0.20;
        
        // Factor 4: Rating del cliente (10% del score)
        const ratingFactor = await this.calculateCustomerRatingScore(rideData.user_id);
        score += ratingFactor * 0.10;
        
        return Math.round(score * 10000) / 10000; // 4 decimales
    }

    /**
     * Calcula score basado en precio
     */
    calculatePriceScore(customerOffer, basePrice) {
        if (!customerOffer) {
            return 50; // Score neutro si no hay oferta
        }
        
        const ratio = customerOffer / basePrice;
        
        if (ratio >= 1.2) {
            return 100; // 20% o más sobre precio base
        } else if (ratio >= 1.1) {
            return 90; // 10-20% sobre precio base
        } else if (ratio >= 1.0) {
            return 80; // Precio base
        } else if (ratio >= 0.9) {
            return 60; // 10% menos que base
        } else if (ratio >= 0.85) {
            return 40; // 15% menos que base
        } else {
            return 20; // Menos del 85% del base
        }
    }

    /**
     * Calcula score basado en tiempo de espera
     */
    calculateWaitTimeScore(waitTimeSeconds) {
        // Más tiempo de espera = mayor prioridad
        const waitMinutes = waitTimeSeconds / 60;
        
        if (waitMinutes >= 10) {
            return 100; // Máxima prioridad
        } else if (waitMinutes >= 7) {
            return 80;
        } else if (waitMinutes >= 5) {
            return 60;
        } else if (waitMinutes >= 3) {
            return 40;
        } else {
            return 20;
        }
    }

    /**
     * Calcula score basado en distancia
     */
    async calculateDistanceScore(fromAddressId, toAddressId) {
        // Distancias cortas-medianas son preferidas (más viajes por hora)
        const result = await this.db.query(`
            SELECT distance_meters
            FROM route_segments
            WHERE from_address_id = $1 AND to_address_id = $2
            LIMIT 1
        `, [fromAddressId, toAddressId]);
        
        if (result.rows.length === 0) {
            return 50; // Score neutro
        }
        
        const distanceKm = result.rows[0].distance_meters / 1000;
        
        // Distancias entre 2-8km son óptimas para mototaxi
        if (distanceKm >= 2 && distanceKm <= 8) {
            return 100;
        } else if (distanceKm >= 1 && distanceKm <= 10) {
            return 80;
        } else if (distanceKm >= 0.5 && distanceKm <= 15) {
            return 60;
        } else {
            return 40;
        }
    }

    /**
     * Calcula score basado en rating del cliente
     */
    async calculateCustomerRatingScore(userId) {
        const result = await this.db.query(`
            SELECT AVG(rating) as avg_rating
            FROM ride_feedback
            WHERE user_id = $1
        `, [userId]);
        
        if (result.rows.length === 0 || !result.rows[0].avg_rating) {
            return 50; // Score neutro para nuevos usuarios
        }
        
        const rating = parseFloat(result.rows[0].avg_rating);
        return (rating / 5) * 100; // Convertir 0-5 a 0-100
    }

    /**
     * Obtiene cola de solicitudes para un conductor
     */
    async getDriverQueue(driverId, vehicleType, limit = 10) {
        // Obtener preferencias del conductor
        const preferences = await this.getDriverPreferences(driverId);
        
        // Obtener bloqueos
        const blocks = await this.getDriverBlocks(driverId);
        
        // Consultar cola desde Redis (ordenada por prioridad)
        const queueItems = await this.redis.zRangeWithScores(
            `queue:${vehicleType}`,
            0,
            limit - 1,
            { REV: true } // Orden descendente (mayor prioridad primero)
        );
        
        // Filtrar y enriquecer datos
        const enrichedQueue = [];
        
        for (const item of queueItems) {
            const rideId = parseInt(item.value);
            
            // Verificar si está bloqueado
            if (this.isBlocked(rideId, blocks)) {
                continue;
            }
            
            // Obtener detalles del viaje
            const rideDetails = await this.getRideDetails(rideId);
            
            if (!rideDetails) {
                continue;
            }
            
            // Verificar preferencias
            if (!this.matchesPreferences(rideDetails, preferences)) {
                continue;
            }
            
            // Calcular score personalizado para este conductor
            const driverScore = await this.calculateDriverSpecificScore(
                driverId,
                rideDetails,
                preferences
            );
            
            enrichedQueue.push({
                ...rideDetails,
                priority_score: item.score,
                driver_specific_score: driverScore,
                estimated_earnings: this.calculateEstimatedEarnings(rideDetails),
                estimated_time: this.calculateEstimatedTime(rideDetails, driverId)
            });
        }
        
        // Ordenar por score específico del conductor
        enrichedQueue.sort((a, b) => b.driver_specific_score - a.driver_specific_score);
        
        return enrichedQueue;
    }

    /**
     * Calcula score específico para un conductor
     */
    async calculateDriverSpecificScore(driverId, rideDetails, preferences) {
        let score = rideDetails.priority_score || 0;
        
        // Bonus por proximidad
        const driverLocation = await this.getDriverLocation(driverId);
        if (driverLocation) {
            const distanceToPickup = await this.calculateDistance(
                driverLocation.address_id,
                rideDetails.from_address_id
            );
            
            // Más cercano = mayor bonus
            if (distanceToPickup < 1000) { // Menos de 1km
                score += 20;
            } else if (distanceToPickup < 2000) { // Menos de 2km
                score += 10;
            }
        }
        
        // Bonus por precio
        if (rideDetails.customer_offer >= preferences.min_price_soles * 1.2) {
            score += 15; // 20% o más sobre precio mínimo
        } else if (rideDetails.customer_offer >= preferences.min_price_soles) {
            score += 5;
        }
        
        // Bonus por zona preferida
        if (preferences.preferred_zones && 
            preferences.preferred_zones.includes(rideDetails.from_zone)) {
            score += 10;
        }
        
        // Penalización por zona bloqueada
        if (preferences.blocked_zones && 
            preferences.blocked_zones.includes(rideDetails.from_zone)) {
            score -= 50;
        }
        
        return Math.max(0, score); // No permitir scores negativos
    }

    /**
     * Notifica a conductores disponibles
     */
    async notifyAvailableDrivers(vehicleType, rideData) {
        // Implementar notificación vía Socket.io o push notifications
        // Por ahora, solo log
        console.log(`Notifying drivers of type ${vehicleType} about ride ${rideData.ride_id}`);
    }
}

module.exports = QueueManagementService;
```

---

## 3. SISTEMA DE BLOQUEO Y ESPERA

### 3.1 Servicio de Bloqueo

```javascript
// services/driverBlockingService.js
const { Client } = require('pg');

class DriverBlockingService {
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
     * Bloquea un usuario específico
     */
    async blockUser(driverId, userId, reason = null, isPermanent = false) {
        const expiresAt = isPermanent ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días
        
        const result = await this.db.query(`
            INSERT INTO driver_blocks (
                driver_id, blocked_user_id, block_type, reason,
                is_permanent, expires_at
            ) VALUES ($1, $2, 'user', $3, $4, $5)
            ON CONFLICT DO NOTHING
            RETURNING *
        `, [driverId, userId, reason, isPermanent, expiresAt]);
        
        return result.rows[0];
    }

    /**
     * Bloquea una zona específica
     */
    async blockZone(driverId, addressId, reason = null, durationHours = 24) {
        const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);
        
        const result = await this.db.query(`
            INSERT INTO driver_blocks (
                driver_id, blocked_address_id, block_type, reason, expires_at
            ) VALUES ($1, $2, 'zone', $3, $4)
            RETURNING *
        `, [driverId, addressId, reason, expiresAt]);
        
        return result.rows[0];
    }

    /**
     * Bloquea una ruta específica (origen-destino)
     */
    async blockRoute(driverId, fromAddressId, toAddressId, reason = null) {
        // Guardar en preferencias como ruta bloqueada
        await this.db.query(`
            UPDATE driver_queue_preferences
            SET blocked_zones = array_append(
                COALESCE(blocked_zones, ARRAY[]::TEXT[]),
                $1
            )
            WHERE driver_id = $2
        `, [`route:${fromAddressId}:${toAddressId}`, driverId]);
        
        return { success: true };
    }

    /**
     * Desbloquea un usuario
     */
    async unblockUser(driverId, userId) {
        await this.db.query(`
            DELETE FROM driver_blocks
            WHERE driver_id = $1 AND blocked_user_id = $2
        `, [driverId, userId]);
        
        return { success: true };
    }

    /**
     * Verifica si un viaje está bloqueado para un conductor
     */
    async isRideBlocked(driverId, rideData) {
        // Verificar bloqueo de usuario
        const userBlock = await this.db.query(`
            SELECT id FROM driver_blocks
            WHERE driver_id = $1
            AND blocked_user_id = $2
            AND (expires_at IS NULL OR expires_at > NOW())
        `, [driverId, rideData.user_id]);
        
        if (userBlock.rows.length > 0) {
            return { blocked: true, reason: 'user_blocked' };
        }
        
        // Verificar bloqueo de zona origen
        const zoneBlock = await this.db.query(`
            SELECT id FROM driver_blocks
            WHERE driver_id = $1
            AND blocked_address_id = $2
            AND block_type = 'zone'
            AND (expires_at IS NULL OR expires_at > NOW())
        `, [driverId, rideData.from_address_id]);
        
        if (zoneBlock.rows.length > 0) {
            return { blocked: true, reason: 'zone_blocked' };
        }
        
        return { blocked: false };
    }

    /**
     * Obtiene lista de bloqueos activos de un conductor
     */
    async getDriverBlocks(driverId) {
        const result = await this.db.query(`
            SELECT 
                id,
                blocked_user_id,
                blocked_address_id,
                block_type,
                reason,
                expires_at,
                is_permanent
            FROM driver_blocks
            WHERE driver_id = $1
            AND (expires_at IS NULL OR expires_at > NOW())
        `, [driverId]);
        
        return result.rows;
    }
}

module.exports = DriverBlockingService;
```

### 3.2 Sistema de Espera (Hold)

```javascript
// services/rideHoldService.js
const { Client } = require('pg');

class RideHoldService {
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
     * Pone un viaje en espera
     */
    async putRideOnHold(rideId, driverId, holdDurationMinutes = 5) {
        const expiresAt = new Date(Date.now() + holdDurationMinutes * 60 * 1000);
        
        // Actualizar estado en cola
        await this.db.query(`
            UPDATE ride_queue
            SET status = 'on_hold',
                assigned_driver_id = $1,
                expires_at = $2
            WHERE ride_id = $3
        `, [driverId, expiresAt, rideId]);
        
        // Actualizar estado del viaje
        await this.db.query(`
            UPDATE rides
            SET ridestatus = 8, -- HOLD status
                driverId = $1
            WHERE id = $2
        `, [driverId, rideId]);
        
        return {
            success: true,
            hold_until: expiresAt,
            message: `Viaje puesto en espera hasta ${expiresAt.toLocaleTimeString()}`
        };
    }

    /**
     * Libera un viaje de espera
     */
    async releaseHold(rideId, driverId) {
        // Verificar que el conductor tiene el viaje en hold
        const check = await this.db.query(`
            SELECT id FROM ride_queue
            WHERE ride_id = $1 AND assigned_driver_id = $2 AND status = 'on_hold'
        `, [rideId, driverId]);
        
        if (check.rows.length === 0) {
            throw new Error('Ride not on hold for this driver');
        }
        
        // Liberar hold
        await this.db.query(`
            UPDATE ride_queue
            SET status = 'pending',
                assigned_driver_id = NULL,
                expires_at = NOW() + INTERVAL '15 minutes'
            WHERE ride_id = $1
        `, [rideId]);
        
        // Actualizar estado del viaje
        await this.db.query(`
            UPDATE rides
            SET ridestatus = 1, -- ASSIGNING
                driverId = NULL
            WHERE id = $1
        `, [rideId]);
        
        return { success: true, message: 'Viaje liberado de espera' };
    }

    /**
     * Acepta un viaje que está en espera
     */
    async acceptHeldRide(rideId, driverId) {
        // Verificar que está en hold para este conductor
        const check = await this.db.query(`
            SELECT id FROM ride_queue
            WHERE ride_id = $1 AND assigned_driver_id = $2 AND status = 'on_hold'
        `, [rideId, driverId]);
        
        if (check.rows.length === 0) {
            throw new Error('Ride not on hold for this driver');
        }
        
        // Aceptar viaje
        await this.db.query(`
            UPDATE ride_queue
            SET status = 'accepted'
            WHERE ride_id = $1
        `, [rideId]);
        
        await this.db.query(`
            UPDATE rides
            SET ridestatus = 4 -- ACCEPTED
            WHERE id = $1
        `, [rideId]);
        
        // Remover de cola Redis
        // await this.redis.zRem(`queue:${vehicleType}`, rideId.toString());
        
        return { success: true, message: 'Viaje aceptado' };
    }

    /**
     * Obtiene viajes en espera de un conductor
     */
    async getDriverHeldRides(driverId) {
        const result = await this.db.query(`
            SELECT 
                rq.*,
                r.from_address_id,
                r.to_address_id,
                r.customer_offer,
                r.base_price,
                u.name as user_name,
                u.phone as user_phone
            FROM ride_queue rq
            JOIN rides r ON rq.ride_id = r.id
            JOIN users u ON rq.user_id = u.id
            WHERE rq.assigned_driver_id = $1
            AND rq.status = 'on_hold'
            AND (rq.expires_at IS NULL OR rq.expires_at > NOW())
            ORDER BY rq.created_at ASC
        `, [driverId]);
        
        return result.rows;
    }
}

module.exports = RideHoldService;
```

---

## 4. OPTIMIZACIÓN DE RUTAS PARA CONDUCTORES

### 4.1 Algoritmo de Optimización de Rutas Múltiples

```javascript
// services/routeOptimizationService.js
const { Client } = require('pg');

class RouteOptimizationService {
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
     * Optimiza rutas para un conductor considerando múltiples viajes
     * Implementa algoritmo tipo TSP (Traveling Salesman Problem) simplificado
     */
    async optimizeDriverRoutes(driverId, rideIds) {
        if (rideIds.length === 0) {
            return [];
        }
        
        if (rideIds.length === 1) {
            return [rideIds[0]];
        }
        
        // Obtener ubicación actual del conductor
        const driverLocation = await this.getDriverLocation(driverId);
        
        // Obtener detalles de todos los viajes
        const rides = await Promise.all(
            rideIds.map(id => this.getRideDetails(id))
        );
        
        // Construir matriz de distancias
        const distanceMatrix = await this.buildDistanceMatrix(
            driverLocation,
            rides
        );
        
        // Aplicar algoritmo de optimización (Nearest Neighbor + 2-opt)
        const optimizedRoute = this.solveTSP(distanceMatrix, rides);
        
        return optimizedRoute;
    }

    /**
     * Construye matriz de distancias entre puntos
     */
    async buildDistanceMatrix(driverLocation, rides) {
        const points = [
            { type: 'driver', address_id: driverLocation.address_id, ride_id: null },
            ...rides.map(r => ({ 
                type: 'pickup', 
                address_id: r.from_address_id, 
                ride_id: r.ride_id 
            })),
            ...rides.map(r => ({ 
                type: 'dropoff', 
                address_id: r.to_address_id, 
                ride_id: r.ride_id 
            }))
        ];
        
        const matrix = {};
        
        for (let i = 0; i < points.length; i++) {
            matrix[i] = {};
            for (let j = 0; j < points.length; j++) {
                if (i === j) {
                    matrix[i][j] = 0;
                } else {
                    const distance = await this.calculateDistance(
                        points[i].address_id,
                        points[j].address_id
                    );
                    matrix[i][j] = distance;
                }
            }
        }
        
        return { matrix, points };
    }

    /**
     * Resuelve TSP usando Nearest Neighbor + 2-opt improvement
     */
    solveTSP(distanceMatrix, rides) {
        const { matrix, points } = distanceMatrix;
        
        // Algoritmo Nearest Neighbor
        let current = 0; // Empezar desde conductor
        const visited = new Set([0]);
        const route = [points[0]];
        
        while (visited.size < points.length) {
            let nearest = -1;
            let minDistance = Infinity;
            
            for (let i = 0; i < points.length; i++) {
                if (!visited.has(i) && matrix[current][i] < minDistance) {
                    // Verificar restricciones: pickup antes de dropoff
                    if (this.isValidNextPoint(points[current], points[i], visited, points)) {
                        minDistance = matrix[current][i];
                        nearest = i;
                    }
                }
            }
            
            if (nearest === -1) {
                break; // No hay más puntos válidos
            }
            
            visited.add(nearest);
            route.push(points[nearest]);
            current = nearest;
        }
        
        // Aplicar 2-opt improvement
        const improvedRoute = this.twoOpt(route, matrix, points);
        
        return improvedRoute;
    }

    /**
     * Verifica si un punto puede ser el siguiente en la ruta
     */
    isValidNextPoint(current, next, visited, allPoints) {
        // Si el siguiente es un dropoff, verificar que el pickup correspondiente ya fue visitado
        if (next.type === 'dropoff') {
            const correspondingPickup = allPoints.findIndex(
                p => p.type === 'pickup' && 
                     p.ride_id === next.ride_id
            );
            return visited.has(correspondingPickup);
        }
        
        return true;
    }

    /**
     * Algoritmo 2-opt para mejorar ruta
     */
    twoOpt(route, matrix, points) {
        let improved = true;
        let bestRoute = [...route];
        let bestDistance = this.calculateRouteDistance(bestRoute, matrix, points);
        
        while (improved) {
            improved = false;
            
            for (let i = 1; i < route.length - 2; i++) {
                for (let j = i + 1; j < route.length; j++) {
                    if (j - i === 1) continue;
                    
                    // Crear nueva ruta invirtiendo segmento
                    const newRoute = [
                        ...route.slice(0, i),
                        ...route.slice(i, j + 1).reverse(),
                        ...route.slice(j + 1)
                    ];
                    
                    // Verificar que la nueva ruta es válida
                    if (!this.isValidRoute(newRoute)) {
                        continue;
                    }
                    
                    const newDistance = this.calculateRouteDistance(newRoute, matrix, points);
                    
                    if (newDistance < bestDistance) {
                        bestRoute = newRoute;
                        bestDistance = newDistance;
                        improved = true;
                    }
                }
            }
            
            route = bestRoute;
        }
        
        return bestRoute;
    }

    /**
     * Verifica que una ruta es válida (pickup antes de dropoff)
     */
    isValidRoute(route) {
        const ridePickups = new Set();
        const rideDropoffs = new Set();
        
        for (const point of route) {
            if (point.type === 'pickup' && point.ride_id) {
                ridePickups.add(point.ride_id);
            } else if (point.type === 'dropoff' && point.ride_id) {
                if (!ridePickups.has(point.ride_id)) {
                    return false; // Dropoff antes de pickup
                }
                rideDropoffs.add(point.ride_id);
            }
        }
        
        return true;
    }

    /**
     * Calcula distancia total de una ruta
     */
    calculateRouteDistance(route, matrix, points) {
        let totalDistance = 0;
        
        for (let i = 0; i < route.length - 1; i++) {
            const fromIndex = points.findIndex(p => 
                p.address_id === route[i].address_id && 
                p.type === route[i].type
            );
            const toIndex = points.findIndex(p => 
                p.address_id === route[i + 1].address_id && 
                p.type === route[i + 1].type
            );
            
            if (fromIndex !== -1 && toIndex !== -1) {
                totalDistance += matrix[fromIndex][toIndex];
            }
        }
        
        return totalDistance;
    }

    /**
     * Sugiere ruta óptima para un viaje específico
     */
    async suggestOptimalRoute(driverId, rideId) {
        const ride = await this.getRideDetails(rideId);
        const driverLocation = await this.getDriverLocation(driverId);
        
        // Calcular ruta directa
        const directRoute = await this.calculateRoute(
            driverLocation.address_id,
            ride.from_address_id,
            ride.to_address_id
        );
        
        // Buscar viajes adicionales que puedan combinarse
        const potentialCombinedRides = await this.findPotentialCombinedRides(
            driverId,
            ride,
            driverLocation
        );
        
        if (potentialCombinedRides.length > 0) {
            // Calcular ruta optimizada con múltiples viajes
            const optimizedRoute = await this.optimizeDriverRoutes(
                driverId,
                [rideId, ...potentialCombinedRides.map(r => r.ride_id)]
            );
            
            return {
                type: 'combined',
                route: optimizedRoute,
                estimated_earnings: this.calculateCombinedEarnings(optimizedRoute),
                estimated_time: this.calculateCombinedTime(optimizedRoute),
                savings: this.calculateRouteSavings(directRoute, optimizedRoute)
            };
        }
        
        return {
            type: 'single',
            route: directRoute,
            estimated_earnings: ride.customer_offer || ride.base_price,
            estimated_time: directRoute.estimated_time_seconds
        };
    }

    /**
     * Encuentra viajes que pueden combinarse eficientemente
     */
    async findPotentialCombinedRides(driverId, currentRide, driverLocation) {
        // Buscar viajes cercanos al destino del viaje actual
        const result = await this.db.query(`
            SELECT rq.*, r.from_address_id, r.to_address_id
            FROM ride_queue rq
            JOIN rides r ON rq.ride_id = r.id
            WHERE rq.status = 'pending'
            AND rq.vehicle_type = (SELECT vehicle_type FROM drivers WHERE id = $1)
            AND rq.ride_id != $2
            AND ST_DWithin(
                (SELECT location FROM addresses WHERE id = $3)::geography,
                (SELECT location FROM addresses WHERE id = r.to_address_id)::geography,
                2000
            )
            ORDER BY rq.priority_score DESC
            LIMIT 3
        `, [driverId, currentRide.ride_id, currentRide.to_address_id]);
        
        return result.rows;
    }
}

module.exports = RouteOptimizationService;
```

---

## 5. MOTOR DE DECISIÓN INTELIGENTE PARA CONDUCTORES

### 5.1 Servicio de Decisión

```javascript
// services/driverDecisionEngine.js
const QueueManagementService = require('./queueManagementService');
const RouteOptimizationService = require('./routeOptimizationService');
const DriverBlockingService = require('./driverBlockingService');
const RideHoldService = require('./rideHoldService');

class DriverDecisionEngine {
    constructor() {
        this.queueService = new QueueManagementService();
        this.routeService = new RouteOptimizationService();
        this.blockingService = new DriverBlockingService();
        this.holdService = new RideHoldService();
    }

    /**
     * Analiza y recomienda la mejor acción para un conductor
     */
    async analyzeAndRecommend(driverId, vehicleType) {
        // Obtener cola de solicitudes
        const queue = await this.queueService.getDriverQueue(driverId, vehicleType, 10);
        
        if (queue.length === 0) {
            return {
                recommendation: 'wait',
                message: 'No hay solicitudes disponibles en este momento',
                actions: []
            };
        }
        
        // Analizar cada solicitud
        const analyzedRides = await Promise.all(
            queue.map(ride => this.analyzeRide(driverId, ride))
        );
        
        // Filtrar y ordenar
        const validRides = analyzedRides
            .filter(r => !r.is_blocked && r.recommendation_score > 50)
            .sort((a, b) => b.recommendation_score - a.recommendation_score);
        
        // Generar recomendaciones
        const recommendations = this.generateRecommendations(validRides);
        
        return {
            recommendation: recommendations.length > 0 ? 'accept' : 'wait',
            top_rides: validRides.slice(0, 5),
            recommendations: recommendations,
            statistics: this.calculateStatistics(validRides)
        };
    }

    /**
     * Analiza un viaje específico
     */
    async analyzeRide(driverId, rideData) {
        // Verificar bloqueos
        const blockCheck = await this.blockingService.isRideBlocked(driverId, rideData);
        
        if (blockCheck.blocked) {
            return {
                ...rideData,
                is_blocked: true,
                block_reason: blockCheck.reason,
                recommendation_score: 0
            };
        }
        
        // Calcular ruta optimizada
        const optimalRoute = await this.routeService.suggestOptimalRoute(
            driverId,
            rideData.ride_id
        );
        
        // Calcular métricas
        const metrics = await this.calculateRideMetrics(driverId, rideData, optimalRoute);
        
        // Calcular score de recomendación
        const recommendationScore = this.calculateRecommendationScore(metrics);
        
        return {
            ...rideData,
            is_blocked: false,
            optimal_route: optimalRoute,
            metrics: metrics,
            recommendation_score: recommendationScore,
            recommendation: this.getRecommendationText(recommendationScore, metrics)
        };
    }

    /**
     * Calcula métricas para un viaje
     */
    async calculateRideMetrics(driverId, rideData, optimalRoute) {
        const driverLocation = await this.queueService.getDriverLocation(driverId);
        
        // Distancia al pickup
        const distanceToPickup = await this.queueService.calculateDistance(
            driverLocation.address_id,
            rideData.from_address_id
        );
        
        // Tiempo estimado al pickup
        const timeToPickup = Math.ceil(distanceToPickup / 200); // Asumiendo 200m/min promedio
        
        // Ganancia por minuto
        const earnings = rideData.customer_offer || rideData.base_price;
        const totalTime = timeToPickup + (optimalRoute.estimated_time / 60);
        const earningsPerMinute = totalTime > 0 ? earnings / totalTime : 0;
        
        // Eficiencia de ruta
        const routeEfficiency = optimalRoute.type === 'combined' ? 1.3 : 1.0; // 30% bonus si es combinado
        
        return {
            distance_to_pickup_km: (distanceToPickup / 1000).toFixed(2),
            time_to_pickup_minutes: timeToPickup,
            total_time_minutes: totalTime,
            earnings: earnings,
            earnings_per_minute: earningsPerMinute.toFixed(2),
            route_efficiency: routeEfficiency,
            is_combined: optimalRoute.type === 'combined'
        };
    }

    /**
     * Calcula score de recomendación
     */
    calculateRecommendationScore(metrics) {
        let score = 0;
        
        // Factor 1: Ganancia por minuto (40%)
        const earningsScore = Math.min(100, (metrics.earnings_per_minute / 2) * 100);
        score += earningsScore * 0.40;
        
        // Factor 2: Proximidad (30%)
        const proximityScore = metrics.distance_to_pickup_km < 1 ? 100 :
                              metrics.distance_to_pickup_km < 2 ? 80 :
                              metrics.distance_to_pickup_km < 5 ? 60 : 40;
        score += proximityScore * 0.30;
        
        // Factor 3: Eficiencia de ruta (20%)
        const efficiencyScore = metrics.route_efficiency * 100;
        score += efficiencyScore * 0.20;
        
        // Factor 4: Tiempo total (10%)
        const timeScore = metrics.total_time_minutes < 15 ? 100 :
                         metrics.total_time_minutes < 30 ? 80 :
                         metrics.total_time_minutes < 45 ? 60 : 40;
        score += timeScore * 0.10;
        
        return Math.round(score);
    }

    /**
     * Genera texto de recomendación
     */
    getRecommendationText(score, metrics) {
        if (score >= 80) {
            return `⭐ Excelente opción: S/ ${metrics.earnings.toFixed(2)} en ${metrics.total_time_minutes} min (S/ ${metrics.earnings_per_minute}/min)`;
        } else if (score >= 60) {
            return `✅ Buena opción: S/ ${metrics.earnings.toFixed(2)} en ${metrics.total_time_minutes} min`;
        } else if (score >= 40) {
            return `⚠️ Opción regular: S/ ${metrics.earnings.toFixed(2)} pero ${metrics.total_time_minutes} min de viaje`;
        } else {
            return `❌ No recomendado: Baja eficiencia`;
        }
    }

    /**
     * Genera recomendaciones estratégicas
     */
    generateRecommendations(validRides) {
        const recommendations = [];
        
        if (validRides.length === 0) {
            return recommendations;
        }
        
        const topRide = validRides[0];
        
        // Recomendación principal
        recommendations.push({
            type: 'primary',
            action: 'accept',
            ride_id: topRide.ride_id,
            reason: 'Mejor opción disponible',
            priority: 'high'
        });
        
        // Si hay opciones combinadas, recomendar
        const combinedRides = validRides.filter(r => r.metrics.is_combined);
        if (combinedRides.length > 0) {
            recommendations.push({
                type: 'strategy',
                action: 'consider_combined',
                ride_id: combinedRides[0].ride_id,
                reason: 'Ruta combinada puede aumentar ganancias',
                priority: 'medium'
            });
        }
        
        // Si hay múltiples opciones buenas, sugerir esperar
        const goodRides = validRides.filter(r => r.recommendation_score >= 70);
        if (goodRides.length > 3) {
            recommendations.push({
                type: 'strategy',
                action: 'wait',
                reason: 'Hay múltiples buenas opciones, considera esperar la mejor',
                priority: 'low'
            });
        }
        
        return recommendations;
    }

    /**
     * Calcula estadísticas
     */
    calculateStatistics(rides) {
        if (rides.length === 0) {
            return null;
        }
        
        const earnings = rides.map(r => parseFloat(r.metrics.earnings));
        const times = rides.map(r => parseFloat(r.metrics.total_time_minutes));
        
        return {
            total_rides: rides.length,
            avg_earnings: (earnings.reduce((a, b) => a + b, 0) / earnings.length).toFixed(2),
            max_earnings: Math.max(...earnings).toFixed(2),
            avg_time: (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1),
            combined_routes: rides.filter(r => r.metrics.is_combined).length
        };
    }
}

module.exports = DriverDecisionEngine;
```

---

## 6. API ENDPOINTS PARA CONDUCTORES

### 6.1 Rutas de API

```javascript
// routes/driverQueue.js
const express = require('express');
const router = express.Router();
const QueueManagementService = require('../services/queueManagementService');
const DriverDecisionEngine = require('../services/driverDecisionEngine');
const DriverBlockingService = require('../services/driverBlockingService');
const RideHoldService = require('../services/rideHoldService');

const queueService = new QueueManagementService();
const decisionEngine = new DriverDecisionEngine();
const blockingService = new DriverBlockingService();
const holdService = new RideHoldService();

/**
 * GET /api/driver/queue
 * Obtiene cola de solicitudes para un conductor
 */
router.get('/queue', async (req, res) => {
    try {
        const { driver_id, vehicle_type } = req.query;
        
        if (!driver_id || !vehicle_type) {
            return res.status(400).json({
                error: 'driver_id and vehicle_type are required'
            });
        }
        
        const queue = await queueService.getDriverQueue(
            parseInt(driver_id),
            vehicle_type,
            10
        );
        
        res.json({
            count: queue.length,
            rides: queue
        });
    } catch (error) {
        console.error('Queue error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/driver/recommendations
 * Obtiene recomendaciones inteligentes
 */
router.get('/recommendations', async (req, res) => {
    try {
        const { driver_id, vehicle_type } = req.query;
        
        const recommendations = await decisionEngine.analyzeAndRecommend(
            parseInt(driver_id),
            vehicle_type
        );
        
        res.json(recommendations);
    } catch (error) {
        console.error('Recommendations error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/driver/accept
 * Acepta un viaje
 */
router.post('/accept', async (req, res) => {
    try {
        const { driver_id, ride_id } = req.body;
        
        // Verificar que no está bloqueado
        const rideData = await queueService.getRideDetails(ride_id);
        const blockCheck = await blockingService.isRideBlocked(driver_id, rideData);
        
        if (blockCheck.blocked) {
            return res.status(403).json({
                error: 'Ride is blocked',
                reason: blockCheck.reason
            });
        }
        
        // Aceptar viaje
        await queueService.acceptRide(driver_id, ride_id);
        
        res.json({
            success: true,
            message: 'Ride accepted'
        });
    } catch (error) {
        console.error('Accept error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/driver/reject
 * Rechaza un viaje
 */
router.post('/reject', async (req, res) => {
    try {
        const { driver_id, ride_id, reason } = req.body;
        
        await queueService.rejectRide(driver_id, ride_id, reason);
        
        res.json({
            success: true,
            message: 'Ride rejected'
        });
    } catch (error) {
        console.error('Reject error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/driver/hold
 * Pone un viaje en espera
 */
router.post('/hold', async (req, res) => {
    try {
        const { driver_id, ride_id, duration_minutes } = req.body;
        
        const result = await holdService.putRideOnHold(
            ride_id,
            driver_id,
            duration_minutes || 5
        );
        
        res.json(result);
    } catch (error) {
        console.error('Hold error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/driver/release-hold
 * Libera un viaje de espera
 */
router.post('/release-hold', async (req, res) => {
    try {
        const { driver_id, ride_id } = req.body;
        
        const result = await holdService.releaseHold(ride_id, driver_id);
        
        res.json(result);
    } catch (error) {
        console.error('Release hold error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/driver/accept-held
 * Acepta un viaje que está en espera
 */
router.post('/accept-held', async (req, res) => {
    try {
        const { driver_id, ride_id } = req.body;
        
        const result = await holdService.acceptHeldRide(ride_id, driver_id);
        
        res.json(result);
    } catch (error) {
        console.error('Accept held error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/driver/block-user
 * Bloquea un usuario
 */
router.post('/block-user', async (req, res) => {
    try {
        const { driver_id, user_id, reason, is_permanent } = req.body;
        
        const result = await blockingService.blockUser(
            driver_id,
            user_id,
            reason,
            is_permanent || false
        );
        
        res.json({
            success: true,
            block: result
        });
    } catch (error) {
        console.error('Block user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/driver/block-zone
 * Bloquea una zona
 */
router.post('/block-zone', async (req, res) => {
    try {
        const { driver_id, address_id, reason, duration_hours } = req.body;
        
        const result = await blockingService.blockZone(
            driver_id,
            address_id,
            reason,
            duration_hours || 24
        );
        
        res.json({
            success: true,
            block: result
        });
    } catch (error) {
        console.error('Block zone error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/driver/optimize-route
 * Obtiene ruta optimizada para múltiples viajes
 */
router.get('/optimize-route', async (req, res) => {
    try {
        const { driver_id, ride_ids } = req.query;
        
        if (!ride_ids) {
            return res.status(400).json({
                error: 'ride_ids is required (comma-separated)'
            });
        }
        
        const rideIdsArray = ride_ids.split(',').map(id => parseInt(id));
        const routeService = new (require('../services/routeOptimizationService'))();
        
        const optimizedRoute = await routeService.optimizeDriverRoutes(
            parseInt(driver_id),
            rideIdsArray
        );
        
        res.json({
            optimized_route: optimizedRoute,
            total_stops: optimizedRoute.length,
            estimated_savings: 'Calculated based on route comparison'
        });
    } catch (error) {
        console.error('Optimize route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
```

---

## 7. FLUJO COMPLETO DE USO PARA CONDUCTOR

### 7.1 Flujo de Trabajo

```
1. CONDUCTOR ABRE APP
   ↓
2. SISTEMA MUESTRA COLA DE SOLICITUDES
   - Ordenadas por score de recomendación
   - Filtradas por bloqueos y preferencias
   ↓
3. CONDUCTOR VE RECOMENDACIONES
   - Top 3 opciones con análisis detallado
   - Métricas: ganancia/minuto, distancia, tiempo
   ↓
4. CONDUCTOR DECIDE:
   
   A) ACEPTAR
      → Viaje asignado
      → Ruta optimizada mostrada
      → Navegación iniciada
   
   B) RECHAZAR
      → Viaje removido de su cola
      → Sistema busca otro conductor
   
   C) PONER EN ESPERA (HOLD)
      → Viaje reservado por 5 minutos
      → Conductor puede aceptar después
      → Si no acepta, se libera automáticamente
   
   D) BLOQUEAR
      → Usuario/zona bloqueada
      → No recibirá más solicitudes de esa fuente
   ↓
5. SISTEMA ACTUALIZA COLA
   - Nuevas solicitudes aparecen
   - Recomendaciones se recalculan
```

### 7.2 Ejemplo de Respuesta de API

```json
{
  "recommendation": "accept",
  "top_rides": [
    {
      "ride_id": 123,
      "user_name": "Juan Pérez",
      "from_address": "Plaza de Armas",
      "to_address": "Aeropuerto",
      "customer_offer": 25.00,
      "base_price": 22.00,
      "driver_specific_score": 87.5,
      "metrics": {
        "distance_to_pickup_km": "0.8",
        "time_to_pickup_minutes": 4,
        "total_time_minutes": 18,
        "earnings": 25.00,
        "earnings_per_minute": "1.39",
        "route_efficiency": 1.0,
        "is_combined": false
      },
      "recommendation": "⭐ Excelente opción: S/ 25.00 en 18 min (S/ 1.39/min)",
      "optimal_route": {
        "type": "single",
        "estimated_time": 1080,
        "distance_km": "12.5"
      }
    }
  ],
  "recommendations": [
    {
      "type": "primary",
      "action": "accept",
      "ride_id": 123,
      "reason": "Mejor opción disponible",
      "priority": "high"
    }
  ],
  "statistics": {
    "total_rides": 8,
    "avg_earnings": "18.50",
    "max_earnings": "25.00",
    "avg_time": "22.5",
    "combined_routes": 1
  }
}
```

---

## 8. PLAN DE IMPLEMENTACIÓN

### Fase 1: Infraestructura de Colas (2 semanas)

**Semana 1:**
- Crear tablas de base de datos (ride_queue, driver_queue_preferences, driver_blocks)
- Configurar Redis para colas
- Implementar QueueManagementService básico

**Semana 2:**
- Implementar sistema de priorización
- Testing de colas con datos simulados

### Fase 2: Sistema de Bloqueo y Espera (1 semana)

**Semana 3:**
- Implementar DriverBlockingService
- Implementar RideHoldService
- API endpoints de bloqueo

### Fase 3: Optimización de Rutas (2 semanas)

**Semana 4-5:**
- Implementar RouteOptimizationService
- Algoritmo TSP simplificado
- Testing con rutas reales de Cusco

### Fase 4: Motor de Decisión (1 semana)

**Semana 6:**
- Implementar DriverDecisionEngine
- Integración de todos los servicios
- Testing end-to-end

### Fase 5: Frontend y Testing (2 semanas)

**Semana 7-8:**
- Desarrollo de UI para conductores
- Integración con APIs
- Testing con conductores reales
- Ajustes basados en feedback

---

## 9. MÉTRICAS DE ÉXITO

### KPIs para Conductores

- **Tiempo promedio de decisión:** < 30 segundos
- **Tasa de aceptación:** > 60%
- **Ganancia promedio por hora:** > S/ 25
- **Satisfacción del conductor:** > 4.0/5

### KPIs del Sistema

- **Tiempo de respuesta de cola:** < 100ms
- **Precisión de recomendaciones:** > 75% de aceptación en top 3
- **Eficiencia de rutas optimizadas:** 15-20% de ahorro en distancia
- **Uptime del sistema:** > 99%

---

## 10. CONCLUSIÓN

Esta metodología proporciona a los conductores de mototaxi un **sistema inteligente y completo** para:

1. **Seleccionar óptimamente** qué clientes atender basado en múltiples factores
2. **Gestionar su cola** de solicitudes de manera eficiente
3. **Bloquear o poner en espera** solicitudes según sus preferencias
4. **Optimizar sus rutas** para maximizar ganancias y eficiencia
5. **Tomar decisiones informadas** con recomendaciones basadas en datos

El sistema combina **teoría de colas**, **algoritmos de optimización** y **inteligencia artificial** para crear una experiencia superior tanto para conductores como para pasajeros.

---

**Documento creado:** 2025
**Versión:** 1.0
**Autor:** Metodología Profesional para Conductores - Eber-Ride

