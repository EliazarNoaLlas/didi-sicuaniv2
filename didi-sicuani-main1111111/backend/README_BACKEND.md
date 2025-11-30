# Backend API - DiDi-Sicuani

## 🔐 Múltiples Sesiones en Local

Para probar con pasajero y conductor simultáneamente:

1. **Crear usuarios de prueba:**
   ```bash
   node scripts/create-test-users.js
   ```

2. **Ver guía completa:**
   - `GUIA_MULTIPLES_SESIONES.md` - Guía detallada de métodos

3. **Scripts de prueba:**
   - `scripts/test-multiple-sessions.sh` - Prueba completa con cURL
   - `scripts/test-socket-clients.js` - Prueba Socket.io (requiere `socket.io-client`)

## 🚀 Inicio Rápido

```bash
npm install
cp .env.example .env
# Editar .env con tus credenciales
npm run dev
```

## 📁 Estructura

```
backend/
├── config/          # Configuraciones (DB, Redis)
├── controllers/     # Controladores (lógica de negocio)
├── middleware/      # Middlewares (auth, validación)
├── models/          # Modelos MongoDB
├── routes/          # Rutas API
├── services/        # Servicios de negocio
│   ├── bidding.service.js    # Sistema de Reverse Bidding
│   ├── pricing.service.js     # Cálculo de precios
│   └── metrics.service.js     # Métricas en tiempo real
├── utils/           # Utilidades
│   ├── socket.js    # Socket.io setup
│   └── cron.js      # Tareas programadas
└── server.js        # Entry point
```

## 🔌 Endpoints Principales

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrarse

### Viajes (Rides)
- `POST /api/rides/calculate-price` - Calcular precio sugerido
- `POST /api/rides/request` - Crear solicitud de viaje
- `GET /api/rides/:id` - Obtener detalles de viaje
- `POST /api/rides/:id/cancel` - Cancelar viaje
- `GET /api/rides/route` - Obtener geometría de ruta

### Bidding
- `POST /api/bidding/request` - Crear solicitud (legacy)
- `POST /api/rides/:id/bids` - Enviar bid (conductor)
- `POST /api/rides/:id/bids/:bidId/respond` - Responder bid (pasajero)

### Conductores
- `GET /api/driver/queue` - Cola de viajes
- `GET /api/driver/recommendations` - Recomendaciones

### Admin
- `GET /api/admin/metrics` - Métricas en tiempo real
- `GET /api/admin/metrics/rides` - Métricas de viajes
- `GET /api/admin/metrics/drivers` - Métricas de conductores
- `GET /api/admin/metrics/revenue` - Métricas de ingresos
- `GET /api/admin/metrics/bidding` - Métricas de bidding

## 🔐 Autenticación

Todas las rutas protegidas requieren header:
```
Authorization: Bearer <JWT_TOKEN>
```

## 📡 Socket.io Events

### Cliente → Servidor
- `ride:request` - Nueva solicitud
- `ride:accept` - Aceptar viaje
- `bid:submit` - Enviar bid
- `driver:location` - Actualizar ubicación

### Servidor → Cliente
- `ride:new` - Nueva solicitud disponible
- `ride:accepted` - Viaje aceptado
- `bid:received` - Nueva oferta recibida
- `metrics:update` - Actualización de métricas

## ⚙️ Variables de Entorno

Ver `.env.example` para todas las variables requeridas.

## 📚 Documentación de la API

La documentación interactiva de Swagger está disponible en:

**🔗 http://localhost:5000/api-docs**

Incluye:
- ✅ Todos los endpoints documentados
- ✅ Interfaz interactiva para probar endpoints
- ✅ Autenticación JWT integrada
- ✅ Ejemplos de request/response
- ✅ Esquemas de datos completos

Ver [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) para más detalles.

## 🧪 Testing

```bash
npm test
```

## 📊 Monitoreo

- Health check: `GET /health`
- Métricas actualizadas cada 5 minutos vía cron
- Socket.io para actualizaciones en tiempo real

