# Guía de Inicio Rápido - DiDi-Sicuani

## ⚡ Setup en 5 Minutos

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Editar .env con tus credenciales
npm run dev
```

### 2. Frontend Web

```bash
cd frontend
npm install
#cp .env.example .env
npm run dev
```

### 3. PostgreSQL + PostGIS

```bash
# Instalar PostgreSQL con PostGIS
sudo apt-get install postgresql postgresql-contrib postgis postgresql-14-postgis-3

# Crear base de datos
createdb sicuani_geo
psql sicuani_geo < postgres-geo/init.sql
```

### 4. Redis

```bash
# Instalar Redis
sudo apt-get install redis-server

# Iniciar Redis
redis-server
```

### 5. MongoDB

```bash
# Instalar MongoDB
# Ver: https://www.mongodb.com/docs/manual/installation/

# Iniciar MongoDB
mongod
```

## 🚀 Verificar Instalación

1. **Backend:** http://localhost:5000/health
2. **Frontend:** http://localhost:5173
3. **PostgreSQL:** `psql -U postgres -c "SELECT PostGIS_version();"`
4. **Redis:** `redis-cli ping` (debe responder PONG)

## 📝 Próximos Pasos

1. Importar datos OSM de Sicuani (ver `scripts/update-osm-data.sh`)
2. Configurar Mapbox token para app móvil
3. Crear usuario de prueba
4. Probar flujo completo de Reverse Bidding

## 🔧 Troubleshooting

### Error: "Cannot find module"
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Error: PostgreSQL connection
- Verificar que PostgreSQL esté corriendo
- Verificar credenciales en `.env`
- Verificar que PostGIS esté instalado

### Error: Redis connection
- Verificar que Redis esté corriendo: `redis-cli ping`
- Verificar host y puerto en `.env`

## 📚 Documentación Completa

- [INSTALLATION.md](./INSTALLATION.md) - Guía detallada
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Estructura del proyecto
- [MOBILE_SETUP.md](./MOBILE_SETUP.md) - Setup de app móvil
- [COSTS_COMPARISON.md](./COSTS_COMPARISON.md) - Análisis de costos
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - Plan de implementación

