import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PassengerDashboard from './pages/PassengerDashboard';
import DriverDashboard from './pages/DriverDashboard';
import AdminDashboard from './pages/AdminDashboard';
import RideRequest from './pages/RideRequest';
import RideQueue from './pages/RideQueue';
import BiddingPage from './pages/BiddingPage';
import Metrics from './pages/Metrics';
import ActiveRide from './pages/ActiveRide';
import PassengerActiveRide from './pages/PassengerActiveRide';
import DriverHistory from './pages/DriverHistory';
import PassengerHistory from './pages/PassengerHistory';
import DriverRatings from './pages/DriverRatings';
import BestDrivers from './pages/BestDrivers';

function RutaPrivada({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/iniciar-sesion" />;
}

function App() {
  return (
    <Routes>
      <Route path="/iniciar-sesion" element={<Login />} />
      <Route path="/registro" element={<Register />} />
      
      <Route
        path="/"
        element={
          <RutaPrivada>
            <Layout />
          </RutaPrivada>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="pasajero" element={<PassengerDashboard />} />
        <Route path="conductor" element={<DriverDashboard />} />
        <Route path="administrador" element={<AdminDashboard />} />
        <Route path="solicitar-viaje" element={<RideRequest />} />
        <Route path="cola-viajes" element={<RideQueue />} />
        <Route path="subasta/:rideId" element={<BiddingPage />} />
        <Route path="metricas" element={<Metrics />} />
        <Route path="viaje-activo" element={<ActiveRide />} />
        <Route path="viaje-activo-pasajero" element={<PassengerActiveRide />} />
        <Route path="historial" element={<DriverHistory />} />
        <Route path="historial-pasajero" element={<PassengerHistory />} />
        <Route path="calificaciones" element={<DriverRatings />} />
        <Route path="mejores-conductores" element={<BestDrivers />} />
      </Route>
    </Routes>
  );
}

export default App;

