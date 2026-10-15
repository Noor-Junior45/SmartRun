import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import L from 'leaflet';
import { Navigation, Store, CheckCircle, Zap } from 'lucide-react';
import { getGoogleMapsStatus, getSynchronousGoogleMapsKey, GoogleMapsStatus } from '../../services/maps/googleMapsConfig';

const ATTRIBUTION_ID = 'gmp_mcp_codeassist_v1_aistudio';

// Calculate geodesic distance in meters between two lat/lng coordinates (Haversine formula)
export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number' ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return Infinity;
  }
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Zomato-inspired clean white map styling with road hierarchy and visible building blocks,
// with all clutter (POIs, business names, building addresses, city labels) cleanly stripped out.
const ZOMATO_MAP_STYLES: google.maps.MapTypeStyle[] = [
  // Minimalist clean canvas
  { elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  // Hide city, province, country, and building-level address text clutter
  { featureType: 'administrative', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.country', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.province', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', stylers: [{ visibility: 'off' }] },
  // Keep only local neighborhood tags if helpful, very soft
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 2 }] },
  // Completely strip all commercial POIs, stores, shops, restaurants, businesses, building names
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#f0fdf4' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  // Clean white roads with subtle contrast borders (like Zomato)
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e2e8f0' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 2 }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'geometry.stroke', stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f1f5f9' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e0f2fe' }] },
  { featureType: 'water', elementType: 'labels', stylers: [{ visibility: 'off' }] }
];

export interface LiveOrderRealMapProps {
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
  orderStatus?: string;
  onRouteCalculated?: (data: { distanceKm: number; transitDurationMinutes: number }) => void;
}

/**
 * 3D User House Component for Google Maps Advanced Marker
 */
const UserHouseGraphic = ({
  isNear,
  isAtHouse,
  areaName
}: {
  isNear: boolean;
  isAtHouse: boolean;
  areaName: string;
}) => {
  return (
    <div className="relative flex flex-col items-center cursor-pointer select-none">
      {/* Animated Sonar Radar Beacon when rider is approaching or arrived */}
      {isNear && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-16 pointer-events-none flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-blue-500/40 animate-ping absolute" />
          <div className="w-10 h-10 rounded-full bg-blue-500/25 absolute animate-pulse" />
        </div>
      )}

      {/* Top Floating Status Pill */}
      {isAtHouse ? (
        <span className="mb-1 text-[9px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full whitespace-nowrap shadow-md flex items-center gap-1 border border-white">
          <CheckCircle className="w-2.5 h-2.5" /> Doorstep Arrival
        </span>
      ) : isNear ? (
        <span className="mb-1 text-[9px] font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded-full whitespace-nowrap shadow-md flex items-center gap-1 border border-white animate-bounce">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> Rider Arriving Soon
        </span>
      ) : null}

      {/* 3D Illustrated House Asset */}
      <div className="relative w-11 h-11 flex items-center justify-center drop-shadow-lg transition-transform duration-300 hover:scale-105">
        <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Ground drop-shadow */}
          <ellipse cx="24" cy="44" rx="18" ry="3.5" fill="rgba(15, 23, 42, 0.28)" />
          {/* House Base */}
          <path
            d="M10 21V41C10 42.1 10.9 43 12 43H36C37.1 43 38 42.1 38 41V21L24 9L10 21Z"
            fill="#FFFFFF"
            stroke="#0F172A"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Gable Roof */}
          <path
            d="M6 22L24 7L42 22"
            stroke="#EA580C"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M24 7L38 18.5V11H34V15.2L24 7Z" fill="#C2410C" />
          {/* Chimney */}
          <rect x="33" y="10" width="5" height="7" rx="1" fill="#EA580C" stroke="#0F172A" strokeWidth="1.8" />
          {/* Front Door */}
          <rect x="20" y="27" width="8" height="16" rx="2" fill="#0284C7" stroke="#0F172A" strokeWidth="2" />
          <circle cx="26" cy="35" r="1" fill="#FFFFFF" />
          {/* Warm Lit Window */}
          <rect x="14" y="24" width="7" height="7" rx="1.5" fill="#FEF08A" stroke="#0F172A" strokeWidth="1.8" />
          <line x1="17.5" y1="24" x2="17.5" y2="31" stroke="#0F172A" strokeWidth="1.2" />
          <line x1="14" y1="27.5" x2="21" y2="27.5" stroke="#0F172A" strokeWidth="1.2" />
          {/* Attic Window */}
          <circle cx="24" cy="16" r="3" fill="#E0F2FE" stroke="#0F172A" strokeWidth="1.8" />
        </svg>
      </div>

      {/* House Name / Address Tag */}
      <span className="mt-0.5 text-[9px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-sm whitespace-nowrap shadow-sm border border-slate-700">
        🏠 Your House {areaName ? `• ${areaName}` : ''}
      </span>
    </div>
  );
};

