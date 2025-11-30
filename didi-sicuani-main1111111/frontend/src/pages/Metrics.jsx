import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getSocket } from '../services/socket';
import api from '../services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function Metrics() {
  const [metrics, setMetrics] = useState({
    totalViajes: 0,
    totalRides: 0, // Compatibilidad
    viajesActivos: 0,
    activeRides: 0, // Compatibilidad
    totalConductores: 0,
    totalDrivers: 0, // Compatibilidad
    conductoresOnline: 0,
    onlineDrivers: 0, // Compatibilidad
    totalPasajeros: 0,
    totalPassengers: 0, // Compatibilidad
    ingresos: 0,
    revenue: 0, // Compatibilidad
  });

  const [rideData, setRideData] = useState([]);
  const [driverData, setDriverData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);

  useEffect(() => {
    // Conectar socket para métricas en tiempo real
    const socket = getSocket();

    socket.on('metrics:update', (data) => {
      setMetrics(data);
    });

    // Cargar datos iniciales
    loadMetrics();
    loadRideData();
    loadDriverData();
    loadRevenueData();

    // Actualizar cada 5 segundos
    const interval = setInterval(() => {
      loadMetrics();
    }, 5000);

    return () => {
      socket.off('metrics:update');
      clearInterval(interval);
    };
  }, []);

  const loadMetrics = async () => {
    try {
      const response = await api.get('/administrador/metrics');
      // El backend retorna: { exito: true, datos: {...} }
      const datos = response.data.datos || response.data.data || {};
      setMetrics(datos);
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const loadRideData = async () => {
    try {
      const response = await api.get('/administrador/metrics/viajes');
      // El backend retorna: { exito: true, datos: [...] }
      const datos = response.data.datos || response.data.data || [];
      setRideData(datos);
    } catch (error) {
      console.error('Error loading ride data:', error);
    }
  };

  const loadDriverData = async () => {
    try {
      const response = await api.get('/administrador/metrics/conductores');
      // El backend retorna: { exito: true, datos: [...] }
      const datos = response.data.datos || response.data.data || [];
      setDriverData(datos);
    } catch (error) {
      console.error('Error loading driver data:', error);
    }
  };

  const loadRevenueData = async () => {
    try {
      const response = await api.get('/administrador/metrics/ingresos');
      // El backend retorna: { exito: true, datos: [...] }
      const datos = response.data.datos || response.data.data || [];
      setRevenueData(datos);
    } catch (error) {
      console.error('Error loading revenue data:', error);
    }
  };

  const totalViajes = metrics.totalViajes || metrics.totalRides || 0;
  const viajesActivos = metrics.viajesActivos || metrics.activeRides || 0;
  
  const pieData = [
    { name: 'Completados', value: totalViajes - viajesActivos },
    { name: 'En curso', value: viajesActivos },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Métricas en Tiempo Real</h1>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Viajes Totales"
          value={metrics.totalViajes || metrics.totalRides || 0}
          icon="🚗"
        />
        <MetricCard
          title="Viajes Activos"
          value={metrics.viajesActivos || metrics.activeRides || 0}
          icon="🔄"
        />
        <MetricCard
          title="Conductores Online"
          value={`${metrics.conductoresOnline || metrics.onlineDrivers || 0}/${metrics.totalConductores || metrics.totalDrivers || 0}`}
          icon="👨‍✈️"
        />
        <MetricCard
          title="Ingresos (S/)"
          value={(metrics.ingresos || metrics.revenue || 0).toFixed(2)}
          icon="💰"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de viajes por hora */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Viajes por Hora</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={rideData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hora" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="viajes"
                stroke="#8884d8"
                name="Viajes"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de conductores */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Estado de Conductores</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de ingresos */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Ingresos Diarios</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="ingresos" fill="#82ca9d" name="Ingresos (S/)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de tipo de vehículo */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Distribución por Tipo</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={driverData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tipo" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="cantidad" fill="#8884d8" name="Cantidad" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{title}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
}

