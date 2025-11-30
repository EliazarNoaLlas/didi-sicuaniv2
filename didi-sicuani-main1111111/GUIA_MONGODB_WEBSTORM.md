# 🗄️ Guía: Crear Base de Datos MongoDB desde WebStorm/DataGrip

Esta guía te ayudará a crear la base de datos `didi-sicuani` en MongoDB usando el DataGrip integrado en WebStorm.

---

## 📋 Prerrequisitos

1. ✅ MongoDB instalado y corriendo en tu sistema
2. ✅ WebStorm con DataGrip plugin instalado (viene por defecto)
3. ✅ MongoDB Compass o mongosh instalado (opcional, para verificación)

---

## 🚀 Paso 1: Verificar que MongoDB está Corriendo

### Windows:
```powershell
# Verificar si MongoDB está corriendo
Get-Service -Name MongoDB

# Si no está corriendo, iniciarlo:
Start-Service -Name MongoDB

# O desde servicios de Windows:
# Buscar "MongoDB" en servicios y asegurarse que esté "En ejecución"
```

### Verificar desde terminal:
```bash
# Probar conexión
mongosh
# O versión antigua:
mongo

# Si conecta correctamente, verás:
# Current Mongosh Log ID: ...
# Connecting to: mongodb://127.0.0.1:27017
```

---

## 🔌 Paso 2: Configurar Conexión MongoDB en WebStorm

### 2.1 Abrir DataGrip en WebStorm

1. En WebStorm, ve a: **View → Tool Windows → Database** (o presiona `Alt + 1`)
2. O haz clic en el ícono de **Database** en la barra lateral izquierda

### 2.2 Agregar Nueva Conexión

1. Haz clic en el botón **+** (Add Data Source)
2. Selecciona **MongoDB**

### 2.3 Configurar Conexión

**Pestaña "General":**
- **Name**: `MongoDB Local - DiDi-Sicuani`
- **Host**: `localhost`
- **Port**: `27017`
- **Authentication**: 
  - Si MongoDB NO tiene autenticación: Deja en blanco
  - Si MongoDB tiene autenticación:
    - **User**: `tu_usuario`
    - **Password**: `tu_password`
    - **Authentication Database**: `admin`

**Pestaña "Advanced":**
- **Connection String**: Se genera automáticamente
  - Sin auth: `mongodb://localhost:27017`
  - Con auth: `mongodb://usuario:password@localhost:27017/?authSource=admin`

### 2.4 Probar Conexión

1. Haz clic en **Test Connection**
2. Si todo está bien, verás: ✅ **Connection successful**
3. Si hay error, revisa:
   - MongoDB está corriendo
   - Puerto correcto (27017)
   - Credenciales correctas (si aplica)

### 2.5 Guardar Conexión

1. Haz clic en **OK** para guardar la conexión
2. La conexión aparecerá en el panel de Database

---

## 🗄️ Paso 3: Crear Base de Datos desde DataGrip

### Opción A: Crear Base de Datos Manualmente

1. **Expandir la conexión** en el panel de Database
2. **Click derecho** en la conexión → **New → Database**
3. O simplemente **expandir** la conexión y verás las bases de datos existentes

**Nota**: En MongoDB, la base de datos se crea automáticamente cuando insertas el primer documento. Pero puedes crearla explícitamente:

### Opción B: Crear Base de Datos con Query

1. **Click derecho** en la conexión → **New → Query Console**
2. Escribe el siguiente comando:
```javascript
use didi-sicuani
```

3. Presiona **Ctrl + Enter** (o **Cmd + Enter** en Mac) para ejecutar
4. Verás: `switched to db didi-sicuani`

### Opción C: Crear Base de Datos desde Terminal Integrado

1. En WebStorm, ve a: **View → Tool Windows → Terminal** (o `Alt + F12`)
2. Ejecuta:
```bash
mongosh
```

3. Dentro de mongosh:
```javascript
use didi-sicuani
db.createCollection("users")  // Crear primera colección
```

4. Verificar:
```javascript
show dbs  // Debe aparecer didi-sicuani
```

---

## ✅ Paso 4: Verificar Base de Datos Creada

### Desde DataGrip:

1. **Expandir** la conexión MongoDB
2. **Expandir** "Databases"
3. Deberías ver `didi-sicuani` en la lista
4. Si no aparece, haz **click derecho** en la conexión → **Refresh**

### Desde Terminal:

```bash
mongosh
show dbs
# Deberías ver:
# admin    40.00 KiB
# config   12.00 KiB
# local    72.00 KiB
# didi-sicuani   40.00 KiB  ← Tu base de datos
```

---

## 📝 Paso 5: Crear Colecciones Iniciales (Opcional)

Las colecciones se crearán automáticamente cuando el código las use, pero puedes crearlas manualmente:

