import RideRequest from '../models/SolicitudViaje.js';
import Bid from '../models/Oferta.js';
import servicioAuditoria from '../services/servicio-auditoria.js';

/**
 * Borrar todos los historiales del sistema (solo admin)
 */
export const borrarTodoElHistorial = async (req, res) => {
  try {
    // Validar que sea administrador
    const tipoUsuario = req.user.tipoUsuario || req.user.userType;
    if (tipoUsuario !== 'administrador' && tipoUsuario !== 'admin') {
      return res.status(403).json({
        exito: false,
        error: 'Solo administradores pueden borrar todos los historiales',
      });
    }

    const { confirm: confirmar, deleteBids: borrarOfertas } = req.body;

    if (!confirmar || confirmar !== 'DELETE_ALL_HISTORY') {
      return res.status(400).json({
        exito: false,
        error: 'Debe confirmar la acción con confirm: "DELETE_ALL_HISTORY"',
      });
    }

    // Borrar todos los viajes (soft delete)
    const resultadoViajes = await RideRequest.updateMany(
      { deletedAt: null },
      {
        deletedAt: new Date(),
        deletedBy: req.user.id,
      }
    );

    let resultadoOfertas = { modifiedCount: 0 };
    if (borrarOfertas) {
      // Borrar todas las ofertas
      resultadoOfertas = await Bid.updateMany(
        { deletedAt: null },
        {
          deletedAt: new Date(),
        }
      );
    }

    // Registrar en auditoría
    await servicioAuditoria.registrar(
      'delete_all_history',
      req.user.id,
      'system',
      null,
      {
        ridesDeleted: resultadoViajes.modifiedCount,
        bidsDeleted: resultadoOfertas.modifiedCount,
      },
      req
    );

    res.json({
      exito: true,
      mensaje: `Historial completo borrado: ${resultadoViajes.modifiedCount} viajes y ${resultadoOfertas.modifiedCount} ofertas`,
      viajesBorrados: resultadoViajes.modifiedCount,
      ofertasBorradas: resultadoOfertas.modifiedCount,
    });
  } catch (error) {
    console.error('❌ Error borrando todos los historiales:', error);
    res.status(500).json({
      exito: false,
      error: 'Error al borrar historiales',
    });
  }
};

/**
 * Borrar historial de un usuario específico (admin)
 */
export const borrarHistorialUsuario = async (req, res) => {
  try {
    // Validar que sea administrador
    const tipoUsuario = req.user.tipoUsuario || req.user.userType;
    if (tipoUsuario !== 'administrador' && tipoUsuario !== 'admin') {
      return res.status(403).json({
        exito: false,
        error: 'Solo administradores pueden borrar historiales de usuarios',
      });
    }

    const { userId: idUsuario } = req.params;
    const { deleteBids: borrarOfertas } = req.body;

    // Borrar viajes del usuario como pasajero
    const resultadoViajesPasajero = await RideRequest.updateMany(
      {
        passenger_id: idUsuario,
        deletedAt: null,
      },
      {
        deletedAt: new Date(),
        deletedBy: req.user.id,
      }
    );

    // Borrar viajes del usuario como conductor
    const resultadoViajesConductor = await RideRequest.updateMany(
      {
        matched_driver_id: idUsuario,
        deletedAt: null,
      },
      {
        deletedAt: new Date(),
        deletedBy: req.user.id,
      }
    );

    let resultadoOfertas = { modifiedCount: 0 };
    if (borrarOfertas) {
      // Borrar ofertas del conductor
      resultadoOfertas = await Bid.updateMany(
        {
          driver_id: idUsuario,
          deletedAt: null,
        },
        {
          deletedAt: new Date(),
        }
      );
    }

    // Registrar en auditoría
    await servicioAuditoria.registrar(
      'delete_user_history',
      req.user.id,
      'user',
      idUsuario,
      {
        passengerRidesDeleted: resultadoViajesPasajero.modifiedCount,
        driverRidesDeleted: resultadoViajesConductor.modifiedCount,
        bidsDeleted: resultadoOfertas.modifiedCount,
      },
      req
    );

    res.json({
      exito: true,
      mensaje: `Historial del usuario borrado: ${resultadoViajesPasajero.modifiedCount + resultadoViajesConductor.modifiedCount} viajes y ${resultadoOfertas.modifiedCount} ofertas`,
      viajesPasajeroBorrados: resultadoViajesPasajero.modifiedCount,
      viajesConductorBorrados: resultadoViajesConductor.modifiedCount,
      ofertasBorradas: resultadoOfertas.modifiedCount,
    });
  } catch (error) {
    console.error('❌ Error borrando historial de usuario:', error);
    res.status(500).json({
      exito: false,
      error: 'Error al borrar historial del usuario',
    });
  }
};

/**
 * Restaurar historial eliminado (admin)
 */
export const restaurarHistorial = async (req, res) => {
  try {
    // Validar que sea administrador
    const tipoUsuario = req.user.tipoUsuario || req.user.userType;
    if (tipoUsuario !== 'administrador' && tipoUsuario !== 'admin') {
      return res.status(403).json({
        exito: false,
        error: 'Solo administradores pueden restaurar historiales',
      });
    }

    const { rideIds: idsViajes, restoreAll: restaurarTodo, userId: idUsuario } = req.body;

    let cantidadRestaurada = 0;

    if (restaurarTodo && idUsuario) {
      // Restaurar todo el historial de un usuario
      const resultado = await RideRequest.updateMany(
        {
          $or: [
            { passenger_id: idUsuario },
            { matched_driver_id: idUsuario },
          ],
          deletedAt: { $ne: null },
        },
        {
          $unset: { deletedAt: '', deletedBy: '' },
        }
      );
      cantidadRestaurada = resultado.modifiedCount;
    } else if (idsViajes && Array.isArray(idsViajes) && idsViajes.length > 0) {
      // Restaurar viajes específicos
      const resultado = await RideRequest.updateMany(
        {
          _id: { $in: idsViajes },
          deletedAt: { $ne: null },
        },
        {
          $unset: { deletedAt: '', deletedBy: '' },
        }
      );
      cantidadRestaurada = resultado.modifiedCount;
    } else {
      return res.status(400).json({
        exito: false,
        error: 'Debe especificar rideIds o restoreAll: true con userId',
      });
    }

    // Registrar en auditoría
    await servicioAuditoria.registrar(
      'restore_history',
      req.user.id,
      'system',
      null,
      { restoredCount: cantidadRestaurada },
      req
    );

    res.json({
      exito: true,
      mensaje: `${cantidadRestaurada} viaje(s) restaurado(s)`,
      cantidadRestaurada,
    });
  } catch (error) {
    console.error('❌ Error restaurando historial:', error);
    res.status(500).json({
      exito: false,
      error: 'Error al restaurar historial',
    });
  }
};

// Exportar también con los nombres anteriores para compatibilidad
export { borrarTodoElHistorial as deleteAllHistory };
export { borrarHistorialUsuario as deleteUserHistory };
export { restaurarHistorial as restoreHistory };
