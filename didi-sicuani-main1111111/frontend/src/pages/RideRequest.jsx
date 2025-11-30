import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../services/socket';
import api from '../services/api';
import toast from 'react-hot-toast';
import RideAcceptedAnimation from '../components/RideAcceptedAnimation';

export default function RideRequest() {
  const [formData, setFormData] = useState({
    origin_address: '',
    destination_address: '',
  });
  const [loading, setLoading] = useState(false);
  const [rideRequestId, setRideRequestId] = useState(null);
  const [showAcceptedAnimation, setShowAcceptedAnimation] = useState(false);
  const [acceptedDriverInfo, setAcceptedDriverInfo] = useState(null);
  const navigate = useNavigate();

  // Escuchar notificaciones de aceptación
  useEffect(() => {
    if (!rideRequestId) return;

    const socket = getSocket();
    
    if (socket && socket.connected) {
      const handleRideAccepted = (data) => {
        // Verificar que es para este viaje
        const idSolicitudViaje = data.idSolicitudViaje || data.rideRequestId || data._id;
        if (idSolicitudViaje === rideRequestId || idSolicitudViaje?.toString() === rideRequestId?.toString()) {
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
          
          toast.success('🎉 ¡Conductor aceptó tu solicitud!', {
            duration: 5000,
          });
        }
      };

      // Escuchar eventos en español (y mantener compatibilidad con inglés)
      socket.on('viaje:aceptado', handleRideAccepted);
      socket.on('ride:accepted', handleRideAccepted); // Compatibilidad

      return () => {
        if (socket) {
          socket.off('viaje:aceptado', handleRideAccepted);
          socket.off('ride:accepted', handleRideAccepted);
        }
      };
    }
  }, [rideRequestId]);

  const handleGeocode = async (address, type) => {
    // Por ahora, usar coordenadas mock. En producción, usar servicio de geocodificación
    // TODO: Integrar servicio de geocodificación real
    if (address.toLowerCase().includes('plaza') || address.toLowerCase().includes('principal')) {
      return { lat: -14.2694, lon: -71.2256 };
    }
    if (address.toLowerCase().includes('mercado')) {
      return { lat: -14.2700, lon: -71.2260 };
    }
    // Coordenadas por defecto para Sicuani
    return { lat: -14.2694, lon: -71.2256 };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Construir objeto de datos solo con direcciones
      const datosViaje = {
        origin_address: formData.origin_address,
        destination_address: formData.destination_address,
      };

      const response = await api.post('/viajes/request', datosViaje);

      // El backend retorna: { exito: true, datos: { solicitudViaje, precioSugerido } }
      const datos = response.data.datos || response.data.data || {};
      const solicitudViaje = datos.solicitudViaje || datos.rideRequest || datos;
      
      const newRideId = solicitudViaje?._id || solicitudViaje?.id || datos.id;
      
      if (!newRideId) {
        throw new Error('No se recibió el ID de la solicitud de viaje');
      }
      
      setRideRequestId(newRideId);
      
      toast.success('Solicitud creada. Esperando ofertas de conductores...');
      navigate(`/subasta/${newRideId}`);
    } catch (error) {
      const mensajeError = error.response?.data?.error || 
                           error.response?.data?.mensaje || 
                           error.response?.data?.message || 
                           error.message || 
                           'Error al crear solicitud';
      console.error('Error al crear solicitud:', error);
      toast.error(mensajeError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Animación de aceptación */}
      <RideAcceptedAnimation
        show={showAcceptedAnimation}
        driverInfo={acceptedDriverInfo}
        onClose={() => {
          setShowAcceptedAnimation(false);
          // Opcional: Redirigir a página de viaje en progreso
          // navigate(`/ride/${rideRequestId}`);
        }}
      />

      <h1 className="text-3xl font-bold mb-6">Solicitar Viaje</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Origen (Dirección)
          </label>
          <input
            type="text"
            required
            value={formData.origin_address}
            onChange={(e) =>
              setFormData({ ...formData, origin_address: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="Ej: Plaza Principal, Sicuani"
          />
        </div>
        {/* ...eliminar campos de latitud/longitud de origen... */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Destino (Dirección)
          </label>
          <input
            type="text"
            required
            value={formData.destination_address}
            onChange={(e) =>
              setFormData({ ...formData, destination_address: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="Ej: Mercado Central, Sicuani"
          />
        </div>
        {/* ...eliminar campos de latitud/longitud de destino... */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">
            ℹ️ Ingresa las direcciones de origen y destino. Los conductores recibirán tu solicitud y podrán hacer ofertas de precio.
          </p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 font-semibold"
        >
          {loading ? 'Creando solicitud...' : 'Crear Solicitud de Viaje'}
        </button>
      </form>
    </div>
  );
}

