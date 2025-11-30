import RideRequest from '../models/RideRequest.js';
import Bid from '../models/Bid.js';
import User from '../models/User.js';

class MetricsService {
  async getDashboardMetrics() {
    // Métricas en tiempo real
    const [
      totalRides,
      activeRides,
      totalDrivers,
      onlineDrivers,
      totalPassengers,
      revenue,
    ] = await Promise.all([
      RideRequest.countDocuments(),
      RideRequest.countDocuments({ status: { $in: ['bidding_active', 'matched', 'in_progress'] } }),
      User.countDocuments({ userType: 'driver' }),
      User.countDocuments({ userType: 'driver', 'driverInfo.isOnline': true }),
      User.countDocuments({ userType: 'passenger' }),
      this.calculateRevenue(),
    ]);

    return {
      totalRides,
      activeRides,
      totalDrivers,
      onlineDrivers,
      totalPassengers,
      revenue,
    };
  }

  async getRideMetrics() {
    // Viajes por hora (últimas 24 horas)
    const now = new Date();
    const hours = [];
    
    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now);
      hourStart.setHours(now.getHours() - i, 0, 0, 0);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hourStart.getHours() + 1);

      const count = await RideRequest.countDocuments({
        created_at: {
          $gte: hourStart,
          $lt: hourEnd,
        },
      });

      hours.push({
        hour: hourStart.getHours(),
        rides: count,
      });
    }

    return hours;
  }

  async getDriverMetrics() {
    // Distribución por tipo de vehículo
    const drivers = await User.aggregate([
      {
        $match: { userType: 'driver' },
      },
      {
        $group: {
          _id: '$driverInfo.vehicleType',
          count: { $sum: 1 },
        },
      },
    ]);

    return drivers.map((d) => ({
      type: d._id || 'unknown',
      count: d.count,
    }));
  }

  async getRevenueMetrics() {
    // Ingresos diarios (últimos 7 días)
    const now = new Date();
    const days = [];

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(now.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const rides = await RideRequest.find({
        status: 'completed',
        matched_at: {
          $gte: dayStart,
          $lte: dayEnd,
        },
      });

      const revenue = rides.reduce((sum, ride) => {
        const commission = (ride.final_agreed_price || 0) * 0.15; // 15% comisión
        return sum + commission;
      }, 0);

      days.push({
        date: dayStart.toISOString().split('T')[0],
        revenue: revenue.toFixed(2),
      });
    }

    return days;
  }

  async calculateRevenue() {
    // Calcular ingresos totales (comisión del 15%)
    const completedRides = await RideRequest.find({
      status: 'completed',
    });

    const totalRevenue = completedRides.reduce((sum, ride) => {
      const commission = (ride.final_agreed_price || 0) * 0.15;
      return sum + commission;
    }, 0);

    return totalRevenue;
  }

  async getBiddingMetrics() {
    // Métricas de bidding
    const totalBids = await Bid.countDocuments();
    const acceptedBids = await Bid.countDocuments({ status: 'accepted' });
    const counteroffers = await Bid.countDocuments({ bid_type: 'counteroffer' });

    const avgBidsPerRide = await RideRequest.aggregate([
      {
        $lookup: {
          from: 'bids',
          localField: '_id',
          foreignField: 'ride_request_id',
          as: 'bids',
        },
      },
      {
        $project: {
          bidCount: { $size: '$bids' },
        },
      },
      {
        $group: {
          _id: null,
          avgBids: { $avg: '$bidCount' },
        },
      },
    ]);

    return {
      totalBids,
      acceptedBids,
      counteroffers,
      acceptanceRate: totalBids > 0 ? (acceptedBids / totalBids) * 100 : 0,
      avgBidsPerRide: avgBidsPerRide[0]?.avgBids || 0,
    };
  }
}

export default new MetricsService();

