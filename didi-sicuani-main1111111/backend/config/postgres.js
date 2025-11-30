import pkg from 'pg';
const { Pool } = pkg;

let pool = null;

const createPostgresPool = () => {
  if (!pool) {
    pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'sicuani_geo',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });

    // Test connection
    pool.query('SELECT NOW()', (err, res) => {
      if (err) {
        console.error('PostgreSQL connection error:', err);
      } else {
        console.log('✅ PostgreSQL + PostGIS connected');
      }
    });
  }

  return pool;
};

const getPostgresPool = () => {
  if (!pool) {
    return createPostgresPool();
  }
  return pool;
};

export default createPostgresPool;
export { getPostgresPool };

