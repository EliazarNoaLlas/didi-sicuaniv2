# Guía de Conexión a Bases de Datos - DiDi-Sicuani

## 📋 Índice

1. [Conexión a MongoDB](#1-conexión-a-mongodb)
2. [Conexión a PostgreSQL + PostGIS](#2-conexión-a-postgresql--postgis)
3. [Conexión a Redis](#3-conexión-a-redis)
4. [Verificación de Conexiones](#4-verificación-de-conexiones)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. Conexión a MongoDB

### 1.1 Instalación de MongoDB

**Windows:**
```bash
# Descargar desde: https://www.mongodb.com/try/download/community
# O usar Chocolatey:
choco install mongodb
```

**Linux (Ubuntu/Debian):**
```bash
# Importar clave GPG
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Agregar repositorio
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Instalar
sudo apt-get update
sudo apt-get install -y mongodb-org

# Iniciar servicio
sudo systemctl start mongod
sudo systemctl enable mongod
```

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### 1.2 Configuración en el Proyecto

**Archivo: `backend/.env`**
```env
MONGODB_URI=mongodb://localhost:27017/didi-sicuani
```

**Para MongoDB con autenticación:**
```env
MONGODB_URI=mongodb://usuario:password@localhost:27017/didi-sicuani?authSource=admin
```

**Para MongoDB Atlas (cloud):**
```env
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/didi-sicuani?retryWrites=true&w=majority
```

### 1.3 Código de Conexión

El código ya está implementado en `backend/config/database.js`:

```javascript
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Opciones de conexión
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Manejar eventos de conexión
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    return conn;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
};

export default connectDB;
```

### 1.4 Verificar Conexión MongoDB

**Desde terminal:**
```bash
# Conectar a MongoDB shell
mongosh

# O versión antigua:
mongo

# Verificar bases de datos
show dbs

# Usar base de datos
use didi-sicuani

# Ver colecciones
show collections
```

**Desde código (test):**
```javascript
// Crear archivo: backend/test-mongodb.js
import connectDB from './config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const testConnection = async () => {
  try {
    await connectDB();
    console.log('✅ MongoDB conectado exitosamente');
    
    // Probar query simple
    const mongoose = (await import('mongoose')).default;
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Colecciones:', collections.map(c => c.name));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

testConnection();
```

Ejecutar:
```bash
node backend/test-mongodb.js
```

---

## 2. Conexión a PostgreSQL + PostGIS

### 2.1 Instalación de PostgreSQL + PostGIS

**Windows:**
```bash
# Descargar desde: https://www.postgresql.org/download/windows/
# O usar Chocolatey:
choco install postgresql postgis
```

**Linux (Ubuntu/Debian):**
```bash
# Instalar PostgreSQL
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Instalar PostGIS
sudo apt-get install postgis postgresql-14-postgis-3

# Iniciar servicio
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS:**
```bash
brew install postgresql postgis
brew services start postgresql
```

### 2.2 Configuración Inicial de PostgreSQL

```bash
# Cambiar a usuario postgres
sudo -u postgres psql

# O en Windows (desde PowerShell como Admin):
psql -U postgres
```

**Crear base de datos:**
```sql
-- Crear base de datos
CREATE DATABASE sicuani_geo;

-- Conectar a la base de datos
\c sicuani_geo

-- Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS pgrouting;
CREATE EXTENSION IF NOT EXISTS hstore;

-- Verificar instalación
SELECT postgis_version();
SELECT pgr_version();
```

**Crear usuario (opcional):**
```sql
-- Crear usuario
CREATE USER didi_user WITH PASSWORD 'tu_password_segura';

-- Dar permisos
GRANT ALL PRIVILEGES ON DATABASE sicuani_geo TO didi_user;
GRANT ALL ON SCHEMA public TO didi_user;
```

### 2.3 Configuración en el Proyecto

**Archivo: `backend/.env`**
```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=sicuani_geo
POSTGRES_USER=postgres
POSTGRES_PASSWORD=tu_password
```

### 2.4 Código de Conexión

El código ya está implementado en `backend/config/postgres.js`:

```javascript
import pkg from 'pg';
const { Pool } = pkg;

let pool = null;

const createPostgresPool = () => {
  if (!pool) {
    pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'sicuani_geo',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD,
      max: 20, // Máximo de clientes en el pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });

    // Test connection
    pool.query('SELECT NOW()', (err, res) => {
      if (err) {
        console.error('PostgreSQL connection error:', err);
      } else {
        console.log('✅ PostgreSQL + PostGIS connected');
      }
    });
  }

  return pool;
};

const getPostgresPool = () => {
  if (!pool) {
    return createPostgresPool();
  }
  return pool;
};

export default createPostgresPool;
export { getPostgresPool };
```

### 2.5 Verificar Conexión PostgreSQL

**Desde terminal:**
```bash
# Conectar a PostgreSQL
psql -U postgres -d sicuani_geo

# Verificar PostGIS
SELECT PostGIS_version();

# Verificar pgRouting
SELECT pgr_version();

# Verificar tablas
\dt

# Verificar funciones
\df
```

**Desde código (test):**
```javascript
// Crear archivo: backend/test-postgres.js
import { getPostgresPool } from './config/postgres.js';
import dotenv from 'dotenv';

dotenv.config();

const testConnection = async () => {
  try {
    const pool = getPostgresPool();
    
    // Test 1: Conexión básica
    const result1 = await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL conectado:', result1.rows[0].now);
    
    // Test 2: Verificar PostGIS
    const result2 = await pool.query('SELECT PostGIS_version()');
    console.log('✅ PostGIS version:', result2.rows[0].postgis_version);
    
    // Test 3: Verificar pgRouting
    const result3 = await pool.query('SELECT pgr_version()');
    console.log('✅ pgRouting version:', result3.rows[0].pgr_version);
    
    // Test 4: Probar función de cálculo de métricas
    const result4 = await pool.query(`
      SELECT * FROM calculate_trip_metrics(
        -14.2694, -71.2256,  -- Sicuani centro
        -14.2700, -71.2260   -- Destino cercano
      )
    `);
    console.log('✅ Función calculate_trip_metrics:', result4.rows[0]);
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

testConnection();
```

Ejecutar:
```bash
node backend/test-postgres.js
```

---

## 3. Conexión a Redis

### 3.1 Instalación de Redis

**Windows:**
```bash
# Opción 1: Usar WSL2 (recomendado)
wsl
sudo apt-get install redis-server

# Opción 2: Descargar desde: https://github.com/microsoftarchive/redis/releases
# O usar Chocolatey:
choco install redis-64
```

**Linux (Ubuntu/Debian):**
```bash
# Instalar Redis
sudo apt-get update
sudo apt-get install redis-server

# Iniciar servicio
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verificar que está corriendo
sudo systemctl status redis-server
```

**macOS:**
```bash
brew install redis
brew services start redis
```

### 3.2 Configuración de Redis

**Archivo de configuración (Linux): `/etc/redis/redis.conf`**

```conf
# Permitir conexiones desde localhost
bind 127.0.0.1

# Puerto (default: 6379)
port 6379

# Contraseña (opcional, recomendado para producción)
# requirepass tu_password_segura

# Persistencia
save 900 1
save 300 10
save 60 10000
```

**Reiniciar Redis después de cambios:**
```bash
sudo systemctl restart redis-server
```

### 3.3 Configuración en el Proyecto

**Archivo: `backend/.env`**
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

**Para Redis con contraseña:**
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=tu_password
```

### 3.4 Código de Conexión

El código ya está implementado en `backend/config/redis.js`:

```javascript
import { createClient } from 'redis';

let redisClient = null;

const connectRedis = async () => {
  try {
    redisClient = createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis Client Connected');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('Error connecting to Redis:', error);
    throw error;
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
};

export default connectRedis;
export { getRedisClient };
```

### 3.5 Verificar Conexión Redis

**Desde terminal:**
```bash
# Conectar a Redis CLI
redis-cli

# O con contraseña:
redis-cli -a tu_password

# Test de conexión
PING
# Debe responder: PONG

# Ver información del servidor
INFO server

# Ver todas las claves
KEYS *

# Ver valor de una clave
GET nombre_clave

# Salir
exit
```

**Desde código (test):**
```javascript
// Crear archivo: backend/test-redis.js
import connectRedis, { getRedisClient } from './config/redis.js';
import dotenv from 'dotenv';

dotenv.config();

const testConnection = async () => {
  try {
    // Conectar
    await connectRedis();
    const redis = getRedisClient();
    
    // Test 1: PING
    const pong = await redis.ping();
    console.log('✅ Redis PING:', pong);
    
    // Test 2: SET/GET
    await redis.set('test:key', 'test:value', { EX: 60 }); // Expira en 60 segundos
    const value = await redis.get('test:key');
    console.log('✅ Redis SET/GET:', value);
    
    // Test 3: Verificar que expira
    const ttl = await redis.ttl('test:key');
    console.log('✅ Redis TTL:', ttl, 'segundos');
    
    // Test 4: Operaciones con colas (Sorted Set)
    await redis.zAdd('test:queue', {
      score: 100,
      value: 'item1'
    });
    const queueItems = await redis.zRangeWithScores('test:queue', 0, -1);
    console.log('✅ Redis Sorted Set:', queueItems);
    
    // Limpiar
    await redis.del('test:key', 'test:queue');
    
    await redis.quit();
    console.log('✅ Redis desconectado');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

testConnection();
```

Ejecutar:
```bash
node backend/test-redis.js
```

---

## 4. Verificación de Conexiones

### 4.1 Script de Verificación Completa

Crear archivo: `backend/test-connections.js`

```javascript
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import connectRedis from './config/redis.js';
import { getPostgresPool } from './config/postgres.js';

dotenv.config();

const testAllConnections = async () => {
  console.log('🔍 Verificando conexiones...\n');
  
  // Test MongoDB
  try {
    await connectDB();
    console.log('✅ MongoDB: Conectado');
  } catch (error) {
    console.error('❌ MongoDB: Error -', error.message);
  }
  
  // Test PostgreSQL
  try {
    const pool = getPostgresPool();
    const result = await pool.query('SELECT NOW(), PostGIS_version()');
    console.log('✅ PostgreSQL: Conectado');
    console.log('   PostGIS:', result.rows[0].postgis_version);
  } catch (error) {
    console.error('❌ PostgreSQL: Error -', error.message);
  }
  
  // Test Redis
  try {
    await connectRedis();
    const redis = (await import('./config/redis.js')).getRedisClient();
    const pong = await redis.ping();
    console.log('✅ Redis: Conectado');
    await redis.quit();
  } catch (error) {
    console.error('❌ Redis: Error -', error.message);
  }
  
  console.log('\n✨ Verificación completada');
  process.exit(0);
};

testAllConnections();
```

Ejecutar:
```bash
node backend/test-connections.js
```

### 4.2 Verificar desde el Servidor

El servidor ya verifica las conexiones al iniciar. Ver `backend/server.js`:

```javascript
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✅ MongoDB connected');

    // Connect to Redis
    await connectRedis();
    console.log('✅ Redis connected');

    // PostgreSQL se conecta bajo demanda (lazy connection)
    
    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};
```

---

## 5. Troubleshooting

### 5.1 Problemas Comunes con MongoDB

**Error: "MongoServerError: Authentication failed"**
```bash
# Verificar credenciales en .env
# Verificar que el usuario existe en MongoDB
mongosh
use admin
db.getUsers()
```

**Error: "ECONNREFUSED"**
```bash
# Verificar que MongoDB está corriendo
sudo systemctl status mongod  # Linux
# O verificar proceso en Windows

# Iniciar MongoDB
sudo systemctl start mongod  # Linux
# O desde servicios en Windows
```

**Error: "Database does not exist"**
```bash
# MongoDB crea la base de datos automáticamente al primer uso
# O crear manualmente:
mongosh
use didi-sicuani
```

### 5.2 Problemas Comunes con PostgreSQL

**Error: "password authentication failed"**
```bash
# Verificar contraseña en .env
# O cambiar contraseña:
sudo -u postgres psql
ALTER USER postgres PASSWORD 'nueva_password';
```

**Error: "PostGIS extension not found"**
```bash
# Instalar PostGIS
sudo apt-get install postgresql-14-postgis-3

# Habilitar extensión
psql -U postgres -d sicuani_geo
CREATE EXTENSION postgis;
```

**Error: "relation does not exist"**
```bash
# Ejecutar script de inicialización
psql -U postgres -d sicuani_geo -f postgres-geo/init.sql
```

**Error: "pgrouting extension not found"**
```bash
# Instalar pgRouting
sudo apt-get install postgresql-14-pgrouting

# Habilitar extensión
psql -U postgres -d sicuani_geo
CREATE EXTENSION pgrouting;
```

### 5.3 Problemas Comunes con Redis

**Error: "ECONNREFUSED"**
```bash
# Verificar que Redis está corriendo
redis-cli ping
# Debe responder PONG

# Si no responde, iniciar Redis:
sudo systemctl start redis-server  # Linux
# O desde servicios en Windows
```

**Error: "NOAUTH Authentication required"**
```bash
# Redis tiene contraseña configurada
# Agregar contraseña en .env:
REDIS_PASSWORD=tu_password

# O deshabilitar contraseña en redis.conf:
# Comentar: requirepass tu_password
```

**Error: "Connection timeout"**
```bash
# Verificar firewall
sudo ufw allow 6379  # Linux

# Verificar que Redis escucha en el puerto correcto
redis-cli -h localhost -p 6379 ping
```

### 5.4 Verificar Puertos

```bash
# Ver qué servicios están usando los puertos
# Windows:
netstat -ano | findstr :27017  # MongoDB
netstat -ano | findstr :5432   # PostgreSQL
netstat -ano | findstr :6379   # Redis

# Linux/macOS:
lsof -i :27017  # MongoDB
lsof -i :5432   # PostgreSQL
lsof -i :6379   # Redis

# O usar:
sudo ss -tlnp | grep :27017
sudo ss -tlnp | grep :5432
sudo ss -tlnp | grep :6379
```

### 5.5 Logs de Depuración

**Habilitar logs detallados en MongoDB:**
```javascript
// En backend/config/database.js
mongoose.set('debug', true);
```

**Habilitar logs en PostgreSQL:**
```sql
-- En postgresql.conf
log_statement = 'all'
log_duration = on
```

**Habilitar logs en Redis:**
```bash
# En redis.conf
loglevel verbose
```

---

## 6. Ejemplos de Uso

### 6.1 Usar MongoDB en un Controlador

```javascript
// backend/controllers/example.controller.js
import User from '../models/User.js';

export const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### 6.2 Usar PostgreSQL en un Servicio

```javascript
// backend/services/example.service.js
import { getPostgresPool } from '../config/postgres.js';

export const calculateRoute = async (originLat, originLon, destLat, destLon) => {
  const pool = getPostgresPool();
  const query = `
    SELECT * FROM calculate_route($1, $2, $3, $4)
  `;
  const result = await pool.query(query, [originLat, originLon, destLat, destLon]);
  return result.rows;
};
```

### 6.3 Usar Redis para Cache

```javascript
// backend/services/example.service.js
import { getRedisClient } from '../config/redis.js';

export const getCachedData = async (key) => {
  const redis = getRedisClient();
  
  // Intentar obtener de cache
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Si no está en cache, obtener de BD
  const data = await fetchFromDatabase();
  
  // Guardar en cache por 1 hora
  await redis.setEx(key, 3600, JSON.stringify(data));
  
  return data;
};
```

---

## 7. Configuración de Producción

### 7.1 MongoDB Atlas (Cloud)

```env
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/didi-sicuani?retryWrites=true&w=majority
```

### 7.2 PostgreSQL en Cloud (AWS RDS, DigitalOcean, etc.)

```env
POSTGRES_HOST=tu-host.rds.amazonaws.com
POSTGRES_PORT=5432
POSTGRES_DB=sicuani_geo
POSTGRES_USER=admin
POSTGRES_PASSWORD=password_segura
```

### 7.3 Redis en Cloud (Redis Cloud, AWS ElastiCache)

```env
REDIS_HOST=tu-redis-host.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=password_segura
```

---

## ✅ Checklist de Verificación

- [ ] MongoDB instalado y corriendo
- [ ] PostgreSQL + PostGIS instalado y corriendo
- [ ] Redis instalado y corriendo
- [ ] Variables de entorno configuradas en `.env`
- [ ] Extensiones PostGIS habilitadas
- [ ] Scripts de inicialización ejecutados
- [ ] Conexiones verificadas con scripts de test
- [ ] Servidor backend inicia sin errores

---

## 📚 Recursos Adicionales

- **MongoDB:** https://docs.mongodb.com/
- **PostgreSQL:** https://www.postgresql.org/docs/
- **PostGIS:** https://postgis.net/documentation/
- **pgRouting:** https://docs.pgrouting.org/
- **Redis:** https://redis.io/documentation

---

¿Necesitas ayuda con alguna conexión específica? Ejecuta los scripts de test para identificar el problema.

