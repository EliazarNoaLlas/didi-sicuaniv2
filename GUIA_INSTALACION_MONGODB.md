# 🗄️ Guía de Instalación de MongoDB para Windows

## 📋 Índice
1. [Instalación Local (Recomendado para Desarrollo)](#instalación-local)
2. [MongoDB Atlas (Cloud - Alternativa)](#mongodb-atlas-cloud)
3. [Verificación de Instalación](#verificación)
4. [Solución de Problemas](#solución-de-problemas)

---

## 🔧 Instalación Local

### Paso 1: Descargar MongoDB Community Server

1. **Visita la página de descarga:**
   - URL: https://www.mongodb.com/try/download/community
   - O busca "MongoDB Community Server download" en Google

2. **Selecciona las opciones:**
   - **Version:** La más reciente (ej: 7.0.x)
   - **Platform:** Windows
   - **Package:** MSI (recomendado)
   - **Architecture:** x64 (para sistemas de 64 bits)

3. **Haz clic en "Download"**

### Paso 2: Instalar MongoDB

1. **Ejecuta el instalador:**
   - Busca el archivo descargado (ej: `mongodb-windows-x86_64-7.0.x-signed.msi`)
   - Haz doble clic para ejecutarlo

2. **Sigue el asistente de instalación:**
   - **Setup Type:** Selecciona "Complete" (instalación completa)
   - **Service Configuration:**
     - ✅ **Marca:** "Install MongoDB as a Service"
     - ✅ **Marca:** "Run service as Network Service user" (recomendado)
     - ✅ **Marca:** "Run service as Local or Domain User" (si prefieres)
   - **Install MongoDB Compass:**
     - ✅ **Marca:** "Install MongoDB Compass" (GUI útil para visualizar datos)
   - Haz clic en "Install"

3. **Espera a que termine la instalación** (puede tardar 2-5 minutos)

### Paso 3: Verificar la Instalación

Abre PowerShell como Administrador y ejecuta:

```powershell
# Verificar que el servicio esté instalado
Get-Service MongoDB

# Verificar que el servicio esté corriendo
Start-Service MongoDB

# Verificar la versión
mongod --version
```

**Salida esperada:**
```
Status   Name               DisplayName
------   ----               -----------
Running  MongoDB            MongoDB Server
```

### Paso 4: Configurar MongoDB en tu Proyecto

1. **Verifica que el archivo `.env` existe en `backend/`**

2. **Asegúrate de que tenga esta línea:**
   ```env
   MONGODB_URI=mongodb://localhost:27017/didi-sicuani
   ```

3. **Inicia el servidor:**
   ```powershell
   cd backend
   npm run dev
   ```

**Deberías ver:**
```
✅ MongoDB Connected: localhost:27017
```

---

## ☁️ MongoDB Atlas (Cloud - Alternativa)

Si prefieres usar MongoDB en la nube (gratis hasta 512MB):

### Paso 1: Crear Cuenta

1. **Visita:** https://www.mongodb.com/cloud/atlas/register
2. **Crea una cuenta** (puedes usar Google, GitHub, o email)

### Paso 2: Crear Cluster Gratuito

1. **Haz clic en "Build a Database"**
2. **Selecciona el plan "FREE" (M0)**
3. **Elige un proveedor y región:**
   - AWS, Google Cloud, o Azure
   - Región: Elige la más cercana (ej: `us-east-1`)
4. **Haz clic en "Create"** (puede tardar 3-5 minutos)

### Paso 3: Configurar Usuario de Base de Datos

1. **Ve a "Database Access" (menú lateral izquierdo)**
2. **Haz clic en "Add New Database User"**
3. **Configura:**
   - **Authentication Method:** Password
   - **Username:** `didi-sicuani-user` (o el que prefieras)
   - **Password:** Genera una contraseña segura y **guárdala**
   - **Database User Privileges:** "Atlas admin"
4. **Haz clic en "Add User"**

### Paso 4: Configurar Acceso de Red

1. **Ve a "Network Access" (menú lateral izquierdo)**
2. **Haz clic en "Add IP Address"**
3. **Opciones:**
   - **Opción 1 (Desarrollo):** Selecciona "Allow Access from Anywhere"
     - IP Address: `0.0.0.0/0`
   - **Opción 2 (Producción):** Agrega tu IP específica
4. **Haz clic en "Confirm"**

### Paso 5: Obtener Connection String

1. **Ve a "Database" (menú lateral izquierdo)**
2. **Haz clic en "Connect"** en tu cluster
3. **Selecciona "Connect your application"**
4. **Copia la connection string:**
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Paso 6: Actualizar .env

1. **Abre `backend/.env`**
2. **Reemplaza la línea de MONGODB_URI:**
   ```env
   MONGODB_URI=mongodb+srv://didi-sicuani-user:TU_PASSWORD@cluster0.xxxxx.mongodb.net/didi-sicuani?retryWrites=true&w=majority
   ```
   
   **Reemplaza:**
   - `didi-sicuani-user` → Tu nombre de usuario
   - `TU_PASSWORD` → Tu contraseña (si tiene caracteres especiales, URL-encodéala)
   - `cluster0.xxxxx.mongodb.net` → Tu cluster URL
   - `didi-sicuani` → Nombre de la base de datos

3. **Guarda el archivo**

### Paso 7: Probar Conexión

```powershell
cd backend
npm run dev
```

**Deberías ver:**
```
✅ MongoDB Connected: cluster0-shard-00-00.xxxxx.mongodb.net
```

---

## ✅ Verificación

### Verificar que MongoDB está corriendo (Local)

```powershell
# Verificar servicio
Get-Service MongoDB

# Verificar puerto
netstat -an | findstr 27017

# Probar conexión con MongoDB Shell (si está instalado)
mongosh
```

### Verificar desde el código

El servidor debería mostrar:
```
✅ MongoDB Connected: localhost:27017
```

Si ves esto, **¡MongoDB está funcionando correctamente!** 🎉

---

## 🔧 Solución de Problemas

### ❌ Error: "connect ECONNREFUSED ::1:27017"

**Causa:** MongoDB no está corriendo

**Solución:**
```powershell
# Iniciar servicio MongoDB
Start-Service MongoDB

# Verificar estado
Get-Service MongoDB
```

Si el servicio no existe:
```powershell
# Reinstalar MongoDB o verificar instalación
# Ve a: Panel de Control > Programas > MongoDB
```

### ❌ Error: "Service 'MongoDB' cannot be started"

**Causa:** Puerto 27017 está en uso o permisos insuficientes

**Solución 1:** Ejecutar PowerShell como Administrador
```powershell
# Abre PowerShell como Administrador
Start-Service MongoDB
```

**Solución 2:** Verificar qué está usando el puerto
```powershell
netstat -ano | findstr :27017
```

**Solución 3:** Cambiar puerto en MongoDB (avanzado)
- Edita `C:\Program Files\MongoDB\Server\7.0\bin\mongod.cfg`
- Cambia `port: 27017` a otro puerto (ej: `27018`)
- Actualiza `.env` con el nuevo puerto

### ❌ Error: "Authentication failed" (MongoDB Atlas)

**Causa:** Usuario o contraseña incorrectos

**Solución:**
1. Verifica usuario y contraseña en MongoDB Atlas
2. Si la contraseña tiene caracteres especiales, URL-encodéala:
   - `@` → `%40`
   - `#` → `%23`
   - `$` → `%24`
   - `%` → `%25`
   - etc.

### ❌ Error: "IP not whitelisted" (MongoDB Atlas)

**Causa:** Tu IP no está en la lista blanca

**Solución:**
1. Ve a MongoDB Atlas → Network Access
2. Agrega tu IP actual o `0.0.0.0/0` (solo para desarrollo)

### ❌ Error: "mongod is not recognized"

**Causa:** MongoDB no está en el PATH

**Solución:**
1. Agrega MongoDB al PATH:
   - Busca "Variables de entorno" en Windows
   - Edita "Path" en Variables del sistema
   - Agrega: `C:\Program Files\MongoDB\Server\7.0\bin`
2. O reinicia PowerShell/Terminal

### ❌ El servicio se detiene automáticamente

**Causa:** Error en la configuración o permisos

**Solución:**
1. Verifica logs:
   ```powershell
   Get-EventLog -LogName Application -Source MongoDB -Newest 10
   ```
2. Verifica permisos en:
   - `C:\Program Files\MongoDB\Server\7.0\data\db`
   - El usuario del servicio debe tener permisos de lectura/escritura

---

## 📚 Recursos Adicionales

- **Documentación oficial:** https://docs.mongodb.com/manual/installation/
- **MongoDB Compass (GUI):** https://www.mongodb.com/products/compass
- **MongoDB Shell (mongosh):** Se instala automáticamente con MongoDB

---

## 🎯 Resumen Rápido

### Para Instalación Local:
1. ✅ Descarga MongoDB Community Server
2. ✅ Instala con "Complete" y "Install as Service"
3. ✅ Verifica: `Get-Service MongoDB`
4. ✅ Inicia: `Start-Service MongoDB`
5. ✅ Prueba: `npm run dev`

### Para MongoDB Atlas:
1. ✅ Crea cuenta en MongoDB Atlas
2. ✅ Crea cluster gratuito (M0)
3. ✅ Configura usuario y red
4. ✅ Copia connection string
5. ✅ Actualiza `.env`
6. ✅ Prueba: `npm run dev`

---

**¿Necesitas ayuda?** Revisa la sección de "Solución de Problemas" o consulta la documentación oficial de MongoDB.

