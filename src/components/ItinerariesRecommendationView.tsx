import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Attraction, Itinerary, RecommendedItineraryPackage, TodoItem } from '../types';
import { Sparkles, Calendar, Clock, MapPin, CheckCircle, ChevronRight, Check, Compass, AlertCircle, ArrowRight, BookmarkCheck, ExternalLink, RefreshCw, RotateCcw, CalendarDays } from 'lucide-react';
import { handleImageError, getSafeImageSrc } from '../utils/imageFallback';

interface ItinerariesRecommendationViewProps {
  attractions: Attraction[];
  itineraries: Itinerary[];
  setItineraries: (val: Itinerary[] | ((prev: Itinerary[]) => Itinerary[])) => void;
  onAttractionClick: (attractionId: string) => void;
  onNavigateToPlanner: () => void;
}

const cleanText = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.replace(/\[cite:\s*[^\]]+\]/g, '').trim();
};

const formatGroupName = (slug: string): string => {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

const extractTime = (timeStr?: string): string => {
  if (!timeStr) return '';
  if (timeStr.includes('T')) return timeStr.split('T')[1].substring(0, 5);
  return timeStr;
};

const getPackageOriginalStartDate = (pkg?: RecommendedItineraryPackage): string => {
  if (!pkg || !pkg.itineraries.length) return new Date().toISOString().split('T')[0];
  const dates = pkg.itineraries
    .map(i => (i.start_time && i.start_time.includes('T') ? i.start_time.split('T')[0] : ''))
    .filter(Boolean)
    .sort();
  return dates[0] || new Date().toISOString().split('T')[0];
};

const getShiftedDate = (origDateStr: string, baseOrigDateStr: string, targetStartDateStr: string): string => {
  if (!origDateStr || !baseOrigDateStr || !targetStartDateStr) return targetStartDateStr;

  const [bY, bM, bD] = baseOrigDateStr.split('-').map(Number);
  const [oY, oM, oD] = origDateStr.split('-').map(Number);
  const [tY, tM, tD] = targetStartDateStr.split('-').map(Number);

  if (isNaN(bY) || isNaN(oY) || isNaN(tY)) return targetStartDateStr;

  const baseUtc = Date.UTC(bY, bM - 1, bD);
  const origUtc = Date.UTC(oY, oM - 1, oD);
  const diffDays = Math.round((origUtc - baseUtc) / (1000 * 60 * 60 * 24));

  const targetUtc = new Date(Date.UTC(tY, tM - 1, tD + diffDays));
  return targetUtc.toISOString().split('T')[0];
};

export function ItinerariesRecommendationView({
  attractions,
  itineraries,
  setItineraries,
  onAttractionClick,
  onNavigateToPlanner
}: ItinerariesRecommendationViewProps) {
  const params = useParams<{ packageId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlPackageId = params.packageId || searchParams.get('package') || searchParams.get('packageId');

  const [packages, setPackages] = useState<RecommendedItineraryPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | number | null>(urlPackageId || null);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);
  const [appliedDateRange, setAppliedDateRange] = useState<{ start: string; end: string } | null>(null);

  const fetchPackages = () => {
    setLoading(true);
    setError(null);
    fetch('https://raw.githubusercontent.com/punkestu/bwi-guide-data/refs/heads/main/itineraries-data.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data: RecommendedItineraryPackage[]) => {
        setPackages(data);
        if (data.length > 0) {
          const match = urlPackageId ? data.find(p => String(p.id) === String(urlPackageId)) : null;
          setSelectedPackageId(match ? match.id : data[0].id);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch recommended itineraries:', err);
        setError('Unable to load recommended itineraries at this moment.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  useEffect(() => {
    if (urlPackageId && packages.length > 0) {
      const match = packages.find(p => String(p.id) === String(urlPackageId));
      if (match) {
        setSelectedPackageId(match.id);
      }
    }
  }, [urlPackageId, packages]);

  const handleSelectPackage = (pkgId: string | number) => {
    setSelectedPackageId(pkgId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('package', String(pkgId));
    setSearchParams(nextParams, { replace: true });
  };

  const activePackage = packages.find(pkg => String(pkg.id) === String(selectedPackageId)) || packages[0];
  const baseOrigDate = getPackageOriginalStartDate(activePackage);
  const currentStartDate = customStartDate || baseOrigDate;

  // Group active package stops by the computed shifted date
  const stopsByDate: Record<string, typeof activePackage.itineraries> = {};
  if (activePackage) {
    activePackage.itineraries.forEach(item => {
      const origDate = item.start_time && item.start_time.includes('T') ? item.start_time.split('T')[0] : baseOrigDate;
      const shiftedDate = getShiftedDate(origDate, baseOrigDate, currentStartDate);
      if (!stopsByDate[shiftedDate]) {
        stopsByDate[shiftedDate] = [];
      }
      stopsByDate[shiftedDate].push(item);
    });
  }

  const sortedDates = Object.keys(stopsByDate).sort();
  const tripEndDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : currentStartDate;

  // Check if an itinerary with this clean name is already in My Itineraries
  const isAlreadyApplied = (pkgName: string) => {
    const cleanPkgName = cleanText(pkgName);
    return itineraries.some(it => cleanText(it.name).toLowerCase() === cleanPkgName.toLowerCase());
  };

  const handleApplyItinerary = (pkg: RecommendedItineraryPackage) => {
    const cleanName = cleanText(pkg.name);
    const pkgBaseDate = getPackageOriginalStartDate(pkg);
    const effectiveStartDate = customStartDate || pkgBaseDate;

    // Group checklist into Todos
    const todos: TodoItem[] = [];
    if (pkg.checklists) {
      (Object.entries(pkg.checklists) as [string, string[]][]).forEach(([groupKey, items]) => {
        const groupTitle = formatGroupName(groupKey);
        items.forEach(itemText => {
          todos.push({
            id: crypto.randomUUID(),
            task: cleanText(itemText),
            completed: false,
            group: groupTitle
          });
        });
      });
    }

    // Schedule items using calculated shifted dates based on start date
    const schedule = pkg.itineraries.map(itItem => {
      const origDate = itItem.start_time && itItem.start_time.includes('T') ? itItem.start_time.split('T')[0] : pkgBaseDate;
      const shiftedDate = getShiftedDate(origDate, pkgBaseDate, effectiveStartDate);
      const timePart = extractTime(itItem.start_time) || '09:00';
      return {
        id: crypto.randomUUID(),
        attractionId: itItem.place_id,
        date: shiftedDate,
        time: timePart
      };
    });

    const newItinerary: Itinerary = {
      id: crypto.randomUUID(),
      name: cleanName,
      attractionIds: pkg.itineraries.map(i => i.place_id),
      schedule,
      todos
    };

    setItineraries(prev => [...prev, newItinerary]);
    setAppliedNotification(cleanName);
    setAppliedDateRange({ start: effectiveStartDate, end: tripEndDate });
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-2xl shadow-md border-b-4 border-r-4 border-primary flex flex-col items-center justify-center gap-4 min-h-[400px]">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="font-black text-primary uppercase tracking-widest text-sm">Loading Curated Itineraries...</p>
      </div>
    );
  }

  if (error || packages.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-md border-b-4 border-r-4 border-primary flex flex-col items-center justify-center text-center gap-4">
        <AlertCircle className="w-12 h-12 text-primary" />
        <h3 className="font-black text-lg uppercase text-primary">Unable to load recommendations</h3>
        <p className="text-gray-600 text-sm max-w-md">{error || 'No itinerary packages found.'}</p>
        <button
          onClick={fetchPackages}
          className="mt-2 px-6 py-2.5 bg-primary text-white rounded-xl font-bold uppercase text-xs hover:bg-primary-dark transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-primary-dark via-primary to-primary-dark text-white p-6 md:p-8 rounded-2xl shadow-md border-b-4 border-r-4 border-red-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden z-0">
        <div className="flex-1 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-white/20">
            <Compass className="w-3.5 h-3.5" /> Curated Packages
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-tight mb-2">
            Itineraries Recommendation
          </h1>
          <p className="text-sm text-white/80 max-w-xl">
            Choose from professionally planned multi-day Banyuwangi vacation packages. Preview every destination, review tailored packing checklists, set your custom start date, and apply the entire itinerary directly to your personal planner with one click.
          </p>
        </div>
        <div className="hidden lg:flex items-center gap-3 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 shrink-0">
          <div className="flex flex-col text-right">
            <span className="text-2xl font-black">{packages.length}</span>
            <span className="text-[10px] uppercase font-bold text-white/70 tracking-wider">Ready Packages</span>
          </div>
          <Sparkles className="w-8 h-8 text-amber-300" />
        </div>
      </div>

      {/* Package Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {packages.map((pkg, idx) => {
          const isSelected = activePackage && String(activePackage.id) === String(pkg.id);
          const alreadySaved = isAlreadyApplied(pkg.name);
          const cleanPkgName = cleanText(pkg.name);
          const cleanThumbnail = cleanText(pkg.thumbnail);
          const totalChecklistItems = pkg.checklists
            ? Object.values(pkg.checklists).reduce<number>((acc, curr) => acc + (Array.isArray(curr) ? (curr as string[]).length : 0), 0)
            : 0;

          return (
            <a
              href="#recomendation-detail"
              key={pkg.id}
              onClick={() => handleSelectPackage(pkg.id)}
              className={`cursor-pointer rounded-2xl p-4 md:p-5 transition-all flex flex-col sm:flex-row gap-4 border-b-4 border-r-4 ${
                isSelected
                  ? 'bg-white border-primary shadow-lg ring-2 ring-primary/20 scale-[1.01]'
                  : 'bg-white border-gray-200 hover:border-primary/50 shadow-sm opacity-90 hover:opacity-100'
              }`}
            >
              <div className="sm:w-36 h-32 rounded-xl overflow-hidden relative shrink-0 bg-red-950/20">
                <img
                  src={getSafeImageSrc(cleanThumbnail)}
                  alt={cleanPkgName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  onError={(e) => {
                    const firstAttr = attractions.find(a => a.id === pkg.itineraries[0]?.place_id);
                    if (firstAttr?.imageUrl && e.currentTarget.src !== firstAttr.imageUrl && !e.currentTarget.dataset.triedAttr) {
                      e.currentTarget.dataset.triedAttr = 'true';
                      e.currentTarget.src = firstAttr.imageUrl;
                    } else {
                      handleImageError(e);
                    }
                  }}
                />
                <div className="absolute top-2 left-2 bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider shadow">
                  Option #{idx + 1}
                </div>
              </div>

              <div className="flex flex-col justify-between flex-1">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {alreadySaved && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-md border border-green-200 uppercase">
                        <BookmarkCheck className="w-3 h-3" /> In My Trips
                      </span>
                    )}
                    <span className="text-[10px] font-black text-primary uppercase tracking-wider bg-red-50 px-2 py-0.5 rounded border border-primary/20">
                      {pkg.itineraries.length} Stops
                    </span>
                    {totalChecklistItems > 0 && (
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {totalChecklistItems} Checklist Items
                      </span>
                    )}
                  </div>
                  <h3 className="font-black text-base uppercase text-gray-900 leading-snug group-hover:text-primary transition-colors">
                    {cleanPkgName}
                  </h3>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs font-bold text-primary uppercase flex items-center gap-1">
                    {isSelected ? 'Currently Viewing' : 'Select Package'}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                  {isSelected && (
                    <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
                  )}
                </div>
              </div>
            </a>
          );
        })}
      </div>

      {/* Active Package Details */}
      {activePackage && (
        <div id="recomendation-detail" className="bg-white rounded-2xl shadow-md border-b-4 border-r-4 border-primary p-6 md:p-8 flex flex-col gap-8">
          {/* Header Action Banner */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b-2 border-gray-100">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="bg-primary text-white text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest">
                  Featured Recommendation
                </span>
                {isAlreadyApplied(activePackage.name) && (
                  <span className="bg-green-100 text-green-800 text-[10px] font-bold uppercase px-3 py-1 rounded-full flex items-center gap-1 border border-green-200">
                    <CheckCircle className="w-3 h-3" /> Already Saved in My Itineraries
                  </span>
                )}
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-primary uppercase tracking-tight">
                {cleanText(activePackage.name)}
              </h2>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                <Calendar className="w-4 h-4 text-primary" />
                <span>
                  {sortedDates.length} Days Itinerary &bull; {activePackage.itineraries.length} Selected Destinations
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleApplyItinerary(activePackage)}
                className="px-6 py-3.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-black uppercase text-xs transition-all shadow-md hover:shadow-lg flex items-center gap-2 active:scale-95"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Apply & Save to My Itineraries</span>
              </button>
            </div>
          </div>

          {/* Trip Start Date Customizer */}
          <div className="bg-red-50/60 border-2 border-primary/20 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-wider">
                <CalendarDays className="w-4 h-4" />
                <span>Set Trip Start Date</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Adjust when your trip starts. The daily schedule will automatically recalculate for all {sortedDates.length} days ({currentStartDate} &rarr; {tripEndDate}).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="relative">
                <input
                  type="date"
                  value={currentStartDate}
                  onChange={(e) => {
                    if (e.target.value) setCustomStartDate(e.target.value);
                  }}
                  className="px-3.5 py-2.5 bg-white border-2 border-primary/30 focus:border-primary rounded-xl text-xs font-black uppercase text-gray-900 shadow-xs focus:outline-none cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={() => setCustomStartDate(new Date().toISOString().split('T')[0])}
                className="px-3 py-2 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 hover:text-primary rounded-xl text-[10px] font-bold uppercase transition-colors"
                title="Set start date to today"
              >
                Today
              </button>

              {customStartDate && customStartDate !== baseOrigDate && (
                <button
                  type="button"
                  onClick={() => setCustomStartDate('')}
                  className="px-3 py-2 bg-white hover:bg-red-50 border border-primary/30 text-primary rounded-xl text-[10px] font-bold uppercase transition-colors flex items-center gap-1"
                  title="Reset to package default template date"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              )}
            </div>
          </div>

          {/* Alert if place clicked */}
          <div className="bg-red-50/70 border-l-4 border-primary p-4 rounded-r-xl flex items-start gap-3">
            <Compass className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-gray-700 leading-relaxed">
              <span className="font-black text-primary uppercase">Interactive Guide:</span>{' '}
              Click on any attraction or place card below to open its full details, location map, photos, and nearby spots in the{' '}
              <strong className="text-primary font-bold">Discover</strong> menu!
            </div>
          </div>

          {/* Timeline: Day by Day */}
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-widest text-primary flex items-center gap-2">
                <Clock className="w-4 h-4" /> Daily Schedule & Itinerary Plan
              </h3>
              <span className="text-[11px] font-bold text-gray-400 uppercase">
                {activePackage.itineraries.length} total visits
              </span>
            </div>

            <div className="flex flex-col gap-8">
              {sortedDates.map((dateStr, dayIdx) => {
                const dayStops = stopsByDate[dateStr];
                let formattedDateHeader = dateStr;
                try {
                  const [y, m, d] = dateStr.split('-').map(Number);
                  const dateObj = new Date(y, m - 1, d);
                  formattedDateHeader = dateObj.toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  });
                } catch {
                  formattedDateHeader = dateStr;
                }

                return (
                  <div key={dateStr} className="flex flex-col gap-4">
                    {/* Day Badge */}
                    <div className="flex items-center gap-3">
                      <div className="bg-primary text-white text-xs font-black uppercase px-3 py-1.5 rounded-xl shadow-sm tracking-wider">
                        Day {dayIdx + 1}
                      </div>
                      <div className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                        {formattedDateHeader}
                      </div>
                      <div className="flex-1 h-px bg-gray-200"></div>
                    </div>

                    {/* Stops List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-0 md:pl-2">
                      {dayStops.map((stop, stopIdx) => {
                        const attr = attractions.find(a => String(a.id) === String(stop.place_id));
                        const cleanThumbnail = cleanText(stop.thumbnail) || attr?.imageUrl;
                        const startTime = extractTime(stop.start_time);
                        const endTime = extractTime(stop.end_time);
                        const timeBadge = startTime && endTime ? `${startTime} - ${endTime}` : startTime || '';

                        return (
                          <div
                            key={`${stop.place_id}-${stopIdx}`}
                            onClick={() => onAttractionClick(stop.place_id)}
                            className="group relative bg-white border-2 border-gray-100 hover:border-primary rounded-2xl p-4 transition-all shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between gap-3"
                          >
                            <div className="flex gap-4">
                              <div className="w-20 h-20 rounded-xl overflow-hidden bg-red-950/20 shrink-0 relative">
                                {cleanThumbnail ? (
                                  <img
                                    src={getSafeImageSrc(cleanThumbnail)}
                                    alt={attr?.name || 'Attraction'}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    onError={(e) => {
                                      if (attr?.imageUrl && e.currentTarget.src !== attr.imageUrl && !e.currentTarget.dataset.triedAttr) {
                                        e.currentTarget.dataset.triedAttr = 'true';
                                        e.currentTarget.src = attr.imageUrl;
                                      } else {
                                        handleImageError(e);
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-red-50 text-primary">
                                    <MapPin className="w-6 h-6" />
                                  </div>
                                )}
                                <div className="absolute top-1 left-1 bg-black/60 text-white text-[9px] font-black px-1.5 py-0.5 rounded backdrop-blur-xs">
                                  #{stopIdx + 1}
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  {timeBadge && (
                                    <span className="text-[10px] font-black text-primary bg-red-50 px-2 py-0.5 rounded border border-primary/20 flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5" /> {timeBadge}
                                    </span>
                                  )}
                                  {attr?.category && (
                                    <span className="text-[9px] font-bold text-gray-500 uppercase bg-gray-100 px-1.5 py-0.5 rounded">
                                      {attr.category}
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-black text-sm uppercase text-gray-900 leading-snug group-hover:text-primary transition-colors line-clamp-1">
                                  {attr ? attr.name : `Place #${stop.place_id}`}
                                </h4>
                                <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                                  {attr?.description || 'Click to view attraction details in the Discover menu.'}
                                </p>
                              </div>
                            </div>

                            {/* Card Footer Click Notice */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[10px] font-bold text-gray-400 group-hover:text-primary transition-colors uppercase">
                              <span className="flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" /> Open in Discover
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Checklist & Trip Preparation Section */}
          {activePackage.checklists && Object.keys(activePackage.checklists).length > 0 && (
            <div className="flex flex-col gap-4 pt-6 border-t-2 border-gray-100">
              <h3 className="font-black text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Recommended Trip Checklist & Packing Guide
              </h3>
              <p className="text-xs text-gray-500">
                These checklist items will automatically be imported into your &ldquo;My Itineraries&rdquo; tasks when you apply this package.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {(Object.entries(activePackage.checklists) as [string, string[]][]).map(([groupKey, items]) => (
                  <div
                    key={groupKey}
                    className="p-5 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                      <h4 className="font-black text-xs uppercase tracking-wider text-primary">
                        {formatGroupName(groupKey)}
                      </h4>
                      <span className="text-[10px] text-gray-400 font-bold ml-auto">
                        {items.length} items
                      </span>
                    </div>

                    <ul className="flex flex-col gap-2 mt-1">
                      {items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-700 leading-relaxed">
                          <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                          <span>{cleanText(item)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Action Bar */}
          <div className="pt-6 border-t-2 border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-gray-500">
              Start date: <strong className="text-primary font-bold">{currentStartDate}</strong> &bull; Schedule will automatically populate your calendar.
            </div>
            <button
              onClick={() => handleApplyItinerary(activePackage)}
              className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-black uppercase text-xs transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Apply & Save to My Itineraries</span>
            </button>
          </div>
        </div>
      )}

      {/* Success Notification Modal */}
      {appliedNotification && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl border-b-4 border-r-4 border-primary flex flex-col gap-4 text-center">
            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div>
              <h3 className="text-xl font-black uppercase text-primary tracking-tight">
                Itinerary Applied!
              </h3>
              <p className="text-sm font-bold text-gray-800 mt-1 uppercase">
                &ldquo;{appliedNotification}&rdquo;
              </p>
              {appliedDateRange && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-primary border border-primary/20 rounded-full text-xs font-bold">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {appliedDateRange.start} &rarr; {appliedDateRange.end}
                  </span>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                The itinerary schedule, attractions, and packing checklists have been successfully saved to your personal trips with your selected dates.
              </p>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={() => {
                  setAppliedNotification(null);
                  onNavigateToPlanner();
                }}
                className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold uppercase text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>View in My Itineraries</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setAppliedNotification(null)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold uppercase text-xs transition-colors"
              >
                Continue Exploring
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}
