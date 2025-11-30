import jwt from 'jsonwebtoken';

/**
 * Middleware de Autenticación
 * Verifica el token JWT en las solicitudes
 */
export const autenticar = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        exito: false,
        mensaje: 'No se proporcionó token',
      });
    }

    const decodificado = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decodificado;
    // También establecer req.usuario para compatibilidad
    req.usuario = decodificado;
    // Asegurar que tipoUsuario esté disponible
    if (!req.user.tipoUsuario && req.user.userType) {
      req.user.tipoUsuario = req.user.userType;
    }
    if (!req.usuario.tipoUsuario && req.usuario.userType) {
      req.usuario.tipoUsuario = req.usuario.userType;
    }
    next();
  } catch (error) {
    return res.status(401).json({
      exito: false,
      mensaje: 'Token inválido o expirado',
    });
  }
};

/**
 * Middleware de Autorización
 * Verifica que el usuario tenga los roles necesarios
 * @param {...String} roles - Roles permitidos
 * @returns {Function} Middleware de autorización
 */
export const autorizar = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        exito: false,
        mensaje: 'Autenticación requerida',
      });
    }

    // Mapear tipos de usuario del token a español para comparación
    const tipoUsuarioToken = req.user.tipoUsuario || req.user.userType;
    const tipoUsuarioMap = {
      'passenger': 'pasajero',
      'driver': 'conductor',
      'admin': 'administrador',
      'pasajero': 'pasajero',
      'conductor': 'conductor',
      'administrador': 'administrador',
    };
    const tipoUsuarioEsp = tipoUsuarioMap[tipoUsuarioToken] || tipoUsuarioToken;

    // Mapear roles requeridos a español
    const rolesEsp = roles.map(r => {
      const roleMap = {
        'passenger': 'pasajero',
        'driver': 'conductor',
        'admin': 'administrador',
        'pasajero': 'pasajero',
        'conductor': 'conductor',
        'administrador': 'administrador',
      };
      return roleMap[r] || r;
    });

    console.log('Middleware Autorizar:', {
      rolesRequeridos: roles,
      rolesEsp,
      tipoUsuarioToken,
      tipoUsuarioEsp,
      match: rolesEsp.includes(tipoUsuarioEsp)
    });

    // Debug log
    console.log('Middleware Autorizar:', {
      rolesRequeridos: roles,
      rolesEsp,
      tipoUsuarioToken,
      tipoUsuarioEsp,
      match: rolesEsp.includes(tipoUsuarioEsp)
    });

    if (!rolesEsp.includes(tipoUsuarioEsp)) {
      return res.status(403).json({
        exito: false,
        mensaje: `Acceso denegado. Rol requerido: ${roles.join(' o ')}, pero tienes: ${tipoUsuarioToken || 'ninguno'}`,
        rolesRequeridos: roles,
        tuRol: tipoUsuarioToken,
      });
    }

    next();
  };
};
