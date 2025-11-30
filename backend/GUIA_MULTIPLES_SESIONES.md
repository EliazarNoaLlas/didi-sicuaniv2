# 🔐 Guía: Manejar Múltiples Sesiones (Pasajero y Conductor) en Local

Esta guía te muestra cómo probar la aplicación con múltiples usuarios simultáneamente (pasajero y conductor) en tu entorno local.

---

## 📋 Tabla de Contenidos

1. [Crear Usuarios de Prueba](#1-crear-usuarios-de-prueba)
2. [Método 1: Postman con Environments](#2-método-1-postman-con-environments)
3. [Método 2: Múltiples Navegadores](#3-método-2-múltiples-navegadores)
4. [Método 3: Scripts con cURL](#4-método-3-scripts-con-curl)
5. [Método 4: Thunder Client (VS Code)](#5-método-4-thunder-client-vs-code)
6. [Probar Socket.io con Múltiples Clientes](#6-probar-socketio-con-múltiples-clientes)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Crear Usuarios de Prueba

### Opción A: Script Automático (Recomendado)

```bash
cd backend
node scripts/create-test-users.js
```

Esto crea:
- **Pasajero:** `pasajero@test.com` / `test123`
- **Conductor Taxi:** `conductor.taxi@test.com` / `test123`
- **Conductor Mototaxi:** `conductor.mototaxi@test.com` / `test123`

### Opción B: Manualmente vía API

**Crear Pasajero:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juan Pasajero",
    "email": "pasajero@test.com",
    "password": "test123",
    "userType": "passenger",
    "phone": "+51987654321"
  }'
```

**Crear Conductor:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Carlos Conductor",
    "email": "conductor@test.com",
    "password": "test123",
    "userType": "driver",
    "phone": "+51987654322"
  }'
```

Luego actualiza el conductor con información del vehículo:
```bash
# Primero obtén el token del conductor
# Luego actualiza su perfil (ver endpoint PUT /api/drivers/profile)
```

---

## 2. Método 1: Postman con Environments

Postman permite tener múltiples "environments" con diferentes tokens.

### Paso 1: Crear Environments

1. **Abrir Postman**
2. **Crear Environment "Pasajero":**
   - Click en "Environments" (izquierda)
   - Click "Create Environment"
   - Nombre: `Pasajero Local`
   - Variables:
     - `base_url`: `http://localhost:5000/api`
     - `token`: (vacío por ahora)
     - `user_id`: (vacío por ahora)
     - `user_type`: `passenger`

3. **Crear Environment "Conductor":**
   - Nombre: `Conductor Local`
   - Variables:
     - `base_url`: `http://localhost:5000/api`
     - `token`: (vacío por ahora)
     - `user_id`: (vacío por ahora)
     - `user_type`: `driver`

### Paso 2: Obtener Tokens

**Para Pasajero:**
1. Seleccionar environment "Pasajero Local"
2. Crear request: `POST {{base_url}}/auth/login`
3. Body:
   ```json
   {
     "email": "pasajero@test.com",
     "password": "test123"
   }
   ```
4. Enviar request
5. Copiar el `token` de la respuesta
6. Editar environment "Pasajero Local"
7. Pegar token en variable `token`
8. Guardar

**Para Conductor:**
1. Seleccionar environment "Conductor Local"
2. Repetir pasos 2-8 con `conductor.taxi@test.com`

### Paso 3: Configurar Headers Automáticos

**Crear Collection "DiDi Sicuani":**
1. Nueva Collection
2. En la pestaña "Authorization":
   - Type: `Bearer Token`
   - Token: `{{token}}`
3. Esto aplicará automáticamente el token de cada environment

### Paso 4: Usar Múltiples Sesiones

**Sesión 1 - Pasajero:**
1. Seleccionar environment "Pasajero Local"
2. Hacer requests como pasajero:
   - `POST /api/rides/request`
   - `GET /api/rides/:id`
   - `POST /api/rides/:id/bids/:bidId/respond`

**Sesión 2 - Conductor:**
1. Seleccionar environment "Conductor Local"
2. Hacer requests como conductor:
   - `GET /api/drivers/queue`
   - `POST /api/rides/:id/bids`

**Ventajas:**
- ✅ Cambio rápido entre sesiones
- ✅ Tokens guardados automáticamente
- ✅ Variables reutilizables

---

## 3. Método 2: Múltiples Navegadores

Si tienes frontend corriendo, puedes usar diferentes navegadores o perfiles.

### Opción A: Diferentes Navegadores

1. **Chrome - Sesión Pasajero:**
   - Abrir Chrome
   - Ir a `http://localhost:5173` (o puerto del frontend)
   - Login con `pasajero@test.com`

2. **Firefox - Sesión Conductor:**
   - Abrir Firefox
   - Ir a `http://localhost:5173`
   - Login con `conductor.taxi@test.com`

### Opción B: Perfiles de Navegador

**Chrome:**
1. Click en perfil (arriba derecha)
2. "Agregar" → Crear nuevo perfil
3. Nombre: "Pasajero"
4. Repetir para "Conductor"
5. Cada perfil tiene cookies/sesiones separadas

**Firefox:**
1. `about:profiles`
2. "Crear nuevo perfil"
3. Nombre: "Pasajero"
4. Repetir para "Conductor"

### Opción C: Modo Incógnito

1. **Ventana Normal:** Pasajero
2. **Ventana Incógnito:** Conductor

**Ventajas:**
- ✅ Interfaz visual completa
- ✅ Fácil de usar
- ✅ Prueba real del frontend

---

## 4. Método 3: Scripts con cURL

Crea scripts separados para cada rol.

### Script: `test-pasajero.sh`

```bash
#!/bin/bash

# Variables
BASE_URL="http://localhost:5000/api"
EMAIL="pasajero@test.com"
PASSWORD="test123"

# 1. Login
echo "🔐 Iniciando sesión como pasajero..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')
USER_ID=$(echo $LOGIN_RESPONSE | jq -r '.data.user.id')

echo "✅ Token obtenido: ${TOKEN:0:20}..."
echo "✅ User ID: $USER_ID"

# 2. Crear solicitud de viaje
echo "\n🚗 Creando solicitud de viaje..."
RIDE_RESPONSE=$(curl -s -X POST "$BASE_URL/rides/request" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "origin_lat": -14.2694,
    "origin_lon": -71.2256,
    "origin_address": "Plaza Principal, Sicuani",
    "destination_lat": -14.27,
    "destination_lon": -71.226,
    "destination_address": "Mercado Central, Sicuani",
    "passenger_offered_price": 12,
    "vehicle_type": "taxi",
    "payment_method": "cash"
  }')

RIDE_ID=$(echo $RIDE_RESPONSE | jq -r '.data.rideRequest._id')
echo "✅ Solicitud creada: $RIDE_ID"

# Guardar variables para uso posterior
echo "TOKEN=$TOKEN" > .pasajero.env
echo "USER_ID=$USER_ID" >> .pasajero.env
echo "RIDE_ID=$RIDE_ID" >> .pasajero.env
```

### Script: `test-conductor.sh`

```bash
#!/bin/bash

# Variables
BASE_URL="http://localhost:5000/api"
EMAIL="conductor.taxi@test.com"
PASSWORD="test123"

# 1. Login
echo "🔐 Iniciando sesión como conductor..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')
USER_ID=$(echo $LOGIN_RESPONSE | jq -r '.data.user.id')

echo "✅ Token obtenido: ${TOKEN:0:20}..."
echo "✅ User ID: $USER_ID"

# 2. Leer RIDE_ID del pasajero
if [ -f .pasajero.env ]; then
  source .pasajero.env
  echo "\n📋 Solicitud de viaje encontrada: $RIDE_ID"
  
  # 3. Enviar oferta
  echo "\n💰 Enviando oferta..."
  BID_RESPONSE=$(curl -s -X POST "$BASE_URL/rides/$RIDE_ID/bids" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "bid_type": "accept"
    }')
  
  echo "✅ Oferta enviada"
  echo "$BID_RESPONSE" | jq
else
  echo "⚠️  No se encontró solicitud de viaje del pasajero"
fi

# Guardar variables
echo "TOKEN=$TOKEN" > .conductor.env
echo "USER_ID=$USER_ID" >> .conductor.env
```

### Uso:

```bash
# Terminal 1 - Pasajero
chmod +x test-pasajero.sh
./test-pasajero.sh

# Terminal 2 - Conductor
chmod +x test-conductor.sh
./test-conductor.sh
```

**Ventajas:**
- ✅ Automatizable
- ✅ Fácil de integrar en CI/CD
- ✅ Reproducible

---

## 5. Método 4: Thunder Client (VS Code)

Thunder Client es una extensión de VS Code similar a Postman.

### Paso 1: Instalar Thunder Client

1. Abrir VS Code
2. Extensions → Buscar "Thunder Client"
3. Instalar

### Paso 2: Crear Environments

1. Click en icono Thunder Client (barra lateral)
2. "Environments" → "New Environment"
3. Crear:
   - `Pasajero Local`
   - `Conductor Local`

### Paso 3: Configurar Variables

En cada environment:
- `base_url`: `http://localhost:5000/api`
- `token`: (se llenará después del login)

### Paso 4: Crear Requests

1. Nueva Collection "DiDi Sicuani"
2. Crear requests con `{{base_url}}` y `{{token}}`
3. Cambiar entre environments para cambiar sesión

**Ventajas:**
- ✅ Integrado en VS Code
- ✅ No necesita aplicación separada
- ✅ Similar a Postman

---

## 6. Probar Socket.io con Múltiples Clientes

Para probar notificaciones en tiempo real, necesitas múltiples clientes Socket.io.

### Opción A: Script Node.js

**`test-socket-pasajero.js`:**

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'TU_TOKEN_PASAJERO_AQUI'
  }
});

socket.on('connect', () => {
  console.log('✅ Pasajero conectado');
});

socket.on('bid:received', (bid) => {
  console.log('💰 Oferta recibida:', bid);
});

socket.on('ride:accepted', (data) => {
  console.log('✅ Viaje aceptado:', data);
});
```

**`test-socket-conductor.js`:**

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'TU_TOKEN_CONDUCTOR_AQUI'
  }
});

socket.on('connect', () => {
  console.log('✅ Conductor conectado');
  socket.join('drivers');
});

socket.on('ride:new', (ride) => {
  console.log('🚗 Nueva solicitud de viaje:', ride);
  
  // Simular aceptación después de 2 segundos
  setTimeout(() => {
    socket.emit('bid:submit', {
      rideId: ride.rideId,
      driverId: 'TU_DRIVER_ID',
      bidType: 'accept',
      price: ride.passengerPrice
    });
  }, 2000);
});
```

### Opción B: Usar Herramientas Online

- **Socket.io Client Tool:** https://amritb.github.io/socketio-client-tool/
- Conectar con: `http://localhost:5000`
- Auth: `{"token": "TU_TOKEN"}`

---

## 7. Troubleshooting

### Problema: Token Expirado

**Solución:**
- Tokens JWT expiran después de 7 días (por defecto)
- Simplemente vuelve a hacer login

### Problema: No Puedo Cambiar Entre Sesiones

**Solución:**
- Asegúrate de usar diferentes:
  - Environments (Postman)
  - Navegadores/Perfiles
  - Scripts separados

### Problema: Socket.io No Conecta

**Solución:**
1. Verificar que el servidor está corriendo
2. Verificar que el token es válido
3. Verificar formato de auth:
   ```javascript
   {
     auth: {
       token: 'TU_TOKEN'
     }
   }
   ```

### Problema: CORS Error

**Solución:**
- Verificar que el frontend está en el origen permitido
- Verificar configuración CORS en `backend/server.js`

---

## 📝 Resumen de Métodos

| Método | Complejidad | Mejor Para |
|--------|-------------|------------|
| **Postman Environments** | ⭐⭐ | Desarrollo y testing manual |
| **Múltiples Navegadores** | ⭐ | Pruebas de UI/UX |
| **Scripts cURL** | ⭐⭐⭐ | Automatización y CI/CD |
| **Thunder Client** | ⭐⭐ | Desarrolladores que usan VS Code |

---

## 🎯 Flujo de Prueba Recomendado

1. **Crear usuarios de prueba** (`node scripts/create-test-users.js`)
2. **Postman - Environment Pasajero:**
   - Login
   - Crear solicitud de viaje
3. **Postman - Environment Conductor:**
   - Login
   - Ver solicitud
   - Enviar oferta
4. **Verificar notificaciones Socket.io** (opcional)

---

¿Necesitas ayuda con algún método específico? 🚀

