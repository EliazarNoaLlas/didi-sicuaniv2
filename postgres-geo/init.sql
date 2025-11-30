-- Script de inicialización de PostgreSQL + PostGIS para DiDi-Sicuani

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS pgrouting;
CREATE EXTENSION IF NOT EXISTS hstore;

-- Crear tabla de red de rutas (se llenará después de importar OSM)
CREATE TABLE IF NOT EXISTS sicuani_road_network (
    id SERIAL PRIMARY KEY,
    osm_id BIGINT,
    name VARCHAR(255),
    highway VARCHAR(50),
    oneway VARCHAR(10),
    maxspeed INTEGER,
    surface VARCHAR(50),
    geom GEOMETRY(LINESTRING, 4326),
    source INTEGER,
    target INTEGER,
    cost DOUBLE PRECISION,
    reverse_cost DOUBLE PRECISION,
    distance_km DOUBLE PRECISION,
    congestion_factor DOUBLE PRECISION DEFAULT 1.0,
    vehicle_type VARCHAR(20) DEFAULT 'all'
);

-- Función: Encontrar nodo más cercano
CREATE OR REPLACE FUNCTION find_nearest_node(
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    search_radius_meters INTEGER DEFAULT 1000
) RETURNS INTEGER AS $$
DECLARE
    nearest_node INTEGER;
BEGIN
    SELECT id INTO nearest_node
    FROM sicuani_road_network_vertices_pgr
    ORDER BY the_geom <-> ST_SetSRID(ST_MakePoint(lon, lat), 4326)
    LIMIT 1;
    
    RETURN nearest_node;
END;
$$ LANGUAGE plpgsql;

-- Función: Calcular ruta óptima entre dos puntos
CREATE OR REPLACE FUNCTION calculate_route(
    origin_lat DOUBLE PRECISION,
    origin_lon DOUBLE PRECISION,
    dest_lat DOUBLE PRECISION,
    dest_lon DOUBLE PRECISION,
    vehicle_type VARCHAR DEFAULT 'all'
) RETURNS TABLE(
    seq INTEGER,
    node BIGINT,
    edge BIGINT,
    cost DOUBLE PRECISION,
    agg_cost DOUBLE PRECISION,
    geom GEOMETRY
) AS $$
DECLARE
    start_node INTEGER;
    end_node INTEGER;
