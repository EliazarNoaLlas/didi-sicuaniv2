import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function Dashboard() {
  const { userType } = useAuthStore();
  const navegar = useNavigate();

  useEffect(() => {
    // Redirigir según tipo de usuario
    const tipoUsuario = userType;
    if (tipoUsuario === 'pasajero' || tipoUsuario === 'passenger') {
      navegar('/pasajero');
    } else if (tipoUsuario === 'conductor' || tipoUsuario === 'driver') {
      navegar('/conductor');
    } else if (tipoUsuario === 'administrador' || tipoUsuario === 'admin') {
      navegar('/administrador');
    }
  }, [userType, navegar]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Cargando...</p>
      </div>
    </div>
  );
}

