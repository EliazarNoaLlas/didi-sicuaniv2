# 🔧 Troubleshooting: Problemas de Performance y Reinicios

## 📋 Problemas Identificados

### 1. ❌ Nodemon Reiniciando Constantemente

**Síntoma:**
```
[nodemon] restarting due to changes...
[nodemon] restarting due to changes...
```

**Causa:**
- Nodemon está monitoreando archivos que cambian constantemente
- Archivos de logs, cache, o archivos temporales
- `node_modules` o archivos generados automáticamente

**Solución:**
✅ **Archivo creado:** `backend/nodemon.json`

Este archivo configura nodemon para:
- Solo monitorear archivos relevantes (`.js` en directorios específicos)
- Ignorar `node_modules`, logs, archivos de test
- Delay de 1 segundo entre reinicios para evitar loops

**Verificar:**
```bash
# Reiniciar nodemon con la nueva configuración
# El archivo nodemon.json se carga automáticamente
```

---

### 2. ⚠️ Warning: Índice Duplicado en Mongoose

**Síntoma:**
```
(node:19340) [MONGOOSE] Warning: Duplicate schema index on {"email":1} found.
```

**Causa:**
- El campo `email` tiene `unique: true` (crea índice automáticamente)
- Y también se declaró `userSchema.index({ email: 1 })`
- Esto crea un índice duplicado

**Solución:**
✅ **Archivo corregido:** `backend/models/User.js`

Removido el índice duplicado:
```javascript
// ❌ Antes (duplicado):
userSchema.index({ email: 1 }); // Duplicado porque email tiene unique: true

// ✅ Ahora:
// email ya tiene índice único por 'unique: true', no duplicar
```

**Verificar:**
- El warning debería desaparecer al reiniciar el servidor

---

### 3. ❌ Error Redis: ECONNRESET

**Síntoma:**
```
Redis Client Error: Error: read ECONNRESET
```

**Causa:**
- La conexión a Redis se está perdiendo
- Redis se desconecta o se reinicia
- No hay manejo de reconexión automática

**Solución:**
✅ **Archivo mejorado:** `backend/config/redis.js`

**Mejoras implementadas:**
1. **Reconexión automática** con estrategia de backoff
2. **Manejo de errores no fatal** - La app continúa sin Redis
3. **Verificación de estado** antes de usar Redis
4. **Logging mejorado** de eventos de conexión

**Características:**
- Reintenta hasta 5 veces con delay incremental
- No crashea la app si Redis no está disponible
- Cache en Redis es opcional (no crítico)

**Verificar Redis:**
```powershell
# Verificar que Redis está corriendo
Get-Service -Name Redis
# O
Get-Service -Name Memurai

# Si no está corriendo:
Start-Service -Name Redis
```

---

### 4. ⏱️ Demora en Requests

**Síntoma:**
- Requests tardan mucho en responder
- Especialmente `OPTIONS /api/bidding/request`

**Posibles Causas:**

#### A. Búsqueda de Conductores Lenta

Si hay muchos conductores en MongoDB, la búsqueda puede ser lenta:

**Solución:**
- Agregar índices geoespaciales (futuro)
- Limitar búsqueda inicial a radio más pequeño
- Usar paginación

#### B. Cálculos Geoespaciales Pesados

Si hay muchos conductores, filtrar con Haversine puede ser lento:

**Solución:**
- Ya implementado: Limitar a 20 conductores
- Optimización futura: Índices 2dsphere de MongoDB

#### C. Redis Lento o No Disponible

Si Redis está lento, puede bloquear requests:

**Solución:**
- Ya implementado: Redis es opcional, no bloquea si falla
- Timeout de conexión: 5 segundos

---

## 🔍 Diagnóstico de Performance

### Agregar Logging de Tiempo

Modifica temporalmente `backend/controllers/bidding.controller.js`:

```javascript
export const createRideRequest = async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('⏱️  [TIMING] Inicio createRideRequest');
    
    // ... código existente ...
    
    const step1 = Date.now();
    const suggestedPrice = await pricingService.calculateSuggestedPrice({...});
    console.log(`⏱️  [TIMING] calculateSuggestedPrice: ${Date.now() - step1}ms`);
    
    const step2 = Date.now();
    const routeMetrics = await pricingService.getRouteMetrics(...);
    console.log(`⏱️  [TIMING] getRouteMetrics: ${Date.now() - step2}ms`);
    
    const step3 = Date.now();
    const rideRequest = await RideRequest.create(rideRequestData);
    console.log(`⏱️  [TIMING] RideRequest.create: ${Date.now() - step3}ms`);
    
    console.log(`⏱️  [TIMING] Total: ${Date.now() - startTime}ms`);
    
    // ... resto del código ...
  }
};
```

