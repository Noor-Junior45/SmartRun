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

    if (!status.apiKey || !status.billingEnabled) {
      throw new Error('Google Maps billing is not active on this project');
    }

    const loaded = await loadGoogleMapsScript(status.apiKey);
    if (!loaded || !(window as any).google?.maps?.Map) {
      throw new Error('Google Maps JavaScript SDK failed to load');
    }

    return this.initializeNativeGoogleMap(container, options);
  }

  private initializeNativeGoogleMap(container: HTMLElement, options: MapInitOptions): IMapInstance {
    const google = (window as any).google;
    const initialCenter = { lat: options.center.lat, lng: options.center.lng };

    // Zomato-inspired clean white map styling with prominent building footprints,
    // clear building names and road hierarchy
    const ZOMATO_PIN_MAP_STYLES = [
      { elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
      { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
      // Building footprints & outlines (Zomato 3D/2D building look)
      { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#f1f5f9' }] },
      { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#e2e8f0' }] },
      { featureType: 'landscape.man_made', elementType: 'labels.text.fill', stylers: [{ color: '#334155' }, { visibility: 'on' }] },
      { featureType: 'landscape.man_made', elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 2 }] },
      // Clean roads
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
      { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e2e8f0' }] },
      { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
      { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 2 }] },
      { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
      { featureType: 'road.arterial', elementType: 'geometry.stroke', stylers: [{ color: '#cbd5e1' }] },
      { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
      { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#94a3b8' }] },
      // Parks & Greenery
      { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#ecfdf5' }] },
      { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#059669' }] },
      // Water
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e0f2fe' }] },
      { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#0284c7' }] },
      // Keep building/point of interest labels clean and legible
      { featureType: 'poi.business', stylers: [{ visibility: 'simplified' }] },
      { featureType: 'poi.government', stylers: [{ visibility: 'simplified' }] },
      { featureType: 'poi.school', stylers: [{ visibility: 'simplified' }] },
      { featureType: 'poi.medical', stylers: [{ visibility: 'simplified' }] },
      { featureType: 'transit', stylers: [{ visibility: 'off' }] }
    ];

    const map = new google.maps.Map(container, {
      center: initialCenter,
      zoom: options.zoom || 18,
      minZoom: options.minZoom || 11,
      maxZoom: options.maxZoom || 20,
      tilt: 45, // 2D with 3D building perspective tilt
      heading: 0,
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: 'greedy',
      keyboardShortcuts: false,
      styles: ZOMATO_PIN_MAP_STYLES,
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
            locality: r.locality || 'Kolkata',
            suburb: r.suburb,
            city: r.city || 'Kolkata',
            state: r.state || 'West Bengal',
            pincode: r.pincode || '700001',
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
            pincode: postcode || '700001',
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
