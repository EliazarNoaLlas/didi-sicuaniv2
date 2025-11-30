import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function PassengerHistory() {
  const [rides, setRides] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRides, setSelectedRides] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    loadHistory();
  }, [filters]);

  const loadHistory = async () => {
    try {
      const params = new URLSearchParams();
      // El backend espera parámetros en español
      if (filters.status) params.append('estado', filters.status);
      if (filters.startDate) params.append('fechaInicio', filters.startDate);
      if (filters.endDate) params.append('fechaFin', filters.endDate);

      const response = await api.get(`/usuarios/history?${params.toString()}`);
      // El backend devuelve 'datos' en español
      const datos = response.data.datos || response.data.data || {};
      setRides(datos.viajes || datos.rides || []);
      setStatistics(datos.estadisticas || datos.statistics || {});
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error('Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRides.length === 0) {
      toast.error('Selecciona al menos un viaje para borrar');
      return;
    }

    if (!window.confirm(`¿Estás seguro de que quieres borrar ${selectedRides.length} viaje(s) del historial?`)) {
      return;
    }

    try {
      const response = await api.post('/usuarios/history/delete', {
        idsViajes: selectedRides,
      });
      toast.success(response.data.mensaje || response.data.message || 'Viajes eliminados del historial');
      setSelectedRides([]);
      loadHistory();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al borrar viajes');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('¿Estás seguro de que quieres borrar TODO tu historial? Esta acción no se puede deshacer.')) {
      return;
    }

    if (!window.confirm('Esta acción es permanente. ¿Continuar?')) {
      return;
    }

    try {
      const response = await api.post('/usuarios/history/delete', {
        borrarTodo: true,
      });
      toast.success(response.data.mensaje || response.data.message || 'Historial borrado completamente');
      setSelectedRides([]);
      loadHistory();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al borrar historial');
    }
  };

  const toggleRideSelection = (rideId) => {
    setSelectedRides((prev) =>
      prev.includes(rideId)
        ? prev.filter((id) => id !== rideId)
        : [...prev, rideId]
    );
  };

  const getStatusBadge = (status) => {
    // Mapear estados en español e inglés
    const statusMap = {
      'completado': 'completado',
      'completed': 'completado',
      'cancelado': 'cancelado',
      'cancelled': 'cancelado',
      'asignado': 'asignado',
      'matched': 'asignado',
      'en_camino': 'en_camino',
      'driver_en_route': 'en_camino',
      'en_viaje': 'en_viaje',
      'in_progress': 'en_viaje',
      'subasta_activa': 'subasta_activa',
      'bidding_active': 'subasta_activa',
    };
    
    const estadoNormalizado = statusMap[status] || status;
    
    const badges = {
      completado: { text: 'Completado', color: 'bg-green-100 text-green-800' },
      cancelado: { text: 'Cancelado', color: 'bg-red-100 text-red-800' },
      asignado: { text: 'Asignado', color: 'bg-blue-100 text-blue-800' },
      en_camino: { text: 'Conductor en camino', color: 'bg-yellow-100 text-yellow-800' },
      en_viaje: { text: 'En viaje', color: 'bg-purple-100 text-purple-800' },
      subasta_activa: { text: 'Buscando conductor', color: 'bg-gray-100 text-gray-800' },
    };
    const badge = badges[estadoNormalizado] || { text: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-600">Cargando historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Historial de Viajes</h1>

      {/* Estadísticas */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">Total de Viajes</p>
            <p className="text-2xl font-bold">{statistics.totalViajes || statistics.totalRides || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">Completados</p>
            <p className="text-2xl font-bold text-green-600">
              {statistics.viajesCompletados || statistics.completedRides || 0}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">Gasto Total</p>
            <p className="text-2xl font-bold text-blue-600">
              S/ {statistics.totalGastado || statistics.totalSpent || '0.00'}
            </p>
          </div>
        </div>
      )}

      {/* Acciones de borrado */}
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={handleDeleteSelected}
              disabled={selectedRides.length === 0}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              🗑️ Borrar Seleccionados ({selectedRides.length})
            </button>
            <button
              onClick={handleDeleteAll}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              🗑️ Borrar Todo el Historial
            </button>
          </div>
          {selectedRides.length > 0 && (
            <button
              onClick={() => setSelectedRides([])}
              className="text-gray-600 hover:text-gray-800"
            >
              Limpiar selección
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Todos</option>
              <option value="completed">Completados</option>
              <option value="cancelled">Cancelados</option>
              <option value="matched">Asignados</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Inicio
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Fin
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ status: '', startDate: '', endDate: '' })}
              className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Viajes */}
      <div className="space-y-4">
        {rides.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <p className="text-gray-600">No hay viajes en el historial</p>
          </div>
        ) : (
          rides.map((ride) => (
            <div
              key={ride.id}
              className={`bg-white p-6 rounded-lg shadow hover:shadow-lg transition ${
                selectedRides.includes(ride.id) ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-2 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedRides.includes(ride.id)}
                    onChange={() => toggleRideSelection(ride.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(ride.status)}
                      <span className="text-sm text-gray-500">
                        {new Date(ride.fecha_creacion || ride.createdAt || ride.date || new Date()).toLocaleString()}
                      </span>
                    </div>
                  <div className="flex items-start gap-4 mb-2">
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Origen</p>
                      <p className="font-semibold">{ride.origen?.direccion || ride.origin?.address}</p>
                    </div>
                    <div className="text-gray-400">→</div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Destino</p>
                      <p className="font-semibold">{ride.destino?.direccion || ride.destination?.address}</p>
                    </div>
                  </div>
                  {(ride.conductor || ride.driver) && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">
                        🚗 Conductor: {ride.conductor?.nombre || ride.driver?.name}
                      </p>
                      {(ride.conductor?.calificacion || ride.driver?.rating) && (
                        <p className="text-sm text-gray-500">
                          ⭐ Rating: {(ride.conductor?.calificacion || ride.driver?.rating).toFixed(1)}
                        </p>
                      )}
                    </div>
                  )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">
                    S/ {(ride.precio_final_acordado || ride.precioAcordado || ride.agreedPrice || ride.precio_sugerido_soles || ride.precioSugerido || ride.suggestedPrice || 0).toFixed(2)}
                  </p>
                  {(ride.distancia_estimada_km || ride.distancia || ride.distance) && (
                    <p className="text-sm text-gray-500">
                      {(ride.distancia_estimada_km || ride.distancia || ride.distance).toFixed(2)} km
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

