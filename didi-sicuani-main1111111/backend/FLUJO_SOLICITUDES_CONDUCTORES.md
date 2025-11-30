# 🚗 Flujo Completo: Solicitudes de Viaje y Conductores

## 📋 Resumen

Este documento explica el flujo completo desde que un pasajero crea una solicitud hasta que un conductor la acepta o rechaza.

---

## 🔄 Flujo Completo

### 1. **Pasajero Crea Solicitud**

**Endpoint:** `POST /api/rides/request`

**Proceso:**
1. Pasajero envía solicitud con:
   - Origen y destino (coordenadas y dirección)
   - Precio ofrecido
   - Tipo de vehículo (`taxi`, `mototaxi`, o `any`)
   - Método de pago

2. **Backend procesa:**
   - ✅ Calcula precio sugerido
   - ✅ Valida oferta del pasajero
   - ✅ Calcula métricas (distancia, duración)
   - ✅ **Guarda en MongoDB** (`RideRequest` collection)
   - ✅ Notifica a conductores vía Socket.io
   - ✅ Programa timeout automático (2 minutos)

**Datos guardados en MongoDB:**
```javascript
{
  passenger_id: ObjectId,
  origin_lat: Number,
  origin_lon: Number,
  origin_address: String,
  destination_lat: Number,
  destination_lon: Number,
  destination_address: String,
  suggested_price_soles: Number,
  passenger_offered_price: Number,
  estimated_distance_km: Number,
  estimated_duration_min: Number,
  vehicle_type: String,  // 'taxi', 'mototaxi', 'any'
  payment_method: String,
  status: 'bidding_active',
  expires_at: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

### 2. **Conductores Reciben Notificación**

**Socket.io Event:** `ride:new`

**Proceso:**
1. Backend busca TODOS los conductores del tipo de vehículo solicitado:
   - Si `vehicle_type === 'taxi'` → Solo conductores de taxi
   - Si `vehicle_type === 'mototaxi'` → Solo conductores de mototaxi
   - Si `vehicle_type === 'any'` → Todos los conductores

2. **Filtros aplicados:**
   - `userType: 'driver'`
   - `driverInfo.isOnline: true`
   - `driverInfo.isAvailable: true`
   - Tipo de vehículo coincide

3. **Notificación vía Socket.io:**
   - Emite a room `drivers`
   - Emite individualmente a cada conductor (`driver:${id}`)

**Datos enviados:**
```javascript
{
  _id: String,
  rideRequestId: String,
  passenger_id: String,
  origin: { lat, lon, address },
  destination: { lat, lon, address },
  passenger_offered_price: Number,
  suggested_price_soles: Number,
  estimated_distance_km: Number,
  estimated_duration_min: Number,
  vehicle_type: String,
  payment_method: String,
  status: String,
  expires_at: Date,
  created_at: Date
}
```

---

### 3. **Conductor Visualiza Solicitudes**

**Endpoint:** `GET /api/drivers/queue`

**Proceso:**
1. Conductor consulta su cola de viajes
2. Backend busca todas las solicitudes activas:
   - `status: 'bidding_active'`
   - `expires_at: { $gt: new Date() }` (no expiradas)
3. Filtra por tipo de vehículo del conductor
4. Calcula distancia y ETA si el conductor tiene ubicación
5. Ordena por distancia (más cercanos primero)

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
      "expires_at": "2025-01-18T04:07:00.000Z",
      "created_at": "2025-01-18T04:05:00.000Z"
    }
  ],
  "count": 1
}
```

---

### 4. **Conductor Acepta o Rechaza**

**Endpoint:** `POST /api/rides/:id/bids`

#### A. **Aceptar Solicitud**

**Request:**
```json
{
  "bid_type": "accept"
}
```

**Proceso:**
1. Backend valida:
   - ✅ Viaje existe y está activo
   - ✅ No ha expirado
   - ✅ Usuario es conductor
2. Calcula distancia y ETA del conductor
3. **Crea bid en MongoDB:**
   ```javascript
   {
     ride_request_id: ObjectId,
     driver_id: ObjectId,
     bid_type: 'accept',
     offered_price: passenger_offered_price,  // Acepta el precio del pasajero
     driver_distance_km: Number,
     driver_eta_min: Number,
     driver_rating: Number,
     status: 'pending',
     expires_at: Date,
     createdAt: Date
   }
   ```
4. Notifica al pasajero vía Socket.io (`bid:received`)
5. Evalúa auto-match (si hay múltiples aceptaciones)

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "bid_type": "accept",
    "offered_price": 12,
    "status": "pending",
    ...
  }
}
```

#### B. **Rechazar Solicitud**

**Request:**
```json
{
  "bid_type": "reject"
}
```

**Proceso:**
1. Backend valida (igual que aceptar)
2. **Crea bid en MongoDB:**
   ```javascript
   {
     ride_request_id: ObjectId,
     driver_id: ObjectId,
     bid_type: 'reject',
     offered_price: null,
     status: 'rejected',
     ...
   }
   ```
3. La solicitud permanece activa para otros conductores
4. El conductor que rechazó no verá esta solicitud en futuras consultas (opcional, se puede implementar)

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "bid_type": "reject",
    "status": "rejected",
    ...
  }
}
```

