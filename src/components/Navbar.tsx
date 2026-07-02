import React from 'react';
import { Heart, Image, Calendar, Mail, Music, Award, LogOut } from 'lucide-react';
import { RelationshipConfig } from '../types';

interface NavbarProps {
  currentTab: string;
  setTab: (tab: string) => void;
  config: RelationshipConfig;
  onLock: () => void;
}

export default function Navbar({ currentTab, setTab, config, onLock }: NavbarProps) {
  const tabs = [
    { id: 'dashboard', label: 'Inicio', icon: Heart },
    { id: 'gallery', label: 'Álbumes', icon: Image },
    { id: 'timeline', label: 'Nuestra Línea', icon: Calendar },
    { id: 'messages', label: 'Mensajes', icon: Mail },
    { id: 'songs', label: 'Canciones', icon: Music },
    { id: 'quiz', label: 'Juego', icon: Award },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b-2 border-rose-100 px-4 md:px-8 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-rose-600 p-2.5 rounded-xl shadow-md shadow-rose-100 flex items-center justify-center animate-pulse">
          <Heart className="w-5 h-5 text-white fill-white" />
        </div>
        <div>
          <span className="font-serif text-base font-extrabold text-stone-955 tracking-tight leading-none block">
            {config.partnerAName} <span className="text-rose-600">♥</span> {config.partnerBName}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-rose-500 font-semibold block mt-1">
            Nuestro Cofre de Amor
          </span>
        </div>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-sans font-bold tracking-wider uppercase transition-all cursor-pointer ${
                isActive
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-200/60 scale-105'
                  : 'text-stone-500 hover:text-rose-600 hover:bg-rose-50/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        <button
          onClick={onLock}
          title="Cerrar y cifrar espacio"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white text-xs font-semibold tracking-wide transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Salir & Cifrar</span>
        </button>
      </div>

      {/* Mobile Floating Bottom Bar */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 bg-white/95 backdrop-blur-md border-2 border-rose-100 rounded-2xl shadow-2xl flex items-center justify-around py-3 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex flex-col items-center gap-1.5 p-1 px-3 rounded-xl transition-all cursor-pointer ${
                isActive ? 'text-rose-600 scale-110 font-bold' : 'text-stone-400 hover:text-rose-400'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5] text-rose-600' : 'stroke-[1.8]'}`} />
              <span className="text-[9px] font-sans tracking-wide uppercase font-bold">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
