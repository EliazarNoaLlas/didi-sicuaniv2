# 📊 Análisis Completo de la Base de Datos - DiDi-Sicuani

## 📋 Resumen Ejecutivo

El proyecto **DiDi-Sicuani** utiliza una arquitectura de base de datos híbrida con múltiples sistemas especializados:

- **MongoDB**: Base de datos principal (NoSQL) para datos transaccionales
- **Redis**: Sistema de cache y gestión de sesiones
- **PostgreSQL + PostGIS**: Configurado pero actualmente en desuso (migrado a MongoDB)

---

## 🗄️ 1. ARQUITECTURA GENERAL

```
┌─────────────────────────────────────────────────────────────┐
│                    APLICACIÓN BACKEND                        │
│                    (Node.js + Express)                      │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
       ┌───────▼───────┐            ┌────────▼────────┐
       │   MongoDB     │            │      Redis      │
       │  (Principal)  │            │   (Cache/Sesiones)│
       └───────────────┘            └─────────────────┘
               │
       ┌───────▼───────┐
       │  PostgreSQL   │
       │  + PostGIS    │
       │  (Opcional)   │
       └───────────────┘
```

---

## 🍃 2. MONGODB - BASE DE DATOS PRINCIPAL

### 2.1 Configuración

**Archivo:** `backend/config/database.js`

- **ORM/ODM**: Mongoose
- **URI**: Configurada mediante variable de entorno `MONGODB_URI`
- **Características**:
  - Conexión automática al iniciar el servidor
  - Manejo de eventos de conexión/desconexión
  - Reconexión automática en caso de error

### 2.2 Modelos Principales

El proyecto tiene modelos tanto en **inglés** como en **español**, indicando un proceso de migración/refactorización en curso.

#### 📌 Modelos en Español (Activos)

##### 1. **Usuario** (`backend/models/Usuario.js`)

**Colección:** `usuarios`

**Propósito:** Almacena información de todos los usuarios del sistema (pasajeros, conductores, administradores).

**Campos Principales:**
```javascript
{
  nombre: String (requerido),
  correo: String (requerido, único),
  contrasena: String (requerido, min 6 caracteres, select: false),
  telefono: String,
  tipo_usuario: Enum ['pasajero', 'conductor', 'administrador'],
  esta_activo: Boolean (default: true),
  informacion_conductor: {
    tipo_vehiculo: Enum ['taxi', 'mototaxi'],
    placa_vehiculo: String,
    modelo_vehiculo: String,
    numero_licencia: String,
    calificacion: Number (0-5, default: 5.0),
    total_viajes: Number (default: 0),
    esta_en_linea: Boolean (default: false),
    esta_disponible: Boolean (default: false),
    latitud_actual: Number,
    longitud_actual: Number
  },
  createdAt: Date (automático),
  updatedAt: Date (automático)
}
```

**Índices:**
- `correo`: Único (automático)
- `tipo_usuario`: Para búsquedas por rol
- `informacion_conductor.esta_en_linea + esta_disponible`: Para encontrar conductores disponibles

**Relaciones:**
- Referenciado por: `SolicitudViaje`, `Oferta`, `Calificacion`, `RegistroAuditoria`

---

##### 2. **SolicitudViaje** (`backend/models/SolicitudViaje.js`)

**Colección:** `solicitudesviajes`

**Propósito:** Representa una solicitud de viaje realizada por un pasajero.

**Campos Principales:**
```javascript
{
  id_pasajero: ObjectId (ref: 'Usuario', requerido),
  
  // Geolocalización origen
  origen_lat: Number (requerido),
  origen_lon: Number (requerido),
  origen_direccion: String (requerido),
  
  // Geolocalización destino
  destino_lat: Number (requerido),
  destino_lon: Number (requerido),
  destino_direccion: String (requerido),
  
  // Precios
  precio_sugerido_soles: Number (requerido),
  precio_ofrecido_pasajero: Number (opcional),
  precio_final_acordado: Number,
  
  // Métricas
  distancia_estimada_km: Number,
  duracion_estimada_min: Number,
  
  // Preferencias
  tipo_vehiculo: Enum ['taxi', 'mototaxi', 'cualquiera'] (default: 'cualquiera'),
  metodo_pago: Enum ['efectivo', 'tarjeta', 'billetera'] (default: 'efectivo'),
  
  // Estado
  estado: Enum [
    'pendiente',
    'subasta_activa',
    'asignado',
    'conductor_en_ruta',
    'en_progreso',
    'completado',
    'cancelado'
  ] (default: 'pendiente'),
  
  // Asignación
  id_conductor_asignado: ObjectId (ref: 'Usuario'),
  fecha_asignacion: Date,
  
  // Control temporal
  fecha_expiracion: Date,
  
  // Soft delete
  fecha_eliminacion: Date (default: null),
  eliminado_por: ObjectId (ref: 'Usuario', default: null),
  
  createdAt: Date,
  updatedAt: Date
}
```

