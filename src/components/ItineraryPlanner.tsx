import React, { useState, useRef } from 'react';
import { Itinerary, TodoItem, ScheduledItem, Attraction } from '../types';
import { Trash2, Plus, CheckCircle2, Circle, ChevronRight, ArrowLeft, Edit2, Check, Camera, Download, Upload } from 'lucide-react';

interface ItineraryPlannerProps {
  itineraries: Itinerary[];
  setItineraries: (val: Itinerary[] | ((prev: Itinerary[]) => Itinerary[])) => void;
  attractions: Attraction[];
}

export function ItineraryPlanner({ itineraries, setItineraries, attractions }: ItineraryPlannerProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newTodo, setNewTodo] = useState('');
  const [todoGroup, setTodoGroup] = useState('General');
  
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editTodoValue, setEditTodoValue] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const dataStr = JSON.stringify(itineraries, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bwi-guide-itineraries-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedData)) {
          setItineraries(importedData);
        } else {
          alert('Invalid file format. Expected an array of itineraries.');
        }
      } catch (err) {
        alert('Error parsing the file.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const createItinerary = () => {
    if (!newTitle.trim()) return;
    const newItinerary: Itinerary = {
      id: crypto.randomUUID(),
      name: newTitle.trim(),
      attractionIds: [],
      todos: []
    };
    setItineraries(prev => [...prev, newItinerary]);
    setNewTitle('');
    setActiveId(newItinerary.id);
  };

  const deleteItinerary = (id: string) => {
    setItineraries(prev => prev.filter(i => i.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const activeItinerary = itineraries.find(i => i.id === activeId);

  const saveItineraryName = () => {
    if (!activeItinerary || !editNameValue.trim()) return;
    setItineraries(prev => prev.map(i => i.id === activeId ? { ...i, name: editNameValue.trim() } : i));
    setEditingName(false);
  };

  const addTodo = () => {
    if (!activeItinerary || !newTodo.trim()) return;
    const todo: TodoItem = { id: crypto.randomUUID(), task: newTodo.trim(), completed: false, group: todoGroup };
    setItineraries(prev => prev.map(i => i.id === activeId ? { ...i, todos: [...i.todos, todo] } : i));
    setNewTodo('');
  };

  const saveTodoEdit = () => {
    if (!activeItinerary || !editingTodoId || !editTodoValue.trim()) {
      setEditingTodoId(null);
      return;
    }
    setItineraries(prev => prev.map(i => i.id === activeId ? {
      ...i, 
      todos: i.todos.map(t => t.id === editingTodoId ? { ...t, task: editTodoValue.trim() } : t)
    } : i));
    setEditingTodoId(null);
  };

  const toggleTodo = (todoId: string) => {
    setItineraries(prev => prev.map(i => i.id === activeId ? {
      ...i, 
      todos: i.todos.map(t => t.id === todoId ? { ...t, completed: !t.completed } : t)
    } : i));
  };

  const deleteTodo = (todoId: string) => {
    setItineraries(prev => prev.map(i => i.id === activeId ? {
      ...i, 
      todos: i.todos.filter(t => t.id !== todoId)
    } : i));
  };

  const removeScheduledItem = (schedId: string, attrId: string) => {
    setItineraries(prev => prev.map(i => i.id === activeId ? {
      ...i,
      schedule: i.schedule?.filter(s => s.id !== schedId),
      attractionIds: i.attractionIds.filter(id => id !== attrId)
    } : i));
  };

  const updateScheduleDateTime = (schedId: string, date: string, time: string) => {
    setItineraries(prev => prev.map(i => i.id === activeId ? {
      ...i,
      schedule: i.schedule?.map(s => s.id === schedId ? { ...s, date, time } : s)
    } : i));
  };

  const addPhoto = (photoDataUrl: string) => {
    setItineraries(prev => prev.map(i => i.id === activeId ? {
      ...i,
      photos: [...(i.photos || []), photoDataUrl]
    } : i));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        addPhoto(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const deletePhoto = (photoIndex: number) => {
    setItineraries(prev => prev.map(i => i.id === activeId ? {
      ...i,
      photos: i.photos?.filter((_, idx) => idx !== photoIndex)
    } : i));
  };

  if (activeItinerary) {
    const defaultDate = new Date().toISOString().split('T')[0];
    const currentSchedule = activeItinerary.schedule || activeItinerary.attractionIds.map(id => ({ id: crypto.randomUUID(), attractionId: id, date: defaultDate, time: '09:00' }));
    
    // Sort by date then time
    const sortedSchedule = [...currentSchedule].sort((a, b) => {
      const dateA = a.date || defaultDate;
      const dateB = b.date || defaultDate;
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.time || '00:00').localeCompare(b.time || '00:00');
    });

    // Group todos
    const groupedTodos = activeItinerary.todos.reduce((acc, todo) => {
      const g = todo.group || 'General';
      if (!acc[g]) acc[g] = [];
      acc[g].push(todo);
      return acc;
    }, {} as Record<string, TodoItem[]>);

    return (
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-md border-b-4 border-r-4 border-primary flex flex-col gap-8">
        <div className="flex items-center gap-4 border-b-2 border-gray-100 pb-6">
          <button onClick={() => setActiveId(null)} className="p-2 bg-gray-100 hover:bg-primary hover:text-white rounded-xl text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          {editingName ? (
            <div className="flex-1 flex gap-2 items-center">
              <input 
                type="text" 
                value={editNameValue} 
                onChange={e => setEditNameValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveItineraryName()}
                className="flex-1 text-2xl md:text-3xl font-black uppercase tracking-tight border-b-2 border-primary outline-none"
                autoFocus
              />
              <button onClick={saveItineraryName} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                <Check className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex-1 flex gap-3 items-center group">
              <h2 className="text-2xl md:text-3xl font-black text-primary uppercase tracking-tight">{activeItinerary.name}</h2>
              <button 
                onClick={() => { setEditNameValue(activeItinerary.name); setEditingName(true); }}
                className="p-2 text-gray-300 hover:text-primary opacity-0 group-hover:opacity-100 transition-all rounded-lg"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Scheduled Places List */}
          <div className="flex flex-col gap-5">
            <h3 className="font-black text-xs uppercase tracking-widest text-primary mb-2">Scheduled Destinations</h3>
            {sortedSchedule.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 p-6 rounded-2xl text-center text-gray-500 text-sm font-bold uppercase tracking-widest">
                No destinations added yet
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {sortedSchedule.map(sched => {
                  const attr = attractions.find(d => d.id === sched.attractionId);
                  if (!attr) return null;
                  return (
                    <div 
                      key={sched.id} 
                      className="flex gap-3 p-3 rounded-2xl border-2 border-gray-100 items-center hover:border-primary transition-colors bg-white"
                    >
                      <div 
                        className="relative flex flex-col items-center justify-center bg-red-50 hover:bg-primary hover:text-white text-primary p-2 rounded-xl shrink-0 gap-1 border border-primary/10 transition-colors cursor-pointer group w-[72px]"
                        onClick={(e) => {
                          const input = e.currentTarget.querySelector('input');
                          if (input && 'showPicker' in input) {
                            try { input.showPicker(); } catch(err) {}
                          }
                        }}
                      >
                        <input 
                          id={"schedule-" + sched.id}
                          type="datetime-local" 
                          value={`${sched.date || defaultDate}T${sched.time || '09:00'}`} 
                          onChange={(e) => {
                            if (e.target.value) {
                              const [d, t] = e.target.value.split('T');
                              updateScheduleDateTime(sched.id, d, t);
                            }
                          }}
                          onClick={(e) => {
                            try { e.currentTarget.showPicker(); } catch(err) {}
                          }}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                        />
                        <div className="text-[10px] font-black uppercase text-center flex flex-col leading-tight z-0 pointer-events-none">
                          <span>{new Date(sched.date || defaultDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                          <span className="text-xs">{sched.time || '09:00'}</span>
                        </div>
                      </div>
                      <img src={attr.imageUrl} className="w-12 h-12 rounded-xl object-cover shrink-0" alt={attr.name} />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-gray-800 uppercase truncate">{attr.name}</h4>
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{attr.category}</span>
                      </div>
                      <button onClick={() => removeScheduledItem(sched.id, attr.id)} className="p-2 text-gray-400 hover:text-white hover:bg-primary rounded-lg transition-colors shrink-0">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Todo List */}
          <div className="flex flex-col gap-5">
            <h3 className="font-black text-xs uppercase tracking-widest text-primary mb-2">Trip Checklist</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="text" 
                value={todoGroup}
                onChange={e => setTodoGroup(e.target.value)}
                placeholder="Group (e.g. Packing)" 
                className="w-full sm:w-1/3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:border-primary focus:bg-white outline-none transition-all text-sm font-bold uppercase"
              />
              <div className="flex flex-1 gap-2">
                <input 
                  type="text" 
                  value={newTodo}
                  onChange={e => setNewTodo(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTodo()}
                  placeholder="What to bring or do?" 
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:border-primary focus:bg-white outline-none transition-all text-sm"
                />
                <button onClick={addTodo} className="px-5 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-bold uppercase text-xs">Add</button>
              </div>
            </div>
            <div className="flex flex-col gap-4 mt-2">
              {Object.keys(groupedTodos).length === 0 ? (
                <p className="text-gray-400 text-sm italic text-center py-4">No tasks added yet.</p>
              ) : (
                Object.entries(groupedTodos).map(([group, todos]) => (
                  <div key={group} className="flex flex-col gap-2">
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 pb-1">{group}</h4>
                    {todos.map(todo => (
                      <div key={todo.id} className="flex items-center gap-3 p-2 hover:bg-red-50/40 rounded-xl transition-colors group">
                        <button onClick={() => toggleTodo(todo.id)} className={todo.completed ? 'text-green-500 shrink-0' : 'text-gray-300 group-hover:text-primary transition-colors shrink-0'}>
                          {todo.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                        </button>
                        
                        {editingTodoId === todo.id ? (
                           <input 
                             type="text" 
                             value={editTodoValue}
                             onChange={e => setEditTodoValue(e.target.value)}
                             onKeyDown={e => e.key === 'Enter' && saveTodoEdit()}
                             onBlur={saveTodoEdit}
                             className="flex-1 border-b border-primary bg-transparent outline-none text-sm font-medium"
                             autoFocus
                           />
                        ) : (
                           <span 
                             onDoubleClick={() => { setEditTodoValue(todo.task); setEditingTodoId(todo.id); }}
                             className={`flex-1 font-medium text-sm cursor-text ${todo.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}
                           >
                             {todo.task}
                           </span>
                        )}
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => { setEditTodoValue(todo.task); setEditingTodoId(todo.id); }} className="p-1.5 text-gray-400 hover:text-primary rounded-lg transition-colors">
                             <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteTodo(todo.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
                             <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Trip Photos */}
        <div className="flex flex-col gap-5 border-t-2 border-gray-100 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-black text-xs uppercase tracking-widest text-primary">Trip Photos</h3>
            <label className="cursor-pointer px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-bold uppercase text-[10px] flex items-center justify-center gap-2">
              <Camera className="w-4 h-4" />
              <span>Take Picture</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
            {(!activeItinerary.photos || activeItinerary.photos.length === 0) ? (
               <p className="text-gray-400 text-sm italic col-span-full">No photos yet. Snap some memories!</p>
            ) : (
               activeItinerary.photos.map((photo, idx) => (
                 <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden border-2 border-gray-100 bg-gray-50">
                   <img src={photo} alt={`Trip photo ${idx + 1}`} className="w-full h-full object-cover" />
                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                     <a href={photo} download={`trip-photo-${idx + 1}.jpg`} className="p-2.5 bg-white text-primary rounded-xl hover:scale-110 transition-transform shadow-lg">
                       <Download className="w-5 h-5" />
                     </a>
                     <button onClick={() => deletePhoto(idx)} className="p-2.5 bg-red-500 text-white rounded-xl hover:scale-110 transition-transform shadow-lg">
                       <Trash2 className="w-5 h-5" />
                     </button>
                   </div>
                 </div>
               ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-md border-b-4 border-r-4 border-primary flex flex-col gap-4 max-w-2xl mx-auto w-full">
        <div className="flex gap-3 md:gap-4">
          <input 
            type="text"
            placeholder="NEW TRIP NAME"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createItinerary()}
            className="flex-1 px-4 md:px-5 py-3 md:py-4 rounded-xl border border-gray-200 bg-gray-50 focus:border-primary focus:bg-white outline-none md:text-sm font-bold uppercase transition-all"
          />
          <button onClick={createItinerary} className="px-6 md:px-8 py-3 md:py-4 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-bold uppercase text-xs flex items-center gap-2">
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Create</span>
          </button>
        </div>
        <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
          <input type="file" accept=".json" onChange={handleImport} ref={fileInputRef} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-bold uppercase text-[10px] flex items-center gap-2">
            <Upload className="w-4 h-4" /> Import JSON
          </button>
          <button onClick={exportData} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-bold uppercase text-[10px] flex items-center gap-2">
            <Download className="w-4 h-4" /> Export JSON
          </button>
        </div>
      </div>

      {itineraries.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <p className="text-lg font-black uppercase tracking-widest text-primary">No Itineraries Found</p>
          <p className="text-sm mt-2">Create one above to start planning your trip!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {itineraries.map(itinerary => (
            <div key={itinerary.id} className="bg-white p-6 rounded-2xl shadow-md border-b-4 border-r-4 border-primary hover:bg-gray-50 transition-all flex flex-col gap-6 cursor-pointer group" onClick={() => setActiveId(itinerary.id)}>
              <div className="flex justify-between items-start gap-4">
                <h3 className="font-black text-xl uppercase tracking-tight text-primary leading-tight group-hover:text-primary-dark transition-colors">{itinerary.name}</h3>
                <button onClick={(e) => { e.stopPropagation(); deleteItinerary(itinerary.id); }} className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-primary rounded-lg shrink-0">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              <div className="flex justify-between items-end mt-auto">
                <div className="flex flex-col gap-1.5 text-sm font-medium text-gray-500">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary/40"></span>
                    {itinerary.attractionIds.length} Destinations
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400"></span>
                    {itinerary.todos.filter(t => t.completed).length}/{itinerary.todos.length} Tasks
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white text-primary transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
