# 🔄 Cambios: Notificación a Todos los Conductores

## 📋 Resumen de Cambios

Se modificó el sistema para que **TODOS los conductores del tipo de vehículo solicitado** reciban notificaciones de nuevas solicitudes de viaje, independientemente de su ubicación.

---

## ✅ Cambios Implementados

### 1. **Modificación de `notifyNearbyDrivers`**

**Archivo:** `backend/services/bidding.service.js`

**Antes:**
- ❌ Solo notificaba a conductores dentro de un radio de 5 km
- ❌ Limitaba a 20 conductores
- ❌ Filtraba por distancia usando Haversine

**Ahora:**
- ✅ Notifica a **TODOS** los conductores del tipo de vehículo solicitado
- ✅ No hay límite de conductores
- ✅ Solo filtra por:
  - Tipo de vehículo (taxi/mototaxi)
  - Estado online (`isOnline: true`)
  - Estado disponible (`isAvailable: true`)

**Lógica:**
```javascript
// Si el pasajero solicita "taxi" → Solo notifica a conductores de taxi
// Si el pasajero solicita "mototaxi" → Solo notifica a conductores de mototaxi
// Si el pasajero solicita "any" → Notifica a todos los conductores
```

**Notificaciones Socket.io:**
- Notifica a la room global `drivers`
- También notifica individualmente a cada conductor (`driver:${driverId}`)
- Esto asegura que todos reciban la notificación

---

### 2. **Implementación de Endpoint de Cola**

**Archivo:** `backend/controllers/driver.controller.js` (nuevo)

**Endpoint:** `GET /api/drivers/queue`

**Funcionalidad:**
- Muestra todas las solicitudes activas (`status: 'bidding_active'`)
- Filtra por tipo de vehículo del conductor
- Calcula distancia y ETA si el conductor tiene ubicación
- Ordena por distancia (más cercanos primero)
- Incluye información completa del pasajero y del viaje

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "passenger": {
        "id": "...",
        "name": "Juan Pasajero",
        "email": "pasajero@test.com",
        "phone": "+51987654321"
      },
      "origin": {
        "lat": -14.2694,
        "lon": -71.2256,
        "address": "Plaza Principal, Sicuani"
      },
      "destination": {
        "lat": -14.27,
        "lon": -71.226,
        "address": "Mercado Central, Sicuani"
      },
      "pricing": {
        "passenger_offered_price": 12,
        "suggested_price": 15.5
      },
      "trip": {
        "distance_km": 2.5,
        "duration_min": 8
      },
      "vehicle_type": "taxi",
      "payment_method": "cash",
      "distance_from_driver_km": 1.2,
      "eta_minutes": 3,
      "expires_at": "2025-01-18T04:07:00.000Z"
    }
  ],
  "count": 1
}
```

---

### 3. **Actualización de Ruta de Conductores**

**Archivo:** `backend/routes/driver.routes.js`

**Cambios:**
- ✅ Implementado endpoint `/queue` con controlador real
- ✅ Documentación Swagger completa
- ✅ Autenticación y autorización (solo conductores)

---

## 🔄 Flujo Actualizado

### Cuando un Pasajero Crea una Solicitud:

1. **Pasajero envía:** `POST /api/rides/request`
   - Especifica tipo de vehículo: `taxi`, `mototaxi`, o `any`

2. **Sistema busca conductores:**
   - Busca TODOS los conductores con:
     - `userType: 'driver'`
     - `driverInfo.isOnline: true`
     - `driverInfo.isAvailable: true`
   - Filtra por tipo de vehículo si es específico

3. **Notificaciones Socket.io:**
   - Emite `ride:new` a la room `drivers`
   - Emite `ride:new` individualmente a cada conductor (`driver:${id}`)

4. **Conductores reciben notificación:**
   - En tiempo real vía Socket.io
   - Pueden ver la solicitud en su cola (`GET /api/drivers/queue`)

5. **Conductor puede:**
   - **Aceptar:** `POST /api/rides/:id/bids` con `bid_type: 'accept'`
   - **Contraofertar:** `POST /api/rides/:id/bids` con `bid_type: 'counteroffer'` y `offered_price`
   - **Rechazar:** `POST /api/rides/:id/bids` con `bid_type: 'reject'`

---

## 📊 Comparación: Antes vs Ahora

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Radio de notificación** | 5 km | Sin límite (todos) |
| **Límite de conductores** | 20 | Sin límite |
| **Filtro principal** | Distancia | Tipo de vehículo |
| **Notificación Socket.io** | Solo room `drivers` | Room `drivers` + individual |
| **Cola de viajes** | No implementada | ✅ Implementada |

---

## 🧪 Cómo Probar

### 1. Crear Usuarios de Prueba

```bash
cd backend
node scripts/create-test-users.js
```

Esto crea:
- Pasajero: `pasajero@test.com`
- Conductor Taxi: `conductor.taxi@test.com`
- Conductor Mototaxi: `conductor.mototaxi@test.com`

### 2. Pasajero Crea Solicitud

```bash
# Login como pasajero
POST /api/auth/login
{
  "email": "pasajero@test.com",
  "password": "test123"
}

# Crear solicitud
POST /api/rides/request
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

### 3. Conductor Ve la Solicitud

```bash
# Login como conductor
POST /api/auth/login
{
  "email": "conductor.taxi@test.com",
  "password": "test123"
}

# Ver cola de viajes
GET /api/drivers/queue
```

**Debería mostrar:**
- ✅ La solicitud del pasajero
- ✅ Información completa del viaje
- ✅ Distancia y ETA (si el conductor tiene ubicación)

### 4. Conductor Acepta o Rechaza

```bash
# Aceptar
POST /api/rides/:rideId/bids
{
  "bid_type": "accept"
}

# Contraofertar
POST /api/rides/:rideId/bids
{
  "bid_type": "counteroffer",
  "offered_price": 13.5
}

# Rechazar
POST /api/rides/:rideId/bids
{
  "bid_type": "reject"
}
```

---

## 🔍 Notas Importantes

### Filtrado por Tipo de Vehículo

- **Si pasajero solicita `taxi`:**
  - Solo conductores con `driverInfo.vehicleType === 'taxi'` reciben notificación
  - Conductores de mototaxi NO reciben notificación

- **Si pasajero solicita `mototaxi`:**
  - Solo conductores con `driverInfo.vehicleType === 'mototaxi'` reciben notificación
  - Conductores de taxi NO reciben notificación

- **Si pasajero solicita `any`:**
  - TODOS los conductores (taxi y mototaxi) reciben notificación

### Estado del Conductor

Para recibir notificaciones, el conductor debe tener:
- `driverInfo.isOnline: true`
- `driverInfo.isAvailable: true`

### Socket.io

Los conductores deben estar conectados vía Socket.io para recibir notificaciones en tiempo real. Si no están conectados, pueden ver las solicitudes consultando el endpoint `/api/drivers/queue`.

---

## ✅ Resultado

Ahora cuando un pasajero crea una solicitud:

1. ✅ **TODOS los conductores del tipo de vehículo solicitado** reciben notificación
2. ✅ Los conductores pueden ver la solicitud en su cola (`GET /api/drivers/queue`)
3. ✅ Los conductores pueden aceptar, contraofertar o rechazar
4. ✅ No hay límite de distancia (todos los conductores disponibles ven la solicitud)

---

¿Preguntas? 🚀

