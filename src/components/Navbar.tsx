import React from 'react';
import { Heart, Image, Calendar, Mail, Music, Award, LogOut, Sun, Moon } from 'lucide-react';
import { RelationshipConfig } from '../types';

interface NavbarProps {
  currentTab: string;
  setTab: (tab: string) => void;
  config: RelationshipConfig;
  onLock: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export default function Navbar({ currentTab, setTab, config, onLock, isDarkMode, toggleDarkMode }: NavbarProps) {
  const tabs = [
    { id: 'dashboard', label: 'Inicio', icon: Heart },
    { id: 'gallery', label: 'Álbumes', icon: Image },
    { id: 'timeline', label: 'Nuestra Línea', icon: Calendar },
    { id: 'messages', label: 'Mensajes', icon: Mail },
    { id: 'songs', label: 'Canciones', icon: Music },
    { id: 'quiz', label: 'Juego', icon: Award },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b-2 border-rose-100 px-4 md:px-8 py-3.5 flex flex-col gap-3">
      {/* Brand & Logout Row */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="bg-rose-600 p-2 rounded-xl shadow-md shadow-rose-100 flex items-center justify-center animate-pulse shrink-0">
            <Heart className="w-4.5 h-4.5 text-white fill-white" />
          </div>
          <div className="min-w-0">
            <span className="font-serif text-sm md:text-base font-extrabold text-stone-900 tracking-tight leading-none block truncate">
              {config.partnerAName} <span className="text-rose-600">♥</span> {config.partnerBName}
            </span>
            <span className="text-[9px] md:text-[10px] font-mono uppercase tracking-widest text-rose-500 font-semibold block mt-1 truncate">
              Nuestro Cofre de Amor
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleDarkMode}
            title={isDarkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
            className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all cursor-pointer flex items-center justify-center dark:hover:bg-rose-950/40"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-500 fill-amber-500/20" /> : <Moon className="w-4 h-4 text-rose-600" />}
          </button>

          <button
            onClick={onLock}
            title="Cerrar y cifrar espacio"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white text-[11px] font-bold tracking-wide transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Salir</span>
          </button>
        </div>
      </div>

      {/* Horizontal navigation scrollable list of tabs, never cut off, works everywhere */}
      <nav className="w-full overflow-x-auto scrollbar-none flex items-center gap-2 pb-0.5 -mx-4 px-4 sm:mx-0 sm:px-0 select-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] sm:text-xs font-sans font-bold tracking-wider uppercase transition-all shrink-0 cursor-pointer ${isActive
                ? 'bg-rose-600 text-white shadow-md shadow-rose-200/60 scale-102'
                : 'text-stone-500 hover:text-rose-600 hover:bg-rose-50/50'
                }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
