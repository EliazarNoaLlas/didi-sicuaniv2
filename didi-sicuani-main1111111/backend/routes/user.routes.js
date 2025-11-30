import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// TODO: Implementar rutas de usuario
router.get('/profile', (req, res) => {
  res.json({
    success: true,
    data: req.user,
  });
});

export default router;

