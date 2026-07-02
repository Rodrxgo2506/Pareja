import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Calendar, Clock, Bell, Plus, Trash2, Quote, Sparkles } from 'lucide-react';
import { RelationshipConfig, TimelineEvent } from '../types';
import { getAllFromStore, putToStore, deleteFromStore } from '../lib/db';
import { encrypt, decrypt } from '../lib/crypto';

interface DashboardProps {
  config: RelationshipConfig;
  passwordKey: string;
}

interface CustomAnniversary {
  id: string;
  name: string; // Plain or encrypted
  date: string; // YYYY-MM-DD
}

// Romantic quotes to display randomly on the dashboard
const ROMANTIC_QUOTES = [
  "En todo el mundo no hay corazón para mí como el tuyo. En todo el mundo, no hay amor para ti como el mío.",
  "El amor no consiste en mirarse el uno al otro, sino en mirar juntos en la misma dirección.",
  "Te amo no solo por lo que eres, sino por lo que soy cuando estoy contigo.",
  "Si tuviera una flor por cada vez que pienso en ti, podría caminar en mi jardín para siempre.",
  "Estar contigo es mi lugar favorito en el mundo.",
  "Nuestra historia de amor es mi favorita.",
  "Eres mi hoy y todos mis mañanas.",
  "Encontrarte fue como encontrar la pieza que le faltaba a mi rompecabezas.",
];

