import React, { useEffect, useRef, useState, useCallback } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import L from 'leaflet';
import { Navigation, Store, Home, AlertCircle } from 'lucide-react';
import { getGoogleMapsStatus, GoogleMapsStatus } from '../../services/maps/googleMapsConfig';

const ATTRIBUTION_ID = 'gmp_mcp_codeassist_v1_aistudio';

interface LiveOrderRealMapProps {
  warehouse: {
    lat: number;
    lng: number;
    name: string;
    area: string;
  };
  destination: {
    lat: number;
    lng: number;
    name: string;
    area: string;
  };
  distanceKm: number;
  isOutForDelivery: boolean;
  isPartnerAssigned: boolean;
  riderLocation?: {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    updatedAt?: string;
  } | null;
  deliveryPartnerName?: string;
  riderAvatarUrl?: string | null;
  riderBikeNumber?: string | null;
}

/**
 * Inner component to manage the dynamic route polyline and camera bounds fitting via Google Maps API
 */
const DeliveryRouteOverlay = ({
  warehouse,
  destination,
  riderLocation,
  onRoadDistanceCalculated
}: {
  warehouse: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  riderLocation?: { lat: number; lng: number } | null;
  onRoadDistanceCalculated: (km: number) => void;
}) => {
  const map = useMap();
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);
  const glowPolylineRef = useRef<google.maps.Polyline | null>(null);

  const fetchRoadRoute = useCallback(async (
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    via?: { lat: number; lng: number } | null
  ): Promise<{ path: { lat: number; lng: number }[]; distanceKm: number } | null> => {
    try {
      let url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      if (via && typeof via.lat === 'number' && typeof via.lng === 'number' && !isNaN(via.lat) && !isNaN(via.lng)) {
        url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${via.lng},${via.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates?.length) {
        const path = data.routes[0].geometry.coordinates.map(
          (pt: [number, number]) => ({ lat: pt[1], lng: pt[0] })
        );
        const distKm = Math.round((data.routes[0].distance / 1000) * 10) / 10;
        return { path, distanceKm: distKm };
      }
    } catch {
      // Gracefully fall back
    }
    return null;
  }, []);

  useEffect(() => {
    if (!map) return;
    let isMounted = true;

    if (!glowPolylineRef.current) {
      glowPolylineRef.current = new google.maps.Polyline({
        map,
        strokeColor: '#3b82f6',
        strokeOpacity: 0.35,
        strokeWeight: 8,
        zIndex: 1
      });
    }

    if (!routePolylineRef.current) {
      routePolylineRef.current = new google.maps.Polyline({
        map,
        strokeColor: '#2563eb',
        strokeOpacity: 0.95,
        strokeWeight: 4,
        zIndex: 2
      });
    }

    const hasRealRider =
      riderLocation &&
      typeof riderLocation.lat === 'number' &&
      typeof riderLocation.lng === 'number' &&
      !isNaN(riderLocation.lat) &&
      !isNaN(riderLocation.lng);

    const defaultCoords: { lat: number; lng: number }[] = [{ lat: warehouse.lat, lng: warehouse.lng }];
    if (hasRealRider) {
      defaultCoords.push({ lat: riderLocation.lat, lng: riderLocation.lng });
    }
    defaultCoords.push({ lat: destination.lat, lng: destination.lng });

    glowPolylineRef.current.setPath(defaultCoords);
    routePolylineRef.current.setPath(defaultCoords);

    const bounds = new google.maps.LatLngBounds();
    defaultCoords.forEach((pt) => bounds.extend(pt));
    map.fitBounds(bounds, { top: 60, right: 40, bottom: 60, left: 40 });

    fetchRoadRoute(warehouse, destination, hasRealRider ? riderLocation : null).then((result) => {
      if (!isMounted || !result || !result.path.length) return;

      if (glowPolylineRef.current && routePolylineRef.current) {
        glowPolylineRef.current.setPath(result.path);
        routePolylineRef.current.setPath(result.path);
      }

      if (result.distanceKm > 0) {
        onRoadDistanceCalculated(result.distanceKm);
      }

      const roadBounds = new google.maps.LatLngBounds();
      result.path.forEach((pt) => roadBounds.extend(pt));
      map.fitBounds(roadBounds, { top: 60, right: 40, bottom: 60, left: 40 });
    });

    return () => {
      isMounted = false;
    };
  }, [map, warehouse.lat, warehouse.lng, destination.lat, destination.lng, riderLocation?.lat, riderLocation?.lng, fetchRoadRoute, onRoadDistanceCalculated]);

  useEffect(() => {
    return () => {
      if (glowPolylineRef.current) {
        glowPolylineRef.current.setMap(null);
        glowPolylineRef.current = null;
      }
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
        routePolylineRef.current = null;
      }
    };
  }, []);

  return null;
};

