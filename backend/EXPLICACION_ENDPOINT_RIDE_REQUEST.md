# 📚 Explicación Detallada: POST /api/rides/request

## 🎯 Resumen

Este endpoint permite a un **pasajero** crear una solicitud de viaje con un precio propuesto. El sistema calcula un precio sugerido, valida la oferta del pasajero, crea la solicitud en la base de datos y notifica a conductores cercanos para que puedan hacer ofertas (bids).

---

## 🔄 Flujo Completo del Endpoint

### 1. **Entrada del Request**

**Ruta:** `POST /api/rides/request`  
**Autenticación:** Requerida (Bearer Token)  
**Middleware:** `authenticate` (extrae `req.user`)

**Request Body:**
```json
{
  "origin_lat": -14.2694,
  "origin_lon": -71.2256,
  "origin_address": "Plaza Principal, Sicuani",
  "destination_lat": -14.27,
  "destination_lon": -71.226,
  "destination_address": "Mercado Central, Sicuani",
  "passenger_offered_price": 12,
  "vehicle_type": "taxi",
  "payment_method": "cash"
}
```

---

### 2. **Validación de Entrada**

**Archivo:** `backend/routes/rides.routes.js` (líneas 206-213)

El middleware `express-validator` valida:
- ✅ `origin_lat`: Debe ser un número flotante
- ✅ `origin_lon`: Debe ser un número flotante
- ✅ `destination_lat`: Debe ser un número flotante
- ✅ `destination_lon`: Debe ser un número flotante
- ✅ `passenger_offered_price`: Debe ser un número ≥ 0
- ✅ `vehicle_type`: Debe ser `'taxi'`, `'mototaxi'` o `'any'`

**Si la validación falla:** Retorna error 400 con mensaje descriptivo.

---

### 3. **Llamada al Servicio**

**Archivo:** `backend/routes/rides.routes.js` (línea 219)

```javascript
const result = await biddingService.createRideRequest(passengerId, rideData);
```

El controlador delega toda la lógica al servicio `BiddingService`.

---

### 4. **Procesamiento en BiddingService**

**Archivo:** `backend/services/bidding.service.js` (método `createRideRequest`)

#### Paso 4.1: Calcular Precio Sugerido

```javascript
const suggestedPrice = await pricingService.calculateSuggestedPrice({
  origin_lat,
  origin_lon,
  destination_lat,
  destination_lon,
  vehicle_type,
});
```

**Archivo:** `backend/services/pricing.service.js`

El `PricingService` calcula el precio sugerido usando:

1. **Cálculo de métricas de ruta:**
   - Distancia (km) usando fórmula Haversine
   - Duración estimada (minutos) basada en velocidad promedio

2. **Fórmula base:**
   ```
   Precio = Banderazo (S/ 5) + (Distancia × S/ 2.5/km) + (Tiempo × S/ 0.50/min)
   ```

3. **Ajustes dinámicos:**
   - **Tipo de vehículo:**
     - `mototaxi`: -30% (multiplica por 0.7)
     - `taxi`: Precio normal
   - **Hora del día:**
     - **Hora pico** (7-9am, 5-7pm): +30%
     - **Madrugada** (11pm-5am): +50%
   - **Zona turística:** +20%
   - **Oferta/Demanda:**
     - Calcula ratio de conductores disponibles vs. viajes pendientes
     - Aplica multiplicador según ratio:
       - Ratio < 0.5 (mucha demanda): +40%
       - Ratio < 0.8: +20%
       - Ratio 0.8-1.2: Precio normal
       - Ratio > 1.2 (mucha oferta): -10% a -15%

4. **Tarifa mínima:** S/ 7.00

5. **Redondeo:** A 0.50 (ej: 15.25 → 15.50)

**Ejemplo:**
- Distancia: 2.5 km
- Duración: 8 minutos
- Tipo: taxi
- Hora: 8am (hora pico)
- Precio base: 5 + (2.5 × 2.5) + (8 × 0.5) = 5 + 6.25 + 4 = 15.25
- Con hora pico: 15.25 × 1.3 = 19.825
- Redondeado: **S/ 20.00**

---

#### Paso 4.2: Validar Oferta del Pasajero

