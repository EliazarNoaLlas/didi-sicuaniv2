# 🔴 Guía Completa: Redis en Windows - DiDi-Sicuani

Esta guía te ayudará a instalar, configurar y probar Redis en Windows para tu proyecto DiDi-Sicuani.

---

## 📋 Índice

1. [Instalación de Redis (Recomendada)](#1-instalación-de-redis-recomendada)
2. [Instalación de Memurai (Alternativa)](#2-instalación-de-memurai-alternativa)
3. [Verificación de Instalación](#3-verificación-de-instalación)
4. [Configuración en el Proyecto](#4-configuración-en-el-proyecto)
5. [Probar Conexión desde Código](#5-probar-conexión-desde-código)
6. [Integración con el Proyecto](#6-integración-con-el-proyecto)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Instalación de Redis (Recomendada)

### ⭐ OPCIÓN RECOMENDADA — Redis Oficial para Windows (MS OpenTech Build)

Esta es la opción **más estable y recomendada** para Windows 10/11. Es Redis 100% real, sin Docker, sin WSL, sin errores.

#### 🟦 Paso 1: Descargar Redis para Windows

1. **Abre tu navegador** y ve a:
   🔗 **https://github.com/zkteco-home/redis-windows/releases**

2. **Descarga el archivo:**
   - **Redis-x64-latest.zip** (o la versión más reciente disponible)

#### 🟦 Paso 2: Extraer Redis

1. **Crea la carpeta** `C:\Redis` (si no existe)

2. **Extrae el contenido del ZIP** en `C:\Redis`

3. **Verifica que tengas estos archivos:**
   ```
   C:\Redis\
   ├── redis-server.exe
   ├── redis-cli.exe
   └── redis.conf
   ```

#### 🟦 Paso 3: Ejecutar Redis (Modo Manual)

**Opción A: Ejecutar directamente**

1. **Abre PowerShell como Administrador**

2. **Navega a la carpeta:**
   ```powershell
   cd C:\Redis
   ```

3. **Ejecuta Redis:**
   ```powershell
   .\redis-server.exe
   ```

4. **Redis quedará corriendo** en esa ventana. **Déjala abierta.**

5. **Abre otra ventana de PowerShell** para probar:
   ```powershell
   cd C:\Redis
   .\redis-cli.exe
   ```

6. **Prueba la conexión:**
   ```redis
   ping
   ```
   
   **Respuesta esperada:**
   ```
   PONG
   ```

7. **Prueba comandos básicos:**
   ```redis
   SET prueba "funciona"
   GET prueba
   ```
   
   **Respuesta esperada:**
   ```
   OK
   "funciona"
   ```

8. **Salir del cliente:**
   ```redis
   exit
   ```

#### 🟦 Paso 4: Instalar Redis como Servicio de Windows (Recomendado)

Para que Redis se inicie automáticamente al arrancar Windows:

1. **Abre PowerShell como Administrador**

2. **Navega a la carpeta Redis:**
   ```powershell
   cd C:\Redis
   ```

3. **Instalar como servicio:**
   ```powershell
   .\redis-server.exe --service-install redis.conf
   ```

4. **Iniciar el servicio:**
   ```powershell
   .\redis-server.exe --service-start
   ```

5. **Verificar que el servicio está corriendo:**
   ```powershell
   Get-Service -Name Redis
   ```
   
   **Salida esperada:**
   ```
   Status   Name               DisplayName
   ------   ----               -----------
   Running  Redis              Redis
   ```

6. **Probar conexión:**
   ```powershell
   cd C:\Redis
   .\redis-cli.exe
   ping
   ```
   
   Debe responder: `PONG`

#### 🟦 Paso 5: Configurar Redis para Inicio Automático

```powershell
# Configurar para que inicie automáticamente
Set-Service -Name Redis -StartupType Automatic

# Verificar configuración
Get-Service -Name Redis | Select-Object Name, Status, StartType
```

**Comandos útiles del servicio:**
```powershell
# Detener servicio
.\redis-server.exe --service-stop

# Iniciar servicio
.\redis-server.exe --service-start

# Desinstalar servicio
.\redis-server.exe --service-uninstall
```

---

## 2. Instalación de Memurai (Alternativa)

### ⚠️ NOTA: Memurai puede tener problemas en Windows 11

Si prefieres usar Memurai, aquí están las instrucciones y soluciones a problemas comunes.

### 🟢 Paso 1: Descargar Memurai

1. **Abre tu navegador** y ve a:
   🔗 **https://www.memurai.com/get-memurai**

2. **Descarga la versión "Free Developer"**

### 🟢 Paso 2: Instalar Memurai

1. **Ejecuta el instalador como Administrador**
   - Click derecho en el archivo descargado
   - Selecciona "Ejecutar como administrador"

2. **Sigue el asistente de instalación:**
   - ✅ Acepta los términos y condiciones
   - ✅ Selecciona "Install as Windows Service" (recomendado)
   - ✅ Deja el puerto por defecto: **6379**

### ❌ Solución a Error: "Memurai Setup Wizard ended prematurely"

Este error es común en Windows 10/11. Sigue estos pasos en orden:

#### 1️⃣ Ejecutar como Administrador

- **Botón derecho** en el instalador → **"Ejecutar como administrador"**

#### 2️⃣ Deshabilitar Antivirus/Windows Defender Temporalmente

1. **Abre Windows Security**
2. **Desactiva temporalmente** la protección en tiempo real
3. **Intenta instalar Memurai nuevamente**
4. **Reactiva la protección** después de instalar

#### 3️⃣ Instalar Visual C++ Redistributable

1. **Descarga e instala:**
   🔗 **https://aka.ms/vs/17/release/vc_redist.x64.exe**

2. **Reinicia tu computadora**

3. **Intenta instalar Memurai nuevamente**

#### 4️⃣ Actualizar Windows Installer

Ejecuta en PowerShell como Administrador:

```powershell
sfc /scannow
DISM /Online /Cleanup-Image /RestoreHealth
```

Reinicia y vuelve a intentar.

#### 5️⃣ Limpiar Registro del Servicio Memurai

Si falló al instalar el servicio:

```powershell
# Eliminar servicio si existe
sc delete memurai

# Limpiar registro (opcional, con cuidado)
# Regedit → Buscar "memurai" y eliminar entradas
```

Luego intenta instalar nuevamente.

### 🟢 Paso 3: Verificar Memurai

```powershell
# Verificar servicio
Get-Service -Name Memurai

# Si no está corriendo:
Start-Service -Name Memurai

# Probar conexión
memurai-cli ping
```

---

## 3. Verificación de Instalación

### Verificar que Redis está Corriendo

#### Si usaste Redis Windows Build:

```powershell
# Verificar servicio
Get-Service -Name Redis

# Verificar puerto
netstat -ano | findstr :6379

# Probar conexión
cd C:\Redis
.\redis-cli.exe ping
```

#### Si usaste Memurai:

```powershell
# Verificar servicio
Get-Service -Name Memurai

# Verificar puerto
netstat -ano | findstr :6379

# Probar conexión
memurai-cli ping
```

**Salida esperada del puerto:**
```
TCP    0.0.0.0:6379           0.0.0.0:0              LISTENING       12345
TCP    [::]:6379              [::]:0                 LISTENING       12345
```

### Probar desde PowerShell (sin cliente interactivo)

#### Redis Windows Build:
```powershell
cd C:\Redis
.\redis-cli.exe ping
```

#### Memurai:
```powershell
memurai-cli ping
```

**Ambos deben responder:** `PONG`

---

## 4. Configuración en el Proyecto

### Paso 1: Verificar Archivo .env

Abre el archivo `backend/.env` y verifica que tenga:

```env
# ========== REDIS ==========
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

**Nota:** Por defecto, Redis no tiene contraseña. Si configuraste una, agrega:
```env
REDIS_PASSWORD=tu_password
```

### Paso 2: Verificar Código de Conexión

El código ya está implementado en `backend/config/redis.js`. Verifica que esté correcto:

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

export default connectRedis;
export { getRedisClient };
```

---

## 5. Probar Conexión desde Código

### Crear Script de Prueba

Crea el archivo `backend/test-redis.js`:

```javascript
import connectRedis, { getRedisClient } from './config/redis.js';
import dotenv from 'dotenv';

dotenv.config();

const testConnection = async () => {
  try {
    console.log('🔍 Intentando conectar a Redis...');
    console.log(`Host: ${process.env.REDIS_HOST || 'localhost'}`);
    console.log(`Port: ${process.env.REDIS_PORT || 6379}`);
    console.log('');
    
    // Conectar
    await connectRedis();
    const redis = getRedisClient();
    
    console.log('✅ Redis conectado exitosamente');
    console.log('');
    
    // Test 1: PING
    console.log('📡 Test 1: PING');
    const pong = await redis.ping();
    console.log(`   Respuesta: ${pong}`);
    console.log('');
    
    // Test 2: SET/GET
    console.log('📡 Test 2: SET/GET');
    await redis.set('test:connection', 'DiDi-Sicuani Redis Test', { EX: 60 });
    const value = await redis.get('test:connection');
    console.log(`   Valor guardado: ${value}`);
    console.log('');
    
    // Test 3: TTL (Time To Live)
    console.log('📡 Test 3: TTL (Time To Live)');
    const ttl = await redis.ttl('test:connection');
    console.log(`   Tiempo restante: ${ttl} segundos`);
    console.log('');
    
    // Test 4: Sorted Set (para colas)
    console.log('📡 Test 4: Sorted Set (Colas)');
    const now = Date.now();
    await redis.zAdd('test:queue', {
      score: now,
      value: 'ride_request_1'
    });
    await redis.zAdd('test:queue', {
      score: now + 1000,
      value: 'ride_request_2'
    });
    
    const queueItems = await redis.zRangeWithScores('test:queue', 0, -1);
    console.log(`   Items en cola: ${queueItems.length}`);
    queueItems.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.value} (score: ${item.score})`);
    });
    console.log('');
    
    // Test 5: Hash (para datos estructurados)
    console.log('📡 Test 5: Hash (Datos Estructurados)');
    await redis.hSet('test:user:1', {
      name: 'Juan Pérez',
      email: 'juan@example.com',
      userType: 'driver'
    });
    const userData = await redis.hGetAll('test:user:1');
    console.log('   Datos del usuario:');
    Object.entries(userData).forEach(([key, value]) => {
      console.log(`     ${key}: ${value}`);
    });
    console.log('');
    
    // Test 6: List (para colas FIFO)
    console.log('📡 Test 6: List (Cola FIFO)');
    await redis.lPush('test:notifications', 'notification_1', 'notification_2', 'notification_3');
    const listLength = await redis.lLen('test:notifications');
    console.log(`   Notificaciones en cola: ${listLength}`);
    const firstNotification = await redis.rPop('test:notifications');
    console.log(`   Primera notificación procesada: ${firstNotification}`);
    console.log('');
    
    // Limpiar datos de prueba
    console.log('🧹 Limpiando datos de prueba...');
    await redis.del('test:connection', 'test:queue', 'test:user:1', 'test:notifications');
    console.log('✅ Datos de prueba eliminados');
    console.log('');
    
    // Cerrar conexión
    await redis.quit();
    console.log('✅ Test completado exitosamente');
    console.log('');
    console.log('🎉 ¡Redis está funcionando correctamente!');
    console.log('');
    console.log('💡 Próximos pasos:');
    console.log('   1. Inicia el servidor: npm run dev');
    console.log('   2. Redis se conectará automáticamente al iniciar');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('💡 Verifica:');
    console.error('  1. Redis está corriendo');
    console.error('     - Redis Windows: Get-Service -Name Redis');
    console.error('     - Memurai: Get-Service -Name Memurai');
    console.error('  2. El puerto 6379 está disponible: netstat -ano | findstr :6379');
    console.error('  3. Las variables en .env son correctas');
    console.error('  4. No hay firewall bloqueando el puerto');
    console.error('');
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('🔧 Solución: Inicia Redis:');
      console.error('   - Redis Windows: .\\redis-server.exe --service-start');
      console.error('   - Memurai: Start-Service -Name Memurai');
    }
    
    if (error.message.includes('NOAUTH')) {
      console.error('🔧 Solución: Verifica la contraseña en .env:');
      console.error('   REDIS_PASSWORD=tu_password');
    }
    
    process.exit(1);
  }
};

