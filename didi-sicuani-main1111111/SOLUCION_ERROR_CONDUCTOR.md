# 🔧 Solución: Error "Solo conductores pueden acceder a la cola"

## 🔍 Diagnóstico del Problema

El error `{success: false, message: "Solo conductores pueden acceder a la cola"}` ocurre cuando intentas acceder a `/api/drivers/queue` pero tu usuario no tiene el rol de conductor.

## ✅ Soluciones

### Opción 1: Verificar el Rol de tu Usuario

1. **Ejecuta el script de verificación:**
   ```powershell
   cd backend
   node scripts/check-user-role.js tu-email@example.com
   ```

2. **Revisa la salida:**
   - Si dice `Tipo de Usuario: driver` → El usuario está bien configurado
   - Si dice `Tipo de Usuario: passenger` → Necesitas cambiar el rol

### Opción 2: Actualizar el Rol del Usuario en MongoDB

**Opción A: Usando MongoDB Compass (GUI)**

1. Abre MongoDB Compass
2. Conéctate a tu base de datos
3. Ve a la colección `users`
4. Busca tu usuario por email
5. Edita el campo `userType` y cámbialo a `"driver"`
6. Guarda los cambios

**Opción B: Usando MongoDB Shell (mongosh)**

```javascript
// Conectar a MongoDB
mongosh "mongodb://localhost:27017/didi-sicuani"

// Actualizar el rol del usuario
db.users.updateOne(
  { email: "tu-email@example.com" },
  { $set: { userType: "driver" } }
)

// Verificar el cambio
db.users.findOne({ email: "tu-email@example.com" })
```

**Opción C: Usando el script de actualización**

Crea un archivo `backend/scripts/update-user-role.js`:

```javascript
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';

dotenv.config();

const updateUserRole = async (email, newRole) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const user = await User.findOneAndUpdate(
      { email },
      { userType: newRole },
      { new: true }
    );

    if (!user) {
      console.log('❌ Usuario no encontrado');
      process.exit(1);
    }

    console.log(`✅ Usuario actualizado: ${user.email} → ${user.userType}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

const email = process.argv[2];
const role = process.argv[3];

if (!email || !role) {
  console.log('Uso: node scripts/update-user-role.js <email> <role>');
  console.log('Ejemplo: node scripts/update-user-role.js conductor@example.com driver');
  process.exit(1);
}

updateUserRole(email, role);
```

Ejecuta:
```powershell
node scripts/update-user-role.js tu-email@example.com driver
```

### Opción 3: Crear un Nuevo Usuario Conductor

Si prefieres crear un nuevo usuario con rol de conductor:

**Usando el endpoint de registro:**

```bash
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "name": "Conductor Test",
  "email": "conductor@test.com",
  "password": "password123",
  "userType": "driver",
  "phone": "+51987654321"
}
```

**O usando el script:**

```javascript
// backend/scripts/create-driver.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const createDriver = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const driver = await User.create({
      name: 'Conductor Test',
      email: 'conductor@test.com',
      password: await bcrypt.hash('password123', 10),
      userType: 'driver',
      phone: '+51987654321',
      driverInfo: {
        vehicleType: 'taxi',
        isOnline: true,
        isAvailable: true,
      }
    });

    console.log('✅ Conductor creado:', driver.email);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createDriver();
```

## 🔄 Después de Actualizar el Rol

1. **Cierra sesión y vuelve a iniciar sesión** para obtener un nuevo token JWT con el rol actualizado

2. **O decodifica y verifica tu token actual:**
   - Ve a https://jwt.io
   - Pega tu token
   - Verifica que el campo `userType` sea `"driver"`

3. **Prueba el endpoint nuevamente:**
   ```bash
   GET http://localhost:5000/api/drivers/queue
   Authorization: Bearer TU_TOKEN_AQUI
   ```

## 🐛 Debugging Adicional

Si el problema persiste, verifica:

1. **El token JWT contiene el userType correcto:**
   ```javascript
   // En el navegador (consola)
   const token = localStorage.getItem('token');
   const payload = JSON.parse(atob(token.split('.')[1]));
   console.log('UserType en token:', payload.userType);
   ```

2. **El usuario existe en la base de datos:**
   ```powershell
   node scripts/check-user-role.js tu-email@example.com
   ```

3. **El middleware está funcionando:**
   - Revisa los logs del servidor
   - Deberías ver si el middleware `authorize` está rechazando la solicitud

## 📝 Notas Importantes

- **El token JWT se genera al hacer login** y contiene el `userType` del usuario en ese momento
- **Si cambias el `userType` en la BD**, necesitas **cerrar sesión y volver a iniciar sesión** para obtener un nuevo token
- **El middleware `authorize('driver')`** verifica el `userType` del token, no de la base de datos
- **El controlador también verifica** el `userType` en la BD como medida de seguridad adicional

## ✅ Verificación Final

Después de aplicar la solución, deberías poder:

1. ✅ Hacer login con un usuario conductor
2. ✅ Acceder a `/api/drivers/queue` sin errores
3. ✅ Ver la lista de solicitudes de viaje disponibles

---

**¿Necesitas más ayuda?** Revisa los logs del servidor o ejecuta el script de diagnóstico.

