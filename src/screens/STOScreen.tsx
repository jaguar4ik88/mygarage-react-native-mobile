import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import Icon from '../components/Icon';
import STOModal from '../components/STOModal';
import { COLORS, FONTS, SPACING } from '../constants';
import ApiService from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { ServiceStation } from '../types';
import Analytics from '../services/analyticsService';

const STOScreen: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [stations, setStations] = useState<ServiceStation[]>([]);
  const [favoriteStations, setFavoriteStations] = useState<ServiceStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [selectedStation, setSelectedStation] = useState<ServiceStation | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [userId, setUserId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<ServiceStation | null>(null);
  const [isSearchingNearby, setIsSearchingNearby] = useState(false);
  const [isShowingNearby, setIsShowingNearby] = useState(false);
  const [searchRadius, setSearchRadius] = useState(5000); // 5km default
  const [showRadiusSelector, setShowRadiusSelector] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Используем данные пользователя из контекста
      if (!user?.id) {
        console.error('User not available');
        return;
      }
      
      setUserId(user.id);
      
      // Load user's stations
      const data = await ApiService.getUserStations(user.id);
      const favs = Array.isArray(data) ? data : [];
      setFavoriteStations(favs);
      if (!isShowingNearby) {
        setStations(favs);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setStations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStations = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const data = await ApiService.getUserStations(userId);
      const favs = Array.isArray(data) ? data : [];
      setFavoriteStations(favs);
      if (!isShowingNearby) {
        setStations(favs);
      }
    } catch (error) {
      console.error('Error loading user stations:', error);
      setStations([]);
    } finally {
      setLoading(false);
    }
  };

  const requestLocationPermission = async () => {
    try {
      console.log('Requesting location permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('sto.locationPermission'),
          t('sto.locationPermissionMessage')
        );
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      console.log('Got location:', currentLocation?.coords);
      setLocation(currentLocation);
      await loadNearbyStations(currentLocation.coords.latitude, currentLocation.coords.longitude);
      await Analytics.track('sto_search_nearby', { radius: searchRadius });
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(t('common.error'), t('sto.failedToGetLocation'));
    } finally {
      setLoading(false);
    }
  };

  const loadNearbyStations = async (latitude: number, longitude: number) => {
    try {
      console.log('Searching nearby stations with lat/lng:', latitude, longitude, 'radius:', searchRadius);
      setIsSearchingNearby(true);
      setIsShowingNearby(true);
      setLoading(true);
      const stationsData = await ApiService.getNearbyStations(latitude, longitude, searchRadius);
      console.log('Nearby stations response:', stationsData);
      setStations(Array.isArray(stationsData) ? stationsData : []);
    } catch (error) {
      console.error('Error loading stations:', error);
      Alert.alert(t('common.error'), t('sto.failedToLoadStations'));
    } finally {
      setLoading(false);
      setIsSearchingNearby(false);
    }
  };

  const handleStationPress = (station: ServiceStation) => {
    setSelectedStation(station);
  };

  const handleCallStation = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert(t('common.information'), t('sto.phoneNotSpecified'));
    }
  };

  const handleNavigateToStation = async (station: ServiceStation) => {
    try {
      const hasCoords = Number(station.latitude) && Number(station.longitude);
      const url = hasCoords
        ? `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(station.address || station.name)}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        await Analytics.track('sto_route_opened', { station_id: (station as any).id });
      } else {
        Alert.alert(t('common.error'), 'Cannot open maps URL');
      }
    } catch (e) {
      Alert.alert(t('common.error'), 'Failed to launch maps');
    }
  };

  const handleAddStation = () => {
    setEditingStation(null);
    setIsModalOpen(true);
  };

  const handleEditStation = (station: ServiceStation) => {
    setEditingStation(station);
    setIsModalOpen(true);
  };

  const handleAddToFavorites = (station: ServiceStation) => {
    // Pre-fill the form with station data from search results
    const prefilledStation = {
      ...station,
      description: station.name, // Use name as description if no description
      phone: station.phone || '',
      website: station.website || '',
      latitude: station.latitude || 0,
      longitude: station.longitude || 0,
      rating: station.rating || 0,
      distance: station.distance || 0,
    };
    setEditingStation(prefilledStation);
    setIsModalOpen(true);
    Analytics.track('sto_add_favorite', { station_id: (station as any).id });
  };

  const handleStationAdded = () => {
    loadUserStations();
  };

  const formatDistance = (distance: number): string => {
    if (distance < 1000) {
      return `${Math.round(distance)} ${t('sto.meters')}`;
    }
    return `${(distance / 1000).toFixed(1)} ${t('sto.kilometers')}`;
  };

  if (loading) {
    return <LoadingSpinner text={t('sto.searchingStations')} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['left','right']}>

      {viewMode === 'list' ? (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', marginHorizontal: SPACING.lg, marginTop: SPACING.md }}>
            <Button title={t('common.add')} onPress={handleAddStation} style={{ flex: 1, marginRight: 4 }} />
            <Button title={t('sto.searchingStations')} onPress={() => requestLocationPermission()} variant="outline" style={{ flex: 1, marginLeft: 4 }} />
          </View>
          
          {/* Radius Selector */}
          <View style={styles.radiusSelector}>
            <TouchableOpacity 
              style={styles.radiusButton} 
              onPress={() => setShowRadiusSelector(!showRadiusSelector)}
            >
              <Icon name="map-marker" size={16} color={COLORS.accent} />
              <Text style={styles.radiusButtonText}>
                {searchRadius < 1000 ? `${searchRadius}m` : `${searchRadius/1000}km`}
              </Text>
              <Icon name={showRadiusSelector ? "chevron-up" : "chevron-down"} size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
            
            {showRadiusSelector && (
              <View style={styles.radiusOptions}>
                {[
                  { value: 1000, label: '1km' },
                  { value: 2500, label: '2.5km' },
                  { value: 5000, label: '5km' },
                  { value: 10000, label: '10km' },
                  { value: 25000, label: '25km' },
                  { value: 50000, label: '50km' }
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.radiusOption,
                      searchRadius === option.value && styles.radiusOptionSelected
                    ]}
                    onPress={() => {
                      setSearchRadius(option.value);
                      setShowRadiusSelector(false);
                    }}
                  >
                    <Text style={[
                      styles.radiusOptionText,
                      searchRadius === option.value && styles.radiusOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          {isSearchingNearby && (
            <Text style={{ color: COLORS.textSecondary, marginHorizontal: SPACING.lg, marginTop: SPACING.sm }}>
              {t('sto.searchingStations')}
            </Text>
          )}
          {isShowingNearby && !isSearchingNearby && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg, marginTop: SPACING.sm }}>
              <Text style={{ color: COLORS.textSecondary, flex: 1 }}>{`Знайдено: ${stations.length}`}</Text>
              <Button title={'Показати обрані'} onPress={() => { setIsShowingNearby(false); setStations(favoriteStations); }} size="small" variant="outline" />
            </View>
          )}
          {stations.length === 0 ? (
            <Card style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>{t('sto.noFavorites') || 'У вас нет избраных CTO'}</Text>
            </Card>
          ) : (
            stations.map((station) => (
              <Card key={station.id} style={styles.stationCard}>
                <View style={styles.stationHeader}>
                  <View style={styles.stationInfo}>
                    <View style={styles.stationTitleRow}>
                      <Text
                        style={styles.stationName}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {station.name}
                      </Text>
                      {isShowingNearby ? (
                        <TouchableOpacity
                          onPress={() => handleAddToFavorites(station)}
                          style={styles.favoriteButton}
                        >
                          <Icon name="heart-plus" size={16} color={COLORS.accent} />
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.stationIconActions}>
                          <TouchableOpacity
                            onPress={() => handleEditStation(station)}
                            style={styles.iconActionButton}
                          >
                            <Icon name="edit" size={16} color={COLORS.text} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={async () => { try { setLoading(true); await ApiService.deleteUserStation((station as any).id as any); await loadUserStations(); } catch (e) { Alert.alert(t('common.error'), 'Failed to delete'); } finally { setLoading(false); } }}
                            style={styles.iconActionButton}
                          >
                            <Icon name="delete" size={16} color={COLORS.error} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    <Text style={styles.stationDescription}>{station.description}</Text>
                    <Text style={styles.stationAddress}>{station.address}</Text>
                  </View>
                </View>

                <View style={styles.stationTypes}>
                  {(station.types || []).map((type, index) => (
                    <View key={index} style={styles.typeTag}>
                      <Text style={styles.typeTagText}>{type}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.stationActions}>
                  {station.phone && (
                    <Button
                      title={t('sto.call')}
                      onPress={() => handleCallStation(station.phone!)}
                      variant="outline"
                      size="small"
                      style={styles.actionButton}
                      icon="phone"
                    />
                  )}
                  <Button
                    title={t('sto.route')}
                    onPress={() => handleNavigateToStation(station)}
                    variant="outline"
                    size="small"
                    style={styles.actionButton}
                    icon="navigation"
                  />
                  </View>
              </Card>
            ))
          )}
        </ScrollView>
      ) : (
        <View style={styles.mapContainer}>
          {location && (
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              showsUserLocation
              showsMyLocationButton
            >
              {stations.map((station) => (
                <Marker
                  key={station.id}
                  coordinate={{
                    latitude: station.latitude,
                    longitude: station.longitude,
                  }}
                  title={station.name}
                  description={station.address}
                  onPress={() => handleStationPress(station)}
                />
              ))}
            </MapView>
          )}
        </View>
      )}

      {selectedStation && (
        <View style={styles.selectedStationInfo}>
          <Text style={styles.selectedStationName}>{selectedStation.name}</Text>
          <Text style={styles.selectedStationAddress}>{selectedStation.address}</Text>
          <View style={styles.selectedStationActions}>
            {selectedStation.phone && (
              <Button
                title={t('sto.call')}
                onPress={() => handleCallStation(selectedStation.phone!)}
                variant="outline"
                size="small"
                style={styles.selectedActionButton}
                icon="phone"
              />
            )}
            <Button
              title={t('sto.route')}
              onPress={() => handleNavigateToStation(selectedStation)}
              variant="outline"
              size="small"
              style={styles.selectedActionButton}
              icon="navigation"
            />
            {isShowingNearby && (
              <Button
                title={t('sto.addToFavorites') || 'Добавить в избранное'}
                onPress={() => handleAddToFavorites(selectedStation)}
                variant="primary"
                size="small"
                style={styles.selectedActionButton}
                icon="heart-plus"
              />
            )}
          </View>
        </View>
      )}

      <STOModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStationAdded={handleStationAdded}
        editingStation={editingStation}
        userId={userId}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  viewModeSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 4,
  },
  viewModeButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 6,
  },
  viewModeButtonActive: {
    backgroundColor: COLORS.accent,
  },
  viewModeText: {
    fontSize: 16,
  },
  viewModeTextActive: {
    color: COLORS.accent,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    margin: SPACING.lg,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  stationCard: {
    margin: SPACING.lg,
  },
  stationHeader: {
    marginBottom: SPACING.md,
  },
  stationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stationIconActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  stationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    flexShrink: 1,
    flexGrow: 1,
    minWidth: 0,
  },
  iconActionButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  favoriteButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.sm,
    backgroundColor: COLORS.accent + '20',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
  },
  stationInfo: {
    flex: 1,
  },
  stationAddress: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  stationDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  stationRating: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: COLORS.text,
  },
  distanceText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '500',
  },
  stationTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.md,
  },
  typeTag: {
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 10,
    marginRight: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  typeTagText: {
    fontSize: 12,
    color: COLORS.text,
  },
  stationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg
  },
  
  actionButton: {
    flex: 1,
    marginHorizontal: 2,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  selectedStationInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  selectedStationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  selectedStationAddress: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  selectedStationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectedActionButton: {
    flex: 1,
    marginHorizontal: 2,
  },
  radiusSelector: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
  },
  radiusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  radiusButtonText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  radiusOptions: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
    paddingVertical: SPACING.xs,
  },
  radiusOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  radiusOptionSelected: {
    backgroundColor: COLORS.accent + '20',
  },
  radiusOptionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  radiusOptionTextSelected: {
    color: COLORS.accent,
    fontWeight: '500',
  },
});

export default STOScreen;
