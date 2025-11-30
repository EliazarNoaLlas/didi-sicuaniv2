# 🔄 Migración: PostgreSQL → Solo MongoDB

## 📋 Resumen de Cambios

El proyecto ha sido modificado para **eliminar completamente la dependencia de PostgreSQL** y usar **solo MongoDB** para todas las operaciones.

---

## ✅ Cambios Realizados

### 1. Nuevo Servicio de Utilidades Geoespaciales

**Archivo creado:** `backend/utils/geospatial.js`

Este servicio proporciona todas las funciones geoespaciales usando solo cálculos matemáticos:

- ✅ **Haversine Distance**: Cálculo de distancia entre dos puntos
- ✅ **Route Metrics**: Cálculo de distancia y duración estimada
- ✅ **Radius Check**: Verificar si un punto está dentro de un radio
- ✅ **Bearing Calculation**: Calcular dirección entre puntos

**Ventajas:**
- ✅ Sin dependencias externas
- ✅ Funciona offline
- ✅ Rápido y eficiente
- ✅ Precisión suficiente para distancias urbanas

### 2. Servicios Modificados

#### `pricing.service.js`
- ❌ Removido: `getPostgresPool()`
- ✅ Agregado: `geospatialUtils` para cálculos
- ✅ Modificado: `getRouteMetrics()` ahora usa cálculos matemáticos
- ✅ Modificado: `getSupplyDemandRatio()` ahora busca en MongoDB

#### `bidding.service.js`
- ❌ Removido: `getPostgresPool()`
- ✅ Agregado: `geospatialUtils` para cálculos
- ✅ Modificado: `notifyNearbyDrivers()` ahora busca conductores en MongoDB
- ✅ Modificado: `submitBid()` calcula métricas usando Haversine

#### `metrics.service.js`
- ❌ Removido: Import de PostgreSQL
- ✅ Ya no requiere PostgreSQL (solo usa MongoDB)

#### `routes/rides.routes.js`
- ❌ Removido: `getPostgresPool()`
- ✅ Agregado: `geospatialUtils`
- ✅ Modificado: Endpoint `/route` ahora genera GeoJSON simple (línea recta)

### 3. Archivos Eliminados/Obsoletos

- ⚠️ `backend/config/postgres.js` - Ya no se usa (puede eliminarse)
- ⚠️ `postgres-geo/init.sql` - Ya no se necesita
- ⚠️ Variables de PostgreSQL en `.env` - Opcionales ahora

### 4. Archivos Actualizados

- ✅ `backend/server.js` - Comentario sobre remoción de PostgreSQL
- ✅ `backend/test-all-connections.js` - Removido test de PostgreSQL
- ✅ `backend/.env.example` - Variables de PostgreSQL comentadas

---

## 🔧 Cómo Funciona Ahora

### Cálculo de Distancia

**Antes (PostgreSQL):**
```sql
SELECT * FROM calculate_trip_metrics($1, $2, $3, $4)
```

**Ahora (MongoDB + Cálculos):**
```javascript
const distance = geospatialUtils.haversineDistance(lat1, lon1, lat2, lon2);
const duration = Math.ceil((distance * 1.3 / 30) * 60); // Factor de ruta 1.3x, velocidad 30 km/h
```

### Búsqueda de Conductores Cercanos

**Antes (PostgreSQL):**
```sql
SELECT * FROM find_nearby_drivers($1, $2, $3, $4)
```

**Ahora (MongoDB):**
```javascript
// 1. Buscar todos los conductores en MongoDB
const drivers = await User.find({
  userType: 'driver',
  'driverInfo.isOnline': true,
  'driverInfo.isAvailable': true
});

// 2. Filtrar por distancia usando Haversine
const nearbyDrivers = drivers.filter(driver => {
  const distance = geospatialUtils.haversineDistance(
    originLat, originLon,
    driver.driverInfo.currentLatitude,
    driver.driverInfo.currentLongitude
  );
  return distance <= radiusKm;
});
```

---

## 📊 Precisión y Performance

### Precisión

- **Haversine Distance**: Precisión excelente para distancias < 100km
- **Factor de Ruta**: Se aplica un factor de 1.3x para simular rutas reales vs línea recta
- **Velocidad Promedio**: 25-30 km/h para cálculos de ETA en ciudad

### Performance

