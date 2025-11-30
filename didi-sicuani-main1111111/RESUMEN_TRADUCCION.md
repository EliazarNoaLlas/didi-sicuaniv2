# Resumen de Traducción al Español

## ✅ Archivos Completados

### Modelos
- ✅ `backend/models/SolicitudViaje.js` (RideRequest)
- ✅ `backend/models/Usuario.js` (User)
- ✅ `backend/models/Oferta.js` (Bid)
- ✅ `backend/models/Calificacion.js` (Rating)
- ✅ `backend/models/ConfiguracionSistema.js` (SystemConfig)
- ✅ `backend/models/RegistroAuditoria.js` (AuditLog)

### Controladores
- ✅ `backend/controllers/controlador-autenticacion.js` (auth.controller.js)

### Servicios
- ✅ `backend/services/servicio-subasta.js` (bidding.service.js)

## 📝 Archivos Pendientes de Traducción

### Controladores (12 archivos)
1. `backend/controllers/bidding.controller.js` → `controlador-subasta.js`
2. `backend/controllers/driver.controller.js` → `controlador-conductor.js`
3. `backend/controllers/history.controller.js` → `controlador-historial.js`
4. `backend/controllers/ride-status.controller.js` → `controlador-estado-viaje.js`
5. `backend/controllers/admin.controller.js` → `controlador-administrador.js`
6. `backend/controllers/admin-history.controller.js` → `controlador-historial-admin.js`
7. `backend/controllers/audit.controller.js` → `controlador-auditoria.js`
8. `backend/controllers/stats.controller.js` → `controlador-estadisticas.js`
9. `backend/controllers/config.controller.js` → `controlador-configuracion.js`
10. `backend/controllers/report.controller.js` → `controlador-reportes.js`
11. `backend/controllers/rating.controller.js` → `controlador-calificaciones.js`
12. `backend/controllers/earnings.controller.js` → `controlador-ganancias.js`

### Servicios (5 archivos)
1. `backend/services/pricing.service.js` → `servicio-precios.js`
2. `backend/services/audit.service.js` → `servicio-auditoria.js`
3. `backend/services/metrics.service.js` → `servicio-metricas.js`
4. `backend/services/driver-hold.service.js` → `servicio-reserva-conductor.js`
5. `backend/services/driver-blocking.service.js` → `servicio-bloqueo-conductor.js`

## 🔄 Mapeo de Nombres

### Funciones Comunes
- `get*` → `obtener*`
- `create*` → `crear*`
- `update*` → `actualizar*`
- `delete*` → `eliminar*`
- `find*` → `buscar*`
- `validate*` → `validar*`
- `calculate*` → `calcular*`
- `handle*` → `manejar*`
- `notify*` → `notificar*`

### Variables Comunes
- `user` → `usuario`
- `driver` → `conductor`
- `passenger` → `pasajero`
- `ride` → `viaje`
- `rideRequest` → `solicitudViaje`
- `bid` → `oferta`
- `price` → `precio`
- `status` → `estado`
- `distance` → `distancia`
- `duration` → `duracion`
- `rating` → `calificacion`
- `history` → `historial`
- `earnings` → `ganancias`

## 📋 Patrón de Traducción

### Ejemplo de Controlador

**Antes (inglés):**
```javascript
export const getPassengerHistory = async (req, res) => {
  try {
    const passengerId = req.user.id;
    const rides = await RideRequest.find({ passenger_id: passengerId });
    res.json({ success: true, data: rides });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error' });
  }
};
```

**Después (español):**
```javascript
/**
 * Obtener historial de viajes de un pasajero
 * @param {Object} req - Request con información del usuario
 * @param {Object} res - Response
 */
export const obtenerHistorialPasajero = async (req, res) => {
  try {
    const idPasajero = req.usuario.id;
    const viajes = await SolicitudViaje.find({ id_pasajero: idPasajero });
    res.json({ exito: true, datos: viajes });
  } catch (error) {
    console.error('Error obteniendo historial de pasajero:', error);
    res.status(500).json({ exito: false, error: 'Error obteniendo historial' });
  }
};

// Exportar también con nombre en inglés para compatibilidad
export const getPassengerHistory = obtenerHistorialPasajero;
```

### Ejemplo de Servicio

**Antes (inglés):**
```javascript
class PricingService {
  async calculateSuggestedPrice(rideRequest) {
    const { origin_lat, origin_lon } = rideRequest;
    // ... lógica
  }
}
```

**Después (español):**
```javascript
/**
 * Servicio de Precios
 * Calcula precios sugeridos para viajes basado en distancia, duración y factores externos
 */
class ServicioPrecios {
  /**
   * Calcular precio sugerido para un viaje
   * @param {Object} solicitudViaje - Datos de la solicitud de viaje
   * @returns {Number} Precio sugerido en soles
   */
  async calcularPrecioSugerido(solicitudViaje) {
    const { origen_lat, origen_lon } = solicitudViaje;
    // ... lógica
  }
}

export default new ServicioPrecios();
// Exportar también con nombre en inglés para compatibilidad
export { ServicioPrecios as PricingService };
```

## 🚀 Próximos Pasos

1. **Completar traducción de controladores restantes**
   - Seguir el patrón establecido
   - Agregar comentarios JSDoc en español
   - Mantener exports en inglés para compatibilidad

2. **Completar traducción de servicios restantes**
   - Traducir nombres de clases y métodos
   - Agregar comentarios explicativos
   - Mantener compatibilidad

3. **Actualizar rutas**
   - Las rutas pueden mantener los mismos endpoints
   - Actualizar imports en los archivos de rutas

4. **Actualizar middleware**
   - Traducir mensajes de error
   - Mantener funcionalidad

5. **Actualizar frontend**
   - Traducir nombres de componentes
   - Actualizar llamadas API si cambian los nombres de campos

## ⚠️ Consideraciones

1. **Compatibilidad Temporal**: Se mantienen exports con nombres en inglés para permitir migración gradual
2. **Base de Datos**: Los nombres de campos en la base de datos pueden mantenerse en inglés o migrarse
3. **APIs Externas**: Mantener nombres en inglés si hay integraciones externas
4. **Tests**: Actualizar tests para usar nuevos nombres

## 📚 Referencias

- Ver `GUIA_TRADUCCION_ESPAÑOL.md` para mapeo completo de nombres
- Ver archivos traducidos como referencia de estilo

