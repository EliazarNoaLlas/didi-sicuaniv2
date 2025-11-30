import express from 'express';
import { autenticar } from '../middleware/middleware-autenticacion.js';

const enrutador = express.Router();

enrutador.use(autenticar);

// TODO: Implementar rutas de geocodificación
enrutador.post('/geocode', (req, res) => {
  res.json({
    exito: true,
    datos: {},
  });
});

export default enrutador;
