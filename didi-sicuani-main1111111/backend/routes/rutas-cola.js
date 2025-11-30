import express from 'express';
import { autenticar, autorizar } from '../middleware/middleware-autenticacion.js';

const enrutador = express.Router();

enrutador.use(autenticar);
enrutador.use(autorizar('conductor'));

// TODO: Implementar rutas de cola
enrutador.get('/', (req, res) => {
  res.json({
    exito: true,
    datos: [],
  });
});

export default enrutador;
