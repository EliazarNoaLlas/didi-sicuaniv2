import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { initSocket, disconnectSocket } from '../services/socket';
import { useEffect } from 'react';

export default function Layout() {
  const { user, logout, userType, isAuthenticated, token } = useAuthStore();
  const ubicacion = useLocation();

  useEffect(() => {
    // Inicializar socket cuando el usuario está autenticado y hay token
    // Usar un pequeño delay para evitar múltiples inicializaciones
    let timeoutId;
    
    if (isAuthenticated && token) {
      timeoutId = setTimeout(() => {
        const socket = initSocket();
        if (socket) {
          console.log('🔌 Socket inicializado desde Layout');
        }
      }, 100); // Pequeño delay para evitar inicializaciones múltiples
    }

    // Limpieza: desconectar al desmontar si no hay usuario
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (!isAuthenticated) {
        disconnectSocket();
      }
    };
  }, [isAuthenticated, token]);

  const manejarCerrarSesion = () => {
    // Desconectar socket antes de hacer logout
    disconnectSocket();
    logout();
    window.location.href = '/iniciar-sesion';
  };

  const navegacion = [
    { nombre: 'Panel', ruta: '/', icono: '🏠' },
    ...(userType === 'pasajero' || userType === 'passenger'
      ? [{ nombre: 'Solicitar Viaje', ruta: '/solicitar-viaje', icono: '🚗' }]
      : []),
    ...(userType === 'conductor' || userType === 'driver'
      ? [{ nombre: 'Cola de Viajes', ruta: '/cola-viajes', icono: '📋' }]
      : []),
    ...(userType === 'administrador' || userType === 'admin'
      ? [{ nombre: 'Métricas', ruta: '/metricas', icono: '📊' }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-blue-600">DiDi-Sicuani</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navegacion.map((item) => (
                  <Link
                    key={item.ruta}
                    to={item.ruta}
                    className={`${
                      ubicacion.pathname === item.ruta
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    <span className="mr-2">{item.icono}</span>
                    {item.nombre}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4">
                {user?.nombre || user?.name || user?.correo || user?.email}
              </span>
              <button
                onClick={manejarCerrarSesion}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

