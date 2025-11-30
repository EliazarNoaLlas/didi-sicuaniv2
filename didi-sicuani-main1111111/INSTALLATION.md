# Guía de Instalación - DiDi-Sicuani

## 📋 Requisitos Previos

- Node.js 18+ 
- MongoDB 6+
- PostgreSQL 14+ con PostGIS 3.3+
- Redis 7+
- npm o yarn

## 🚀 Instalación Paso a Paso

### 1. Clonar/Preparar el Proyecto

```bash
cd didi-sicuani
```

### 2. Configurar Backend

```bash
cd backend
npm install
```

Crear archivo `.env` basado en `.env.example`:

```bash
cp .env.example .env
```

Editar `.env` con tus credenciales:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/didi-sicuani
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=sicuani_geo
POSTGRES_USER=postgres
POSTGRES_PASSWORD=tu_password
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=tu_secret_key_muy_segura
```

### 3. Configurar Frontend

```bash
cd ../frontend
npm install
```

Crear archivo `.env`:

```bash
cp .env.example .env
```

### 4. Configurar PostgreSQL + PostGIS

```bash
# Conectar a PostgreSQL
psql -U postgres

# Ejecutar script de inicialización
\i postgres-geo/init.sql
```

### 5. Iniciar Servicios

**Terminal 1 - MongoDB:**
```bash
mongod
```

**Terminal 2 - Redis:**
```bash
redis-server
```

**Terminal 3 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 4 - Frontend:**
```bash
cd frontend
npm run dev
```

### 6. Acceder a la Aplicación

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/health

## 📝 Notas Importantes

1. **PostGIS Setup**: Para producción, necesitas importar datos OSM de Sicuani usando `osm2pgsql`. Ver `Metodologia_Geolocalizacion_DB.md` para detalles.

2. **MongoDB Models**: Los modelos de MongoDB están pendientes de implementación. Ver estructura en `backend/models/` (crear según necesidad).

3. **Socket.io**: Asegúrate de que CORS esté configurado correctamente en `backend/server.js`.

## 🔧 Troubleshooting

### Error de conexión a MongoDB
- Verificar que MongoDB esté corriendo: `mongod`
- Verificar URI en `.env`

### Error de conexión a PostgreSQL
- Verificar que PostGIS esté instalado: `SELECT PostGIS_version();`
- Verificar credenciales en `.env`

### Error de conexión a Redis
- Verificar que Redis esté corriendo: `redis-cli ping`
- Debe responder: `PONG`

### Error de Socket.io
- Verificar que `SOCKET_CORS_ORIGIN` en `.env` del backend coincida con la URL del frontend