testConnection();
```

### Ejecutar el Test

```powershell
cd backend
node test-redis.js
```

**Salida esperada:**
```
🔍 Intentando conectar a Redis...
Host: localhost
Port: 6379

✅ Redis conectado exitosamente

📡 Test 1: PING
   Respuesta: PONG

📡 Test 2: SET/GET
   Valor guardado: DiDi-Sicuani Redis Test

📡 Test 3: TTL (Time To Live)
   Tiempo restante: 58 segundos

📡 Test 4: Sorted Set (Colas)
   Items en cola: 2
   1. ride_request_1 (score: 1234567890)
   2. ride_request_2 (score: 1234567891)

📡 Test 5: Hash (Datos Estructurados)
   Datos del usuario:
     name: Juan Pérez
     email: juan@example.com
     userType: driver

📡 Test 6: List (Cola FIFO)
   Notificaciones en cola: 3
   Primera notificación procesada: notification_1

🧹 Limpiando datos de prueba...
✅ Datos de prueba eliminados

✅ Test completado exitosamente

🎉 ¡Redis está funcionando correctamente!

💡 Próximos pasos:
   1. Inicia el servidor: npm run dev
   2. Redis se conectará automáticamente al iniciar
```

---

## 6. Integración con el Proyecto

### Verificar que Redis se Conecta al Iniciar el Servidor

El servidor ya está configurado para conectarse a Redis automáticamente. Verifica en `backend/server.js`:

```javascript
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✅ MongoDB connected');

    // Connect to Redis
    await connectRedis();
    console.log('✅ Redis connected');

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Socket.io ready`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};
```

