import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Lock, Calendar, Sparkles, User, Upload, ArrowRight } from 'lucide-react';
import { hashKey, encrypt } from '../lib/crypto';
import { putToStore, getAllFromStore, clearAllStores } from '../lib/db';
import { RelationshipConfig } from '../types';

interface LockScreenProps {
  onUnlock: (password: string, config: RelationshipConfig) => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [partnerA, setPartnerA] = useState('');
  const [partnerB, setPartnerB] = useState('');
  const [startDate, setStartDate] = useState('2025-01-01');
  const [error, setError] = useState('');

  // Setup configuration mode
  const [setupMode, setSetupMode] = useState<'create' | 'join'>('create');
  const [backupText, setBackupText] = useState('');
  const [backupFileLoaded, setBackupFileLoaded] = useState('');

  // Check if configuration already exists in IndexedDB
  useEffect(() => {
    async function checkConfig() {
      try {
        const configs = await getAllFromStore<RelationshipConfig & { id: string }>('config');
        if (configs && configs.length > 0) {
          setIsFirstTime(false);
        } else {
          setIsFirstTime(true);
        }
      } catch (err) {
        console.error('Error checking DB config, defaulting to first time:', err);
        setIsFirstTime(true);
      }
    }
    checkConfig();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    try {
      const configs = await getAllFromStore<RelationshipConfig & { id: string }>('config');
      const currentConfig = configs[0];

      if (currentConfig && currentConfig.loveKeyHash) {
        const inputHash = hashKey(password);
        if (inputHash === currentConfig.loveKeyHash) {
          onUnlock(password, currentConfig);
        } else {
          setError('La Clave de Amor no es correcta. Inténtalo de nuevo, ¡tú puedes!');
          setPassword('');
        }
      }
    } catch (err) {
      setError('Error al acceder a los datos. Inténtalo de nuevo.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBackupFileLoaded(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setBackupText(text);
      try {
        const parsed = JSON.parse(text);
        const backupConfigList = parsed.config;
        const backupConfig = backupConfigList?.find((c: any) => c.id === 'main_config');
        if (backupConfig) {
          if (backupConfig.partnerAName) setPartnerA(backupConfig.partnerAName);
          if (backupConfig.partnerBName) setPartnerB(backupConfig.partnerBName);
          if (backupConfig.startDate) setStartDate(backupConfig.startDate);
        }
      } catch (err) {
        // Silently handle if not fully formed yet
      }
    };
    reader.readAsText(file);
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Por favor, ingresa una Clave de Amor.');
      return;
    }

    if (password.length < 4) {
      setError('La Clave de Amor debe tener al menos 4 caracteres por seguridad.');
      return;
    }

    try {
      const hashed = hashKey(password);

      if (setupMode === 'join' && backupText.trim()) {
        try {
          const parsed = JSON.parse(backupText.trim());

          const backupConfigList = parsed.config;
          if (!backupConfigList || !Array.isArray(backupConfigList)) {
            throw new Error('El archivo no parece tener una configuración válida.');
          }

          const backupConfig = backupConfigList.find((c: any) => c.id === 'main_config');
          if (!backupConfig) {
            throw new Error('No se encontró la configuración principal en el respaldo.');
          }

          // Verify password hash matches
          if (backupConfig.loveKeyHash !== hashed) {
            setError('La Clave de Amor no coincide con el respaldo importado. Asegúrate de escribir la misma clave.');
            return;
          }

          // Clear database
          await clearAllStores();

          // Import everything
          const stores = ['config', 'albums', 'photos', 'timeline', 'messages', 'songs', 'coupons'];
          for (const storeName of stores) {
            const list = parsed[storeName];
            if (list && Array.isArray(list)) {
              for (const item of list) {
                await putToStore(storeName, item);
              }
            }
          }

          onUnlock(password, backupConfig);
          return;
        } catch (err: any) {
          setError('Error al procesar el respaldo: ' + (err.message || 'Formato JSON inválido.'));
          return;
        }
      }

      // If manual or no backup uploaded:
      if (!partnerA.trim() || !partnerB.trim() || !startDate) {
        setError('Por favor, completa los nombres y fecha para vuestro rincón.');
        return;
      }

      const configItem: RelationshipConfig & { id: string } = {
        id: 'main_config',
        partnerAName: partnerA.trim(),
        partnerBName: partnerB.trim(),
        startDate: startDate,
        loveKeyHash: hashed,
      };

      // Save config
      await putToStore('config', configItem);

      if (setupMode === 'create') {
        // Pre-populate beautiful default encrypted items so the workspace looks magical
        await seedDefaultData(password, partnerA.trim(), partnerB.trim(), startDate);
      } else {
        // Just seed the basic anniversary so they have at least one clean anniversary milestone
        const timelineItem = {
          id: 'time1',
          date: startDate,
          title: encrypt('Comienzo de Nuestra Historia', password),
          description: encrypt('El hermoso día en que comenzó nuestra hermosa aventura juntos.', password),
          icon: 'Heart',
          category: 'Aniversario',
          createdAt: Date.now()
        };
        await putToStore('timeline', timelineItem);
      }

      onUnlock(password, configItem);
    } catch (err) {
      setError('Error al guardar la configuración. Vuelve a intentarlo.');
    }
  };

  // Pre-populates the database with cute romantic starter items encrypted with their loveKey
  const seedDefaultData = async (key: string, partA: string, partB: string, date: string) => {
    // 1. Preloaded Albums
    const album1 = { id: 'album_viajes', name: encrypt('Nuestras Aventuras', key), description: encrypt('Fotos especiales de nuestros viajes juntos.', key), isPrivate: false, createdAt: Date.now() };
    const album2 = { id: 'album_detalles', name: encrypt('Pequeños Secretos', key), description: encrypt('Nuestros momentos cotidianos y risas compartidas.', key), isPrivate: true, createdAt: Date.now() - 86400000 };
    await putToStore('albums', album1);
    await putToStore('albums', album2);

    // 2. Preloaded Messages
    const message1 = { id: 'msg1', author: encrypt(partA, key), text: encrypt('Eres lo mejor de mis días, mi sonrisa favorita y mi lugar seguro.', key), color: 'bg-rose-50 border-rose-100 text-rose-800', style: 'sticky', createdAt: Date.now() };
    const message2 = { id: 'msg2', author: encrypt(partB, key), text: encrypt('Me encanta cómo somos cuando estamos juntos. No hay nada igual.', key), color: 'bg-cream border-amber-200 text-amber-900', style: 'sticky', createdAt: Date.now() - 3600000 };
    await putToStore('messages', message1);
    await putToStore('messages', message2);

    // 3. Preloaded Songs
    const song1 = { id: 'song1', title: 'Perfect', artist: 'Ed Sheeran', url: 'https://www.youtube.com/embed/2Vv-BfVoq4g', note: encrypt('Esta canción siempre me hace recordar la forma en que me miras al bailar.', key), createdAt: Date.now(), isPreloaded: true };
    const song2 = { id: 'song2', title: 'L-O-V-E', artist: 'Nat King Cole', url: 'https://www.youtube.com/embed/JErVP6xDp5U', note: encrypt('Un clásico alegre que describe exactamente lo que siento cada vez que te veo sonreír.', key), createdAt: Date.now() - 100000, isPreloaded: true };
    await putToStore('songs', song1);
    await putToStore('songs', song2);

    // 4. Preloaded Coupons
    const coupon1 = { id: 'coupon1', title: 'Masaje Relajante de 30 Minutos', description: 'Válido por un tierno masaje de pies a cabeza con aceites aromáticos.', pointsRequired: 50, unlocked: false };
    const coupon2 = { id: 'coupon2', title: 'Cena Romántica Casera', description: 'Yo cocino tu plato favorito, con velas y tu música preferida.', pointsRequired: 100, unlocked: false };
    const coupon3 = { id: 'coupon3', title: 'Tarde Completa de Películas y Mimos', description: 'Tú eliges las películas, yo pongo las palomitas, snacks y abrazos infinitos.', pointsRequired: 150, unlocked: false };
    await putToStore('coupons', coupon1);
    await putToStore('coupons', coupon2);
    await putToStore('coupons', coupon3);

    // 5. Preloaded Timeline Events
    const timeline1 = { id: 'time1', date: date, title: encrypt('El Día que Comenzó Todo', key), description: encrypt('Un día mágico que cambió nuestras vidas para siempre. El inicio de nuestra hermosa historia.', key), icon: 'Heart', category: 'Aniversario', createdAt: Date.now() };
    const timeline2 = { id: 'time2', date: new Date(new Date(date).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], title: encrypt('Nuestra Primera Cita', key), description: encrypt('Aquellas horas conversando que parecieron minutos. Supimos de inmediato que esto era único.', key), icon: 'Coffee', category: 'Cita', createdAt: Date.now() - 50000 };
    await putToStore('timeline', timeline1);
    await putToStore('timeline', timeline2);
  };

  if (isFirstTime === null) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <Heart className="w-12 h-12 text-rose-300 animate-bounce" />
          <p className="text-stone-400 mt-4 font-sans text-sm">Cargando vuestro rincón privado...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 selection:bg-rose-100 selection:text-rose-900">

      {/* Background ambient aesthetic */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-rose-100/30 rounded-full filter blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-amber-50/40 rounded-full filter blur-3xl -z-10 pointer-events-none"></div>

      {isFirstTime ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="bg-white p-8 rounded-3xl border-2 border-rose-500 shadow-xl max-w-md w-full relative outline outline-offset-4 outline-rose-100"
          id="setup-card"
        >
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-4 py-1 rounded-full text-xs font-serif uppercase tracking-widest font-semibold flex items-center gap-1.5 shadow-md">
            <Heart className="w-3.5 h-3.5 fill-white" /> Creación
          </div>

          <div className="flex flex-col items-center mb-4 mt-2">
            <h1 className="text-2xl font-serif font-extrabold text-stone-950 text-center tracking-tight leading-tight">
              Bienvenidos a vuestro <span className="text-rose-600">Espacio</span>
            </h1>
            <p className="font-romantic text-3xl text-rose-500 mt-1 text-center select-none">
              Nuestra historia secreta
            </p>
          </div>

          {/* Form Mode Selector tabs */}
          <div className="flex border-b border-stone-100 mb-6 -mx-4">
            <button
              type="button"
              onClick={() => { setSetupMode('create'); setError(''); }}
              className={`flex-1 pb-2.5 text-xs font-serif font-bold transition-all border-b-2 text-center cursor-pointer ${setupMode === 'create'
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-stone-400 hover:text-stone-600'
                }`}
            >
              Crear Nuevo Rincón
            </button>
            <button
              type="button"
              onClick={() => { setSetupMode('join'); setError(''); }}
              className={`flex-1 pb-2.5 text-xs font-serif font-bold transition-all border-b-2 text-center cursor-pointer ${setupMode === 'join'
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-stone-400 hover:text-stone-600'
                }`}
            >
              Ya Tengo un Rincón
            </button>
          </div>

          <form onSubmit={handleSetup} className="space-y-4">
            {/* Password - Shared Love Key (Always required) */}
            <div>
              <label className="block text-[10px] font-mono text-rose-600 uppercase tracking-widest mb-1.5 font-semibold flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Clave de Amor (Contraseña Compartida)
              </label>
              <input
                type="password"
                placeholder="Vuestra contraseña secreta"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-rose-50/20 text-stone-900 text-sm transition-all placeholder:text-stone-400"
                required
              />
              <p className="text-[10px] text-stone-400 mt-1 leading-relaxed">
                * Esta clave es indispensable para cifrar y proteger vuestros datos. ¡Deben usar la misma contraseña exacta tú y tu pareja!
              </p>
            </div>

            {/* Optional Backup loading inside Join screen */}
            {setupMode === 'join' && (
              <div className="bg-stone-50 border border-stone-200/80 p-4 rounded-2xl space-y-3.5">
                <div className="flex items-center gap-2 text-stone-700">
                  <Upload className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="text-xs font-serif font-extrabold text-stone-950">Importar Datos de tu Pareja</span>
                </div>

                <p className="text-[10px] text-stone-500 leading-normal">
                  Carga el archivo <code>.json</code> o pega el código de sincronización que exportó tu pareja para heredar todos los recuerdos al instante.
                </p>

                <div className="space-y-2">
                  <label className="block text-[9px] font-mono text-stone-500 uppercase tracking-wider">
                    Opción A: Subir Archivo Respaldo
                  </label>
                  <label className="flex items-center justify-between border-2 border-dashed border-stone-200 hover:border-rose-300 rounded-xl px-4 py-2.5 cursor-pointer bg-white transition-colors">
                    <span className="text-xs text-stone-500 font-medium truncate max-w-[180px]">
                      {backupFileLoaded || "Seleccionar archivo .json"}
                    </span>
                    <Upload className="w-3.5 h-3.5 text-stone-400" />
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-mono text-stone-500 uppercase tracking-wider">
                    Opción B: Pegar Código de Sincronización
                  </label>
                  <textarea
                    placeholder="Pega aquí el código que te envió tu pareja..."
                    value={backupText}
                    onChange={(e) => {
                      setBackupText(e.target.value);
                      try {
                        const parsed = JSON.parse(e.target.value);
                        const backupConfigList = parsed.config;
                        const backupConfig = backupConfigList?.find((c: any) => c.id === 'main_config');
                        if (backupConfig) {
                          if (backupConfig.partnerAName) setPartnerA(backupConfig.partnerAName);
                          if (backupConfig.partnerBName) setPartnerB(backupConfig.partnerBName);
                          if (backupConfig.startDate) setStartDate(backupConfig.startDate);
                        }
                      } catch (err) { }
                    }}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-rose-400 bg-white text-[11px] font-mono text-stone-800 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Basic Info Fields (Skip manual inputs if backup is already parsed) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-stone-100 pb-2 pt-1">
                <span className="text-xs font-serif font-extrabold text-stone-800">
                  {setupMode === 'join' && backupText ? "Datos Detectados del Respaldo" : "Datos del Rincón"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-rose-600 uppercase tracking-widest mb-1 font-semibold flex items-center gap-1">
                    <User className="w-3 h-3" /> Tu Nombre
                  </label>
                  <input
                    type="text"
                    placeholder="Tu nombre"
                    value={partnerA}
                    onChange={(e) => setPartnerA(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-rose-50/20 text-stone-900 text-xs transition-all placeholder:text-stone-400 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-rose-600 uppercase tracking-widest mb-1 font-semibold flex items-center gap-1">
                    <User className="w-3 h-3" /> Su Nombre
                  </label>
                  <input
                    type="text"
                    placeholder="Su nombre"
                    value={partnerB}
                    onChange={(e) => setPartnerB(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-rose-50/20 text-stone-900 text-xs transition-all placeholder:text-stone-400 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-rose-600 uppercase tracking-widest mb-1 font-semibold flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Fecha de Inicio de Relación
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-rose-50/20 text-stone-900 text-xs transition-all font-medium"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-600 bg-rose-50/80 p-3 rounded-xl border border-rose-200 text-center font-medium">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full mt-4 bg-rose-600 hover:bg-rose-700 text-white font-serif font-bold py-3 px-4 rounded-xl shadow-lg shadow-rose-100 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <Heart className="w-4 h-4 fill-white animate-pulse" />
              {setupMode === 'create' ? 'Crear Nuestro Rincón' : 'Conectarse & Unirse'}
            </button>
          </form>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white p-8 rounded-3xl border-2 border-rose-500 shadow-2xl max-w-sm w-full relative outline outline-offset-4 outline-rose-100"
          id="login-card"
        >
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-4 py-1 rounded-full text-xs font-serif uppercase tracking-widest font-semibold flex items-center gap-1.5 shadow-md">
            <Heart className="w-3.5 h-3.5 fill-white" /> Seguro & Cifrado
          </div>

          <div className="flex flex-col items-center mb-6 mt-2">
            <div className="bg-rose-50 p-4 rounded-full mb-2 flex items-center justify-center relative">
              <Heart className="w-8 h-8 text-rose-500 animate-pulse fill-rose-500/20" />
              <Lock className="w-4 h-4 text-stone-700 absolute bg-white p-0.5 rounded-full border border-stone-100 -bottom-0.5 -right-0.5" />
            </div>

            <h1 className="text-3xl font-serif font-extrabold text-stone-950 text-center tracking-tight leading-none">
              Rincón <span className="text-rose-600">Secreto</span>
            </h1>
            <p className="font-romantic text-4xl text-rose-500 mt-2 text-center select-none">
              Contigo todo es más bonito
            </p>
            <p className="text-stone-500 text-xs text-center mt-2 font-medium">
              Ingresa la Clave de Amor para descifrar vuestros recuerdos.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Introduce la clave de amor..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-rose-50/10 text-stone-900 text-sm transition-all placeholder:text-stone-400 text-center font-medium font-mono"
                  autoFocus
                  required
                />
                <Lock className="w-4 h-4 text-rose-400 absolute left-3 top-3.5" />
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-600 bg-rose-50/80 p-3 rounded-xl border border-rose-200 text-center font-medium animate-pulse">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-serif font-bold py-3 px-4 rounded-xl shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              Descifrar Recuerdos
            </button>
          </form>
        </motion.div>
      )}

      <footer className="mt-8 text-center max-w-xs">
        <p className="text-[10px] font-mono text-stone-400 leading-normal flex items-center justify-center gap-1.5">
          <Sparkles className="w-3 h-3 text-amber-400" /> Cifrado de Extremo a Extremo Local
        </p>
        <p className="text-[10px] text-stone-400 mt-1 leading-normal">
          Vuestros datos están encriptados con AES-256 en vuestro propio navegador. Nadie más puede verlos.
        </p>
      </footer>
    </div>
  );
}
