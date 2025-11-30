import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function BestDrivers() {
  const [loading, setLoading] = useState(true);
  const [conductores, setConductores] = useState([]);
  const [totalConductores, setTotalConductores] = useState(0);

  useEffect(() => {
    cargarMejoresConductores();
  }, []);

  const cargarMejoresConductores = async () => {
    try {
      setLoading(true);
      const respuesta = await api.get('/usuarios/mejores-conductores');
      const datos = respuesta.data.datos || respuesta.data.data || {};
      
      setConductores(datos.conductores || []);
      setTotalConductores(datos.totalConductores || 0);
    } catch (error) {
      console.error('Error cargando mejores conductores:', error);
      toast.error('Error al cargar mejores conductores');
    } finally {
      setLoading(false);
    }
  };

  const renderEstrellas = (calificacion) => {
    const numEstrellas = Math.round(parseFloat(calificacion));
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((estrella) => (
          <span
            key={estrella}
            className={`text-lg ${
              estrella <= numEstrellas
                ? 'text-yellow-400'
                : 'text-gray-300'
            }`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const contactarConductor = (conductor) => {
    if (conductor.telefono) {
      window.open(`tel:${conductor.telefono}`, '_self');
    } else if (conductor.correo) {
      window.open(`mailto:${conductor.correo}`, '_self');
    } else {
      toast.error('No hay información de contacto disponible');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando mejores conductores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">⭐ Mis Mejores Conductores</h1>
      <p className="text-gray-600 mb-6">
        Conductores que te han brindado excelente servicio (calificación 4 o 5 estrellas)
      </p>

      {totalConductores === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-600">
            Aún no tienes conductores favoritos. ¡Comienza a viajar y califica a los conductores!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {conductores.map((item) => {
            const conductor = item.conductor;
            return (
              <div
                key={conductor.id}
                className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
              >
                {/* Header del Conductor */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {conductor.nombre?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{conductor.nombre}</h3>
                      <p className="text-sm text-gray-500">{conductor.tipoVehiculo}</p>
                    </div>
                  </div>
                </div>

                {/* Calificación */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    {renderEstrellas(item.promedioCalificacion)}
                    <span className="font-semibold text-lg">
                      {item.promedioCalificacion}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {item.totalViajes} viaje{item.totalViajes !== 1 ? 's' : ''} contigo
                  </p>
                </div>

                {/* Información del Vehículo */}
                {conductor.placaVehiculo && (
                  <div className="bg-gray-50 p-3 rounded-lg mb-4">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Placa:</span> {conductor.placaVehiculo}
                    </p>
                  </div>
                )}

                {/* Última Calificación */}
                {item.ultimaCalificacion && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-1">Última calificación:</p>
                    <div className="flex items-center gap-2 mb-1">
                      {renderEstrellas(item.ultimaCalificacion.calificacion)}
                      <span className="text-xs text-gray-500">
                        {new Date(item.ultimaCalificacion.fecha).toLocaleDateString('es-ES', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    {item.ultimaCalificacion.comentario && (
                      <p className="text-sm text-gray-600 italic">
                        "{item.ultimaCalificacion.comentario}"
                      </p>
                    )}
                  </div>
                )}

                {/* Botones de Acción */}
                <div className="flex gap-2">
                  <button
                    onClick={() => contactarConductor(conductor)}
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                  >
                    📞 Contactar
                  </button>
                  <button
                    onClick={() => {
                      // Aquí podrías agregar funcionalidad para solicitar viaje directamente con este conductor
                      toast.success(`Próximamente: Solicitar viaje con ${conductor.nombre}`);
                    }}
                    className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
                  >
                    🚗 Viajar
                  </button>
                </div>

                {/* Información de Contacto */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500 space-y-1">
                    {conductor.telefono && (
                      <p>📱 {conductor.telefono}</p>
                    )}
                    {conductor.correo && (
                      <p>✉️ {conductor.correo}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

