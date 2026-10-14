import L from 'leaflet';
import { IMapProvider, IMapInstance, MapCoordinates, MapInitOptions, MapSearchResult, ReverseGeocodeResult } from './types';

export class OsmProvider implements IMapProvider {
  readonly name = 'osm' as const;

  isAvailable(): boolean {
    return true; // Always available as base fallback
  }

  async initialize(container: HTMLElement, options: MapInitOptions): Promise<IMapInstance> {
    container.innerHTML = '';

    const map = L.map(container, {
      center: [options.center.lat, options.center.lng],
      zoom: options.zoom || 18,
      minZoom: options.minZoom || 11,
      maxZoom: options.maxZoom || 19,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    if (options.onMoveStart) {
      map.on('movestart', () => options.onMoveStart?.());
    }

    if (options.onMove) {
      map.on('move', () => {
        const c = map.getCenter();
        options.onMove?.({ lat: c.lat, lng: c.lng });
      });
    }

    if (options.onMoveEnd) {
      map.on('moveend', () => {
        const c = map.getCenter();
        options.onMoveEnd?.({ lat: c.lat, lng: c.lng });
      });
    }

    map.on('click', (e: any) => {
      if (e?.latlng) {
        map.panTo([e.latlng.lat, e.latlng.lng]);
        options.onClick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
        options.onMoveEnd?.({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    const instance: IMapInstance = {
      setCenter: (coords: MapCoordinates) => {
        map.setView([coords.lat, coords.lng]);
      },
      getCenter: (): MapCoordinates => {
        const c = map.getCenter();
        return { lat: c.lat, lng: c.lng };
      },
      flyTo: (coords: MapCoordinates, zoom = 18) => {
        map.flyTo([coords.lat, coords.lng], zoom, {
          duration: 1.0,
          easeLinearity: 0.25
        });
      },
      zoomIn: () => {
        map.zoomIn();
      },
      zoomOut: () => {
        map.zoomOut();
      },
      invalidateSize: () => {
        map.invalidateSize();
      },
      destroy: () => {
        map.remove();
      }
    };

    return instance;
  }

  async searchPlaces(query: string): Promise<MapSearchResult[]> {
    const q = query.trim();
    if (!q) return [];

    const queryWithKolkata =
      q.toLowerCase().includes('kolkata') ||
      q.toLowerCase().includes('howrah') ||
      /^\d{6}$/.test(q)
        ? q
        : `${q}, Kolkata`;

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        queryWithKolkata
      )}&viewbox=88.10,22.75,88.58,22.35&bounded=0&countrycodes=in&limit=8&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'SmartRunKolkata/2.4'
        }
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any, idx: number) => {
          const addr = item.address || {};
          const placeName =
            addr.road ||
            addr.suburb ||
            addr.neighbourhood ||
            addr.quarter ||
            item.name ||
            item.display_name?.split(',')[0] ||
            q;

          const secondaryParts = [
            addr.suburb || addr.neighbourhood || addr.quarter,
            addr.city || addr.state_district || 'Kolkata',
            addr.state || 'West Bengal',
            addr.postcode ? `PIN ${addr.postcode}` : ''
          ].filter(Boolean);

          const secondary =
            secondaryParts.join(', ') ||
            item.display_name?.split(',').slice(1, 4).join(', ');

          return {
            id: item.place_id ? `osm-${item.place_id}` : `geo-${idx}`,
            name: placeName.trim(),
            secondaryText: secondary.trim(),
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            pincode: addr.postcode || '',
            isMapGeocoded: true,
            provider: 'osm' as const
          };
        });
      }
    }

    return [];
  }

  async reverseGeocode(coords: MapCoordinates): Promise<ReverseGeocodeResult> {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'SmartRunKolkata/2.4'
        }
      }
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
          provider: 'osm' as const
        };
      }
    }

    return {
      formattedAddress: `Kolkata (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
      street: `Pinpoint Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
      locality: 'Kolkata',
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '700001',
      lat: coords.lat,
      lng: coords.lng,
      provider: 'osm' as const
    };
  }
}
