import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { initSocket } from '../services/socket';
import api from '../services/api';
import toast from 'react-hot-toast';

// Importar getState para verificar el token
const { getState } = useAuthStore;

export default function Login() {
  const [formData, setFormData] = useState({
    correo: '',
    contrasena: '',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/autenticacion/login', formData);
      
      // Verificar que la respuesta sea exitosa
      if (!response.data || !response.data.exito) {
        throw new Error(response.data?.mensaje || 'Error al iniciar sesión');
      }
      
      const { usuario, user, token } = response.data.datos || response.data.data || {};
      
      if (!token) {
        throw new Error('No se recibió token de autenticación');
      }
      
      // El backend puede devolver 'usuario' o 'user' (compatibilidad)
      const usuarioData = usuario || user;

      if (!usuarioData) {
        throw new Error('No se recibieron datos del usuario');
      }

      setAuth(usuarioData, token);
      
      // Verificar que el token se guardó correctamente
      const tokenGuardado = getState().token;
      if (!tokenGuardado) {
        console.error('⚠️ Error: El token no se guardó en el store');
      } else {
        console.log('✅ Token guardado correctamente en el store');
      }
      
      // Inicializar socket después del login
      setTimeout(() => {
        initSocket();
      }, 100);
      
      toast.success('¡Bienvenido!');

      // Redirigir según tipo de usuario
      const tipoUsuario = usuarioData.tipoUsuario || usuarioData.userType || usuarioData.role;
      if (tipoUsuario === 'pasajero' || tipoUsuario === 'passenger') {
        navigate('/pasajero');
      } else if (tipoUsuario === 'conductor' || tipoUsuario === 'driver') {
        navigate('/conductor');
      } else if (tipoUsuario === 'administrador' || tipoUsuario === 'admin') {
        navigate('/administrador');
      } else {
        navigate('/');
      }
    } catch (error) {
      // El backend devuelve 'mensaje' en español
      const mensajeError = error.response?.data?.mensaje || error.response?.data?.message || 'Error al iniciar sesión';
      toast.error(mensajeError);
      console.error('Error en login:', error.response?.data || error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6">DiDi-Sicuani</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={formData.correo}
              onChange={(e) =>
                setFormData({ ...formData, correo: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={formData.contrasena}
              onChange={(e) =>
                setFormData({ ...formData, contrasena: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          ¿No tienes cuenta?{' '}
          <a href="/registro" className="text-blue-500 hover:underline">
            Regístrate
          </a>
        </p>
      </div>
    </div>
  );
}

