
# Instrucciones Copilot para DiDi-Sicuani

## Resumen del Proyecto
DiDi-Sicuani es una plataforma de ride-hailing para Sicuani, Perú, con un sistema de **Reverse Bidding**. Los pasajeros proponen precios y los conductores pueden aceptar, rechazar o hacer contraofertas. El sistema funciona sin APIs externas costosas, usando geolocalización y mapas offline open-source.

## Arquitectura y Flujo de Datos
- **Backend**: Node.js (Express), MongoDB (Mongoose), Redis, Socket.io, JWT, Swagger
  - Configuración clave: `backend/config/database.js`, `redis.js`, `swagger.js`
  - Controladores: `backend/controllers/` (ej: `bidding.controller.js`, `auth.controller.js`)
  - Tiempo real: Socket.io para notificaciones y estado de viajes
- **Frontend**: React (Vite, Tailwind, Zustand, Socket.io Client)
- **Mobile**: React Native, Mapbox GL, Firebase
- **Flujo de datos**: Ver README para diagramas mermaid. Flujo típico: Pasajero crea solicitud → Backend guarda en MongoDB → Socket.io notifica a conductores → Proceso de subasta → Asignación de viaje.

## Flujos de Trabajo
- **Backend**
  - Iniciar: `node backend/server.js` (o usar `nodemon` para hot reload)
  - Probar DB: `node backend/test-mongodb.js`, `node backend/test-redis.js`
  - Documentación API: Swagger vía `backend/config/swagger.js`
- **Frontend**
  - Iniciar: `npm run dev` en `frontend/`
- **Mobile**
  - Flujo estándar React Native

## Convenciones y Patrones
- **Reverse Bidding**: Lógica central en `bidding.controller.js` y modelos relacionados (`Bid.js`, `BidNegotiation.js`)
- **Eventos Socket.io**: Comunicación en tiempo real para solicitudes y estados. Ver `backend/SOLUCION_CONEXIONES_SOCKET.md` para troubleshooting.
- **Autenticación**: JWT vía `auth.middleware.js` y `auth.controller.js`
- **Geolocalización**: Cálculos offline, sin Google Maps. Ver `Metodologia_Geolocalizacion_DB.md` y `postgres-geo/`.
- **Manejo de errores**: Respuestas personalizadas en controladores; revisar conexiones MongoDB/Redis.
- **API REST**: Endpoints documentados en Swagger.

## Puntos de Integración
- **MongoDB**: Base principal, configurada en `backend/config/database.js`
- **Redis**: Cache y colas, configurado en `backend/config/redis.js`
- **Socket.io**: Notificaciones en tiempo real, integrado en backend y clientes frontend/mobile
- **Mapbox GL**: Mapas en mobile y frontend
- **Firebase**: Notificaciones push en mobile

## Archivos y Directorios Clave
- `backend/controllers/` — Lógica de negocio
- `backend/models/` — Modelos de datos
- `backend/config/` — Configuración de servicios
- `backend/middleware/` — Autenticación y otros middleware
- `frontend/src/` — Código fuente React
- `mobile/src/` — Código fuente React Native
- `postgres-geo/` — Scripts SQL geoespaciales

## Ejemplos
- Para agregar una nueva solicitud de viaje, actualiza el modelo y controlador `RideRequest`, emite eventos Socket.io relevantes y asegúrate que los clientes frontend/mobile los manejen.
- Para nueva lógica de subasta, extiende `BidNegotiation.js` y actualiza `bidding.controller.js`.

---
**Para más detalles, consulta el `README.md` principal y los archivos de documentación en la carpeta backend.**
