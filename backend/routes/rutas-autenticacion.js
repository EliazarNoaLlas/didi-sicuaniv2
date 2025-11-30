import express from 'express';
import { body, validationResult } from 'express-validator';
import { iniciarSesion, registrar } from '../controllers/controlador-autenticacion.js';

const enrutador = express.Router();

// Middleware para manejar errores de validación
const manejarErroresValidacion = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Datos de entrada inválidos',
      errores: errores.array()
    });
  }
  next();
};

/**
 * @swagger
 * /api/autenticacion/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - correo
 *               - contrasena
 *             properties:
 *               correo:
 *                 type: string
 *                 format: email
 *                 example: juan@example.com
 *               contrasena:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Inicio de sesión exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exito:
 *                   type: boolean
 *                   example: true
 *                 datos:
 *                   type: object
 *                   properties:
 *                     usuario:
 *                       $ref: '#/components/schemas/Usuario'
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: Credenciales inválidas
 *         $ref: '#/components/schemas/Error'
 */
enrutador.post(
  '/login',
  [
    body('correo').isEmail().withMessage('Se requiere un correo electrónico válido'),
    body('contrasena').notEmpty().withMessage('Se requiere la contraseña'),
  ],
  manejarErroresValidacion,
  iniciarSesion
);

/**
 * @swagger
 * /api/autenticacion/register:
 *   post:
 *     summary: Registrar nuevo usuario
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - correo
 *               - contrasena
 *               - nombre
 *               - tipoUsuario
 *             properties:
 *               correo:
 *                 type: string
 *                 format: email
 *                 example: juan@example.com
 *               contrasena:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: password123
 *               nombre:
 *                 type: string
 *                 example: Juan Pérez
 *               tipoUsuario:
 *                 type: string
 *                 enum: [pasajero, conductor]
 *                 example: pasajero
 *               telefono:
 *                 type: string
 *                 example: +51987654321
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exito:
 *                   type: boolean
 *                   example: true
 *                 mensaje:
 *                   type: string
 *                   example: Usuario registrado exitosamente
 *                 datos:
 *                   type: object
 *                   properties:
 *                     usuario:
 *                       $ref: '#/components/schemas/Usuario'
 *       400:
 *         description: Usuario ya existe o datos inválidos
 *         $ref: '#/components/schemas/Error'
 */
enrutador.post(
  '/register',
  [
    body('correo').isEmail().withMessage('Se requiere un correo electrónico válido'),
    body('contrasena').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('nombre').notEmpty().withMessage('Se requiere el nombre'),
    body('tipoUsuario').isIn(['pasajero', 'conductor']).withMessage('Se requiere un tipo de usuario válido'),
  ],
  manejarErroresValidacion,
  registrar
);

export default enrutador;
