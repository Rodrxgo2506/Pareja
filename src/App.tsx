import React, { useState, useEffect } from 'react';
import LockScreen from './components/LockScreen';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Gallery from './components/Gallery';
import Timeline from './components/Timeline';
import Messages from './components/Messages';
import MusicPlayer from './components/MusicPlayer';
import Quiz from './components/Quiz';
import { RelationshipConfig } from './types';
import { initDB } from './lib/db';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordKey, setPasswordKey] = useState<string>('');
  const [config, setConfig] = useState<RelationshipConfig | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Initialize the database on application load
  useEffect(() => {
    async function setupDatabase() {
      try {
        await initDB();
      } catch (err) {
        console.error('Failed to initialize local IndexedDB database:', err);
      } finally {
        setIsInitializing(false);
      }
    }
    setupDatabase();
  }, []);

  const handleUnlock = (password: string, userConfig: RelationshipConfig) => {
    setPasswordKey(password);
    setConfig(userConfig);
    setIsAuthenticated(true);
  };

  const handleLock = () => {
    // Clear all cryptographic keys from memory for E2EE safety
    setPasswordKey('');
    setIsAuthenticated(false);
    setConfig(null);
    setCurrentTab('dashboard');
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin border-3 border-rose-500 border-t-transparent w-8 h-8 rounded-full mb-4"></div>
          <p className="text-stone-400 font-serif text-xs">Abriendo vuestro cofre secreto...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !config) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col text-stone-900 selection:bg-rose-100 selection:text-rose-900 font-sans leading-relaxed">
      
      {/* Decorative background vectors for romance aesthetic */}
      <div className="fixed top-0 left-0 w-96 h-96 bg-rose-100/10 rounded-full filter blur-3xl pointer-events-none -z-10"></div>
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-amber-50/20 rounded-full filter blur-3xl pointer-events-none -z-10"></div>

      {/* Shared navigation header */}
      <Navbar
        currentTab={currentTab}
        setTab={setCurrentTab}
        config={config}
        onLock={handleLock}
      />

      {/* Dynamic tab contents panel */}
      <main className="flex-1 w-full animate-fade-in">
        {currentTab === 'dashboard' && (
          <Dashboard config={config} passwordKey={passwordKey} />
        )}
        {currentTab === 'gallery' && (
          <Gallery passwordKey={passwordKey} />
        )}
        {currentTab === 'timeline' && (
          <Timeline passwordKey={passwordKey} />
        )}
        {currentTab === 'messages' && (
          <Messages passwordKey={passwordKey} partnerAName={config.partnerAName} />
        )}
        {currentTab === 'songs' && (
          <MusicPlayer passwordKey={passwordKey} />
        )}
        {currentTab === 'quiz' && (
          <Quiz passwordKey={passwordKey} />
        )}
      </main>
    </div>
  );
}
