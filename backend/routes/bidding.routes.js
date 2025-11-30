import express from 'express';
import { body, param } from 'express-validator';
import { createRideRequest, submitBid, acceptBid, rejectBid, getBidsForRide } from '../controllers/bidding.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Crear solicitud de viaje con reverse bidding
router.post(
  '/request',
  authenticate,
  [
    body('origin_lat').isFloat().withMessage('Origin latitude is required'),
    body('origin_lon').isFloat().withMessage('Origin longitude is required'),
    body('destination_lat').isFloat().withMessage('Destination latitude is required'),
    body('destination_lon').isFloat().withMessage('Destination longitude is required'),
    body('passenger_offered_price').isFloat({ min: 0 }).withMessage('Valid price is required'),
    body('vehicle_type').isIn(['taxi', 'mototaxi', 'any']).withMessage('Valid vehicle type is required'),
  ],
  createRideRequest
);

// Enviar bid (conductor acepta/contraofrece)
router.post(
  '/bid',
  authenticate,
  [
    body('ride_request_id').isInt().withMessage('Ride request ID is required'),
    body('bid_type').isIn(['accept', 'counteroffer', 'reject']).withMessage('Valid bid type is required'),
    body('offered_price').optional().isFloat({ min: 0 }),
  ],
  submitBid
);

// Aceptar bid (pasajero acepta oferta del conductor)
router.post(
  '/accept/:bidId',
  authenticate,
  [param('bidId').isInt().withMessage('Valid bid ID is required')],
  acceptBid
);

// Rechazar bid
router.post(
  '/reject/:bidId',
  authenticate,
  [param('bidId').isInt().withMessage('Valid bid ID is required')],
  rejectBid
);

// Obtener bids de un viaje
router.get(
  '/ride/:rideId',
  authenticate,
  [param('rideId').isInt().withMessage('Valid ride ID is required')],
  getBidsForRide
);

export default router;

