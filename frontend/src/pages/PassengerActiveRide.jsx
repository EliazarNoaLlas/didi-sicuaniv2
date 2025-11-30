import { useState, useEffect } from 'react';
import { getSocket } from '../services/socket';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function PassengerActiveRide() {
  const [activeRide, setActiveRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadActiveRide();

    const socket = getSocket();
    if (socket) {
      // Escuchar actualizaciones del estado del viaje
      const handleRideUpdate = (data) => {
        toast.success('Estado del viaje actualizado', {
          duration: 3000,
        });
        loadActiveRide();
      };

      // Escuchar cuando el conductor está en camino
      const handleDriverEnRoute = (data) => {
        const tiempoEstimado = data.tiempoEstimadoLlegada || data.eta_minutes || 'pocos';
        toast.success(`🚗 El conductor está en camino. Tiempo estimado: ${tiempoEstimado} minutos`, {
          duration: 6000,
        });
        loadActiveRide();
      };

      // Escuchar cuando el conductor llega al punto de recogida
      const handleDriverArrivedAtPickup = (data) => {
        toast.success('✅ El conductor ha llegado al punto de recogida. Prepárate para abordar.', {
          duration: 6000,
        });
        loadActiveRide();
      };

      // Escuchar cuando el viaje inicia
      const handleTripStarted = (data) => {
        toast.success('✅ Viaje iniciado. En camino al destino', {
          duration: 5000,
        });
        loadActiveRide();
      };

      // Escuchar cuando el viaje se completa
      const handleTripCompleted = (data) => {
        toast.success('🎉 Viaje completado. Por favor califica el servicio', {
          duration: 6000,
        });
        // Recargar el viaje para asegurar que el estado esté actualizado
        loadActiveRide();
        // Mostrar modal de calificación después de un breve delay
        setTimeout(() => {
          setShowRatingModal(true);
        }, 1000);
      };

      socket.on('viaje:actualizado', handleRideUpdate);
      socket.on('viaje:conductor_en_ruta', handleDriverEnRoute);
      socket.on('viaje:conductor_llego_punto_recogida', handleDriverArrivedAtPickup);
      socket.on('viaje:conductor_llego', handleDriverArrivedAtPickup); // Compatibilidad
      socket.on('viaje:iniciado', handleTripStarted);
      socket.on('viaje:completado', handleTripCompleted);
      socket.on('ride:updated', handleRideUpdate);
      socket.on('ride:driver_en_route', handleDriverEnRoute);
      socket.on('ride:driver_arrived_at_pickup', handleDriverArrivedAtPickup);
      socket.on('ride:driver_arrived', handleDriverArrivedAtPickup); // Compatibilidad
      socket.on('ride:started', handleTripStarted);
      socket.on('ride:completed', handleTripCompleted);

      return () => {
        socket.off('viaje:actualizado', handleRideUpdate);
        socket.off('viaje:conductor_en_ruta', handleDriverEnRoute);
        socket.off('viaje:conductor_llego_punto_recogida', handleDriverArrivedAtPickup);
        socket.off('viaje:conductor_llego', handleDriverArrivedAtPickup);
        socket.off('viaje:iniciado', handleTripStarted);
        socket.off('viaje:completado', handleTripCompleted);
        socket.off('ride:updated', handleRideUpdate);
        socket.off('ride:driver_en_route', handleDriverEnRoute);
        socket.off('ride:driver_arrived_at_pickup', handleDriverArrivedAtPickup);
        socket.off('ride:driver_arrived', handleDriverArrivedAtPickup);
        socket.off('ride:started', handleTripStarted);
        socket.off('ride:completed', handleTripCompleted);
      };
    }
  }, [navigate]);

  const loadActiveRide = async () => {
    try {
      const respuesta = await api.get('/viajes/activo');
      // El backend retorna: { exito: true, datos: {...} }
      const datos = respuesta.data.datos || respuesta.data.data || null;
      setActiveRide(datos);
      
      // Si el viaje está completado y no se ha calificado, mostrar modal
      if (datos && (datos.estado === 'completado' || datos.status === 'completed') && !showRatingModal) {
        // Verificar si ya fue calificado
        // Por ahora, asumimos que si está completado, se puede calificar
        setTimeout(() => {
          setShowRatingModal(true);
        }, 1000);
      }
    } catch (error) {
      // Si no hay viaje activo, no es un error crítico
      if (error.response?.status !== 404) {
        console.error('Error al cargar viaje activo:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      toast.error('Por favor selecciona una calificación');
      return;
    }

    if (!activeRide) {
      toast.error('Error: No hay información del viaje');
      return;
    }

    try {
      const rideId = activeRide._id || activeRide.id;
      
      // Intentar enviar la calificación directamente
      // El backend se encargará de validar y actualizar el estado si es necesario
      await api.post(`/viajes/${rideId}/rate`, {
        calificacion: rating,
        comentario: comment,
      });
      
      toast.success('✅ Calificación enviada. ¡Gracias!');
      setShowRatingModal(false);
      setRating(0);
      setComment('');
      setTimeout(() => {
        navigate('/pasajero');
      }, 1500);
    } catch (error) {
      const mensajeError = error.response?.data?.error || error.response?.data?.mensaje || 'Error al enviar calificación';
      const estadoActual = error.response?.data?.estadoActual;
      const tiempoDesdeAsignacion = error.response?.data?.tiempoDesdeAsignacion;
      
      if (estadoActual) {
        let mensajeCompleto = mensajeError;
        if (tiempoDesdeAsignacion) {
          mensajeCompleto += ` (Tiempo desde asignación: ${parseFloat(tiempoDesdeAsignacion).toFixed(1)} horas)`;
        }
        toast.error(mensajeCompleto);
        
        // Si el error es porque el viaje es muy reciente, recargar después de un delay
        if (tiempoDesdeAsignacion && parseFloat(tiempoDesdeAsignacion) < 1) {
          setTimeout(() => {
            loadActiveRide();
          }, 3000);
        }
      } else {
        toast.error(mensajeError);
      }
    }
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      'asignado': { text: 'Conductor Asignado', color: 'bg-blue-100 text-blue-800', icon: '👤', description: 'Tu conductor ha sido asignado y está preparándose' },
      'matched': { text: 'Conductor Asignado', color: 'bg-blue-100 text-blue-800', icon: '👤', description: 'Tu conductor ha sido asignado y está preparándose' },
      'conductor_en_ruta': { text: 'Conductor en Camino', color: 'bg-yellow-100 text-yellow-800', icon: '🚗', description: 'El conductor está yendo al punto de recogida' },
      'driver_en_route': { text: 'Conductor en Camino', color: 'bg-yellow-100 text-yellow-800', icon: '🚗', description: 'El conductor está yendo al punto de recogida' },
      'conductor_llego_punto_recogida': { text: 'Conductor Llegó', color: 'bg-orange-100 text-orange-800', icon: '📍', description: 'El conductor ha llegado al punto de recogida. Prepárate para abordar' },
      'en_progreso': { text: 'En Viaje', color: 'bg-green-100 text-green-800', icon: '🚕', description: 'Estás en camino al destino' },
      'in_progress': { text: 'En Viaje', color: 'bg-green-100 text-green-800', icon: '🚕', description: 'Estás en camino al destino' },
      'completado': { text: 'Completado', color: 'bg-gray-100 text-gray-800', icon: '✅', description: 'Viaje completado exitosamente' },
      'completed': { text: 'Completado', color: 'bg-gray-100 text-gray-800', icon: '✅', description: 'Viaje completado exitosamente' },
    };
    
    const estadoNormalizado = statusMap[status] || { 
      text: status || 'Desconocido', 
      color: 'bg-gray-100 text-gray-800', 
      icon: '❓',
      description: 'Estado del viaje'
    };
    
    return estadoNormalizado;
  };

  const getProgressSteps = (status) => {
    const estado = status || 'asignado';
    const steps = [
      { key: 'asignado', label: 'Conductor Asignado', completed: ['asignado', 'matched', 'conductor_en_ruta', 'driver_en_route', 'conductor_llego_punto_recogida', 'en_progreso', 'in_progress', 'completado', 'completed'].includes(estado) },
      { key: 'en_ruta', label: 'Conductor en Camino', completed: ['conductor_en_ruta', 'driver_en_route', 'conductor_llego_punto_recogida', 'en_progreso', 'in_progress', 'completado', 'completed'].includes(estado) },
      { key: 'llegado', label: 'Conductor Llegó', completed: ['conductor_llego_punto_recogida', 'en_progreso', 'in_progress', 'completado', 'completed'].includes(estado) },
      { key: 'recogido', label: 'Recogido', completed: ['en_progreso', 'in_progress', 'completado', 'completed'].includes(estado) },
      { key: 'en_viaje', label: 'En Viaje', completed: ['en_progreso', 'in_progress', 'completado', 'completed'].includes(estado) },
      { key: 'completado', label: 'Completado', completed: ['completado', 'completed'].includes(estado) },
    ];
    return steps;
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
            onClick={() => navigate('/solicitar-viaje')}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            Solicitar un Viaje
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(activeRide.estado || activeRide.status);
  const progressSteps = getProgressSteps(activeRide.estado || activeRide.status);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Detalles del Viaje</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                {statusInfo.icon} {statusInfo.text}
              </span>
            </div>
            <p className="text-gray-600 mt-2">{statusInfo.description}</p>
          </div>
          <button
            onClick={loadActiveRide}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            🔄 Actualizar
          </button>
        </div>

        {/* Barra de progreso */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {progressSteps.map((step, index) => (
              <div key={step.key} className="flex-1 flex items-center">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      step.completed
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step.completed ? '✓' : index + 1}
                  </div>
                  <p
                    className={`text-xs mt-2 text-center ${
                      step.completed ? 'text-green-600 font-semibold' : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
                {index < progressSteps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 ${
                      step.completed ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Información del Conductor */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-lg mb-4 border border-blue-200">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <span className="text-2xl">👤</span> Información del Conductor
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Nombre</p>
              <p className="font-semibold text-gray-800">
                {activeRide.id_conductor_asignado?.nombre || 
                 activeRide.matched_driver_id?.name || 
                 activeRide.conductor?.nombre || 
                 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Teléfono</p>
              <p className="font-semibold text-gray-800">
                {activeRide.id_conductor_asignado?.telefono || 
                 activeRide.matched_driver_id?.phone || 
                 activeRide.conductor?.telefono || 
                 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Calificación</p>
              <p className="font-semibold text-gray-800 flex items-center gap-1">
                <span className="text-yellow-500">⭐</span>
                {activeRide.id_conductor_asignado?.calificacion || 
                 activeRide.matched_driver_id?.rating || 
                 activeRide.conductor?.calificacion || 
                 '5.0'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Vehículo</p>
              <p className="font-semibold text-gray-800">
                {activeRide.id_conductor_asignado?.tipo_vehiculo || 
                 activeRide.matched_driver_id?.vehicle_type || 
                 activeRide.conductor?.tipo_vehiculo || 
                 'Taxi'}
              </p>
            </div>
          </div>
        </div>

        {/* Ruta */}
        <div className="mb-4">
          <h3 className="font-semibold text-lg mb-3">📍 Ruta del Viaje</h3>
          <div className="flex items-start gap-4">
            <div className="flex-1 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
              <p className="text-sm text-gray-500 mb-1">Origen</p>
              <p className="font-semibold text-gray-800">
                {activeRide.origen_direccion || activeRide.origin_address || 'N/A'}
              </p>
            </div>
            <div className="text-3xl text-gray-400 flex items-center">→</div>
            <div className="flex-1 bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
              <p className="text-sm text-gray-500 mb-1">Destino</p>
              <p className="font-semibold text-gray-800">
                {activeRide.destino_direccion || activeRide.destination_address || 'N/A'}
              </p>
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

        {/* ETA según el estado */}
        {(activeRide.estado === 'conductor_en_ruta' || activeRide.status === 'driver_en_route') && 
         (activeRide.tiempoEstimadoLlegada || activeRide.etaToPickup) && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
            <p className="text-yellow-800 flex items-center gap-2">
              <span className="text-xl">⏰</span>
              <span>
                <strong>Tiempo estimado de llegada del conductor:</strong>{' '}
                {activeRide.tiempoEstimadoLlegada || activeRide.etaToPickup} minutos
              </span>
            </p>
          </div>
        )}

        {/* Notificación cuando el conductor llegó */}
        {(activeRide.estado === 'conductor_llego_punto_recogida') && (
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg mb-4">
            <p className="text-orange-800 flex items-center gap-2">
              <span className="text-xl">📍</span>
              <span>
                <strong>¡El conductor ha llegado!</strong> Prepárate para abordar el vehículo.
              </span>
            </p>
          </div>
        )}

        {(activeRide.estado === 'en_progreso' || activeRide.status === 'in_progress') && 
         (activeRide.tiempoEstimadoDestino || activeRide.etaToDestination) && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-4">
            <p className="text-green-800 flex items-center gap-2">
              <span className="text-xl">⏰</span>
              <span>
                <strong>Tiempo estimado al destino:</strong>{' '}
                {activeRide.tiempoEstimadoDestino || activeRide.etaToDestination} minutos
              </span>
            </p>
          </div>
        )}

        {/* Mensaje informativo según el estado */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          {activeRide.estado === 'asignado' || activeRide.status === 'matched' ? (
            <p className="text-blue-800">
              <strong>📱 Próximo paso:</strong> El conductor se preparará y comenzará a dirigirse al punto de recogida. 
              Recibirás una notificación cuando esté en camino.
            </p>
          ) : activeRide.estado === 'conductor_en_ruta' || activeRide.status === 'driver_en_route' ? (
            <p className="text-blue-800">
              <strong>🚗 El conductor está en camino:</strong> Prepárate en el punto de recogida. 
              El conductor llegará en aproximadamente {activeRide.tiempoEstimadoLlegada || activeRide.etaToPickup || 'pocos'} minutos.
            </p>
          ) : activeRide.estado === 'conductor_llego_punto_recogida' ? (
            <p className="text-blue-800">
              <strong>📍 El conductor ha llegado:</strong> El conductor está esperando en el punto de recogida. 
              Por favor, dirígete al vehículo para iniciar el viaje.
            </p>
          ) : activeRide.estado === 'en_progreso' || activeRide.status === 'in_progress' ? (
            <p className="text-blue-800">
              <strong>🚕 Viaje en progreso:</strong> Estás en camino al destino. 
              Tiempo estimado: {activeRide.tiempoEstimadoDestino || activeRide.etaToDestination || 'pocos'} minutos.
            </p>
          ) : (
            <p className="text-blue-800">
              <strong>✅ Viaje completado:</strong> Gracias por usar DiDi-Sicuani. 
              ¡Esperamos verte pronto!
            </p>
          )}
        </div>
      </div>

      {/* Modal de Calificación */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4 text-center">Califica tu Viaje</h2>
            <p className="text-gray-600 mb-6 text-center">
              ¿Cómo calificarías el servicio del conductor?
            </p>
            
            {/* Estrellas */}
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-4xl transition-transform hover:scale-110 ${
                    star <= rating ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                >
                  ⭐
                </button>
              ))}
            </div>
            
            {rating > 0 && (
              <p className="text-center text-gray-600 mb-4">
                {rating === 1 && '😞 Muy malo'}
                {rating === 2 && '😐 Malo'}
                {rating === 3 && '😐 Regular'}
                {rating === 4 && '🙂 Bueno'}
                {rating === 5 && '😊 Excelente'}
              </p>
            )}

            {/* Comentario opcional */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comentario (opcional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows="3"
                placeholder="Comparte tu experiencia..."
              />
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={handleSubmitRating}
                disabled={rating === 0}
                className="flex-1 bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Enviar Calificación
              </button>
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setRating(0);
                  setComment('');
                  navigate('/pasajero');
                }}
                className="px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Omitir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