export default function Dashboard({ config, passwordKey }: DashboardProps) {
  const [timePassed, setTimePassed] = useState({
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalDays: 0,
  });
  const [quote, setQuote] = useState('');
  const [customAnns, setCustomAnns] = useState<CustomAnniversary[]>([]);
  const [annName, setAnnName] = useState('');
  const [annDate, setAnnDate] = useState('');
  const [showAddAnn, setShowAddAnn] = useState(false);
  const [stats, setStats] = useState({ photos: 0, messages: 0, memories: 0 });
  const [activeNotifications, setActiveNotifications] = useState<string[]>([]);
  const [confettiActive, setConfettiActive] = useState(false);

  // Pick a random quote on load
  useEffect(() => {
    const idx = Math.floor(Math.random() * ROMANTIC_QUOTES.length);
    setQuote(ROMANTIC_QUOTES[idx]);
  }, []);

  // Fetch stats and custom anniversaries
  useEffect(() => {
    async function loadData() {
      try {
        const albums = await getAllFromStore('albums');
        const photos = await getAllFromStore('photos');
        const messages = await getAllFromStore('messages');
        const timeline = await getAllFromStore<TimelineEvent>('timeline');

        setStats({
          photos: photos.length,
          messages: messages.length,
          memories: timeline.length,
        });

        // Load custom anniversaries from config/custom_anns
        const allConfigs = await getAllFromStore<any>('config');
        const customAnnsFromDB = allConfigs.find((c: any) => c.id === 'custom_anniversaries');
        if (customAnnsFromDB && customAnnsFromDB.list) {
          const decryptedList = customAnnsFromDB.list.map((item: any) => ({
            id: item.id,
            name: decrypt(item.name, passwordKey),
            date: item.date,
          })).filter((item: any) => item.name !== '');
          setCustomAnns(decryptedList);
        }
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      }
    }
    loadData();
  }, [passwordKey]);

  // Live timer tick
  useEffect(() => {
    const start = new Date(config.startDate + 'T00:00:00');

    function calculateTime() {
      const now = new Date();
      let diffMs = now.getTime() - start.getTime();

      if (diffMs < 0) diffMs = 0;

      const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      // Detailed breakdown
      let tempYear = start.getFullYear();
      let tempMonth = start.getMonth();
      let tempDay = start.getDate();

      let years = now.getFullYear() - tempYear;
      let months = now.getMonth() - tempMonth;
      let days = now.getDate() - tempDay;

      if (days < 0) {
        months--;
        // Get days in previous month
        const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += prevMonth.getDate();
      }

      if (months < 0) {
        years--;
        months += 12;
      }

      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();

      setTimePassed({
        years: Math.max(0, years),
        months: Math.max(0, months),
        days: Math.max(0, days),
        hours,
        minutes,
        seconds,
        totalDays,
      });
    }

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [config.startDate]);

  // Handle active anniversary notifications
  useEffect(() => {
    const today = new Date();
    const todayMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const startObj = new Date(config.startDate);
    const startMonthDay = `${String(startObj.getMonth() + 1).padStart(2, '0')}-${String(startObj.getDate()).padStart(2, '0')}`;
    const notifications: string[] = [];

    // Yearly Anniversary Check
    if (todayMonthDay === startMonthDay) {
      notifications.push(`🎉 ¡Hoy es vuestro Aniversario Anual! ¡Feliz aniversario de amor!`);
      setConfettiActive(true);
    } else if (today.getDate() === startObj.getDate()) {
      // Monthly Anniversary Check
      notifications.push(`🌸 ¡Hoy cumplen otro mes juntos! Feliz Mesiversario.`);
      setConfettiActive(true);
    }

    // Check custom anniversaries
    customAnns.forEach((ann) => {
      const annObj = new Date(ann.date);
      const annMonthDay = `${String(annObj.getMonth() + 1).padStart(2, '0')}-${String(annObj.getDate()).padStart(2, '0')}`;
      if (todayMonthDay === annMonthDay) {
        notifications.push(`✨ ¡Hoy celebran: "${ann.name}"!`);
        setConfettiActive(true);
      }
    });

    // If no notifications active, let's show upcoming countdowns
    if (notifications.length === 0) {
      // Calculate days to next monthly anniversary
      const nextMonthAnn = new Date(today.getFullYear(), today.getMonth(), startObj.getDate() + 1);
      if (nextMonthAnn < today) {
        nextMonthAnn.setMonth(nextMonthAnn.getMonth() + 1);
      }
      const diffTime = nextMonthAnn.getTime() - today.getTime();
      const daysToNext = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      notifications.push(`📅 Faltan ${daysToNext} días para vuestro próximo mesiversario.`);
    }

    setActiveNotifications(notifications);
  }, [config.startDate, customAnns]);

  // Adding Custom Anniversary
  const handleAddAnn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annName.trim() || !annDate) return;

    try {
      const newAnn: CustomAnniversary = {
        id: 'ann_' + Date.now(),
        name: annName.trim(),
        date: annDate,
      };

      const updatedList = [...customAnns, newAnn];
      setCustomAnns(updatedList);

      // Encrypt names before saving to IndexedDB
      const encryptedList = updatedList.map((item) => ({
        id: item.id,
        name: encrypt(item.name, passwordKey),
        date: item.date,
      }));

      await putToStore('config', {
        id: 'custom_anniversaries',
        list: encryptedList,
      });

      setAnnName('');
      setAnnDate('');
      setShowAddAnn(false);
    } catch (err) {
      console.error('Error saving custom anniversary:', err);
    }
  };

  // Deleting Custom Anniversary
  const handleDeleteAnn = async (id: string) => {
    try {
      const updatedList = customAnns.filter((ann) => ann.id !== id);
      setCustomAnns(updatedList);

      const encryptedList = updatedList.map((item) => ({
        id: item.id,
        name: encrypt(item.name, passwordKey),
        date: item.date,
      }));

      await putToStore('config', {
        id: 'custom_anniversaries',
        list: encryptedList,
      });
    } catch (err) {
      console.error('Error deleting custom anniversary:', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-8 pb-24 md:pb-12">
      
      {/* Dynamic Romantic Slogan Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center md:text-left flex flex-col md:flex-row md:items-end justify-between border-b border-rose-100 pb-5 gap-4"
      >
        <div>
          <span className="font-romantic text-5xl text-rose-600 select-none block md:inline-block leading-none">
            Cada segundo contigo...
          </span>
          <h1 className="text-3xl md:text-4xl font-serif font-black text-stone-900 tracking-tight mt-1.5">
            Nuestro Rincón de <span className="text-rose-600">Amor Eterno</span>
          </h1>
        </div>
        <div className="bg-rose-50 border border-rose-200 px-4 py-2 rounded-2xl text-xs font-mono text-rose-700 font-bold flex items-center justify-center gap-1.5 self-center md:self-auto shadow-xs">
          <Sparkles className="w-3.5 h-3.5 animate-spin text-rose-500" />
          <span>Sincronizado & Encriptado</span>
        </div>
      </motion.div>

      {/* Confetti Trigger effect if today is a special day */}
      {confettiActive && (
        <div className="bg-rose-600 text-white p-4.5 rounded-2xl flex items-center justify-between shadow-lg shadow-rose-200 animate-pulse">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-white fill-white animate-bounce" />
            <span className="text-sm font-serif font-bold">¡Día de Celebración Activo! Disfrutad de vuestro amor hoy al máximo. ♥</span>
          </div>
          <button 
            onClick={() => setConfettiActive(false)}
            className="text-xs font-mono uppercase tracking-wider font-bold bg-white text-rose-600 px-3 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Bento Grid Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Main Ticker Card */}
        <div className="md:col-span-2 bg-white rounded-3xl border-2 border-rose-500 shadow-xl p-6 flex flex-col justify-between relative overflow-hidden group outline outline-offset-4 outline-rose-100">
          <div className="absolute top-0 right-0 w-48 h-48 bg-rose-50 rounded-full filter blur-3xl -z-10 group-hover:scale-110 transition-transform duration-700"></div>
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="bg-rose-600 text-white p-2.5 rounded-xl shadow-md shadow-rose-200">
                  <Clock className="w-5 h-5 stroke-[2.5]" />
                </span>
                <h2 className="text-xl font-serif font-extrabold text-stone-900 tracking-tight">
                  Nuestro Tiempo Juntos
                </h2>
              </div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-rose-500 font-bold bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
                En Tiempo Real
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center my-4">
              <div className="bg-rose-50/40 p-3 rounded-2xl border-2 border-rose-100/60 shadow-xs hover:border-rose-300 transition-colors">
                <span className="block font-serif text-3xl font-black text-rose-600">
                  {timePassed.years}
                </span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-rose-500 font-bold">
                  Años
                </span>
              </div>
              <div className="bg-rose-50/40 p-3 rounded-2xl border-2 border-rose-100/60 shadow-xs hover:border-rose-300 transition-colors">
                <span className="block font-serif text-3xl font-black text-rose-600">
                  {timePassed.months}
                </span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-rose-500 font-bold">
                  Meses
                </span>
              </div>
              <div className="bg-rose-50/40 p-3 rounded-2xl border-2 border-rose-100/60 shadow-xs hover:border-rose-300 transition-colors">
                <span className="block font-serif text-3xl font-black text-rose-600">
                  {timePassed.days}
                </span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-rose-500 font-bold">
                  Días
                </span>
              </div>
              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200/60">
                <span className="block font-serif text-3xl font-bold text-stone-800">
                  {String(timePassed.hours).padStart(2, '0')}
                </span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-stone-500 font-bold">
                  Horas
                </span>
              </div>
              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200/60">
                <span className="block font-serif text-3xl font-bold text-stone-800">
                  {String(timePassed.minutes).padStart(2, '0')}
                </span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-stone-500 font-bold">
                  Minutos
                </span>
              </div>
              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200/60">
                <span className="block font-serif text-3xl font-bold text-stone-800">
                  {String(timePassed.seconds).padStart(2, '0')}
                </span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-stone-500 font-bold">
                  Segundos
                </span>
              </div>
            </div>
          </div>

          <div className="border-t-2 border-rose-50 pt-4 mt-4 flex items-center justify-between">
            <span className="text-xs text-stone-500 font-medium">
              Comenzamos esta hermosa aventura el <strong className="text-stone-800 font-bold">{config.startDate}</strong>
            </span>
            <span className="bg-rose-600 text-white px-3.5 py-1.5 rounded-full text-xs font-mono font-bold flex items-center gap-1 shadow-md shadow-rose-200">
              <Heart className="w-3.5 h-3.5 fill-white" /> {timePassed.totalDays} DÍAS JUNTOS
            </span>
          </div>
        </div>

        {/* Notifications & Reminders Box */}
        <div className="bg-white rounded-3xl border-2 border-rose-100 shadow-md p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50/40 rounded-full filter blur-2xl -z-10"></div>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-rose-100 text-rose-600 p-2.5 rounded-xl">
                <Bell className="w-5 h-5 stroke-[2.2]" />
              </span>
              <h2 className="text-lg font-serif font-extrabold text-stone-900 tracking-tight">
                Alertas de Amor
              </h2>
            </div>

            <div className="space-y-3.5 my-2">
              {activeNotifications.map((note, index) => (
                <div
                  key={index}
                  className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-100 text-xs text-stone-750 font-medium leading-relaxed flex items-start gap-2.5"
                >
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/30 shrink-0 mt-0.5 animate-pulse" />
                  <p>{note}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-semibold mt-4">
            * Calculado según vuestro aniversario
          </p>
        </div>
      </div>

      {/* Custom Milestones and Romantic Quote row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Quote Card - Now striking Romantic Red and White! */}
        <div className="md:col-span-1 bg-gradient-to-br from-rose-600 to-rose-800 rounded-3xl border-2 border-rose-500 shadow-xl p-6 flex flex-col justify-between min-h-[220px] relative overflow-hidden group">
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-rose-500/30 rounded-full filter blur-2xl -z-10"></div>
          
          <div className="bg-white/15 p-2.5 w-max rounded-xl border border-white/20 shadow-sm">
            <Quote className="w-4 h-4 text-white fill-white" />
          </div>
          
          <p className="font-serif italic text-white text-base font-medium leading-relaxed my-4 text-glow-rose">
            "{quote}"
          </p>

          <span className="text-[10px] font-mono tracking-widest uppercase text-rose-100 font-bold block">
            Suspiro del Día ♥
          </span>
        </div>

        {/* Custom Anniversaries list */}
        <div className="md:col-span-2 bg-white rounded-3xl border-2 border-rose-100 shadow-md p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="bg-rose-100 text-rose-600 p-2.5 rounded-xl">
                  <Calendar className="w-5 h-5 stroke-[2.2]" />
                </span>
                <h3 className="text-lg font-serif font-extrabold text-stone-900 tracking-tight">
                  Fechas Especiales Guardadas
                </h3>
              </div>
              <button
                onClick={() => setShowAddAnn(!showAddAnn)}
                className="p-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-xs"
              >
                <Plus className={`w-4 h-4 transition-transform duration-300 ${showAddAnn ? 'rotate-45' : ''}`} />
              </button>
            </div>

            <AnimatePresence>
              {showAddAnn && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleAddAnn}
                  className="space-y-3 bg-rose-50/40 p-4 rounded-2xl border border-rose-100 mb-4 overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Ej. Primer beso, Nuestro viaje..."
                      value={annName}
                      onChange={(e) => setAnnName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white text-stone-900 text-xs transition-all placeholder:text-stone-400 font-medium"
                      required
                    />
                    <input
                      type="date"
                      value={annDate}
                      onChange={(e) => setAnnDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white text-stone-900 text-xs transition-all font-medium"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddAnn(false)}
                      className="px-3.5 py-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-serif font-bold shadow-md cursor-pointer"
                    >
                      Guardar Cita
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {customAnns.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 text-center italic">
                No hay fechas personalizadas aún. Añade vuestro primer viaje, compromiso o momento único arriba.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[160px] overflow-y-auto pr-1">
                {customAnns.map((ann) => {
                  const daysToAnn = () => {
                    const today = new Date();
                    const annDateObj = new Date(ann.date);
                    const nextAnn = new Date(today.getFullYear(), annDateObj.getMonth(), annDateObj.getDate() + 1);
                    if (nextAnn < today) {
                      nextAnn.setFullYear(nextAnn.getFullYear() + 1);
                    }
                    const diff = nextAnn.getTime() - today.getTime();
                    return Math.ceil(diff / (1000 * 60 * 60 * 24));
                  };

                  return (
                    <div
                      key={ann.id}
                      className="p-3.5 bg-rose-50/30 rounded-2xl border border-rose-100/80 flex items-center justify-between text-xs text-stone-700 hover:bg-rose-50/60 transition-colors"
                    >
                      <div>
                        <span className="font-serif font-extrabold text-stone-900 block text-sm">{ann.name}</span>
                        <span className="text-[10px] font-mono text-stone-400 block mt-0.5">{ann.date}</span>
                        <span className="text-[10px] text-rose-600 font-bold font-mono block mt-1 flex items-center gap-0.5">
                          <Heart className="w-2.5 h-2.5 fill-rose-600 inline" /> Faltan {daysToAnn()} días
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteAnn(ann.id)}
                        className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                        title="Eliminar fecha"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick overview of content statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border-2 border-rose-100 text-center shadow-sm hover:border-rose-300 transition-colors">
          <span className="block font-serif text-3xl font-black text-rose-600">{stats.photos}</span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 font-bold mt-1.5 block">Cofre de Multimedia</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border-2 border-rose-100 text-center shadow-sm hover:border-rose-300 transition-colors">
          <span className="block font-serif text-3xl font-black text-rose-600">{stats.memories}</span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 font-bold mt-1.5 block">Hitos Vividos</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border-2 border-rose-100 text-center shadow-sm hover:border-rose-300 transition-colors">
          <span className="block font-serif text-3xl font-black text-rose-600">{stats.messages}</span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 font-bold mt-1.5 block">Cartas de Amor</span>
        </div>
      </div>

    </div>
  );
}