### Iniciar el Servidor

```powershell
cd backend
npm run dev
```

**Salida esperada:**
```
MongoDB Connected: localhost:27017
✅ MongoDB connected
Redis Client Connected
✅ Redis connected
🚀 Server running on port 5000
📡 Socket.io ready
🌍 Environment: development
```

### Usar Redis en el Código

Ejemplo de uso en un servicio:

```javascript
// backend/services/example.service.js
import { getRedisClient } from '../config/redis.js';

export const cacheRideRequest = async (rideRequestId, rideData) => {
  const redis = getRedisClient();
  
  // Guardar en cache por 2 minutos (120 segundos)
  await redis.setEx(
    `ride_request:${rideRequestId}`,
    120,
    JSON.stringify(rideData)
  );
};

export const getCachedRideRequest = async (rideRequestId) => {
  const redis = getRedisClient();
  
  const cached = await redis.get(`ride_request:${rideRequestId}`);
  if (cached) {
    return JSON.parse(cached);
  }
  
  return null;
};
```

---

## 7. Troubleshooting

### Error: "ECONNREFUSED"

**Causa:** Redis no está corriendo

**Solución:**

#### Si usaste Redis Windows Build:
```powershell
# Verificar servicio
Get-Service -Name Redis

# Si está detenido, iniciarlo
cd C:\Redis
.\redis-server.exe --service-start

# O iniciar manualmente
.\redis-server.exe
```

