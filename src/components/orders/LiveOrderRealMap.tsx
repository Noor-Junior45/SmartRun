import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Navigation, ZoomIn, ZoomOut } from 'lucide-react';

// Safety Patch for Leaflet: Prevent Uncaught TypeError: Cannot read properties of undefined (reading '_leaflet_pos')
// This happens when React StrictMode unmounts/remounts or during animation callbacks on detached DOM nodes
if (typeof window !== 'undefined' && L && L.DomUtil) {
  try {
    const origGetPosition = L.DomUtil.getPosition;
    L.DomUtil.getPosition = function (el: any) {
      if (!el) {
        return new L.Point(0, 0);
      }
      if (origGetPosition) {
        return origGetPosition.call(L.DomUtil, el);
      }
      return el._leaflet_pos || new L.Point(0, 0);
    };
  } catch {
    // Ignore
  }
}

// West Bengal State Geoboundaries:
// Restricts zooming out and panning strictly to West Bengal territory (not other states)
// South: ~21.3° N (Digha / Bay of Bengal / Sundarbans)
// North: ~27.35° N (Darjeeling / Kalimpong / Siliguri)
// West: ~85.70° E (Purulia / Jharkhand border)
// East: ~89.90° E (Alipurduar / Cooch Behar border)
const BENGAL_BOUNDS = L.latLngBounds(
  [21.3, 85.7], // Southwest corner of West Bengal
  [27.35, 89.9] // Northeast corner of West Bengal
);
const MIN_BENGAL_ZOOM = 7;
const MAX_ZOOM = 18;

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

