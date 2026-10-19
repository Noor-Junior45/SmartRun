import React, { useState, useEffect } from 'react';
import { ChevronLeft, MapPin, Trash2, Pencil } from 'lucide-react';
import { SavedAddress } from '../../types';
import { fetchUserAddresses, getStoredAddresses, subscribeToAddresses } from '../../services/supabaseService';

interface SavedAddressesSubPageProps {
  savedAddresses: SavedAddress[];
  displayPhone?: string;
  onBack: () => void;
  onOpenLocationModal: () => void;
  onEditAddress?: (address: SavedAddress) => void;
  onSelectAddress?: (address: SavedAddress) => void;
  onDeleteAddress: (addressId: string) => void;
}

export const SavedAddressesSubPage = ({
  savedAddresses: initialSavedAddresses,
  displayPhone,
  onBack,
  onOpenLocationModal,
  onEditAddress,
  onSelectAddress,
  onDeleteAddress
}: SavedAddressesSubPageProps) => {
  const [addresses, setAddresses] = useState<SavedAddress[]>(() => {
    if (initialSavedAddresses && initialSavedAddresses.length > 0) {
      return initialSavedAddresses;
    }
    return getStoredAddresses();
  });

  useEffect(() => {
    if (initialSavedAddresses && initialSavedAddresses.length > 0) {
      setAddresses(initialSavedAddresses);
    }
  }, [initialSavedAddresses]);

  useEffect(() => {
    const unsub = subscribeToAddresses((freshList) => {
      setAddresses(freshList);
    });

    fetchUserAddresses()
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setAddresses(res);
        }
      })
      .catch(() => {});

    return () => {
      unsub();
    };
  }, []);

  const handleDelete = (id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    onDeleteAddress(id);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <div className="bg-white border-b border-slate-200 px-4 py-3.5 flex items-center gap-2.5 shadow-2xs">
        <button
          onClick={onBack}
          className="p-1 -ml-1 rounded-full hover:bg-slate-100 text-slate-800 hover:text-black transition-colors cursor-pointer"
          title="Back to Profile"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
        </button>
        <h1 className="text-lg font-black text-slate-900 leading-none">Addresses</h1>
      </div>

      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        {addresses.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-2xs">
            <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-extrabold text-slate-800">No Saved Addresses Found</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Pin your home, construction site, or office for fast 60-min delivery.
            </p>
            <button
              onClick={onOpenLocationModal}
              className="px-4 py-2 bg-amber-400 hover:bg-yellow-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer"
            >
              Add Address Now
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex items-start justify-between gap-3 hover:border-slate-300 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                      {addr.tag}
                    </span>
                    <h3 className="text-sm font-black text-slate-900">
                      {addr.houseName || addr.houseFlat || 'Address'}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600">
                    {addr.formattedExactAddress || `${addr.houseFlat}, ${addr.buildingRoad}, ${addr.area.name}`}
                  </p>
                  {addr.receiverName && (
                    <p className="text-[11px] text-slate-500">
                      Contact: {addr.receiverName}
                      {(addr.receiverPhone || displayPhone) ? ` (${addr.receiverPhone || displayPhone})` : ''}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {onSelectAddress && (
                    <button
                      onClick={() => {
                        onSelectAddress(addr);
                        onBack();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Select
                    </button>
                  )}
                  {onEditAddress && (
                    <button
                      onClick={() => onEditAddress(addr)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Edit Address"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Delete Address"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Add Address button below saved addresses in yellow */}
            <div className="pt-2">
              <button
                id="btn-add-address-saved-list"
                type="button"
                onClick={onOpenLocationModal}
                className="w-full py-3 px-4 bg-amber-400 hover:bg-yellow-400 active:bg-amber-500 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center shadow-xs transition-all cursor-pointer border border-amber-500/20"
              >
                <span>Add New Address</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
