export interface MapCoordinates {
  lat: number;
  lng: number;
}

export interface MapSearchResult {
  id: string;
  name: string;
  secondaryText: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  pincode?: string;
  isMapGeocoded?: boolean;
  provider: 'google' | 'osm' | 'local';
  building?: string;
  road?: string;
  area?: string;
  city?: string;
}

export interface ReverseGeocodeResult {
  formattedAddress: string;
  street: string;
  locality: string;
  suburb?: string;
  city: string;
  state?: string;
  pincode: string;
  lat: number;
  lng: number;
  provider: 'google' | 'osm';
}

export interface MapInitOptions {
  center: MapCoordinates;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  onMoveStart?: () => void;
  onMove?: (coords: MapCoordinates) => void;
  onMoveEnd?: (coords: MapCoordinates) => void;
}

export interface IMapInstance {
  setCenter(coords: MapCoordinates): void;
  getCenter(): MapCoordinates;
  flyTo(coords: MapCoordinates, zoom?: number): void;
  zoomIn(): void;
  zoomOut(): void;
  invalidateSize(): void;
  destroy(): void;
}

export interface IMapProvider {
  readonly name: 'google' | 'osm';
  isAvailable(): boolean;
  initialize(container: HTMLElement, options: MapInitOptions): Promise<IMapInstance>;
  searchPlaces(query: string, locationBias?: MapCoordinates): Promise<MapSearchResult[]>;
  reverseGeocode(coords: MapCoordinates): Promise<ReverseGeocodeResult>;
  getPlaceDetails?(placeId: string): Promise<{
    lat: number;
    lng: number;
    name?: string;
    formattedAddress?: string;
    pincode?: string;
  } | null>;
}
