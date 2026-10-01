import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Attraction, Category } from '../types';
import { Search, List, Map as MapIcon, Plus, X, Sparkles, Shuffle, MapPin, Camera, ExternalLink } from 'lucide-react';

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const customIcon = L.divIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #82181a; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const userIcon = L.divIcon({
  className: 'user-icon',
  html: `<div style="background-color: #3b82f6; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.4);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

interface DiscoverViewProps {
  onAddToItinerary: (attractionId: string) => void;
  attractions: Attraction[];
  selectedAttractionId?: string | null;
  onSelectAttraction?: (id: string | null) => void;
}

export function DiscoverView({ onAddToItinerary, attractions, selectedAttractionId, onSelectAttraction }: DiscoverViewProps) {
  const params = useParams<{ id?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const routeAttractionId = params.id || searchParams.get('attraction') || searchParams.get('id');

  const urlSearch = searchParams.get('search') ?? searchParams.get('q') ?? searchParams.get('query') ?? '';
  const urlCategory = (searchParams.get('category') as Category) || 'all';

  const [search, setSearch] = useState(urlSearch);
  const [category, setCategory] = useState<Category | 'all'>(urlCategory);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [internalSelectedAttraction, setInternalSelectedAttraction] = useState<string | null>(null);

  // Sync state if URL query params change (e.g. back/forward navigation)
  useEffect(() => {
    const q = searchParams.get('search') ?? searchParams.get('q') ?? searchParams.get('query') ?? '';
    setSearch(q);
    const cat = (searchParams.get('category') as Category) || 'all';
    setCategory(cat);
  }, [searchParams]);

  // Selected attraction resolves from prop, route param, query param, or internal state
  const selectedAttraction = selectedAttractionId !== undefined && selectedAttractionId !== null
    ? selectedAttractionId
    : (routeAttractionId || internalSelectedAttraction);

  const setSelectedAttraction = (id: string | null) => {
    onSelectAttraction?.(id);
    setInternalSelectedAttraction(id);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('attraction');
    nextParams.delete('id');
    const queryString = nextParams.toString() ? `?${nextParams.toString()}` : '';
    if (id) {
      navigate(`/discover/attraction/${id}${queryString}`);
    } else {
      navigate(`/discover${queryString}`);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    const nextParams = new URLSearchParams(searchParams);
    if (value.trim()) {
      nextParams.set('search', value);
    } else {
      nextParams.delete('search');
      nextParams.delete('q');
      nextParams.delete('query');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleCategoryChange = (cat: Category | 'all') => {
    setCategory(cat);
    const nextParams = new URLSearchParams(searchParams);
    if (cat && cat !== 'all') {
      nextParams.set('category', cat);
    } else {
      nextParams.delete('category');
    }
    setSearchParams(nextParams, { replace: true });
  };
  const [randomSuggestion, setRandomSuggestion] = useState<string | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (selectedAttraction) {
      const others = attractions.filter(a => a.id !== selectedAttraction);
      if (others.length > 0) {
        const random = others[Math.floor(Math.random() * others.length)];
        setRandomSuggestion(random.id);
      }
    }
  }, [selectedAttraction]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error("Error getting user location:", error);
        }
      );
    }
  }, []);

  const allCategories = ['all', ...Array.from(new Set(attractions.map(item => item.category)))];

  useEffect(() => {
    const updateHighlight = () => {
       const hour = Math.floor(Date.now() / 3600000);
       setHighlightIndex(hour % attractions.length);
    };
    updateHighlight();
    const interval = setInterval(updateHighlight, 60000);
    return () => clearInterval(interval);
  }, []);

  const highlightedItem = attractions[highlightIndex];

  const handleRandomRecommendation = () => {
     if (randomSuggestion) {
       setSelectedAttraction(randomSuggestion);
     }
  };

  const filteredData = attractions.filter(item => {
    const searchLower = search.toLowerCase();
    const matchesSearch = item.name.toLowerCase().includes(searchLower) || 
                          item.description.toLowerCase().includes(searchLower) ||
                          item.tags?.some(tag => tag.toLowerCase().includes(searchLower));
    const matchesCategory = category === 'all' || item.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col h-full gap-4 pb-8">
      {/* Hourly Highlight */}
      {highlightedItem && (
        <div 
          onClick={() => setSelectedAttraction(highlightedItem.id)}
          className="bg-white rounded-2xl overflow-hidden shadow-md border-b-4 border-r-4 border-primary flex flex-col md:flex-row cursor-pointer hover:bg-gray-50 transition-colors group relative"
        >
          <div className="absolute top-4 left-4 bg-primary text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest z-10 flex items-center gap-1 shadow-md">
            <Sparkles className="w-3 h-3" /> Hourly Highlight
          </div>
          <div className="md:w-1/3 h-48 md:h-auto relative">
            <img src={highlightedItem.imageUrl} alt={highlightedItem.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/10"></div>
          </div>
          <div className="p-6 flex flex-col justify-center flex-1">
            <h2 className="text-2xl font-black text-primary uppercase leading-tight mb-2">{highlightedItem.name}</h2>
            <p className="text-sm text-gray-600 line-clamp-3 mb-4">{highlightedItem.description}</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {highlightedItem.tags?.map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-[10px] font-bold uppercase tracking-wider">#{tag}</span>
              ))}
            </div>
            <div className="flex items-center justify-between mt-auto">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest px-3 py-1 bg-red-50 rounded-full border border-primary/20">{highlightedItem.category}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); onAddToItinerary(highlightedItem.id); }}
                className="bg-primary text-white hover:bg-primary-dark px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-colors font-bold uppercase text-xs"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white p-4 rounded-2xl shadow-md border-b-4 border-r-4 border-primary flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search attractions, events, foods..." 
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-200 bg-gray-50 focus:border-primary focus:bg-white focus:outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase whitespace-nowrap transition-colors flex items-center gap-2 ${
                category === cat ? 'bg-primary text-white' : 'text-gray-700 hover:bg-red-50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${category === cat ? 'bg-white' : 'bg-gray-300'}`}></span>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
          <button 
            onClick={() => setViewMode('list')} 
            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-primary'}`}
          >
            <List className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setViewMode('map')} 
            className={`p-2 rounded-lg transition-colors ${viewMode === 'map' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-primary'}`}
          >
            <MapIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'map' ? (
        <div className="bg-white p-2 rounded-2xl shadow-md border-b-4 border-r-4 border-primary h-[600px] relative z-0">
           <MapContainer center={[-8.2192, 114.3692]} zoom={10} style={{ height: '100%', width: '100%', borderRadius: '12px' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {userLocation && (
              <>
                <Marker position={userLocation} icon={userIcon}>
                  <Popup>You are here</Popup>
                </Marker>
                <Circle center={userLocation} radius={5000} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1 }} />
              </>
            )}
            {filteredData.map(item => (
              <Marker key={item.id} position={[item.lat, item.lng]} icon={customIcon}>
                <Popup className="rounded-2xl">
                  <div className="font-semibold text-base mb-1">{item.name}</div>
                  <div className="text-xs text-gray-500 capitalize mb-2">{item.category}</div>
                  <button 
                    onClick={() => onAddToItinerary(item.id)}
                    className="text-xs bg-primary text-white px-2 py-1.5 rounded-lg w-full flex items-center justify-center gap-1 hover:bg-primary-dark transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add to Plan
                  </button>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredData.map(item => (
            <div 
              key={item.id} 
              onClick={() => setSelectedAttraction(item.id)}
              className="bg-white rounded-2xl overflow-hidden shadow-md border-b-4 border-r-4 border-primary flex flex-col cursor-pointer hover:bg-gray-50 transition-colors group"
            >
              <div className="h-48 overflow-hidden relative shrink-0">
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="absolute top-3 right-3 bg-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-primary border border-primary">
                  {item.category}
                </div>
              </div>
              <div className="p-5 flex flex-col gap-2 flex-1">
                <h3 className="font-black text-lg uppercase text-primary leading-tight">{item.name}</h3>
                <p className="text-xs text-gray-600 line-clamp-2 mb-3">{item.description}</p>
                <div className="mt-auto pt-4">
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.tags?.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-[9px] font-bold uppercase tracking-wider">#{tag}</span>
                    ))}
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onAddToItinerary(item.id); }}
                    className="w-full bg-primary text-white hover:bg-primary-dark px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors font-bold uppercase text-xs"
                  >
                    <Plus className="w-4 h-4" />
                    Add to Itinerary
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedAttraction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl border-b-4 border-r-4 border-primary flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
            {(() => {
              const item = attractions.find(d => d.id === selectedAttraction);
              if (!item) return null;
              return (
                <>
                  <div className="relative h-64 shrink-0">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    <button 
                      onClick={() => setSelectedAttraction(null)} 
                      className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors backdrop-blur-md"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-4 left-6 right-6">
                      <span className="inline-block mb-2 px-3 py-1 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/50 shadow-sm">
                        {item.category}
                      </span>
                      <h2 className="text-3xl md:text-4xl font-black text-white uppercase leading-tight drop-shadow-md">{item.name}</h2>
                    </div>
                  </div>
                  <div className="p-6 md:p-8 flex flex-col gap-6">
                    <div className="flex flex-wrap gap-2">
                      {item.tags?.map(tag => (
                        <span key={tag} className="px-3 py-1 bg-red-50 text-primary rounded-lg text-xs font-bold uppercase tracking-wider border border-primary/10">#{tag}</span>
                      ))}
                    </div>
                    <p className="text-gray-700 leading-relaxed text-sm md:text-base">{item.description}</p>
                    
                    {item.mapIframe && (
                      <div className="w-full rounded-xl overflow-hidden border-2 border-primary shadow-sm bg-gray-100" dangerouslySetInnerHTML={{ __html: item.mapIframe }} />
                    )}
                    
                    {(() => {
                      const rawPhotoUrl =
                        item.photoSpotUrl ||
                        item.photoPoseUrl ||
                        item.photoSpotRecommendation ||
                        item.photoPoseRecommendation ||
                        item.photoPoseSpotRecommendation ||
                        item.photoRecommendationUrl ||
                        item.photoSpot ||
                        item.photoPose ||
                        item.photoSpotRecomendation ||
                        item.photoPoseRecomendation ||
                        item.photoPoseSpotRecomendation;

                      if (!rawPhotoUrl || typeof rawPhotoUrl !== 'string' || !rawPhotoUrl.trim()) {
                        return null;
                      }

                      const photoUrl = rawPhotoUrl.trim().startsWith('http://') || rawPhotoUrl.trim().startsWith('https://')
                        ? rawPhotoUrl.trim()
                        : `https://${rawPhotoUrl.trim()}`;

                      return (
                        <div className="bg-red-50/70 border-2 border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-sm">
                              <Camera className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-primary/80">Photo Guide</div>
                              <h4 className="font-black text-sm uppercase text-primary">Photo Pose & Spot Recommendation</h4>
                              <p className="text-xs text-gray-600 mt-0.5">Explore best angles and recommended photo poses for this destination.</p>
                            </div>
                          </div>
                          <a
                            href={photoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            role="button"
                            data-testid="photo-spot-recommendation-btn"
                            className="px-5 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold uppercase text-xs transition-colors shadow-sm inline-flex items-center justify-center gap-2 shrink-0 group text-center"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Photo Pose / Spot Recommendation</span>
                            <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </a>
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                      <button 
                        onClick={() => { onAddToItinerary(item.id); setSelectedAttraction(null); }}
                        className="py-4 bg-primary text-white rounded-xl font-bold uppercase text-xs hover:bg-primary-dark transition-colors shadow-sm flex justify-center items-center gap-2"
                      >
                        <Plus className="w-5 h-5" /> Add to Itinerary
                      </button>

                      {randomSuggestion && (() => {
                        const rec = attractions.find(d => d.id === randomSuggestion);
                        if (!rec) return null;
                        return (
                          <div 
                            onClick={handleRandomRecommendation}
                            className="bg-gray-50 border-2 border-primary rounded-xl overflow-hidden shadow-sm hover:bg-red-50 transition-colors cursor-pointer flex flex-col group relative"
                          >
                            <div className="absolute top-2 left-2 bg-white/90 text-primary px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest z-10 shadow-sm backdrop-blur flex items-center gap-1">
                               <Shuffle className="w-3 h-3" /> Next Suggestion
                            </div>
                            <div className="h-16 relative">
                              <img src={rec.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={rec.name} />
                              <div className="absolute inset-0 bg-black/20"></div>
                            </div>
                            <div className="p-2 flex-1 flex items-center justify-center text-center">
                               <span className="font-bold text-primary uppercase text-xs truncate w-full px-2">{rec.name}</span>
                            </div>
                          </div>
                        )
                      })()}
                    </div>

                    {(() => {
                      const nearest = attractions
                        .filter(d => d.id !== item.id)
                        .map(d => ({ ...d, distance: calculateDistance(item.lat, item.lng, d.lat, d.lng) }))
                        .filter(d => d.distance <= 10)
                        .sort((a, b) => a.distance - b.distance);

                      if (nearest.length === 0) return null;
                      
                      return (
                        <div className="mt-4 border-t-2 border-gray-100 pt-6">
                          <h4 className="font-black text-xs uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> Nearby Attractions (Within 10km)
                          </h4>
                          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {nearest.map(nearItem => (
                              <div 
                                key={nearItem.id} 
                                onClick={() => setSelectedAttraction(nearItem.id)}
                                className="min-w-[140px] max-w-[140px] bg-white border-2 border-gray-100 rounded-xl overflow-hidden cursor-pointer hover:border-primary transition-colors flex flex-col group shrink-0"
                              >
                                <div className="h-24 overflow-hidden relative">
                                  <img src={nearItem.imageUrl} alt={nearItem.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                  <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                                    {nearItem.distance.toFixed(1)} km
                                  </div>
                                </div>
                                <div className="p-2 text-center">
                                  <div className="font-bold text-[10px] text-gray-800 uppercase line-clamp-2 leading-tight group-hover:text-primary transition-colors">{nearItem.name}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