### Desde DataGrip:

1. **Expandir** `didi-sicuani`
2. **Click derecho** en "Collections" → **New → Collection**
3. Nombre: `users`
4. Repetir para:
   - `riderequests`
   - `bids`
   - `bidnegotiations`

### Desde Query Console:

```javascript
use didi-sicuani

// Crear colecciones
db.createCollection("users")
db.createCollection("riderequests")
db.createCollection("bids")
db.createCollection("bidnegotiations")

// Verificar
show collections
```

---

## 🔧 Paso 6: Configurar .env

Ya tienes el archivo `.env` creado en `backend/.env`. Verifica que tenga:

```env
MONGODB_URI=mongodb://localhost:27017/didi-sicuani
```

Si tu MongoDB tiene autenticación, cambia a:
```env
MONGODB_URI=mongodb://usuario:password@localhost:27017/didi-sicuani?authSource=admin
```

---

## 🧪 Paso 7: Probar Conexión desde el Código

### Crear Script de Prueba:

Crea el archivo: `backend/test-mongodb.js`

```javascript
import connectDB from './config/database.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const testConnection = async () => {
  try {
    console.log('🔍 Intentando conectar a MongoDB...');
    console.log('URI:', process.env.MONGODB_URI);
    
    await connectDB();
    console.log('✅ MongoDB conectado exitosamente');
    
    // Listar bases de datos
    const adminDb = mongoose.connection.db.admin();
    const { databases } = await adminDb.listDatabases();
    
    console.log('\n📊 Bases de datos disponibles:');
    databases.forEach(db => {
      console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    // Listar colecciones de didi-sicuani
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    console.log('\n📁 Colecciones en didi-sicuani:');
    if (collections.length === 0) {
      console.log('  (ninguna - se crearán automáticamente)');
    } else {
      collections.forEach(col => {
        console.log(`  - ${col.name}`);
      });
    }
    
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('\n✅ Test completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Verifica:');
    console.error('  1. MongoDB está corriendo');
    console.error('  2. La URI en .env es correcta');
    console.error('  3. Las credenciales son correctas (si aplica)');
    process.exit(1);
  }
};

testConnection();
```

### Ejecutar el Test:

```bash
cd backend
node test-mongodb.js
```

**Salida esperada:**
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
  (ninguna - se crearán automáticamente)

✅ Test completado exitosamente
```

---

## 🎯 Paso 8: Iniciar el Servidor

Ahora que la base de datos está lista, puedes iniciar el servidor:

```bash
cd backend
npm run dev
```

**Salida esperada:**
```
MongoDB Connected: localhost:27017
✅ MongoDB connected
✅ Redis connected
🚀 Server running on port 5000
📡 Socket.io ready
🌍 Environment: development
```

---

## 🐛 Troubleshooting

### Error: "ECONNREFUSED"

**Causa**: MongoDB no está corriendo

**Solución**:
```bash
# Windows (PowerShell como Admin):
Start-Service -Name MongoDB

# Verificar:
mongosh
```

### Error: "Authentication failed"

**Causa**: Credenciales incorrectas

**Solución**:
1. Verifica usuario y contraseña en `.env`
2. Si MongoDB no tiene autenticación, usa:
   ```env
   MONGODB_URI=mongodb://localhost:27017/didi-sicuani
   ```

### Error: "Database does not exist"

**Causa**: La base de datos no se ha creado aún

**Solución**:
- MongoDB crea la base de datos automáticamente al primer uso
- O créala manualmente con `use didi-sicuani` en mongosh

### No aparece la base de datos en DataGrip

**Solución**:
1. **Click derecho** en la conexión → **Refresh**
2. O **Expandir** la conexión completamente
3. Verifica que MongoDB esté corriendo

### DataGrip no muestra MongoDB como opción

**Solución**:
1. Verifica que el plugin de MongoDB esté instalado:
   - **File → Settings → Plugins**
   - Buscar "MongoDB"
   - Asegurarse que esté habilitado
2. Si no está, instálalo desde Marketplace

---

## 📚 Recursos Adicionales

- **MongoDB Documentation**: https://docs.mongodb.com/
- **DataGrip MongoDB Guide**: https://www.jetbrains.com/help/datagrip/mongodb.html
- **MongoDB Shell (mongosh)**: https://docs.mongodb.com/mongodb-shell/

---

## ✅ Checklist Final

- [ ] MongoDB instalado y corriendo
- [ ] Conexión creada en DataGrip
- [ ] Base de datos `didi-sicuani` creada
- [ ] Archivo `.env` configurado correctamente
- [ ] Test de conexión exitoso
- [ ] Servidor backend inicia sin errores

---

¡Listo! Ya tienes MongoDB configurado y la base de datos creada. 🎉

