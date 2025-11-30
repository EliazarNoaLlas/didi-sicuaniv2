# Guía de Setup - React Native Mobile App

## 📱 Configuración de React Native

### Requisitos Previos

- Node.js 18+
- React Native CLI
- Android Studio (para Android)
- Xcode (para iOS - solo macOS)
- Java JDK 11+

### Instalación

```bash
cd mobile
npm install
```

### Configuración de Mapbox

1. Obtener token de Mapbox:
   - Crear cuenta en https://account.mapbox.com/
   - Obtener token de acceso público
   - Gratis hasta 50,000 usuarios activos/mes

2. Configurar token:
   ```javascript
   // mobile/src/config/MapConfig.js
   Mapbox.setAccessToken('TU_MAPBOX_TOKEN');
   ```

### Configuración Android

1. Agregar permisos en `android/app/src/main/AndroidManifest.xml`:
   ```xml
   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
   <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
   ```

2. Configurar Mapbox en `android/app/src/main/AndroidManifest.xml`:
   ```xml
   <meta-data
       android:name="MAPBOX_DOWNLOADS_TOKEN"
       android:value="TU_MAPBOX_TOKEN" />
   ```

### Configuración iOS

1. Instalar pods:
   ```bash
   cd ios
   pod install
   cd ..
   ```

2. Configurar token en `ios/YourApp/Info.plist`:
   ```xml
   <key>MBXAccessToken</key>
   <string>TU_MAPBOX_TOKEN</string>
   ```

### Ejecutar App

**Android:**
```bash
npm run android
```

**iOS:**
```bash
npm run ios
```

## 🗺️ Mapas Offline

### Descargar Tiles Offline

```javascript
import Mapbox from '@rnmapbox/maps';
import { OFFLINE_PACK_CONFIG } from '../config/MapConfig';

// Descargar pack offline
const offlinePack = await Mapbox.offlineManager.createPack(
  OFFLINE_PACK_CONFIG,
  (progress) => {
    console.log(`Progress: ${progress.percentage}%`);
  },
  (error) => {
    console.error('Error:', error);
  },
  () => {
    console.log('Download complete!');
  }
);
```

## 📡 Integración con Backend

La app móvil se conecta al mismo backend que la web:
- API: `http://localhost:5000/api` (desarrollo)
- Socket.io: `http://localhost:5000` (desarrollo)

## 🔔 Notificaciones Push

### Firebase Cloud Messaging

1. Configurar Firebase:
   ```bash
   npm install @react-native-firebase/app @react-native-firebase/messaging
   ```

2. Configurar Android:
   - Agregar `google-services.json` a `android/app/`

3. Configurar iOS:
   - Agregar `GoogleService-Info.plist` a `ios/`

## 📝 Notas

- Los mapas offline requieren descarga inicial (~150MB para Sicuani)
- Mapbox ofrece 50K usuarios/mes gratis
- Para producción, considerar tiles propios para mayor control

