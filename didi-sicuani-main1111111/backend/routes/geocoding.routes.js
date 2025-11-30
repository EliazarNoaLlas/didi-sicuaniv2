import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

// TODO: Implementar rutas de geocodificación
router.post('/geocode', (req, res) => {
  res.json({
    success: true,
    data: {},
  });
});

export default router;