```javascript
const validation = pricingService.validatePassengerOffer(
  suggestedPrice,
  passenger_offered_price
);
```

**Validación:**
- **Mínimo aceptable:** 50% del precio sugerido
- **Máximo aceptable:** 200% del precio sugerido

**Ejemplo:**
- Precio sugerido: S/ 15.50
- Oferta del pasajero: S/ 12.00
- Mínimo: S/ 7.75 ✅
- Máximo: S/ 31.00 ✅
- **Resultado:** ✅ Válido

**Si la oferta está fuera de rango:**
```javascript
throw new Error(
  `Precio ofrecido fuera de rango. Rango aceptable: S/${min} - S/${max}`
);
```

---

#### Paso 4.3: Calcular Métricas del Viaje

```javascript
const routeMetrics = await pricingService.getRouteMetrics(
  origin_lat,
  origin_lon,
  destination_lat,
  destination_lon
);
```

**Archivo:** `backend/utils/geospatial.js`

Calcula:
- **Distancia (km):** Usando fórmula Haversine
- **Duración estimada (minutos):** Basada en velocidad promedio (25 km/h en ciudad)

**Fórmula Haversine:**
```
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
c = 2 × atan2(√a, √(1-a))
distancia = R × c  (R = radio de la Tierra ≈ 6371 km)
```

---

#### Paso 4.4: Crear Solicitud en MongoDB

```javascript
const rideRequest = await RideRequest.create(rideRequestData);
```

**Archivo:** `backend/models/RideRequest.js`

**Datos guardados:**
```javascript
{
  passenger_id: ObjectId,           // ID del pasajero (de req.user.id)
  origin_lat: -14.2694,
  origin_lon: -71.2256,
  origin_address: "Plaza Principal, Sicuani",
  destination_lat: -14.27,
  destination_lon: -71.226,
  destination_address: "Mercado Central, Sicuani",
  suggested_price_soles: 15.50,     // Precio calculado por el sistema
  passenger_offered_price: 12.00,   // Precio propuesto por el pasajero
  estimated_distance_km: 2.5,
  estimated_duration_min: 8,
  vehicle_type: "taxi",
  payment_method: "cash",
  status: "bidding_active",          // Estado inicial
  expires_at: Date,                  // 2 minutos desde ahora
  createdAt: Date,
  updatedAt: Date
}
```

**Índices MongoDB:**
- `passenger_id`: Para búsquedas rápidas por pasajero
- `status`: Para filtrar por estado
- `expires_at`: Para limpiar solicitudes expiradas
- `origin_lat, origin_lon`: Para búsquedas geoespaciales

---

#### Paso 4.5: Guardar en Redis (Cache Opcional)

```javascript
await redis.setEx(
  `ride_request:${rideRequest._id}`,
  120,  // TTL: 2 minutos
  JSON.stringify(rideRequest)
);
```

**Propósito:**
- Acceso rápido a solicitudes activas
- No crítico: Si Redis falla, la app continúa

**Clave Redis:**
```
ride_request:507f1f77bcf86cd799439011
```

---

#### Paso 4.6: Notificar a Conductores Cercanos

```javascript
await this.notifyNearbyDrivers(rideRequest);
```

**Archivo:** `backend/services/bidding.service.js` (método `notifyNearbyDrivers`)

**Proceso:**

1. **Buscar conductores disponibles en MongoDB:**
   ```javascript
   User.find({
     userType: 'driver',
     'driverInfo.isOnline': true,
     'driverInfo.isAvailable': true,
     'driverInfo.currentLatitude': { $exists: true },
     'driverInfo.currentLongitude': { $exists: true },
   })
   ```

2. **Filtrar por tipo de vehículo:**
   - Si `vehicle_type !== 'any'`, solo conductores con ese tipo

3. **Filtrar por distancia (radio de 5 km):**
   - Usa fórmula Haversine para calcular distancia
   - Solo conductores dentro del radio

4. **Calcular score para cada conductor:**
   ```javascript
   score = (rating × 0.4) + (distanceScore × 0.3) + (priceScore × 0.3)
   ```
   - **Rating:** Calificación del conductor (0-5)
   - **DistanceScore:** Inversamente proporcional a la distancia
   - **PriceScore:** Basado en si acepta el precio del pasajero

