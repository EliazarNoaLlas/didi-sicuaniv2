import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import metricsService from '../services/metrics.service.js';
import { io } from '../server.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

// Métricas en tiempo real
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await metricsService.getDashboardMetrics();
    
    // Emitir actualización vía Socket.io
    if (io) {
      io.to('admins').emit('metrics:update', metrics);
    }
    
    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/metrics/rides', async (req, res) => {
  try {
    const data = await metricsService.getRideMetrics();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/metrics/drivers', async (req, res) => {
  try {
    const data = await metricsService.getDriverMetrics();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/metrics/revenue', async (req, res) => {
  try {
    const data = await metricsService.getRevenueMetrics();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/metrics/bidding', async (req, res) => {
  try {
    const data = await metricsService.getBiddingMetrics();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;

