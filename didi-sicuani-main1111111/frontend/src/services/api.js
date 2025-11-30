import axios from 'axios';
import { useAuthStore } from '../store/authStore';

/**
 * Servicio de API
 * Cliente HTTP centralizado para todas las peticiones al backend
 */

const URL_API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const clienteApi = axios.create({
  baseURL: URL_API,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Interceptor de peticiones
 * Agrega automáticamente el token de autenticación a todas las peticiones
 */
clienteApi.interceptors.request.use(
  (configuracion) => {
    try {
      const token = useAuthStore.getState().token;
      if (token) {
        configuracion.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn('⚠️ No hay token disponible para la petición:', configuracion.url);
      }
    } catch (error) {
      console.error('Error obteniendo token del store:', error);
    }
    return configuracion;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Interceptor de respuestas
 * Maneja errores de autenticación y redirige al login si es necesario
 */
clienteApi.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    // Solo redirigir si no estamos en la página de login/registro
    // Esto permite que el componente Login maneje los errores 401 del login
    if (error.response?.status === 401) {
      const rutaActual = window.location.pathname;
      const esPaginaAutenticacion = rutaActual === '/iniciar-sesion' || rutaActual === '/registro';
      
      if (!esPaginaAutenticacion) {
        useAuthStore.getState().logout();
        window.location.href = '/iniciar-sesion';
      }
    }
    return Promise.reject(error);
  }
);

// Exportar con nombre en español y mantener compatibilidad
export default clienteApi;
export { clienteApi as api }; // Alias para compatibilidad

