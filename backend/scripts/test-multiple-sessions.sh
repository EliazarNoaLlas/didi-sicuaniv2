#!/bin/bash

# Script para probar múltiples sesiones simultáneamente
# Uso: ./test-multiple-sessions.sh

BASE_URL="http://localhost:5000/api"

echo "🚀 Iniciando prueba de múltiples sesiones..."
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para login
login() {
  local email=$1
  local password=$2
  local role=$3
  
  echo -e "${BLUE}🔐 Login como $role...${NC}"
  RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}")
  
  TOKEN=$(echo $RESPONSE | jq -r '.data.token')
  USER_ID=$(echo $RESPONSE | jq -r '.data.user.id')
  
  if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✅ $role autenticado${NC}"
    echo "   User ID: $USER_ID"
    echo "   Token: ${TOKEN:0:30}..."
    echo ""
    echo "$TOKEN" > ".token.$role"
    echo "$USER_ID" > ".userid.$role"
    return 0
  else
    echo -e "${YELLOW}❌ Error en login de $role${NC}"
    echo "$RESPONSE" | jq
    return 1
  fi
}

# Función para crear solicitud de viaje
create_ride_request() {
  local token=$1
  
  echo -e "${BLUE}🚗 Creando solicitud de viaje...${NC}"
  RESPONSE=$(curl -s -X POST "$BASE_URL/rides/request" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $token" \
    -d '{
      "origin_lat": -14.2694,
      "origin_lon": -71.2256,
      "origin_address": "Plaza Principal, Sicuani",
      "destination_lat": -14.27,
      "destination_lon": -71.226,
      "destination_address": "Mercado Central, Sicuani",
      "passenger_offered_price": 12,
      "vehicle_type": "taxi",
      "payment_method": "cash"
    }')
  
  RIDE_ID=$(echo $RESPONSE | jq -r '.data.rideRequest._id')
  
  if [ "$RIDE_ID" != "null" ] && [ -n "$RIDE_ID" ]; then
    echo -e "${GREEN}✅ Solicitud creada: $RIDE_ID${NC}"
    echo "$RIDE_ID" > ".rideid"
    echo "$RESPONSE" | jq '.data.rideRequest | {_id, status, passenger_offered_price, suggested_price_soles}'
    return 0
  else
    echo -e "${YELLOW}❌ Error creando solicitud${NC}"
    echo "$RESPONSE" | jq
    return 1
  fi
}

# Función para enviar oferta
submit_bid() {
  local token=$1
  local ride_id=$2
  local bid_type=$3
  local price=$4
  
  echo -e "${BLUE}💰 Enviando oferta ($bid_type)...${NC}"
  
  if [ "$bid_type" = "counteroffer" ]; then
    BODY="{\"bid_type\":\"$bid_type\",\"offered_price\":$price}"
  else
    BODY="{\"bid_type\":\"$bid_type\"}"
  fi
  
  RESPONSE=$(curl -s -X POST "$BASE_URL/rides/$ride_id/bids" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $token" \
    -d "$BODY")
  
  BID_ID=$(echo $RESPONSE | jq -r '.data._id')
  
  if [ "$BID_ID" != "null" ] && [ -n "$BID_ID" ]; then
    echo -e "${GREEN}✅ Oferta enviada: $BID_ID${NC}"
    echo "$RESPONSE" | jq '.data | {_id, bid_type, offered_price, status}'
    return 0
  else
    echo -e "${YELLOW}❌ Error enviando oferta${NC}"
    echo "$RESPONSE" | jq
    return 1
  fi
}

# Función para obtener detalles de viaje
get_ride_details() {
  local token=$1
  local ride_id=$2
  
  echo -e "${BLUE}📋 Obteniendo detalles del viaje...${NC}"
  RESPONSE=$(curl -s -X GET "$BASE_URL/rides/$ride_id" \
    -H "Authorization: Bearer $token")
  
  echo "$RESPONSE" | jq '.data | {ride: .ride | {_id, status, passenger_offered_price, suggested_price_soles}, bids: .bids | length}'
}

# Main
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PRUEBA DE MÚLTIPLES SESIONES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Login Pasajero
login "pasajero@test.com" "test123" "PASAJERO"
PASSENGER_TOKEN=$(cat .token.PASAJERO 2>/dev/null)
PASSENGER_ID=$(cat .userid.PASAJERO 2>/dev/null)

if [ -z "$PASSENGER_TOKEN" ]; then
  echo "❌ No se pudo autenticar al pasajero. ¿Ejecutaste create-test-users.js?"
  exit 1
fi

echo ""

# 2. Login Conductor
login "conductor.taxi@test.com" "test123" "CONDUCTOR"
DRIVER_TOKEN=$(cat .token.CONDUCTOR 2>/dev/null)
DRIVER_ID=$(cat .userid.CONDUCTOR 2>/dev/null)

if [ -z "$DRIVER_TOKEN" ]; then
  echo "❌ No se pudo autenticar al conductor. ¿Ejecutaste create-test-users.js?"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FLUJO DE PRUEBA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 3. Pasajero crea solicitud
create_ride_request "$PASSENGER_TOKEN"
RIDE_ID=$(cat .rideid 2>/dev/null)

if [ -z "$RIDE_ID" ]; then
  echo "❌ No se pudo crear la solicitud de viaje"
  exit 1
fi

echo ""
sleep 2

# 4. Conductor envía oferta
submit_bid "$DRIVER_TOKEN" "$RIDE_ID" "accept" ""

echo ""
sleep 1

# 5. Ver detalles del viaje (desde pasajero)
get_ride_details "$PASSENGER_TOKEN" "$RIDE_ID"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ PRUEBA COMPLETADA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Tokens guardados en:"
echo "   - .token.PASAJERO"
echo "   - .token.CONDUCTOR"
echo ""
echo "💡 Puedes usar estos tokens en Postman o otras herramientas"
echo ""

# Limpiar archivos temporales (opcional)
# rm -f .token.* .userid.* .rideid

