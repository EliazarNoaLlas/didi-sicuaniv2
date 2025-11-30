# Guía de Traducción del Código al Español

Este documento describe el proceso de traducción del código de inglés a español, incluyendo cambios en nombres de variables, funciones, clases y base de datos.

## 📋 Resumen de Cambios

### Modelos (Models)

| Inglés | Español | Archivo |
|--------|---------|---------|
| `RideRequest` | `SolicitudViaje` | `backend/models/SolicitudViaje.js` |
| `Bid` | `Oferta` | `backend/models/Oferta.js` |
| `User` | `Usuario` | `backend/models/Usuario.js` |
| `Rating` | `Calificacion` | `backend/models/Calificacion.js` |
| `SystemConfig` | `ConfiguracionSistema` | `backend/models/ConfiguracionSistema.js` |
| `AuditLog` | `RegistroAuditoria` | `backend/models/RegistroAuditoria.js` |

### Campos de Modelos

#### SolicitudViaje (RideRequest)
- `passenger_id` → `id_pasajero`
- `origin_lat/lon` → `origen_lat/lon`
- `origin_address` → `origen_direccion`
- `destination_lat/lon` → `destino_lat/lon`
- `destination_address` → `destino_direccion`
- `suggested_price_soles` → `precio_sugerido_soles`
- `passenger_offered_price` → `precio_ofrecido_pasajero`
- `final_agreed_price` → `precio_final_acordado`
- `estimated_distance_km` → `distancia_estimada_km`
- `estimated_duration_min` → `duracion_estimada_min`
- `vehicle_type` → `tipo_vehiculo`
- `payment_method` → `metodo_pago`
- `status` → `estado`
- `matched_driver_id` → `id_conductor_asignado`
- `matched_at` → `fecha_asignacion`
- `expires_at` → `fecha_expiracion`
- `deletedAt` → `fecha_eliminacion`
- `deletedBy` → `eliminado_por`

#### Usuario (User)
- `name` → `nombre`
- `email` → `correo`
- `password` → `contrasena`
- `phone` → `telefono`
- `userType` → `tipo_usuario`
- `isActive` → `esta_activo`
- `driverInfo` → `informacion_conductor`
  - `vehicleType` → `tipo_vehiculo`
  - `vehiclePlate` → `placa_vehiculo`
  - `vehicleModel` → `modelo_vehiculo`
  - `licenseNumber` → `numero_licencia`
  - `rating` → `calificacion`
  - `totalRides` → `total_viajes`
  - `isOnline` → `esta_en_linea`
  - `isAvailable` → `esta_disponible`
  - `currentLatitude` → `latitud_actual`
  - `currentLongitude` → `longitud_actual`

#### Oferta (Bid)
- `ride_request_id` → `id_solicitud_viaje`
- `driver_id` → `id_conductor`
- `bid_type` → `tipo_oferta`
- `offered_price` → `precio_ofrecido`
- `driver_distance_km` → `distancia_conductor_km`
- `driver_eta_min` → `tiempo_estimado_llegada_min`
- `driver_rating` → `calificacion_conductor`
- `status` → `estado`
- `responded_at` → `fecha_respuesta`
- `expires_at` → `fecha_expiracion`
- `deletedAt` → `fecha_eliminacion`

### Valores de Enum

#### Estados de Solicitud de Viaje
- `pending` → `pendiente`
- `bidding_active` → `subasta_activa`
- `matched` → `asignado`
- `driver_en_route` → `conductor_en_ruta`
- `in_progress` → `en_progreso`
- `completed` → `completado`
- `cancelled` → `cancelado`

#### Tipos de Usuario
- `passenger` → `pasajero`
- `driver` → `conductor`
- `admin` → `administrador`

#### Tipos de Vehículo
- `any` → `cualquiera`

#### Métodos de Pago
- `cash` → `efectivo`
- `card` → `tarjeta`
- `wallet` → `billetera`

#### Tipos de Oferta
- `accept` → `aceptar`
- `counteroffer` → `contraoferta`
- `reject` → `rechazar`

