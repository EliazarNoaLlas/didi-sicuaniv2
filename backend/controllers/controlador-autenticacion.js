import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Usuario from '../models/Usuario.js';

/**
 * Controlador de Autenticación
 * Maneja el inicio de sesión y registro de usuarios
 */

/**
 * Iniciar sesión de un usuario
 * @param {Object} req - Request con email y password
 * @param {Object} res - Response
 */
export const iniciarSesion = async (req, res) => {
  try {
    const { correo, contrasena } = req.body;
    
    // Log para depuración
    console.log('🔐 Intento de inicio de sesión:', { correo, tieneContrasena: !!contrasena });

    // Buscar usuario en MongoDB por correo electrónico
    const usuario = await Usuario.findOne({ correo }).select('+contrasena');

    if (!usuario) {
      return res.status(401).json({
        exito: false,
        mensaje: 'Credenciales inválidas',
      });
    }

    // Verificar contraseña usando bcrypt
    const contrasenaCoincide = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!contrasenaCoincide) {
      return res.status(401).json({
        exito: false,
        mensaje: 'Credenciales inválidas',
      });
    }

    // Generar token JWT con información del usuario
    const token = jwt.sign(
      {
        id: usuario._id.toString(),
        correo: usuario.correo,
        tipoUsuario: usuario.tipo_usuario,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      exito: true,
      datos: {
        usuario: {
          id: usuario._id,
          correo: usuario.correo,
          nombre: usuario.nombre,
          tipoUsuario: usuario.tipo_usuario,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error durante el inicio de sesión',
    });
  }
};

/**
 * Registrar un nuevo usuario
 * @param {Object} req - Request con email, password, name, userType, phone
 * @param {Object} res - Response
 */
export const registrar = async (req, res) => {
  try {
    const { correo, contrasena, nombre, tipoUsuario, telefono } = req.body;

    // Verificar si el usuario ya existe en la base de datos
    const usuarioExistente = await Usuario.findOne({ correo });
    if (usuarioExistente) {
      return res.status(400).json({
        exito: false,
        mensaje: 'El usuario ya existe',
      });
    }

    // Hashear contraseña con bcrypt (10 salt rounds) y crear usuario
    const contrasenaHasheada = await bcrypt.hash(contrasena, 10);
    const usuario = await Usuario.create({
      correo,
      contrasena: contrasenaHasheada,
      nombre,
      tipo_usuario: tipoUsuario,
      telefono,
    });

    res.status(201).json({
      exito: true,
      mensaje: 'Usuario registrado exitosamente',
      datos: {
        usuario: {
          id: usuario._id,
          correo: usuario.correo,
          nombre: usuario.nombre,
          tipoUsuario: usuario.tipo_usuario,
        },
      },
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error durante el registro',
    });
  }
};

// Exportar también con nombres en inglés para compatibilidad temporal
export const login = iniciarSesion;
export const register = registrar;

