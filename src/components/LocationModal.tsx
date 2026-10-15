import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Search,
  Crosshair,
  LocateFixed,
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
  Map as MapIcon,
  RotateCw,
  AlertCircle
} from 'lucide-react';
import { KOLKATA_AREAS } from '../data/kolkataAreas';
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
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isMapDragging, setIsMapDragging] = useState(false);
  const [mapSearchResults, setMapSearchResults] = useState<MapSearchResult[]>([]);
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [activeProvider, setActiveProvider] = useState<'google' | 'osm'>('google');
  const [isRetryingMap, setIsRetryingMap] = useState(false);
  const [retryStatusMessage, setRetryStatusMessage] = useState<string | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Map Coordinates & Pin Location
  const [pinCoordinates, setPinCoordinates] = useState<MapCoordinates>({
    lat: currentArea.lat || 22.5735,
    lng: currentArea.lng || 88.4331
  });

  const [detectedStreet, setDetectedStreet] = useState<string>(
    currentArea.exactStreet || currentArea.name
  );
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
  const [is3DMode, setIs3DMode] = useState(true);

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
        setFormError(null);
        setActiveProvider(mapManager.getActiveProviderName());

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

  // Lock body scroll and listen for Escape key when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  // Reverse geocode and resolve closest Kolkata area
  const resolveCoordinatesToAddress = useCallback(async (lat: number, lng: number) => {
    try {
      const result = await mapManager.reverseGeocode({ lat, lng });
      if (result && result.street) {
        setDetectedStreet(result.street);
        setBuildingRoad(result.street);

        let closest = KOLKATA_AREAS[0];
        let minDistance = Number.MAX_VALUE;

        KOLKATA_AREAS.forEach((area) => {
          if (result.pincode && area.pincode === result.pincode) {
            closest = area;
            minDistance = 0;
          } else if (area.lat && area.lng) {
            const dist = Math.hypot(area.lat - lat, area.lng - lng);
            if (dist < minDistance) {
              minDistance = dist;
              closest = area;
            }
          }
        });

        const resolvedArea: KolkataArea = {
          ...closest,
          exactStreet: result.street
        };
        setMatchedArea(resolvedArea);
        return;
      }
    } catch (e) {
      console.warn('[LocationModal] reverse geocode notice:', e);
    }

    // Geometry closest fallback
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

  // Map initialization for 'map_pin' step via MapProviderManager
  useEffect(() => {
    if (!isOpen || step !== 'map_pin') return;

    let isMounted = true;
    const lat = pinCoordinates.lat || 22.5735;
    const lng = pinCoordinates.lng || 88.4331;

    const timer = setTimeout(async () => {
      if (!mapContainerRef.current || !isMounted) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }

      try {
        const { instance, provider } = await mapManager.renderMap(mapContainerRef.current, {
          center: { lat, lng },
          zoom: 18,
          minZoom: 12,
          maxZoom: 19,
          onMoveStart: () => {
            if (isMounted) setIsMapDragging(true);
          },
          onMove: (coords) => {
            if (isMounted) {
              setPinCoordinates(coords);
            }
          },
          onMoveEnd: (coords) => {
            if (isMounted) {
              setIsMapDragging(false);
              setPinCoordinates(coords);
              resolveCoordinatesToAddress(coords.lat, coords.lng);
            }
          }
        });

        if (isMounted) {
          mapInstanceRef.current = instance;
          setActiveProvider(provider);
          instance.invalidateSize();
          setTimeout(() => instance.invalidateSize(), 150);
          setTimeout(() => instance.invalidateSize(), 400);
        }
      } catch (err) {
        console.error('[LocationModal] Map render failed:', err);
      }
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, step, resolveCoordinatesToAddress]);

  // Fly to target coordinates on map with resilient retry if instance is mounting
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
      }, 300);
    }
  };

  // Retry and re-initialize map if script or initialization failed
  const handleRetryMap = useCallback(async () => {
    if (isRetryingMap || !mapContainerRef.current) return;
    setIsRetryingMap(true);
    setRetryStatusMessage('Retrying map initialization...');

    const lat = pinCoordinates.lat || currentArea.lat || 22.5735;
    const lng = pinCoordinates.lng || currentArea.lng || 88.4331;

    try {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.destroy();
        } catch (e) {
          console.warn('[LocationModal] Error destroying previous map instance:', e);
        }
        mapInstanceRef.current = null;
      }

      const { instance, provider } = await mapManager.retryMap(mapContainerRef.current, {
        center: { lat, lng },
        zoom: 18,
        minZoom: 12,
        maxZoom: 19,
        onMoveStart: () => setIsMapDragging(true),
        onMove: (coords) => setPinCoordinates(coords),
        onMoveEnd: (coords) => {
          setIsMapDragging(false);
          setPinCoordinates(coords);
          resolveCoordinatesToAddress(coords.lat, coords.lng);
        }
      });

      mapInstanceRef.current = instance;
      setActiveProvider(provider);
      instance.invalidateSize();
      setTimeout(() => instance.invalidateSize(), 200);
      resolveCoordinatesToAddress(lat, lng);

      if (provider === 'google') {
        showToast('Google Maps connected successfully', 'success');
        setRetryStatusMessage(null);
      } else {
        setRetryStatusMessage('Loaded backup map (OSM)');
        setTimeout(() => setRetryStatusMessage(null), 4000);
      }
    } catch (err: any) {
      console.warn('[LocationModal] Map retry re-initialization error:', err);
      showToast('Map re-initialization error. Running on backup map.', 'info');
      setRetryStatusMessage('Running on backup map');
      setTimeout(() => setRetryStatusMessage(null), 4000);
    } finally {
      setIsRetryingMap(false);
    }
  }, [isRetryingMap, pinCoordinates, currentArea, resolveCoordinatesToAddress]);

  // Instantly apply current location / area
  const handleUseCurrentLocationDirectly = (areaToUse?: KolkataArea, streetToUse?: string) => {
    const area = areaToUse || matchedArea;
    const street = streetToUse || detectedStreet || area.exactStreet || area.name;

    try {
      safeRemoveItem(getActiveAddressStorageKey());
      safeRemoveItem(ACTIVE_SAVED_ADDRESS_KEY);
    } catch (e) {
      console.error(e);
    }

    const appliedArea: KolkataArea = {
      ...area,
      exactStreet: street
    };

    onSelectArea(appliedArea, undefined);
    onClose();
  };

  // Trigger GPS Current Location fetch using Geolocation API
  const handleDetectCurrentLocation = async (goToMap = false) => {
    setMapEntrySource('detect_location');
    setGpsLoading(true);

    try {
      const coords = await mapManager.getCurrentPosition();
      setPinCoordinates(coords);

      const revRes = await mapManager.reverseGeocode(coords);
      const street = revRes.street || 'Kolkata';
      setDetectedStreet(street);
      setBuildingRoad(street);

      let closest = KOLKATA_AREAS[0];
      let minDistance = Number.MAX_VALUE;

      KOLKATA_AREAS.forEach((a) => {
        if (revRes.pincode && a.pincode === revRes.pincode) {
          closest = a;
          minDistance = 0;
        } else if (a.lat && a.lng) {
          const dist = Math.hypot(a.lat - coords.lat, a.lng - coords.lng);
          if (dist < minDistance) {
            minDistance = dist;
            closest = a;
          }
        }
      });

      const updatedArea: KolkataArea = {
        ...closest,
        exactStreet: street
      };
      setMatchedArea(updatedArea);
      setGpsLoading(false);

      // Seamlessly transition to interactive map pin view so the user can verify their location
      setStep('map_pin');
      setTimeout(() => flyToCoords(coords.lat, coords.lng, 18), 150);
      showToast(`Location detected: ${street}`, 'success');
    } catch (err: any) {
      console.warn('[LocationModal] GPS detection notice:', err);
      setGpsLoading(false);

      const isDenied = err?.code === 1 || String(err?.message || '').toLowerCase().includes('denied');
      showToast(
        isDenied
          ? 'Location permission not granted. Opened map so you can pick your exact spot.'
          : 'Unable to acquire direct GPS fix. Opened map so you can pin your location.',
        'info',
        4000
      );
      // Gracefully transition to map pin view centered on current area or Kolkata center
      const fallbackLat = pinCoordinates.lat || currentArea.lat || 22.5735;
      const fallbackLng = pinCoordinates.lng || currentArea.lng || 88.4331;
      setStep('map_pin');
      setTimeout(() => flyToCoords(fallbackLat, fallbackLng, 16), 200);
    }
  };

  // Real-time Places & Buildings Search via MapProviderManager & Google Maps API
  useEffect(() => {
    const q = searchQuery.trim();

    // Do not populate or fetch locations when search query is empty
    if (!q) {
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
      setMapSearchResults([]);
      setIsSearchingMap(false);
      return;
    }

    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
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

      // Local fallback with Kolkata areas matching user search query
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
      if (pin && area.pincode === pin) {
        closest = area;
        minDistance = 0;
      } else if (area.lat && area.lng) {
        const dist = Math.hypot(area.lat - finalLat, area.lng - finalLng);
        if (dist < minDistance) {
          minDistance = dist;
          closest = area;
        }
      }
    });

    const street = result.name || closest.exactStreet || closest.name;
    const updatedArea: KolkataArea = {
      ...closest,
      exactStreet: street
    };

    setMatchedArea(updatedArea);
    setDetectedStreet(street);

    // Extract rich building / address details
    const buildingInfo = result.building || result.name;
    const fullStreetAddress = result.road && buildingInfo !== result.road
      ? `${buildingInfo}, ${result.road}`
      : (result.secondaryText || street);

    setBuildingRoad(fullStreetAddress);
    if (result.building) {
      setHouseFlat(result.building);
    }
    if (result.road) {
      setLandmark(result.road);
    }

    if (openPinMap) {
      setMapEntrySource('detect_location');
      setStep('map_pin');
      setTimeout(() => {
        flyToCoords(finalLat, finalLng, 18);
      }, 150);
    } else {
      handleUseCurrentLocationDirectly(updatedArea, street);
    }
  };

  // Proceed to address details form
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
        showToast('Address saved locally. Cloud sync queued.', 'info');
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
        return <Home className="w-4 h-4 text-slate-700" />;
      case 'work':
        return <Briefcase className="w-4 h-4 text-slate-700" />;
      case 'hotel':
        return <Building2 className="w-4 h-4 text-slate-700" />;
      default:
        return <MapPin className="w-4 h-4 text-slate-700" />;
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
    <div className="fixed inset-0 z-50 flex justify-start bg-black/50 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div 
        className="absolute inset-0 -z-10 cursor-pointer"
        onClick={onClose}
        aria-label="Close modal background"
      />

      {/* Left-side Drawer Panel */}
      <div 
        id="location-drawer-panel"
        className="w-full max-w-[420px] sm:w-[420px] md:w-[440px] h-full bg-[#f4f4f5] shadow-2xl flex flex-col overflow-hidden border-r border-slate-300 animate-in slide-in-from-left duration-300 z-10"
      >
        
        {/* ================= STEP 1: SEARCH & ADDRESS LIST ================= */}
        {step === 'search_home' && (
          <div className="flex-1 flex flex-col p-6 sm:p-8 overflow-y-auto no-scrollbar">
            
            {/* Top Close Button & Header */}
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                id="location-drawer-close-btn"
                onClick={onClose}
                className="text-slate-800 hover:text-black p-1 -ml-1 rounded-md hover:bg-slate-200/70 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-6 h-6 stroke-[2]" />
              </button>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Delivery Location</span>
            </div>

            {/* Search Input Box */}
            <div className="relative mb-4">
              <div className="flex items-center bg-white border border-slate-300 focus-within:border-slate-800 focus-within:ring-1 focus-within:ring-slate-800 transition-all px-3.5 py-3 shadow-2xs rounded-lg">
                <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
                <input
                  type="text"
                  id="location-search-input"
                  placeholder="Search street, area, PIN code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
                {isSearchingMap ? (
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0 ml-2" />
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

            {/* Real-time Search Results (shown only when searching) */}
            {searchQuery.trim() ? (
              <div className="flex flex-col bg-white border border-slate-200 shadow-2xs rounded-xl overflow-hidden mb-4 shrink-0">
                <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 text-slate-800">
                    <Search className="w-3.5 h-3.5 text-emerald-600" />
                    Search Results ({mapSearchResults.length})
                  </span>
                  {isSearchingMap ? (
                    <span className="text-emerald-700 font-normal normal-case flex items-center gap-1 text-[11px]">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Fetching...
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400 normal-case tracking-normal">
                      Google Maps API
                    </span>
                  )}
                </div>

                <div className="overflow-y-auto divide-y divide-slate-100 max-h-[300px]">
                  {mapSearchResults.length > 0 ? (
                    mapSearchResults.map((result) => (
                      <div
                        key={result.id}
                        onClick={() => handleSelectMapSearchResult(result, true)}
                        className="w-full p-3.5 text-left hover:bg-slate-50 flex items-center justify-between group cursor-pointer transition-colors"
                      >
                        <div className="flex items-start gap-3 truncate text-left min-w-0 pr-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            {result.building ? (
                              <Building2 className="w-4 h-4" />
                            ) : (
                              <MapPin className="w-4 h-4" />
                            )}
                          </div>
                          <div className="truncate min-w-0">
                            <div className="text-sm font-semibold text-slate-900 group-hover:text-black truncate">
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
                                  <span className="inline-flex items-center text-[10px] font-medium bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded">
                                    PIN {result.pincode}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 group-hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-semibold">
                            <Crosshair className="w-3 h-3" />
                            Select
                          </span>
                        </div>
                      </div>
                    ))
                  ) : !isSearchingMap ? (
                    <div className="p-6 text-center">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700">No matching location found</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Try searching with a building name, landmark, main road or PIN code
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Quick Action: Use Current Location */}
            <button
              type="button"
              id="detect-gps-location-btn"
              onClick={() => handleDetectCurrentLocation(false)}
              disabled={gpsLoading}
              className="w-full bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 text-emerald-900 rounded-xl p-3.5 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs group flex items-center justify-between text-left disabled:opacity-60 mb-2.5"
              title="Use current location"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-600 text-white group-hover:bg-emerald-700 transition-colors duration-200 shrink-0">
                  {gpsLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                  ) : (
                    <Crosshair className="w-4 h-4 stroke-[2.5]" />
                  )}
                </div>
                <span className="text-sm font-bold text-slate-900 group-hover:text-black tracking-tight truncate">
                  {gpsLoading ? 'Detecting Location...' : 'Use Current Location'}
                </span>
              </div>

              <ChevronRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform duration-200 shrink-0" />
            </button>

                {/* Saved Addresses Section */}
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Saved Addresses {savedAddresses.length > 0 ? `(${savedAddresses.length})` : ''}
                    </span>

                    {/* Plus sign logo on the right side to add location */}
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
                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 transition-all flex items-center justify-center cursor-pointer shadow-2xs group active:scale-95 border border-emerald-200/80"
                      title="Add new delivery location"
                      aria-label="Add location"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5] group-hover:rotate-90 transition-transform duration-300" />
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
                            className={`p-3.5 bg-white border transition-all cursor-pointer rounded-xl flex items-start justify-between gap-3 shadow-2xs hover:shadow-xs ${
                              isSelected
                                ? 'border-slate-900 ring-1 ring-slate-900'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-start gap-3 overflow-hidden min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                                {getTagIcon(addr.tag)}
                              </div>
                              <div className="overflow-hidden min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-slate-900 truncate">
                                    {addr.houseName || addr.houseFlat || 'Address'}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                                    {getTagLabel(addr)}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-600 truncate mt-0.5">
                                  {addr.houseFlat ? `${addr.houseFlat}, ` : ''}{addr.buildingRoad || ''}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                                  {addr.area?.name || 'Kolkata'} • {addr.area?.pincode || '700001'}
                                  {addr.receiverName ? ` • ${addr.receiverName}` : ''}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 self-center">
                              <button
                                type="button"
                                onClick={(e) => handleStartEditAddress(addr, e)}
                                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Edit address"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteAddress(addr.id, e)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete address"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-white border border-dashed border-slate-300 rounded-xl p-4 text-center">
                      <p className="text-xs font-semibold text-slate-700">No saved addresses yet</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Select a location above or click "Add Address" to pin your delivery location.
                      </p>
                    </div>
                  )}
                </div>

          </div>
        )}

        {/* ================= STEP 2: INTERACTIVE MAP PIN ================= */}
        {step === 'map_pin' && (
          <div className="flex-1 flex flex-col relative overflow-hidden bg-white">
            
            {/* Top Bar with Back Button, Title & Action Controls */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep('search_home')}
                  className="p-1.5 -ml-1 text-slate-700 hover:bg-slate-100 rounded-full cursor-pointer transition-colors"
                  title="Back to search"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    Set Delivery Location
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Map Canvas */}
            <div className="flex-1 w-full min-h-[300px] relative">
              <div ref={mapContainerRef} className="w-full h-full z-0" />



              {/* Center Map Pin with Clean Red 3D Pointer (Text pill removed) */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[950]">
                <div className="relative flex flex-col items-center">
                  <div
                    className={`transition-all duration-200 flex flex-col items-center drop-shadow-2xl ${
                      isMapDragging ? '-translate-y-3.5 scale-110' : 'translate-y-0 scale-100'
                    }`}
                  >
                    {/* Modern Red Pin Pointer with 3D depth */}
                    <div className="relative w-10 h-12 flex items-center justify-center -mb-1">
                      <svg width="40" height="48" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="redPinGradient" x1="20" y1="0" x2="20" y2="48" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#ef4444" />
                            <stop offset="70%" stopColor="#dc2626" />
                            <stop offset="100%" stopColor="#b91c1c" />
                          </linearGradient>
                          <filter id="pinInnerShadow" x="0" y="0" width="40" height="48" filterUnits="userSpaceOnUse">
                            <feOffset dy="1" />
                            <feGaussianBlur stdDeviation="1" />
                            <feComposite operator="over" in2="SourceGraphic" />
                          </filter>
                        </defs>

                        {/* Outer Red Teardrop Body */}
                        <path
                          d="M20 0C8.954 0 0 8.954 0 20C0 34.5 20 48 20 48C20 48 40 34.5 40 20C40 8.954 31.046 0 20 0Z"
                          fill="url(#redPinGradient)"
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          strokeLinejoin="round"
                        />

                        {/* Top Subtle Light Reflection Highlight */}
                        <path
                          d="M7 16C7 11 11 7 16 7"
                          stroke="#fca5a5"
                          strokeWidth="2"
                          strokeLinecap="round"
                          opacity="0.85"
                        />

                        {/* Crisp White Inner Ring */}
                        <circle cx="20" cy="18" r="8" fill="#ffffff" />

                        {/* Deep Crimson Center Target Dot */}
                        <circle cx="20" cy="18" r="4" fill="#dc2626" />
                      </svg>
                    </div>
                  </div>

                  {/* 3D Pin Ground Shadow */}
                  <div
                    className={`w-4 h-1.5 rounded-full bg-black/45 blur-[1px] transition-all duration-200 ${
                      isMapDragging ? 'scale-40 opacity-20' : 'scale-100 opacity-80'
                    }`}
                  >
                    <span className="sr-only">Pin shadow</span>
                  </div>
                </div>
              </div>

              {/* Floating Controls: 3D/2D Perspective Toggle & Detect Location Buttons */}
              <div className="absolute bottom-4 right-3.5 z-[1000] flex flex-col gap-2">
                {/* 3D Map View Toggle Button */}
                <button
                  type="button"
                  id="floating-toggle-3d-map-btn"
                  onClick={() => {
                    if (mapInstanceRef.current?.toggle3D) {
                      const nextIs3D = mapInstanceRef.current.toggle3D();
                      setIs3DMode(nextIs3D);
                    } else if (mapInstanceRef.current?.setTilt) {
                      const next = is3DMode ? 0 : 45;
                      mapInstanceRef.current.setTilt(next);
                      setIs3DMode(!is3DMode);
                    }
                  }}
                  className={`w-10 h-10 border shadow-lg flex items-center justify-center cursor-pointer active:scale-95 transition-all rounded-lg font-black text-xs ${
                    is3DMode
                      ? 'bg-slate-900 border-slate-950 text-white'
                      : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                  }`}
                  title={is3DMode ? 'Switch to 2D Top-Down View' : 'Switch to 3D Building View'}
                  aria-label="Toggle 3D Map View"
                >
                  <span className="tracking-tight">{is3DMode ? '3D' : '2D'}</span>
                </button>

                {/* Detect Current Location Button (replaces refresh button) */}
                <button
                  type="button"
                  id="floating-detect-location-btn"
                  onClick={() => handleDetectCurrentLocation(true)}
                  disabled={gpsLoading}
                  className="w-10 h-10 bg-white border border-slate-200 text-slate-800 shadow-lg flex items-center justify-center hover:bg-slate-50 cursor-pointer active:scale-95 transition-all disabled:opacity-60 rounded-lg group"
                  title="Detect Current Location"
                  aria-label="Detect Current Location"
                >
                  {gpsLoading ? (
                    <Loader2 className="w-5 h-5 text-emerald-600 animate-spin stroke-[2.5]" />
                  ) : (
                    <Crosshair className="w-5 h-5 text-emerald-600 group-hover:text-emerald-700 stroke-[2.5] transition-colors" />
                  )}
                </button>
              </div>
            </div>

            {/* Bottom Pin Summary & Confirm Button */}
            <div className="bg-white border-t border-slate-200 p-4 sm:p-5 z-[1000] shadow-xl shrink-0 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded bg-slate-100 text-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="overflow-hidden flex-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Selected Location
                  </span>
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {detectedStreet || matchedArea.name}
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {matchedArea.name} • PIN {matchedArea.pincode}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                {/* 1-Tap Deliver to this location directly */}
                <button
                  type="button"
                  id="confirm-pin-deliver-here-btn"
                  onClick={() => handleUseCurrentLocationDirectly(matchedArea, detectedStreet)}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm tracking-tight flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm active:scale-[0.99] rounded-xl"
                  title="Deliver to this location and start shopping immediately"
                >
                  <Check className="w-4.5 h-4.5 stroke-[3]" />
                  <span>Deliver to this Location</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ================= STEP 3: HOUSE & ADDRESS DETAILS FORM ================= */}
        {step === 'details_form' && (
          <form onSubmit={handleSaveAddress} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 no-scrollbar bg-white">
            
            {/* Top Bar with Back Button */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep('map_pin')}
                  className="p-1 -ml-1 text-slate-700 hover:bg-slate-100 rounded-full cursor-pointer transition-colors"
                  title="Back to map"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="text-base font-bold text-slate-900">
                  {editingAddressId ? 'Edit Delivery Address' : 'Enter Complete Address'}
                </h3>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Locality Pill */}
            <div className="p-3 bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <MapPin className="w-4 h-4 text-slate-600 shrink-0" />
                <div className="overflow-hidden">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {detectedStreet || matchedArea.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    PIN {matchedArea.pincode}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep('map_pin')}
                className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-black bg-white border border-slate-300 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              >
                Change Pin
              </button>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                {formError}
              </div>
            )}

            {/* 1. House / Society Name */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                House / Society / Apartment Name <span className="text-red-500">*</span>
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
                className="w-full px-3.5 py-2.5 border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 bg-white"
              />
            </div>

            {/* 2. Flat / Floor / House Number */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Flat / House / Floor No. <span className="text-red-500">*</span>
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
                className="w-full px-3.5 py-2.5 border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 bg-white"
              />
            </div>

            {/* 3. Area / Road / Street Name */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Street / Area / Sector <span className="text-red-500">*</span>
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
                className="w-full px-3.5 py-2.5 border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 bg-white"
              />
            </div>

            {/* 4. Directions / Landmark */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Landmark <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Opposite RDB Cinema"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 bg-white"
              />
            </div>

            {/* 5. Save Address As Tag */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
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
                      className={`py-2 px-1 border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
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
                  placeholder="e.g. Site Office, Factory"
                  value={customTagLabel}
                  onChange={(e) => setCustomTagLabel(e.target.value)}
                  className="mt-2 w-full px-3 py-2 border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800"
                />
              )}
            </div>

            {/* 6. Receiver Details */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Receiver Contact Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="address-receiver-name-input"
                    type="text"
                    placeholder="Receiver Name"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 bg-white"
                  />
                </div>

                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="address-receiver-phone-input"
                    type="tel"
                    autoComplete="tel"
                    placeholder="10-digit mobile number"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(cleanPhoneAutofill(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Submit CTA */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-slate-900 hover:bg-black text-white font-bold text-sm tracking-tight transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <span>{editingAddressId ? 'UPDATE & DELIVER HERE' : 'SAVE & DELIVER HERE'}</span>
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