---

## 🎯 Características Implementadas

### ✅ Guardado en MongoDB

- **RideRequest:** Todas las solicitudes se guardan en MongoDB
- **Bid:** Todas las respuestas (aceptar/rechazar) se guardan en MongoDB
- **Persistencia:** Los datos persisten aunque el servidor se reinicie

### ✅ Visualización para Conductores

- **Filtrado por tipo de vehículo:** Solo ven solicitudes que coinciden con su tipo
- **Información completa:** Pasajero, origen, destino, precio, distancia, ETA
- **Tiempo real:** Nuevas solicitudes aparecen automáticamente vía Socket.io
- **Actualización manual:** Botón para recargar la cola

### ✅ Aceptar/Rechazar

- **Aceptar:** Crea bid tipo "accept" y notifica al pasajero
- **Rechazar:** Crea bid tipo "reject" (la solicitud sigue activa para otros)
- **Validaciones:** Verifica que el viaje esté activo y no haya expirado
- **Notificaciones:** El pasajero recibe notificación en tiempo real

---

## 📊 Diagrama de Flujo

```
┌─────────────────┐
│  PASAJERO       │
│  Crea Solicitud │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend        │
│  1. Valida      │
│  2. Calcula     │
│  3. GUARDA EN   │
│     MONGODB     │
└────────┬────────┘
         │
         ├─► Notifica vía Socket.io
         │
         ▼
┌─────────────────┐
│  CONDUCTORES    │
│  Reciben        │
│  Notificación   │
└────────┬────────┘
         │
         ├─► Consultan GET /api/drivers/queue
         │
         ▼
┌─────────────────┐
│  CONDUCTOR      │
│  Visualiza      │
│  Solicitudes    │
└────────┬────────┘
         │
         ├─► Acepta: POST /api/rides/:id/bids
         │   { "bid_type": "accept" }
         │
         └─► Rechaza: POST /api/rides/:id/bids
             { "bid_type": "reject" }
         │
         ▼
┌─────────────────┐
│  Backend        │
│  1. Valida      │
│  2. GUARDA BID  │
│     EN MONGODB  │
│  3. Notifica    │
│     Pasajero    │
└─────────────────┘
```

---

## 🧪 Cómo Probar

### 1. Crear Usuarios de Prueba

```bash
cd backend
node scripts/create-test-users.js
```

### 2. Pasajero Crea Solicitud

**Desde Frontend o Postman:**
```
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

**Resultado:**
- ✅ Se guarda en MongoDB
- ✅ Conductores de taxi reciben notificación
- ✅ Aparece en la cola de conductores

### 3. Conductor Ve Solicitudes

**Desde Frontend o Postman:**
```
GET /api/drivers/queue
```

**Resultado:**
- ✅ Lista todas las solicitudes activas
- ✅ Filtradas por tipo de vehículo
- ✅ Con información completa

### 4. Conductor Acepta

**Desde Frontend o Postman:**
```
POST /api/rides/:rideId/bids
{
  "bid_type": "accept"
}
```

**Resultado:**
- ✅ Se crea bid en MongoDB
- ✅ Pasajero recibe notificación
- ✅ Solicitud puede cambiar de estado

### 5. Conductor Rechaza

**Desde Frontend o Postman:**
```
POST /api/rides/:rideId/bids
{
  "bid_type": "reject"
}
```

**Resultado:**
- ✅ Se crea bid en MongoDB
- ✅ Solicitud sigue activa para otros conductores

---

## ✅ Checklist de Funcionalidades

- [x] Solicitud se guarda en MongoDB
- [x] Conductores reciben notificación vía Socket.io
- [x] Conductores pueden ver todas las solicitudes activas
- [x] Filtrado por tipo de vehículo
- [x] Conductor puede aceptar solicitud
- [x] Conductor puede rechazar solicitud
- [x] Bid se guarda en MongoDB
- [x] Pasajero recibe notificación cuando conductor acepta
- [x] Información completa en la cola (pasajero, precio, distancia, ETA)
- [x] Actualización en tiempo real

---

## 📝 Notas Importantes

1. **Persistencia:** Todo se guarda en MongoDB, no se pierde al reiniciar
2. **Filtrado:** Solo conductores del tipo de vehículo solicitado ven la solicitud
3. **Tiempo Real:** Socket.io para notificaciones instantáneas
4. **Múltiples Conductores:** Varios conductores pueden aceptar la misma solicitud
5. **Auto-Match:** El sistema evalúa automáticamente qué conductor es mejor match

---

¿Preguntas? 🚀

