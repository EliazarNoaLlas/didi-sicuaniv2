import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { SICUANI_CENTER, MAP_STYLE } from '../config/MapConfig';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';

const RequestRideScreen = ({ navigation }) => {
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [suggestedPrice, setSuggestedPrice] = useState(null);
  const [offeredPrice, setOfferedPrice] = useState('');
  const [priceRange, setPriceRange] = useState(null);
  const [vehicleType, setVehicleType] = useState('taxi');
  const [routeGeometry, setRouteGeometry] = useState(null);
  const [bids, setBids] = useState([]);
  const [rideRequestId, setRideRequestId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const socket = useSocket();

  // Calcular precio sugerido cuando cambian origen/destino
  useEffect(() => {
    if (origin && destination) {
      calculateSuggestedPrice();
      fetchRoute();
    }
  }, [origin, destination, vehicleType]);

  // Escuchar nuevos bids vía Socket.io
  useEffect(() => {
    if (!socket || !rideRequestId) return;

    socket.on('bid:received', (bid) => {
      setBids((prev) => [bid, ...prev]);
    });

    socket.on('ride:accepted', (data) => {
      navigation.navigate('RideInProgress', { rideId: rideRequestId });
    });

    return () => {
      socket.off('bid:received');
      socket.off('ride:accepted');
    };
  }, [socket, rideRequestId]);

  const calculateSuggestedPrice = async () => {
    try {
      const response = await api.post('/rides/calculate-price', {
        origin_lat: origin.latitude,
        origin_lon: origin.longitude,
        destination_lat: destination.latitude,
        destination_lon: destination.longitude,
        vehicle_type: vehicleType,
      });

      setSuggestedPrice(response.data.data.suggested_price);
      setPriceRange(response.data.data.price_range);
      setOfferedPrice(response.data.data.suggested_price.toFixed(2));
    } catch (error) {
      console.error('Error calculando precio:', error);
      Alert.alert('Error', 'No se pudo calcular el precio sugerido');
    }
  };

  const fetchRoute = async () => {
    try {
      const response = await api.get('/rides/route', {
        params: {
          origin_lat: origin.latitude,
          origin_lon: origin.longitude,
          dest_lat: destination.latitude,
          dest_lon: destination.longitude,
        },
      });

      setRouteGeometry(response.data.data.route_geometry);
    } catch (error) {
      console.error('Error obteniendo ruta:', error);
    }
  };

  const requestRide = async () => {
    setIsLoading(true);
    try {
      const response = await api.post('/rides/request', {
        origin_lat: origin.latitude,
        origin_lon: origin.longitude,
        origin_address: origin.address,
        destination_lat: destination.latitude,
        destination_lon: destination.longitude,
        destination_address: destination.address,
        passenger_offered_price: parseFloat(offeredPrice),
        vehicle_type: vehicleType,
        payment_method: 'cash',
      });

      setRideRequestId(response.data.data.rideRequest.id);

      // Iniciar polling de bids cada 2 segundos
      startBidPolling(response.data.data.rideRequest.id);
    } catch (error) {
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Error creando solicitud'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const startBidPolling = (requestId) => {
    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/rides/${requestId}`);
        setBids(response.data.data.bids);

        // Si el viaje fue asignado, detener polling
        if (response.data.data.ride.status === 'matched') {
          clearInterval(interval);
          navigation.navigate('RideInProgress', { rideId: requestId });
        }
      } catch (error) {
        console.error('Error obteniendo bids:', error);
      }
    }, 2000);

    // Limpiar interval después de 2 minutos
    setTimeout(() => clearInterval(interval), 120000);
  };

  const acceptBid = async (bidId) => {
    try {
      await api.post(`/rides/${rideRequestId}/bids/${bidId}/respond`, {
        action: 'accept',
      });

      navigation.navigate('RideInProgress', { rideId: rideRequestId });
    } catch (error) {
      Alert.alert('Error', 'Error aceptando oferta');
    }
  };

  const counterOffer = async (bidId, newPrice) => {
    try {
      await api.post(`/rides/${rideRequestId}/bids/${bidId}/respond`, {
        action: 'counter',
        new_price: newPrice,
      });

      Alert.alert('Éxito', 'Contraoferta enviada');
    } catch (error) {
      Alert.alert('Error', 'Error enviando contraoferta');
    }
  };

  return (
    <View style={styles.container}>
      {/* Mapa con ruta */}
      <Mapbox.MapView style={styles.map} styleURL={MAP_STYLE} zoomEnabled={true} scrollEnabled={true}>
        <Mapbox.Camera
          centerCoordinate={[SICUANI_CENTER.longitude, SICUANI_CENTER.latitude]}
          zoomLevel={14}
        />

        {/* Marcador de origen */}
        {origin && (
          <Mapbox.PointAnnotation
            id="origin"
            coordinate={[origin.longitude, origin.latitude]}
          >
            <View style={styles.originMarker}>
              <Text style={styles.markerText}>📍</Text>
            </View>
          </Mapbox.PointAnnotation>
        )}

        {/* Marcador de destino */}
        {destination && (
          <Mapbox.PointAnnotation
            id="destination"
            coordinate={[destination.longitude, destination.latitude]}
          >
            <View style={styles.destinationMarker}>
              <Text style={styles.markerText}>🎯</Text>
            </View>
          </Mapbox.PointAnnotation>
        )}

        {/* Ruta */}
        {routeGeometry && (
          <Mapbox.ShapeSource id="routeSource" shape={routeGeometry}>
            <Mapbox.LineLayer
              id="routeLine"
              style={{
                lineColor: '#4285F4',
                lineWidth: 4,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        )}
      </Mapbox.MapView>

      {/* Panel de información */}
      <View style={styles.infoPanel}>
        {!rideRequestId ? (
          <>
            {/* Selector de tipo de vehículo */}
            <View style={styles.vehicleSelector}>
              <TouchableOpacity
                style={[
                  styles.vehicleButton,
                  vehicleType === 'taxi' && styles.vehicleButtonActive,
                ]}
                onPress={() => setVehicleType('taxi')}
              >
                <Text style={styles.vehicleButtonText}>🚕 Taxi</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.vehicleButton,
                  vehicleType === 'mototaxi' && styles.vehicleButtonActive,
                ]}
                onPress={() => setVehicleType('mototaxi')}
              >
                <Text style={styles.vehicleButtonText}>🛺 Mototaxi</Text>
              </TouchableOpacity>
            </View>

            {suggestedPrice && (
              <View style={styles.pricingSection}>
                <Text style={styles.label}>Precio sugerido:</Text>
                <Text style={styles.suggestedPrice}>
                  S/ {suggestedPrice.toFixed(2)}
                </Text>

                <Text style={styles.label}>Tu oferta:</Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.currencySymbol}>S/</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={offeredPrice}
                    onChangeText={setOfferedPrice}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                </View>

                {priceRange && (
                  <Text style={styles.priceRange}>
                    Rango aceptable: S/ {priceRange.min.toFixed(2)} - S/{' '}
                    {priceRange.max.toFixed(2)}
                  </Text>
                )}

                <TouchableOpacity
                  style={styles.requestButton}
                  onPress={requestRide}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.requestButtonText}>
                      Solicitar Viaje
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Panel de bids recibidos */}
            <View style={styles.bidsSection}>
              <Text style={styles.bidsTitle}>
                Ofertas recibidas ({bids.length})
              </Text>

              <FlatList
                data={bids}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={styles.bidCard}>
                    <View style={styles.bidHeader}>
                      <View>
                        <Text style={styles.driverName}>
                          {item.driver_name}
                        </Text>
                        <Text style={styles.driverInfo}>
                          ⭐ {item.rating.toFixed(1)} • {item.total_trips}{' '}
                          viajes • {item.vehicle_type}
                        </Text>
                      </View>
                      <Text style={styles.bidETA}>
                        ETA: {item.driver_eta_min} min
                      </Text>
                    </View>

                    <View style={styles.bidPricing}>
                      {item.bid_type === 'accept' ? (
                        <Text style={styles.bidPriceAccept}>
                          ✅ Acepta tu oferta: S/{' '}
                          {item.offered_price.toFixed(2)}
                        </Text>
                      ) : (
                        <Text style={styles.bidPriceCounter}>
                          💬 Contraoferta: S/ {item.offered_price.toFixed(2)}
                        </Text>
                      )}
                    </View>

                    <View style={styles.bidActions}>
                      <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => acceptBid(item.id)}
                      >
                        <Text style={styles.acceptButtonText}>Aceptar</Text>
                      </TouchableOpacity>

                      {item.bid_type === 'counteroffer' && (
                        <TouchableOpacity
                          style={styles.counterButton}
                          onPress={() => {
                            // TODO: Mostrar modal para contraoferta
                            Alert.alert('Contraoferta', 'Funcionalidad en desarrollo');
                          }}
                        >
                          <Text style={styles.counterButtonText}>
                            Contra-Oferta
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyBids}>
                    <Text style={styles.emptyBidsText}>
                      Esperando ofertas de conductores cercanos...
                    </Text>
                  </View>
                }
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  infoPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
    maxHeight: '60%',
  },
  vehicleSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  vehicleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginHorizontal: 5,
    alignItems: 'center',
  },
  vehicleButtonActive: {
    borderColor: '#4285F4',
    backgroundColor: '#E8F0FE',
  },
  vehicleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pricingSection: {
    marginTop: 10,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  suggestedPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4285F4',
    marginBottom: 15,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4285F4',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 5,
  },
  priceInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    paddingVertical: 10,
  },
  priceRange: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  requestButton: {
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  requestButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bidsSection: {
    maxHeight: 400,
  },
  bidsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  bidCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  driverInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  bidETA: {
    fontSize: 14,
    color: '#4285F4',
    fontWeight: '600',
  },
  bidPricing: {
    marginBottom: 10,
  },
  bidPriceAccept: {
    fontSize: 16,
    color: '#34A853',
    fontWeight: '600',
  },
  bidPriceCounter: {
    fontSize: 16,
    color: '#EA4335',
    fontWeight: '600',
  },
  bidActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#34A853',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 5,
  },
  acceptButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  counterButton: {
    flex: 1,
    backgroundColor: '#FBBC04',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 5,
  },
  counterButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyBids: {
    padding: 40,
    alignItems: 'center',
  },
  emptyBidsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  originMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#34A853',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EA4335',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: {
    fontSize: 24,
  },
});

export default RequestRideScreen;

