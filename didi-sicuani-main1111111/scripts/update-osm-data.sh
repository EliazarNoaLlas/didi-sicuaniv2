#!/bin/bash
# update-osm-data.sh - Actualizar datos OSM de Sicuani semanalmente

echo "🗺️  Actualizando datos OSM de Sicuani..."

# Configuración
OSM_FILE="/tmp/peru-latest.osm.pbf"
SICUANI_FILE="/tmp/sicuani.osm.pbf"
BACKUP_DIR="/backup"
DB_NAME="sicuani_geo"
DB_USER="postgres"

# 1. Descargar datos más recientes
echo "📥 Descargando datos OSM de Perú..."
wget -O "$OSM_FILE" https://download.geofabrik.de/south-america/peru-latest.osm.pbf

# 2. Extraer solo región de Sicuani
echo "✂️  Extrayendo región de Sicuani..."
osmium extract --bbox -71.3,-14.4,-71.1,-14.1 "$OSM_FILE" -o "$SICUANI_FILE"

# 3. Backup de base de datos actual
echo "💾 Creando backup de base de datos..."
mkdir -p "$BACKUP_DIR"
pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_DIR/sicuani_geo_$(date +%Y%m%d).sql"

# 4. Limpiar tablas OSM
echo "🧹 Limpiando tablas OSM..."
psql -U "$DB_USER" -d "$DB_NAME" <<EOF
DROP TABLE IF EXISTS planet_osm_point CASCADE;
DROP TABLE IF EXISTS planet_osm_line CASCADE;
DROP TABLE IF EXISTS planet_osm_roads CASCADE;
DROP TABLE IF EXISTS planet_osm_polygon CASCADE;
EOF

# 5. Reimportar datos actualizados
echo "📤 Importando datos actualizados..."
osm2pgsql --create --database "$DB_NAME" \
  --username "$DB_USER" \
  --latlong \
  --hstore \
  "$SICUANI_FILE"

# 6. Recrear red de routing
echo "🛣️  Recreando red de routing..."
psql -U "$DB_USER" -d "$DB_NAME" <<EOF
DELETE FROM cusco_road_network;

INSERT INTO cusco_road_network (osm_id, name, highway, oneway, maxspeed, geom)
SELECT 
    osm_id,
    name,
    highway,
    tags->'oneway' as oneway,
    CAST(tags->'maxspeed' AS INTEGER) as maxspeed,
    way as geom
FROM planet_osm_line
WHERE highway IN (
    'motorway', 'trunk', 'primary', 'secondary', 'tertiary',
    'residential', 'living_street', 'unclassified', 'service'
);

SELECT pgr_createTopology('cusco_road_network', 0.00001, 'geom', 'id', 'source', 'target');

UPDATE cusco_road_network SET distance_km = ST_Length(geom::geography) / 1000;

UPDATE cusco_road_network
SET cost = CASE 
    WHEN maxspeed IS NOT NULL AND maxspeed > 0 
        THEN (distance_km / maxspeed) * 60
    ELSE CASE highway
        WHEN 'motorway' THEN distance_km / 80 * 60
        WHEN 'primary' THEN distance_km / 50 * 60
        WHEN 'secondary' THEN distance_km / 40 * 60
        WHEN 'tertiary' THEN distance_km / 30 * 60
        WHEN 'residential' THEN distance_km / 20 * 60
        ELSE distance_km / 15 * 60
    END
END;

UPDATE cusco_road_network
SET reverse_cost = CASE 
    WHEN oneway IN ('yes', '1', 'true') THEN -1
    ELSE cost
END;

ANALYZE cusco_road_network;
ANALYZE cusco_road_network_vertices_pgr;
EOF

# 7. Limpiar archivos temporales
echo "🧹 Limpiando archivos temporales..."
rm -f "$OSM_FILE" "$SICUANI_FILE"

echo "✅ Actualización completada"
echo "📊 Estadísticas:"
psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT COUNT(*) as total_roads FROM cusco_road_network;"

