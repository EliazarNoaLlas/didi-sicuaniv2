import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/metrics"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
        >
          <h2 className="text-xl font-semibold mb-2">📊 Métricas</h2>
          <p className="text-gray-600">Ver métricas en tiempo real</p>
        </Link>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">👥 Usuarios</h2>
          <p className="text-gray-600">Gestionar usuarios</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">🚗 Viajes</h2>
          <p className="text-gray-600">Gestionar viajes</p>
        </div>
      </div>
    </div>
  );
}