const MapInstanceSync = ({ onMap }: { onMap: (map: google.maps.Map | null) => void }) => {
  const map = useMap();
  useEffect(() => {
    onMap(map);
  }, [map, onMap]);
  return null;
};

/**
 * Resilient OpenStreetMap delivery renderer used when Google Maps billing is not active
 */
const ResilientOpenStreetMap = ({
  warehouse,
  destination,
  distanceKm,
  riderLocation,
  deliveryPartnerName,
  riderAvatarUrl,
  riderBikeNumber,
  onRecenterReady
}: LiveOrderRealMapProps & { onRecenterReady: (recenterFn: () => void) => void }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const warehouseMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const riderMarkerRef = useRef<L.Marker | null>(null);
  const glowLineRef = useRef<L.Polyline | null>(null);
  const coreLineRef = useRef<L.Polyline | null>(null);

  const createRiderIcon = useCallback((avatar?: string | null, bikeNo?: string | null) => {
    const cleanAvatar = avatar && avatar.trim() ? avatar.trim() : null;
    const cleanBikeNo = bikeNo && bikeNo.trim() ? bikeNo.trim() : null;
    return L.divIcon({
      className: 'bg-transparent border-none',
      html: `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
          <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
            <svg width="44" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="position:absolute;top:0;left:0;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.35));">
              <path d="M17 0C7.61 0 0 7.61 0 17c0 11.55 14.88 25.4 15.51 25.99a2.02 2.02 0 0 0 2.98 0C19.12 42.4 34 28.55 34 17 34 7.61 26.39 0 17 0z" fill="#059669" stroke="#ffffff" stroke-width="2"/>
            </svg>
            ${
              cleanAvatar
                ? `<div style="position:relative;z-index:2;width:24px;height:24px;border-radius:50%;overflow:hidden;border:1.5px solid #ffffff;background:#ffffff;margin-top:-6px;">
                    <img src="${cleanAvatar}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'" />
                  </div>`
                : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="position:relative;z-index:2;margin-top:-6px;">
                    <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
                  </svg>`
            }
          </div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:1px;margin-top:-2px;">
            <span style="font-size:9px;font-weight:800;background:#047857;color:#ffffff;padding:1px 5px;border-radius:3px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.2);">
              Rider
            </span>
            ${
              cleanBikeNo
                ? `<span style="font-size:8px;font-weight:800;font-family:monospace;background:#ffffff;color:#0f172a;padding:0.5px 4px;border-radius:2px;white-space:nowrap;border:1px solid #cbd5e1;box-shadow:0 1px 2px rgba(0,0,0,0.15);">
                    ${cleanBikeNo}
                  </span>`
                : ''
            }
          </div>
        </div>
      `,
      iconSize: [50, 60],
      iconAnchor: [25, 42]
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if ((container as any)._leaflet_id) {
      delete (container as any)._leaflet_id;
      container.innerHTML = '';
    }

    const map = L.map(container, {
      center: [(warehouse.lat + destination.lat) / 2, (warehouse.lng + destination.lng) / 2],
      zoom: 13,
      minZoom: 8,
      maxZoom: 19,
      zoomControl: false,
      attributionControl: false
    });
    mapInstanceRef.current = map;

    // Pure OpenStreetMap tiles (standard, zero Carto)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const warehouseIcon = L.divIcon({
      className: 'bg-transparent border-none',
      html: `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
          <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 3px 5px rgba(0,0,0,0.35));">
            <path d="M17 0C7.61 0 0 7.61 0 17c0 11.55 14.88 25.4 15.51 25.99a2.02 2.02 0 0 0 2.98 0C19.12 42.4 34 28.55 34 17 34 7.61 26.39 0 17 0z" fill="#d97706" stroke="#ffffff" stroke-width="2"/>
            <g transform="translate(6, 6)" stroke="#ffffff" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="m2 7 3.5-3.5a1.5 1.5 0 0 1 1.06-.44h8.88c.4 0 .78.16 1.06.44L20 7" />
              <path d="M4 11v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" />
              <path d="M9 20v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" />
              <path d="M2 7h18" />
              <path d="M4 7c0 1.1.9 2 2 2s2-.9 2-2" />
              <path d="M8 7c0 1.1.9 2 2 2s2-.9 2-2" />
              <path d="M12 7c0 1.1.9 2 2 2s2-.9 2-2" />
              <path d="M16 7c0 1.1.9 2 2 2s2-.9 2-2" />
            </g>
          </svg>
          <span style="margin-top:2px;font-size:10px;font-weight:900;background:#1e293b;color:#ffffff;padding:2px 7px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 5px rgba(0,0,0,0.25);">
            Store
          </span>
        </div>
      `,
      iconSize: [70, 68],
      iconAnchor: [35, 43]
    });

    const destIcon = L.divIcon({
      className: 'bg-transparent border-none',
      html: `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
          <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 3px 5px rgba(0,0,0,0.35));">
            <path d="M17 0C7.61 0 0 7.61 0 17c0 11.55 14.88 25.4 15.51 25.99a2.02 2.02 0 0 0 2.98 0C19.12 42.4 34 28.55 34 17 34 7.61 26.39 0 17 0z" fill="#2563eb" stroke="#ffffff" stroke-width="2"/>
            <g transform="translate(6, 6)" stroke="#ffffff" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </g>
          </svg>
          <span style="margin-top:2px;font-size:10px;font-weight:900;background:#1e3a8a;color:#ffffff;padding:2px 7px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 5px rgba(0,0,0,0.25);">
            Destination
          </span>
        </div>
      `,
      iconSize: [85, 68],
      iconAnchor: [42, 43]
    });

    warehouseMarkerRef.current = L.marker([warehouse.lat, warehouse.lng], { icon: warehouseIcon }).addTo(map);
    destMarkerRef.current = L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(map);

    glowLineRef.current = L.polyline([[warehouse.lat, warehouse.lng], [destination.lat, destination.lng]], {
      color: '#3b82f6',
      weight: 8,
      opacity: 0.35,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    coreLineRef.current = L.polyline([[warehouse.lat, warehouse.lng], [destination.lat, destination.lng]], {
      color: '#2563eb',
      weight: 4,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    const initialBounds = L.latLngBounds([[warehouse.lat, warehouse.lng], [destination.lat, destination.lng]]);
    map.fitBounds(initialBounds, { padding: [40, 40], maxZoom: 16 });

    onRecenterReady(() => {
      if (mapInstanceRef.current) {
        const b = L.latLngBounds([[warehouse.lat, warehouse.lng], [destination.lat, destination.lng]]);
        if (riderLocation) b.extend([riderLocation.lat, riderLocation.lng]);
        mapInstanceRef.current.fitBounds(b, { padding: [40, 40], maxZoom: 16 });
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync markers and rider location
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (riderLocation && typeof riderLocation.lat === 'number' && typeof riderLocation.lng === 'number') {
      const icon = createRiderIcon(riderAvatarUrl, riderBikeNumber);
      if (riderMarkerRef.current) {
        riderMarkerRef.current.setIcon(icon);
        riderMarkerRef.current.setLatLng([riderLocation.lat, riderLocation.lng]);
      } else {
        riderMarkerRef.current = L.marker([riderLocation.lat, riderLocation.lng], { icon }).addTo(map);
      }
    } else if (riderMarkerRef.current) {
      riderMarkerRef.current.remove();
      riderMarkerRef.current = null;
    }
  }, [riderLocation?.lat, riderLocation?.lng, riderAvatarUrl, riderBikeNumber, createRiderIcon]);

  return <div ref={containerRef} className="w-full h-full z-0" />;
};

/**
 * Live Order Delivery Map component using Google Maps Platform & @vis.gl/react-google-maps
 * with seamless OpenStreetMap fallback when Cloud Billing is not linked.
 */
export const LiveOrderRealMap = ({
  warehouse,
  destination,
  distanceKm,
  riderLocation,
  deliveryPartnerName,
  riderAvatarUrl,
  riderBikeNumber,
  isOutForDelivery,
  isPartnerAssigned
}: LiveOrderRealMapProps) => {
  const [mapsStatus, setMapsStatus] = useState<GoogleMapsStatus | null>(null);
  const [mapAuthFailed, setMapAuthFailed] = useState(false);
  const [roadDistanceKm, setRoadDistanceKm] = useState<number | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const recenterOsmRef = useRef<(() => void) | null>(null);

  // Catch any Google Maps authentication / billing errors globally (e.g. BillingNotEnabledMapError)
  useEffect(() => {
    const prevHandler = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      console.warn('[LiveOrderRealMap] Google Maps authentication/billing failure detected. Switching to resilient OpenStreetMap.');
      setMapAuthFailed(true);
      if (typeof prevHandler === 'function') {
        try { prevHandler(); } catch {}
      }
    };
    return () => {
      (window as any).gm_authFailure = prevHandler;
    };
  }, []);

  // Check Google Maps billing status before initializing
  useEffect(() => {
    let isMounted = true;
    getGoogleMapsStatus().then((status) => {
      if (isMounted) {
        setMapsStatus(status);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const hasRealRiderLocation =
    riderLocation &&
    typeof riderLocation.lat === 'number' &&
    typeof riderLocation.lng === 'number' &&
    !isNaN(riderLocation.lat) &&
    !isNaN(riderLocation.lng);

  const handleRecenter = () => {
    if (mapInstance) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: warehouse.lat, lng: warehouse.lng });
      bounds.extend({ lat: destination.lat, lng: destination.lng });
      if (hasRealRiderLocation) {
        bounds.extend({ lat: riderLocation.lat, lng: riderLocation.lng });
      }
      mapInstance.fitBounds(bounds, { top: 60, right: 40, bottom: 60, left: 40 });
    } else if (recenterOsmRef.current) {
      recenterOsmRef.current();
    }
  };

  const centerLat = (warehouse.lat + destination.lat) / 2;
  const centerLng = (warehouse.lng + destination.lng) / 2;

  const isGoogleMapsReady = Boolean(mapsStatus?.billingEnabled && mapsStatus?.apiKey && !mapAuthFailed);

  return (
    <div className="relative w-full aspect-square max-h-[480px] overflow-hidden bg-slate-100 select-none border-none rounded-none">
      {mapsStatus === null ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-500 gap-2">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-600">Initializing Live Delivery Map...</span>
        </div>
      ) : isGoogleMapsReady ? (
        <APIProvider apiKey={mapsStatus.apiKey!} libraries={['places', 'geometry', 'marker', 'routes']}>
          <Map
            id="live-order-tracking-map"
            mapId="DEMO_MAP_ID"
            defaultCenter={{ lat: centerLat, lng: centerLng }}
            defaultZoom={13}
            minZoom={7}
            maxZoom={20}
            gestureHandling="greedy"
            disableDefaultUI={true}
            internalUsageAttributionIds={[ATTRIBUTION_ID]}
            className="w-full h-full"
          >
            <MapInstanceSync onMap={setMapInstance} />
            {/* Store / Warehouse Marker */}
            <AdvancedMarker
              position={{ lat: warehouse.lat, lng: warehouse.lng }}
              title="SmartRun Warehouse Depot"
            >
              <div className="relative flex flex-col items-center cursor-pointer select-none">
                <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-md">
                  <path d="M17 0C7.61 0 0 7.61 0 17c0 11.55 14.88 25.4 15.51 25.99a2.02 2.02 0 0 0 2.98 0C19.12 42.4 34 28.55 34 17 34 7.61 26.39 0 17 0z" fill="#d97706" stroke="#ffffff" strokeWidth="2"/>
                </svg>
                <div className="absolute top-2 left-1/2 -translate-x-1/2 text-white">
                  <Store className="w-4 h-4 text-white" />
                </div>
                <span className="mt-0.5 text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-sm whitespace-nowrap shadow-sm">
                  Store
                </span>
              </div>
            </AdvancedMarker>

            {/* Destination Marker */}
            <AdvancedMarker
              position={{ lat: destination.lat, lng: destination.lng }}
              title={destination.name || 'Delivery Destination'}
            >
              <div className="relative flex flex-col items-center cursor-pointer select-none">
                <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-md">
                  <path d="M17 0C7.61 0 0 7.61 0 17c0 11.55 14.88 25.4 15.51 25.99a2.02 2.02 0 0 0 2.98 0C19.12 42.4 34 28.55 34 17 34 7.61 26.39 0 17 0z" fill="#2563eb" stroke="#ffffff" strokeWidth="2"/>
                </svg>
                <div className="absolute top-2 left-1/2 -translate-x-1/2 text-white">
                  <Home className="w-4 h-4 text-white" />
                </div>
                <span className="mt-0.5 text-[10px] font-black bg-blue-900 text-white px-2 py-0.5 rounded-sm whitespace-nowrap shadow-sm">
                  Destination
                </span>
              </div>
            </AdvancedMarker>

            {/* Live Delivery Rider Marker */}
            {hasRealRiderLocation && (
              <AdvancedMarker
                position={{ lat: riderLocation.lat, lng: riderLocation.lng }}
                title={deliveryPartnerName || 'Delivery Partner'}
              >
                <div className="relative flex flex-col items-center cursor-pointer select-none">
                  <div className="relative w-11 h-11 flex items-center justify-center">
                    <svg width="44" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute top-0 left-0 drop-shadow-md">
                      <path d="M17 0C7.61 0 0 7.61 0 17c0 11.55 14.88 25.4 15.51 25.99a2.02 2.02 0 0 0 2.98 0C19.12 42.4 34 28.55 34 17 34 7.61 26.39 0 17 0z" fill="#059669" stroke="#ffffff" strokeWidth="2"/>
                    </svg>
                    {riderAvatarUrl ? (
                      <div className="relative z-10 w-6 h-6 rounded-full overflow-hidden border border-white bg-white -mt-1.5 shadow-xs">
                        <img src={riderAvatarUrl} alt="Rider" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 -mt-1.5">
                        <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
                      </svg>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-0.5 -mt-0.5">
                    <span className="text-[9px] font-extrabold bg-emerald-700 text-white px-1.5 py-0.5 rounded-sm whitespace-nowrap shadow-xs">
                      Rider
                    </span>
                    {riderBikeNumber && (
                      <span className="text-[8px] font-extrabold font-mono bg-white text-slate-900 px-1 py-0.5 rounded-xs whitespace-nowrap border border-slate-300 shadow-xs">
                        {riderBikeNumber}
                      </span>
                    )}
                  </div>
                </div>
              </AdvancedMarker>
            )}

            {/* Dynamic Road Route Polyline and Bounds Fitter */}
            <DeliveryRouteOverlay
              warehouse={warehouse}
              destination={destination}
              riderLocation={riderLocation}
              onRoadDistanceCalculated={(km) => setRoadDistanceKm(km)}
            />
          </Map>
        </APIProvider>
      ) : (
        <ResilientOpenStreetMap
          warehouse={warehouse}
          destination={destination}
          distanceKm={distanceKm}
          riderLocation={riderLocation}
          deliveryPartnerName={deliveryPartnerName}
          riderAvatarUrl={riderAvatarUrl}
          riderBikeNumber={riderBikeNumber}
          isOutForDelivery={isOutForDelivery}
          isPartnerAssigned={isPartnerAssigned}
          onRecenterReady={(fn) => {
            recenterOsmRef.current = fn;
          }}
        />
      )}

      {/* Top Floating Badge: Distance and Backend GPS status */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none flex items-center gap-2">
        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-2 text-xs font-black text-slate-800 border border-slate-200/60">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span className="text-blue-700 font-bold">{roadDistanceKm || distanceKm} km road path</span>
        </div>
        {hasRealRiderLocation && (
          <div className="bg-emerald-600 text-white backdrop-blur-md px-2.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 text-xs font-bold border border-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            <span>Live GPS</span>
          </div>
        )}
      </div>

      {/* Cloud Billing notice if key is active without billing */}
      {mapsStatus && !mapsStatus.billingEnabled && (
        <div className="absolute top-12 left-3 right-3 z-10 pointer-events-auto">
          <div className="bg-amber-500/95 text-white backdrop-blur-md px-3 py-1.5 rounded-xl text-[11px] font-semibold shadow-xs flex items-center justify-between gap-2 border border-amber-600/60">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Google Cloud billing not active on API key. Express tracking running on OpenStreetMap.</span>
            </div>
            <a
              href="https://console.cloud.google.com/project/_/billing/enable"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-[10px] font-bold text-amber-100 hover:text-white shrink-0"
            >
              Link Billing
            </a>
          </div>
        </div>
      )}

      {/* Floating Recenter Route Control */}
      <div className="absolute bottom-3 right-3 z-10">
        <button
          onClick={handleRecenter}
          aria-label="Recenter route"
          className="w-9 h-9 rounded-xl bg-white/95 backdrop-blur-md shadow-sm hover:bg-white text-slate-700 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/60 active:scale-95"
          title="Recenter Route"
        >
          <Navigation className="w-4.5 h-4.5 text-blue-600" />
        </button>
      </div>
    </div>
  );
};
