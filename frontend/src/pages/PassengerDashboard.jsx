import { Link } from 'react-router-dom';

export default function PassengerDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Panel de Pasajero</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/solicitar-viaje"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
        >
          <h2 className="text-xl font-semibold mb-2">🚗 Solicitar Viaje</h2>
          <p className="text-gray-600">
            Solicita un viaje y propón tu precio
          </p>
        </Link>
        <Link
          to="/historial-pasajero"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
        >
          <h2 className="text-xl font-semibold mb-2">📋 Historial</h2>
          <p className="text-gray-600">Ver tus viajes anteriores</p>
        </Link>
      </div>
    </div>
  );
}