export const LiveOrderRealMap = ({
  warehouse,
  destination,
  distanceKm,
  isOutForDelivery,
  isPartnerAssigned,
  riderLocation,
  deliveryPartnerName,
  riderAvatarUrl,
  riderBikeNumber
}: LiveOrderRealMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const warehouseMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const riderMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const routeGlowRef = useRef<L.Polyline | null>(null);
  const riderIconRef = useRef<L.DivIcon | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(13);

  // Delivery Rider Pin generator (uses avatar if present, else crisp bike icon)
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

  // Initialize Leaflet Map once
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    // Clean up any stale container references
    if ((container as any)._leaflet_id) {
      delete (container as any)._leaflet_id;
      container.innerHTML = '';
    }

    // Initialize Map with non-animating bounds restricted strictly to West Bengal
    const map = L.map(container, {
      center: [(warehouse.lat + destination.lat) / 2, (warehouse.lng + destination.lng) / 2],
      zoom: 13,
      minZoom: MIN_BENGAL_ZOOM, // Can only zoom out till Bengal state level (never out to all of India or world)
      maxZoom: MAX_ZOOM,
      maxBounds: BENGAL_BOUNDS, // Hard locks panning to West Bengal territory only
      maxBoundsViscosity: 1.0,  // 1.0 = solid barrier, map springs back and will not pan into other states
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false
    });

    // CartoDB Voyager Tile Layer (Clean Uber / Apple Maps aesthetic, crisp street labels, free, zero keys)
    const tileLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        subdomains: 'abcd',
        minZoom: MIN_BENGAL_ZOOM,
        maxZoom: MAX_ZOOM,
        bounds: BENGAL_BOUNDS,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
      }
    ).addTo(map);

    // Store Pin (Pointed Google Maps style Pin touching the exact ground coordinate - No circles)
    const warehouseIcon = L.divIcon({
      className: 'bg-transparent border-none',
      html: `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
          <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 3px 5px rgba(0,0,0,0.35));">
            <path d="M17 0C7.61 0 0 7.61 0 17c0 11.55 14.88 25.4 15.51 25.99a2.02 2.02 0 0 0 2.98 0C19.12 42.4 34 28.55 34 17 34 7.61 26.39 0 17 0z" fill="#d97706" stroke="#ffffff" stroke-width="2"/>
            <!-- Store / Shop front icon -->
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
          <span style="margin-top:2px;font-size:10px;font-weight:900;background:#1e293b;color:#ffffff;padding:2px 7px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 5px rgba(0,0,0,0.25);letter-spacing:0.02em;">
            Store
          </span>
        </div>
      `,
      iconSize: [70, 68],
      iconAnchor: [35, 43]
    });

    // Customer Delivery Destination Pin (Red Pointed Teardrop Pin pointing directly to the house - No circles)
    const destinationIcon = L.divIcon({
      className: 'bg-transparent border-none',
      html: `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
          <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 3px 5px rgba(0,0,0,0.35));">
            <path d="M17 0C7.61 0 0 7.61 0 17c0 11.55 14.88 25.4 15.51 25.99a2.02 2.02 0 0 0 2.98 0C19.12 42.4 34 28.55 34 17 34 7.61 26.39 0 17 0z" fill="#ea4335" stroke="#ffffff" stroke-width="2"/>
            <!-- House icon pointing to customer house -->
            <g transform="translate(6, 6)" fill="#ffffff" stroke="#ffffff" stroke-width="0.5">
              <path d="M11 2.2L2.5 9.2a.8.8 0 0 0-.2.6v9.4c0 .44.36.8.8.8h4.8v-5.6h6.2v5.6h4.8c.44 0 .8-.36.8-.8V9.8c0-.23-.1-.45-.27-.6L11 2.2z" />
            </g>
          </svg>
          <span style="margin-top:2px;font-size:10px;font-weight:900;background:#ea4335;color:#ffffff;padding:2px 7px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 5px rgba(0,0,0,0.25);letter-spacing:0.02em;">
            Home
          </span>
        </div>
      `,
      iconSize: [70, 68],
      iconAnchor: [35, 43]
    });

    // Markers
    const warehouseMarker = L.marker([warehouse.lat, warehouse.lng], { icon: warehouseIcon }).addTo(map);
    warehouseMarker.bindPopup(`<b>${warehouse.name}</b><br/>${warehouse.area}`);
    warehouseMarkerRef.current = warehouseMarker;

    const destMarker = L.marker([destination.lat, destination.lng], { icon: destinationIcon }).addTo(map);
    destMarker.bindPopup(`<b>Delivery Destination</b><br/>${destination.name}`);
    destMarkerRef.current = destMarker;

    const riderIcon = createRiderIcon(riderAvatarUrl, riderBikeNumber);
    riderIconRef.current = riderIcon;

    // Route coordinates: connect Warehouse -> Rider (if live GPS reported by backend) -> Destination
    const routeCoords: [number, number][] = [[warehouse.lat, warehouse.lng]];

    // Only render Rider marker if real coordinates are provided by backend
    if (
      riderLocation &&
      typeof riderLocation.lat === 'number' &&
      typeof riderLocation.lng === 'number' &&
      !isNaN(riderLocation.lat) &&
      !isNaN(riderLocation.lng)
    ) {
      const riderMarker = L.marker([riderLocation.lat, riderLocation.lng], { icon: riderIcon }).addTo(map);
      riderMarker.bindPopup(
        `<b>${deliveryPartnerName || 'Delivery Partner'}</b><br/>Live GPS: ${riderLocation.lat.toFixed(4)}, ${riderLocation.lng.toFixed(4)}`
      );
      riderMarkerRef.current = riderMarker;
      routeCoords.push([riderLocation.lat, riderLocation.lng]);
    }

    routeCoords.push([destination.lat, destination.lng]);

    const glow = L.polyline(routeCoords, {
      color: '#a7f3d0',
      weight: 6,
      opacity: 0.7,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);
    routeGlowRef.current = glow;

    const routeLine = L.polyline(routeCoords, {
      color: '#059669',
      weight: 3.5,
      dashArray: '8, 8',
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);
    routeLineRef.current = routeLine;

    // Fit bounds tightly framing store and user location without zooming out to all of Kolkata
    const bounds = L.latLngBounds([
      [warehouse.lat, warehouse.lng],
      [destination.lat, destination.lng]
    ]);
    map.fitBounds(bounds, { padding: [35, 35], maxZoom: 16, animate: false });
    setCurrentZoom(map.getZoom());

    // Track zoom level changes to strictly enforce West Bengal boundaries
    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    mapInstanceRef.current = map;

    // Invalidate size once container settles
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.invalidateSize({ animate: false });
          mapInstanceRef.current.fitBounds(bounds, { padding: [35, 35], maxZoom: 16, animate: false });
        } catch {
          // ignore
        }
      }
    }, 120);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && container) {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.invalidateSize({ animate: false });
          } catch {
            // ignore
          }
        }
      });
      resizeObserver.observe(container);
    }

    return () => {
      clearTimeout(timer);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.stop();
          mapInstanceRef.current.off();
          tileLayer.remove();
          warehouseMarker.remove();
          destMarker.remove();
          if (riderMarkerRef.current) {
            riderMarkerRef.current.remove();
          }
          glow.remove();
          routeLine.remove();
          mapInstanceRef.current.remove();
        } catch {
          // Safe disposal
        }
        mapInstanceRef.current = null;
      }
      if (container) {
        delete (container as any)._leaflet_id;
        container.innerHTML = '';
      }
    };
  }, []); // Run once on mount

  // Update positions smoothly when coordinates, backend rider location, or order status change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    try {
      warehouseMarkerRef.current?.setLatLng([warehouse.lat, warehouse.lng]);
      destMarkerRef.current?.setLatLng([destination.lat, destination.lng]);

      const routeCoords: [number, number][] = [[warehouse.lat, warehouse.lng]];

      // Real Rider Location from backend
      const hasRealRiderLocation =
        riderLocation &&
        typeof riderLocation.lat === 'number' &&
        typeof riderLocation.lng === 'number' &&
        !isNaN(riderLocation.lat) &&
        !isNaN(riderLocation.lng);

      if (hasRealRiderLocation) {
        const dynamicIcon = createRiderIcon(riderAvatarUrl, riderBikeNumber);
        riderIconRef.current = dynamicIcon;

        if (riderMarkerRef.current) {
          riderMarkerRef.current.setIcon(dynamicIcon);
          riderMarkerRef.current.setLatLng([riderLocation.lat, riderLocation.lng]);
          riderMarkerRef.current.setPopupContent(
            `<b>${deliveryPartnerName || 'Delivery Partner'}</b><br/>${riderBikeNumber ? `Bike: ${riderBikeNumber}<br/>` : ''}Live GPS: ${riderLocation.lat.toFixed(4)}, ${riderLocation.lng.toFixed(4)}`
          );
        } else {
          const newRiderMarker = L.marker([riderLocation.lat, riderLocation.lng], {
            icon: dynamicIcon
          }).addTo(map);
          newRiderMarker.bindPopup(
            `<b>${deliveryPartnerName || 'Delivery Partner'}</b><br/>${riderBikeNumber ? `Bike: ${riderBikeNumber}<br/>` : ''}Live GPS: ${riderLocation.lat.toFixed(4)}, ${riderLocation.lng.toFixed(4)}`
          );
          riderMarkerRef.current = newRiderMarker;
        }
        routeCoords.push([riderLocation.lat, riderLocation.lng]);
      } else {
        // No rider GPS reported by backend yet -> remove rider pin from map
        if (riderMarkerRef.current) {
          riderMarkerRef.current.remove();
          riderMarkerRef.current = null;
        }
      }

      routeCoords.push([destination.lat, destination.lng]);

      routeGlowRef.current?.setLatLngs(routeCoords);
      routeLineRef.current?.setLatLngs(routeCoords);

      const bounds = L.latLngBounds([
        [warehouse.lat, warehouse.lng],
        [destination.lat, destination.lng]
      ]);
      if (hasRealRiderLocation) {
        bounds.extend([riderLocation.lat, riderLocation.lng]);
      }
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 16, animate: false });
    } catch {
      // Safe update
    }
  }, [
    warehouse.lat,
    warehouse.lng,
    destination.lat,
    destination.lng,
    riderLocation?.lat,
    riderLocation?.lng,
    deliveryPartnerName,
    riderAvatarUrl,
    riderBikeNumber,
    isOutForDelivery,
    isPartnerAssigned
  ]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      try {
        const cur = mapInstanceRef.current.getZoom();
        if (cur < MAX_ZOOM) {
          mapInstanceRef.current.zoomIn();
        }
      } catch {
        // ignore
      }
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      try {
        const cur = mapInstanceRef.current.getZoom();
        if (cur > MIN_BENGAL_ZOOM) {
          mapInstanceRef.current.zoomOut();
        }
      } catch {
        // ignore
      }
    }
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      try {
        const bounds = L.latLngBounds([
          [warehouse.lat, warehouse.lng],
          [destination.lat, destination.lng]
        ]);
        mapInstanceRef.current.fitBounds(bounds, { padding: [35, 35], maxZoom: 16, animate: false });
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="relative w-full h-[320px] sm:h-[380px] md:h-[420px] overflow-hidden bg-slate-100 select-none border-none rounded-none">
      {/* Real Map Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Floating Badge: Distance and Backend GPS status */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none flex items-center gap-2">
        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-2 text-xs font-black text-slate-800 border border-slate-200/60">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-700 font-bold">{distanceKm} km route</span>
        </div>
        {riderLocation && (
          <div className="bg-emerald-600/95 text-white backdrop-blur-md px-2.5 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 text-xs font-bold border border-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            <span>Live GPS</span>
          </div>
        )}
      </div>

      {/* Bengal State Boundary Notice when fully zoomed out */}
      {currentZoom <= MIN_BENGAL_ZOOM && (
        <div className="absolute top-3 right-3 z-10 pointer-events-none animate-fade-in">
          <div className="bg-slate-900/90 text-white backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-sm border border-slate-700/80">
            West Bengal Boundary
          </div>
        </div>
      )}

      {/* Floating Recenter & Zoom Controls */}
      <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1.5">
        <button
          onClick={handleRecenter}
          aria-label="Recenter route"
          className="w-8 h-8 rounded-xl bg-white/95 backdrop-blur-md shadow-sm hover:bg-white text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          title="Recenter Route"
        >
          <Navigation className="w-4 h-4 text-emerald-600" />
        </button>
        <button
          onClick={handleZoomIn}
          disabled={currentZoom >= MAX_ZOOM}
          aria-label="Zoom in"
          className={`w-8 h-8 rounded-xl bg-white/95 backdrop-blur-md shadow-sm text-slate-700 flex items-center justify-center transition-colors ${
            currentZoom >= MAX_ZOOM ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white cursor-pointer'
          }`}
          title={currentZoom >= MAX_ZOOM ? 'Maximum zoom level reached' : 'Zoom in'}
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          disabled={currentZoom <= MIN_BENGAL_ZOOM}
          aria-label="Zoom out"
          className={`w-8 h-8 rounded-xl bg-white/95 backdrop-blur-md shadow-sm text-slate-700 flex items-center justify-center transition-colors ${
            currentZoom <= MIN_BENGAL_ZOOM ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white cursor-pointer'
          }`}
          title={
            currentZoom <= MIN_BENGAL_ZOOM
              ? 'Minimum zoom reached (West Bengal state boundary - cannot zoom out to other states)'
              : 'Zoom out'
          }
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