Esto te mostrará qué parte está tardando más.

---

## ✅ Soluciones Implementadas

### 1. Nodemon Configurado

**Archivo:** `backend/nodemon.json`

- ✅ Solo monitorea archivos relevantes
- ✅ Ignora node_modules, logs, tests
- ✅ Delay de 1 segundo entre reinicios

### 2. Índice Duplicado Corregido

**Archivo:** `backend/models/User.js`

- ✅ Removido índice duplicado de email
- ✅ Warning de Mongoose eliminado

### 3. Redis Mejorado

**Archivo:** `backend/config/redis.js`

- ✅ Reconexión automática
- ✅ Manejo de errores no fatal
- ✅ La app continúa sin Redis si falla

### 4. Redis Opcional en Código

**Archivos modificados:**
- `backend/controllers/bidding.controller.js`
- `backend/services/bidding.service.js`

- ✅ Redis cache es opcional
- ✅ No bloquea si Redis falla
- ✅ App funciona sin Redis

---

## 🧪 Verificar Soluciones

### 1. Verificar Nodemon

```bash
# Reiniciar servidor
# Nodemon debería dejar de reiniciar constantemente
npm run dev
```

**Deberías ver:**
- Solo reinicios cuando cambias archivos `.js` relevantes
- No más reinicios constantes

### 2. Verificar Warning de Mongoose

```bash
# Reiniciar servidor
npm run dev
```

**Deberías ver:**
- ✅ No más warning de índice duplicado

### 3. Verificar Redis

```bash
# Verificar que Redis está corriendo
Get-Service -Name Redis

# Si no está, iniciarlo
Start-Service -Name Redis

# Reiniciar servidor
npm run dev
```

**Deberías ver:**
- ✅ Redis Client Connected
- ✅ Sin errores ECONNRESET (o se reconecta automáticamente)

### 4. Probar Endpoint

```bash
# Probar desde Swagger o Postman
POST /api/bidding/request
```

**Debería:**
- Responder más rápido
- No bloquearse si Redis falla
- Funcionar correctamente

---

## 📊 Optimizaciones Adicionales (Opcional)

### 1. Agregar Índices MongoDB para Búsquedas Geoespaciales

```javascript
// En backend/models/User.js
userSchema.index({
  'driverInfo.currentLatitude': 1,
  'driverInfo.currentLongitude': 1
}, {
  name: 'location_2d',
  sparse: true
});
```

### 2. Optimizar Búsqueda de Conductores

```javascript
// Limitar búsqueda inicial
const drivers = await User.find({
  userType: 'driver',
  'driverInfo.isOnline': true,
  'driverInfo.isAvailable': true,
  'driverInfo.currentLatitude': { $exists: true },
  'driverInfo.currentLongitude': { $exists: true },
}).limit(100); // Limitar a 100 antes de filtrar
```

### 3. Cachear Cálculos de Precio

```javascript
// Cachear precios calculados en Redis
const cacheKey = `price:${originLat}:${originLon}:${destLat}:${destLon}:${vehicleType}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);
```

---

## ✅ Checklist de Verificación

- [ ] Nodemon no reinicia constantemente
- [ ] No hay warning de índice duplicado
- [ ] Redis se conecta correctamente
- [ ] Redis se reconecta automáticamente si se pierde
- [ ] La app funciona sin Redis (opcional)
- [ ] Endpoints responden en tiempo razonable (< 2 segundos)

---

## 🎯 Resultado Esperado

Después de aplicar estas soluciones:

1. ✅ **Nodemon**: Solo reinicia cuando cambias código relevante
2. ✅ **Mongoose**: Sin warnings de índices duplicados
3. ✅ **Redis**: Se reconecta automáticamente si se pierde
4. ✅ **Performance**: Requests más rápidos y estables

---

¿Necesitas ayuda con algún problema específico? ¡Pregunta!

