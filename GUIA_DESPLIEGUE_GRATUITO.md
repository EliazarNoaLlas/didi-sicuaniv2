# 🚀 Guía Completa de Despliegue Gratuito - DiDi-Sicuani

Esta guía te mostrará cómo desplegar completamente la aplicación DiDi-Sicuani de forma **100% gratuita** usando servicios en la nube con planes gratuitos.

---

## 📋 Índice

1. [Resumen de Servicios Gratuitos](#1-resumen-de-servicios-gratuitos)
2. [Paso 1: Configurar MongoDB Atlas (Gratis)](#2-paso-1-configurar-mongodb-atlas-gratis)
3. [Paso 2: Configurar Redis (Opcional - Gratis)](#3-paso-2-configurar-redis-opcional---gratis)
4. [Paso 3: Desplegar Backend (Gratis)](#4-paso-3-desplegar-backend-gratis)
5. [Paso 4: Desplegar Frontend (Gratis)](#5-paso-4-desplegar-frontend-gratis)
6. [Paso 5: Configurar Variables de Entorno](#6-paso-5-configurar-variables-de-entorno)
7. [Paso 6: Verificar Despliegue](#7-paso-6-verificar-despliegue)
8. [Troubleshooting](#8-troubleshooting)
9. [Alternativas Gratuitas](#9-alternativas-gratuitas)

---

## 1. Resumen de Servicios Gratuitos

### Stack de Despliegue Recomendado (100% Gratis)

| Componente | Servicio | Plan Gratuito | Límites |
|------------|----------|---------------|---------|
| **MongoDB** | MongoDB Atlas | Free Tier (M0) | 512 MB, Shared Cluster |
| **Backend** | Render / Railway | Free Tier | 750 horas/mes, Sleep después de inactividad |
| **Frontend** | Vercel / Netlify | Free Tier | Ilimitado, CDN global |
| **Redis** | Upstash | Free Tier | 10,000 comandos/día |

### Alternativas por Componente

**Backend:**
- ✅ **Render** (Recomendado) - 750h/mes gratis, fácil setup
- ✅ **Railway** - $5 crédito gratis/mes, más flexible
- ✅ **Fly.io** - 3 VMs gratis, más técnico
- ✅ **Cyclic** - Gratis, especializado en Node.js

**Frontend:**
- ✅ **Vercel** (Recomendado) - Ilimitado, excelente para React
- ✅ **Netlify** - Ilimitado, muy fácil
- ✅ **Cloudflare Pages** - Ilimitado, muy rápido

**MongoDB:**
- ✅ **MongoDB Atlas** - 512 MB gratis, suficiente para desarrollo/pequeña producción

**Redis (Opcional):**
- ✅ **Upstash** - 10K comandos/día gratis
- ✅ **Redis Cloud** - 30 MB gratis

---

## 2. Paso 1: Configurar MongoDB Atlas (Gratis)

### 2.1 Crear Cuenta en MongoDB Atlas

1. Ve a: https://www.mongodb.com/cloud/atlas/register
2. Completa el registro:
   - Email
   - Contraseña
   - Nombre de organización (puede ser personal)
   - Nombre del proyecto: `DiDi-Sicuani`

### 2.2 Crear Cluster Gratuito

1. Una vez registrado, verás la opción de crear un cluster
2. Selecciona:
   - **Provider**: AWS (recomendado) o Google Cloud
   - **Region**: Elige la más cercana a ti (ej: `us-east-1`)
   - **Cluster Tier**: **M0 Sandbox** (FREE)
   - **Cluster Name**: `didi-sicuani-cluster`
3. Haz clic en **Create Cluster**
4. Espera 3-5 minutos mientras se crea el cluster

### 2.3 Configurar Acceso a la Base de Datos

**Paso 1: Crear Usuario de Base de Datos**

1. En el menú lateral, ve a **Database Access**
2. Haz clic en **Add New Database User**
3. Configura:
   - **Authentication Method**: Password
   - **Username**: `didi-sicuani-user` (o el que prefieras)
   - **Password**: Genera una contraseña segura (guárdala, la necesitarás)
   - **Database User Privileges**: **Read and write to any database**
4. Haz clic en **Add User**

**Paso 2: Configurar Acceso de Red**

1. En el menú lateral, ve a **Network Access**
2. Haz clic en **Add IP Address**
3. Para desarrollo, puedes usar:
   - **Add Current IP Address** (tu IP actual)
   - O **Allow Access from Anywhere** (0.0.0.0/0) - ⚠️ Solo para desarrollo
4. Haz clic en **Confirm**

### 2.4 Obtener Connection String

1. En el menú lateral, ve a **Database**
2. Haz clic en **Connect** en tu cluster
3. Selecciona **Connect your application**
4. Selecciona:
   - **Driver**: Node.js
   - **Version**: 5.5 or later
5. Copia la **Connection String**, se verá así:
   ```
   mongodb+srv://<username>:<password>@didi-sicuani-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Reemplaza `<username>` y `<password>` con tus credenciales:
   ```
   mongodb+srv://didi-sicuani-user:TU_PASSWORD@didi-sicuani-cluster.xxxxx.mongodb.net/didi-sicuani?retryWrites=true&w=majority
   ```
   ⚠️ **Importante**: Agrega `/didi-sicuani` antes del `?` para especificar la base de datos

### 2.5 Verificar Conexión

Puedes probar la conexión desde tu máquina local:

```bash
# Instalar mongosh si no lo tienes
# Windows: choco install mongosh
# Mac: brew install mongosh

# Conectar
mongosh "mongodb+srv://didi-sicuani-user:TU_PASSWORD@didi-sicuani-cluster.xxxxx.mongodb.net/didi-sicuani"

# Dentro de mongosh:
show dbs
exit
```

**✅ Guarda tu Connection String**, la necesitarás para el backend.

---

## 3. Paso 2: Configurar Redis (Opcional - Gratis)

> **Nota**: Redis es opcional. El backend funciona sin Redis, pero algunas funcionalidades de cache pueden estar limitadas.

### 3.1 Crear Cuenta en Upstash

1. Ve a: https://upstash.com/
2. Haz clic en **Sign Up** (puedes usar GitHub)
3. Completa el registro

### 3.2 Crear Base de Datos Redis

1. En el dashboard, haz clic en **Create Database**
2. Configura:
   - **Name**: `didi-sicuani-redis`
   - **Type**: Regional (más rápido) o Global (más caro)
   - **Region**: Elige la más cercana
   - **TLS**: Enabled (recomendado)
   - **Eviction**: No eviction (para desarrollo)
3. Haz clic en **Create**
4. Espera unos segundos

### 3.3 Obtener Credenciales

1. Una vez creada, haz clic en tu base de datos
2. En la pestaña **Details**, encontrarás:
   - **Endpoint**: `xxxxx.upstash.io:6379`
   - **Port**: `6379` (o el que aparezca)
   - **Password**: (haz clic en "Show" para verla)
3. **Guarda estas credenciales**

### 3.4 Probar Conexión (Opcional)

```bash
# Instalar redis-cli si no lo tienes
# Windows: choco install redis
# Mac: brew install redis

# Conectar (ajusta con tus credenciales)
redis-cli -h xxxxx.upstash.io -p 6379 -a TU_PASSWORD

# Dentro de redis-cli:
PING
# Debe responder: PONG
exit
```

**✅ Guarda tus credenciales de Redis**, las necesitarás para el backend.

---

## 4. Paso 3: Desplegar Backend (Gratis)

Vamos a usar **Render** como ejemplo (es el más fácil). También incluiremos instrucciones para Railway.

### Opción A: Render (Recomendado)

#### 4.1 Crear Cuenta en Render

1. Ve a: https://render.com/
2. Haz clic en **Get Started for Free**
3. Regístrate con GitHub (recomendado) o email

#### 4.2 Preparar el Repositorio

**Importante**: Asegúrate de que tu código esté en GitHub, GitLab o Bitbucket.

1. Si no tienes el código en Git:
   ```bash
   cd didi-sicuani
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/didi-sicuani.git
   git push -u origin main
   ```

2. Asegúrate de tener un archivo `.gitignore` que excluya:
   - `node_modules/`
   - `.env`
   - Archivos sensibles

#### 4.3 Crear Web Service en Render

1. En el dashboard de Render, haz clic en **New +**
2. Selecciona **Web Service**
3. Conecta tu repositorio:
   - Si usas GitHub, autoriza Render
   - Selecciona tu repositorio: `didi-sicuani`
   - Selecciona la rama: `main`

4. Configura el servicio:
   - **Name**: `didi-sicuani-backend`
   - **Region**: Elige la más cercana
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: **Free** (750 horas/mes)

5. **Variables de Entorno** (las configuramos después, por ahora déjalo vacío)

6. Haz clic en **Create Web Service**

#### 4.4 Configurar Variables de Entorno en Render

Una vez creado el servicio:

1. Ve a tu servicio en Render
2. Ve a la pestaña **Environment**
3. Haz clic en **Add Environment Variable**
4. Agrega las siguientes variables:

```env
# MongoDB
MONGODB_URI=mongodb+srv://didi-sicuani-user:TU_PASSWORD@didi-sicuani-cluster.xxxxx.mongodb.net/didi-sicuani?retryWrites=true&w=majority

# Redis (Opcional - si configuraste Upstash)
REDIS_HOST=xxxxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=TU_PASSWORD_UPSTASH

# JWT
JWT_SECRET=tu-secret-key-super-segura-y-larga-minimo-32-caracteres

# Server
PORT=10000
NODE_ENV=production

# Socket.io CORS (URL de tu frontend - la configurarás después)
SOCKET_CORS_ORIGIN=https://tu-frontend.vercel.app
```

5. Haz clic en **Save Changes**

#### 4.5 Verificar Despliegue del Backend

1. Render comenzará a construir y desplegar automáticamente
2. Puedes ver el progreso en la pestaña **Logs**
3. Una vez completado, verás:
   - **URL**: `https://didi-sicuani-backend.onrender.com`
   - Estado: **Live**

4. Prueba el health check:
   ```
   https://didi-sicuani-backend.onrender.com/health
   ```
   Debe responder: `{"status":"OK",...}`

**✅ Guarda la URL de tu backend**, la necesitarás para el frontend.

### Opción B: Railway (Alternativa)

#### 4.1 Crear Cuenta en Railway

1. Ve a: https://railway.app/
2. Haz clic en **Start a New Project**
3. Regístrate con GitHub

#### 4.2 Desplegar desde GitHub

1. Haz clic en **New Project**
2. Selecciona **Deploy from GitHub repo**
3. Selecciona tu repositorio: `didi-sicuani`
4. Railway detectará automáticamente que es un proyecto Node.js

#### 4.3 Configurar el Servicio

1. Railway creará un servicio automáticamente
2. Haz clic en el servicio
3. Ve a **Settings**
4. Configura:
   - **Root Directory**: `backend`
   - **Start Command**: `npm start`
   - **Build Command**: `npm install`

#### 4.4 Configurar Variables de Entorno

1. En el servicio, ve a **Variables**
2. Agrega las mismas variables que en Render (ver sección 4.4)

#### 4.5 Obtener URL

1. Ve a **Settings** → **Domains**
2. Haz clic en **Generate Domain**
3. Obtendrás una URL como: `didi-sicuani-backend.up.railway.app`

---

## 5. Paso 4: Desplegar Frontend (Gratis)

Vamos a usar **Vercel** como ejemplo (especialmente bueno para React).

### 5.1 Crear Cuenta en Vercel

1. Ve a: https://vercel.com/
2. Haz clic en **Sign Up**
3. Regístrate con GitHub (recomendado)

### 5.2 Importar Proyecto

1. En el dashboard, haz clic en **Add New...** → **Project**
2. Importa tu repositorio de GitHub
3. Selecciona: `didi-sicuani`

### 5.3 Configurar Proyecto

1. Vercel detectará automáticamente que es un proyecto Vite/React
2. Configura:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 5.4 Configurar Variables de Entorno

Antes de desplegar, agrega las variables de entorno:

1. En la configuración del proyecto, ve a **Environment Variables**
2. Agrega:

```env
# URL del backend (la que obtuviste en el paso 4)
VITE_API_URL=https://didi-sicuani-backend.onrender.com/api

# URL del Socket.io (misma que la API, sin /api)
VITE_SOCKET_URL=https://didi-sicuani-backend.onrender.com
```

3. Haz clic en **Save**

### 5.5 Desplegar

1. Haz clic en **Deploy**
2. Vercel construirá y desplegará automáticamente
3. Una vez completado, obtendrás una URL como:
   ```
   https://didi-sicuani.vercel.app
   ```

### 5.6 Actualizar CORS en Backend

**Importante**: Ahora que tienes la URL del frontend, actualiza la variable de entorno en tu backend:

1. Ve a Render/Railway → Tu servicio backend
2. Ve a **Environment Variables**
3. Actualiza `SOCKET_CORS_ORIGIN`:
   ```env
   SOCKET_CORS_ORIGIN=https://didi-sicuani.vercel.app
   ```
4. Guarda y espera a que se redespliegue

### Alternativa: Netlify

Si prefieres Netlify:

1. Ve a: https://www.netlify.com/
2. Regístrate con GitHub
3. **New site from Git** → Selecciona tu repositorio
4. Configura:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
5. Agrega las mismas variables de entorno que en Vercel
6. Despliega

---

## 6. Paso 5: Configurar Variables de Entorno

### Resumen de Variables Necesarias

#### Backend (Render/Railway)

```env
# MongoDB Atlas
MONGODB_URI=mongodb+srv://usuario:password@cluster.xxxxx.mongodb.net/didi-sicuani?retryWrites=true&w=majority

# Redis (Opcional)
REDIS_HOST=xxxxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=tu_password

# JWT - Genera una clave segura
JWT_SECRET=genera-una-clave-super-segura-de-al-menos-32-caracteres-aleatorios

# Server
PORT=10000
NODE_ENV=production

# Socket.io CORS
SOCKET_CORS_ORIGIN=https://tu-frontend.vercel.app
```

#### Frontend (Vercel/Netlify)

```env
VITE_API_URL=https://tu-backend.onrender.com/api
VITE_SOCKET_URL=https://tu-backend.onrender.com
```

### Generar JWT_SECRET Seguro

```bash
# En PowerShell (Windows)
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})

# En Bash (Linux/Mac)
openssl rand -base64 64
```

O usa un generador online: https://randomkeygen.com/

---

## 7. Paso 6: Verificar Despliegue

### 7.1 Verificar Backend

1. **Health Check**:
   ```
   https://tu-backend.onrender.com/health
   ```
   Debe responder: `{"status":"OK",...}`

2. **API Documentation**:
   ```
   https://tu-backend.onrender.com/api-docs
   ```
   Debe mostrar Swagger UI

3. **Probar conexión MongoDB**:
   - Ve a los logs de Render/Railway
   - Debe aparecer: `✅ MongoDB connected`

### 7.2 Verificar Frontend

1. Abre tu URL de Vercel/Netlify
2. Debe cargar la aplicación
3. Intenta registrarte o iniciar sesión
4. Verifica que las peticiones al backend funcionen

### 7.3 Verificar Socket.io

1. Abre la consola del navegador (F12)
2. Debe aparecer: `✅ Socket connected: [socket-id]`
3. Si hay errores de CORS, verifica `SOCKET_CORS_ORIGIN` en el backend

### 7.4 Verificar MongoDB Atlas

1. Ve a MongoDB Atlas → **Database**
2. Haz clic en **Browse Collections**
3. Debe aparecer la base de datos `didi-sicuani`
4. Las colecciones se crearán automáticamente cuando uses la app

---

## 8. Troubleshooting

### Error: "MongoDB connection failed"

**Causa**: URI incorrecta o credenciales incorrectas

**Solución**:
1. Verifica la URI en MongoDB Atlas
2. Asegúrate de que el formato sea correcto:
   ```
   mongodb+srv://usuario:password@cluster.xxxxx.mongodb.net/didi-sicuani?retryWrites=true&w=majority
   ```
3. Verifica que el usuario tenga permisos de lectura/escritura
4. Verifica que tu IP esté en la whitelist de Network Access

### Error: "CORS policy"

**Causa**: El frontend no está en la lista de orígenes permitidos

**Solución**:
1. Verifica `SOCKET_CORS_ORIGIN` en el backend
2. Debe ser exactamente la URL del frontend (con https://)
3. Si tienes múltiples URLs, sepáralas por comas:
   ```
   SOCKET_CORS_ORIGIN=https://app1.vercel.app,https://app2.vercel.app
   ```

### Error: "Service sleeping" (Render)

**Causa**: Render pone a dormir servicios gratuitos después de 15 minutos de inactividad

**Solución**:
1. La primera petición puede tardar 30-60 segundos (cold start)
2. Considera usar Railway (no duerme) o un servicio pago
3. O usa un servicio de "ping" para mantenerlo activo (UptimeRobot - gratis)

### Error: "Build failed"

**Causa**: Dependencias o configuración incorrecta

**Solución**:
1. Verifica los logs de build en Render/Vercel
2. Asegúrate de que `package.json` tenga el script `start`:
   ```json
   "scripts": {
     "start": "node server.js"
   }
   ```
3. Verifica que todas las dependencias estén en `dependencies`, no en `devDependencies`

### Error: "Socket.io connection failed"

**Causa**: CORS o URL incorrecta

**Solución**:
1. Verifica `VITE_SOCKET_URL` en el frontend
2. Verifica `SOCKET_CORS_ORIGIN` en el backend
3. Verifica que el backend esté corriendo
4. Revisa la consola del navegador para más detalles

### Error: "Redis connection failed"

**Causa**: Credenciales incorrectas o Redis no disponible

**Solución**:
1. El backend funciona sin Redis (es opcional)
2. Si quieres usar Redis, verifica las credenciales de Upstash
3. Verifica que la base de datos esté activa en Upstash

---

## 9. Alternativas Gratuitas

### Backend

#### Railway
- **Ventajas**: No duerme, $5 crédito gratis/mes, muy fácil
- **Desventajas**: Créditos limitados
- **URL**: https://railway.app/

#### Fly.io
- **Ventajas**: 3 VMs gratis, muy flexible
- **Desventajas**: Más técnico, requiere CLI
- **URL**: https://fly.io/

#### Cyclic
- **Ventajas**: Especializado en Node.js, muy simple
- **Desventajas**: Límites más estrictos
- **URL**: https://cyclic.sh/

### Frontend

#### Netlify
- **Ventajas**: Muy fácil, excelente para SPAs
- **Desventajas**: Menos optimizado para React que Vercel
- **URL**: https://www.netlify.com/

#### Cloudflare Pages
- **Ventajas**: Muy rápido, CDN global excelente
- **Desventajas**: Configuración un poco más compleja
- **URL**: https://pages.cloudflare.com/

### MongoDB

#### MongoDB Atlas (Única opción recomendada)
- **Ventajas**: Oficial, 512 MB gratis, muy confiable
- **Desventajas**: Límite de 512 MB (suficiente para desarrollo)
- **URL**: https://www.mongodb.com/cloud/atlas

### Redis

#### Upstash (Recomendado)
- **Ventajas**: 10K comandos/día gratis, serverless
- **Desventajas**: Límite de comandos
- **URL**: https://upstash.com/

#### Redis Cloud
- **Ventajas**: 30 MB gratis, tradicional
- **Desventajas**: Menos flexible que Upstash
- **URL**: https://redis.com/try-free/

---

## ✅ Checklist Final

Usa este checklist para verificar que todo esté desplegado:

- [ ] MongoDB Atlas configurado y funcionando
- [ ] Redis configurado (opcional)
- [ ] Backend desplegado en Render/Railway
- [ ] Backend responde en `/health`
- [ ] Variables de entorno del backend configuradas
- [ ] Frontend desplegado en Vercel/Netlify
- [ ] Variables de entorno del frontend configuradas
- [ ] CORS configurado correctamente
- [ ] Socket.io conecta desde el frontend
- [ ] Puedes registrarte e iniciar sesión
- [ ] Las solicitudes de viaje funcionan
- [ ] MongoDB Atlas muestra datos

---

## 📊 Costos Totales

### Despliegue 100% Gratuito

| Servicio | Costo Mensual | Límites |
|----------|---------------|---------|
| MongoDB Atlas | $0 | 512 MB, suficiente para ~10K documentos |
| Render Backend | $0 | 750 horas/mes (puede dormir) |
| Vercel Frontend | $0 | Ilimitado |
| Upstash Redis | $0 | 10K comandos/día |
| **TOTAL** | **$0** | **Suficiente para desarrollo y pequeña producción** |

### Si Necesitas Más Recursos

- **MongoDB Atlas M2**: $9/mes (2 GB)
- **Render Paid**: $7/mes (sin sleep, más recursos)
- **Railway**: $5/mes (más créditos)
- **Vercel Pro**: $20/mes (más funciones)

---

## 🎉 ¡Despliegue Completado!

Tu aplicación DiDi-Sicuani está ahora desplegada y accesible desde cualquier lugar del mundo, **completamente gratis**.

### URLs de tu Aplicación

- **Frontend**: `https://didi-sicuani.vercel.app`
- **Backend API**: `https://didi-sicuani-backend.onrender.com`
- **API Docs**: `https://didi-sicuani-backend.onrender.com/api-docs`
- **MongoDB Atlas**: Dashboard en https://cloud.mongodb.com/

### Próximos Pasos

1. ✅ Comparte las URLs con tus usuarios
2. ✅ Configura un dominio personalizado (opcional, puede tener costo)
3. ✅ Monitorea los logs en Render/Vercel
4. ✅ Configura alertas en MongoDB Atlas
5. ✅ Considera usar UptimeRobot para mantener el backend activo (gratis)

---

## 📚 Recursos Adicionales

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com/
- **Upstash Docs**: https://docs.upstash.com/

---

**¡Disfruta de tu aplicación desplegada! 🚀**