#### Estados de Oferta
- `pending` → `pendiente`
- `accepted` → `aceptada`
- `rejected` → `rechazada`
- `expired` → `expirada`

## 🔄 Proceso de Migración

### Paso 1: Actualizar Modelos
Los modelos ya han sido traducidos y están disponibles en:
- `backend/models/SolicitudViaje.js`
- `backend/models/Usuario.js`
- `backend/models/Oferta.js`
- `backend/models/Calificacion.js`
- `backend/models/ConfiguracionSistema.js`
- `backend/models/RegistroAuditoria.js`

### Paso 2: Actualizar Controladores
Actualizar todos los controladores para usar los nuevos nombres de modelos y campos.

**Ejemplo:**
```javascript
// Antes
import RideRequest from '../models/RideRequest.js';
const ride = await RideRequest.find({ passenger_id: userId, status: 'completed' });

// Después
import SolicitudViaje from '../models/SolicitudViaje.js';
const viaje = await SolicitudViaje.find({ id_pasajero: idUsuario, estado: 'completado' });
```

### Paso 3: Actualizar Servicios
Actualizar todos los servicios para usar los nuevos nombres.

**Ejemplo:**
```javascript
// Antes
const rideRequest = await RideRequest.findById(rideId);
rideRequest.status = 'matched';
rideRequest.matched_driver_id = driverId;

// Después
const solicitudViaje = await SolicitudViaje.findById(idViaje);
solicitudViaje.estado = 'asignado';
solicitudViaje.id_conductor_asignado = idConductor;
```

### Paso 4: Actualizar Rutas
Las rutas pueden mantener los mismos endpoints, pero los controladores internos deben usar los nuevos nombres.

### Paso 5: Actualizar Frontend
Actualizar las llamadas API y el manejo de respuestas para usar los nuevos nombres de campos.

**Ejemplo:**
```javascript
// Antes
const response = await api.get('/api/rides');
const rides = response.data.map(ride => ({
  origin: ride.origin_address,
  status: ride.status
}));

// Después
const response = await api.get('/api/viajes');
const viajes = response.data.map(viaje => ({
  origen: viaje.origen_direccion,
  estado: viaje.estado
}));
```

## 📝 Convenciones de Nomenclatura

### Variables y Funciones
- Usar **camelCase** en español: `obtenerHistorial`, `idPasajero`, `precioFinal`
- Nombres descriptivos: `obtenerViajesPorPasajero` en lugar de `getRides`
- Prefijos comunes:
  - `obtener*` para funciones de lectura
  - `crear*` para funciones de creación
  - `actualizar*` para funciones de actualización
  - `eliminar*` para funciones de eliminación
  - `validar*` para funciones de validación

### Clases
- Usar **PascalCase** en español: `ServicioPrecios`, `ControladorAutenticacion`

### Constantes
- Usar **UPPER_SNAKE_CASE** en español: `TIEMPO_EXPIRACION_MINUTOS`, `COMISION_PORCENTAJE`

## ⚠️ Consideraciones Importantes

1. **Compatibilidad Temporal**: Los modelos antiguos se mantienen temporalmente para permitir una migración gradual.

2. **Base de Datos**: Los nombres de las colecciones en MongoDB pueden mantenerse en inglés o cambiarse. Si se cambian, se requiere una migración de datos.

3. **APIs Externas**: Si hay integraciones con APIs externas, mantener los nombres en inglés puede ser necesario.

4. **Documentación**: Actualizar toda la documentación (README, Swagger, etc.) para reflejar los nuevos nombres.

5. **Tests**: Actualizar todos los tests para usar los nuevos nombres.

## 🚀 Próximos Pasos

1. ✅ Modelos traducidos
2. ⏳ Controladores (en progreso)
3. ⏳ Servicios
4. ⏳ Rutas
5. ⏳ Frontend
6. ⏳ Tests
7. ⏳ Documentación

## 📚 Recursos

- [Modelos traducidos](./backend/models/)
- [Guía de estilo de código](./ESTILO_CODIGO.md) (si existe)

