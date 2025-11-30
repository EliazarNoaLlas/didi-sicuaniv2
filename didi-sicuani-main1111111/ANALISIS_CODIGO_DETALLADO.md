# Análisis Detallado del Código - DiDi-Sicuani

## 📋 Índice
1. [Arquitectura General](#arquitectura-general)
2. [Backend - Análisis por Archivo](#backend---análisis-por-archivo)
3. [Frontend - Análisis](#frontend---análisis)
4. [Mobile - Análisis](#mobile---análisis)
5. [Base de Datos](#base-de-datos)
6. [Flujos de Negocio](#flujos-de-negocio)
7. [Observaciones y Recomendaciones](#observaciones-y-recomendaciones)

---

## 🏗️ Arquitectura General

### Stack Tecnológico
- **Backend**: Node.js + Express 5.1.0 + MongoDB + PostgreSQL + Redis + Socket.io
- **Frontend**: React 19.2.0 + Vite 7.2.2 + Tailwind CSS + Material UI
- **Mobile**: React Native 0.73.0 + Mapbox GL
- **Bases de Datos**:
  - MongoDB: Datos transaccionales (usuarios, viajes, bids)
  - PostgreSQL + PostGIS: Datos geoespaciales y routing
  - Redis: Cache y colas

### Patrón de Arquitectura
- **MVC (Model-View-Controller)** en backend
- **Servicios de Negocio** separados de controladores
- **WebSockets** para comunicación en tiempo real
- **JWT** para autenticación stateless

---

## 🔧 Backend - Análisis por Archivo

### 1. `server.js` - Punto de Entrada Principal

**Propósito**: Configuración e inicialización del servidor Express y Socket.io

**Componentes Clave**:
- **Express App**: Configuración de middleware (helmet, compression, cors, morgan)
- **HTTP Server**: Creado explícitamente para Socket.io
- **Socket.io**: Configurado con CORS para comunicación en tiempo real
- **Rutas**: 9 módulos de rutas importados y montados
- **Error Handling**: Middleware global para manejo de errores
- **Health Check**: Endpoint `/health` para monitoreo

**Flujo de Inicialización**:
1. Carga variables de entorno
2. Crea servidor HTTP
3. Inicializa Socket.io
4. Configura middleware
5. Monta rutas
6. Conecta a MongoDB y Redis
7. Inicia servidor en puerto 5000

**Observaciones**:
- ✅ Buena separación de responsabilidades
- ✅ Manejo de errores robusto
- ⚠️ Falta rate limiting específico (solo mencionado en package.json)
- ✅ Exporta `io` para uso en otros módulos

---

### 2. `config/database.js` - Conexión MongoDB

**Propósito**: Gestión de conexión a MongoDB usando Mongoose

**Características**:
- Conexión asíncrona con manejo de errores
- Event listeners para errores y desconexiones
- Logging de estado de conexión

**Observaciones**:
- ✅ Manejo básico pero funcional
- ⚠️ No hay configuración de opciones avanzadas (pool size, timeouts)
- ⚠️ No hay retry logic para reconexión automática

---

### 3. `config/postgres.js` - Conexión PostgreSQL + PostGIS

**Propósito**: Pool de conexiones PostgreSQL para operaciones geoespaciales

**Características**:
- **Connection Pooling**: Máximo 20 conexiones simultáneas
- **Timeout Configurado**: 30s idle, 2s connection
- **Test de Conexión**: Verifica conectividad al inicializar
- **Singleton Pattern**: Una sola instancia del pool

**Funciones Exportadas**:
- `createPostgresPool()`: Crea el pool
- `getPostgresPool()`: Obtiene el pool existente

**Observaciones**:
- ✅ Pooling bien configurado
- ✅ Manejo de errores en eventos del pool
- ⚠️ No hay reconexión automática si se pierde la conexión

---

### 4. `config/redis.js` - Conexión Redis

**Propósito**: Cliente Redis para cache y colas

**Características**:
- Cliente único (singleton)
- Event listeners para errores y conexión
- Función `getRedisClient()` con validación

**Observaciones**:
- ✅ Patrón singleton bien implementado
- ⚠️ No hay manejo de reconexión automática
- ⚠️ No hay configuración de TTL por defecto

---

### 5. `middleware/auth.middleware.js` - Autenticación JWT

**Funciones**:

#### `authenticate(req, res, next)`
- Extrae token del header `Authorization`
- Verifica token con `jwt.verify()`
- Agrega `req.user` con datos decodificados
- Retorna 401 si no hay token o es inválido

#### `authorize(...roles)`
- Middleware factory que valida roles
- Verifica que `req.user.userType` esté en la lista de roles permitidos
- Retorna 403 si no tiene permisos

**Observaciones**:
- ✅ Implementación estándar y segura
- ✅ Separación clara entre autenticación y autorización
- ⚠️ No hay refresh tokens implementados
- ⚠️ No hay blacklist de tokens revocados

---

### 6. Modelos MongoDB

#### `models/User.js`
**Schema**:
- Campos básicos: `name`, `email`, `password`, `phone`
- `userType`: Enum ['passenger', 'driver', 'admin']
- `driverInfo`: Objeto anidado con información del conductor
  - `vehicleType`: 'taxi' o 'mototaxi'
- `isActive`: Flag para usuarios activos/desactivados

**Índices**:
- `email`: Único
- `userType`: Para búsquedas por rol
- `driverInfo.isOnline` + `driverInfo.isAvailable`: Para encontrar conductores disponibles

**Observaciones**:
- ✅ Schema bien estructurado
- ✅ Índices apropiados
- ⚠️ `password` con `select: false` es correcto pero requiere `.select('+password')` en login
- ⚠️ No hay validación de email con regex

#### `models/RideRequest.js`
**Schema Completo**:
- **Geolocalización**: `origin_lat/lon`, `destination_lat/lon` con direcciones
- **Pricing**: `suggested_price_soles`, `passenger_offered_price`, `final_agreed_price`
- **Métricas**: `estimated_distance_km`, `estimated_duration_min`
- **Preferencias**: `vehicle_type`, `payment_method`
- **Estado**: Enum con 7 estados posibles
- **Matching**: `matched_driver_id`, `matched_at`
- **Expiración**: `expires_at` para timeout de bidding

**Índices**:
- `passenger_id`, `status`, `expires_at`
- Índice geoespacial en `origin_lat/lon`

**Observaciones**:
- ✅ Schema completo y bien diseñado
- ✅ Manejo de estados claro
- ⚠️ No hay índice compuesto para búsquedas frecuentes (status + expires_at)

#### `models/Bid.js`
**Schema**:
- Referencias a `RideRequest` y `User` (driver)
- `bid_type`: 'accept', 'counteroffer', 'reject'
- `offered_price`: Solo para counteroffers
- Métricas del conductor: `driver_distance_km`, `driver_eta_min`, `driver_rating`
- `status`: 'pending', 'accepted', 'rejected', 'expired'
- `expires_at`: TTL para bids

**Observaciones**:
- ✅ Estructura clara para reverse bidding
- ✅ Incluye métricas útiles para matching
- ⚠️ `bid_type: 'reject'` parece redundante con `status: 'rejected'`

#### `models/BidNegotiation.js`
**Schema**:
- Rastrea negociaciones multi-ronda
- `round_number`: Máximo 2 rondas
- `initiator`: 'passenger' o 'driver'
- `offered_price` y `message` opcional

**Observaciones**:
- ✅ Diseñado para negociaciones complejas
- ⚠️ No se usa actualmente en el código (marcado como TODO)

---

### 7. Controladores

#### `controllers/auth.controller.js`

##### `login(req, res)`
**Flujo**:
1. Busca usuario por email (con password incluido)
2. Compara password con bcrypt
3. Genera JWT con id, email, userType
4. Retorna token y datos del usuario (sin password)

**Observaciones**:
- ✅ Uso correcto de bcrypt
- ✅ No expone password en respuesta
- ⚠️ Mensaje genérico "Invalid credentials" (buena práctica de seguridad)
- ⚠️ No hay rate limiting específico para login

##### `register(req, res)`
**Flujo**:
1. Verifica si usuario existe
2. Hashea password con bcrypt (salt rounds: 10)
3. Crea usuario en MongoDB
4. Retorna datos sin password

**Observaciones**:
- ✅ Validación de usuario existente
- ✅ Password hasheado correctamente
- ⚠️ No hay validación de fortaleza de password
- ⚠️ No hay verificación de email

#### `controllers/bidding.controller.js`

##### `createRideRequest(req, res)`
**Flujo Completo**:
1. Extrae datos del request
2. Calcula precio sugerido con `pricingService`
3. Valida oferta del pasajero (rango aceptable)
4. Calcula métricas de ruta (distancia, duración)
5. Crea `RideRequest` en MongoDB
6. Guarda en Redis con TTL de 120s
7. Notifica conductores vía Socket.io
8. Retorna ride request creado

**Observaciones**:
- ✅ Lógica bien estructurada
- ✅ Validación de precio antes de crear
- ✅ Cache en Redis para acceso rápido
- ⚠️ No hay validación de coordenadas (lat/lon válidos)
- ⚠️ Manejo de errores podría ser más específico

##### `submitBid(req, res)`
**Flujo**:
1. Valida que usuario sea conductor
2. Crea bid en MongoDB
3. Notifica pasajero vía Socket.io
4. Retorna bid creado

**Observaciones**:
- ✅ Validación de rol
- ⚠️ No valida que el ride request exista o esté activo
- ⚠️ No calcula métricas del conductor (distancia, ETA)
- ⚠️ Funciones `acceptBid`, `rejectBid`, `getBidsForRide` están como TODO

---

### 8. Servicios de Negocio

#### `services/bidding.service.js` - Servicio Completo de Bidding

**Clase `BiddingService`** con constantes configurables:
- `BIDDING_TIMEOUT`: 120 segundos
- `BID_EXPIRY`: 30 segundos
- `MAX_NEGOTIATION_ROUNDS`: 2
- `NOTIFICATION_RADIUS_KM`: 5km inicial
- `MAX_NOTIFICATION_RADIUS_KM`: 15km máximo

##### `createRideRequest(passengerId, rideData)`
**Flujo Detallado**:
1. Calcula precio sugerido
2. Valida oferta del pasajero
3. Calcula métricas de ruta
4. Crea ride request con `expires_at`
5. Guarda en Redis con TTL
6. Notifica conductores cercanos
7. Programa timeout automático

**Observaciones**:
- ✅ Lógica completa y bien estructurada
- ✅ Manejo de timeouts automático
- ✅ Integración con PostgreSQL para búsqueda de conductores

##### `notifyNearbyDrivers(rideRequest, radiusKm)`
**Funcionalidad**:
- Usa función PostgreSQL `find_nearby_drivers()`
- Filtra por tipo de vehículo
- Emite evento Socket.io a sala 'drivers'
- Retorna lista de conductores notificados

**Observaciones**:
- ✅ Integración eficiente con PostGIS
- ✅ Radio de búsqueda configurable
- ⚠️ Depende de tabla `drivers` en PostgreSQL (no está en MongoDB)

##### `submitBid(driverId, rideRequestId, bidType, offeredPrice)`
**Flujo Completo**:
1. Valida que ride request esté activo
2. Obtiene información del conductor
3. Calcula distancia y ETA del conductor al pickup
4. Valida tipo de bid
5. Crea bid en MongoDB
6. Notifica pasajero
7. Si es 'accept', evalúa auto-match

**Observaciones**:
- ✅ Validaciones completas
- ✅ Cálculo de métricas del conductor
- ✅ Auto-match inteligente

##### `evaluateAutoMatch(rideRequestId, newBid)`
**Algoritmo de Matching**:
1. Obtiene todos los bids tipo 'accept'
2. Calcula score de matching para cada bid:
   - **40%**: Proximidad (menor distancia = mejor)
   - **30%**: Rating del conductor
   - **20%**: Tiempo de respuesta
   - **10%**: Experiencia (total viajes)
3. Si score >= 0.75, auto-asigna al mejor conductor

**Observaciones**:
- ✅ Algoritmo bien balanceado
- ✅ Threshold configurable (0.75)
- ✅ Considera múltiples factores

##### `calculateMatchingScore(bid, driver)`
**Fórmula**:
```javascript
score = (proximity * 0.4) + (rating * 0.3) + (responseTime * 0.2) + (experience * 0.1)
```

**Observaciones**:
- ✅ Pesos bien distribuidos
- ✅ Normalización de valores
- ⚠️ Podría incluir factor de precio (si hay counteroffers)

##### `handleBiddingTimeout(rideRequestId)`
**Lógica de Expansión**:
1. Verifica si hay bids pendientes
2. Si no hay bids y radio < máximo:
   - Expande radio de búsqueda (+5km)
   - Extiende timeout 60s
   - Reprograma timeout
3. Si radio máximo alcanzado:
   - Cancela ride request

**Observaciones**:
- ✅ Estrategia inteligente de expansión
- ✅ Evita cancelaciones prematuras
- ✅ Manejo de casos edge

---

#### `services/pricing.service.js` - Servicio de Precios

**Constantes de Tarifas**:
- `BASE_FARE`: S/ 5.00 (banderazo)
- `PER_KM_RATE`: S/ 2.50 por km
- `PER_MIN_RATE`: S/ 0.50 por minuto
- `MIN_FARE`: S/ 7.00 (tarifa mínima)

**Multiplicadores**:
- `PEAK_HOURS_MULTIPLIER`: 1.3 (7-9am, 5-7pm)
- `LATE_NIGHT_MULTIPLIER`: 1.5 (11pm-5am)
- `TOURIST_ZONE_MULTIPLIER`: 1.2
- `MOTOTAXI_DISCOUNT`: 0.7 (30% más barato)

##### `calculateSuggestedPrice(rideRequest)`
**Algoritmo de Precio**:
1. Calcula métricas de ruta (distancia, tiempo)
2. Precio base = banderazo + (km × tarifa/km) + (min × tarifa/min)
3. Aplica descuento si es mototaxi
4. Aplica multiplicadores por hora del día
5. Aplica multiplicador por zona turística
6. Aplica multiplicador por oferta/demanda
7. Aplica tarifa mínima
8. Redondea a 0.50

**Observaciones**:
- ✅ Algoritmo completo y realista
- ✅ Considera múltiples factores
- ✅ Integración con PostgreSQL para métricas
- ⚠️ `isTouristZone()` tiene solo una zona hardcodeada

##### `getRouteMetrics(originLat, originLon, destLat, destLon)`
**Funcionalidad**:
- Usa función PostgreSQL `calculate_trip_metrics()`
- Retorna distancia en km y duración en minutos

**Observaciones**:
- ✅ Delegación eficiente a PostgreSQL
- ⚠️ No hay manejo de errores si PostgreSQL falla

##### `getSupplyDemandRatio(lat, lon)`
**Query Complejo**:
- Calcula conductores disponibles en 5km
- Calcula viajes pendientes en 5km
- Retorna ratio supply/demand

**Observaciones**:
- ✅ Query geoespacial eficiente
- ✅ Usa ST_DWithin para búsqueda circular
- ⚠️ Depende de tablas `drivers` y `ride_requests` en PostgreSQL

##### `validatePassengerOffer(suggestedPrice, offeredPrice)`
**Validación**:
- Mínimo: 50% del precio sugerido
- Máximo: 200% del precio sugerido
- Retorna porcentaje del sugerido

**Observaciones**:
- ✅ Rango razonable
- ✅ Información útil para UI

---

#### `services/metrics.service.js` - Servicio de Métricas

**Métodos Principales**:

##### `getDashboardMetrics()`
**Métricas Calculadas**:
- Total de viajes
- Viajes activos
- Total conductores
- Conductores online
- Total pasajeros
- Ingresos totales (15% comisión)

**Observaciones**:
- ✅ Métricas útiles para dashboard
- ✅ Uso de Promise.all para paralelización
- ⚠️ `calculateRevenue()` itera sobre todos los viajes (podría ser lento)

##### `getRideMetrics()`
**Funcionalidad**:
- Viajes por hora (últimas 24 horas)
- Agrupa por hora del día

**Observaciones**:
- ✅ Útil para gráficos temporales
- ⚠️ Hace 24 queries a MongoDB (podría optimizarse con aggregation)

##### `getDriverMetrics()`
**Funcionalidad**:
- Distribución por tipo de vehículo
- Usa aggregation pipeline de MongoDB

**Observaciones**:
- ✅ Uso eficiente de aggregation
- ✅ Retorna datos listos para gráficos

##### `getRevenueMetrics()`
**Funcionalidad**:
- Ingresos diarios (últimos 7 días)
- Calcula comisión del 15% por viaje

**Observaciones**:
- ✅ Útil para análisis de ingresos
- ⚠️ Itera sobre todos los viajes completados (podría ser lento con muchos datos)

##### `getBiddingMetrics()`
**Métricas**:
- Total bids
- Bids aceptados
- Counteroffers
- Tasa de aceptación
- Promedio de bids por viaje

**Observaciones**:
- ✅ Métricas completas del sistema de bidding
- ✅ Usa aggregation para promedio

---

### 9. Utilidades

#### `utils/socket.js` - Configuración Socket.io

**Funcionalidades**:

##### Middleware de Autenticación
- Valida JWT en handshake
- Agrega `socket.userId` y `socket.userType`
- Rechaza conexiones sin token válido

##### Eventos de Conexión
- Usuario se une a sala `user:${userId}`
- Se une a sala por rol ('drivers', 'passengers', 'admins')

##### Eventos Manejados:
- `ride:request`: Broadcast a conductores
- `ride:accept`: Notifica pasajero
- `bid:submit`: Notifica pasajero sobre bid
- `driver:location`: Broadcast ubicación del conductor

**Observaciones**:
- ✅ Autenticación en Socket.io bien implementada
- ✅ Salas por usuario y por rol
- ⚠️ No hay rate limiting en eventos
- ⚠️ No hay validación de datos en eventos

#### `utils/cron.js` - Tareas Programadas

**Cron Jobs Configurados**:

1. **Actualización de Métricas** (`*/5 * * * *` - cada 5 minutos)
   - Calcula métricas del dashboard
   - Emite actualización vía Socket.io a admins

2. **Limpieza de Bids Expirados** (`0 * * * *` - cada hora)
   - Marca bids pendientes expirados como 'expired'

3. **Procesamiento de Viajes Expirados** (`*/30 * * * *` - cada 30 minutos)
   - Procesa viajes con `bidding_active` expirados
   - Llama a `handleBiddingTimeout()`

**Observaciones**:
- ✅ Tareas útiles para mantenimiento
- ✅ Logging de ejecución
- ⚠️ No hay manejo de errores robusto (solo console.error)

---

### 10. Rutas API

#### `routes/auth.routes.js`
**Endpoints**:
- `POST /api/auth/login`
- `POST /api/auth/register`

**Validaciones**:
- Email válido
- Password requerido (mínimo 6 caracteres)
- Name requerido
- userType válido

**Observaciones**:
- ✅ Validaciones con express-validator
- ✅ Rutas bien estructuradas

#### `routes/bidding.routes.js`
**Endpoints**:
- `POST /api/bidding/request` - Crear solicitud
- `POST /api/bidding/bid` - Enviar bid
- `POST /api/bidding/accept/:bidId` - Aceptar bid
- `POST /api/bidding/reject/:bidId` - Rechazar bid
- `GET /api/bidding/ride/:rideId` - Obtener bids

**Validaciones**:
- Coordenadas requeridas
- Precio válido
- Tipo de vehículo válido
- IDs válidos

**Observaciones**:
- ✅ Rutas protegidas con `authenticate`
- ✅ Validaciones completas
- ⚠️ Algunos endpoints tienen TODOs en controladores

#### `routes/driver.routes.js`
**Endpoints**:
- `GET /api/drivers/queue` - Cola de viajes (TODO)

**Observaciones**:
- ⚠️ Muy básico, necesita implementación completa
- ✅ Protección con `authenticate` y `authorize('driver')`

#### `routes/admin.routes.js`
**Endpoints**:
- `GET /api/admin/metrics` - Métricas generales
- `GET /api/admin/metrics/rides` - Métricas de viajes
- `GET /api/admin/metrics/drivers` - Métricas de conductores
- `GET /api/admin/metrics/revenue` - Métricas de ingresos
- `GET /api/admin/metrics/bidding` - Métricas de bidding

**Observaciones**:
- ✅ Rutas completas y funcionales
- ✅ Protección con `authenticate` y `authorize('admin')`
- ✅ Emite actualizaciones vía Socket.io

#### `routes/rides.routes.js` - Rutas Completas de Viajes
**Endpoints Implementados**:

##### `POST /api/rides/calculate-price`
- Calcula precio sugerido sin crear viaje
- Retorna precio, distancia, duración y rango aceptable
- Útil para mostrar precio antes de solicitar

##### `POST /api/rides/request`
- Crea solicitud de viaje usando `biddingService`
- Endpoint principal para solicitar viaje

##### `GET /api/rides/:id`
- Obtiene detalles de un viaje
- Incluye todos los bids asociados con información del conductor
- Popula datos del conductor (name, vehicleType, rating, totalRides)

##### `POST /api/rides/:id/cancel`
- Cancela un viaje
- Usa `biddingService.cancelRideRequest()`

##### `POST /api/rides/:id/bids`
- Conductor envía bid (accept/counteroffer/reject)
- Usa `biddingService.submitBid()`

##### `POST /api/rides/:id/bids/:bidId/respond`
- Pasajero responde a contraoferta
- Acciones: 'accept', 'counter', 'reject'
- Usa `biddingService.handleCounteroffer()`

##### `GET /api/rides/route`
- Obtiene geometría de ruta para visualización
- Usa función PostgreSQL `calculate_route()`
- Retorna GeoJSON de la ruta
- Incluye tiempo total y distancia total

**Observaciones**:
- ✅ Rutas muy completas y bien implementadas
- ✅ Validaciones con express-validator
- ✅ Uso correcto de servicios de negocio
- ✅ Endpoint de cálculo de precio separado (buena práctica)
- ✅ Endpoint de ruta para mapas bien implementado

#### `routes/geocoding.routes.js`
**Endpoints**:
- `POST /api/geocoding/geocode` - TODO (no implementado)

**Observaciones**:
- ⚠️ Solo estructura básica, sin implementación
- ✅ Protección con `authenticate`

#### `routes/route.routes.js`
**Endpoints**:
- `POST /api/routes/calculate` - TODO (no implementado)

**Observaciones**:
- ⚠️ Solo estructura básica, sin implementación
- ⚠️ Parece redundante con `/api/rides/route`
- ✅ Protección con `authenticate`

#### `routes/queue.routes.js`
**Endpoints**:
- `GET /api/queue/` - TODO (no implementado)

**Observaciones**:
- ⚠️ Solo estructura básica
- ✅ Protección con `authenticate` y `authorize('driver')`
- ⚠️ Debería implementar cola de viajes ordenada por prioridad

#### `routes/user.routes.js`
**Endpoints**:
- `GET /api/users/profile` - Retorna datos del usuario autenticado

**Observaciones**:
- ✅ Endpoint básico funcional
- ⚠️ Solo retorna `req.user` (datos del JWT)
- ⚠️ Debería obtener datos completos de MongoDB

---

## 🎨 Frontend - Análisis

### Estado Actual
El frontend está en estado **básico/inicial**. El archivo `App.jsx` contiene solo el template por defecto de Vite + React.

**Archivos Analizados**:
- `App.jsx`: Template básico (no implementado)
- `main.jsx`: Entry point estándar de React

**Dependencias Instaladas**:
- React 19.2.0
- Material UI 7.3.5
- Tailwind CSS 4.1.17
- Recharts 3.4.1 (para gráficos)
- Zustand 5.0.8 (estado global)
- Socket.io Client 4.8.1
- React Router 7.9.6

**Observaciones**:
- ⚠️ Frontend no está implementado aún
- ✅ Dependencias correctas para el proyecto
- ✅ Configuración de Vite lista

---

## 📱 Mobile - Análisis

### `screens/RequestRideScreen.js`

**Componente Completo de Solicitud de Viaje**

#### Estado del Componente:
- `origin`, `destination`: Coordenadas y direcciones
- `suggestedPrice`, `offeredPrice`: Precios
- `priceRange`: Rango aceptable
- `vehicleType`: 'taxi' o 'mototaxi'
- `routeGeometry`: Geometría de la ruta para mapa
- `bids`: Lista de ofertas recibidas
- `rideRequestId`: ID del viaje activo
- `isLoading`: Estado de carga

#### Funcionalidades:

##### `calculateSuggestedPrice()`
- Llama a API `/rides/calculate-price`
- Actualiza precio sugerido y rango
- Se ejecuta cuando cambian origen/destino

##### `fetchRoute()`
- Obtiene geometría de ruta de API
- Usa para dibujar ruta en mapa

##### `requestRide()`
- Crea solicitud de viaje
- Inicia polling de bids cada 2s
- Navega a pantalla de viaje en progreso cuando se asigna

##### `startBidPolling(requestId)`
- Polling cada 2 segundos
- Obtiene bids actualizados
- Se detiene cuando viaje es asignado o después de 2 minutos

##### `acceptBid(bidId)`
- Acepta oferta de conductor
- Navega a pantalla de viaje

##### Integración Socket.io:
- Escucha `bid:received` para nuevos bids
- Escucha `ride:accepted` para confirmación

#### UI:
- **Mapa Mapbox**: Muestra origen, destino y ruta
- **Selector de Vehículo**: Taxi o Mototaxi
- **Input de Precio**: Con validación de rango
- **Lista de Bids**: Cards con información del conductor
- **Acciones**: Aceptar o contraoferta

**Observaciones**:
- ✅ Componente completo y funcional
- ✅ Integración con API y Socket.io
- ✅ UI bien estructurada
- ⚠️ Polling cada 2s puede ser ineficiente (mejor usar solo Socket.io)
- ⚠️ No hay manejo de errores de red robusto

### `services/api.js`

**Cliente Axios Configurado**

**Características**:
- Base URL configurable
- Interceptor de request: Agrega token JWT de AsyncStorage
- Interceptor de response: Maneja 401 (logout automático)

**Observaciones**:
- ✅ Configuración estándar y correcta
- ✅ Manejo de autenticación automático
- ⚠️ No hay retry logic para requests fallidos
- ⚠️ No hay timeout configurado

### `hooks/useSocket.js` - Hook de Socket.io

**Funcionalidad**:
- Hook personalizado para manejar conexión Socket.io
- Obtiene token de AsyncStorage
- Configura autenticación en handshake
- Maneja eventos de conexión/desconexión
- Limpia conexión al desmontar componente

**Características**:
- Singleton pattern (una sola conexión)
- Autenticación automática con token
- Soporte para websocket y polling (fallback)

**Observaciones**:
- ✅ Implementación correcta de hook personalizado
- ✅ Manejo de ciclo de vida del componente
- ✅ Autenticación integrada
- ⚠️ No hay reconexión automática si se pierde conexión
- ⚠️ No hay manejo de errores de autenticación

### `config/MapConfig.js` - Configuración de Mapas

**Configuraciones**:

##### Mapbox
- Token de acceso configurable
- Estilo: 'mapbox://styles/mapbox/streets-v11'

##### Bounds de Sicuani
- **Noreste**: [-71.1, -14.1]
- **Suroeste**: [-71.3, -14.4]
- **Centro**: [-14.2694, -71.2256]

##### Configuración Offline
- Pack offline para área de Sicuani
- Zoom mínimo: 10, máximo: 18
- Permite uso sin conexión

##### URLs de API
- Desarrollo: `http://localhost:5000/api`
- Producción: `https://api.didi-sicuani.com/api`
- Socket URL configurado también

**Observaciones**:
- ✅ Configuración completa y bien estructurada
- ✅ Soporte para desarrollo y producción
- ✅ Configuración offline lista
- ⚠️ Token de Mapbox hardcodeado (debería estar en .env)
- ✅ Bounds bien definidos para Sicuani

---

## 🗄️ Base de Datos

### PostgreSQL + PostGIS

#### `postgres-geo/init.sql`

**Extensiones Creadas**:
- `postgis`: Funcionalidades geoespaciales
- `postgis_topology`: Topología espacial
- `pgrouting`: Routing y navegación
- `hstore`: Almacenamiento clave-valor

**Tabla `sicuani_road_network`**:
- Almacena red de calles de OSM
- Campos: `osm_id`, `name`, `highway`, `oneway`, `maxspeed`
- Geometría: `LINESTRING` en SRID 4326
- Campos de routing: `source`, `target`, `cost`, `reverse_cost`
- `congestion_factor`: Factor de congestión dinámico
- `vehicle_type`: Filtro por tipo de vehículo

**Funciones PostgreSQL**:

##### `find_nearest_node(lat, lon, search_radius_meters)`
- Encuentra nodo más cercano en la red
- Usa operador `<->` (distance) de PostGIS
- Retorna ID del nodo

##### `calculate_route(origin_lat, origin_lon, dest_lat, dest_lon, vehicle_type)`
- Calcula ruta óptima usando A* algorithm
- Retorna secuencia de nodos y edges
- Incluye geometría de la ruta
- Filtra por tipo de vehículo

**Observaciones**:
- ✅ Algoritmo A* más eficiente que Dijkstra
- ✅ Soporte para vehículos específicos
- ⚠️ Requiere topología creada con `pgr_createTopology()`

##### `calculate_trip_metrics(origin_lat, origin_lon, dest_lat, dest_lon)`
- Calcula distancia total en km
- Calcula duración en minutos
- Calcula precio base
- Fallback a cálculo euclidiano si no hay ruta

**Observaciones**:
- ✅ Manejo de errores con fallback
- ✅ Retorna métricas útiles

##### `find_nearby_drivers(passenger_lat, passenger_lon, radius_km, vehicle_filter)`
- Busca conductores en radio especificado
- Calcula distancia y ETA
- Calcula score de aceptación
- Ordena por score descendente
- Limita a 20 resultados

**Score de Aceptación**:
- 40%: Proximidad
- 40%: Rating
- 20%: Tipo de vehículo match

**Observaciones**:
- ✅ Query geoespacial eficiente con ST_DWithin
- ✅ Score bien balanceado
- ⚠️ Depende de tabla `drivers` en PostgreSQL (no MongoDB)

---

## 🔄 Flujos de Negocio

### 1. Flujo de Solicitud de Viaje (Reverse Bidding)

```
Pasajero → Crea solicitud con precio ofrecido
    ↓
Sistema calcula precio sugerido
    ↓
Valida rango aceptable (50%-200%)
    ↓
Crea RideRequest en MongoDB
    ↓
Guarda en Redis (TTL 120s)
    ↓
Busca conductores cercanos (PostGIS)
    ↓
Notifica conductores vía Socket.io
    ↓
Conductores reciben notificación
    ↓
Conductor envía bid (accept/counteroffer)
    ↓
Sistema calcula métricas del conductor
    ↓
Notifica pasajero vía Socket.io
    ↓
Si bid es 'accept' → Evalúa auto-match
    ↓
Pasajero acepta bid
    ↓
Sistema asigna viaje al conductor
    ↓
Notifica ambos usuarios
```

### 2. Flujo de Auto-Matching

```
Bid tipo 'accept' recibido
    ↓
Sistema obtiene todos los bids 'accept' pendientes
    ↓
Calcula matching score para cada bid:
    - Proximidad (40%)
    - Rating (30%)
    - Tiempo de respuesta (20%)
    - Experiencia (10%)
    ↓
Si mejor score >= 0.75:
    → Auto-asigna al mejor conductor
    → Rechaza otros bids
    → Notifica usuarios
```

### 3. Flujo de Timeout de Bidding

```
RideRequest expira (120s)
    ↓
Sistema verifica si hay bids pendientes
    ↓
Si NO hay bids:
    → Expande radio de búsqueda (+5km)
    → Extiende timeout 60s
    → Reprograma timeout
    ↓
Si radio máximo alcanzado:
    → Cancela ride request
    → Notifica pasajero
```

### 4. Flujo de Cálculo de Precio

```
Origen y destino definidos
    ↓
Sistema calcula ruta (PostGIS + pgRouting)
    ↓
Obtiene distancia y duración
    ↓
Calcula precio base:
    Banderazo + (km × tarifa/km) + (min × tarifa/min)
    ↓
Aplica descuento si es mototaxi (30%)
    ↓
Aplica multiplicadores:
    - Hora pico (1.3x)
    - Madrugada (1.5x)
    - Zona turística (1.2x)
    - Oferta/demanda (0.85x - 1.4x)
    ↓
Aplica tarifa mínima
    ↓
Redondea a 0.50
    ↓
Retorna precio sugerido
```

---

## 📊 Observaciones y Recomendaciones

### ✅ Fortalezas del Código

1. **Arquitectura Bien Estructurada**
   - Separación clara de responsabilidades
   - Servicios de negocio separados de controladores
   - Modelos bien definidos

2. **Sistema de Reverse Bidding Completo**
   - Lógica de bidding bien implementada
   - Auto-matching inteligente
   - Manejo de timeouts y expansión de radio

3. **Integración Geoespacial Robusta**
   - Uso eficiente de PostGIS y pgRouting
   - Funciones SQL optimizadas
   - Fallbacks para casos edge

4. **Comunicación en Tiempo Real**
   - Socket.io bien configurado
   - Autenticación en WebSockets
   - Salas por usuario y por rol

5. **Sistema de Precios Dinámico**
   - Considera múltiples factores
   - Multiplicadores configurables
   - Validación de rangos

### ⚠️ Áreas de Mejora

#### 1. **Backend**

**Seguridad**:
- [ ] Implementar rate limiting específico para endpoints críticos
- [ ] Agregar validación de coordenadas (lat/lon válidos)
- [ ] Implementar refresh tokens
- [ ] Agregar blacklist de tokens revocados
- [ ] Validar fortaleza de passwords

**Performance**:
- [ ] Optimizar queries de métricas (usar aggregation en lugar de iteración)
- [ ] Implementar índices compuestos en MongoDB
- [ ] Agregar cache para cálculos de precio frecuentes
- [ ] Optimizar polling en mobile (usar solo Socket.io)

**Robustez**:
- [ ] Implementar retry logic para conexiones de BD
- [ ] Agregar manejo de errores más específico
- [ ] Implementar circuit breakers para servicios externos
- [ ] Agregar logging estructurado (Winston, Pino)

**Funcionalidades Faltantes**:
- [ ] Completar implementación de `acceptBid`, `rejectBid`, `getBidsForRide`
- [ ] Implementar cola de viajes para conductores
- [ ] Implementar sistema de bloqueo de usuarios/zonas
- [ ] Completar sistema de negociaciones multi-ronda

#### 2. **Frontend**

**Estado Actual**: No implementado

**Recomendaciones**:
- [ ] Implementar páginas principales:
  - Login/Register
  - Dashboard de pasajero
  - Dashboard de conductor
  - Dashboard de admin (con métricas)
- [ ] Configurar React Router
- [ ] Implementar store con Zustand
- [ ] Crear servicios API
- [ ] Integrar Socket.io client

#### 3. **Mobile**

**Mejoras**:
- [ ] Eliminar polling, usar solo Socket.io
- [ ] Agregar manejo de errores de red robusto
- [ ] Implementar retry logic para requests
- [ ] Agregar indicadores de carga
- [ ] Implementar pantallas faltantes (RideInProgress, etc.)

#### 4. **Base de Datos**

**PostgreSQL**:
- [ ] Sincronizar tabla `drivers` con MongoDB
- [ ] Crear vistas materializadas para métricas
- [ ] Implementar índices espaciales optimizados
- [ ] Agregar scripts de importación de datos OSM

**MongoDB**:
- [ ] Agregar índices compuestos para queries frecuentes
- [ ] Implementar TTL indexes para datos temporales
- [ ] Agregar validación de schema más estricta

#### 5. **Testing**

**Faltante Completamente**:
- [ ] Tests unitarios para servicios
- [ ] Tests de integración para API
- [ ] Tests de carga para endpoints críticos
- [ ] Tests de funcionalidades geoespaciales

#### 6. **Documentación**

**Mejorar**:
- [ ] Documentar endpoints API (Swagger/OpenAPI)
- [ ] Documentar eventos Socket.io
- [ ] Agregar diagramas de flujo
- [ ] Documentar algoritmos de matching y pricing

#### 7. **DevOps**

**Faltante**:
- [ ] Configurar CI/CD
- [ ] Agregar Docker Compose para desarrollo
- [ ] Configurar monitoreo (Prometheus, Grafana)
- [ ] Agregar alertas para errores críticos

---

## 📝 Resumen Ejecutivo

### Estado del Proyecto
- **Backend**: 80% completo - Funcionalidades core implementadas, algunas funciones pendientes
- **Frontend**: 5% completo - Solo estructura básica
- **Mobile**: 40% completo - Pantalla principal funcional, faltan otras pantallas
- **Base de Datos**: 70% completo - Schema y funciones SQL listas, falta sincronización

### Funcionalidades Implementadas
✅ Autenticación JWT  
✅ Sistema de Reverse Bidding completo  
✅ Cálculo de precios dinámico  
✅ Integración PostGIS para routing  
✅ Socket.io para tiempo real  
✅ Auto-matching inteligente  
✅ Sistema de métricas  

### Funcionalidades Pendientes
⚠️ Frontend completo  
⚠️ Algunos endpoints de bidding  
⚠️ Cola de viajes para conductores  
⚠️ Sistema de bloqueo  
⚠️ Tests  
⚠️ Sincronización MongoDB ↔ PostgreSQL  

### Prioridades de Desarrollo
1. **Alta**: Completar frontend básico
2. **Alta**: Completar endpoints pendientes
3. **Media**: Optimizar performance
4. **Media**: Agregar tests
5. **Baja**: Mejoras de UX/UI

---

**Análisis realizado el**: $(date)  
**Versión del código analizada**: 1.0.0

