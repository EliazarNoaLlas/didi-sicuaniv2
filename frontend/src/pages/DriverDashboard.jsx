import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../services/api';

export default function DriverDashboard() {
  const [viajeActivo, setViajeActivo] = useState(null);

  useEffect(() => {
    cargarViajeActivo();
  }, []);

  const cargarViajeActivo = async () => {
    try {
      const respuesta = await api.get('/conductores/viaje-activo');
      // El backend retorna: { exito: true, datos: {...} }
      const datos = respuesta.data.datos || respuesta.data.data || null;
      if (datos) {
        setViajeActivo(datos);
      }
    } catch (error) {
      console.error('Error al cargar viaje activo:', error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Panel de Conductor</h1>

      {/* Alerta de viaje activo */}
      {viajeActivo && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-yellow-800">
                🚗 Tienes un viaje activo
              </p>
              <p className="text-yellow-700 text-sm">
                {viajeActivo.origen_direccion || viajeActivo.origin_address} → {viajeActivo.destino_direccion || viajeActivo.destination_address}
              </p>
            </div>
            <Link
              to="/viaje-activo"
              className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600"
            >
              Ver Detalles
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          to="/cola-viajes"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
        >
          <h2 className="text-xl font-semibold mb-2">📋 Cola de Viajes</h2>
          <p className="text-gray-600">
            Ver y gestionar solicitudes de viaje
          </p>
        </Link>

        {viajeActivo && (
          <Link
            to="/viaje-activo"
            className="bg-yellow-50 border-2 border-yellow-400 p-6 rounded-lg shadow hover:shadow-lg transition"
          >
            <h2 className="text-xl font-semibold mb-2">🚗 Viaje Activo</h2>
            <p className="text-gray-600">
              Gestionar viaje en progreso
            </p>
          </Link>
        )}

        <Link
          to="/historial"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
        >
          <h2 className="text-xl font-semibold mb-2">📜 Historial</h2>
          <p className="text-gray-600">
            Ver historial de viajes
          </p>
        </Link>

        <Link
          to="/calificaciones"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
        >
          <h2 className="text-xl font-semibold mb-2">⭐ Calificaciones</h2>
          <p className="text-gray-600">Ver tus reseñas y calificaciones</p>
        </Link>
      </div>
    </div>
  );
}

