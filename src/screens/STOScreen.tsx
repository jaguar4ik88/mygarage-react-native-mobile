import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import Icon from '../components/Icon';
import STOModal from '../components/STOModal';
import ScreenBackLink from '../components/ScreenBackLink';
import { COLORS, FONTS, SPACING, RADIUS, ACTION_COLORS, hexToRgba } from '../constants';
import ApiService from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ServiceStation } from '../types';
import Analytics from '../services/analyticsService';

const STOScreen: React.FC = () => {
  const { t } = useLanguage();
  const { appearanceKey } = useTheme();
  const styles = useMemo(() => createStyles(), [appearanceKey]);
  const navigation = useNavigation();
  const { user } = useAuth();
  const [stations, setStations] = useState<ServiceStation[]>([]);
  const [favoriteStations, setFavoriteStations] = useState<ServiceStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [selectedStation, setSelectedStation] = useState<ServiceStation | null>(null);
  const [viewMode] = useState<'list' | 'map'>('list');
  const [userId, setUserId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<ServiceStation | null>(null);
  const [isSearchingNearby, setIsSearchingNearby] = useState(false);
  const [isShowingNearby, setIsShowingNearby] = useState(false);
  const [searchRadius, setSearchRadius] = useState(5000);
  const [showRadiusSelector, setShowRadiusSelector] = useState(false);

  const showBack = typeof navigation.canGoBack === 'function' && navigation.canGoBack();

  useEffect(() => {
    setLoading(false);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (!user?.id) {
        return;
      }

      setUserId(user.id);

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
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('sto.locationPermission'), t('sto.locationPermissionMessage'));
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
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
      setIsSearchingNearby(true);
      setIsShowingNearby(true);
      setLoading(true);
      const stationsData = await ApiService.getNearbyStations(latitude, longitude, searchRadius);
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
    } catch {
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
    const prefilledStation = {
      ...station,
      description: station.name,
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

  const confirmDeleteStation = (station: ServiceStation) => {
    Alert.alert(t('vehicleDetail.deleteVehicle'), t('vehicleDetail.deleteVehicleConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('documents.delete.confirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await ApiService.deleteUserStation((station as any).id as any);
            await loadUserStations();
          } catch {
            Alert.alert(t('common.error'), t('vehicleDetail.failedToDeleteVehicle'));
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const formatDistance = (distance: number): string => {
    if (distance < 1000) {
      return `${Math.round(distance)} ${t('sto.meters')}`;
    }
    return `${(distance / 1000).toFixed(1)} ${t('sto.kilometers')}`;
  };

  const radiusOptions = [
    { value: 1000, label: '1km' },
    { value: 2500, label: '2.5km' },
    { value: 5000, label: '5km' },
    { value: 10000, label: '10km' },
    { value: 25000, label: '25km' },
    { value: 50000, label: '50km' },
  ];

  const renderStationRow = (station: ServiceStation) => (
    <View key={String(station.id)} style={styles.stationRow}>
      <View style={styles.stationIconWrap}>
        <Icon name="sto" size={22} color={COLORS.textSecondary} />
      </View>
      <View style={styles.stationBody}>
        <View style={styles.stationTitleRow}>
          <Text style={styles.stationName} numberOfLines={2}>
            {station.name}
          </Text>
          <View style={styles.stationActionsTop}>
            {isShowingNearby ? (
              <TouchableOpacity
                onPress={() => handleAddToFavorites(station)}
                style={styles.iconHit}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t('sto.addToFavorites')}
              >
                <Icon name="heart-plus" size={20} color={COLORS.accent} />
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => handleEditStation(station)}
                  style={styles.iconHit}
                  hitSlop={12}
                >
                  <Icon name="edit" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => confirmDeleteStation(station)}
                  style={styles.iconHit}
                  hitSlop={12}
                >
                  <Icon name="delete" size={18} color={ACTION_COLORS.colorDelete} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
        {!!station.description && station.description !== station.name ? (
          <Text style={styles.stationDesc} numberOfLines={2}>
            {station.description}
          </Text>
        ) : null}
        {!!station.address ? (
          <Text style={styles.stationAddress} numberOfLines={2}>
            {station.address}
          </Text>
        ) : null}
        {isShowingNearby && station.distance != null && station.distance > 0 ? (
          <Text style={styles.stationDistance}>{formatDistance(station.distance)}</Text>
        ) : null}
        {(station.types || []).length > 0 ? (
          <View style={styles.tagRow}>
            {(station.types || []).map((type, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{type}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <View style={styles.linkRow}>
          {station.phone ? (
            <TouchableOpacity
              style={styles.linkChip}
              onPress={() => handleCallStation(station.phone!)}
              activeOpacity={0.85}
            >
              <Icon name="phone" size={16} color={COLORS.accent} />
              <Text style={styles.linkChipText}>{t('sto.call')}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.linkChip}
            onPress={() => handleNavigateToStation(station)}
            activeOpacity={0.85}
          >
            <Icon name="navigation" size={16} color={COLORS.accent} />
            <Text style={styles.linkChipText}>{t('sto.route')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {viewMode === 'list' ? (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {loading && stations.length === 0 ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="small" color={COLORS.accent} />
            </View>
          ) : null}

          {showBack ? <ScreenBackLink onPress={() => navigation.goBack()} /> : null}

          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderText}>
              <Text style={styles.pageTitle}>{t('sto.title')}</Text>
              <Text style={styles.pageSub}>{t('sto.pageSubtitle')}</Text>
            </View>
            <TouchableOpacity
              onPress={handleAddStation}
              style={styles.addFab}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('common.add')}
            >
              <Icon name="plus" size={20} color={COLORS.background} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.nearbyBtn}
            onPress={requestLocationPermission}
            activeOpacity={0.85}
          >
            <Icon name="pin" size={18} color={COLORS.accent} />
            <Text style={styles.nearbyBtnText}>{t('sto.searchNearby')}</Text>
          </TouchableOpacity>

          <View style={styles.radiusBlock}>
            <TouchableOpacity
              style={styles.radiusButton}
              onPress={() => setShowRadiusSelector(!showRadiusSelector)}
              activeOpacity={0.85}
            >
              <Icon name="pin" size={16} color={COLORS.accent} />
              <Text style={styles.radiusButtonText}>
                {searchRadius < 1000 ? `${searchRadius}m` : `${searchRadius / 1000}km`}
              </Text>
              <Icon
                name={showRadiusSelector ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>

            {showRadiusSelector ? (
              <View style={styles.radiusOptions}>
                {radiusOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.radiusOption,
                      searchRadius === option.value && styles.radiusOptionSelected,
                    ]}
                    onPress={() => {
                      setSearchRadius(option.value);
                      setShowRadiusSelector(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.radiusOptionText,
                        searchRadius === option.value && styles.radiusOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>

          {isSearchingNearby ? (
            <Text style={styles.statusLine}>{t('sto.searchingStations')}</Text>
          ) : null}

          {isShowingNearby && !isSearchingNearby ? (
            <View style={styles.nearbyToolbar}>
              <Text style={styles.foundCount}>
                {t('sto.foundCount', { count: stations.length })}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsShowingNearby(false);
                  setStations(favoriteStations);
                }}
                style={styles.showFavBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.showFavBtnText}>{t('sto.showFavorites')}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {stations.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="sto" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>
                {isShowingNearby ? t('sto.noStationsFound') : t('sto.noFavorites')}
              </Text>
              <Text style={styles.emptyText}>
                {isShowingNearby ? t('sto.noStationsFoundText') : t('sto.pageSubtitle')}
              </Text>
            </View>
          ) : (
            <View style={styles.listBlock}>{stations.map(renderStationRow)}</View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.mapContainer}>
          {location ? (
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
          ) : null}
        </View>
      )}

      {selectedStation ? (
        <View style={styles.selectedSheet}>
          <Text style={styles.selectedName}>{selectedStation.name}</Text>
          <Text style={styles.selectedAddress}>{selectedStation.address}</Text>
          <View style={styles.selectedActions}>
            {selectedStation.phone ? (
              <TouchableOpacity
                style={styles.sheetChip}
                onPress={() => handleCallStation(selectedStation.phone!)}
              >
                <Text style={styles.sheetChipText}>{t('sto.call')}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.sheetChip}
              onPress={() => handleNavigateToStation(selectedStation)}
            >
              <Text style={styles.sheetChipText}>{t('sto.route')}</Text>
            </TouchableOpacity>
            {isShowingNearby ? (
              <TouchableOpacity
                style={[styles.sheetChip, styles.sheetChipPrimary]}
                onPress={() => handleAddToFavorites(selectedStation)}
              >
                <Text style={styles.sheetChipTextPrimary}>{t('sto.addToFavorites')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}

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

function createStyles() {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.xxl,
    },
    loaderWrap: {
      paddingVertical: SPACING.md,
      alignItems: 'center',
    },
    pageHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: SPACING.md,
      paddingTop: SPACING.sm,
      marginBottom: SPACING.lg,
    },
    pageHeaderText: {
      flex: 1,
      minWidth: 0,
    },
    pageTitle: {
      fontFamily: FONTS.bold,
      fontSize: 28,
      letterSpacing: -0.4,
      color: COLORS.text,
      marginBottom: 6,
    },
    pageSub: {
      fontFamily: FONTS.regular,
      fontSize: 14,
      color: COLORS.textSecondary,
      lineHeight: 20,
    },
    addFab: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: COLORS.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: SPACING.xs,
    },
    nearbyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      paddingVertical: 14,
      paddingHorizontal: SPACING.md,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
      marginBottom: SPACING.md,
    },
    nearbyBtnText: {
      fontFamily: FONTS.semiBold,
      fontSize: 13,
      color: COLORS.accent,
    },
    radiusBlock: {
      marginBottom: SPACING.md,
    },
    radiusButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.surface,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
      gap: SPACING.sm,
    },
    radiusButtonText: {
      flex: 1,
      fontFamily: FONTS.medium,
      fontSize: 14,
      color: COLORS.text,
    },
    radiusOptions: {
      marginTop: SPACING.xs,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
      overflow: 'hidden',
    },
    radiusOption: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    radiusOptionSelected: {
      backgroundColor: hexToRgba(COLORS.accent, 0.15),
    },
    radiusOptionText: {
      fontFamily: FONTS.regular,
      fontSize: 14,
      color: COLORS.text,
    },
    radiusOptionTextSelected: {
      fontFamily: FONTS.semiBold,
      color: COLORS.accent,
    },
    statusLine: {
      fontFamily: FONTS.regular,
      fontSize: 13,
      color: COLORS.textSecondary,
      marginBottom: SPACING.sm,
    },
    nearbyToolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.md,
      gap: SPACING.md,
    },
    foundCount: {
      flex: 1,
      fontFamily: FONTS.regular,
      fontSize: 13,
      color: COLORS.textSecondary,
    },
    showFavBtn: {
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    showFavBtnText: {
      fontFamily: FONTS.semiBold,
      fontSize: 12,
      color: COLORS.accent,
    },
    listBlock: {
      gap: SPACING.md,
    },
    stationRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING.md,
      padding: SPACING.md,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    stationIconWrap: {
      width: 44,
      height: 44,
      borderRadius: RADIUS.md,
      backgroundColor: hexToRgba(COLORS.text, 0.07),
      alignItems: 'center',
      justifyContent: 'center',
    },
    stationBody: {
      flex: 1,
      minWidth: 0,
    },
    stationTitleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: SPACING.sm,
    },
    stationName: {
      flex: 1,
      fontFamily: FONTS.semiBold,
      fontSize: 15,
      color: COLORS.text,
      minWidth: 0,
    },
    stationActionsTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
    },
    iconHit: {
      padding: SPACING.xs,
    },
    stationDesc: {
      fontFamily: FONTS.regular,
      fontSize: 13,
      color: COLORS.textSecondary,
      marginTop: 4,
      lineHeight: 18,
    },
    stationAddress: {
      fontFamily: FONTS.regular,
      fontSize: 13,
      color: COLORS.textMuted,
      marginTop: 4,
      lineHeight: 18,
    },
    stationDistance: {
      fontFamily: FONTS.medium,
      fontSize: 12,
      color: COLORS.accent,
      marginTop: 6,
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
      marginTop: SPACING.sm,
    },
    tag: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: 4,
      borderRadius: RADIUS.sm,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.background,
    },
    tagText: {
      fontFamily: FONTS.medium,
      fontSize: 11,
      color: COLORS.textSecondary,
    },
    linkRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
      marginTop: SPACING.md,
    },
    linkChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.background,
    },
    linkChipText: {
      fontFamily: FONTS.semiBold,
      fontSize: 12,
      color: COLORS.accent,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: SPACING.xxl,
      paddingHorizontal: SPACING.md,
    },
    emptyTitle: {
      fontFamily: FONTS.bold,
      fontSize: 18,
      color: COLORS.text,
      marginTop: SPACING.md,
      marginBottom: SPACING.sm,
      textAlign: 'center',
    },
    emptyText: {
      fontFamily: FONTS.regular,
      fontSize: 14,
      color: COLORS.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    mapContainer: {
      flex: 1,
    },
    map: {
      flex: 1,
    },
    selectedSheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: COLORS.surface,
      padding: SPACING.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: COLORS.border,
    },
    selectedName: {
      fontFamily: FONTS.bold,
      fontSize: 17,
      letterSpacing: -0.2,
      color: COLORS.text,
      marginBottom: 4,
    },
    selectedAddress: {
      fontFamily: FONTS.regular,
      fontSize: 13,
      color: COLORS.textSecondary,
      marginBottom: SPACING.md,
    },
    selectedActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
    },
    sheetChip: {
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.background,
    },
    sheetChipPrimary: {
      backgroundColor: COLORS.accent,
      borderColor: COLORS.accent,
    },
    sheetChipText: {
      fontFamily: FONTS.semiBold,
      fontSize: 12,
      color: COLORS.accent,
    },
    sheetChipTextPrimary: {
      fontFamily: FONTS.semiBold,
      fontSize: 12,
      color: COLORS.background,
    },
  });
}

export default STOScreen;