**Índices:**
- `id_pasajero`: Para búsquedas por pasajero
- `estado`: Para filtrar por estado
- `fecha_expiracion`: Para limpiar solicitudes expiradas
- `origen_lat + origen_lon`: Índice geoespacial
- `id_conductor_asignado`: Para búsquedas por conductor
- `fecha_eliminacion`: Para filtrar eliminados (soft delete)

**Estados del Viaje:**
1. **pendiente**: Recién creada, esperando ofertas
2. **subasta_activa**: Recibiendo ofertas de conductores
3. **asignado**: Conductor asignado, esperando confirmación
4. **conductor_en_ruta**: Conductor yendo al punto de recogida
5. **en_progreso**: Viaje en curso
6. **completado**: Viaje finalizado
7. **cancelado**: Viaje cancelado

---

##### 3. **Oferta** (`backend/models/Oferta.js`)

**Colección:** `ofertas`

**Propósito:** Representa una oferta de precio realizada por un conductor para una solicitud de viaje.

**Campos Principales:**
```javascript
{
  id_solicitud_viaje: ObjectId (ref: 'SolicitudViaje', requerido),
  id_conductor: ObjectId (ref: 'Usuario', requerido),
  
  tipo_oferta: Enum ['aceptar', 'contraoferta', 'rechazar'] (requerido),
  precio_ofrecido: Number (requerido si tipo_oferta === 'contraoferta'),
  
  // Métricas del conductor
  distancia_conductor_km: Number,
  tiempo_estimado_llegada_min: Number,
  calificacion_conductor: Number,
  
  // Estado
  estado: Enum ['pendiente', 'aceptada', 'rechazada', 'expirada'] (default: 'pendiente'),
  
  fecha_respuesta: Date,
  fecha_expiracion: Date,
  
  // Soft delete
  fecha_eliminacion: Date (default: null),
  
  createdAt: Date,
  updatedAt: Date
}
```

**Índices:**
- `id_solicitud_viaje`: Para encontrar todas las ofertas de un viaje
- `id_conductor`: Para historial de ofertas del conductor
- `estado`: Para filtrar ofertas activas
- `fecha_expiracion`: Para limpiar ofertas expiradas
- `fecha_eliminacion`: Para filtrar eliminadas

**Tipos de Oferta:**
- **aceptar**: El conductor acepta el precio sugerido
- **contraoferta**: El conductor propone un precio diferente
- **rechazar**: El conductor rechaza la solicitud

---

##### 4. **Calificacion** (`backend/models/Calificacion.js`)

**Colección:** `calificaciones`

**Propósito:** Almacena las calificaciones que los usuarios se dan mutuamente después de un viaje.

**Campos Principales:**
```javascript
{
  id_viaje: ObjectId (ref: 'SolicitudViaje', requerido),
  id_calificador: ObjectId (ref: 'Usuario', requerido),
  id_calificado: ObjectId (ref: 'Usuario', requerido),
  
  calificacion: Number (1-5, requerido),
  comentario: String,
  
  tipo_calificador: Enum ['pasajero', 'conductor'] (requerido),
  
  createdAt: Date,
  updatedAt: Date
}
```

**Índices:**
- `id_viaje`: Para calificaciones de un viaje específico
- `id_calificador`: Para historial de calificaciones dadas
- `id_calificado`: Para historial de calificaciones recibidas
- `id_viaje + id_calificador`: Único (un usuario solo puede calificar un viaje una vez)

**Regla de Negocio:**
- Un usuario solo puede calificar un viaje una vez
- Tanto el pasajero como el conductor pueden calificarse mutuamente

