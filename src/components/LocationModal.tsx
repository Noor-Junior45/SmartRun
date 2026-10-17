import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Search,
  Crosshair,
  MapPin,
  Check,
  ArrowLeft,
  Home,
  Briefcase,
  Building2,
  Trash2,
  Pencil,
  ChevronRight,
  Phone,
  User as UserIcon,
  Loader2,
  Plus,
  RotateCw,
  Navigation
} from 'lucide-react';
import { KOLKATA_AREAS, getKolkataAreaByPincode } from '../data/kolkataAreas';
import { KolkataArea, SavedAddress, UserProfile } from '../types';
import {
  getStoredAddresses,
  fetchUserAddresses,
  saveAddressToFirestore,
  deleteAddressFromFirestore,
  subscribeToAddresses,
  cleanPhoneAutofill,
  ACTIVE_SAVED_ADDRESS_KEY,
  getActiveAddressStorageKey,
  safeSetItem,
  safeRemoveItem
} from '../services/supabaseService';
import { showToast } from '../utils/toast';
import {
  mapManager,
  IMapInstance,
  MapSearchResult,
  MapCoordinates
} from '../services/maps';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedAddresses?: SavedAddress[];
  currentArea: KolkataArea;
  activeAddress?: SavedAddress | null;
  initialAddressToEdit?: SavedAddress | null;
  userProfile?: UserProfile | null;
  userPhone?: string | null;
  onSelectArea: (area: KolkataArea, address?: SavedAddress) => void;
}

