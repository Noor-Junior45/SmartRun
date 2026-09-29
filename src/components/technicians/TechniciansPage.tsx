import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X, RefreshCw, UserCheck, Wrench, Sparkles, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { Technician } from '../../types/technician';
import { TechnicianCard } from './TechnicianCard';
import { fetchTechnicians } from '../../services/technicianService';
import { TechnicianFiltersModal, TechnicianFilterState } from './TechnicianFiltersModal';
import { TechnicianSortModal, TechnicianSortOption } from './TechnicianSortModal';
import { hapticLight, hapticSelection } from '../../utils/haptics';
import { getPaginationPages } from '../../utils/paginationHelper';

interface TechniciansPageProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSelectTechnician?: (technician: Technician) => void;
}

const INITIAL_FILTERS: TechnicianFilterState = {
  sectors: [],
  minExperience: undefined,
  masterOnly: false,
  availableOnly: false,
  emergencyOnly: false,
  tools: [],
  areas: [],
  minRating: undefined
};

export const TechniciansPage = ({
  searchQuery: propSearchQuery = '',
  onSearchChange,
  onSelectTechnician
}: TechniciansPageProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const activeQuery = propSearchQuery !== undefined ? propSearchQuery : urlQuery;

  const [allTechnicians, setAllTechnicians] = useState<Technician[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Sort state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);

  const [filters, setFilters] = useState<TechnicianFilterState>(INITIAL_FILTERS);
  const [sortOption, setSortOption] = useState<TechnicianSortOption>('recommended');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Sync with prop search or global clear
  useEffect(() => {
    if (propSearchQuery !== undefined && !propSearchQuery && searchParams.has('q')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('q');
      setSearchParams(nextParams, { replace: true });
    }
  }, [propSearchQuery, searchParams, setSearchParams]);

  useEffect(() => {
    const handleGlobalClear = () => {
      setCurrentPage(1);
      if (searchParams.has('q')) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('q');
        setSearchParams(nextParams, { replace: true });
      }
    };
    window.addEventListener('clear-search-query', handleGlobalClear);
    return () => window.removeEventListener('clear-search-query', handleGlobalClear);
  }, [searchParams, setSearchParams]);

  // Reset to page 1 whenever search, filters, or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeQuery, filters, sortOption]);

  const loadTechniciansData = () => {
    setIsLoading(true);
    fetchTechnicians()
      .then((list) => {
        setAllTechnicians(list || []);
      })
      .catch((err) => {
        console.error('Failed to load technicians:', err);
        setAllTechnicians([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Load technicians on mount
  useEffect(() => {
    loadTechniciansData();
  }, []);

  // Listen for top navbar custom filter & sort trigger events
  useEffect(() => {
    const handleOpenFilters = () => {
      hapticLight();
      setIsFilterModalOpen(true);
    };

    const handleOpenSort = () => {
      hapticLight();
      setIsSortModalOpen(true);
    };

    window.addEventListener('open-technician-filters', handleOpenFilters);
    window.addEventListener('open-technician-sort', handleOpenSort);

    return () => {
      window.removeEventListener('open-technician-filters', handleOpenFilters);
      window.removeEventListener('open-technician-sort', handleOpenSort);
    };
  }, []);

  // Filter logic (All non-price filters)
  const filteredTechnicians = useMemo(() => {
    return allTechnicians.filter((tech) => {
      // 1. Text Search Query
      if (activeQuery.trim()) {
        const q = activeQuery.toLowerCase().trim();
        const matchesName = tech.name.toLowerCase().includes(q);
        const matchesTitle = tech.title.toLowerCase().includes(q);
        const matchesBadge = tech.badgeId.toLowerCase().includes(q);
        const matchesLicense = tech.licenseNumber.toLowerCase().includes(q);
        const matchesSector = tech.primarySector.toLowerCase().includes(q);
        const matchesSubSectors = tech.subSectors.some((sub) =>
          sub.toLowerCase().includes(q)
        );
        const matchesSkills = tech.skills.some((sk) =>
          sk.name.toLowerCase().includes(q)
        );
        const matchesAbout = tech.about.toLowerCase().includes(q);
        const matchesAreas = tech.serviceAreas.some((area) =>
          area.toLowerCase().includes(q)
        );

        if (
          !matchesName &&
          !matchesTitle &&
          !matchesBadge &&
          !matchesLicense &&
          !matchesSector &&
          !matchesSubSectors &&
          !matchesSkills &&
          !matchesAbout &&
          !matchesAreas
        ) {
          return false;
        }
      }

      // 2. Sectors Filter
      if (filters.sectors.length > 0) {
        const matchesAnySector = filters.sectors.some((secKey) => {
          const secLower = secKey.toLowerCase();
          const primaryLower = tech.primarySector.toLowerCase();
          const subString = tech.subSectors.join(' ').toLowerCase();

          if (secLower === 'residential') {
            return (
              primaryLower.includes('residential') ||
              subString.includes('rewiring') ||
              subString.includes('building') ||
              subString.includes('db')
            );
          }
          if (secLower === 'solar') {
            return (
              primaryLower.includes('solar') ||
              primaryLower.includes('renewable') ||
              subString.includes('solar') ||
              subString.includes('inverter')
            );
          }
          if (secLower === 'industrial') {
            return (
              primaryLower.includes('industrial') ||
              subString.includes('panel') ||
              subString.includes('automation') ||
              subString.includes('switchgear')
            );
          }
          if (secLower === 'emergency') {
            return (
              tech.emergencySupport ||
              primaryLower.includes('emergency') ||
              subString.includes('fault') ||
              subString.includes('tripping')
            );
          }
          return (
            primaryLower.includes(secLower) || subString.includes(secLower)
          );
        });

        if (!matchesAnySector) return false;
      }

      // 3. Min Experience
      if (filters.minExperience !== undefined) {
        if (tech.experienceYears < filters.minExperience) return false;
      }

      // 4. Master License Only
      if (filters.masterOnly) {
        if (tech.verificationStatus !== 'master') return false;
      }

      // 5. Available Only
      if (filters.availableOnly) {
        if (tech.status !== 'available') return false;
      }

      // 6. 24x7 Emergency Only
      if (filters.emergencyOnly) {
        if (!tech.emergencySupport) return false;
      }

      // 7. Diagnostic Tools equipped
      if (filters.tools.length > 0) {
        const carriesTool = filters.tools.some((tKey) => {
          const tLower = tKey.toLowerCase();
          return tech.toolsCarried.some((tc) => {
            const tcLower = tc.toLowerCase();
            if (tLower === 'thermal') return tcLower.includes('thermal');
            if (tLower === 'megger') return tcLower.includes('megger') || tcLower.includes('insulation');
            if (tLower === 'tdr') return tcLower.includes('tdr') || tcLower.includes('fault');
            if (tLower === 'pyranometer') return tcLower.includes('pyranometer') || tcLower.includes('solar');
            if (tLower === 'clamp') return tcLower.includes('clamp');
            return tcLower.includes(tLower);
          });
        });
        if (!carriesTool) return false;
      }

      // 8. Service Area Coverage
      if (filters.areas.length > 0) {
        const coversArea = filters.areas.some((aKey) => {
          const aLower = aKey.toLowerCase();
          return tech.serviceAreas.some((sa) => {
            const saLower = sa.toLowerCase();
            if (saLower.includes('all kolkata')) return true;
            if (aLower === 'saltlake') return saLower.includes('salt lake') || saLower.includes('sector v');
            if (aLower === 'newtown') return saLower.includes('new town') || saLower.includes('rajarhat');
            if (aLower === 'south') return saLower.includes('ballygunge') || saLower.includes('alipore') || saLower.includes('behala');
            if (aLower === 'central') return saLower.includes('central') || saLower.includes('kolkata');
            if (aLower === 'howrah') return saLower.includes('howrah');
            return saLower.includes(aLower);
          });
        });
        if (!coversArea) return false;
      }

      // 9. Min Rating
      if (filters.minRating !== undefined) {
        if (tech.rating < filters.minRating) return false;
      }

      return true;
    });
  }, [allTechnicians, activeQuery, filters]);

  // Sort logic (Handles Price Low/High, Top Rated, Nearest, and Recommended)
  const sortedTechnicians = useMemo(() => {
    const list = [...filteredTechnicians];
    switch (sortOption) {
      case 'price_asc':
        return list.sort((a, b) => a.startingRate - b.startingRate);
      case 'price_desc':
        return list.sort((a, b) => b.startingRate - a.startingRate);
      case 'top_rated':
        return list.sort((a, b) => {
          if (b.rating !== a.rating) return b.rating - a.rating;
          return b.reviewsCount - a.reviewsCount;
        });
      case 'nearest':
        return list.sort((a, b) => {
          // Technicians covering all Kolkata / fastest emergency dispatch first
          const aAll = a.emergencySupport || a.serviceAreas.some((s) => s.toLowerCase().includes('all kolkata'));
          const bAll = b.emergencySupport || b.serviceAreas.some((s) => s.toLowerCase().includes('all kolkata'));
          if (aAll && !bAll) return -1;
          if (!aAll && bAll) return 1;
          return b.completedJobs - a.completedJobs;
        });
      case 'recommended':
      default:
        return list.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          if (a.verificationStatus === 'master' && b.verificationStatus !== 'master') return -1;
          if (a.verificationStatus !== 'master' && b.verificationStatus === 'master') return 1;
          return b.rating - a.rating;
        });
    }
  }, [filteredTechnicians, sortOption]);

  // Paginated slices (100 technicians per page)
  const paginatedTechnicians = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedTechnicians.slice(start, start + itemsPerPage);
  }, [sortedTechnicians, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedTechnicians.length / itemsPerPage) || 1;

  const handleCardClick = (tech: Technician) => {
    if (onSelectTechnician) {
      onSelectTechnician(tech);
    } else {
      const targetId =
        tech.id && tech.id.trim().length > 0
          ? tech.id.trim()
          : `tech-${(tech.name || 'specialist').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      navigate(`/technicians/${encodeURIComponent(targetId)}`, {
        state: { technician: tech }
      });
    }
  };

  const handleClearSearch = () => {
    hapticLight();
    if (onSearchChange) onSearchChange('');
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('q');
    setSearchParams(nextParams);
  };

  const handleRemoveSector = (sec: string) => {
    hapticLight();
    setFilters((p) => ({
      ...p,
      sectors: p.sectors.filter((s) => s !== sec)
    }));
  };

  const handleRemoveTool = (tool: string) => {
    hapticLight();
    setFilters((p) => ({
      ...p,
      tools: p.tools.filter((t) => t !== tool)
    }));
  };

  const handleRemoveArea = (area: string) => {
    hapticLight();
    setFilters((p) => ({
      ...p,
      areas: p.areas.filter((a) => a !== area)
    }));
  };

  const handleResetAll = () => {
    hapticSelection();
    setFilters(INITIAL_FILTERS);
    setSortOption('recommended');
    handleClearSearch();
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.sectors.length > 0 ||
      filters.minExperience !== undefined ||
      filters.masterOnly ||
      filters.availableOnly ||
      filters.emergencyOnly ||
      filters.tools.length > 0 ||
      filters.areas.length > 0 ||
      filters.minRating !== undefined ||
      activeQuery.trim() !== '' ||
      sortOption !== 'recommended'
    );
  }, [filters, activeQuery, sortOption]);

  const getSectorLabel = (key: string) => {
    if (key === 'residential') return 'Residential';
    if (key === 'solar') return 'Solar Power';
    if (key === 'industrial') return 'Industrial';
    if (key === 'emergency') return '24x7 Emergency';
    return key;
  };

  const getSortBadgeLabel = (s: TechnicianSortOption) => {
    if (s === 'price_asc') return 'Price: Low to High';
    if (s === 'price_desc') return 'Price: High to Low';
    if (s === 'top_rated') return 'Top Rated ★';
    if (s === 'nearest') return 'Nearest Dispatch';
    return 'Sorted';
  };

  return (
    <div className="min-h-[85vh] bg-slate-50 flex flex-col justify-start items-center px-4 pt-4 sm:pt-6 pb-36 sm:pb-28">
      {/* Top Bar for Technician Quick Actions & Active Filter Badges */}
      <div className="w-full max-w-5xl mx-auto mb-3">
        {/* Active Filter Tags Row */}
        {hasActiveFilters && (
          <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto scrollbar-none py-1 mb-2">
            {activeQuery.trim() && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 text-white text-[11px] font-bold shrink-0 hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
                title="Clear search query"
              >
                <span>Search: &ldquo;{activeQuery}&rdquo;</span>
                <X className="w-3 h-3 text-slate-300" />
              </button>
            )}

            {filters.sectors.map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => handleRemoveSector(sec)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] font-bold shrink-0 hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                <span>{getSectorLabel(sec)}</span>
                <X className="w-3 h-3 text-indigo-700" />
              </button>
            ))}

            {filters.minExperience !== undefined && (
              <button
                type="button"
                onClick={() =>
                  setFilters((p) => ({ ...p, minExperience: undefined }))
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-800 text-[11px] font-bold shrink-0 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <span>{filters.minExperience}+ Yrs Exp</span>
                <X className="w-3 h-3 text-slate-600" />
              </button>
            )}

            {filters.masterOnly && (
              <button
                type="button"
                onClick={() =>
                  setFilters((p) => ({ ...p, masterOnly: false }))
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-bold shrink-0 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <span>Master License</span>
                <X className="w-3 h-3 text-emerald-700" />
              </button>
            )}

            {filters.availableOnly && (
              <button
                type="button"
                onClick={() =>
                  setFilters((p) => ({ ...p, availableOnly: false }))
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] font-bold shrink-0 hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                <span>Available Today</span>
                <X className="w-3 h-3 text-indigo-700" />
              </button>
            )}

            {filters.emergencyOnly && (
              <button
                type="button"
                onClick={() =>
                  setFilters((p) => ({ ...p, emergencyOnly: false }))
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-900 text-[11px] font-bold shrink-0 hover:bg-red-100 transition-colors cursor-pointer"
              >
                <span>24x7 Emergency</span>
                <X className="w-3 h-3 text-red-700" />
              </button>
            )}

            {filters.tools.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleRemoveTool(t)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-800 text-[11px] font-bold shrink-0 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <span className="capitalize">{t} Tool</span>
                <X className="w-3 h-3 text-slate-600" />
              </button>
            ))}

            {filters.areas.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => handleRemoveArea(a)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-bold shrink-0 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <span className="capitalize">{a}</span>
                <X className="w-3 h-3 text-blue-700" />
              </button>
            ))}

            {filters.minRating !== undefined && (
              <button
                type="button"
                onClick={() =>
                  setFilters((p) => ({ ...p, minRating: undefined }))
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold shrink-0 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <span>★ {filters.minRating}+</span>
                <X className="w-3 h-3 text-amber-700" />
              </button>
            )}

            {sortOption !== 'recommended' && (
              <button
                type="button"
                onClick={() => setSortOption('recommended')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-bold shrink-0 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <span>{getSortBadgeLabel(sortOption)}</span>
                <X className="w-3 h-3 text-blue-700" />
              </button>
            )}

            <button
              type="button"
              onClick={handleResetAll}
              className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline px-1.5 shrink-0 cursor-pointer"
            >
              Reset All
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area: Responsive Grid (Stack on Phone, 2*2 on PC) */}
      <div className="w-full max-w-5xl mx-auto">
        {isLoading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-500">
              Checking technician network...
            </p>
          </div>
        ) : allTechnicians.length === 0 ? (
          /* COMING SOON VIEW (When no technician is in Supabase yet) */
          <div className="py-16 sm:py-20 px-6 text-center max-w-lg mx-auto bg-white rounded-3xl border-0 border-none shadow-none space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
              <Wrench className="w-8 h-8 stroke-[1.75]" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Onboarding in Progress</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                Technician Network Coming Soon
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                We are actively verifying and onboarding licensed electricians, solar power engineers, and industrial switchgear specialists across Kolkata.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
              <div className="p-3.5 rounded-2xl bg-slate-50 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Govt. Verified</h4>
                  <p className="text-[11px] text-slate-500">Class-1 licenses & background check.</p>
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Direct Contact</h4>
                  <p className="text-[11px] text-slate-500">Transparent rates & instant booking.</p>
                </div>
              </div>
            </div>
          </div>
        ) : sortedTechnicians.length === 0 ? (
          /* NO MATCHING FILTER RESULTS */
          <div className="py-16 text-center space-y-4 max-w-sm mx-auto bg-white rounded-3xl p-6 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {activeQuery
                  ? `No technician matches "${activeQuery}"`
                  : 'No technicians match filters'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Try clearing some filter criteria or searching with broader terms like &ldquo;Solar&rdquo;, &ldquo;Master&rdquo;, or &ldquo;Residential&rdquo;.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetAll}
              className="px-5 py-2.5 rounded-full bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 active:scale-95 transition-all shadow-sm cursor-pointer inline-flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              <span>Reset Filters & Show All</span>
            </button>
          </div>
        ) : (
          /* REAL TECHNICIANS GRID: 1 COL STACK ON MOBILE, 2X2 ON PC */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 w-full">
            {paginatedTechnicians.map((tech) => (
              <motion.div
                key={tech.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                <TechnicianCard technician={tech} onSelect={handleCardClick} />
              </motion.div>
            ))}
          </div>
        )}

        {/* PAGINATION CONTROLS (100 technicians per page) */}
        {!isLoading && sortedTechnicians.length > itemsPerPage && (
          <div className="pt-10 pb-6 flex flex-col items-center gap-4">
            <p className="text-xs font-medium text-slate-500">
              Showing <span className="font-bold text-slate-900">{Math.min(sortedTechnicians.length, (currentPage - 1) * itemsPerPage + 1)}</span> to{' '}
              <span className="font-bold text-slate-900">{Math.min(sortedTechnicians.length, currentPage * itemsPerPage)}</span> of{' '}
              <span className="font-bold text-slate-900">{sortedTechnicians.length}</span> certified specialists
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => {
                  hapticLight();
                  setCurrentPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
              >
                Previous
              </button>

              {getPaginationPages(currentPage, totalPages).map((item, idx) => {
                if (typeof item === 'string') {
                  return (
                    <span
                      key={`ellipsis-${idx}`}
                      className="w-8 h-9 flex items-center justify-center text-xs font-bold text-slate-400 select-none"
                    >
                      ...
                    </span>
                  );
                }
                const pageNum = item as number;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setCurrentPage(pageNum);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-9 h-9 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => {
                  hapticLight();
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* All Non-Price Filters Side-Menu / Full Page Sheet */}
      <TechnicianFiltersModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={filters}
        onApplyFilters={(next) => setFilters(next)}
        onResetFilters={() => setFilters(INITIAL_FILTERS)}
        totalResultsCount={filteredTechnicians.length}
      />

      {/* Price & Quick Sort Short & Small Dropdown Box */}
      <TechnicianSortModal
        isOpen={isSortModalOpen}
        onClose={() => setIsSortModalOpen(false)}
        selectedSort={sortOption}
        onSelectSort={(nextSort) => setSortOption(nextSort)}
      />
    </div>
  );
};