---

##### 5. **ConfiguracionSistema** (`backend/models/ConfiguracionSistema.js`)

**Colección:** `configuracionsistemas`

**Propósito:** Almacena configuraciones generales del sistema modificables por administradores.

**Campos Principales:**
```javascript
{
  clave: String (requerido, único),
  valor: Mixed (requerido), // Puede ser string, número, objeto, etc.
  descripcion: String,
  actualizado_por: ObjectId (ref: 'Usuario'),
  
  createdAt: Date,
  updatedAt: Date
}
```

**Índices:**
- `clave`: Único, para búsquedas rápidas

**Ejemplos de Configuraciones:**
- Precios base por tipo de vehículo
- Tiempos de expiración de solicitudes
- Límites de ofertas
- Configuraciones de notificaciones

---

##### 6. **RegistroAuditoria** (`backend/models/RegistroAuditoria.js`)

**Colección:** `registroauditorias`

**Propósito:** Registra todas las acciones importantes realizadas en el sistema para auditoría y seguridad.

**Campos Principales:**
```javascript
{
  id_usuario: ObjectId (ref: 'Usuario'),
  accion: String (requerido), // ej: 'crear_viaje', 'eliminar_usuario'
  tipo_recurso: Enum ['usuario', 'viaje', 'oferta', 'sistema', 'configuracion'],
  id_recurso: ObjectId,
  detalles: Mixed, // Información adicional
  direccion_ip: String,
  agente_usuario: String,
  
  createdAt: Date,
  updatedAt: Date
}
```

**Índices:**
- `id_usuario`: Para auditoría por usuario
- `accion`: Para búsquedas por tipo de acción
- `tipo_recurso`: Para filtrar por tipo de recurso
- `createdAt`: Ordenado descendente (más recientes primero)

**Casos de Uso:**
- Tracking de cambios críticos
- Análisis de seguridad
- Cumplimiento de regulaciones
- Debugging de problemas

---

#### 📌 Modelos en Inglés (Legacy/Mantenimiento)

El proyecto también contiene modelos en inglés que pueden estar en uso o en proceso de migración:

- `User.js` → Equivalente a `Usuario.js`
- `RideRequest.js` → Equivalente a `SolicitudViaje.js`
- `Bid.js` → Equivalente a `Oferta.js`
- `Rating.js` → Equivalente a `Calificacion.js`
- `SystemConfig.js` → Equivalente a `ConfiguracionSistema.js`
- `AuditLog.js` → Equivalente a `RegistroAuditoria.js`
- `DriverHold.js` → Control de reservas temporales de conductores
- `DriverBlock.js` → Bloqueos de conductores (usuarios, zonas, rutas)
- `BidNegotiation.js` → Negociaciones de precios entre pasajero y conductor

---

### 2.3 Características de MongoDB en el Proyecto

#### Soft Delete
Varios modelos implementan **soft delete** (eliminación lógica):
- `fecha_eliminacion`: Fecha en que se marcó como eliminado
- `eliminado_por`: Usuario que realizó la eliminación

Esto permite:
- Recuperar datos eliminados accidentalmente
- Mantener historial completo
- Cumplir con regulaciones de retención de datos

#### Timestamps Automáticos
Todos los modelos usan `timestamps: true`, que crea automáticamente:
- `createdAt`: Fecha de creación
- `updatedAt`: Fecha de última actualización

#### Índices Geoespaciales
MongoDB soporta índices 2dsphere para búsquedas geoespaciales:
- `origen_lat + origen_lon` en `SolicitudViaje`
- Permite búsquedas por proximidad

---

## 🔴 3. REDIS - CACHE Y SESIONES

### 3.1 Configuración

**Archivo:** `backend/config/redis.js`

- **Cliente**: `redis` (paquete npm)
- **Host**: `REDIS_HOST` (default: localhost)
- **Port**: `REDIS_PORT` (default: 6379)
- **Password**: `REDIS_PASSWORD` (opcional)

**Características:**
- Reconexión automática con estrategia de backoff
- Manejo de errores sin interrumpir la aplicación
- Pool de conexiones

### 3.2 Casos de Uso