BEGIN
    -- Encontrar nodos más cercanos
    start_node := find_nearest_node(origin_lat, origin_lon);
    end_node := find_nearest_node(dest_lat, dest_lon);
    
    -- Calcular ruta usando algoritmo A* (más rápido que Dijkstra)
    RETURN QUERY
    SELECT 
        route.seq,
        route.node,
        route.edge,
        route.cost,
        route.agg_cost,
        rn.geom
    FROM pgr_astar(
        'SELECT id, source, target, cost, reverse_cost, 
                ST_X(ST_StartPoint(geom)) as x1,
                ST_Y(ST_StartPoint(geom)) as y1,
                ST_X(ST_EndPoint(geom)) as x2,
                ST_Y(ST_EndPoint(geom)) as y2
         FROM sicuani_road_network
         WHERE vehicle_type = ''' || vehicle_type || ''' OR vehicle_type = ''all''',
        start_node,
        end_node,
        directed := true
    ) AS route
    LEFT JOIN sicuani_road_network rn ON route.edge = rn.id;
END;
$$ LANGUAGE plpgsql;

-- Función: Calcular métricas de viaje
CREATE OR REPLACE FUNCTION calculate_trip_metrics(
    origin_lat DOUBLE PRECISION,
    origin_lon DOUBLE PRECISION,
    dest_lat DOUBLE PRECISION,
    dest_lon DOUBLE PRECISION
) RETURNS TABLE(
    distance_km DOUBLE PRECISION,
    duration_minutes DOUBLE PRECISION,
    base_price_soles DOUBLE PRECISION
) AS $$
DECLARE
    total_distance DOUBLE PRECISION;
    total_time DOUBLE PRECISION;
    calculated_price DOUBLE PRECISION;
BEGIN
    -- Calcular métricas usando pgRouting si está disponible
    -- Si no, usar cálculo euclidiano como fallback
    
    BEGIN
        SELECT 
            SUM(rn.distance_km),
            SUM(rn.cost * rn.congestion_factor)
        INTO total_distance, total_time
        FROM calculate_route(origin_lat, origin_lon, dest_lat, dest_lon) cr
        LEFT JOIN sicuani_road_network rn ON cr.edge = rn.id;
        
        -- Si no hay resultados, usar cálculo euclidiano
        IF total_distance IS NULL THEN
            total_distance := ST_Distance(
                ST_SetSRID(ST_MakePoint(origin_lon, origin_lat), 4326)::geography,
                ST_SetSRID(ST_MakePoint(dest_lon, dest_lat), 4326)::geography
            ) / 1000;
            total_time := total_distance / 0.5; -- 30 km/h promedio
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Fallback a cálculo euclidiano
        total_distance := ST_Distance(
            ST_SetSRID(ST_MakePoint(origin_lon, origin_lat), 4326)::geography,
            ST_SetSRID(ST_MakePoint(dest_lon, dest_lat), 4326)::geography
        ) / 1000;
        total_time := total_distance / 0.5;
    END;
    
    -- Calcular precio base: S/ 5 banderazo + S/ 2.5 por km
    calculated_price := 5.0 + (total_distance * 2.5);
    
    RETURN QUERY SELECT total_distance, total_time, calculated_price;
END;
$$ LANGUAGE plpgsql;

-- Función: Encontrar conductores cercanos
CREATE OR REPLACE FUNCTION find_nearby_drivers(
    passenger_lat DOUBLE PRECISION,
    passenger_lon DOUBLE PRECISION,
    radius_km DOUBLE PRECISION DEFAULT 3.0,
    vehicle_filter VARCHAR DEFAULT 'all'
) RETURNS TABLE(
    driver_id TEXT,
    driver_lat DOUBLE PRECISION,
    driver_lon DOUBLE PRECISION,
    distance_km DOUBLE PRECISION,
    eta_minutes DOUBLE PRECISION,
    rating DOUBLE PRECISION,
    vehicle_type VARCHAR,
    acceptance_score DOUBLE PRECISION
) AS $$
BEGIN
    -- Nota: Esta función requiere que los conductores estén en PostgreSQL
    -- En producción, se puede usar una vista materializada sincronizada con MongoDB
    RETURN QUERY
    SELECT 
        d.id::TEXT,
        d.current_latitude,
        d.current_longitude,
        ST_Distance(
            ST_SetSRID(ST_MakePoint(passenger_lon, passenger_lat), 4326)::geography,
            ST_SetSRID(ST_MakePoint(d.current_longitude, d.current_latitude), 4326)::geography
        ) / 1000 as distance,
        (ST_Distance(
            ST_SetSRID(ST_MakePoint(passenger_lon, passenger_lat), 4326)::geography,
            ST_SetSRID(ST_MakePoint(d.current_longitude, d.current_latitude), 4326)::geography
        ) / 1000) / 25 * 60 as eta,
        d.rating,
        d.vehicle_type,
        (
            (1 - (ST_Distance(
                ST_SetSRID(ST_MakePoint(passenger_lon, passenger_lat), 4326)::geography,
                ST_SetSRID(ST_MakePoint(d.current_longitude, d.current_latitude), 4326)::geography
            ) / 1000) / radius_km) * 0.4 +
            (d.rating / 5.0) * 0.4 +
            CASE WHEN d.vehicle_type = vehicle_filter THEN 0.2 ELSE 0.1 END
        ) as acceptance_score
    FROM drivers d
    WHERE d.is_online = true
      AND d.is_available = true
      AND (vehicle_filter = 'all' OR d.vehicle_type = vehicle_filter)
      AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(passenger_lon, passenger_lat), 4326)::geography,
          ST_SetSRID(ST_MakePoint(d.current_longitude, d.current_latitude), 4326)::geography,
          radius_km * 1000
      )
    ORDER BY acceptance_score DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Nota: Este script es básico. 
-- Para producción, se necesita:
-- 1. Importar datos OSM de Sicuani usando osm2pgsql
-- 2. Crear topología de red con pgr_createTopology
-- 3. Calcular costos de rutas
-- Ver documentación en Metodologia_Geolocalizacion_DB.md

