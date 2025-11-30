-- Vista materializada para métricas del dashboard
-- Actualizar con: REFRESH MATERIALIZED VIEW dashboard_metrics;

CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_metrics AS
WITH hourly_stats AS (
  SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status = 'matched') as matched_rides,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_rides,
    AVG(passenger_offered_price) as avg_passenger_offer,
    AVG(final_agreed_price) FILTER (WHERE status = 'matched') as avg_final_price,
    AVG(estimated_distance_km) as avg_distance,
    AVG(EXTRACT(EPOCH FROM (matched_at - created_at))) FILTER (WHERE status = 'matched') as avg_matching_time_seconds
  FROM ride_requests
  WHERE created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY hour
)
SELECT 
  hour,
  total_requests,
  matched_rides,
  cancelled_rides,
  ROUND((matched_rides::DECIMAL / NULLIF(total_requests, 0) * 100)::NUMERIC, 2) as match_rate_percent,
  avg_passenger_offer,
  avg_final_price,
  ROUND((avg_final_price - avg_passenger_offer)::NUMERIC, 2) as avg_price_adjustment,
  avg_distance,
  avg_matching_time_seconds
FROM hourly_stats
ORDER BY hour DESC;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_hour ON dashboard_metrics(hour);

-- Función para refrescar la vista (ejecutar cada 5 minutos)
CREATE OR REPLACE FUNCTION refresh_dashboard_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics;
END;
$$ LANGUAGE plpgsql;

-- Configurar refresh automático con pg_cron (si está disponible)
-- SELECT cron.schedule('refresh-dashboard-metrics', '*/5 * * * *', 'SELECT refresh_dashboard_metrics();');

