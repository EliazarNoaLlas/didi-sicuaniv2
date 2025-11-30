import { useState, useEffect } from 'react';
import { getSocket } from '../services/socket';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function ActiveRide() {
  const [activeRide, setActiveRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEtaModal, setShowEtaModal] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadActiveRide();

    const socket = getSocket();
    if (socket) {
      // Escuchar cuando se acepta una oferta
      const handleRideAccepted = (data) => {
        toast.success('🎉 ¡Tu oferta fue aceptada!', {
          duration: 5000,
        });
        loadActiveRide();
      };

      // Escuchar eventos en español (y mantener compatibilidad con inglés)
      socket.on('viaje:aceptado_por_pasajero', handleRideAccepted);
      socket.on('ride:accepted_by_passenger', handleRideAccepted); // Compatibilidad

      return () => {
        socket.off('viaje:aceptado_por_pasajero', handleRideAccepted);
        socket.off('ride:accepted_by_passenger', handleRideAccepted);
      };
    }
  }, []);

  const loadActiveRide = async () => {
    try {
      const respuesta = await api.get('/conductores/viaje-activo');
      // El backend retorna: { exito: true, datos: {...} }
      const datos = respuesta.data.datos || respuesta.data.data || null;
      setActiveRide(datos);
    } catch (error) {
      console.error('Error al cargar viaje activo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEnRoute = () => {
    // Mostrar modal para ingresar tiempo estimado
    setShowEtaModal(true);
  };

  const handleConfirmEnRoute = async () => {
    if (!estimatedTime || parseFloat(estimatedTime) <= 0) {
      toast.error('Por favor ingresa un tiempo estimado válido');
      return;
    }

    try {
      await api.post(`/conductores/rides/${activeRide._id}/en-route`, {
        tiempo_estimado_minutos: parseFloat(estimatedTime),
      });
      toast.success('✅ Estado actualizado: En camino al punto de recogida');
      setShowEtaModal(false);
      setEstimatedTime('');
      loadActiveRide();
    } catch (error) {
      const mensajeError = error.response?.data?.error || error.response?.data?.mensaje || 'Error al actualizar estado';
      toast.error(mensajeError);
    }
  };

  const handleDriverArrived = async () => {
    try {
      await api.post(`/conductores/rides/${activeRide._id}/arrived`);
      toast.success('✅ Estado actualizado: Llegaste al punto de recogida');
      loadActiveRide();
    } catch (error) {
      const mensajeError = error.response?.data?.error || error.response?.data?.mensaje || 'Error al actualizar estado';
      toast.error(mensajeError);
    }
  };

  const handleStartTrip = async () => {
    try {
      await api.post(`/conductores/rides/${activeRide._id}/start`);
      toast.success('✅ Viaje iniciado. En camino al destino');
      loadActiveRide();
    } catch (error) {
      const mensajeError = error.response?.data?.error || error.response?.data?.mensaje || 'Error al iniciar viaje';
      toast.error(mensajeError);
    }
  };

  const handleCompleteTrip = async () => {
    if (!window.confirm('¿Confirmas que has completado el viaje?')) {
      return;
    }

    try {
      const respuesta = await api.post(`/conductores/rides/${activeRide._id}/complete`);
      toast.success('🎉 Viaje completado exitosamente');
      
      // Verificar que el estado se haya actualizado correctamente
      if (respuesta.data?.datos?.estado === 'completado' || respuesta.data?.datos?.viaje?.estado === 'completado') {
        console.log('✅ Estado del viaje actualizado a completado correctamente');
      } else {
        console.warn('⚠️ El viaje se completó pero el estado puede no haberse actualizado correctamente');
      }
      
      setActiveRide(null);
      navigate('/conductor');
    } catch (error) {
      const mensajeError = error.response?.data?.error || error.response?.data?.mensaje || 'Error al completar viaje';
      toast.error(mensajeError);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!activeRide) {
    return (
      <div className="p-6">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <h2 className="text-2xl font-bold mb-4">No hay viaje activo</h2>
          <p className="text-gray-600 mb-4">
            No tienes ningún viaje en progreso en este momento.
          </p>
          <button
            onClick={() => navigate('/cola-viajes')}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            Ver Solicitudes Disponibles
          </button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    // Mapear estados en español e inglés
    const statusMap = {
      'asignado': 'asignado',
      'matched': 'asignado',
      'conductor_en_ruta': 'conductor_en_ruta',
      'driver_en_route': 'conductor_en_ruta',
      'conductor_llego_punto_recogida': 'conductor_llego_punto_recogida',
      'en_progreso': 'en_progreso',
      'in_progress': 'en_progreso',
    };
    
    const estadoNormalizado = statusMap[status] || status;
    
    const badges = {
      asignado: { text: 'Asignado', color: 'bg-blue-100 text-blue-800' },
      conductor_en_ruta: { text: 'En camino al pasajero', color: 'bg-yellow-100 text-yellow-800' },
      conductor_llego_punto_recogida: { text: 'Llegaste al punto de recogida', color: 'bg-orange-100 text-orange-800' },
      en_progreso: { text: 'En viaje', color: 'bg-green-100 text-green-800' },
    };
    const badge = badges[estadoNormalizado] || { text: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Viaje Activo</h1>
            {getStatusBadge(activeRide.status)}
          </div>
          <button
            onClick={loadActiveRide}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            🔄 Actualizar
          </button>
        </div>

        {/* Información del Pasajero */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 className="font-semibold text-lg mb-2">👤 Pasajero</h3>
          <p className="text-gray-700">
            <strong>Nombre:</strong> {activeRide.id_pasajero?.nombre || activeRide.passenger_id?.name || 'N/A'}
          </p>
          <p className="text-gray-700">
            <strong>Teléfono:</strong> {activeRide.id_pasajero?.telefono || activeRide.passenger_id?.phone || 'N/A'}
          </p>
          <p className="text-gray-700">
            <strong>Email:</strong> {activeRide.id_pasajero?.correo || activeRide.passenger_id?.email || 'N/A'}
          </p>
        </div>

        {/* Ruta */}
        <div className="mb-4">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-1 bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">📍 Origen</p>
              <p className="font-semibold">{activeRide.origen_direccion || activeRide.origin_address || 'N/A'}</p>
            </div>
            <div className="text-2xl text-gray-400">→</div>
            <div className="flex-1 bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">🎯 Destino</p>
              <p className="font-semibold">{activeRide.destino_direccion || activeRide.destination_address || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Información del Viaje */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">💰 Precio Acordado</p>
            <p className="text-2xl font-bold text-green-600">
              S/ {activeRide.precio_final_acordado || activeRide.final_agreed_price || 'N/A'}
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">📏 Distancia</p>
            <p className="text-xl font-semibold">
              {activeRide.distancia_estimada_km || activeRide.estimated_distance_km || 'N/A'} km
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">⏱️ Duración Estimada</p>
            <p className="text-xl font-semibold">
              {activeRide.duracion_estimada_min || activeRide.estimated_duration_min || 'N/A'} min
            </p>
          </div>
        </div>

        {/* ETA */}
        {(activeRide.tiempoEstimadoLlegada || activeRide.etaToPickup) && (activeRide.estado === 'conductor_en_ruta' || activeRide.status === 'driver_en_route') && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
            <p className="text-yellow-800">
              ⏰ <strong>Tiempo estimado al punto de recogida:</strong>{' '}
              {activeRide.tiempoEstimadoLlegada || activeRide.etaToPickup} minutos
            </p>
          </div>
        )}

        {(activeRide.tiempoEstimadoDestino || activeRide.etaToDestination) && (activeRide.estado === 'en_progreso' || activeRide.status === 'in_progress') && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-4">
            <p className="text-green-800">
              ⏰ <strong>Tiempo estimado al destino:</strong>{' '}
              {activeRide.tiempoEstimadoDestino || activeRide.etaToDestination} minutos
            </p>
          </div>
        )}

        {/* Notificación cuando el conductor llegó */}
        {(activeRide.estado === 'conductor_llego_punto_recogida') && (
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg mb-4">
            <p className="text-orange-800">
              📍 <strong>Llegaste al punto de recogida:</strong> Espera a que el pasajero aborde el vehículo.
            </p>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="flex gap-3">
          {(activeRide.estado === 'asignado' || activeRide.status === 'matched') && (
            <button
              onClick={handleStartEnRoute}
              className="flex-1 bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 font-medium text-lg"
            >
              🚗 Estoy yendo al punto de recogida
            </button>
          )}

          {(activeRide.estado === 'conductor_en_ruta' || activeRide.status === 'driver_en_route') && (
            <button
              onClick={handleDriverArrived}
              className="flex-1 bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-medium text-lg"
            >
              ✅ Ya llegué al punto de recogida
            </button>
          )}

          {(activeRide.estado === 'conductor_llego_punto_recogida') && (
            <button
              onClick={handleStartTrip}
              className="flex-1 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 font-medium text-lg"
            >
              ✅ Recogí al pasajero - Iniciar viaje
            </button>
          )}

          {/* Modal para tiempo estimado */}
          {showEtaModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                <h2 className="text-2xl font-bold mb-4">Tiempo Estimado de Llegada</h2>
                <p className="text-gray-600 mb-4">
                  ¿Cuántos minutos estimas que tardarás en llegar al punto de recogida?
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tiempo estimado (minutos)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={estimatedTime}
                    onChange={(e) => setEstimatedTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Ej: 5"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmEnRoute}
                    className="flex-1 bg-yellow-500 text-white py-2 px-4 rounded-lg hover:bg-yellow-600 font-medium"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => {
                      setShowEtaModal(false);
                      setEstimatedTime('');
                    }}
                    className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}


          {(activeRide.estado === 'en_progreso' || activeRide.status === 'in_progress') && (
            <button
              onClick={handleCompleteTrip}
              className="flex-1 bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 font-medium text-lg"
            >
              🎉 Completar Viaje
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