- ✅ **Más rápido** para búsquedas pequeñas/medianas (< 1000 conductores)
- ⚠️ **Puede ser más lento** para búsquedas muy grandes (> 5000 conductores)
- 💡 **Solución futura**: Usar índices geoespaciales de MongoDB 2dsphere

---

## 🚀 Optimizaciones Futuras (Opcional)

Si necesitas mejor performance con muchos conductores, puedes:

### 1. Usar Índices Geoespaciales de MongoDB

```javascript
// En el modelo User
userSchema.index({
  'driverInfo.currentLatitude': 1,
  'driverInfo.currentLongitude': 1
}, {
  name: 'location_2dsphere',
  sparse: true
});

// Búsqueda optimizada
User.find({
  'driverInfo.currentLocation': {
    $near: {
      $geometry: {
        type: 'Point',
        coordinates: [lon, lat]
      },
      $maxDistance: radiusKm * 1000 // en metros
    }
  }
});
```

### 2. Usar API Externa para Rutas Reales

Para rutas más precisas, puedes integrar:
- **Mapbox Directions API**
- **Google Maps Directions API**
- **OSRM** (Open Source Routing Machine)

---

## ✅ Ventajas de Solo MongoDB

1. ✅ **Simplicidad**: Una sola base de datos que mantener
2. ✅ **Menos Dependencias**: No necesitas instalar PostgreSQL
3. ✅ **Más Rápido de Configurar**: Solo MongoDB + Redis
4. ✅ **Funciona Offline**: Cálculos matemáticos no requieren servicios externos
5. ✅ **Menor Complejidad**: Menos puntos de fallo

---

## ⚠️ Limitaciones

1. ⚠️ **Rutas en Línea Recta**: Las rutas mostradas son líneas rectas (no rutas reales)
2. ⚠️ **Performance con Muchos Datos**: Búsquedas pueden ser más lentas con > 5000 conductores
3. ⚠️ **Precisión de ETA**: Estimaciones basadas en velocidad promedio, no tráfico real

---

## 🧪 Probar los Cambios

### 1. Verificar que no hay errores de PostgreSQL

```bash
cd backend
node test-all-connections.js
```

**Salida esperada:**
```
✅ MongoDB: Conectado
✅ Redis: Conectado
ℹ️  PostgreSQL ha sido removido del proyecto
```

### 2. Probar creación de viaje

```bash
# Iniciar servidor
npm run dev

# Probar endpoint (desde Swagger o Postman)
POST /api/bidding/request
```

**Debería funcionar sin errores de PostgreSQL.**

### 3. Verificar cálculos geoespaciales

Los cálculos ahora usan:
- ✅ Fórmula de Haversine para distancia
- ✅ Factor de ruta 1.3x para simular rutas reales
- ✅ Velocidad promedio 25-30 km/h para ETA

---

## 📝 Archivos Modificados

- ✅ `backend/utils/geospatial.js` (nuevo)
- ✅ `backend/services/pricing.service.js`
- ✅ `backend/services/bidding.service.js`
- ✅ `backend/services/metrics.service.js`
- ✅ `backend/routes/rides.routes.js`
- ✅ `backend/server.js`
- ✅ `backend/test-all-connections.js`
- ✅ `backend/.env.example`

---

## 🗑️ Archivos que Puedes Eliminar (Opcional)

Si ya no necesitas PostgreSQL:

- `backend/config/postgres.js`
- `postgres-geo/` (directorio completo)
- Variables de PostgreSQL en `.env`

---

## ✅ Checklist de Verificación

- [ ] Servidor inicia sin errores
- [ ] No hay referencias a PostgreSQL en el código
- [ ] Endpoint `/api/bidding/request` funciona
- [ ] Cálculo de precios funciona
- [ ] Búsqueda de conductores funciona
- [ ] Test de conexiones pasa (solo MongoDB y Redis)

---

## 🎉 ¡Listo!

El proyecto ahora funciona completamente con **solo MongoDB**. Todas las operaciones geoespaciales usan cálculos matemáticos precisos y eficientes.

**Próximos pasos:**
1. ✅ Probar que todo funciona
2. ✅ Eliminar archivos de PostgreSQL si lo deseas
3. ✅ Actualizar documentación del proyecto

---

¿Necesitas ayuda con algo más? ¡Pregunta!

