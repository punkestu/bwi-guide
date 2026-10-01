export type Category = string;

export interface Attraction {
  id: string;
  name: string;
  description: string;
  category: Category;
  tags?: string[];
  lat: number;
  lng: number;
  imageUrl: string;
  mapIframe?: string;
}

export interface TodoItem {
  id: string;
  task: string;
  completed: boolean;
  group?: string;
}

export interface ScheduledItem {
  id: string;
  attractionId: string;
  date: string;
  time: string;
}

export interface Itinerary {
  id: string;
  name: string;
  attractionIds: string[]; // legacy
  schedule?: ScheduledItem[];
  todos: TodoItem[];
  photos?: string[];
}

export interface RecommendedItineraryItem {
  place_id: string;
  start_time: string;
  end_time: string;
  thumbnail: string | null;
}

export interface RecommendedItineraryPackage {
  id: number | string;
  name: string;
  thumbnail: string;
  itineraries: RecommendedItineraryItem[];
  checklists?: Record<string, string[]>;
}