// Helper function to extract a clean name from email if name is not set
function deriveNameFromEmail(email?: string): string {
  if (!email || !email.includes('@')) return '';
  const username = email.split('@')[0];
  const cleaned = username.replace(/[._-]+/g, ' ').replace(/\d+$/, '').trim();
  if (!cleaned) return username;
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export const LocationModal = ({
  isOpen,
  onClose,
  savedAddresses: externalSavedAddresses,
  currentArea,
  activeAddress,
  initialAddressToEdit,
  userProfile,
  userPhone,
  onSelectArea
}: LocationModalProps) => {
  // Navigation steps: 'search_home' | 'map_pin' | 'details_form'
  const [step, setStep] = useState<'search_home' | 'map_pin' | 'details_form'>('search_home');
  // Source that opened the map: 'add_saved_address' | 'detect_location'
  const [mapEntrySource, setMapEntrySource] = useState<'add_saved_address' | 'detect_location'>('detect_location');
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  // Search & Map States
  const [searchQuery, setSearchQuery] = useState('');
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isMapDragging, setIsMapDragging] = useState(false);
  const [mapSearchResults, setMapSearchResults] = useState<MapSearchResult[]>([]);
  const [floatingSearchResults, setFloatingSearchResults] = useState<MapSearchResult[]>([]);
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [isSearchingFloatingMap, setIsSearchingFloatingMap] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);
  const floatingSearchAbortRef = useRef<AbortController | null>(null);

  // Map Coordinates & Pin Location
  const [pinCoordinates, setPinCoordinates] = useState<MapCoordinates>({
    lat: currentArea.lat || 22.5735,
    lng: currentArea.lng || 88.4331
  });
  const pinCoordinatesRef = useRef<MapCoordinates>({
    lat: currentArea.lat || 22.5735,
    lng: currentArea.lng || 88.4331
  });

  // User's physical live GPS location (marked by persistent Blue Dot on Google Map)
  const [liveGpsCoords, setLiveGpsCoords] = useState<MapCoordinates | null>(null);
  const liveGpsCoordsRef = useRef<MapCoordinates | null>(null);

  useEffect(() => {
    pinCoordinatesRef.current = pinCoordinates;
  }, [pinCoordinates]);

  const [detectedStreet, setDetectedStreet] = useState<string>(
    currentArea.exactStreet || currentArea.name
  );
  const [detectedBuilding, setDetectedBuilding] = useState<string>('');
  const [matchedArea, setMatchedArea] = useState<KolkataArea>(currentArea);

  // Real Saved Addresses
  const [internalSavedAddresses, setInternalSavedAddresses] = useState<SavedAddress[]>(() => getStoredAddresses());
  const savedAddresses = externalSavedAddresses && externalSavedAddresses.length > 0
    ? externalSavedAddresses
    : internalSavedAddresses;

  // Form Fields for Step 3
  const [houseName, setHouseName] = useState('');
  const [houseFlat, setHouseFlat] = useState('');
  const [buildingRoad, setBuildingRoad] = useState('');
  const [landmark, setLandmark] = useState('');
  const [addressTag, setAddressTag] = useState<'home' | 'work' | 'hotel' | 'other'>('home');
  const [customTagLabel, setCustomTagLabel] = useState('');

  // Receiver Name
  const [receiverName, setReceiverName] = useState(() => {
    if (activeAddress?.receiverName) return activeAddress.receiverName;
    if (userProfile?.name && userProfile.name.toLowerCase() !== 'customer') return userProfile.name;
    const emailToUse = userProfile?.email || '';
    const derived = deriveNameFromEmail(emailToUse);
    if (derived) return derived;
    return '';
  });

  // Receiver Phone
  const [receiverPhone, setReceiverPhone] = useState(() => {
    if (activeAddress?.receiverPhone) return activeAddress.receiverPhone;
    if (userProfile?.phone) return userProfile.phone;
    if (userPhone) return userPhone;
    return '';
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Map Instance Ref
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<IMapInstance | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Subscribe to real-time addresses once
  useEffect(() => {
    const unsub = subscribeToAddresses((list) => {
      setInternalSavedAddresses(list);
    });
    return () => unsub();
  }, []);

  const handleStartEditAddress = useCallback((addr: SavedAddress, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingAddressId(addr.id);
    setHouseName(addr.houseName || '');
    setHouseFlat(addr.houseFlat || '');
    setBuildingRoad(addr.buildingRoad || addr.area?.name || '');
    setLandmark(addr.landmark || '');
    setAddressTag(addr.tag || 'home');
    setCustomTagLabel(addr.tagLabel || '');
    setReceiverName(addr.receiverName || userProfile?.name || '');
    setReceiverPhone(addr.receiverPhone || userProfile?.phone || userPhone || '');
    setDetectedStreet(addr.buildingRoad || addr.area?.name || '');
    setMatchedArea(addr.area || currentArea);
    setPinCoordinates({
      lat: addr.lat || addr.area?.lat || currentArea.lat || 22.5735,
      lng: addr.lng || addr.area?.lng || currentArea.lng || 88.4331
    });
    setFormError(null);
    setStep('details_form');
  }, [currentArea, userProfile, userPhone]);

  const prevIsOpenRef = useRef(false);
  const prevEditAddressRef = useRef<string | null | undefined>(undefined);

  // Reset state ONLY when modal first opens or when explicitly editing a new address
  useEffect(() => {
    const isFirstOpen = isOpen && !prevIsOpenRef.current;
    const editId = initialAddressToEdit?.id || null;
    const isEditTargetChanged = editId !== prevEditAddressRef.current;

    prevIsOpenRef.current = isOpen;
    prevEditAddressRef.current = editId;

    if (isOpen) {
      if (isFirstOpen) {
        fetchUserAddresses().then((list) => {
          if (Array.isArray(list)) setInternalSavedAddresses(list);
        }).catch(() => {});
      }

      if (initialAddressToEdit && (isFirstOpen || isEditTargetChanged)) {
        handleStartEditAddress(initialAddressToEdit);
      } else if (isFirstOpen) {
        setEditingAddressId(null);
        setStep('search_home');
        setSearchQuery('');
        setMapSearchQuery('');
        setFormError(null);

        // Auto-fill Receiver Name
        if (activeAddress?.receiverName) {
          setReceiverName(activeAddress.receiverName);
        } else if (userProfile?.name && userProfile.name.toLowerCase() !== 'customer') {
          setReceiverName(userProfile.name);
        } else {
          const emailToUse = userProfile?.email || '';
          const derived = deriveNameFromEmail(emailToUse);
          if (derived) {
            setReceiverName(derived);
          }
        }

        // Auto-fill Receiver Phone
        if (activeAddress?.receiverPhone) {
          setReceiverPhone(activeAddress.receiverPhone);
        } else if (userProfile?.phone) {
          setReceiverPhone(userProfile.phone);
        } else if (userPhone) {
          setReceiverPhone(userPhone);
        } else {
          setReceiverPhone('');
        }
      }
    }
  }, [isOpen, activeAddress, initialAddressToEdit, userProfile, userPhone, handleStartEditAddress]);

  // Reverse geocode and resolve closest Kolkata area with ACCURATE pin code
  const resolveCoordinatesToAddress = useCallback(async (lat: number, lng: number) => {
    try {
      const result = await mapManager.reverseGeocode({ lat, lng });
      if (result && (result.street || result.formattedAddress)) {
        const street = result.street || result.formattedAddress || 'Kolkata';
        setDetectedStreet(street);
        setBuildingRoad(street);
        if (result.building) {
          setDetectedBuilding(result.building);
          setHouseName(result.building);
        } else {
          setDetectedBuilding('');
        }

        // Find closest area strictly by geometric physical distance
        let closest = KOLKATA_AREAS[0];
        let minDistance = Number.MAX_VALUE;

        KOLKATA_AREAS.forEach((area) => {
          if (area.lat && area.lng) {
            const dist = Math.hypot(area.lat - lat, area.lng - lng);
            if (dist < minDistance) {
              minDistance = dist;
              closest = area;
            }
          }
        });

        // Determine correct pincode:
        // Priority 1: Valid 6-digit pin from Google Maps reverse geocode
        // Priority 2: Closest Kolkata area geometric pin
        const validGooglePin = (result.pincode && /^\d{6}$/.test(result.pincode)) ? result.pincode : null;
        const resolvedPin = validGooglePin || closest.pincode;

        const areaForPin = validGooglePin ? getKolkataAreaByPincode(validGooglePin) : null;
        const baseArea = areaForPin || closest;

        const resolvedArea: KolkataArea = {
          ...baseArea,
          pincode: resolvedPin,
          name: areaForPin ? areaForPin.name : (result.locality || baseArea.name),
          exactStreet: street
        };
        setMatchedArea(resolvedArea);
        return;
      }
    } catch (e) {
      console.warn('[LocationModal] reverse geocode notice:', e);
    }

    // Geometry closest fallback if reverse geocoding totally fails
    let closest = KOLKATA_AREAS[0];
    let minDistance = Number.MAX_VALUE;

    KOLKATA_AREAS.forEach((area) => {
      if (area.lat && area.lng) {
        const dist = Math.hypot(area.lat - lat, area.lng - lng);
        if (dist < minDistance) {
          minDistance = dist;
          closest = area;
        }
      }
    });

    setMatchedArea(closest);
    const street = closest.exactStreet || closest.name;
    setDetectedStreet(street);
    setBuildingRoad(street);
  }, []);

  // Map initialization for 'map_pin' step via MapProviderManager (using Google Maps exclusively)
  // FLICKER-FREE: Does not re-initialize on every coordinate update or drag
  const mountMapInstance = useCallback(async () => {
    if (!mapContainerRef.current) return;

    // If map is already mounted, simply invalidate size and do not destroy/flicker!
    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      return;
    }

    const lat = pinCoordinatesRef.current.lat || currentArea.lat || 22.5735;
    const lng = pinCoordinatesRef.current.lng || currentArea.lng || 88.4331;

    try {
      const { instance } = await mapManager.renderMap(
        mapContainerRef.current,
        {
          center: { lat, lng },
          zoom: 18,
          minZoom: 12,
          maxZoom: 20,
          onMoveStart: () => {
            setIsMapDragging(true);
          },
          onMove: (coords) => {
            // Keep ref updated during drag without triggering state re-renders on every frame
            pinCoordinatesRef.current = coords;
          },
          onMoveEnd: (coords) => {
            // State update and address resolution strictly on drag end (zero flickering!)
            setIsMapDragging(false);
            pinCoordinatesRef.current = coords;
            setPinCoordinates(coords);
            resolveCoordinatesToAddress(coords.lat, coords.lng);
          }
        },
        'google'
      );

      mapInstanceRef.current = instance;
      instance.invalidateSize();
      setTimeout(() => instance?.invalidateSize(), 100);
      setTimeout(() => instance?.invalidateSize(), 300);

      // Restore persistent blue dot marker if user already has a live GPS location
      if (liveGpsCoordsRef.current && instance.setLiveLocationMarker) {
        instance.setLiveLocationMarker(liveGpsCoordsRef.current);
        setTimeout(() => {
          if (liveGpsCoordsRef.current && instance.setLiveLocationMarker) {
            instance.setLiveLocationMarker(liveGpsCoordsRef.current);
          }
        }, 200);
      }

      resolveCoordinatesToAddress(lat, lng);
    } catch (err) {
      console.error('[LocationModal] Map render failed:', err);
    }
  }, [currentArea.lat, currentArea.lng, resolveCoordinatesToAddress]);

  // Effect to mount map when step becomes 'map_pin'
  useEffect(() => {
    if (!isOpen || step !== 'map_pin') {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.destroy();
        } catch {}
        mapInstanceRef.current = null;
      }
      return;
    }

    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        mountMapInstance();
      }
    }, 60);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, step, mountMapInstance]);

  // Fly to target coordinates on map
  const flyToCoords = (lat: number, lng: number, zoom = 18) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({ lat, lng }, zoom);
      mapInstanceRef.current.invalidateSize();
    } else {
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo({ lat, lng }, zoom);
          mapInstanceRef.current.invalidateSize();
        }
      }, 250);
    }
  };

  // Re-center / Refresh current location on map
  const handleRefreshMap = useCallback(async () => {
    const target = liveGpsCoordsRef.current || pinCoordinatesRef.current;
    const lat = target.lat || currentArea.lat || 22.5735;
    const lng = target.lng || currentArea.lng || 88.4331;
    flyToCoords(lat, lng, 18);
    await resolveCoordinatesToAddress(lat, lng);
    showToast(liveGpsCoordsRef.current ? 'Centered on your live location' : 'Map centered & refreshed', 'info');
  }, [currentArea, resolveCoordinatesToAddress]);

  // Trigger GPS Current Location fetch using Geolocation API
  const handleDetectCurrentLocation = async (goToMap = true) => {
    setMapEntrySource('detect_location');
    setGpsLoading(true);

    try {
      const coords = await mapManager.getCurrentPosition();
      pinCoordinatesRef.current = coords;
      setPinCoordinates(coords);
      setLiveGpsCoords(coords);
      liveGpsCoordsRef.current = coords;

      // Add persistent Blue Dot marker at the user's physical live GPS location
      if (mapInstanceRef.current && mapInstanceRef.current.setLiveLocationMarker) {
        mapInstanceRef.current.setLiveLocationMarker(coords);
      }

      const revRes = await mapManager.reverseGeocode(coords);
      const street = revRes.street || revRes.formattedAddress || 'Kolkata';
      setDetectedStreet(street);
      setBuildingRoad(street);
      if (revRes.building) {
        setDetectedBuilding(revRes.building);
        setHouseName(revRes.building);
      } else {
        setDetectedBuilding('');
      }

      // Closest Kolkata area by geometric distance
      let closest = KOLKATA_AREAS[0];
      let minDistance = Number.MAX_VALUE;

      KOLKATA_AREAS.forEach((a) => {
        if (a.lat && a.lng) {
          const dist = Math.hypot(a.lat - coords.lat, a.lng - coords.lng);
          if (dist < minDistance) {
            minDistance = dist;
            closest = a;
          }
        }
      });

      // Use valid 6-digit PIN from Google reverse geocode if present, otherwise closest physical area's PIN
      const validPin = (revRes.pincode && /^\d{6}$/.test(revRes.pincode)) ? revRes.pincode : null;
      const resolvedPin = validPin || closest.pincode;
      const areaForPin = validPin ? getKolkataAreaByPincode(validPin) : null;
      const baseArea = areaForPin || closest;

      const updatedArea: KolkataArea = {
        ...baseArea,
        pincode: resolvedPin,
        exactStreet: street
      };
      setMatchedArea(updatedArea);
      setGpsLoading(false);

      if (goToMap) {
        setStep('map_pin');
        setTimeout(() => {
          flyToCoords(coords.lat, coords.lng, 18);
          if (mapInstanceRef.current?.setLiveLocationMarker) {
            mapInstanceRef.current.setLiveLocationMarker(coords);
          }
        }, 150);
      }
      showToast(`Location detected: ${street} (PIN ${resolvedPin})`, 'success');
    } catch (err: any) {
      console.warn('[LocationModal] GPS detection notice:', err);
      setGpsLoading(false);
      const isDenied = err?.code === 1 || String(err?.message || '').toLowerCase().includes('denied');
      showToast(
        isDenied
          ? 'Location permission not granted. Opened map so you can pick your spot.'
          : 'Unable to acquire direct GPS fix. Centered on Kolkata.',
        'info',
        3500
      );
      const fallbackLat = pinCoordinates.lat || currentArea.lat || 22.5735;
      const fallbackLng = pinCoordinates.lng || currentArea.lng || 88.4331;
      setStep('map_pin');
      setTimeout(() => flyToCoords(fallbackLat, fallbackLng, 16), 200);
    }
  };

  // Step 1: Real-time Places & Buildings Search
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      if (searchAbortRef.current) searchAbortRef.current.abort();
      setMapSearchResults([]);
      setIsSearchingMap(false);
      return;
    }

    if (searchAbortRef.current) searchAbortRef.current.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    setIsSearchingMap(true);

    const debounceTimer = setTimeout(async () => {
      try {
        const results = await mapManager.searchPlaces(q, pinCoordinates);
        if (results && results.length > 0) {
          setMapSearchResults(results);
          setIsSearchingMap(false);
          return;
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('[LocationModal] Search error:', err);
        }
      }

      // Fallback with Kolkata areas matching query
      const localMatches: MapSearchResult[] = KOLKATA_AREAS.filter((area) => {
        const lowerQ = q.toLowerCase();
        return (
          area.name.toLowerCase().includes(lowerQ) ||
          area.pincode.includes(lowerQ) ||
          (area.exactStreet && area.exactStreet.toLowerCase().includes(lowerQ))
        );
      }).map((area) => ({
        id: `area-${area.pincode}`,
        name: area.name,
        building: area.name,
        road: area.exactStreet || area.name,
        area: area.name,
        secondaryText: `${area.exactStreet ? area.exactStreet + ', ' : ''}Kolkata, West Bengal • PIN ${area.pincode}`,
        lat: area.lat || 22.5735,
        lng: area.lng || 88.4331,
        pincode: area.pincode,
        provider: 'local' as const
      }));

      setMapSearchResults(localMatches);
      setIsSearchingMap(false);
    }, 200);

    return () => {
      clearTimeout(debounceTimer);
      controller.abort();
    };
  }, [searchQuery, pinCoordinates]);

  // Step 2: Floating search directly on top of the map
  useEffect(() => {
    const q = mapSearchQuery.trim();
    if (!q) {
      if (floatingSearchAbortRef.current) floatingSearchAbortRef.current.abort();
      setFloatingSearchResults([]);
      setIsSearchingFloatingMap(false);
      return;
    }

    if (floatingSearchAbortRef.current) floatingSearchAbortRef.current.abort();
    const controller = new AbortController();
    floatingSearchAbortRef.current = controller;

    setIsSearchingFloatingMap(true);

    const debounceTimer = setTimeout(async () => {
      try {
        const results = await mapManager.searchPlaces(q, pinCoordinates);
        if (results && results.length > 0) {
          setFloatingSearchResults(results);
          setIsSearchingFloatingMap(false);
          return;
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('[LocationModal] Map search error:', err);
        }
      }

      const localMatches: MapSearchResult[] = KOLKATA_AREAS.filter((area) => {
        const lowerQ = q.toLowerCase();
        return (
          area.name.toLowerCase().includes(lowerQ) ||
          area.pincode.includes(lowerQ) ||
          (area.exactStreet && area.exactStreet.toLowerCase().includes(lowerQ))
        );
      }).map((area) => ({
        id: `map-area-${area.pincode}`,
        name: area.name,
        building: area.name,
        road: area.exactStreet || area.name,
        area: area.name,
        secondaryText: `${area.exactStreet ? area.exactStreet + ', ' : ''}Kolkata • PIN ${area.pincode}`,
        lat: area.lat || 22.5735,
        lng: area.lng || 88.4331,
        pincode: area.pincode,
        provider: 'local' as const
      }));

      setFloatingSearchResults(localMatches);
      setIsSearchingFloatingMap(false);
    }, 200);

    return () => {
      clearTimeout(debounceTimer);
      controller.abort();
    };
  }, [mapSearchQuery, pinCoordinates]);

  // Handle selection of a search result
  const handleSelectMapSearchResult = async (result: MapSearchResult, openPinMap = true) => {
    let lat = result.lat;
    let lng = result.lng;
    let pin = result.pincode;

    if (result.placeId && (!lat || !lng)) {
      try {
        const details = await mapManager.getPlaceDetails(result.placeId);
        if (details) {
          lat = details.lat;
          lng = details.lng;
          if (details.pincode) pin = details.pincode;
        }
      } catch (err) {
        console.warn('[LocationModal] Could not fetch place details:', err);
      }
    }

    const finalLat = lat || 22.5735;
    const finalLng = lng || 88.4331;

    setPinCoordinates({ lat: finalLat, lng: finalLng });

    // Match closest Kolkata service hub
    let closest = KOLKATA_AREAS[0];
    let minDistance = Number.MAX_VALUE;

    KOLKATA_AREAS.forEach((area) => {
      if (area.lat && area.lng) {
        const dist = Math.hypot(area.lat - finalLat, area.lng - finalLng);
        if (dist < minDistance) {
          minDistance = dist;
          closest = area;
        }
      }
    });

    const validPin = pin && /^\d{6}$/.test(pin) ? pin : null;
    const resolvedPin = validPin || closest.pincode;
    const areaForPin = validPin ? getKolkataAreaByPincode(validPin) : null;
    const baseArea = areaForPin || closest;

    const street = result.name || baseArea.exactStreet || baseArea.name;
    const updatedArea: KolkataArea = {
      ...baseArea,
      pincode: resolvedPin,
      exactStreet: street
    };

    setMatchedArea(updatedArea);
    setDetectedStreet(street);

    const buildingInfo = result.building || result.name;
    if (result.building) {
      setDetectedBuilding(result.building);
      setHouseName(result.building);
    } else {
      setDetectedBuilding('');
    }
    const fullStreetAddress = result.road && buildingInfo !== result.road
      ? `${buildingInfo}, ${result.road}`
      : (result.secondaryText || street);

    setBuildingRoad(fullStreetAddress);
    if (result.building) setHouseFlat(result.building);
    if (result.road) setLandmark(result.road);

    setMapSearchQuery('');
    setFloatingSearchResults([]);

    if (openPinMap) {
      setMapEntrySource('detect_location');
      setStep('map_pin');
      setTimeout(() => {
        flyToCoords(finalLat, finalLng, 18);
      }, 150);
    }
  };

  // Proceed to address details form (Step 3)
  const handleProceedToDetails = () => {
    setBuildingRoad(detectedStreet || matchedArea.exactStreet || matchedArea.name);
    setFormError(null);
    setStep('details_form');
  };

  // Select an existing saved address
  const handleSelectSavedAddress = (saved: SavedAddress) => {
    try {
      safeSetItem(getActiveAddressStorageKey(), JSON.stringify(saved));
      safeSetItem(ACTIVE_SAVED_ADDRESS_KEY, JSON.stringify(saved));
    } catch (e) {
      console.error(e);
    }

    onSelectArea(saved.area, saved);
    onClose();
  };

  // Delete saved address
  const handleDeleteAddress = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteAddressFromFirestore(id);
      showToast('Address removed', 'info');
    } catch {
      showToast('Address removed locally', 'info');
    }
  };

  // Save address form
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseName.trim()) {
      setFormError('Please enter House / Apartment / Building Name');
      return;
    }
    if (!houseFlat.trim()) {
      setFormError('Please enter Flat / Floor / House Number');
      return;
    }

    const targetId = editingAddressId || `addr-${Date.now()}`;
    const formatted = `${houseFlat.trim()}, ${houseName.trim()}, ${buildingRoad.trim()}, ${matchedArea.name} (PIN ${matchedArea.pincode})`;

    const newAddress: SavedAddress = {
      id: targetId,
      tag: addressTag,
      tagLabel: addressTag === 'other' && customTagLabel.trim() ? customTagLabel.trim() : undefined,
      houseName: houseName.trim(),
      houseFlat: houseFlat.trim(),
      buildingRoad: buildingRoad.trim() || matchedArea.name,
      landmark: landmark.trim() || undefined,
      formattedExactAddress: formatted,
      area: matchedArea,
      lat: pinCoordinates.lat,
      lng: pinCoordinates.lng,
      receiverName: receiverName.trim() || undefined,
      receiverPhone: receiverPhone.trim() || undefined,
      createdAt: editingAddressId
        ? (savedAddresses.find((a) => a.id === editingAddressId)?.createdAt || new Date().toISOString())
        : new Date().toISOString()
    };

    try {
      const res = await saveAddressToFirestore(newAddress);
      if (res.success) {
        showToast(editingAddressId ? 'Address updated successfully!' : 'Address saved and synced successfully!', 'success');
      } else {
        showToast('Address saved locally.', 'info');
      }
    } catch {
      showToast('Address saved locally.', 'info');
    }

    try {
      safeSetItem(getActiveAddressStorageKey(), JSON.stringify(newAddress));
      safeSetItem(ACTIVE_SAVED_ADDRESS_KEY, JSON.stringify(newAddress));
    } catch (err) {
      console.error(err);
    }

    setEditingAddressId(null);
    onSelectArea(matchedArea, newAddress);
    onClose();
  };

  const getTagIcon = (tag: SavedAddress['tag']) => {
    switch (tag) {
      case 'home':
        return <Home className="w-4 h-4 text-[#e23744]" />;
      case 'work':
        return <Briefcase className="w-4 h-4 text-blue-600" />;
      case 'hotel':
        return <Building2 className="w-4 h-4 text-purple-600" />;
      default:
        return <MapPin className="w-4 h-4 text-amber-600" />;
    }
  };

  const getTagBadgeStyle = (tag: SavedAddress['tag']) => {
    switch (tag) {
      case 'home':
        return 'bg-red-50 text-[#e23744] border-red-200';
      case 'work':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'hotel':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const getTagLabel = (addr: SavedAddress) => {
    if (addr.tag === 'home') return 'Home';
    if (addr.tag === 'work') return 'Work';
    if (addr.tag === 'hotel') return 'Hotel';
    return addr.tagLabel || 'Other';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-start bg-black/60 backdrop-blur-[3px] transition-opacity animate-in fade-in duration-200">
      {/* Backdrop click to close (active on laptop/desktop so clicking outside side panel closes it) */}
      <div
        className="absolute inset-0 -z-10 cursor-pointer"
        onClick={onClose}
        aria-label="Close modal background"
      />

      {/* Main Container: On laptop & desktop, always stays within the side menu drawer panel! */}
      <div
        id="location-drawer-panel"
        className="h-full bg-white flex flex-col overflow-hidden z-10 w-full sm:w-[480px] sm:max-w-[480px] md:w-[500px] md:max-w-[500px] lg:w-[520px] lg:max-w-[520px] shadow-2xl sm:border-r border-slate-200 animate-in slide-in-from-left duration-200 relative"
      >
        {/* ================= STEP 1: SEARCH & SAVED ADDRESSES ================= */}
        {step === 'search_home' && (
          <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar bg-[#f8fafc]">
            {/* Top Header without description */}
            <div className="bg-white px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100 shrink-0 sticky top-0 z-20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-50 text-[#e23744] flex items-center justify-center font-black">
                    <Navigation className="w-4 h-4 fill-[#e23744]" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                      Select delivery location
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  id="location-drawer-close-btn"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-black flex items-center justify-center transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Search Input Box */}
              <div className="relative">
                <div className="flex items-center bg-white border border-slate-200 focus-within:border-[#e23744] focus-within:ring-2 focus-within:ring-[#e23744]/15 transition-all px-3.5 py-2.5 rounded-xl shadow-xs">
                  <Search className="w-4 h-4 text-[#e23744] shrink-0 mr-2.5" />
                  <input
                    type="text"
                    id="location-search-input"
                    placeholder="Search for area, apartment, street name, PIN..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-none text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    autoFocus
                  />
                  {isSearchingMap ? (
                    <Loader2 className="w-4 h-4 text-[#e23744] animate-spin shrink-0 ml-2" />
                  ) : searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-xs text-slate-400 hover:text-slate-700 font-semibold px-1 py-0.5 ml-2 cursor-pointer"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 sm:p-6 space-y-4">
              {/* Real-time Search Results List */}
              {searchQuery.trim() ? (
                <div className="bg-white border border-slate-200 shadow-xs rounded-2xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-slate-800">
                      <Search className="w-3.5 h-3.5 text-[#e23744]" />
                      Search Results ({mapSearchResults.length})
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 normal-case tracking-normal">
                      Google Places API
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-[340px] overflow-y-auto">
                    {mapSearchResults.length > 0 ? (
                      mapSearchResults.map((result) => (
                        <div
                          key={result.id}
                          onClick={() => handleSelectMapSearchResult(result, true)}
                          className="w-full p-3.5 text-left hover:bg-red-50/50 flex items-center justify-between group cursor-pointer transition-colors"
                        >
                          <div className="flex items-start gap-3 truncate text-left min-w-0 pr-2">
                            <div className="w-8 h-8 rounded-xl bg-red-50 text-[#e23744] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#e23744] group-hover:text-white transition-colors">
                              {result.building ? (
                                <Building2 className="w-4 h-4" />
                              ) : (
                                <MapPin className="w-4 h-4" />
                              )}
                            </div>
                            <div className="truncate min-w-0">
                              <div className="text-sm font-bold text-slate-900 group-hover:text-black truncate">
                                {result.name}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5 truncate">
                                {result.secondaryText}
                              </div>
                              {(result.building || result.pincode) && (
                                <div className="flex items-center gap-1.5 mt-1">
                                  {result.building && (
                                    <span className="inline-flex items-center text-[10px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                      {result.building}
                                    </span>
                                  )}
                                  {result.pincode && (
                                    <span className="inline-flex items-center text-[10px] font-bold bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded">
                                      PIN {result.pincode}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <span className="text-[11px] font-bold text-[#e23744] bg-red-50 group-hover:bg-[#e23744] group-hover:text-white px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                              <Crosshair className="w-3 h-3" />
                              Select
                            </span>
                          </div>
                        </div>
                      ))
                    ) : !isSearchingMap ? (
                      <div className="p-6 text-center">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-700">No matching location found</p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Try searching by landmark, building name, or PIN code
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Set Location on Map Action */}
              <button
                type="button"
                id="open-interactive-map-btn"
                onClick={() => {
                  setMapEntrySource('detect_location');
                  setStep('map_pin');
                  const initLat = currentArea.lat || 22.5735;
                  const initLng = currentArea.lng || 88.4331;
                  setPinCoordinates({ lat: initLat, lng: initLng });
                  setTimeout(() => flyToCoords(initLat, initLng, 18), 150);
                }}
                className="w-full bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-900 rounded-2xl p-4 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md group flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-slate-900 text-white shadow-md group-hover:scale-105 transition-all duration-200 shrink-0">
                    <MapPin className="w-5 h-5 stroke-[2.5] text-white" />
                  </div>
                  <div className="text-sm font-black text-slate-900 group-hover:text-black transition-colors tracking-tight">
                    Set location on map
                  </div>
                </div>

                <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-slate-200 text-slate-400 group-hover:text-black flex items-center justify-center transition-colors shrink-0">
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </div>
              </button>

              {/* Saved Addresses Section */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3 px-0.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Saved Addresses ({savedAddresses.length})
                  </span>

                  <button
                    type="button"
                    id="add-location-plus-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditingAddressId(null);
                      setHouseName('');
                      setHouseFlat('');
                      setLandmark('');
                      setReceiverName(
                        userProfile?.name && userProfile.name.toLowerCase() !== 'customer'
                          ? userProfile.name
                          : activeAddress?.receiverName || ''
                      );
                      setReceiverPhone(
                        userProfile?.phone || userPhone || activeAddress?.receiverPhone || ''
                      );
                      setAddressTag('home');
                      setCustomTagLabel('');
                      setFormError(null);
                      setMapEntrySource('add_saved_address');

                      const initLat = currentArea.lat || 22.5735;
                      const initLng = currentArea.lng || 88.4331;
                      setPinCoordinates({ lat: initLat, lng: initLng });
                      setStep('map_pin');

                      setTimeout(() => {
                        flyToCoords(initLat, initLng, 18);
                      }, 200);
                    }}
                    className="text-xs font-bold text-[#e23744] hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                    title="Add new delivery address"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add New</span>
                  </button>
                </div>

                {savedAddresses.length > 0 ? (
                  <div className="space-y-2.5">
                    {savedAddresses.map((addr) => {
                      const isSelected = activeAddress?.id === addr.id;
                      return (
                        <div
                          key={addr.id}
                          onClick={() => handleSelectSavedAddress(addr)}
                          className={`p-4 bg-white border transition-all cursor-pointer rounded-2xl flex items-start justify-between gap-3 shadow-xs hover:shadow-md ${
                            isSelected
                              ? 'border-[#e23744] ring-2 ring-[#e23744]/20 bg-red-50/20'
                              : 'border-slate-200/90 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-3.5 overflow-hidden min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                              {getTagIcon(addr.tag)}
                            </div>
                            <div className="overflow-hidden min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-slate-900 truncate">
                                  {addr.houseName || addr.houseFlat || 'Address'}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider shrink-0 ${getTagBadgeStyle(addr.tag)}`}>
                                  {getTagLabel(addr)}
                                </span>
                              </div>
                              <div className="text-xs font-medium text-slate-600 truncate mt-1">
                                {addr.houseFlat ? `${addr.houseFlat}, ` : ''}{addr.buildingRoad || ''}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                                {addr.area?.name || 'Kolkata'} • PIN {addr.area?.pincode || '700001'}
                                {addr.receiverName ? ` • ${addr.receiverName}` : ''}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 self-center">
                            <button
                              type="button"
                              onClick={(e) => handleStartEditAddress(addr, e)}
                              className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                              title="Edit address"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteAddress(addr.id, e)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                              title="Delete address"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            {isSelected && (
                              <div className="w-6 h-6 rounded-full bg-[#e23744] text-white flex items-center justify-center shrink-0 ml-1">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-5 text-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                      <Home className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">No saved addresses yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Pin your doorstep on the map to save your home or office address.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: GOOGLE MAP PINNING VIEW (INSIDE SIDE MENU TAB) ================= */}
        {step === 'map_pin' && (
          <div className="w-full h-full relative overflow-hidden bg-slate-100 flex flex-col">
            {/* Top Bar: Floating Search Bar on Top + Cross Button on Right */}
            <div className="absolute top-3.5 inset-x-3.5 z-[1100] flex items-center gap-2">
              {/* Floating Search Input */}
              <div className="flex-1 relative min-w-0">
                <div className="flex items-center bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl px-3.5 py-2.5 shadow-md">
                  <Search className="w-4 h-4 text-[#e23744] shrink-0 mr-2" />
                  <input
                    type="text"
                    placeholder="Search area, road or PIN on map..."
                    value={mapSearchQuery}
                    onChange={(e) => setMapSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-none text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                  {isSearchingFloatingMap ? (
                    <Loader2 className="w-4 h-4 text-[#e23744] animate-spin shrink-0 ml-1" />
                  ) : mapSearchQuery ? (
                    <button
                      type="button"
                      onClick={() => setMapSearchQuery('')}
                      className="text-xs text-slate-400 hover:text-slate-700 font-bold ml-1 cursor-pointer"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>

                {/* Floating Autocomplete Dropdown over Map */}
                {floatingSearchResults.length > 0 && mapSearchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-[240px] overflow-y-auto z-[1150]">
                    {floatingSearchResults.map((res) => (
                      <div
                        key={res.id}
                        onClick={() => handleSelectMapSearchResult(res, true)}
                        className="p-3 text-left hover:bg-red-50/60 cursor-pointer flex items-center gap-2.5 transition-colors"
                      >
                        <MapPin className="w-4 h-4 text-[#e23744] shrink-0" />
                        <div className="truncate min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">{res.name}</div>
                          <div className="text-[11px] text-slate-500 truncate">{res.secondaryText}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cross button right next to search bar on right side */}
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-md shadow-md text-slate-700 hover:text-black hover:bg-white border border-slate-200 flex items-center justify-center shrink-0 cursor-pointer transition-transform active:scale-95"
                title="Close"
              >
                <X className="w-4.5 h-4.5 stroke-[2.5]" />
              </button>
            </div>

            {/* Side Menu Tab Map Canvas */}
            <div className="w-full flex-1 relative">
              <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-0" />

              {/* CENTER RED MAP POINTER (SLIM TEARDROP WITH HOLE DESIGN) */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[950]">
                {/* 0x0 Center Anchor placed exactly at (50%, 50%) */}
                <div className="relative w-0 h-0 flex items-center justify-center">
                  {/* Ground Crosshair Ring & Target Shadow positioned at exact center (0, 0) */}
                  <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                    <div
                      className={`w-3.5 h-3.5 rounded-full border-2 border-[#e23744] bg-[#e23744]/20 transition-all duration-200 ${
                        isMapDragging ? 'scale-125 opacity-100' : 'scale-90 opacity-60'
                      }`}
                    />
                    <div
                      className={`absolute w-3 h-1 rounded-full bg-black/40 blur-[0.8px] transition-all duration-200 ${
                        isMapDragging ? 'scale-50 opacity-20' : 'scale-100 opacity-80'
                      }`}
                    />
                  </div>

                  {/* Slim Red Pin with Center Cutout Hole - Anchored with bottom tip resting exactly at center (0, 0) */}
                  <div
                    className={`absolute bottom-0 left-0 -translate-x-1/2 transition-transform duration-200 flex flex-col items-center drop-shadow-xl pointer-events-none ${
                      isMapDragging ? '-translate-y-3.5 scale-105' : 'translate-y-0 scale-100'
                    }`}
                  >
                    <div className="relative w-6.5 h-9 flex items-center justify-center">
                      <svg width="26" height="36" viewBox="0 0 26 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="redHolePinGradient" x1="13" y1="0" x2="13" y2="36" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#ff4d4d" />
                            <stop offset="55%" stopColor="#e23744" />
                            <stop offset="100%" stopColor="#b91c1c" />
                          </linearGradient>
                        </defs>

                        {/* Slim Teardrop Body with Center Transparent See-Through Hole (fillRule evenodd) */}
                        <path
                          d="M13 0C5.8203 0 0 5.8203 0 13C0 22.75 13 36 13 36C13 36 26 22.75 26 13C26 5.8203 20.1797 0 13 0ZM13 7.5C16.0376 7.5 18.5 9.9624 18.5 13C18.5 16.0376 16.0376 18.5 13 18.5C9.9624 18.5 7.5 16.0376 7.5 13C7.5 9.9624 9.9624 7.5 13 7.5Z"
                          fill="url(#redHolePinGradient)"
                          fillRule="evenodd"
                          clipRule="evenodd"
                          stroke="#ffffff"
                          strokeWidth="2.2"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Action Controls on the Right: Detected Location Button on Top, Refresh Button Below */}
              <div className="absolute bottom-[205px] sm:bottom-[215px] right-3.5 z-[1050] flex flex-col gap-2.5">
                {/* Top: Detect / Located Location Button */}
                <button
                  type="button"
                  id="floating-detect-location-btn"
                  onClick={() => handleDetectCurrentLocation(true)}
                  disabled={gpsLoading}
                  className="w-10 h-10 bg-white border border-slate-200 text-slate-800 shadow-xl flex items-center justify-center hover:bg-slate-50 cursor-pointer active:scale-95 transition-all disabled:opacity-60 rounded-2xl group"
                  title="Detect Current Location"
                >
                  {gpsLoading ? (
                    <Loader2 className="w-5 h-5 text-[#e23744] animate-spin stroke-[2.5]" />
                  ) : (
                    <Crosshair className="w-5 h-5 text-[#e23744] group-hover:scale-110 stroke-[2.5] transition-transform" />
                  )}
                </button>

                {/* Bottom: Refresh Map Center Button */}
                <button
                  type="button"
                  id="floating-refresh-location-btn"
                  onClick={handleRefreshMap}
                  className="w-10 h-10 bg-white border border-slate-200 text-slate-800 shadow-xl flex items-center justify-center hover:bg-slate-50 cursor-pointer active:scale-95 transition-all rounded-2xl group"
                  title="Refresh Map Center"
                >
                  <RotateCw className="w-5 h-5 text-slate-700 group-hover:rotate-180 transition-transform duration-500" />
                </button>
              </div>

              {/* Floating Bottom Card over Map with Delivering to & Black Continue Button */}
              <div className="absolute bottom-3.5 inset-x-3.5 z-[1000]">
                <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xl space-y-2.5">
                  {/* Above of Continue Button: Delivering to: <selected location> (Without Building Tag) */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-red-50 text-[#e23744] flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div className="overflow-hidden flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Delivering to:
                      </span>
                      {detectedBuilding ? (
                        <>
                          <div className="text-xs sm:text-sm font-black text-slate-900 truncate mt-0.5">
                            {detectedBuilding}
                          </div>
                          <p className="text-[11px] text-slate-600 truncate mt-0.5 font-semibold">
                            {detectedStreet || matchedArea.name}
                          </p>
                        </>
                      ) : (
                        <div className="text-xs sm:text-sm font-black text-slate-900 truncate mt-0.5">
                          {detectedStreet || matchedArea.name}
                        </div>
                      )}
                      <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                        {matchedArea.name} • PIN {matchedArea.pincode} • Kolkata
                      </p>
                    </div>
                  </div>

                  {/* Single Continue Button with Black Background and Tailless Arrow (ChevronRight) */}
                  <button
                    type="button"
                    id="map-continue-btn"
                    onClick={handleProceedToDetails}
                    className="w-full py-3 sm:py-3.5 px-4 bg-black hover:bg-slate-900 active:bg-neutral-800 text-white font-black text-xs sm:text-sm tracking-tight flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md active:scale-[0.99] rounded-xl sm:rounded-2xl"
                    title="Continue to complete address details"
                  >
                    <span>Continue</span>
                    <ChevronRight className="w-4.5 h-4.5 stroke-[3]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: ADDRESS DETAILS FORM ================= */}
        {step === 'details_form' && (
          <form onSubmit={handleSaveAddress} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 no-scrollbar bg-white">
            {/* Top Bar with Back Button */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep('map_pin')}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                  title="Back to map"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                </button>
                <h3 className="text-base font-black text-slate-900">
                  {editingAddressId ? 'Edit Delivery Address' : 'Enter Complete Address'}
                </h3>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Pinned Location Mini Card */}
            <div className="p-3.5 bg-red-50/50 border border-red-100 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-[#e23744] text-white flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {detectedStreet || matchedArea.name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {matchedArea.name} • PIN {matchedArea.pincode}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep('map_pin')}
                className="px-3 py-1.5 text-xs font-bold text-[#e23744] hover:text-white bg-white hover:bg-[#e23744] border border-red-200 rounded-xl transition-all shrink-0 cursor-pointer shadow-2xs"
              >
                Change
              </button>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-[#e23744] text-xs font-bold rounded-xl">
                {formError}
              </div>
            )}

            {/* 1. House / Apartment / Building Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                House / Society / Apartment Name <span className="text-[#e23744]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Greenfield Heights / Shanti Niwas"
                value={houseName}
                onChange={(e) => {
                  setHouseName(e.target.value);
                  setFormError(null);
                }}
                className="w-full px-3.5 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#e23744] focus:ring-2 focus:ring-[#e23744]/15 bg-white transition-all shadow-xs"
              />
            </div>

            {/* 2. Flat / Floor / House Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Flat / House / Floor No. <span className="text-[#e23744]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Flat 4B, 3rd Floor"
                value={houseFlat}
                onChange={(e) => {
                  setHouseFlat(e.target.value);
                  setFormError(null);
                }}
                className="w-full px-3.5 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#e23744] focus:ring-2 focus:ring-[#e23744]/15 bg-white transition-all shadow-xs"
              />
            </div>

            {/* 3. Area / Road / Street Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Street / Area / Sector <span className="text-[#e23744]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. EP Block, Street No. 12"
                value={buildingRoad}
                onChange={(e) => {
                  setBuildingRoad(e.target.value);
                  setFormError(null);
                }}
                className="w-full px-3.5 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#e23744] focus:ring-2 focus:ring-[#e23744]/15 bg-white transition-all shadow-xs"
              />
            </div>

            {/* 4. Directions / Landmark */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nearby Landmark <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Opposite RDB Cinema, Near Apollo Clinic"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="w-full px-3.5 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#e23744] focus:ring-2 focus:ring-[#e23744]/15 bg-white transition-all shadow-xs"
              />
            </div>

            {/* 5. Save Address As Tag */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Save Address As
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { tag: 'home', label: 'Home', icon: Home },
                  { tag: 'work', label: 'Work', icon: Briefcase },
                  { tag: 'hotel', label: 'Hotel', icon: Building2 },
                  { tag: 'other', label: 'Other', icon: MapPin }
                ].map(({ tag, label, icon: Icon }) => {
                  const isSelected = addressTag === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setAddressTag(tag as SavedAddress['tag'])}
                      className={`py-2.5 px-1 border rounded-xl text-xs font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#e23744] bg-[#e23744] text-white shadow-md shadow-red-500/20'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              {addressTag === 'other' && (
                <input
                  type="text"
                  placeholder="e.g. Site Office, Friend's Place"
                  value={customTagLabel}
                  onChange={(e) => setCustomTagLabel(e.target.value)}
                  className="mt-2 w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#e23744]"
                />
              )}
            </div>

            {/* 6. Receiver Details */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Receiver Contact Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    id="address-receiver-name-input"
                    type="text"
                    placeholder="Receiver Name"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#e23744] bg-white"
                  />
                </div>

                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    id="address-receiver-phone-input"
                    type="tel"
                    autoComplete="tel"
                    placeholder="10-digit mobile number"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(cleanPhoneAutofill(e.target.value))}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#e23744] bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Submit CTA */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-4 px-4 bg-black hover:bg-slate-900 active:bg-neutral-800 text-white font-black text-sm tracking-tight transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] rounded-2xl"
              >
                <span>{editingAddressId ? 'UPDATE & DELIVER HERE' : 'SAVE & DELIVER HERE'}</span>
                <ChevronRight className="w-5 h-5 text-white stroke-[2.5]" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
