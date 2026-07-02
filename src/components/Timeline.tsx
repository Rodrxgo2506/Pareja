import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, Calendar, Plane, Coffee, Camera, Utensils, Music, Sparkles, 
  Plus, Trash2, SlidersHorizontal, Search, Trash 
} from 'lucide-react';
import { TimelineEvent } from '../types';
import { getAllFromStore, putToStore, deleteFromStore } from '../lib/db';
import { encrypt, decrypt } from '../lib/crypto';

interface TimelineProps {
  passwordKey: string;
}

// Icon mapper helper
export const TimelineIconMap: { [key: string]: React.ComponentType<any> } = {
  Heart: Heart,
  Plane: Plane,
  Coffee: Coffee,
  Camera: Camera,
  Utensils: Utensils,
  Music: Music,
  Sparkles: Sparkles,
};

const CATEGORIES = ['Aniversario', 'Viaje', 'Cita', 'Regalo', 'Otro'];

export default function Timeline({ passwordKey }: TimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // New Event Form State
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('Cita');
  const [iconName, setIconName] = useState('Heart');

  useEffect(() => {
    loadEvents();
  }, [passwordKey]);

  async function loadEvents() {
    try {
      const allEvents = await getAllFromStore<TimelineEvent>('timeline');
      
      // Decrypt events
      const decryptedEvents = allEvents.map((evt) => ({
        ...evt,
        title: decrypt(evt.title, passwordKey),
        description: decrypt(evt.description, passwordKey),
      })).filter((evt) => evt.title !== ''); // Filter out un-decryptable events with old keys

      setEvents(decryptedEvents);
    } catch (err) {
      console.error('Error loading timeline events:', err);
    }
  }

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !desc.trim() || !date) return;

    try {
      const newEvent: TimelineEvent = {
        id: 'evt_' + Date.now(),
        date: date,
        title: encrypt(title.trim(), passwordKey),
        description: encrypt(desc.trim(), passwordKey),
        icon: iconName,
        category: category,
        createdAt: Date.now(),
      };

      await putToStore('timeline', newEvent);
      
      // Clear form
      setTitle('');
      setDesc('');
      setDate('');
      setCategory('Cita');
      setIconName('Heart');
      setShowAddForm(false);

      // Reload
      loadEvents();
    } catch (err) {
      console.error('Error adding timeline event:', err);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteFromStore('timeline', id);
      loadEvents();
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  // Filter and sort events
  const processedEvents = events
    .filter((e) => filterCategory === 'All' || e.category === filterCategory)
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 space-y-8 pb-24 md:pb-12">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-150 pb-5">
        <div>
          <h2 className="text-2xl font-serif font-black text-stone-900 flex items-center gap-2 tracking-tight">
            <Calendar className="w-6 h-6 text-rose-600 fill-rose-600/10" /> Nuestra <span className="text-rose-600">Línea del Tiempo</span>
          </h2>
          <p className="text-stone-500 text-xs mt-1.5 font-medium">
            Cada pequeño paso, risa y aventura compartida escrita y cifrada para siempre. Un mapa de nuestro camino juntos.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-xs font-serif font-bold shadow-md shadow-rose-200 transition-all flex items-center gap-1.5 cursor-pointer w-max"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> Registrar Recuerdo
        </button>
      </div>

      {/* FILTER & SORT TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border-2 border-rose-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-rose-500" />
          <span className="text-xs font-mono text-rose-600 font-bold uppercase tracking-wider mr-2">Filtrar:</span>
          
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterCategory('All')}
              className={`px-3 py-1 rounded-xl text-xs font-serif font-bold transition-all cursor-pointer ${
                filterCategory === 'All'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-stone-500 hover:text-rose-600 hover:bg-rose-50/50'
              }`}
            >
              Todos
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-serif font-bold transition-all cursor-pointer ${
                  filterCategory === cat
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-stone-500 hover:text-rose-600 hover:bg-rose-50/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-rose-600 font-bold uppercase tracking-wider mr-1">Orden:</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className="px-3 py-1.5 bg-rose-50/30 border border-rose-100 rounded-xl text-xs text-stone-700 font-medium focus:outline-none"
          >
            <option value="asc">Cronológico (Más antiguo primero)</option>
            <option value="desc">Inverso (Más reciente primero)</option>
          </select>
        </div>
      </div>

      {/* ADD MEMORY DIALOG */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm"
          >
            <form onSubmit={handleAddEvent} className="space-y-4">
              <h3 className="font-serif font-medium text-stone-900 text-sm">Registrar un Momento Mágico</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">Título del Recuerdo</label>
                  <input
                    type="text"
                    placeholder="Ej. Nuestra primera cita en París, Aquel café juntos..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-rose-400 bg-stone-50 text-stone-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">Fecha del Suceso</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-rose-400 bg-stone-50 text-stone-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">Cuéntame la Historia</label>
                <textarea
                  placeholder="Describe con vuestras propias palabras este momento especial. Las risas, las miradas..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-rose-400 bg-stone-50 text-stone-900 leading-relaxed"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-rose-400 bg-stone-50 text-stone-900"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* ICON SELECTOR */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">Icono Representativo</label>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {Object.keys(TimelineIconMap).map((iconKey) => {
                      const IconComp = TimelineIconMap[iconKey];
                      const isSelected = iconName === iconKey;
                      return (
                        <button
                          key={iconKey}
                          type="button"
                          onClick={() => setIconName(iconKey)}
                          className={`p-2 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-rose-50 border-rose-200 text-rose-500 scale-105 shadow-xs'
                              : 'bg-stone-50 border-stone-200 text-stone-400 hover:text-stone-700'
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3.5 py-2 text-xs text-stone-500 hover:text-stone-800 hover:bg-stone-50 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2 text-xs font-serif rounded-xl shadow-sm cursor-pointer"
                >
                  Añadir Memoria
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VERTICAL TIMELINE GRID */}
      {processedEvents.length === 0 ? (
        <div className="bg-white p-12 text-center border border-stone-100 rounded-3xl">
          <Calendar className="w-12 h-12 text-stone-200 mx-auto mb-3" />
          <p className="text-stone-500 text-sm italic font-serif">No hay memorias en esta categoría.</p>
          <p className="text-stone-400 text-xs mt-1">Saca fotos, escribe cartas, y añade hitos aquí.</p>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 border-l-2 border-rose-150 space-y-8 py-2">
          {processedEvents.map((evt, idx) => {
            const IconComponent = TimelineIconMap[evt.icon] || Heart;
            
            // Format Date beautiful Spanish
            const eventDateStr = new Date(evt.date + 'T00:00:00').toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });

            return (
              <motion.div
                key={evt.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="relative group"
              >
                {/* Timeline node icon */}
                <span className="absolute -left-[38px] sm:-left-[46px] top-1.5 p-2 bg-white rounded-full border-2 border-rose-100 text-rose-600 group-hover:scale-110 group-hover:bg-rose-600 group-hover:border-rose-500 group-hover:text-white transition-all z-10 flex items-center justify-center shadow-xs">
                  <IconComponent className="w-4 h-4 stroke-[2.2] fill-current" />
                </span>

                {/* Timeline Card */}
                <div className="bg-white rounded-2xl border-2 border-rose-100/60 shadow-sm hover:shadow-md hover:border-rose-350 p-5 sm:p-6 transition-all relative">
                  <div className="flex items-start justify-between gap-4 mb-2.5">
                    <div>
                      <span className="bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider">
                        {evt.category}
                      </span>
                      <span className="text-[10px] font-mono text-stone-450 font-bold block sm:inline sm:ml-2 mt-1 sm:mt-0 uppercase tracking-widest">
                        {eventDateStr}
                      </span>
                    </div>

                    <button
                      onClick={() => setDeleteConfirmId(evt.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                      title="Eliminar del mapa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-base font-serif font-extrabold text-stone-950 leading-snug group-hover:text-rose-600 transition-colors">
                    {evt.title}
                  </h3>

                  <p className="text-stone-700 text-xs mt-2 leading-relaxed font-sans whitespace-pre-wrap">
                    {evt.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl border-2 border-rose-300 p-6 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="bg-rose-50 text-rose-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="font-serif font-extrabold text-stone-900 text-lg mb-2">¿Eliminar este recuerdo?</h3>
              <p className="text-stone-500 text-xs leading-relaxed mb-6">
                Esta acción borrará el recuerdo de vuestra línea de tiempo para siempre y no se podrá recuperar.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteEvent(deleteConfirmId)}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