5. **Ordenar por score (mejores primero)**

6. **Limitar a 20 conductores** (top 20)

7. **Enviar notificación vía Socket.io:**
   ```javascript
   io.to(`driver:${driverId}`).emit('ride:new', {
     rideId: rideRequest._id,
     origin: { lat, lon, address },
     destination: { lat, lon, address },
     passengerPrice: 12.00,
     suggestedPrice: 15.50,
     distance: 2.5,
     duration: 8,
     vehicleType: "taxi",
     paymentMethod: "cash",
     expiresAt: Date
   });
   ```

**Socket.io Rooms:**
- Cada conductor está en la room `driver:${driverId}`
- También puede estar en la room `drivers` (todos los conductores)

---

#### Paso 4.7: Programar Timeout Automático

```javascript
setTimeout(
  () => this.handleBiddingTimeout(rideRequest._id.toString()),
  this.BIDDING_TIMEOUT * 1000  // 120 segundos (2 minutos)
);
```

**Propósito:**
- Si no hay bids en 2 minutos, cancelar automáticamente
- Cambiar estado a `'cancelled'` o `'expired'`
- Notificar al pasajero

---

### 5. **Respuesta al Cliente**

**Archivo:** `backend/routes/rides.routes.js` (líneas 221-224)

```javascript
res.json({
  success: true,
  data: result,  // { rideRequest, suggestedPrice, validation }
});
```

**Response Body:**
```json
{
  "success": true,
  "data": {
    "rideRequest": {
      "_id": "507f1f77bcf86cd799439011",
      "passenger_id": "507f1f77bcf86cd799439012",
      "origin_lat": -14.2694,
      "origin_lon": -71.2256,
      "origin_address": "Plaza Principal, Sicuani",
      "destination_lat": -14.27,
      "destination_lon": -71.226,
      "destination_address": "Mercado Central, Sicuani",
      "suggested_price_soles": 15.5,
      "passenger_offered_price": 12,
      "estimated_distance_km": 2.5,
      "estimated_duration_min": 8,
      "vehicle_type": "taxi",
      "payment_method": "cash",
      "status": "bidding_active",
      "expires_at": "2025-01-18T04:07:00.000Z",
      "createdAt": "2025-01-18T04:05:00.000Z",
      "updatedAt": "2025-01-18T04:05:00.000Z"
    },
    "suggestedPrice": 15.5,
    "validation": {
      "isValid": true,
      "minAcceptable": 7.75,
      "maxAcceptable": 31.0,
      "percentageOfSuggested": 77.42
    }
  }
}
```

**Status Code:** `201 Created`

---

## 📊 Diagrama de Flujo

```
┌─────────────────┐
│  Cliente envía  │
│  POST /request  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Validación     │
│  express-validator│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ BiddingService  │
│ createRideRequest│
└────────┬────────┘
         │
         ├─► Calcular precio sugerido (PricingService)
         │   ├─► Calcular distancia/duración
         │   ├─► Aplicar ajustes (hora, zona, demanda)
         │   └─► Redondear a 0.50
         │
         ├─► Validar oferta del pasajero
         │   └─► Rango: 50% - 200% del sugerido
         │
         ├─► Calcular métricas de ruta
         │   └─► Distancia y duración
         │
         ├─► Guardar en MongoDB
         │   └─► RideRequest.create()
         │
         ├─► Guardar en Redis (opcional)
         │   └─► Cache con TTL 120s
         │
         ├─► Notificar conductores
         │   ├─► Buscar conductores cercanos (5km)
         │   ├─► Filtrar por tipo de vehículo
         │   ├─► Calcular score
         │   ├─► Ordenar y limitar (top 20)
         │   └─► Socket.io emit('ride:new')
         │
         └─► Programar timeout (2 minutos)
             └─► Si no hay bids → cancelar
         │
         ▼
┌─────────────────┐
│  Respuesta 201  │
│  { rideRequest, │
│    suggestedPrice }│
└─────────────────┘
```

---

## 🔍 Detalles Técnicos

### Cálculo de Precio Sugerido

