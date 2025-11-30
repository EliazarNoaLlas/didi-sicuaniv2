# 🗄️ Guía Completa: Instalación y Configuración de MongoDB y MongoDB Compass

Esta guía te ayudará a instalar y configurar MongoDB junto con MongoDB Compass para reemplazar WebStorm DataGrid en el proyecto DiDi-Sicuani.

---

## 📋 Índice

1. [Instalación de MongoDB en Windows](#1-instalación-de-mongodb-en-windows)
2. [Verificación de Instalación de MongoDB](#2-verificación-de-instalación-de-mongodb)
3. [Configuración Inicial de MongoDB](#3-configuración-inicial-de-mongodb)
4. [Instalación de MongoDB Compass](#4-instalación-de-mongodb-compass)
5. [Configuración de Conexión en MongoDB Compass](#5-configuración-de-conexión-en-mongodb-compass)
6. [Configuración del Backend DiDi-Sicuani](#6-configuración-del-backend-didi-sicuani)
7. [Verificación de Conexión desde el Backend](#7-verificación-de-conexión-desde-el-backend)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Instalación de MongoDB en Windows

### Paso 1.1: Descargar MongoDB Community Server

1. Abre tu navegador web y ve a:
   ```
   https://www.mongodb.com/try/download/community
   ```

2. En la página de descarga:
   - **Version**: Selecciona la última versión estable (recomendado: 7.0 o superior)
   - **Platform**: Windows
   - **Package**: MSI
   - Haz clic en **Download**

### Paso 1.2: Instalar MongoDB

1. Una vez descargado, ejecuta el archivo `.msi` descargado
2. En el instalador:
   - Haz clic en **Next** en la pantalla de bienvenida
   - Acepta el contrato de licencia y haz clic en **Next**
   - Selecciona **Complete** (instalación completa) y haz clic en **Next**
   - Haz clic en **Install**
   - Espera a que termine la instalación
   - Cuando termine, haz clic en **Finish**

### Paso 1.3: Configurar MongoDB como Servicio

Durante la instalación, MongoDB generalmente se configura automáticamente como un servicio de Windows. Si no se configuró:

1. Abre PowerShell **como Administrador**:
   - Presiona `Win + X`
   - Selecciona **Windows PowerShell (Administrador)** o **Terminal (Administrador)**

2. Ejecuta los siguientes comandos:

```powershell
# Verificar si MongoDB está instalado
Get-Service -Name MongoDB

# Si no existe el servicio, crearlo (ajustar rutas según tu instalación)
mongod --config "C:\Program Files\MongoDB\Server\7.0\bin\mongod.cfg" --install

# Iniciar el servicio
Start-Service -Name MongoDB

# Verificar que esté corriendo
Get-Service -Name MongoDB
```

**Salida esperada:**
```
Status   Name               DisplayName
------   ----               -----------
Running  MongoDB            MongoDB Server
```

---

## 2. Verificación de Instalación de MongoDB

### Paso 2.1: Verificar que MongoDB está Corriendo

Abre PowerShell (no necesariamente como admin):

```powershell
# Verificar el estado del servicio
Get-Service -Name MongoDB
```

**Salida esperada:**
```
Status   Name               DisplayName
------   ----               -----------
Running  MongoDB            MongoDB Server
```

Si el estado es **Stopped**, inícialo:

```powershell
Start-Service -Name MongoDB
```

### Paso 2.2: Verificar la Versión de MongoDB

```powershell
# Verificar versión de mongod
mongod --version

# Verificar versión de mongosh (shell de MongoDB)
mongosh --version
```

**Salida esperada:**
```
db version v7.0.x
Build Info: { ... }
```

### Paso 2.3: Probar Conexión con mongosh

```powershell
# Conectar a MongoDB
mongosh
```

**Salida esperada:**
```
Current Mongosh Log ID: ...
Connecting to: mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+...
Using MongoDB: 7.0.x
Using Mongosh: x.x.x
```

Dentro de mongosh, ejecuta:

```javascript
// Ver información de conexión
db.runCommand({ connectionStatus: 1 })

// Ver bases de datos disponibles
show dbs

// Salir de mongosh
exit
```

**Salida esperada de `show dbs`:**
```
admin    40.00 KiB
config   12.00 KiB
local    72.00 KiB
```

### Paso 2.4: Verificar Puerto de MongoDB

```powershell
# Verificar que el puerto 27017 está en uso (MongoDB)
netstat -ano | findstr :27017
```

**Salida esperada:**
```
TCP    127.0.0.1:27017        0.0.0.0:0              LISTENING       <PID>
```

---

## 3. Configuración Inicial de MongoDB

### Paso 3.1: Verificar Archivo de Configuración

Por defecto, MongoDB se configura sin autenticación para desarrollo local. Verifica el archivo de configuración:

```powershell
# Ver la ubicación del archivo de configuración (generalmente)
notepad "C:\Program Files\MongoDB\Server\7.0\bin\mongod.cfg"
```

O verifica si existe:

```powershell
Test-Path "C:\Program Files\MongoDB\Server\7.0\bin\mongod.cfg"
```

**Para desarrollo local, MongoDB puede funcionar sin autenticación**, lo cual es más simple para empezar.

### Paso 3.2: Crear Base de Datos Inicial (Opcional)

MongoDB crea automáticamente las bases de datos cuando se inserta el primer documento, pero puedes crearla manualmente:

```powershell
# Abrir mongosh
mongosh
```

Dentro de mongosh:

```javascript
// Usar o crear la base de datos
use didi-sicuani

// Crear una colección temporal para que se cree la BD
db.createCollection("test")

// Verificar que se creó
show dbs

// Eliminar la colección temporal
db.test.drop()

// Salir
exit
```

**Salida esperada de `show dbs`:**
```
admin           40.00 KiB
config          12.00 KiB
didi-sicuani     8.00 KiB  ← Tu base de datos
local           72.00 KiB
```

---

## 4. Instalación de MongoDB Compass

### Paso 4.1: Descargar MongoDB Compass

1. Ve a:
   ```
   https://www.mongodb.com/try/download/compass
   ```

2. En la página:
   - **Version**: Selecciona la última versión estable
   - **Platform**: Windows
   - Haz clic en **Download**

### Paso 4.2: Instalar MongoDB Compass

1. Ejecuta el archivo `.exe` descargado
2. En el instalador:
   - Haz clic en **Next**
   - Acepta los términos y haz clic en **Next**
   - Selecciona la carpeta de instalación (o deja la predeterminada)
   - Haz clic en **Next**
   - Haz clic en **Install**
   - Espera a que termine
   - Haz clic en **Finish**

### Paso 4.3: Verificar Instalación

1. Abre MongoDB Compass desde el menú Inicio
2. Deberías ver la pantalla de conexión

**Verificación rápida desde PowerShell:**

```powershell
# Verificar que Compass está instalado (buscar ejecutable)
Test-Path "C:\Program Files\MongoDB Compass\MongoDBCompass.exe"
```

---

## 5. Configuración de Conexión en MongoDB Compass

### Paso 5.1: Conectar a MongoDB Local

1. Abre **MongoDB Compass**
2. En la pantalla de conexión, verás un campo de **Connection String**
3. Para conexión local sin autenticación, usa:
   ```
   mongodb://localhost:27017
   ```
   O simplemente deja el campo vacío y haz clic en **Connect**

4. MongoDB Compass detectará automáticamente tu instancia local

### Paso 5.2: Verificar Conexión

Una vez conectado, deberías ver:

- **Panel izquierdo**: Lista de bases de datos
- **Panel central**: Información de la base de datos seleccionada
- **Panel superior**: Barra de herramientas con opciones de búsqueda, filtros, etc.

**Verificación visual:**
- ✅ Deberías ver las bases de datos: `admin`, `config`, `local`
- ✅ Si creaste `didi-sicuani` antes, también debería aparecer
- ✅ En la parte superior debe decir **Connected** en verde

### Paso 5.3: Explorar la Base de Datos didi-sicuani

1. En el panel izquierdo, busca **didi-sicuani**
2. Si no existe, haz clic en el botón **+** junto a "Databases" o simplemente:
   - Haz clic derecho en una base de datos existente
   - Selecciona **Create Database**
   - Nombre: `didi-sicuani`
   - Nombre de colección: `test` (temporal)
   - Haz clic en **Create Database**

3. Expandir **didi-sicuani** para ver sus colecciones

### Paso 5.4: Crear Colecciones (Opcional)

Aunque las colecciones se crearán automáticamente cuando el backend las use, puedes crearlas manualmente:

1. Expandir **didi-sicuani**
2. Haz clic en **Create Collection**
3. Nombre de colección: `users`
4. Haz clic en **Create Collection**

Repite para las colecciones que necesites:
- `users`
- `riderequests`
- `bids`
- `bidnegotiations`
- `driverblocks`
- `driverholds`

### Paso 5.5: Guardar Conexión en Compass

Para facilitar conexiones futuras:

1. En la parte superior de Compass, haz clic en **New Connection**
2. Haz clic en **Save Connection** (ícono de estrella)
3. Nombre: `MongoDB Local - DiDi-Sicuani`
4. Haz clic en **Save**

---

## 6. Configuración del Backend DiDi-Sicuani

### Paso 6.1: Verificar Archivo .env

1. Navega a la carpeta del backend:
```powershell
cd backend
```

2. Verifica que existe el archivo `.env`:
```powershell
Test-Path .env
```

Si no existe, créalo:

```powershell
# Crear archivo .env
New-Item -Path .env -ItemType File
```

### Paso 6.2: Configurar MONGODB_URI en .env

Abre el archivo `.env` con tu editor preferido:

```powershell
notepad .env
```

O desde WebStorm, abre `backend/.env`

**Configuración para MongoDB local sin autenticación:**

```env
MONGODB_URI=mongodb://localhost:27017/didi-sicuani
```

**Si MongoDB tiene autenticación (más adelante, si lo configuras):**

```env
MONGODB_URI=mongodb://usuario:password@localhost:27017/didi-sicuani?authSource=admin
```

**Para MongoDB Atlas (cloud - opcional):**

```env
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/didi-sicuani?retryWrites=true&w=majority
```

### Paso 6.3: Verificar Configuración de Conexión en el Código

El código de conexión ya está en `backend/config/database.js`. Verifícalo:

```powershell
Get-Content backend\config\database.js
```

**Debería contener:**

```javascript
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // MongoDB connection options
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
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

---

## 7. Verificación de Conexión desde el Backend

### Paso 7.1: Verificar que MongoDB está Corriendo

Antes de probar la conexión desde el backend, asegúrate de que MongoDB está activo:

```powershell
# Verificar servicio
Get-Service -Name MongoDB

# Debe estar en estado "Running"
# Si no, iniciarlo:
Start-Service -Name MongoDB
```

### Paso 7.2: Ejecutar Script de Prueba de Conexión

El proyecto ya tiene un script de prueba. Ejecútalo:

```powershell
# Navegar al backend
cd backend

# Verificar que el script existe
Test-Path test-mongodb.js

# Ejecutar el test
node test-mongodb.js
```

**Salida esperada (éxito):**

```
🔍 Intentando conectar a MongoDB...
URI: mongodb://localhost:27017/didi-sicuani

MongoDB Connected: localhost:27017
✅ MongoDB conectado exitosamente

📊 Bases de datos disponibles:
  - admin (0.04 MB)
  - config (0.01 MB)
  - local (0.07 MB)
  - didi-sicuani (0.04 MB)

📁 Colecciones en didi-sicuani:
  (ninguna - se crearán automáticamente cuando las uses)

✅ Test completado exitosamente

🎉 ¡Todo listo! Puedes iniciar el servidor con: npm run dev
```

**Si hay error, ver la sección [Troubleshooting](#8-troubleshooting)**

### Paso 7.3: Verificar en MongoDB Compass

Después de ejecutar el test:

1. Abre **MongoDB Compass**
2. Conecta a `mongodb://localhost:27017`
3. En el panel izquierdo, deberías ver:
   - La base de datos **didi-sicuani** (si el test la creó)
   - Las bases de datos del sistema: `admin`, `config`, `local`

4. Si expandes **didi-sicuani**, verás las colecciones que se hayan creado automáticamente

### Paso 7.4: Iniciar el Servidor Backend

Una vez que el test de conexión funciona:

```powershell
# Asegúrate de estar en la carpeta backend
cd backend

# Instalar dependencias si no lo has hecho
npm install

# Iniciar el servidor en modo desarrollo
npm run dev
```

**Salida esperada:**

```
MongoDB Connected: localhost:27017
✅ MongoDB connected
✅ Redis connected (o ⚠️  Redis no disponible, continuando sin cache)
🚀 Server running on port 5000
📡 Socket.io ready
🌍 Environment: development
📚 API Documentation: http://localhost:5000/api-docs
```

### Paso 7.5: Verificar que los Datos se Guardan en Compass

1. Mientras el servidor está corriendo, realiza alguna operación que cree datos (registro, login, etc.)
2. En **MongoDB Compass**:
   - Haz clic derecho en **didi-sicuani** → **Refresh**
   - Expandir **didi-sicuani**
   - Deberías ver colecciones nuevas (ej: `users`, `riderequests`)
   - Haz clic en una colección para ver los documentos

### Paso 7.6: Crear Script de Verificación Completa

Crea un script más completo para verificar todo:

**Archivo: `backend/verify-mongodb-setup.js`**

```javascript
import connectDB from './config/database.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const verifySetup = async () => {
  console.log('🔍 Verificando configuración de MongoDB...\n');
  
  // 1. Verificar variable de entorno
  console.log('1️⃣  Verificando variable MONGODB_URI...');
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI no está definida en .env');
    process.exit(1);
  }
  console.log('✅ MONGODB_URI encontrada:', process.env.MONGODB_URI);
  console.log('');
  
  // 2. Intentar conectar
  console.log('2️⃣  Intentando conectar a MongoDB...');
  try {
    await connectDB();
    console.log('✅ Conexión exitosa');
    console.log('');
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    process.exit(1);
  }
  
  // 3. Verificar información de conexión
  console.log('3️⃣  Información de conexión:');
  const conn = mongoose.connection;
  console.log('   - Host:', conn.host);
  console.log('   - Puerto:', conn.port);
  console.log('   - Base de datos:', conn.name);
  console.log('   - Estado:', conn.readyState === 1 ? 'Conectado ✅' : 'Desconectado ❌');
  console.log('');
  
  // 4. Listar bases de datos
  console.log('4️⃣  Bases de datos disponibles:');
  try {
    const adminDb = conn.db.admin();
    const { databases } = await adminDb.listDatabases();
    databases.forEach(db => {
      const sizeMB = (db.sizeOnDisk / 1024 / 1024).toFixed(2);
      const marker = db.name === 'didi-sicuani' ? '✅' : '  ';
      console.log(`${marker} - ${db.name} (${sizeMB} MB)`);
    });
    console.log('');
  } catch (error) {
    console.error('❌ Error al listar bases de datos:', error.message);
  }
  
  // 5. Verificar base de datos didi-sicuani
  console.log('5️⃣  Verificando base de datos didi-sicuani...');
  try {
    const db = conn.db;
    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('   ⚠️  No hay colecciones aún (normal si es primera vez)');
      console.log('   💡 Las colecciones se crearán automáticamente cuando las uses');
    } else {
      console.log('   ✅ Colecciones encontradas:');
      collections.forEach(col => {
        db.collection(col.name).countDocuments()
          .then(count => {
            console.log(`      - ${col.name} (${count} documentos)`);
          })
          .catch(() => {
            console.log(`      - ${col.name}`);
          });
      });
    }
    console.log('');
  } catch (error) {
    console.error('❌ Error al verificar colecciones:', error.message);
  }
  
  // 6. Test de escritura simple
  console.log('6️⃣  Test de escritura y lectura...');
  try {
    const testCollection = conn.db.collection('connection_test');
    const testDoc = {
      test: true,
      timestamp: new Date(),
      message: 'Test de conexión desde backend'
    };
    
    // Insertar
    await testCollection.insertOne(testDoc);
    console.log('   ✅ Escritura exitosa');
    
    // Leer
    const result = await testCollection.findOne({ test: true });
    if (result) {
      console.log('   ✅ Lectura exitosa');
      console.log('   📄 Documento insertado:', JSON.stringify(result, null, 2));
      
      // Limpiar
      await testCollection.deleteOne({ test: true });
      console.log('   ✅ Documento de prueba eliminado');
    }
    console.log('');
  } catch (error) {
    console.error('❌ Error en test de escritura/lectura:', error.message);
  }
  
  // 7. Cerrar conexión
  console.log('7️⃣  Cerrando conexión...');
  await conn.close();
  console.log('✅ Conexión cerrada');
  console.log('');
  
  // Resumen final
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ ¡Configuración de MongoDB verificada exitosamente!');
  console.log('');
  console.log('📋 Resumen:');
  console.log('   - MongoDB está corriendo');
  console.log('   - Conexión desde backend funciona');
  console.log('   - Base de datos didi-sicuani disponible');
  console.log('   - Escritura y lectura funcionando');
  console.log('');
  console.log('🎯 Próximos pasos:');
  console.log('   1. Abre MongoDB Compass y conecta a: mongodb://localhost:27017');
  console.log('   2. Inicia el servidor backend: npm run dev');
  console.log('   3. Las colecciones se crearán automáticamente cuando las uses');
  console.log('═══════════════════════════════════════════════════════════');
  
  process.exit(0);
};

verifySetup().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
```

**Ejecutar el script:**

```powershell
node backend/verify-mongodb-setup.js
```

---

## 8. Troubleshooting

### Error: "MongoDB service is not running"

**Síntomas:**
```
Error connecting to MongoDB: MongoServerError: connect ECONNREFUSED 127.0.0.1:27017
```

**Solución:**

```powershell
# Verificar estado del servicio
Get-Service -Name MongoDB

# Si está Stopped, iniciarlo
Start-Service -Name MongoDB

# Verificar que inició correctamente
Get-Service -Name MongoDB

# Si hay error al iniciar, verificar logs
Get-EventLog -LogName Application -Source MongoDB -Newest 10 | Format-List
```

**Si el servicio no existe:**

```powershell
# Instalar MongoDB como servicio (ajustar ruta según tu versión)
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --config "C:\Program Files\MongoDB\Server\7.0\bin\mongod.cfg" --install

# Iniciar servicio
Start-Service -Name MongoDB
```

### Error: "Cannot find module 'mongoose'"

**Síntomas:**
```
Error: Cannot find module 'mongoose'
```

**Solución:**

```powershell
cd backend
npm install
```

### Error: "MONGODB_URI is not defined"

**Síntomas:**
```
Error: MONGODB_URI is not defined
```

**Solución:**

1. Verificar que existe el archivo `.env` en `backend/.env`:
```powershell
Test-Path backend\.env
```

2. Verificar que contiene `MONGODB_URI`:
```powershell
Get-Content backend\.env | Select-String "MONGODB_URI"
```

3. Si no existe, crearlo o agregarlo:
```env
MONGODB_URI=mongodb://localhost:27017/didi-sicuani
```

### Error: "Port 27017 already in use"

**Síntomas:**
```
Error: Port 27017 already in use
```

**Solución:**

```powershell
# Ver qué proceso está usando el puerto
netstat -ano | findstr :27017

# Ver el PID y terminar el proceso si es necesario
# (Usar el PID que aparece en la última columna)
taskkill /PID <PID> /F

# Reiniciar MongoDB
Restart-Service -Name MongoDB
```

### Error: "Authentication failed"

**Síntomas:**
```
Error: Authentication failed
```

**Solución:**

Si configuraste MongoDB con autenticación, verifica las credenciales en `.env`:

```env
MONGODB_URI=mongodb://usuario:password@localhost:27017/didi-sicuani?authSource=admin
```

Si no necesitas autenticación para desarrollo local:

```env
MONGODB_URI=mongodb://localhost:27017/didi-sicuani
```

Y asegúrate de que MongoDB no tenga autenticación habilitada.

### MongoDB Compass no se conecta

**Síntomas:**
- Compass muestra error de conexión
- No aparece ninguna base de datos

**Solución:**

1. Verificar que MongoDB está corriendo:
```powershell
Get-Service -Name MongoDB
```

2. Probar conexión desde mongosh:
```powershell
mongosh
```

3. En Compass, usar la connection string exacta:
```
mongodb://localhost:27017
```

4. Si aún no funciona, reiniciar MongoDB:
```powershell
Restart-Service -Name MongoDB
```

### El backend no crea colecciones automáticamente

**Síntomas:**
- El backend se conecta pero no se ven colecciones en Compass

**Solución:**

1. Asegúrate de que el backend está haciendo operaciones que creen documentos
2. Las colecciones se crean cuando insertas el primer documento
3. Prueba hacer un registro de usuario o crear una solicitud de viaje
4. En Compass, haz clic derecho en la base de datos → **Refresh**

### Verificar Logs de MongoDB

```powershell
# Ver logs de MongoDB (generalmente en)
Get-Content "C:\Program Files\MongoDB\Server\7.0\log\mongod.log" -Tail 50

# O buscar eventos en el log de Windows
Get-EventLog -LogName Application -Source MongoDB -Newest 20 | Format-List
```

---

## ✅ Checklist Final

Usa este checklist para verificar que todo está configurado correctamente:

- [ ] MongoDB instalado y versión verificada
- [ ] Servicio MongoDB corriendo (`Get-Service -Name MongoDB`)
- [ ] Conexión con `mongosh` funciona
- [ ] MongoDB Compass instalado
- [ ] Conexión desde Compass a `localhost:27017` exitosa
- [ ] Base de datos `didi-sicuani` visible en Compass
- [ ] Archivo `.env` en `backend/` con `MONGODB_URI` configurada
- [ ] Test de conexión desde backend exitoso (`node test-mongodb.js`)
- [ ] Servidor backend inicia sin errores (`npm run dev`)
- [ ] Datos se guardan y aparecen en MongoDB Compass
- [ ] Puedo ver, editar y eliminar documentos desde Compass

---

## 📚 Recursos Adicionales

- **Documentación oficial de MongoDB**: https://docs.mongodb.com/
- **MongoDB Compass Documentation**: https://www.mongodb.com/docs/compass/
- **Mongoose Documentation**: https://mongoosejs.com/docs/
- **MongoDB Shell (mongosh)**: https://www.mongodb.com/docs/mongodb-shell/

---

## 🎉 ¡Configuración Completada!

Ahora tienes MongoDB y MongoDB Compass configurados correctamente. Puedes usar Compass en lugar de WebStorm DataGrid para:

- ✅ Visualizar tus datos de forma gráfica
- ✅ Explorar colecciones y documentos
- ✅ Editar documentos directamente
- ✅ Ejecutar queries y agregaciones
- ✅ Ver índices y estadísticas
- ✅ Monitorear el rendimiento

**¡Disfruta trabajando con MongoDB!** 🚀