#### Si usaste Memurai:
```powershell
# Verificar estado
Get-Service -Name Memurai

# Si está detenido, iniciarlo
Start-Service -Name Memurai
```

### Error: "NOAUTH Authentication required"

**Causa:** Redis tiene contraseña configurada pero no está en .env

**Solución:**
1. Verifica si Redis tiene contraseña configurada
2. Si la tiene, agrega en `.env`:
   ```env
   REDIS_PASSWORD=tu_password
   ```
3. Si no quieres usar contraseña, desactívala en `redis.conf`

### Error: "Connection timeout"

**Causa:** Firewall bloqueando el puerto 6379

**Solución:**
```powershell
# Permitir puerto en Windows Firewall
New-NetFirewallRule -DisplayName "Redis" -Direction Inbound -LocalPort 6379 -Protocol TCP -Action Allow
```

### Error: "getRedisClient is not a function"

**Causa:** Redis no se ha conectado antes de usar

**Solución:**
Asegúrate de llamar `connectRedis()` antes de usar `getRedisClient()`:

```javascript
// ✅ Correcto
await connectRedis();
const redis = getRedisClient();

// ❌ Incorrecto (sin conectar primero)
const redis = getRedisClient(); // Error!
```

### Verificar que Redis está Escuchando

```powershell
# Ver procesos en el puerto 6379
netstat -ano | findstr :6379

# Ver información del servicio (Redis Windows)
Get-Service -Name Redis | Format-List *

# Ver información del servicio (Memurai)
Get-Service -Name Memurai | Format-List *
```