**Fórmula completa:**
```javascript
basePrice = BANDERAZO + (distancia × PER_KM) + (tiempo × PER_MIN)

// Ajustes
if (vehicle_type === 'mototaxi') basePrice *= 0.7
if (isPeakHour) basePrice *= 1.3
if (isLateNight) basePrice *= 1.5
if (isTouristZone) basePrice *= 1.2
basePrice *= demandMultiplier

finalPrice = Math.max(basePrice, MIN_FARE)
return Math.round(finalPrice * 2) / 2  // Redondear a 0.50
```

### Búsqueda de Conductores

**Algoritmo:**
1. Query MongoDB por conductores online y disponibles
2. Filtrar por tipo de vehículo (si aplica)
3. Calcular distancia Haversine para cada conductor
4. Filtrar por radio (5 km)
5. Calcular score para cada conductor
6. Ordenar por score descendente
7. Tomar top 20
8. Enviar notificación vía Socket.io

**Score:**
```javascript
score = (rating × 0.4) + (distanceScore × 0.3) + (priceScore × 0.3)

distanceScore = 1 - (distance / maxRadius)  // Más cerca = mejor
priceScore = 1 si acepta precio, 0.5 si contraoferta
```

### Notificaciones Socket.io

**Evento emitido:**
```javascript
io.to(`driver:${driverId}`).emit('ride:new', {
  rideId: String,
  origin: { lat, lon, address },
  destination: { lat, lon, address },
  passengerPrice: Number,
  suggestedPrice: Number,
  distance: Number,
  duration: Number,
  vehicleType: String,
  paymentMethod: String,
  expiresAt: Date
});
```

**Rooms:**
- `driver:${driverId}`: Room individual del conductor
- `drivers`: Room global de todos los conductores (opcional)

---

## ⚠️ Manejo de Errores

### Errores Posibles:

1. **Validación fallida (400):**
   - Campos faltantes o inválidos
   - Precio fuera de rango

2. **Error de cálculo (500):**
   - Error en cálculo geoespacial
   - Error en MongoDB

3. **Redis no disponible:**
   - No crítico, la app continúa sin cache

4. **No hay conductores cercanos:**
   - La solicitud se crea igual
   - Se programa timeout automático

---

## 🎯 Casos de Uso

### Caso 1: Pasajero crea solicitud exitosa

1. Pasajero envía request con precio S/ 12.00
2. Sistema calcula precio sugerido: S/ 15.50
3. Validación: ✅ S/ 12.00 está en rango (S/ 7.75 - S/ 31.00)
4. Se crea solicitud en MongoDB
5. Se notifican 5 conductores cercanos
6. Respuesta 201 con datos de la solicitud

### Caso 2: Precio fuera de rango

1. Pasajero envía request con precio S/ 5.00
2. Sistema calcula precio sugerido: S/ 15.50
3. Validación: ❌ S/ 5.00 < S/ 7.75 (mínimo)
4. Error 400: "Precio ofrecido fuera de rango..."

### Caso 3: No hay conductores cercanos

1. Pasajero envía request
2. Sistema busca conductores en radio de 5 km
3. No encuentra ninguno
4. Se crea solicitud igual (status: `bidding_active`)
5. Se programa timeout de 2 minutos
6. Si no hay bids → se cancela automáticamente

---

## 📝 Notas Importantes

1. **Timeout:** La solicitud expira en 2 minutos si no hay bids
2. **Redis es opcional:** La app funciona sin Redis
3. **Búsqueda geoespacial:** Usa fórmula Haversine (sin PostgreSQL)
4. **Score de conductores:** Combina rating, distancia y precio
5. **Notificaciones:** Vía Socket.io en tiempo real
6. **Estado inicial:** `bidding_active` (esperando ofertas)

---

## 🔗 Archivos Relacionados

- **Ruta:** `backend/routes/rides.routes.js`
- **Servicio:** `backend/services/bidding.service.js`
- **Pricing:** `backend/services/pricing.service.js`
- **Modelo:** `backend/models/RideRequest.js`
- **Utils:** `backend/utils/geospatial.js`
- **Middleware:** `backend/middleware/auth.middleware.js`

---

¿Tienes alguna pregunta sobre algún paso específico? 🚀

