import L from 'leaflet';
import { IMapProvider, IMapInstance, MapCoordinates, MapInitOptions, MapSearchResult, ReverseGeocodeResult } from './types';

/**
 * CartoProvider
 * Renders high-definition CartoDB Voyager & Positron vector-styled raster tiles.
 * Provides the signature clean, modern aesthetic used by top delivery apps like Zomato & Swiggy:
 * crisp road hierarchy, subtle building footprints, pale green parks, and legible street labels.
 */
export class CartoProvider implements IMapProvider {
  readonly name = 'carto' as const;

  isAvailable(): boolean {
    return true; // Always available without API key or billing blocks
  }

  async initialize(container: HTMLElement, options: MapInitOptions): Promise<IMapInstance> {
    container.innerHTML = '';

    const map = L.map(container, {
      center: [options.center.lat, options.center.lng],
      zoom: options.zoom || 18,
      minZoom: options.minZoom || 11,
      maxZoom: options.maxZoom || 20,
      zoomControl: false,
      attributionControl: false
    });

    // Primary clean vector-styled raster tile layer: CartoDB Voyager with user API key
    let currentTileLayer = L.tileLayer(
      'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_4m9h_1_325c6d99c962c2e7faa87e4a',
      {
        subdomains: 'abcd',
        maxZoom: 20,
        attribution: '&copy; CARTO &copy; OpenStreetMap'
      }
    ).addTo(map);

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
      },
      setLiveLocationMarker: (coords: MapCoordinates | null) => {
        try {
          if (!coords) {
            if ((instance as any)._liveMarker) {
              map.removeLayer((instance as any)._liveMarker);
              (instance as any)._liveMarker = null;
            }
            if ((instance as any)._liveCircle) {
              map.removeLayer((instance as any)._liveCircle);
              (instance as any)._liveCircle = null;
            }
            return;
          }

          const latLng: [number, number] = [coords.lat, coords.lng];

          if (!(instance as any)._liveCircle) {
            (instance as any)._liveCircle = L.circle(latLng, {
              radius: 35,
              color: '#2563EB',
              weight: 1.5,
              opacity: 0.4,
              fillColor: '#3B82F6',
              fillOpacity: 0.16
            }).addTo(map);
          } else {
            (instance as any)._liveCircle.setLatLng(latLng);
          }

          const blueDotHtml = `
            <div style="position:relative; width:26px; height:26px; display:flex; align-items:center; justify-content:center;">
              <div style="position:absolute; inset:0; border-radius:9999px; background-color:#3b82f6; opacity:0.35;"></div>
              <div style="width:14px; height:14px; border-radius:9999px; background-color:#1d4ed8; border:2.5px solid #ffffff; box-shadow:0 2px 5px rgba(0,0,0,0.35); position:relative; z-index:2;"></div>
            </div>
          `;
          const blueDotIcon = L.divIcon({
            html: blueDotHtml,
            className: 'custom-live-blue-dot',
            iconSize: [26, 26],
            iconAnchor: [13, 13]
          });

          if (!(instance as any)._liveMarker) {
            (instance as any)._liveMarker = L.marker(latLng, { icon: blueDotIcon, zIndexOffset: 1000 }).addTo(map);
          } else {
            (instance as any)._liveMarker.setLatLng(latLng);
          }
        } catch (e) {
          console.warn('[CartoProvider] setLiveLocationMarker notice:', e);
        }
      },
      switchStyle: (style: 'voyager' | 'positron') => {
        map.removeLayer(currentTileLayer);
        const tileUrl =
          style === 'positron'
            ? 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png?key=cb1_4m9h_1_325c6d99c962c2e7faa87e4a'
            : 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_4m9h_1_325c6d99c962c2e7faa87e4a';
        currentTileLayer = L.tileLayer(tileUrl, {
          subdomains: 'abcd',
          maxZoom: 20,
          attribution: '&copy; CARTO &copy; OpenStreetMap'
        }).addTo(map);
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

    try {
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
              id: item.place_id ? `carto-${item.place_id}` : `geo-${idx}`,
              name: placeName.trim(),
              secondaryText: secondary.trim(),
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              pincode: addr.postcode || '',
              isMapGeocoded: true,
              provider: 'carto' as const,
              building: addr.building || addr.amenity || undefined,
              road: addr.road || undefined,
              area: addr.suburb || addr.neighbourhood || undefined,
              city: addr.city || 'Kolkata'
            };
          });
        }
      }
    } catch (e) {
      console.warn('[CartoProvider] searchPlaces notice:', e);
    }

    return [];
  }

  async reverseGeocode(coords: MapCoordinates): Promise<ReverseGeocodeResult> {
    try {
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
          const street =
            addr.road ||
            addr.suburb ||
            addr.neighbourhood ||
            addr.residential ||
            addr.commercial ||
            addr.building ||
            data.name ||
            'Kolkata';

          const locality =
            addr.suburb ||
            addr.neighbourhood ||
            addr.city_district ||
            addr.quarter ||
            'Kolkata';

          const pincode = addr.postcode || '700001';
          const city = addr.city || addr.state_district || 'Kolkata';

          return {
            formattedAddress: data.display_name || `${street}, ${locality}, ${city} - ${pincode}`,
            street,
            locality,
            suburb: addr.suburb,
            city,
            state: addr.state || 'West Bengal',
            pincode,
            lat: coords.lat,
            lng: coords.lng,
            provider: 'carto'
          };
        }
      }
    } catch (e) {
      console.warn('[CartoProvider] reverseGeocode notice:', e);
    }

    return {
      formattedAddress: 'Kasba, Kolkata, West Bengal - 700042',
      street: 'Kasba',
      locality: 'Kasba',
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '700042',
      lat: coords.lat,
      lng: coords.lng,
      provider: 'carto'
    };
  }
}