#### 1. **Cache de Solicitudes de Viaje**
```javascript
// Guardar solicitud en cache (TTL: 2 minutos)
await redis.setEx(
  `ride_request:${rideId}`,
  120,
  JSON.stringify(rideRequest)
);
```

#### 2. **Cola de Viajes para Conductores**
```javascript
// Agregar viaje a cola ordenada por prioridad
await redis.zAdd('driver:queue', {
  score: priorityScore,
  value: rideRequestId
});
```

#### 3. **Rate Limiting**
```javascript
// Limitar requests por IP
const key = `rate_limit:${ip}`;
const count = await redis.incr(key);
if (count === 1) {
  await redis.expire(key, 60); // 1 minuto
}
```

#### 4. **Sesiones de Usuario**
```javascript
// Guardar sesión (TTL: 1 hora)
await redis.setEx(
  `session:${userId}`,
  3600,
  JSON.stringify(sessionData)
);
```

#### 5. **Cache de Rutas Calculadas**
- Almacena rutas precalculadas para evitar recálculos
- Reduce carga en servicios de geocodificación

---

## 🐘 4. POSTGRESQL + POSTGIS - GEOESPACIAL (Opcional)

### 4.1 Estado Actual

**Archivo:** `backend/config/postgres.js`

Según la documentación del proyecto (`MIGRACION_MONGODB_ONLY.md`), el proyecto **migró de PostgreSQL a MongoDB** para simplificar la arquitectura. Sin embargo, el archivo de configuración aún existe.

**Estado:** ⚠️ **Configurado pero en desuso**

### 4.2 Configuración (Si se reactiva)

- **Base de datos**: `sicuani_geo`
- **Usuario**: `postgres` (configurable)
- **Extensión**: PostGIS para datos geoespaciales
- **Pool**: Máximo 20 conexiones

### 4.3 Uso Propuesto (Según Documentación)

Si se reactiva, PostgreSQL se usaría para:
- Almacenamiento de direcciones y puntos de referencia
- Red vial (calles, avenidas)
- Rutas precalculadas
- Búsquedas geoespaciales avanzadas con PostGIS

**Nota:** Actualmente, el proyecto usa cálculos matemáticos (Haversine) en lugar de PostGIS para operaciones geoespaciales.

---

## 🔗 5. RELACIONES ENTRE MODELOS

### 5.1 Diagrama de Relaciones

```
Usuario (Pasajero)
    │
    ├─── SolicitudViaje (1:N)
    │         │
    │         ├─── Oferta (1:N)
    │         │       │
    │         │       └─── Usuario (Conductor)
    │         │
    │         └─── Calificacion (1:2)
    │                 │
    │                 ├─── Usuario (Calificador)
    │                 └─── Usuario (Calificado)
    │
    ├─── RegistroAuditoria (1:N)
    │
    └─── ConfiguracionSistema (actualizado_por) (N:1)
```

### 5.2 Flujo de Datos Típico

1. **Pasajero crea SolicitudViaje**
   - Se guarda en MongoDB
   - Se cachea en Redis (2 minutos)
   - Se notifica a conductores cercanos

2. **Conductores envían Ofertas**
   - Cada oferta se guarda en MongoDB
   - Se actualiza estado de SolicitudViaje a 'subasta_activa'

3. **Pasajero acepta Oferta**
   - Se actualiza SolicitudViaje (estado: 'asignado', id_conductor_asignado)
   - Se marca Oferta como 'aceptada'
   - Se crea registro en RegistroAuditoria

4. **Viaje completado**
   - Se actualiza SolicitudViaje (estado: 'completado')
   - Se crean Calificaciones (pasajero → conductor, conductor → pasajero)
   - Se actualiza calificación promedio del conductor en Usuario

---

## 📊 6. ÍNDICES Y OPTIMIZACIÓN

### 6.1 Índices en MongoDB

#### Usuario
- `correo`: Único (búsquedas de login)
- `tipo_usuario`: Filtrado por rol
- `informacion_conductor.esta_en_linea + esta_disponible`: Búsqueda de conductores disponibles

#### SolicitudViaje
- `id_pasajero`: Historial de viajes del pasajero
- `estado`: Filtrado por estado
- `fecha_expiracion`: Limpieza de expiradas
- `origen_lat + origen_lon`: Búsquedas geoespaciales
- `id_conductor_asignado`: Viajes del conductor
- `fecha_eliminacion`: Filtrado de eliminados

