import { IMapProvider, IMapInstance, MapCoordinates, MapInitOptions, MapSearchResult, ReverseGeocodeResult } from './types';
import { GoogleMapsProvider } from './GoogleMapsProvider';
import { CartoProvider } from './CartoProvider';
import { OsmProvider } from './OsmProvider';
import { getResilientCurrentPosition } from '../../utils/geolocationHelper';

export class MapProviderManager {
  private static instance: MapProviderManager | null = null;
  private googleProvider: GoogleMapsProvider;
  private cartoProvider: CartoProvider;
  private osmProvider: OsmProvider;
  private activeProviderName: 'google' | 'carto' | 'osm' = 'google';
  private preferredProvider: 'google' | 'carto' = 'google';

  private constructor() {
    this.googleProvider = new GoogleMapsProvider();
    this.cartoProvider = new CartoProvider();
    this.osmProvider = new OsmProvider();

    if (this.googleProvider.isAvailable()) {
      this.activeProviderName = 'google';
      this.preferredProvider = 'google';
    } else {
      this.activeProviderName = 'carto';
      this.preferredProvider = 'carto';
    }
  }

  public static getInstance(): MapProviderManager {
    if (!MapProviderManager.instance) {
      MapProviderManager.instance = new MapProviderManager();
    }
    return MapProviderManager.instance;
  }

  public getActiveProviderName(): 'google' | 'carto' | 'osm' {
    return this.activeProviderName;
  }

  public setPreferredProvider(provider: 'google' | 'carto') {
    this.preferredProvider = provider;
  }

  public getPreferredProvider(): 'google' | 'carto' {
    return this.preferredProvider;
  }

  public getProviderStatus(): {
    primary: { name: string; available: boolean; active: boolean };
    carto: { name: string; available: boolean; active: boolean };
    fallback: { name: string; available: boolean; active: boolean };
  } {
    return {
      primary: {
        name: 'Google Maps (3D Vector)',
        available: this.googleProvider.isAvailable(),
        active: this.activeProviderName === 'google'
      },
      carto: {
        name: 'Carto Map (Clean HD)',
        available: true,
        active: this.activeProviderName === 'carto'
      },
      fallback: {
        name: 'OpenStreetMap (Base)',
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
  public async retryMap(
    container: HTMLElement,
    options: MapInitOptions,
    preferredProvider?: 'google' | 'carto'
  ): Promise<{
    instance: IMapInstance;
    provider: 'google' | 'carto' | 'osm';
  }> {
    return this.renderMap(container, options, preferredProvider);
  }

  /**
   * Initializes the map in the given DOM container.
   * Supports explicit preferredProvider ('google' or 'carto').
   */
  public async renderMap(
    container: HTMLElement,
    options: MapInitOptions,
    preferredProvider?: 'google' | 'carto'
  ): Promise<{
    instance: IMapInstance;
    provider: 'google' | 'carto' | 'osm';
  }> {
    const targetProvider = preferredProvider || this.preferredProvider;

    // If user explicitly chose Carto
    if (targetProvider === 'carto') {
      try {
        const instance = await this.cartoProvider.initialize(container, options);
        this.activeProviderName = 'carto';
        return { instance, provider: 'carto' };
      } catch (err) {
        console.warn('[MapProviderManager] Carto failed, attempting Google fallback:', err);
      }
    }

    // 1. Try Google Maps
    if (targetProvider !== 'carto') {
      try {
        const instance = await this.googleProvider.initialize(container, options);
        this.activeProviderName = 'google';
        return { instance, provider: 'google' };
      } catch (err) {
        console.warn('[MapProviderManager] Google Maps failed to initialize, falling back to Carto:', err);
      }
    }

    // 2. Fallback to Carto / Leaflet
    try {
      const instance = await this.cartoProvider.initialize(container, options);
      this.activeProviderName = 'carto';
      return { instance, provider: 'carto' };
    } catch (err) {
      console.warn('[MapProviderManager] Carto failed, falling back to OSM:', err);
    }

    // 3. Fallback to standard OSM
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

    // 2. Fallback to Carto / Nominatim
    try {
      const results = await this.cartoProvider.searchPlaces(q);
      if (results.length > 0) return results;
    } catch {
      // ignore
    }

    // 3. Fallback to OSM
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
      console.warn('[MapProviderManager] Google reverse geocode failed, trying Carto/OSM:', e);
    }

    // 2. Fallback to Carto / Nominatim
    try {
      return await this.cartoProvider.reverseGeocode(coords);
    } catch {
      // ignore
    }

    // 3. Fallback to OSM
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
