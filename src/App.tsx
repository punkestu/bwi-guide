import { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  useInRouterContext
} from 'react-router-dom';
import { useLocalStorage } from './hooks/useLocalStorage';
import { DiscoverView } from './components/DiscoverView';
import { ItineraryPlanner } from './components/ItineraryPlanner';
import { ItinerariesRecommendationView } from './components/ItinerariesRecommendationView';
import { Itinerary, Attraction } from './types';
import { Map, CalendarDays, X, Plus, Loader2, Compass } from 'lucide-react';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [itineraries, setItineraries] = useLocalStorage<Itinerary[]>('banyuwangi_itineraries', []);
  const [addingAttraction, setAddingAttraction] = useState<string | null>(null);
  const [selectedAttractionId, setSelectedAttractionId] = useState<string | null>(null);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [loading, setLoading] = useState(true);

  // Support hash routing compatibility if someone lands on /#/path
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#/') && hash.length > 2) {
      navigate(hash.slice(1), { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/punkestu/bwi-guide-data/refs/heads/main/attractions-data.json')
      .then(res => res.json())
      .then((data: Attraction[]) => {
        const hasAnyPhotoSpot = data.some(item => 
          item.photoSpotUrl || 
          item.photoPoseUrl || 
          item.photoSpotRecommendation || 
          item.photoPoseRecommendation ||
          item.photoPoseSpotRecommendation
        );
        if (!hasAnyPhotoSpot && data.length > 0) {
          data[0] = {
            ...data[0],
            photoSpotUrl: 'https://www.instagram.com/explore/tags/kawahijen/'
          };
        }
        setAttractions(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch attractions:", err);
        setLoading(false);
      });
  }, []);
  
  const handleAddToItinerary = (attractionId: string) => {
    setAddingAttraction(attractionId);
  };

  const confirmAddToItinerary = (itineraryId: string) => {
    if (!addingAttraction) return;
    
    setItineraries(prev => prev.map(i => {
      if (i.id === itineraryId) {
        const alreadyHas = i.schedule?.some(s => s.attractionId === addingAttraction) || i.attractionIds.includes(addingAttraction);
        if (!alreadyHas) {
          const newScheduleItem = {
            id: crypto.randomUUID(),
            attractionId: addingAttraction,
            date: new Date().toISOString().split('T')[0],
            time: '09:00'
          };
          return { 
            ...i, 
            attractionIds: [...i.attractionIds, addingAttraction],
            schedule: [...(i.schedule || []), newScheduleItem] 
          };
        }
      }
      return i;
    }));
    
    setAddingAttraction(null);
  };

  const createAndAdd = () => {
    if (!addingAttraction) return;
    const newItinerary: Itinerary = {
      id: crypto.randomUUID(),
      name: 'My New Trip',
      attractionIds: [addingAttraction],
      schedule: [{ id: crypto.randomUUID(), attractionId: addingAttraction, date: new Date().toISOString().split('T')[0], time: '09:00' }],
      todos: []
    };
    setItineraries(prev => [...prev, newItinerary]);
    setAddingAttraction(null);
    navigate('/planner'); 
  };

  const attractionToAdd = addingAttraction ? attractions.find(d => d.id === addingAttraction) : null;

  const isDiscoverActive =
    location.pathname === '/' ||
    location.pathname.startsWith('/discover') ||
    location.pathname.startsWith('/attraction') ||
    location.pathname.startsWith('/search');

  const isRecommendationActive =
    location.pathname.startsWith('/recommendation') ||
    location.pathname.startsWith('/itineraries-recommendation');

  const isPlannerActive =
    location.pathname.startsWith('/planner') ||
    location.pathname.startsWith('/my-itineraries') ||
    location.pathname.startsWith('/itineraries');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-primary">
          <Loader2 className="w-12 h-12 animate-spin" />
          <h2 className="text-xl font-bold uppercase tracking-widest">Loading Destinations...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-gray-900 pb-12 font-sans">
      <header className="bg-primary-dark text-white shadow-lg sticky top-0 z-10 border-b-4 border-red-950">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div
            onClick={() => navigate('/discover')}
            className="flex items-center gap-3 font-black text-xl tracking-widest uppercase cursor-pointer"
          >
            <img src="/logo.webp" className="w-9 h-9 rounded-full object-cover shadow-sm bg-white" alt="Logo" onError={(e) => { e.currentTarget.src = 'https://placehold.co/100x100/82181a/fff?text=SA'; }} />
            <div className="flex flex-col">
              <span>BWI-Guide</span>
              <a href="https://soreaja.my.id" target="_blank" rel="noopener noreferrer" className="text-[9px] text-white/70 hover:text-white uppercase tracking-widest leading-none mt-0.5" onClick={(e) => e.stopPropagation()}>by SoreAja</a>
            </div>
          </div>
          <nav className="flex gap-1.5 sm:gap-2">
            <button
              onClick={() => navigate('/discover')}
              className={`px-3 sm:px-4 py-2 rounded-full text-xs font-bold uppercase transition-all flex items-center gap-1.5 sm:gap-2 ${
                isDiscoverActive ? 'bg-white text-primary shadow-sm' : 'text-white/70 hover:text-white'
              }`}
            >
              <Map className="w-4 h-4" /> <span className="hidden sm:inline">Discover</span>
            </button>
            <button
              onClick={() => navigate('/recommendation')}
              className={`px-3 sm:px-4 py-2 rounded-full text-xs font-bold uppercase transition-all flex items-center gap-1.5 sm:gap-2 ${
                isRecommendationActive ? 'bg-white text-primary shadow-sm' : 'text-white/70 hover:text-white'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span className="hidden md:inline">Itineraries Recommendation</span>
              <span className="hidden sm:inline md:hidden">Recommendation</span>
            </button>
            <button
              onClick={() => navigate('/planner')}
              className={`px-3 sm:px-4 py-2 rounded-full text-xs font-bold uppercase transition-all flex items-center gap-1.5 sm:gap-2 ${
                isPlannerActive ? 'bg-white text-primary shadow-sm' : 'text-white/70 hover:text-white'
              }`}
            >
              <CalendarDays className="w-4 h-4" /> <span className="hidden sm:inline">My Itineraries</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8">
        <Routes>
          <Route path="/" element={<Navigate to="/discover" replace />} />
          <Route
            path="/discover"
            element={
              <DiscoverView
                onAddToItinerary={handleAddToItinerary}
                attractions={attractions}
                selectedAttractionId={selectedAttractionId}
                onSelectAttraction={setSelectedAttractionId}
              />
            }
          />
          <Route
            path="/discover/attraction/:id"
            element={
              <DiscoverView
                onAddToItinerary={handleAddToItinerary}
                attractions={attractions}
                selectedAttractionId={selectedAttractionId}
                onSelectAttraction={setSelectedAttractionId}
              />
            }
          />
          <Route
            path="/discover/:id"
            element={
              <DiscoverView
                onAddToItinerary={handleAddToItinerary}
                attractions={attractions}
                selectedAttractionId={selectedAttractionId}
                onSelectAttraction={setSelectedAttractionId}
              />
            }
          />
          <Route
            path="/attraction/:id"
            element={
              <DiscoverView
                onAddToItinerary={handleAddToItinerary}
                attractions={attractions}
                selectedAttractionId={selectedAttractionId}
                onSelectAttraction={setSelectedAttractionId}
              />
            }
          />
          <Route
            path="/attractions/:id"
            element={
              <DiscoverView
                onAddToItinerary={handleAddToItinerary}
                attractions={attractions}
                selectedAttractionId={selectedAttractionId}
                onSelectAttraction={setSelectedAttractionId}
              />
            }
          />
          <Route
            path="/search"
            element={
              <DiscoverView
                onAddToItinerary={handleAddToItinerary}
                attractions={attractions}
                selectedAttractionId={selectedAttractionId}
                onSelectAttraction={setSelectedAttractionId}
              />
            }
          />

          <Route
            path="/recommendation"
            element={
              <ItinerariesRecommendationView
                attractions={attractions}
                itineraries={itineraries}
                setItineraries={setItineraries}
                onAttractionClick={(attractionId) => {
                  setSelectedAttractionId(attractionId);
                  navigate(`/discover/attraction/${attractionId}`);
                }}
                onNavigateToPlanner={() => navigate('/planner')}
              />
            }
          />
          <Route
            path="/recommendation/:packageId"
            element={
              <ItinerariesRecommendationView
                attractions={attractions}
                itineraries={itineraries}
                setItineraries={setItineraries}
                onAttractionClick={(attractionId) => {
                  setSelectedAttractionId(attractionId);
                  navigate(`/discover/attraction/${attractionId}`);
                }}
                onNavigateToPlanner={() => navigate('/planner')}
              />
            }
          />
          <Route
            path="/recommendations"
            element={<Navigate to="/recommendation" replace />}
          />
          <Route
            path="/recommendations/:packageId"
            element={<Navigate to="/recommendation" replace />}
          />
          <Route
            path="/itineraries-recommendation"
            element={
              <ItinerariesRecommendationView
                attractions={attractions}
                itineraries={itineraries}
                setItineraries={setItineraries}
                onAttractionClick={(attractionId) => {
                  setSelectedAttractionId(attractionId);
                  navigate(`/discover/attraction/${attractionId}`);
                }}
                onNavigateToPlanner={() => navigate('/planner')}
              />
            }
          />
          <Route
            path="/itineraries-recommendation/:packageId"
            element={
              <ItinerariesRecommendationView
                attractions={attractions}
                itineraries={itineraries}
                setItineraries={setItineraries}
                onAttractionClick={(attractionId) => {
                  setSelectedAttractionId(attractionId);
                  navigate(`/discover/attraction/${attractionId}`);
                }}
                onNavigateToPlanner={() => navigate('/planner')}
              />
            }
          />

          <Route
            path="/planner"
            element={
              <ItineraryPlanner
                itineraries={itineraries}
                setItineraries={setItineraries}
                attractions={attractions}
              />
            }
          />
          <Route
            path="/planner/:itineraryId"
            element={
              <ItineraryPlanner
                itineraries={itineraries}
                setItineraries={setItineraries}
                attractions={attractions}
              />
            }
          />
          <Route path="/my-itineraries" element={<Navigate to="/planner" replace />} />
          <Route path="/itineraries" element={<Navigate to="/planner" replace />} />

          <Route path="*" element={<Navigate to="/discover" replace />} />
        </Routes>
      </main>

      {/* Modal */}
      {addingAttraction && attractionToAdd && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-md border-b-4 border-r-4 border-primary">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black text-primary uppercase tracking-widest">Add to Itinerary</h3>
              <button onClick={() => setAddingAttraction(null)} className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex gap-4 items-center p-3 bg-gray-50 rounded-xl mb-6 border border-gray-200">
              <img src={attractionToAdd.imageUrl} className="w-14 h-14 rounded-lg object-cover" alt="" />
              <div className="flex-1 font-bold text-gray-800 leading-tight uppercase">{attractionToAdd.name}</div>
            </div>

            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto mb-4 pr-1">
              {itineraries.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6 italic">No itineraries found.</p>
              ) : (
                itineraries.map(it => (
                  <button 
                    key={it.id} 
                    onClick={() => confirmAddToItinerary(it.id)}
                    className="flex justify-between items-center p-4 border border-gray-100 hover:border-primary hover:bg-red-50 rounded-2xl transition-colors text-left group"
                  >
                    <span className="font-bold text-gray-800 group-hover:text-primary truncate">{it.name}</span>
                    {it.attractionIds.includes(addingAttraction) ? (
                      <span className="text-xs text-primary font-bold bg-red-100 px-2 py-1 rounded-md">Added</span>
                    ) : (
                      <Plus className="w-5 h-5 text-gray-400 group-hover:text-primary" />
                    )}
                  </button>
                ))
              )}
            </div>
            
            <button onClick={createAndAdd} className="w-full py-4 bg-primary text-white rounded-xl font-bold uppercase text-xs hover:bg-primary-dark transition-colors shadow-sm flex justify-center items-center gap-2 mt-4">
              <Plus className="w-5 h-5" /> Create New Trip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const inRouter = useInRouterContext();
  if (!inRouter) {
    return (
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    );
  }
  return <AppContent />;
}
