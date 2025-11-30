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

// Limpiar viajes activos antiguos (más de 2 días sin completar) cada 6 horas
cron.schedule('0 */6 * * *', async () => {
  try {
    const SolicitudViaje = (await import('../models/SolicitudViaje.js')).default;
    const Usuario = (await import('../models/Usuario.js')).default;
    const ahora = new Date();
    const dosDiasAtras = new Date(ahora.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 días en milisegundos
    
    // Buscar viajes activos que tengan más de 2 días
    const viajesAntiguos = await SolicitudViaje.find({
      estado: { $in: ['asignado', 'conductor_en_ruta', 'conductor_llego_punto_recogida', 'en_progreso'] },
      fecha_eliminacion: null, // Solo viajes no eliminados
      $or: [
        { fecha_asignacion: { $lt: dosDiasAtras } }, // Asignados hace más de 2 días
        { createdAt: { $lt: dosDiasAtras } }, // O creados hace más de 2 días si no tienen fecha_asignacion
      ],
    });
    
    if (viajesAntiguos.length > 0) {
      // Marcar como cancelados y liberar conductores
      const idsViajes = viajesAntiguos.map(v => v._id);
      const idsConductores = viajesAntiguos
        .map(v => v.id_conductor_asignado)
        .filter(id => id !== null && id !== undefined);
      
      // Actualizar viajes: marcarlos como cancelados y agregar fecha de eliminación
      await SolicitudViaje.updateMany(
        { _id: { $in: idsViajes } },
        {
          estado: 'cancelado',
          fecha_eliminacion: ahora,
          eliminado_por: null, // Sistema
        }
      );
      
      // Liberar conductores (marcarlos como disponibles)
      if (idsConductores.length > 0) {
        await Usuario.updateMany(
          { _id: { $in: idsConductores } },
          { 'informacion_conductor.esta_disponible': true }
        );
      }
      
      // Notificar a los usuarios afectados
      if (io) {
        for (const viaje of viajesAntiguos) {
          // Notificar al pasajero
          io.to(`usuario:${viaje.id_pasajero}`).emit('viaje:auto_cancelado', {
            idViaje: viaje._id.toString(),
            mensaje: 'Tu viaje ha sido cancelado automáticamente por inactividad (más de 2 días)',
            timestamp: ahora,
          });
          
          // Notificar al conductor si existe
          if (viaje.id_conductor_asignado) {
            io.to(`usuario:${viaje.id_conductor_asignado}`).emit('viaje:auto_cancelado', {
              idViaje: viaje._id.toString(),
              mensaje: 'El viaje asignado ha sido cancelado automáticamente por inactividad (más de 2 días)',
              timestamp: ahora,
            });
          }
        }
      }
      
      console.log(`🧹 ${viajesAntiguos.length} viajes activos antiguos cancelados automáticamente`);
    }
  } catch (error) {
    console.error('❌ Error limpiando viajes activos antiguos:', error);
  }
});

// Limpiar historial de viajes completados después de 24 horas (cada día a las 2 AM)
cron.schedule('0 2 * * *', async () => {
  try {
    const SolicitudViaje = (await import('../models/SolicitudViaje.js')).default;
    const Oferta = (await import('../models/Oferta.js')).default;
    const ahora = new Date();
    const veinticuatroHorasAtras = new Date(ahora.getTime() - 24 * 60 * 60 * 1000); // 24 horas en milisegundos
    
    // Buscar viajes completados o cancelados que tengan más de 24 horas desde su última actualización
    // Usamos updatedAt para determinar cuándo se completó/canceló el viaje
    const viajesAntiguos = await SolicitudViaje.find({
      estado: { $in: ['completado', 'cancelado', 'completed', 'cancelled'] },
      fecha_eliminacion: null, // Solo viajes no eliminados manualmente
      updatedAt: { $lt: veinticuatroHorasAtras }, // Actualizados hace más de 24 horas
    });
    
    if (viajesAntiguos.length > 0) {
      const idsViajes = viajesAntiguos.map(v => v._id);
      
      // Marcar viajes como eliminados (soft delete)
      await SolicitudViaje.updateMany(
        { _id: { $in: idsViajes } },
        {
          fecha_eliminacion: ahora,
          eliminado_por: 'sistema', // Sistema automático
        }
      );
      
      // También eliminar ofertas relacionadas a estos viajes
      await Oferta.updateMany(
        {
          id_solicitud_viaje: { $in: idsViajes },
          fecha_eliminacion: null,
        },
        {
          fecha_eliminacion: ahora,
          eliminado_por: 'sistema',
        }
      );
      
      console.log(`🧹 ${viajesAntiguos.length} viajes eliminados del historial automáticamente (más de 24 horas)`);
    }
  } catch (error) {
    console.error('❌ Error limpiando historial automáticamente:', error);
  }
});

console.log('✅ Tareas programadas configuradas');
