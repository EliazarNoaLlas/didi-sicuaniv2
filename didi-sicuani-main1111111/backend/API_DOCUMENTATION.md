# 📚 Documentación de la API - DiDi-Sicuani

## 🚀 Acceso a la Documentación

Una vez que el servidor esté corriendo, puedes acceder a la documentación interactiva de Swagger en:

**🔗 http://localhost:5000/api-docs**

O en producción:
**🔗 https://api.didi-sicuani.com/api-docs**

---

## 📋 Características de la Documentación

- ✅ **Interfaz Interactiva**: Prueba los endpoints directamente desde el navegador
- ✅ **Autenticación JWT**: Botón "Authorize" para agregar tu token
- ✅ **Ejemplos de Request/Response**: Ver ejemplos reales de uso
- ✅ **Esquemas Completos**: Documentación de todos los modelos de datos
- ✅ **Códigos de Estado HTTP**: Documentación de todas las respuestas posibles

---

## 🔐 Autenticación

La mayoría de los endpoints requieren autenticación JWT. Para usar la documentación interactiva:

1. **Inicia sesión** usando el endpoint `/api/auth/login`
2. **Copia el token** de la respuesta
3. **Haz clic en el botón "Authorize"** (🔒) en la parte superior de la documentación
4. **Pega el token** en el campo "Value"
5. **Haz clic en "Authorize"** y luego "Close"
6. Ahora todos los endpoints protegidos usarán tu token automáticamente

---

## 📖 Endpoints Documentados

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar nuevo usuario

### Viajes
- `POST /api/rides/calculate-price` - Calcular precio sugerido
- `POST /api/rides/request` - Crear solicitud de viaje
- `GET /api/rides/:id` - Obtener detalles de viaje
- `POST /api/rides/:id/cancel` - Cancelar viaje
- `POST /api/rides/:id/bids` - Enviar oferta (conductor)
- `POST /api/rides/:id/bids/:bidId/respond` - Responder oferta (pasajero)

### Rutas
- `GET /api/rides/route` - Obtener geometría de ruta

### Usuarios
- `GET /api/users/profile` - Obtener perfil del usuario

### Conductores
- `GET /api/drivers/queue` - Cola de viajes

### Admin
- `GET /api/admin/metrics` - Métricas generales
- `GET /api/admin/metrics/rides` - Métricas de viajes
- `GET /api/admin/metrics/drivers` - Métricas de conductores
- `GET /api/admin/metrics/revenue` - Métricas de ingresos
- `GET /api/admin/metrics/bidding` - Métricas de bidding

### Health
- `GET /health` - Verificar estado del servidor

---

## 🧪 Probar Endpoints desde Swagger

1. **Abre la documentación** en http://localhost:5000/api-docs
2. **Expande el endpoint** que quieres probar
3. **Haz clic en "Try it out"**
4. **Completa los parámetros** requeridos
5. **Haz clic en "Execute"**
6. **Revisa la respuesta** en la sección "Responses"

---

## 📝 Notas Importantes

- Todos los endpoints protegidos requieren el header `Authorization: Bearer <token>`
- Los endpoints de Admin requieren que el usuario tenga rol `admin`
- Los endpoints de Conductores requieren que el usuario tenga rol `driver`
- Los IDs de MongoDB deben ser ObjectIds válidos (24 caracteres hexadecimales)

---

## 🔄 Actualizar la Documentación

La documentación se genera automáticamente desde los comentarios JSDoc en los archivos de rutas. Para agregar o modificar documentación:

1. Edita los comentarios `@swagger` en los archivos de rutas
2. Reinicia el servidor
3. La documentación se actualizará automáticamente

---

## 📚 Recursos Adicionales

- **Swagger/OpenAPI Specification**: https://swagger.io/specification/
- **Swagger UI**: https://swagger.io/tools/swagger-ui/

---

¿Necesitas ayuda? Revisa la documentación interactiva en `/api-docs` o consulta el código fuente en `backend/routes/`.

