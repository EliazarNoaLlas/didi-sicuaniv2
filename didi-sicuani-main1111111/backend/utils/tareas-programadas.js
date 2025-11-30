import cron from 'node-cron';
import servicioMetricas from '../services/servicio-metricas.js';
import { io } from '../server.js';

/**
 * Tareas Programadas
 * Configuración de tareas automáticas que se ejecutan periódicamente
 */

// Actualizar métricas cada 5 minutos
cron.schedule('*/5 * * * *', async () => {
  try {
    const metricas = await servicioMetricas.obtenerMetricasDashboard();
    
    // Emitir actualización vía Socket.io a todos los administradores
    if (io) {
      io.to('administradores').emit('metrics:update', metricas);
    }
    
    console.log('📊 Métricas actualizadas:', new Date().toISOString());
  } catch (error) {
    console.error('Error actualizando métricas:', error);
  }
});

// Limpiar ofertas expiradas cada hora
cron.schedule('0 * * * *', async () => {
  try {
    const Oferta = (await import('../models/Oferta.js')).default;
    const ahora = new Date();
    
    await Oferta.updateMany(
      {
        estado: 'pendiente',
        fecha_expiracion: { $lt: ahora },
      },
      {
        estado: 'expirada',
      }
    );
    
    console.log('🧹 Ofertas expiradas limpiadas:', new Date().toISOString());
  } catch (error) {
    console.error('Error limpiando ofertas expiradas:', error);
  }
});

// Limpiar solicitudes de viaje expiradas cada 30 minutos
cron.schedule('*/30 * * * *', async () => {
  try {
    const SolicitudViaje = (await import('../models/SolicitudViaje.js')).default;
    const servicioSubasta = (await import('../services/servicio-subasta.js')).default;
    const ahora = new Date();
    
    const viajesExpirados = await SolicitudViaje.find({
      estado: 'subasta_activa',
      fecha_expiracion: { $lt: ahora },
    });
    
    for (const viaje of viajesExpirados) {
      await servicioSubasta.manejarTiempoExpiradoSubasta(viaje._id.toString());
    }
    
    if (viajesExpirados.length > 0) {
      console.log(`⏰ ${viajesExpirados.length} viajes expirados procesados`);
    }
  } catch (error) {
    console.error('Error procesando viajes expirados:', error);
  }
});

console.log('✅ Tareas programadas configuradas');