### Reiniciar Redis

#### Redis Windows Build:
```powershell
cd C:\Redis
.\redis-server.exe --service-stop
.\redis-server.exe --service-start
```

#### Memurai:
```powershell
# Detener
Stop-Service -Name Memurai

# Iniciar
Start-Service -Name Memurai

# O reiniciar directamente
Restart-Service -Name Memurai
```

### Verificar Versión de Redis

#### Redis Windows Build:
```powershell
cd C:\Redis
.\redis-cli.exe INFO server
```

#### Memurai:
```powershell
memurai-cli INFO server
```

Busca la línea:
```
redis_version:X.X.X
```

---

## 📊 Casos de Uso en DiDi-Sicuani

### 1. Cache de Ride Requests

```javascript
// Guardar ride request en cache
await redis.setEx(
  `ride_request:${rideId}`,
  120, // 2 minutos
  JSON.stringify(rideRequest)
);

// Obtener de cache
const cached = await redis.get(`ride_request:${rideId}`);
```

### 2. Cola de Viajes para Conductores

```javascript
// Agregar viaje a la cola (ordenado por prioridad)
await redis.zAdd('driver:queue', {
  score: priorityScore,
  value: rideRequestId
});

// Obtener siguiente viaje
const nextRide = await redis.zRange('driver:queue', 0, 0);
```

### 3. Rate Limiting

```javascript
// Limitar requests por IP
const key = `rate_limit:${ip}`;
const count = await redis.incr(key);
if (count === 1) {
  await redis.expire(key, 60); // 1 minuto
}
if (count > 100) {
  throw new Error('Rate limit exceeded');
}
```

### 4. Sesiones de Usuario

```javascript
// Guardar sesión
await redis.setEx(
  `session:${userId}`,
  3600, // 1 hora
  JSON.stringify(sessionData)
);
```

---

## ✅ Checklist de Verificación

- [ ] Redis instalado (Windows Build o Memurai)
- [ ] Servicio Redis está "Running"
- [ ] `redis-cli.exe ping` o `memurai-cli ping` responde "PONG"
- [ ] Puerto 6379 está escuchando
- [ ] Archivo `.env` configurado correctamente
- [ ] Test de conexión (`node test-redis.js`) exitoso
- [ ] Servidor backend inicia sin errores de Redis
- [ ] Redis se conecta automáticamente al iniciar servidor

---

## 📚 Recursos Adicionales

- **Redis Windows Build**: https://github.com/zkteco-home/redis-windows/releases
- **Memurai Documentation**: https://docs.memurai.com/
- **Redis Commands**: https://redis.io/commands
- **Node Redis Client**: https://github.com/redis/node-redis

---

## 🎉 ¡Listo!

Si todos los tests pasan, Redis está correctamente configurado y listo para usar en tu proyecto DiDi-Sicuani.

**Recomendación:** Usa **Redis Windows Build** para evitar problemas comunes con Memurai en Windows 11.

**Próximos pasos:**
1. ✅ Redis configurado
2. ⏭️ Configurar PostgreSQL + PostGIS
3. ⏭️ Iniciar servidor completo

---

¿Necesitas ayuda con algún paso específico? ¡Pregunta!

