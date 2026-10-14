import { IMapProvider, IMapInstance, MapCoordinates, MapInitOptions, MapSearchResult, ReverseGeocodeResult } from './types';
import { GoogleMapsProvider } from './GoogleMapsProvider';
import { OsmProvider } from './OsmProvider';
import { getResilientCurrentPosition } from '../../utils/geolocationHelper';

export class MapProviderManager {
  private static instance: MapProviderManager | null = null;
  private googleProvider: GoogleMapsProvider;
  private osmProvider: OsmProvider;
  private activeProviderName: 'google' | 'osm' = 'google';

  private constructor() {
    this.googleProvider = new GoogleMapsProvider();
    this.osmProvider = new OsmProvider();

    if (this.googleProvider.isAvailable()) {
      this.activeProviderName = 'google';
    } else {
      this.activeProviderName = 'osm';
    }
  }

  public static getInstance(): MapProviderManager {
    if (!MapProviderManager.instance) {
      MapProviderManager.instance = new MapProviderManager();
    }
    return MapProviderManager.instance;
  }

  public getActiveProviderName(): 'google' | 'osm' {
    return this.activeProviderName;
  }

  public getProviderStatus(): {
    primary: { name: string; available: boolean; active: boolean };
    fallback: { name: string; available: boolean; active: boolean };
  } {
    return {
      primary: {
        name: 'Google Maps (Primary)',
        available: this.googleProvider.isAvailable(),
        active: this.activeProviderName === 'google'
      },
      fallback: {
        name: 'OpenStreetMap (Fallback)',
        available: true,
        active: this.activeProviderName === 'osm'
      }
    };
  }

  public isGoogleMapsAvailable(): boolean {
    return this.googleProvider.isAvailable();
  }

  /**
   * Attempts full map re-initialization.
   */
  public async retryMap(container: HTMLElement, options: MapInitOptions): Promise<{
    instance: IMapInstance;
    provider: 'google' | 'osm';
  }> {
    return this.renderMap(container, options);
  }

  /**
   * Initializes the map in the given DOM container.
   * Tries Google Maps first, cascades to OSM.
   */
  public async renderMap(container: HTMLElement, options: MapInitOptions): Promise<{
    instance: IMapInstance;
    provider: 'google' | 'osm';
  }> {
    // 1. Try Google Maps first
    try {
      const instance = await this.googleProvider.initialize(container, options);
      this.activeProviderName = 'google';
      return { instance, provider: 'google' };
    } catch (err) {
      console.warn('[MapProviderManager] Google Maps failed to initialize, falling back to OSM:', err);
    }

    // 2. Fallback to OSM / Leaflet
    const instance = await this.osmProvider.initialize(container, options);
    this.activeProviderName = 'osm';
    return { instance, provider: 'osm' };
  }

  /**
   * Searches places using Google Maps (Places API New), cascading to OSM.
   */
  public async searchPlaces(query: string, locationBias?: MapCoordinates): Promise<MapSearchResult[]> {
    const q = query.trim() || 'all';

    // 1. Try Google Places
    try {
      const results = await this.googleProvider.searchPlaces(q, locationBias);
      if (results.length > 0) return results;
    } catch (e) {
      console.warn('[MapProviderManager] Google Places unavailable, trying OSM:', e);
    }

    // 2. Fallback to OSM
    try {
      const results = await this.osmProvider.searchPlaces(q);
      return results;
    } catch {
      return [];
    }
  }

  /**
   * Reverse geocodes coordinates to street & address details using Google Geocoding API.
   */
  public async reverseGeocode(coords: MapCoordinates): Promise<ReverseGeocodeResult> {
    // 1. Try Google Maps Geocoding / Proxy
    try {
      return await this.googleProvider.reverseGeocode(coords);
    } catch (e) {
      console.warn('[MapProviderManager] Google reverse geocode failed, trying OSM:', e);
    }

    // 2. Fallback to OSM
    return await this.osmProvider.reverseGeocode(coords);
  }

  /**
   * Gets current user coordinates using multi-tier resilient device GPS/network resolution.
   */
  public async getCurrentPosition(): Promise<MapCoordinates> {
    const pos = await getResilientCurrentPosition();
    return {
      lat: pos.lat,
      lng: pos.lng
    };
  }

  /**
   * Fetch Place Details by placeId (Google Maps)
   */
  public async getPlaceDetails(placeId: string) {
    if (this.googleProvider.getPlaceDetails) {
      return await this.googleProvider.getPlaceDetails(placeId);
    }
    return null;
  }
}

export const mapManager = MapProviderManager.getInstance();
