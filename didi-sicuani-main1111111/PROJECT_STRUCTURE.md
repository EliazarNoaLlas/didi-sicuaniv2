# Estructura del Proyecto DiDi-Sicuani

## 📁 Estructura de Directorios

```
didi-sicuani/
├── backend/                    # Backend API (Express)
│   ├── config/                # Configuraciones
│   │   ├── database.js       # MongoDB connection
│   │   ├── redis.js          # Redis connection
│   │   └── postgres.js       # PostgreSQL + PostGIS connection
│   ├── controllers/          # Controladores (lógica de negocio)
│   │   ├── auth.controller.js
│   │   └── bidding.controller.js
│   ├── middleware/           # Middlewares
│   │   └── auth.middleware.js
│   ├── models/              # Modelos MongoDB
│   │   ├── User.js
│   │   ├── RideRequest.js
│   │   └── Bid.js
│   ├── routes/              # Rutas API
│   │   ├── auth.routes.js
│   │   ├── bidding.routes.js
│   │   ├── driver.routes.js
│   │   ├── ride.routes.js
│   │   └── ...
│   ├── services/            # Servicios de negocio
│   │   └── pricing.service.js
│   ├── utils/              # Utilidades
│   │   └── socket.js      # Socket.io setup
│   ├── server.js           # Entry point
│   ├── package.json
│   └── .env.example
│
├── frontend/                # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes reutilizables
│   │   │   └── Layout.jsx
│   │   ├── pages/          # Páginas
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Metrics.jsx
│   │   │   └── ...
│   │   ├── services/       # Servicios API
│   │   │   ├── api.js
│   │   │   └── socket.js
│   │   ├── store/          # Estado global (Zustand)
│   │   │   └── authStore.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
│
├── postgres-geo/           # Scripts PostgreSQL
│   └── init.sql           # Inicialización PostGIS
│
├── README.md
├── INSTALLATION.md
├── PROJECT_STRUCTURE.md
└── .gitignore
```

## 🔧 Tecnologías por Capa

### Backend
- **Express.js** - Framework web
- **MongoDB + Mongoose** - Base de datos principal
- **PostgreSQL + PostGIS** - Base de datos geoespacial
- **Redis** - Cache y colas
- **Socket.io** - Comunicación en tiempo real
- **JWT** - Autenticación

### Frontend
- **React 18** - Framework UI
- **Vite** - Build tool
- **Tailwind CSS** - Estilos
- **Material UI** - Componentes
- **Recharts** - Gráficos
- **Zustand** - Estado global
- **Socket.io Client** - WebSockets
- **React Router** - Routing

## 📊 Flujo de Datos

```
Frontend (React)
    ↓ HTTP/WebSocket
Backend API (Express)
    ↓
┌───────────┬───────────┬───────────┐
│  MongoDB  │ PostgreSQL│   Redis   │
│  (Users,  │  (Routes,  │  (Cache,  │
│   Rides)  │  GeoData)  │   Queue)  │
└───────────┴───────────┴───────────┘
```

## 🚀 Endpoints Principales

### Autenticación
- `POST /api/auth/login`
- `POST /api/auth/register`

### Bidding (Reverse Bidding)
- `POST /api/bidding/request` - Crear solicitud
- `POST /api/bidding/bid` - Enviar oferta
- `POST /api/bidding/accept/:bidId` - Aceptar oferta
- `GET /api/bidding/ride/:rideId` - Obtener bids

### Conductores
- `GET /api/driver/queue` - Cola de viajes
- `GET /api/driver/recommendations` - Recomendaciones

### Admin
- `GET /api/admin/metrics` - Métricas en tiempo real

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
- `driver:location:update` - Actualización de ubicación
- `metrics:update` - Actualización de métricas

