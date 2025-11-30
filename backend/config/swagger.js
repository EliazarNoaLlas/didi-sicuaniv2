import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

/**
 * Configuración de Swagger/OpenAPI para la documentación de la API
 */
const opciones = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DiDi-Sicuani API',
      version: '1.0.0',
      description: 'API REST para la plataforma de movilidad urbana DiDi-Sicuani con sistema de Reverse Bidding',
      contact: {
        name: 'Equipo DiDi-Sicuani',
        email: 'support@didi-sicuani.com'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: 'Servidor de desarrollo'
      },
      {
        url: 'https://api.didi-sicuani.com',
        description: 'Servidor de producción'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Ingresa el token JWT obtenido del endpoint de login'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Mensaje de error'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            name: {
              type: 'string',
              example: 'Juan Pérez'
            },
            email: {
              type: 'string',
              example: 'juan@example.com'
            },
            userType: {
              type: 'string',
              enum: ['passenger', 'driver', 'admin'],
              example: 'passenger'
            },
            phone: {
              type: 'string',
              example: '+51987654321'
            }
          }
        },
        RideRequest: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            passenger_id: {
              type: 'string',
              example: '507f1f77bcf86cd799439012'
            },
            origin_lat: {
              type: 'number',
              example: -14.2694
            },
            origin_lon: {
              type: 'number',
              example: -71.2256
            },
            origin_address: {
              type: 'string',
              example: 'Plaza Principal, Sicuani'
            },
            destination_lat: {
              type: 'number',
              example: -14.2700
            },
            destination_lon: {
              type: 'number',
              example: -71.2260
            },
            destination_address: {
              type: 'string',
              example: 'Mercado Central, Sicuani'
            },
            suggested_price_soles: {
              type: 'number',
              example: 15.50
            },
            passenger_offered_price: {
              type: 'number',
              example: 12.00
            },
            estimated_distance_km: {
              type: 'number',
              example: 2.5
            },
            estimated_duration_min: {
              type: 'number',
              example: 8
            },
            vehicle_type: {
              type: 'string',
              enum: ['taxi', 'mototaxi', 'any'],
              example: 'taxi'
            },
            payment_method: {
              type: 'string',
              enum: ['cash', 'card', 'wallet'],
              example: 'cash'
            },
            status: {
              type: 'string',
              enum: ['pending', 'bidding_active', 'matched', 'accepted', 'in_progress', 'completed', 'cancelled'],
              example: 'bidding_active'
            }
          }
        },
        Bid: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439013'
            },
            ride_request_id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            driver_id: {
              type: 'string',
              example: '507f1f77bcf86cd799439014'
            },
            bid_type: {
              type: 'string',
              enum: ['accept', 'counteroffer', 'reject'],
              example: 'accept'
            },
            offered_price: {
              type: 'number',
              example: 12.00
            },
            driver_distance_km: {
              type: 'number',
              example: 1.2
            },
            driver_eta_min: {
              type: 'number',
              example: 5
            },
            driver_rating: {
              type: 'number',
              example: 4.8
            },
            status: {
              type: 'string',
              enum: ['pending', 'accepted', 'rejected', 'expired'],
              example: 'pending'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Autenticación',
        description: 'Endpoints para registro e inicio de sesión'
      },
      {
        name: 'Usuarios',
        description: 'Gestión de usuarios'
      },
      {
        name: 'Viajes',
        description: 'Gestión de solicitudes de viaje y reverse bidding'
      },
      {
        name: 'Bidding',
        description: 'Sistema de ofertas y contraofertas'
      },
      {
        name: 'Conductores',
        description: 'Endpoints específicos para conductores'
      },
      {
        name: 'Rutas',
        description: 'Cálculo de rutas y geocodificación'
      },
      {
        name: 'Admin',
        description: 'Endpoints administrativos y métricas'
      },
      {
        name: 'Health',
        description: 'Verificación del estado del servidor'
      }
    ]
  },
  apis: ['./routes/*.js', './server.js', './routes/swagger-docs.js']
};

/**
 * Especificación de Swagger generada a partir de las opciones
 */
const especificacionSwagger = swaggerJsdoc(opciones);

export { especificacionSwagger, swaggerUi };
// Exportar también con el nombre anterior para compatibilidad
export { especificacionSwagger as swaggerSpec };

