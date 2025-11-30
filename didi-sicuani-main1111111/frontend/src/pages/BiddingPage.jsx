import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSocket } from '../services/socket';
import api from '../services/api';
import toast from 'react-hot-toast';
import RideAcceptedAnimation from '../components/RideAcceptedAnimation';

export default function BiddingPage() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const [bids, setBids] = useState([]);
  const [ride, setRide] = useState(null);
  const [showAcceptedAnimation, setShowAcceptedAnimation] = useState(false);
  const [acceptedDriverInfo, setAcceptedDriverInfo] = useState(null);

  useEffect(() => {
    loadRide();
    loadBids();

    const socket = getSocket();

    // Solo agregar listener si el socket está conectado
    if (socket && socket.connected) {
      const handleBidReceived = (bid) => {
        // Normalizar el bid para asegurar que tenga el campo 'id'
        const normalizedBid = {
          ...bid,
          id: bid._id || bid.id,
          _id: bid._id || bid.id,
        };

        setBids((prev) => {
          // Verificar si ya existe una oferta con este ID
          const index = prev.findIndex(b => (b._id || b.id) === normalizedBid.id);

          if (index !== -1) {
            // Si existe, actualizarla
            const newBids = [...prev];
            newBids[index] = normalizedBid;
            return newBids;
          }

          // Si no existe, agregarla al principio
          return [normalizedBid, ...prev];
        });

        if (bid.bid_type === 'accept') {
          toast.success('🎉 ¡Conductor aceptó tu solicitud!', {
            duration: 5000,
            icon: '✅',
          });
        } else if (bid.es_actualizacion) {
          toast.success('Oferta actualizada');
        } else {
          toast.success('Nueva oferta recibida');
        }
      };

      const handleRideAccepted = (data) => {
        // Mostrar animación de aceptación con toda la información
        setAcceptedDriverInfo({
          driverName: data.driverName,
          driverEmail: data.driverEmail,
          driverPhone: data.driverPhone,
          driverRating: data.driverRating,
          driverTotalRides: data.driverTotalRides,
          vehicleType: data.vehicleType,
          vehiclePlate: data.vehiclePlate,
          vehicleModel: data.vehicleModel,
          vehicleColor: data.vehicleColor,
          driverDistanceKm: data.driverDistanceKm,
          driverEtaMin: data.driverEtaMin,
          agreedPrice: data.agreedPrice,
          originAddress: data.originAddress,
          destinationAddress: data.destinationAddress,
        });
        setShowAcceptedAnimation(true);

        // Actualizar estado del viaje
        if (ride) {
          setRide({ ...ride, status: 'matched' });
        }

        // Recargar datos
        loadRide();
        loadBids();
      };

      // Escuchar eventos en español (y mantener compatibilidad con inglés)
      socket.on('oferta:recibida', handleBidReceived);
      socket.on('bid:received', handleBidReceived); // Compatibilidad
      socket.on('viaje:aceptado', handleRideAccepted);
      socket.on('ride:accepted', handleRideAccepted); // Compatibilidad

      // Cleanup: remover listener al desmontar
      return () => {
        if (socket) {
          socket.off('oferta:recibida', handleBidReceived);
          socket.off('bid:received', handleBidReceived);
          socket.off('viaje:aceptado', handleRideAccepted);
          socket.off('ride:accepted', handleRideAccepted);
        }
      };
    } else {
      // Si no está conectado, esperar a que se conecte
      const handleConnect = () => {
        const handleBidReceivedConnect = (bid) => {
          const normalizedBid = {
            ...bid,
            id: bid._id || bid.id,
            _id: bid._id || bid.id,
          };

          setBids((prev) => {
            const index = prev.findIndex(b => (b._id || b.id) === normalizedBid.id);
            if (index !== -1) {
              const newBids = [...prev];
              newBids[index] = normalizedBid;
              return newBids;
            }
            return [normalizedBid, ...prev];
          });

          if (bid.es_actualizacion) {
            toast.success('Oferta actualizada');
          } else {
            toast.success('Nueva oferta recibida');
          }
        };

        const handleRideAcceptedConnect = (data) => {
          setAcceptedDriverInfo({
            driverName: data.nombreConductor || data.driverName,
            driverEmail: data.correoConductor || data.driverEmail,
            driverPhone: data.telefonoConductor || data.driverPhone,
            driverRating: data.calificacionConductor || data.driverRating,
            driverTotalRides: data.totalViajesConductor || data.driverTotalRides,
            vehicleType: data.tipoVehiculo || data.vehicleType,
            vehiclePlate: data.placaVehiculo || data.vehiclePlate,
            vehicleModel: data.modeloVehiculo || data.vehicleModel,
            vehicleColor: data.colorVehiculo || data.vehicleColor,
            driverDistanceKm: data.distancia || data.driverDistanceKm,
            driverEtaMin: data.duracion || data.driverEtaMin,
            agreedPrice: data.precioAcordado || data.agreedPrice,
            originAddress: data.direccionOrigen || data.originAddress,
            destinationAddress: data.direccionDestino || data.destinationAddress,
          });
          setShowAcceptedAnimation(true);
        };

        socket.on('oferta:recibida', handleBidReceivedConnect);
        socket.on('bid:received', handleBidReceivedConnect); // Compatibilidad
        socket.on('viaje:aceptado', handleRideAcceptedConnect);
        socket.on('ride:accepted', handleRideAcceptedConnect); // Compatibilidad
      };

      if (socket) {
        socket.once('connect', handleConnect);
      }

      return () => {
        if (socket) {
          socket.off('connect', handleConnect);
          socket.off('oferta:recibida');
          socket.off('bid:received');
          socket.off('viaje:aceptado');
          socket.off('ride:accepted');
        }
      };
    }
  }, [rideId]);

  const loadRide = async () => {
    try {
      const response = await api.get(`/viajes/${rideId}`);

      // El backend retorna: { exito: true, datos: { viaje, ofertas } }
      const datos = response.data.datos || response.data.data || {};
      const viaje = datos.viaje || datos.ride || datos;
      const ofertas = datos.ofertas || datos.bids || [];

      setRide(viaje);
      setBids(ofertas);
    } catch (error) {
      console.error('Error loading ride:', error);
      const mensajeError = error.response?.data?.error ||
        error.response?.data?.mensaje ||
        error.response?.data?.message ||
        error.message ||
        'Error al cargar el viaje';
      toast.error(mensajeError);
    }
  };

  const loadBids = async () => {
    try {
      const response = await api.get(`/viajes/${rideId}`);

      // El backend retorna: { exito: true, datos: { viaje, ofertas } }
      const datos = response.data.datos || response.data.data || {};
      const ofertas = datos.ofertas || datos.bids || [];

      setBids(ofertas);
    } catch (error) {
      console.error('Error loading bids:', error);
      // No mostrar toast para este error, solo loguear
    }
  };

  const handleAcceptBid = async (bidId) => {
    if (!bidId) {
      toast.error('ID de oferta no válido');
      return;
    }

    try {
      await api.post(`/viajes/${rideId}/bids/${bidId}/respond`, {
        action: 'aceptar', // Usar español para consistencia
      });
      toast.success('Oferta aceptada. Viaje confirmado!');
      loadRide();
      loadBids();
    } catch (error) {
      const mensajeError = error.response?.data?.error ||
        error.response?.data?.mensaje ||
        error.message ||
        'Error al aceptar oferta';
      toast.error(mensajeError);
    }
  };

  const handleRejectBid = async (bidId) => {
    if (!bidId) {
      toast.error('ID de oferta no válido');
      return;
    }

    try {
      await api.post(`/viajes/${rideId}/bids/${bidId}/respond`, {
        action: 'rechazar', // Usar español para consistencia
      });
      toast.success('Oferta rechazada');
      loadBids();
    } catch (error) {
      const mensajeError = error.response?.data?.error ||
        error.response?.data?.mensaje ||
        error.message ||
        'Error al rechazar oferta';
      toast.error(mensajeError);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Animación de aceptación */}
      <RideAcceptedAnimation
        show={showAcceptedAnimation}
        driverInfo={acceptedDriverInfo}
        onClose={() => {
          setShowAcceptedAnimation(false);
          // Opcional: Redirigir a página de viaje en progreso
          // navigate(`/ride/${rideId}`);
        }}
      />

      <h1 className="text-3xl font-bold mb-6">Ofertas de Conductores</h1>

      {ride && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="font-semibold text-lg mb-2">Detalles del Viaje</h2>
          <p className="text-lg">
            <span className="font-medium">
              {ride.origen_direccion || ride.origin_address || 'N/A'}
            </span>{' '}
            →{' '}
            <span className="font-medium">
              {ride.destino_direccion || ride.destination_address || 'N/A'}
            </span>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Precio Sugerido</p>
              <p className="font-bold text-xl text-blue-600">
                S/ {ride.precio_sugerido_soles || ride.suggested_price_soles || ride.precioSugerido || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Distancia</p>
              <p className="font-medium">
                {ride.distancia_estimada_km || ride.estimated_distance_km || ride.distancia || 'N/A'} km
              </p>
            </div>
          </div>
          {(ride.fecha_expiracion || ride.expires_at || ride.fechaExpiracion) && (
            <p className="text-sm text-gray-500 mt-2">
              ⏰ Tiempo restante: {Math.max(0, Math.floor((new Date(ride.fecha_expiracion || ride.expires_at || ride.fechaExpiracion) - new Date()) / 1000 / 60))} minutos
            </p>
          )}
        </div>
      )}

      <div className="space-y-4">
        {bids.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <p className="text-gray-600">Esperando ofertas de conductores...</p>
          </div>
        ) : (
          bids.map((bid) => {
            const bidId = bid.id || bid._id;
            if (!bidId) {
              console.warn('Bid sin ID:', bid);
              return null;
            }

            // Mapear campos en español e inglés para compatibilidad
            const nombreConductor = bid.nombre_conductor || bid.driver_name || 'Conductor';
            const calificacion = bid.calificacion || bid.calificacion_conductor || bid.rating || 5.0;
            const precioOferta = bid.precio_ofrecido || bid.offered_price || bid.precioOfrecido || 0;
            const etaMin = bid.tiempo_estimado_llegada_min || bid.driver_eta_min || bid.etaMin || 'N/A';
            const distanciaKm = bid.distancia_conductor_km || bid.driver_distance_km || bid.distanciaKm || 0;
            const tipoVehiculo = bid.tipo_vehiculo || bid.vehicle_type || bid.tipoVehiculo || '';
            const totalViajes = bid.total_viajes || bid.total_trips || bid.totalViajes || 0;
            const fechaCreacion = bid.fecha_creacion || bid.created_at || bid.createdAt || new Date();
            const estado = bid.estado || bid.status || 'pending';

            return (
              <div key={bidId} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{nombreConductor}</h3>
                      <span className="text-yellow-500">⭐ {typeof calificacion === 'number' ? calificacion.toFixed(1) : calificacion}</span>
                    </div>
                    <p className="text-blue-600 font-bold text-xl mt-2">
                      Oferta: S/ {typeof precioOferta === 'number' ? precioOferta.toFixed(2) : precioOferta || 'N/A'}
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-3 text-sm text-gray-600">
                      <div>
                        <p>ETA: {etaMin} min</p>
                        <p>Distancia: {typeof distanciaKm === 'number' ? distanciaKm.toFixed(2) : distanciaKm || 'N/A'} km</p>
                      </div>
                      <div>
                        <p>Vehículo: {
                          tipoVehiculo === 'taxi' ? '🚕 Taxi' :
                            tipoVehiculo || '🚗'
                        }</p>
                        <p>Viajes: {totalViajes}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(fechaCreacion).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    {(estado === 'pending' || estado === 'pendiente') && (
                      <>
                        <button
                          onClick={() => handleAcceptBid(bidId)}
                          className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 font-medium"
                        >
                          ✅ Aceptar
                        </button>
                        <button
                          onClick={() => handleRejectBid(bidId)}
                          className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 font-medium"
                        >
                          ❌ Rechazar
                        </button>
                      </>
                    )}
                    {(estado === 'accepted' || estado === 'aceptada') && (
                      <span className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-medium text-center">
                        ✅ Aceptada
                      </span>
                    )}
                    {(estado === 'rejected' || estado === 'rechazada') && (
                      <span className="bg-red-100 text-red-800 px-4 py-2 rounded-lg font-medium text-center">
                        ❌ Rechazada
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          }).filter(Boolean)
        )}
      </div>
    </div>
  );
}

