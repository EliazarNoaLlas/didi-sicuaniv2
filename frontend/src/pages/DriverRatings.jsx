import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function DriverRatings() {
  const [loading, setLoading] = useState(true);
  const [conductor, setConductor] = useState(null);
  const [estadisticas, setEstadisticas] = useState(null);
  const [calificaciones, setCalificaciones] = useState([]);
  const [filtroEstrellas, setFiltroEstrellas] = useState(0); // 0 = todas, 1-5 = filtro específico

  useEffect(() => {
    cargarCalificaciones();
  }, []);

  const cargarCalificaciones = async () => {
    try {
      setLoading(true);
      const respuesta = await api.get('/conductores/calificaciones');
      const datos = respuesta.data.datos || respuesta.data.data || {};
      
      setConductor(datos.conductor || {});
      setEstadisticas(datos.estadisticas || {});
      setCalificaciones(datos.calificaciones || []);
    } catch (error) {
      console.error('Error cargando calificaciones:', error);
      toast.error('Error al cargar calificaciones');
    } finally {
      setLoading(false);
    }
  };

  const renderEstrellas = (calificacion) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((estrella) => (
          <span
            key={estrella}
            className={`text-2xl ${
              estrella <= calificacion
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

  const calificacionesFiltradas = filtroEstrellas === 0
    ? calificaciones
    : calificaciones.filter(c => c.calificacion === filtroEstrellas);

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando calificaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">⭐ Mis Calificaciones y Reseñas</h1>

      {/* Información del Conductor */}
      {conductor && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{conductor.nombre}</h2>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  {renderEstrellas(Math.round(parseFloat(conductor.calificacionPromedio || 0)))}
                  <span className="text-xl font-semibold">
                    {conductor.calificacionPromedio || '0.0'}
                  </span>
                </div>
                <span className="text-gray-500">
                  ({estadisticas?.totalCalificaciones || 0} calificaciones)
                </span>
              </div>
              <p className="text-gray-600 mt-2">
                Total de viajes: {conductor.totalViajes || 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Distribución de Calificaciones */}
      {estadisticas && estadisticas.distribucion && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold mb-4">Distribución de Calificaciones</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((estrellas) => {
              const cantidad = estadisticas.distribucion[estrellas] || 0;
              const porcentaje = estadisticas.totalCalificaciones > 0
                ? (cantidad / estadisticas.totalCalificaciones) * 100
                : 0;
              
              return (
                <div key={estrellas} className="flex items-center gap-4">
                  <div className="flex items-center gap-1 w-20">
                    <span className="text-sm font-medium">{estrellas}</span>
                    <span className="text-yellow-400">★</span>
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                    <div
                      className="bg-yellow-400 h-4 rounded-full"
                      style={{ width: `${porcentaje}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-16 text-right">
                    {cantidad} ({porcentaje.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center gap-4">
          <span className="font-medium">Filtrar por:</span>
          <button
            onClick={() => setFiltroEstrellas(0)}
            className={`px-4 py-2 rounded-lg ${
              filtroEstrellas === 0
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Todas
          </button>
          {[5, 4, 3, 2, 1].map((estrellas) => (
            <button
              key={estrellas}
              onClick={() => setFiltroEstrellas(estrellas)}
              className={`px-4 py-2 rounded-lg flex items-center gap-1 ${
                filtroEstrellas === estrellas
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              <span>{estrellas}</span>
              <span className="text-yellow-400">★</span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Calificaciones */}
      <div className="space-y-4">
        {calificacionesFiltradas.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <p className="text-gray-600">No hay calificaciones para mostrar</p>
          </div>
        ) : (
          calificacionesFiltradas.map((calificacion) => (
            <div
              key={calificacion.id}
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {calificacion.pasajero?.nombre?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {calificacion.pasajero?.nombre || 'Pasajero'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(calificacion.fecha).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {renderEstrellas(calificacion.calificacion)}
                </div>
              </div>

              {calificacion.comentario && (
                <p className="text-gray-700 mb-4">{calificacion.comentario}</p>
              )}

              {calificacion.viaje && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Viaje:</span>{' '}
                    {calificacion.viaje.origen} → {calificacion.viaje.destino}
                  </p>
                  {calificacion.viaje.precio && (
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Precio:</span> S/ {calificacion.viaje.precio.toFixed(2)}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

