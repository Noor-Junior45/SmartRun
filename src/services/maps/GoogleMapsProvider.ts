import { IMapProvider, IMapInstance, MapCoordinates, MapInitOptions, MapSearchResult, ReverseGeocodeResult } from './types';
import { API_BASE_URL } from '../../lib/apiBase';
import { generateSecureToken } from '../../utils/cryptoHelper';
import { getSynchronousGoogleMapsKey, resolveGoogleMapsApiKey, getGoogleMapsStatus } from './googleMapsConfig';

let googleMapsScriptLoadingPromise: Promise<boolean> | null = null;

// Global usage attribution identifier for Google Maps Platform in AI Studio
const USAGE_ATTRIBUTION_ID = 'gmp_mcp_codeassist_v1_aistudio';

/**
 * Loads the official Google Maps JavaScript API SDK asynchronously
 */
export async function loadGoogleMapsScript(apiKey: string): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  if ((window as any).google && (window as any).google.maps && (window as any).google.maps.Map) {
    return Promise.resolve(true);
  }

  if (googleMapsScriptLoadingPromise) {
    return googleMapsScriptLoadingPromise;
  }

  googleMapsScriptLoadingPromise = new Promise((resolve) => {
    const existingScript = document.getElementById('google-maps-js-sdk') as HTMLScriptElement | null;
    if (existingScript) {
      if ((window as any).google?.maps?.Map) {
        resolve(true);
      } else {
        existingScript.addEventListener('load', () => resolve(Boolean((window as any).google?.maps?.Map)));
        existingScript.addEventListener('error', () => resolve(false));
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-js-sdk';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places,geometry,marker,routes&loading=async`;
    script.async = true;
    script.defer = true;

    const timeout = setTimeout(() => {
      console.warn('[GoogleMapsProvider] Google Maps script load timeout');
      resolve(Boolean((window as any).google?.maps?.Map));
    }, 8000);

    script.onload = () => {
      clearTimeout(timeout);
      resolve(Boolean((window as any).google?.maps?.Map));
    };

    script.onerror = (e) => {
      clearTimeout(timeout);
      console.warn('[GoogleMapsProvider] Google Maps script failed to load:', e);
      resolve(false);
    };

    document.head.appendChild(script);
  });

  return googleMapsScriptLoadingPromise;
}

export class GoogleMapsProvider implements IMapProvider {
  readonly name = 'google' as const;

  isAvailable(): boolean {
    const key = getSynchronousGoogleMapsKey();
    return Boolean(key && key.length > 10);
  }

  async initialize(container: HTMLElement, options: MapInitOptions): Promise<IMapInstance> {
    container.innerHTML = '';
    const status = await getGoogleMapsStatus();
    const apiKey = status.apiKey || getSynchronousGoogleMapsKey();

    if (!apiKey) {
      throw new Error('Google Maps API key is not configured');
    }

    const loaded = await loadGoogleMapsScript(apiKey);
    if (!loaded || !(window as any).google?.maps?.Map) {
      throw new Error('Google Maps JavaScript SDK failed to load');
    }

    return this.initializeNativeGoogleMap(container, options);
  }

  private initializeNativeGoogleMap(container: HTMLElement, options: MapInitOptions): IMapInstance {
    const google = (window as any).google;
    const initialCenter = { lat: options.center.lat, lng: options.center.lng };

    // Ultra-clean White Format with prominent visible building footprints, outlines, and building labels
    const WHITE_FORMAT_BUILDING_MAP_STYLES = [
      // 1. Pure crisp white background for all land & base canvas
      { elementType: 'geometry', stylers: [{ color: '#ffffff' }] },

      // 2. Keep icons clean and simplified for clarity
      { elementType: 'labels.icon', stylers: [{ visibility: 'simplified' }] },

      // 3. Buildings & Man-Made Structures (Clearly visible building footprints, 3D outlines & names)
      {
        featureType: 'landscape.man_made',
        elementType: 'geometry.fill',
        stylers: [{ color: '#f1f5f9' }, { visibility: 'on' }]
      },
      {
        featureType: 'landscape.man_made',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#cbd5e1' }, { weight: 1.2 }, { visibility: 'on' }]
      },
      {
        featureType: 'landscape.man_made',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#1e293b' }, { visibility: 'on' }]
      },
      {
        featureType: 'landscape.man_made',
        elementType: 'labels.text.stroke',
        stylers: [{ color: '#ffffff' }, { weight: 2.5 }, { visibility: 'on' }]
      },

      // 4. Points of Interest, Commercial Complexes & Residential Buildings
      {
        featureType: 'poi',
        elementType: 'geometry.fill',
        stylers: [{ color: '#f1f5f9' }, { visibility: 'on' }]
      },
      {
        featureType: 'poi',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#cbd5e1' }, { weight: 1.2 }, { visibility: 'on' }]
      },
      {
        featureType: 'poi',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#0f172a' }, { visibility: 'on' }]
      },
      {
        featureType: 'poi',
        elementType: 'labels.text.stroke',
        stylers: [{ color: '#ffffff' }, { weight: 2.5 }]
      },
      { featureType: 'poi.business', stylers: [{ visibility: 'on' }] },
      { featureType: 'poi.government', stylers: [{ visibility: 'on' }] },
      { featureType: 'poi.school', stylers: [{ visibility: 'on' }] },
      { featureType: 'poi.medical', stylers: [{ visibility: 'on' }] },

      // 5. Clean White Roads with soft gray borders
      {
        featureType: 'road',
        elementType: 'geometry.fill',
        stylers: [{ color: '#ffffff' }]
      },
      {
        featureType: 'road',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#e2e8f0' }, { weight: 1 }]
      },
      {
        featureType: 'road',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#475569' }]
      },
      {
        featureType: 'road',
        elementType: 'labels.text.stroke',
        stylers: [{ color: '#ffffff' }, { weight: 2 }]
      },
      {
        featureType: 'road.arterial',
        elementType: 'geometry.fill',
        stylers: [{ color: '#ffffff' }]
      },
      {
        featureType: 'road.arterial',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#cbd5e1' }, { weight: 1.2 }]
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry.fill',
        stylers: [{ color: '#f8fafc' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#94a3b8' }, { weight: 1.5 }]
      },

      // 6. Parks & Greenery (subtle light pastel green)
      {
        featureType: 'poi.park',
        elementType: 'geometry.fill',
        stylers: [{ color: '#f0fdf4' }]
      },
      {
        featureType: 'poi.park',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#dcfce7' }, { weight: 1 }]
      },
      {
        featureType: 'poi.park',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#15803d' }]
      },

      // 7. Water (soft subtle light blue)
      {
        featureType: 'water',
        elementType: 'geometry.fill',
        stylers: [{ color: '#e0f2fe' }]
      },
      {
        featureType: 'water',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#0284c7' }]
      },

      // 8. Transit
      { featureType: 'transit', stylers: [{ visibility: 'simplified' }] }
    ];

    const map = new google.maps.Map(container, {
      center: initialCenter,
      zoom: options.zoom || 18,
      minZoom: options.minZoom || 11,
      maxZoom: options.maxZoom || 20,
      tilt: 45, // 3D building perspective tilt
      heading: 0,
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: 'greedy',
      keyboardShortcuts: false,
      styles: WHITE_FORMAT_BUILDING_MAP_STYLES,
      internalUsageAttributionIds: [USAGE_ATTRIBUTION_ID]
    });

    map.addListener('dragstart', () => {
      options.onMoveStart?.();
    });

    map.addListener('center_changed', () => {
      const center = map.getCenter();
      if (center) {
        options.onMove?.({ lat: center.lat(), lng: center.lng() });
      }
    });

    map.addListener('idle', () => {
      const center = map.getCenter();
      if (center) {
        options.onMoveEnd?.({ lat: center.lat(), lng: center.lng() });
      }
    });

    let liveLocationMarker: any = null;
    let liveLocationAccuracyCircle: any = null;

    const instance: IMapInstance = {
      setCenter: (coords: MapCoordinates) => {
        map.setCenter({ lat: coords.lat, lng: coords.lng });
      },
      getCenter: (): MapCoordinates => {
        const c = map.getCenter();
        return { lat: c ? c.lat() : options.center.lat, lng: c ? c.lng() : options.center.lng };
      },
      flyTo: (coords: MapCoordinates, zoom = 18) => {
        map.panTo({ lat: coords.lat, lng: coords.lng });
        if (zoom) map.setZoom(zoom);
      },
      zoomIn: () => {
        const z = map.getZoom() || 18;
        map.setZoom(z + 1);
      },
      zoomOut: () => {
        const z = map.getZoom() || 18;
        map.setZoom(Math.max(1, z - 1));
      },
      invalidateSize: () => {
        google.maps.event.trigger(map, 'resize');
      },
      setLiveLocationMarker: (coords: MapCoordinates | null) => {
        try {
          if (!coords) {
            if (liveLocationMarker) {
              liveLocationMarker.setMap(null);
              liveLocationMarker = null;
            }
            if (liveLocationAccuracyCircle) {
              liveLocationAccuracyCircle.setMap(null);
              liveLocationAccuracyCircle = null;
            }
            return;
          }

          const position = { lat: coords.lat, lng: coords.lng };

          // 1. Soft pulsing light blue halo circle around live location (accuracy circle)
          if (!liveLocationAccuracyCircle) {
            liveLocationAccuracyCircle = new google.maps.Circle({
              strokeColor: '#2563EB',
              strokeOpacity: 0.35,
              strokeWeight: 1.5,
              fillColor: '#3B82F6',
              fillOpacity: 0.16,
              map,
              center: position,
              radius: 35,
              zIndex: 999990
            });
          } else {
            liveLocationAccuracyCircle.setCenter(position);
            liveLocationAccuracyCircle.setMap(map);
          }

          // 2. High-precision Blue Dot marker with crisp white outline and soft glow
          const blueDotSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
            <circle cx="14" cy="14" r="12" fill="#3B82F6" fill-opacity="0.3" stroke="#2563EB" stroke-width="1.5" />
            <circle cx="14" cy="14" r="7" fill="#1D4ED8" stroke="#FFFFFF" stroke-width="2.5" />
          </svg>`;
          const blueDotIcon = {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(blueDotSvg),
            scaledSize: new google.maps.Size(28, 28),
            anchor: new google.maps.Point(14, 14)
          };

          if (!liveLocationMarker) {
            liveLocationMarker = new google.maps.Marker({
              position,
              map,
              icon: blueDotIcon,
              title: 'Your Live Location',
              zIndex: 999999,
              optimized: false
            });
          } else {
            liveLocationMarker.setPosition(position);
            liveLocationMarker.setIcon(blueDotIcon);
            liveLocationMarker.setMap(map);
          }
        } catch (e) {
          console.warn('[GoogleMapsProvider] setLiveLocationMarker notice:', e);
        }
      },
      getNativeMap: () => map,
      setTilt: (t: number) => {
        try {
          map.setTilt(t);
        } catch {}
      },
      getTilt: (): number => {
        try {
          return map.getTilt() || 0;
        } catch {
          return 0;
        }
      },
      toggle3D: (): boolean => {
        try {
          const current = map.getTilt() || 0;
          const next = current > 20 ? 0 : 45;
          map.setTilt(next);
          return next > 0;
        } catch {
          return false;
        }
      },
      destroy: () => {
        try {
          if (liveLocationMarker) {
            liveLocationMarker.setMap(null);
            liveLocationMarker = null;
          }
          if (liveLocationAccuracyCircle) {
            liveLocationAccuracyCircle.setMap(null);
            liveLocationAccuracyCircle = null;
          }
        } catch {}
        google.maps.event.clearInstanceListeners(map);
        container.innerHTML = '';
      }
    };

    return instance;
  }

  async searchPlaces(query: string, locationBias?: MapCoordinates): Promise<MapSearchResult[]> {
    const q = query.trim() || 'all';

    try {
      const biasParam = locationBias ? `&lat=${locationBias.lat}&lng=${locationBias.lng}` : '';
      const response = await fetch(`${API_BASE_URL}/api/maps/places-autocomplete?input=${encodeURIComponent(q)}${biasParam}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.results) && data.results.length > 0) {
          return data.results.map((r: any) => ({
            id: r.id || generateSecureToken('google', 8),
            name: r.name,
            secondaryText: r.secondaryText || 'Kolkata, West Bengal',
            building: r.building,
            road: r.road,
            area: r.area,
            city: r.city,
            lat: r.lat,
            lng: r.lng,
            placeId: r.placeId,
            pincode: r.pincode,
            isMapGeocoded: true,
            provider: 'google' as const
          }));
        }
      }
    } catch (err) {
      console.warn('[GoogleMapsProvider] searchPlaces error:', err);
    }

    throw new Error('Google Places search produced no results');
  }

  async reverseGeocode(coords: MapCoordinates): Promise<ReverseGeocodeResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/maps/google/rev-geocode?lat=${coords.lat}&lng=${coords.lng}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.result) {
          const r = data.result;
          return {
            formattedAddress: r.formattedAddress || r.street || 'Kolkata',
            street: r.street || r.formattedAddress || 'Kolkata',
            building: r.building || '',
            locality: r.locality || 'Kolkata',
            suburb: r.suburb,
            city: r.city || 'Kolkata',
            state: r.state || 'West Bengal',
            pincode: r.pincode || '',
            lat: coords.lat,
            lng: coords.lng,
            provider: 'google' as const
          };
        }
      }
    } catch (err) {
      console.warn('[GoogleMapsProvider] reverseGeocode proxy error:', err);
    }

    // Secondary fallback geocoding via Nominatim
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const addr = data.address;
          const road = addr.road || addr.street || addr.pedestrian || addr.footway || '';
          const suburb = addr.suburb || addr.neighbourhood || addr.residential || addr.quarter || addr.city_district || '';
          const building = addr.building || addr.amenity || addr.shop || '';
          const postcode = addr.postcode || '';

          const parts = [building, road, suburb].filter(Boolean);
          const resolvedStreet = parts.join(', ') || data.display_name?.split(',').slice(0, 3).join(', ') || 'Kolkata';

          return {
            formattedAddress: data.display_name || resolvedStreet,
            street: resolvedStreet,
            locality: suburb || addr.city || 'Kolkata',
            suburb: suburb,
            city: addr.city || addr.state_district || 'Kolkata',
            state: addr.state || 'West Bengal',
            pincode: postcode || '',
            lat: coords.lat,
            lng: coords.lng,
            provider: 'google' as const
          };
        }
      }
    } catch (err) {
      console.warn('[GoogleMapsProvider] fallback reverse geocode failed:', err);
    }

    throw new Error('Google reverse geocoding unavailable');
  }

  async getPlaceDetails(placeId: string): Promise<{
    lat: number;
    lng: number;
    name?: string;
    formattedAddress?: string;
    pincode?: string;
  } | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/maps/place-details?placeId=${encodeURIComponent(placeId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.lat && data.lng) {
          return {
            lat: data.lat,
            lng: data.lng,
            name: data.name,
            formattedAddress: data.formattedAddress,
            pincode: data.pincode
          };
        }
      }
    } catch (err) {
      console.warn('[GoogleMapsProvider] getPlaceDetails error:', err);
    }
    return null;
  }
}
