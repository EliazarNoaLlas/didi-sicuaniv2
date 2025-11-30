import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('driver'));

// TODO: Implementar rutas de cola
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [],
  });
});

export default router;