// Route cache across re-renders to prevent flickering
let cachedRouteKey = '';
let cachedRoutePath: { lat: number; lng: number }[] | null = null;
let cachedDistanceKm = 0;

/**
 * Inner component to manage the official Google Maps road route connecting line.
 * Uses Google DirectionsService directly so the line is 100% on actual streets,
 * perfectly smooth without straight-line flickering.
 */
const DeliveryRouteOverlay = ({
  warehouse,
  destination,
  riderLocation,
  isNearDestination,
  onRoadDistanceCalculated,
  onRouteCalculated
}: {
  warehouse: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  riderLocation?: { lat: number; lng: number } | null;
  isNearDestination: boolean;
  onRoadDistanceCalculated?: (km: number) => void;
  onRouteCalculated?: (data: { distanceKm: number; transitDurationMinutes: number }) => void;
}) => {
  const map = useMap();
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);
  const glowPolylineRef = useRef<google.maps.Polyline | null>(null);
  const hasFittedInitialBoundsRef = useRef(false);

  useEffect(() => {
    if (!map) return;
    let isMounted = true;

    // Create persistent polyline instances
    if (!glowPolylineRef.current) {
      glowPolylineRef.current = new google.maps.Polyline({
        map,
        strokeColor: '#10b981',
        strokeOpacity: 0.35,
        strokeWeight: 8,
        zIndex: 1
      });
    }

    if (!routePolylineRef.current) {
      routePolylineRef.current = new google.maps.Polyline({
        map,
        strokeColor: '#059669',
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

    // If we already have a cached Google road route for this pair, display it immediately (NO straight lines)
    const currentRouteKey = `${warehouse.lat.toFixed(4)},${warehouse.lng.toFixed(4)}->${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`;
    if (cachedRoutePath && cachedRouteKey === currentRouteKey) {
      glowPolylineRef.current.setPath(cachedRoutePath);
      routePolylineRef.current.setPath(cachedRoutePath);
    }

    // Auto-frame camera bounds:
    // When rider nears destination (<900m / arriving), focus on rider & user house with comfortable padding
    if (isNearDestination && hasRealRider) {
      const nearBounds = new google.maps.LatLngBounds();
      nearBounds.extend({ lat: riderLocation.lat, lng: riderLocation.lng });
      nearBounds.extend({ lat: destination.lat, lng: destination.lng });
      map.fitBounds(nearBounds, { top: 80, right: 65, bottom: 80, left: 65 });
    } else if (!hasFittedInitialBoundsRef.current) {
      const initialBounds = new google.maps.LatLngBounds();
      initialBounds.extend({ lat: warehouse.lat, lng: warehouse.lng });
      initialBounds.extend({ lat: destination.lat, lng: destination.lng });
      if (hasRealRider) {
        initialBounds.extend({ lat: riderLocation.lat, lng: riderLocation.lng });
      }
      map.fitBounds(initialBounds, { top: 60, right: 45, bottom: 60, left: 45 });
      hasFittedInitialBoundsRef.current = true;
    }

    // Fetch official Google Directions route
    const fetchGoogleRoute = async () => {
      // 1. First attempt: Direct client-side Google Maps DirectionsService
      if (typeof google !== 'undefined' && google.maps && google.maps.DirectionsService) {
        try {
          const directionsService = new google.maps.DirectionsService();
          const waypoints = hasRealRider
            ? [
                {
                  location: new google.maps.LatLng(riderLocation.lat, riderLocation.lng),
                  stopover: false
                }
              ]
            : undefined;

          const request: google.maps.DirectionsRequest = {
            origin: new google.maps.LatLng(warehouse.lat, warehouse.lng),
            destination: new google.maps.LatLng(destination.lat, destination.lng),
            travelMode: google.maps.TravelMode.DRIVING,
            waypoints
          };

          const response = await new Promise<google.maps.DirectionsResult | null>((resolve) => {
            directionsService.route(request, (result, status) => {
              if (status === google.maps.DirectionsStatus.OK && result) {
                resolve(result);
              } else {
                resolve(null);
              }
            });
          });

          if (response && response.routes?.[0]?.overview_path?.length) {
            const path = response.routes[0].overview_path.map((pt) => ({
              lat: pt.lat(),
              lng: pt.lng()
            }));

            let totalMeters = 0;
            let totalSeconds = 0;
            response.routes[0].legs.forEach((leg) => {
              totalMeters += leg.distance?.value || 0;
              totalSeconds += leg.duration?.value || 0;
            });
            const distKm = Math.round((totalMeters / 1000) * 10) / 10;
            const transitDurationMinutes = Math.max(1, Math.round(totalSeconds / 60));

            if (isMounted) {
              cachedRouteKey = currentRouteKey;
              cachedRoutePath = path;
              cachedDistanceKm = distKm;

              if (glowPolylineRef.current && routePolylineRef.current) {
                glowPolylineRef.current.setPath(path);
                routePolylineRef.current.setPath(path);
              }
              if (distKm > 0 && onRoadDistanceCalculated) {
                onRoadDistanceCalculated(distKm);
              }
              if (onRouteCalculated) {
                onRouteCalculated({ distanceKm: distKm, transitDurationMinutes });
              }
            }
            return;
          }
        } catch {
          // Proceed to server directions proxy
        }
      }

      // 2. Second attempt: Server-authoritative Google Directions proxy
      try {
        const originParam = `${warehouse.lat},${warehouse.lng}`;
        const destParam = `${destination.lat},${destination.lng}`;
        let proxyUrl = `/api/maps/google/directions?origin=${originParam}&destination=${destParam}`;
        if (hasRealRider) {
          proxyUrl += `&waypoints=${riderLocation.lat},${riderLocation.lng}`;
        }

        const res = await fetch(proxyUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'OK' && data.routes?.[0]?.overview_polyline?.points) {
            const encoded = data.routes[0].overview_polyline.points;
            if (typeof google !== 'undefined' && google.maps?.geometry?.encoding) {
              const decoded = google.maps.geometry.encoding.decodePath(encoded);
              const path = decoded.map((pt) => ({ lat: pt.lat(), lng: pt.lng() }));
              let totalMeters = 0;
              let totalSeconds = 0;
              data.routes[0].legs.forEach((leg: any) => {
                totalMeters += leg.distance?.value || 0;
                totalSeconds += leg.duration?.value || 0;
              });
              const distKm = Math.round((totalMeters / 1000) * 10) / 10;
              const transitDurationMinutes = Math.max(1, Math.round(totalSeconds / 60));

              if (isMounted) {
                cachedRouteKey = currentRouteKey;
                cachedRoutePath = path;
                cachedDistanceKm = distKm;

                if (glowPolylineRef.current && routePolylineRef.current) {
                  glowPolylineRef.current.setPath(path);
                  routePolylineRef.current.setPath(path);
                }
                if (distKm > 0 && onRoadDistanceCalculated) {
                  onRoadDistanceCalculated(distKm);
                }
                if (onRouteCalculated) {
                  onRouteCalculated({ distanceKm: distKm, transitDurationMinutes });
                }
              }
              return;
            }
          }
        }
      } catch {
        // Fall back gracefully
      }
    };

    fetchGoogleRoute();

    return () => {
      isMounted = false;
    };
  }, [
    map,
    warehouse.lat,
    warehouse.lng,
    destination.lat,
    destination.lng,
    riderLocation?.lat,
    riderLocation?.lng,
    isNearDestination,
    onRoadDistanceCalculated
  ]);

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
    if (map) {
      try {
        map.setOptions({ styles: ZOMATO_MAP_STYLES });
      } catch {}
    }
    onMap(map);
  }, [map, onMap]);
  return null;
};