#### Oferta
- `id_solicitud_viaje`: Todas las ofertas de un viaje
- `id_conductor`: Historial de ofertas
- `estado`: Ofertas activas
- `fecha_expiracion`: Limpieza de expiradas

#### Calificacion
- `id_viaje`: Calificaciones de un viaje
- `id_calificador`: Calificaciones dadas
- `id_calificado`: Calificaciones recibidas
- `id_viaje + id_calificador`: Único (prevenir duplicados)

### 6.2 Estrategias de Cache (Redis)

- **TTL Corto** (1-5 minutos): Datos frecuentemente actualizados
- **TTL Medio** (15-60 minutos): Datos relativamente estables
- **TTL Largo** (horas/días): Configuraciones del sistema

---

## 🔒 7. SEGURIDAD Y BUENAS PRÁCTICAS

### 7.1 Seguridad de Contraseñas

- Campo `contrasena` con `select: false` en Usuario
- Requiere `.select('+password')` explícitamente para obtener contraseña
- Debe estar encriptada (bcrypt recomendado)

### 7.2 Soft Delete

- Permite recuperación de datos
- Mantiene integridad referencial
- Facilita auditoría

### 7.3 Validación de Datos

- Validación a nivel de schema (Mongoose)
- Enums para valores restringidos
- Campos requeridos marcados explícitamente

### 7.4 Auditoría

- RegistroAuditoria captura acciones críticas
- Incluye IP y User Agent para seguridad
- Permite rastreo de cambios sospechosos

---

## 📈 8. MÉTRICAS Y MONITOREO

### 8.1 Métricas Recomendadas

**MongoDB:**
- Tiempo de respuesta de queries
- Uso de índices
- Tamaño de colecciones
- Tasa de conexiones activas

**Redis:**
- Hit rate del cache
- Memoria utilizada
- Tiempo de respuesta
- Número de conexiones

### 8.2 Queries Frecuentes

1. **Buscar conductores disponibles cerca de un punto**
   ```javascript
   Usuario.find({
     tipo_usuario: 'conductor',
     'informacion_conductor.esta_en_linea': true,
     'informacion_conductor.esta_disponible': true,
     // + búsqueda geoespacial
   })
   ```

2. **Obtener solicitudes activas de un pasajero**
   ```javascript
   SolicitudViaje.find({
     id_pasajero: userId,
     estado: { $in: ['pendiente', 'subasta_activa', 'asignado'] },
     fecha_eliminacion: null
   })
   ```

3. **Obtener ofertas pendientes de un viaje**
   ```javascript
   Oferta.find({
     id_solicitud_viaje: rideId,
     estado: 'pendiente',
     fecha_eliminacion: null
   })
   ```

---

## 🚀 9. RECOMENDACIONES

### 9.1 Migración de Modelos

- **Completar migración** de modelos en inglés a español
- **Deprecar** modelos antiguos una vez migrados
- **Documentar** el proceso de migración

### 9.2 Optimización

- **Agregar índices compuestos** para queries frecuentes
- **Implementar paginación** en listados grandes
- **Usar proyecciones** para reducir transferencia de datos

### 9.3 Escalabilidad

- **Sharding** de MongoDB si crece significativamente
- **Replicación** para alta disponibilidad
- **Cluster Redis** para cache distribuido

### 9.4 Backup y Recuperación

- **Backups automáticos** de MongoDB
- **Snapshots** de Redis
- **Plan de recuperación ante desastres**

---

## 📝 10. CONCLUSIÓN

El proyecto DiDi-Sicuani utiliza una arquitectura de base de datos bien estructurada con:

✅ **MongoDB** como base principal con modelos bien definidos
✅ **Redis** para cache y sesiones
✅ **Soft delete** para preservación de datos
✅ **Índices apropiados** para optimización
✅ **Auditoría** para seguridad y trazabilidad

**Áreas de mejora:**
- Completar migración de modelos inglés → español
- Considerar reactivar PostgreSQL/PostGIS si se necesitan operaciones geoespaciales avanzadas
- Implementar estrategias de backup más robustas
- Agregar más índices compuestos según patrones de uso

---

**Documento creado:** 2025
**Versión:** 1.0
**Proyecto:** DiDi-Sicuani

