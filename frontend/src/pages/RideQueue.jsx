import { useState, useEffect } from 'react';
import { getSocket } from '../services/socket';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function RideQueue() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acceptedRideNotification, setAcceptedRideNotification] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadQueue();

    const socket = getSocket();

    // Solo agregar listener si el socket está conectado
    if (socket && socket.connected) {
      const handleNewRide = (ride) => {
        // Normalizar ID del nuevo ride
        const normalizeId = (r) => {
          if (r._id) return typeof r._id === 'string' ? r._id : r._id.toString();
          if (r.id) return typeof r.id === 'string' ? r.id : r.id.toString();
          if (r.idSolicitudViaje) return typeof r.idSolicitudViaje === 'string' ? r.idSolicitudViaje : r.idSolicitudViaje.toString();
          if (r.rideRequestId) return typeof r.rideRequestId === 'string' ? r.rideRequestId : r.rideRequestId.toString();
          return null;
        };

        const newRideId = normalizeId(ride);

        // Verificar que no esté ya en la lista usando IDs normalizados
        setRides((prev) => {
          if (!newRideId) {
            // Si no hay ID, solo mostrar notificación y recargar
            toast.success('🚗 Nueva solicitud de viaje disponible');
            // Recargar después de un delay para evitar conflictos
            setTimeout(() => loadQueue(), 500);
            return prev;
          }

          const exists = prev.some(r => {
            const rId = normalizeId(r);
            return rId && rId === newRideId;
          });

          if (exists) {
            // Si existe, actualizar el existente sin duplicar
            const updated = prev.map(r => {
              const rId = normalizeId(r);
              return rId === newRideId ? { ...r, ...ride } : r;
            });
            // Filtrar duplicados adicionales por si acaso
            const idsVistos = new Set();
            return updated.filter(r => {
              const rId = normalizeId(r);
              if (!rId || idsVistos.has(rId)) return false;
              idsVistos.add(rId);
              return true;
            });
          }

          // Si no existe, agregar al inicio
          const newRides = [ride, ...prev];
          // Filtrar duplicados adicionales por si acaso
          const idsVistos = new Set();
          return newRides.filter(r => {
            const rId = normalizeId(r);
            if (!rId) return true; // Mantener si no tiene ID (poco probable)
            if (idsVistos.has(rId)) return false;
            idsVistos.add(rId);
            return true;
          });
        });
        toast.success('🚗 Nueva solicitud de viaje disponible');
      };

      // Escuchar cuando una solicitud es asignada a otro conductor
      const handleRideMatched = (data) => {
        const rideIdToRemove = data.idSolicitudViaje || data.rideRequestId || data._id;
        setRides((prev) => prev.filter(r => {
          const rId = r._id || r.id || r.idSolicitudViaje || r.rideRequestId;
          return rId !== rideIdToRemove;
        }));
        toast.info('Una solicitud fue asignada a otro conductor');
        loadQueue();
      };

      // Escuchar cuando el pasajero acepta la oferta del conductor
      const handleRideAcceptedByPassenger = (data) => {
        // Mostrar notificación en la página
        setAcceptedRideNotification({
          idSolicitudViaje: data.idSolicitudViaje || data.rideRequestId || data._id,
          pasajero: data.pasajero || {},
          origen: data.origen || {},
          destino: data.destino || {},
          precioAcordado: data.precioAcordado || 0,
          timestamp: new Date(),
        });
        
        toast.success('🎉 ¡Tu oferta fue aceptada! Tienes un pasajero esperando.', {
          duration: 6000,
        });
        
        // Remover de la cola si está presente
        const rideIdToRemove = data.idSolicitudViaje || data.rideRequestId || data._id;
        setRides((prev) => prev.filter(r => {
          const rId = r._id || r.id || r.idSolicitudViaje || r.rideRequestId;
          return rId !== rideIdToRemove;
        }));
      };

      // Escuchar eventos en español (y mantener compatibilidad con inglés)
      socket.on('viaje:asignado', handleRideMatched);
      socket.on('ride:matched', handleRideMatched); // Compatibilidad
      socket.on('viaje:nuevo', handleNewRide);
      socket.on('ride:new', handleNewRide); // Compatibilidad
      socket.on('viaje:aceptado_por_pasajero', handleRideAcceptedByPassenger);
      socket.on('ride:accepted_by_passenger', handleRideAcceptedByPassenger); // Compatibilidad

      // Cleanup: remover listener al desmontar
      return () => {
        if (socket) {
          socket.off('viaje:asignado', handleRideMatched);
          socket.off('ride:matched', handleRideMatched);
          socket.off('viaje:nuevo', handleNewRide);
          socket.off('ride:new', handleNewRide);
          socket.off('viaje:aceptado_por_pasajero', handleRideAcceptedByPassenger);
          socket.off('ride:accepted_by_passenger', handleRideAcceptedByPassenger);
        }
      };
    } else {
      // Si no está conectado, esperar a que se conecte
      const handleConnect = () => {
        const handleNewRideConnect = (ride) => {
          setRides((prev) => [ride, ...prev]);
          toast.success('Nueva solicitud de viaje disponible');
        };

        socket.on('viaje:nuevo', handleNewRideConnect);
        socket.on('ride:new', handleNewRideConnect); // Compatibilidad
      };

      if (socket) {
        socket.once('connect', handleConnect);
      }

      return () => {
        if (socket) {
          socket.off('connect', handleConnect);
          socket.off('viaje:nuevo');
          socket.off('ride:new');
        }
      };
    }
  }, []);

  const loadQueue = async () => {
    try {
      const response = await api.get('/conductores/queue');
      // El backend retorna: { exito: true, datos: [...] }
      const datos = response.data.datos || response.data.data || [];

      // Normalizar IDs y filtrar duplicados usando Set para mayor eficiencia
      const idsVistos = new Set();
      const ridesUnicos = datos.filter((ride) => {
        // Normalizar ID: convertir a string si es objeto
        const rideId = ride._id
          ? (typeof ride._id === 'string' ? ride._id : ride._id.toString())
          : (ride.id ? (typeof ride.id === 'string' ? ride.id : ride.id.toString()) : null);

        if (!rideId) {
          // Si no hay ID, generar uno temporal basado en otros campos
          const tempId = `${ride.origen?.direccion || ride.origin?.address || ''}-${ride.destino?.direccion || ride.destination?.address || ''}-${ride.fecha_creacion || ride.createdAt || Date.now()}`;
          if (idsVistos.has(tempId)) return false;
          idsVistos.add(tempId);
          return true;
        }

        if (idsVistos.has(rideId)) {
          return false; // Duplicado, filtrar
        }

        idsVistos.add(rideId);
        return true; // Único, incluir
      });

      setRides(ridesUnicos);
      setError(null);
    } catch (error) {
      console.error('Error loading queue:', error);
      const msg = error.response?.data?.mensaje || error.response?.data?.error || error.message || 'Error al cargar la cola de viajes';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  const [bidPrice, setBidPrice] = useState('');

  // Estados para ver ofertas
  const [showOffersModal, setShowOffersModal] = useState(false);
  const [selectedRideOffers, setSelectedRideOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);

  const handleMakeBid = (ride) => {
    setSelectedRide(ride);
    const precioSugerido = ride.precios?.precio_sugerido || ride.pricing?.suggested_price || ride.precio_sugerido_soles || 0;
    setBidPrice(typeof precioSugerido === 'number' ? precioSugerido.toFixed(2) : '');
    setShowBidModal(true);
  };

  const handleSubmitBid = async () => {
    if (!selectedRide || !bidPrice || parseFloat(bidPrice) <= 0) {
      toast.error('Ingresa un precio válido');
      return;
    }

    try {
      // El backend usa /viajes/:id/bids (en inglés) y espera 'offered_price'
      await api.post(`/viajes/${selectedRide._id}/bids`, {
        offered_price: parseFloat(bidPrice),
      });
      toast.success('✅ Oferta enviada exitosamente');
      setShowBidModal(false);
      setSelectedRide(null);
      setBidPrice('');
      loadQueue();
    } catch (error) {
      console.error('Error submitting bid:', error);
      const mensajeError = error.response?.data?.error ||
        error.response?.data?.mensaje ||
        error.message ||
        'Error al enviar oferta';
      toast.error(mensajeError);
    }
  };

  const handleReject = async (rideId) => {
    // Rechazar simplemente no hacer nada o remover de la vista
    toast.info('Solicitud ignorada');
    loadQueue();
  };

  const handleHold = async (rideId) => {
    try {
      const respuesta = await api.post('/conductores/espera', {
        ride_id: rideId,
        duration_minutes: 5,
      });
      toast.success('⏸️ Viaje puesto en espera por 5 minutos');
      loadQueue();
    } catch (error) {
      console.error('Error putting ride on hold:', error);
      toast.error(error.response?.data?.error || 'Error al poner en espera');
    }
  };

  const handleBlock = async (rideId, userId) => {
    if (!userId) {
      toast.error('No se puede bloquear: ID de usuario no disponible');
      return;
    }

    const confirmed = window.confirm(
      '¿Estás seguro de que quieres bloquear a este usuario? No recibirás más solicitudes de él.'
    );

    if (!confirmed) return;

    try {
      const respuesta = await api.post('/conductores/bloquear-usuario', {
        user_id: userId,
        reason: 'Bloqueado por conductor',
        is_permanent: false,
      });
      toast.success('Usuario bloqueado');
      loadQueue();
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error(error.response?.data?.error || 'Error al bloquear usuario');
    }
  };

  const handleViewOffers = async (ride) => {
    setSelectedRide(ride);
    setShowOffersModal(true);
    setLoadingOffers(true);

    // Normalizar ID
    const rideId = ride._id || ride.id || ride.idSolicitudViaje || ride.rideRequestId;

    if (!rideId) {
      toast.error('Error: ID de viaje no válido');
      setLoadingOffers(false);
      return;
    }

    try {
      const response = await api.get(`/viajes/${rideId}`);
      const datos = response.data.datos || response.data.data || {};
      const ofertas = datos.ofertas || datos.bids || [];
      setSelectedRideOffers(ofertas);
    } catch (error) {
      console.error('Error loading offers:', error);
      toast.error('Error al cargar las ofertas');
    } finally {
      setLoadingOffers(false);
    }
  };

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  const handleGoToPanel = () => {
    setAcceptedRideNotification(null);
    navigate('/conductor');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Cola de Viajes</h1>
        <button
          onClick={loadQueue}
          className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Notificación de oferta aceptada */}
      {acceptedRideNotification && (
        <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-5 rounded-lg shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-green-500 rounded-full p-2">
                  <span className="text-white text-xl">✓</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-green-800">
                    ¡Oferta Aceptada!
                  </h3>
                  <p className="text-green-700 font-medium">
                    Tu oferta ha sido aceptada por el pasajero
                  </p>
                </div>
              </div>
              
              <div className="ml-12 mt-3 space-y-2">
                <p className="text-gray-700">
                  <span className="font-semibold">Pasajero:</span>{' '}
                  {acceptedRideNotification.pasajero.nombre || 'N/A'}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Ruta:</span>{' '}
                  {acceptedRideNotification.origen.direccion || 'Origen'} →{' '}
                  {acceptedRideNotification.destino.direccion || 'Destino'}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Precio acordado:</span>{' '}
                  <span className="text-green-600 font-bold text-lg">
                    S/ {Number(acceptedRideNotification.precioAcordado).toFixed(2)}
                  </span>
                </p>
                <p className="text-sm text-gray-600 mt-3">
                  Tienes un pasajero esperando. Dirígete al punto de recogida para iniciar el viaje.
                </p>
              </div>
            </div>
            
            <button
              onClick={handleGoToPanel}
              className="ml-4 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md transition-colors whitespace-nowrap"
            >
              Ver Detalles del Viaje
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-600">Cargando solicitudes...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-red-500 text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {error}
              </p>
              <button
                onClick={loadQueue}
                className="mt-2 text-sm text-red-700 underline hover:text-red-900"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      ) : rides.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-600">No hay solicitudes disponibles</p>
          <p className="text-sm text-gray-400 mt-2">
            Las nuevas solicitudes aparecerán aquí automáticamente
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rides.map((ride, index) => {
            // Normalizar ID y asegurar que el key sea único
            const normalizeId = (r) => {
              if (r._id) return typeof r._id === 'string' ? r._id : r._id.toString();
              if (r.id) return typeof r.id === 'string' ? r.id : r.id.toString();
              return null;
            };

            const rideId = normalizeId(ride);
            // Usar ID normalizado o combinación única con índice
            const rideKey = rideId || `ride-${index}-${Date.now()}`;

            return (
              <div key={rideKey} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">
                        {ride.origen?.direccion || ride.origin?.address || ride.origin?.direccion || 'Origen no especificado'}
                      </h3>
                      <span className="text-gray-400">→</span>
                      <h3 className="font-semibold text-lg">
                        {ride.destino?.direccion || ride.destination?.address || ride.destination?.direccion || 'Destino no especificado'}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-gray-500">Pasajero</p>
                        <p className="font-medium">{ride.pasajero?.nombre || ride.passenger?.name || 'N/A'}</p>
                        {(ride.pasajero?.telefono || ride.passenger?.phone) && (
                          <p className="text-sm text-gray-400">{ride.pasajero?.telefono || ride.passenger?.phone}</p>
                        )}
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">Precio Sugerido</p>
                        <p className="font-bold text-blue-600 text-xl">
                          S/ {ride.precios?.precio_sugerido || ride.pricing?.suggested_price || ride.precio_sugerido_soles || 'N/A'}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">Distancia del Viaje</p>
                        <p className="font-medium">
                          {ride.viaje_info?.distancia_km || ride.trip?.distance_km || ride.distancia_estimada_km || 'N/A'} km
                        </p>
                        <p className="text-sm text-gray-400">
                          Duración: {ride.viaje_info?.duracion_min || ride.trip?.duration_min || ride.duracion_estimada_min || 'N/A'} min
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">Distancia desde ti</p>
                        <p className="font-medium">
                          {ride.distancia_desde_conductor_km || ride.distance_from_driver_km
                            ? `${ride.distancia_desde_conductor_km || ride.distance_from_driver_km} km`
                            : 'No disponible'}
                        </p>
                        {(ride.tiempo_estimado_llegada_min || ride.eta_minutes) && (
                          <p className="text-sm text-gray-400">
                            ETA: {ride.tiempo_estimado_llegada_min || ride.eta_minutes} min
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {ride.tipo_vehiculo === 'taxi' ? '🚕 Taxi' : ride.tipo_vehiculo === 'mototaxi' ? '🏍️ Mototaxi' : ride.tipo_vehiculo === 'cualquiera' ? '🚗 Cualquiera' : ride.vehicle_type === 'taxi' ? '🚕 Taxi' : ride.vehicle_type === 'mototaxi' ? '🏍️ Mototaxi' : '🚗 Cualquiera'}
                      </span>
                      <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                        💰 {ride.metodo_pago || ride.payment_method || 'Efectivo'}
                      </span>
                      {(ride.fecha_expiracion || ride.expires_at) && (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                          ⏰ Expira: {new Date(ride.fecha_expiracion || ride.expires_at).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => handleMakeBid(ride)}
                      className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors font-medium"
                    >
                      💰 Hacer Oferta
                    </button>
                    <button
                      onClick={() => handleHold(ride._id)}
                      className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 transition-colors font-medium"
                    >
                      ⏸️ Poner en Espera
                    </button>
                    <button
                      onClick={() => handleReject(ride._id)}
                      className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors font-medium"
                    >
                      ⏭️ Ignorar
                    </button>
                    <button
                      onClick={() => handleBlock(ride._id, ride.pasajero?.id || ride.passenger?.id)}
                      className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors font-medium text-sm"
                    >
                      🚫 Bloquear Usuario
                    </button>
                    <button
                      onClick={() => handleViewOffers(ride)}
                      className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
                    >
                      👀 Ver Ofertas
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para hacer oferta */}
      {showBidModal && selectedRide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Hacer Oferta de Precio</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Origen:</strong> {selectedRide.origen?.direccion || selectedRide.origin?.address || 'N/A'}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Destino:</strong> {selectedRide.destino?.direccion || selectedRide.destination?.address || 'N/A'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Precio sugerido:</strong> S/ {selectedRide.precios?.precio_sugerido || selectedRide.pricing?.suggested_price || 'N/A'}
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tu Precio Ofrecido (S/)
              </label>
              <input
                type="number"
                step="0.50"
                min="0.01"
                value={bidPrice}
                onChange={(e) => setBidPrice(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Ej: 15.50"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSubmitBid}
                className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 font-medium"
              >
                Enviar Oferta
              </button>
              <button
                onClick={() => {
                  setShowBidModal(false);
                  setSelectedRide(null);
                  setBidPrice('');
                }}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver ofertas */}
      {showOffersModal && selectedRide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Ofertas del Viaje</h2>
              <button
                onClick={() => {
                  setShowOffersModal(false);
                  setSelectedRide(null);
                  setSelectedRideOffers([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Detalles del Viaje</h3>
              <p><strong>Origen:</strong> {selectedRide.origen?.direccion || selectedRide.origin?.address}</p>
              <p><strong>Destino:</strong> {selectedRide.destino?.direccion || selectedRide.destination?.address}</p>
              <p><strong>Precio Sugerido:</strong> S/ {selectedRide.precios?.precio_sugerido || selectedRide.pricing?.suggested_price}</p>
            </div>

            {loadingOffers ? (
              <div className="text-center py-8">
                <p>Cargando ofertas...</p>
              </div>
            ) : selectedRideOffers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No hay ofertas para este viaje aún.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedRideOffers.map((oferta, index) => (
                  <div key={index} className="border p-4 rounded-lg flex justify-between items-center bg-white shadow-sm">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{oferta.nombre_conductor || 'Conductor'}</span>
                        <span className="text-yellow-500 text-sm">⭐ {oferta.calificacion || '5.0'}</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <span className="mr-3">🚗 {oferta.tipo_vehiculo === 'taxi' ? 'Taxi' : 'Vehículo'}</span>
                        <span>🕒 {oferta.tiempo_estimado_llegada_min || '?'} min</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-600">
                        S/ {typeof oferta.precio_ofrecido === 'number' ? oferta.precio_ofrecido.toFixed(2) : oferta.precio_ofrecido}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(oferta.fecha_creacion || oferta.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowOffersModal(false);
                  setSelectedRide(null);
                  setSelectedRideOffers([]);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