/**
 * Resilient Delivery Map Renderer (OpenStreetMap fallback)
 * Features crisp white streets, 2D/3D building footprints, animated 3D user house, and auto-zoom when rider nears.
 */
const ResilientOpenStreetMap = ({
  warehouse,
  destination,
  riderLocation,
  riderAvatarUrl,
  riderBikeNumber,
  isNearDestination,
  isAtHouse,
  onRecenterReady
}: LiveOrderRealMapProps & {
  isNearDestination: boolean;
  isAtHouse: boolean;
  onRecenterReady: (recenterFn: () => void) => void;
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const warehouseMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const riderMarkerRef = useRef<L.Marker | null>(null);
  const glowLineRef = useRef<L.Polyline | null>(null);
  const coreLineRef = useRef<L.Polyline | null>(null);
  const hasAutoZoomedNearRef = useRef(false);

  // Delivery Rider Icon with Avatar / Bike Number
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

  // 3D User House Icon for Leaflet
  const createHouseIcon = useCallback((isNear: boolean, isAt: boolean, areaName: string) => {
    return L.divIcon({
      className: 'bg-transparent border-none',
      html: `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
          ${
            isNear
              ? `<div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);width:68px;height:68px;pointer-events:none;display:flex;align-items:center;justify-content:center;">
                  <div style="position:absolute;width:64px;height:64px;border-radius:50%;background:rgba(37,99,235,0.22);border:2px solid rgba(59,130,246,0.6);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
                  <div style="position:absolute;width:40px;height:40px;border-radius:50%;background:rgba(37,99,235,0.25);"></div>
                </div>`
              : ''
          }
          ${
            isAt
              ? `<span style="margin-bottom:2px;font-size:9px;font-weight:900;background:#059669;color:#ffffff;padding:2px 7px;border-radius:9999px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);border:1px solid #ffffff;">
                  ✅ Doorstep Arrival
                </span>`
              : isNear
              ? `<span style="margin-bottom:2px;font-size:9px;font-weight:900;background:#2563eb;color:#ffffff;padding:2px 7px;border-radius:9999px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);border:1px solid #ffffff;animation:bounce 1s infinite;">
                  ⚡ Rider Arriving Soon
                </span>`
              : ''
          }
          <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
            <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="24" cy="44" rx="18" ry="3.5" fill="rgba(15, 23, 42, 0.28)" />
              <path d="M10 21V41C10 42.1 10.9 43 12 43H36C37.1 43 38 42.1 38 41V21L24 9L10 21Z" fill="#FFFFFF" stroke="#0F172A" stroke-width="2.5" stroke-linejoin="round" />
              <path d="M6 22L24 7L42 22" stroke="#EA580C" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M24 7L38 18.5V11H34V15.2L24 7Z" fill="#C2410C" />
              <rect x="33" y="10" width="5" height="7" rx="1" fill="#EA580C" stroke="#0F172A" stroke-width="1.8" />
              <rect x="20" y="27" width="8" height="16" rx="2" fill="#0284C7" stroke="#0F172A" stroke-width="2" />
              <circle cx="26" cy="35" r="1" fill="#FFFFFF" />
              <rect x="14" y="24" width="7" height="7" rx="1.5" fill="#FEF08A" stroke="#0F172A" stroke-width="1.8" />
              <line x1="17.5" y1="24" x2="17.5" y2="31" stroke="#0F172A" stroke-width="1.2" />
              <line x1="14" y1="27.5" x2="21" y2="27.5" stroke="#0F172A" stroke-width="1.2" />
              <circle cx="24" cy="16" r="3" fill="#E0F2FE" stroke="#0F172A" stroke-width="1.8" />
            </svg>
          </div>
          <span style="margin-top:2px;font-size:9px;font-weight:900;background:#0f172a;color:#ffffff;padding:2px 7px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 5px rgba(0,0,0,0.25);border:1px solid #334155;">
            🏠 Your House ${areaName ? `• ${areaName}` : ''}
          </span>
        </div>
      `,
      iconSize: [110, 85],
      iconAnchor: [55, 60]
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

    // Clean Standard OpenStreetMap Delivery Tiles (Standard OSM - zero Carto)
    const standardOsmTiles = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    L.tileLayer(standardOsmTiles, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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
            Store Depot
          </span>
        </div>
      `,
      iconSize: [70, 68],
      iconAnchor: [35, 43]
    });

    warehouseMarkerRef.current = L.marker([warehouse.lat, warehouse.lng], { icon: warehouseIcon }).addTo(map);

    const houseIcon = createHouseIcon(isNearDestination, isAtHouse, destination.area || destination.name);
    destMarkerRef.current = L.marker([destination.lat, destination.lng], { icon: houseIcon }).addTo(map);

    // Zomato Vibrant Emerald Route Lines
    glowLineRef.current = L.polyline([[warehouse.lat, warehouse.lng], [destination.lat, destination.lng]], {
      color: '#10b981',
      weight: 9,
      opacity: 0.35,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    coreLineRef.current = L.polyline([[warehouse.lat, warehouse.lng], [destination.lat, destination.lng]], {
      color: '#059669',
      weight: 4.5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    const initialBounds = L.latLngBounds([[warehouse.lat, warehouse.lng], [destination.lat, destination.lng]]);
    map.fitBounds(initialBounds, { padding: [50, 50], maxZoom: 16 });

    onRecenterReady(() => {
      if (mapInstanceRef.current) {
        if (isNearDestination && riderLocation) {
          const nb = L.latLngBounds([
            [riderLocation.lat, riderLocation.lng],
            [destination.lat, destination.lng]
          ]);
          mapInstanceRef.current.flyToBounds(nb, { padding: [60, 60], maxZoom: 17, duration: 1 });
        } else {
          const b = L.latLngBounds([[warehouse.lat, warehouse.lng], [destination.lat, destination.lng]]);
          if (riderLocation) b.extend([riderLocation.lat, riderLocation.lng]);
          mapInstanceRef.current.fitBounds(b, { padding: [50, 50], maxZoom: 16 });
        }
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update house marker icon when rider approaches/arrives
  useEffect(() => {
    if (destMarkerRef.current) {
      const houseIcon = createHouseIcon(isNearDestination, isAtHouse, destination.area || destination.name);
      destMarkerRef.current.setIcon(houseIcon);
    }
  }, [isNearDestination, isAtHouse, destination.area, destination.name, createHouseIcon]);

  // Synchronize Rider Marker, Route Polyline, and Camera Auto-Zoom when rider is near
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

      // Update route line to connect from warehouse through rider to destination
      if (coreLineRef.current && glowLineRef.current) {
        const path: [number, number][] = [
          [warehouse.lat, warehouse.lng],
          [riderLocation.lat, riderLocation.lng],
          [destination.lat, destination.lng]
        ];
        coreLineRef.current.setLatLngs(path);
        glowLineRef.current.setLatLngs(path);
      }

      // AUTO-ZOOM WHEN RIDER REACHES AREA:
      // When rider comes near the customer's house (< 900m or near_destination), automatically frame both
      // the approaching rider and the customer's house with comfortable padding so the full neighborhood is revealed.
      if (isNearDestination) {
        if (!hasAutoZoomedNearRef.current) {
          hasAutoZoomedNearRef.current = true;
          const nearBounds = L.latLngBounds([
            [riderLocation.lat, riderLocation.lng],
            [destination.lat, destination.lng]
          ]);
          map.flyToBounds(nearBounds, {
            padding: [65, 65],
            maxZoom: 17,
            duration: 1.2
          });
        }
      } else {
        hasAutoZoomedNearRef.current = false;
      }
    } else if (riderMarkerRef.current) {
      riderMarkerRef.current.remove();
      riderMarkerRef.current = null;
    }
  }, [
    riderLocation?.lat,
    riderLocation?.lng,
    riderAvatarUrl,
    riderBikeNumber,
    isNearDestination,
    warehouse.lat,
    warehouse.lng,
    destination.lat,
    destination.lng,
    createRiderIcon
  ]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full z-0 bg-slate-50"
      style={{
        filter: 'contrast(1.02) brightness(1.01)'
      }}
    />
  );
};

/**
 * Live Order Delivery Map component using Zomato-inspired clean white layout,
 * 3D house landmark, and automatic camera framing when delivery partner approaches.
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
  isPartnerAssigned,
  orderStatus,
  onRouteCalculated
}: LiveOrderRealMapProps) => {
  const [mapsStatus, setMapsStatus] = useState<GoogleMapsStatus | null>(() => {
    const syncKey = getSynchronousGoogleMapsKey();
    return syncKey ? { available: true, billingEnabled: true, apiKey: syncKey } : null;
  });
  const [mapAuthFailed, setMapAuthFailed] = useState(false);
  const [roadDistanceKm, setRoadDistanceKm] = useState<number | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const recenterOsmRef = useRef<(() => void) | null>(null);

  // Catch any Google Maps authentication errors globally
  useEffect(() => {
    const prevHandler = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      setMapAuthFailed(true);
      if (typeof prevHandler === 'function') {
        try {
          prevHandler();
        } catch {}
      }
    };
    return () => {
      (window as any).gm_authFailure = prevHandler;
    };
  }, []);

  // Fetch Google Maps status in background if needed
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

  // Calculate live proximity distance between rider and user's destination
  const distanceToDestMeters = useMemo(() => {
    if (!hasRealRiderLocation) return Infinity;
    return getDistanceMeters(riderLocation.lat, riderLocation.lng, destination.lat, destination.lng);
  }, [hasRealRiderLocation, riderLocation?.lat, riderLocation?.lng, destination.lat, destination.lng]);

  const isNearDestination =
    distanceToDestMeters <= 900 ||
    orderStatus === 'near_destination';

  const isAtHouse = distanceToDestMeters <= 120;

  const handleRecenter = () => {
    if (mapInstance) {
      if (isNearDestination && hasRealRiderLocation) {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend({ lat: riderLocation.lat, lng: riderLocation.lng });
        bounds.extend({ lat: destination.lat, lng: destination.lng });
        mapInstance.fitBounds(bounds, { top: 70, right: 60, bottom: 70, left: 60 });
      } else {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend({ lat: warehouse.lat, lng: warehouse.lng });
        bounds.extend({ lat: destination.lat, lng: destination.lng });
        if (hasRealRiderLocation) {
          bounds.extend({ lat: riderLocation.lat, lng: riderLocation.lng });
        }
        mapInstance.fitBounds(bounds, { top: 60, right: 40, bottom: 60, left: 40 });
      }
    } else if (recenterOsmRef.current) {
      recenterOsmRef.current();
    }
  };

  const centerLat = (warehouse.lat + destination.lat) / 2;
  const centerLng = (warehouse.lng + destination.lng) / 2;

  const activeGoogleMapsKey = mapsStatus?.apiKey || getSynchronousGoogleMapsKey();
  const isGoogleMapsReady = Boolean(activeGoogleMapsKey && !mapAuthFailed);

  return (
    <div className="relative w-full aspect-square max-h-[480px] overflow-hidden bg-slate-50 select-none border-none rounded-none">
      {!activeGoogleMapsKey && mapsStatus === null ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-2">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-600">Initializing Live Delivery Map...</span>
        </div>
      ) : isGoogleMapsReady ? (
        <APIProvider apiKey={activeGoogleMapsKey!} libraries={['places', 'geometry', 'marker', 'routes']}>
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

            {/* Store / Warehouse Depot Marker */}
            <AdvancedMarker
              position={{ lat: warehouse.lat, lng: warehouse.lng }}
              title="SmartRun Central Warehouse Depot"
            >
              <div className="relative flex flex-col items-center cursor-pointer select-none">
                <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-md">
                  <path d="M17 0C7.61 0 0 7.61 0 17c0 11.55 14.88 25.4 15.51 25.99a2.02 2.02 0 0 0 2.98 0C19.12 42.4 34 28.55 34 17 34 7.61 26.39 0 17 0z" fill="#d97706" stroke="#ffffff" strokeWidth="2"/>
                </svg>
                <div className="absolute top-2 left-1/2 -translate-x-1/2 text-white">
                  <Store className="w-4 h-4 text-white" />
                </div>
                <span className="mt-0.5 text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-sm whitespace-nowrap shadow-sm">
                  Store Depot
                </span>
              </div>
            </AdvancedMarker>

            {/* 3D Customer House Destination Marker */}
            <AdvancedMarker
              position={{ lat: destination.lat, lng: destination.lng }}
              title={destination.name || 'Your House'}
            >
              <UserHouseGraphic
                isNear={isNearDestination}
                isAtHouse={isAtHouse}
                areaName={destination.area || destination.name}
              />
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
              isNearDestination={isNearDestination}
              onRoadDistanceCalculated={(km) => setRoadDistanceKm(km)}
              onRouteCalculated={onRouteCalculated}
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
          orderStatus={orderStatus}
          isNearDestination={isNearDestination}
          isAtHouse={isAtHouse}
          onRecenterReady={(fn) => {
            recenterOsmRef.current = fn;
          }}
        />
      )}

      {/* Top Floating Badge: Dynamic Distance & Arrival Status */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none flex items-center gap-2">
        {isAtHouse ? (
          <div className="bg-emerald-600 text-white backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 text-xs font-black border border-emerald-500 animate-pulse">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Rider at your doorstep!</span>
          </div>
        ) : isNearDestination ? (
          <div className="bg-blue-600 text-white backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 text-xs font-black border border-blue-500 animate-pulse">
            <Zap className="w-3.5 h-3.5" />
            <span>
              Rider in your area{' '}
              {distanceToDestMeters < 1000 ? `(${Math.round(distanceToDestMeters)}m away)` : ''}
            </span>
          </div>
        ) : (
          <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-2 text-xs font-black text-slate-800 border border-slate-200/60">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-emerald-700 font-bold">{roadDistanceKm || distanceKm} km road path</span>
          </div>
        )}

        {hasRealRiderLocation && (
          <div className="bg-emerald-600 text-white backdrop-blur-md px-2.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 text-xs font-bold border border-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            <span>Live GPS</span>
          </div>
        )}
      </div>

      {/* Floating Recenter Route Control */}
      <div className="absolute bottom-3 right-3 z-10">
        <button
          onClick={handleRecenter}
          aria-label="Recenter route"
          className="w-9 h-9 rounded-xl bg-white/95 backdrop-blur-md shadow-sm hover:bg-white text-slate-700 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/60 active:scale-95"
          title="Recenter Route"
        >
          <Navigation className="w-4.5 h-4.5 text-emerald-600" />
        </button>
      </div>
    </div>
  );
};
