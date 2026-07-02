import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipForward, SkipBack, Music, Plus, Trash2, Heart, ExternalLink, Disc, Sparkles } from 'lucide-react';
import { Song } from '../types';
import { getAllFromStore, putToStore, deleteFromStore } from '../lib/db';
import { encrypt, decrypt } from '../lib/crypto';

interface MusicPlayerProps {
  passwordKey: string;
}

// Royalty free instrumental background romantic loops
const DEFAULT_AUDIO_SOURCES = [
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
];

export default function MusicPlayer({ passwordKey }: MusicPlayerProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  
  // Custom Song Adding
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [songUrl, setSongUrl] = useState('');
  const [note, setNote] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // HTML Audio reference
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadSongs();
    
    // Create audio player instance
    audioRef.current = new Audio();
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [passwordKey]);

  useEffect(() => {
    if (songs.length > 0 && audioRef.current) {
      const currentSong = songs[currentSongIndex];
      // If the song is a custom YouTube/Spotify link, we can't play it natively with HTML5 Audio,
      // so we pause the native player and let them play the Iframe.
      const isEmbed = currentSong.url.includes('youtube.com') || currentSong.url.includes('youtu.be') || currentSong.url.includes('spotify.com') || currentSong.url.includes('embed');
      
      if (!isEmbed) {
        // Map index to our royalty-free audio sources if preloaded, otherwise try song.url
        const src = currentSong.isPreloaded 
          ? DEFAULT_AUDIO_SOURCES[currentSongIndex % DEFAULT_AUDIO_SOURCES.length] 
          : currentSong.url;

        audioRef.current.src = src;
        audioRef.current.load();
        
        if (isPlaying) {
          audioRef.current.play().catch(() => setIsPlaying(false));
        }
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [currentSongIndex, songs]);

  // Handle native audio updates
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      handleNext();
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentSongIndex, songs]);

  async function loadSongs() {
    try {
      const allSongs = await getAllFromStore<Song>('songs');
      
      // Decrypt song custom notes
      const decrypted = allSongs.map((s) => ({
        ...s,
        note: decrypt(s.note, passwordKey),
      })).filter((s) => s.title !== ''); // filter out corrupted keys

      setSongs(decrypted);
    } catch (err) {
      console.error('Error loading songs:', err);
    }
  }

  const handlePlayPause = () => {
    if (!audioRef.current || songs.length === 0) return;
    
    const currentSong = songs[currentSongIndex];
    const isEmbed = currentSong.url.includes('youtube.com') || currentSong.url.includes('youtu.be') || currentSong.url.includes('spotify.com') || currentSong.url.includes('embed');

    if (isEmbed) {
      alert('Esta es una canción integrada por Iframe (YouTube/Spotify). Pulsa "Play" directamente en el video o reproductor interactivo más abajo.');
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error('Playback failed', err);
        alert('Este archivo de audio no se pudo reproducir en el navegador. Intenta añadir enlaces de YouTube o Spotify.');
      });
    }
  };

  const handleNext = () => {
    if (songs.length === 0) return;
    setCurrentSongIndex((prev) => (prev + 1) % songs.length);
    setIsPlaying(false);
    setProgress(0);
  };

  const handlePrev = () => {
    if (songs.length === 0) return;
    setCurrentSongIndex((prev) => (prev - 1 + songs.length) % songs.length);
    setIsPlaying(false);
    setProgress(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const seekTime = (parseFloat(e.target.value) / 100) * audioRef.current.duration;
    audioRef.current.currentTime = seekTime;
    setProgress(parseFloat(e.target.value));
  };

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim() || !songUrl.trim()) return;

    try {
      // Basic URL parser for simple embeds
      let formattedUrl = songUrl.trim();
      
      // Convert standard YouTube link to embed link
      if (formattedUrl.includes('youtube.com/watch?v=')) {
        const videoId = formattedUrl.split('v=')[1]?.split('&')[0];
        if (videoId) formattedUrl = `https://www.youtube.com/embed/${videoId}`;
      } else if (formattedUrl.includes('youtu.be/')) {
        const videoId = formattedUrl.split('youtu.be/')[1]?.split('?')[0];
        if (videoId) formattedUrl = `https://www.youtube.com/embed/${videoId}`;
      } else if (formattedUrl.includes('spotify.com/track/')) {
        const trackId = formattedUrl.split('/track/')[1]?.split('?')[0];
        if (trackId) formattedUrl = `https://open.spotify.com/embed/track/${trackId}`;
      }

      const newSong: Song = {
        id: 'song_' + Date.now(),
        title: title.trim(),
        artist: artist.trim(),
        url: formattedUrl,
        note: encrypt(note.trim(), passwordKey),
        createdAt: Date.now(),
      };

      await putToStore('songs', newSong);
      
      // Reset form
      setTitle('');
      setArtist('');
      setSongUrl('');
      setNote('');
      setShowAddForm(false);

      // Reload
      loadSongs();
    } catch (err) {
      console.error('Error adding song:', err);
    }
  };

  const handleDeleteSong = async (id: string) => {
    try {
      await deleteFromStore('songs', id);
      
      // Safely clamp index
      if (currentSongIndex >= songs.length - 1 && currentSongIndex > 0) {
        setCurrentSongIndex(currentSongIndex - 1);
      }
      setIsPlaying(false);
      setProgress(0);

      loadSongs();
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Error deleting song:', err);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const activeSong = songs[currentSongIndex];
  const isEmbed = activeSong?.url.includes('youtube.com') || activeSong?.url.includes('youtu.be') || activeSong?.url.includes('spotify.com') || activeSong?.url.includes('embed');

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 space-y-8 pb-24 md:pb-12">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-150 pb-5">
        <div>
          <h2 className="text-2xl font-serif font-black text-stone-900 flex items-center gap-2 tracking-tight">
            <Music className="w-6 h-6 text-rose-600 fill-rose-600/10" /> Nuestras <span className="text-rose-600">Canciones Favoritas</span>
          </h2>
          <p className="text-stone-500 text-xs mt-1.5 font-medium">
            La banda sonora de nuestra historia de amor con reproductor integrado. Cada tema tiene su propia dedicatoria íntima.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-xs font-serif font-bold shadow-md shadow-rose-200 transition-all flex items-center gap-1.5 cursor-pointer w-max"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> Añadir Canción
        </button>
      </div>

      {/* ADD SONG FORM */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm"
          >
            <form onSubmit={handleAddSong} className="space-y-4">
              <h3 className="font-serif font-medium text-stone-900 text-sm">Añadir una Canción Especial</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">Título de la Canción</label>
                  <input
                    type="text"
                    placeholder="Ej. Perfect, All of Me, Yellow..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-1 focus:ring-rose-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">Artista</label>
                  <input
                    type="text"
                    placeholder="Ej. Ed Sheeran, Coldplay..."
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-1 focus:ring-rose-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">Enlace de Audio, YouTube o Spotify</label>
                <input
                  type="url"
                  placeholder="Enlace de YouTube (o compartir) o enlace de canción de Spotify..."
                  value={songUrl}
                  onChange={(e) => setSongUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-1 focus:ring-rose-400"
                  required
                />
                <p className="text-[10px] text-stone-400 mt-1">
                  * Si pegas un enlace de YouTube o de Spotify, cargaremos un reproductor interactivo oficial automáticamente.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">Nota Romántica (¿Por qué esta canción?)</label>
                <textarea
                  placeholder="Escribe por qué este tema es parte de vuestra banda sonora de amor..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-1 focus:ring-rose-400"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
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
                  Guardar Canción
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CORE PLAYER DISPLAY */}
      {songs.length === 0 ? (
        <div className="bg-white p-12 text-center border border-stone-100 rounded-3xl">
          <Music className="w-12 h-12 text-stone-200 mx-auto mb-3" />
          <p className="text-stone-500 text-sm italic font-serif">Aún no hay canciones guardadas.</p>
          <p className="text-stone-400 text-xs mt-1">Crea la banda sonora de vuestra relación añadiendo vuestros temas favoritos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
          
          {/* PLAYER VINYL VISUALIZER */}
          <div className="md:col-span-2 bg-white rounded-3xl border-2 border-rose-100 shadow-md p-6 flex flex-col items-center justify-between min-h-[350px]">
            <span className="text-[10px] font-mono text-rose-500 uppercase tracking-widest block text-center mb-2 font-bold">
              Tocadiscos de Amor
            </span>

            {/* Rotating Vinyl disk */}
            <div className="relative w-52 h-52 flex items-center justify-center my-4 select-none">
              
              {/* Arm/needle of vinyl record player */}
              <div className={`absolute top-0 right-2 w-20 h-28 -mr-2 origin-top-right transition-transform duration-700 z-10 pointer-events-none ${
                isPlaying ? 'rotate-[25deg]' : 'rotate-0'
              }`}>
                <div className="w-1.5 h-16 bg-stone-400 rounded-full ml-auto mr-5 relative">
                  <div className="absolute bottom-0 right-0 w-3 h-5 bg-rose-600 rounded-xs transform rotate-[15deg] origin-top"></div>
                </div>
              </div>

              {/* Vinyl disk body */}
              <div className={`w-44 h-44 bg-stone-950 rounded-full shadow-2xl flex items-center justify-center border-4 border-rose-100 relative ${
                isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''
              }`}>
                {/* Vinyl Grooves */}
                <div className="absolute inset-2 border border-stone-850/60 rounded-full"></div>
                <div className="absolute inset-6 border border-stone-850/40 rounded-full"></div>
                <div className="absolute inset-10 border border-stone-850/40 rounded-full"></div>
                <div className="absolute inset-14 border border-stone-850/60 rounded-full"></div>

                {/* Cover Sticker in center */}
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center border-2 border-stone-950/20 relative z-0">
                  <Heart className={`w-5 h-5 text-rose-600 fill-rose-600/20 ${isPlaying ? 'animate-pulse' : ''}`} />
                  <div className="absolute w-2 h-2 bg-white rounded-full border border-stone-950"></div>
                </div>
              </div>
            </div>

            {/* Song description under the disc */}
            <div className="text-center w-full px-2 mt-2">
              <h3 className="font-serif font-extrabold text-stone-900 text-base line-clamp-1">{activeSong.title}</h3>
              <p className="text-rose-600 text-xs mt-0.5 font-mono font-bold line-clamp-1">{activeSong.artist}</p>
            </div>
          </div>

          {/* PLAYER PLAYBACK DETAILS / DEDICATION & SONG LIST */}
          <div className="md:col-span-3 space-y-6">
            
            {/* Playback bar & Dedication Note */}
            <div className="bg-white rounded-3xl border-2 border-rose-100 p-6 shadow-md space-y-5">
              
              {/* Decrypted Dedication message */}
              <div className="bg-rose-50/45 p-4 rounded-2xl border border-rose-100 space-y-1.5 relative">
                <span className="text-[10px] font-mono uppercase tracking-wider text-rose-600 font-extrabold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 fill-rose-600/10" /> Dedicatoria especial
                </span>
                <p className="font-serif italic text-xs leading-relaxed text-stone-800 pl-1">
                  "{activeSong.note || 'Sin nota de dedicatoria.'}"
                </p>
              </div>

              {/* Native player slidebar controls if not an embed */}
              {!isEmbed ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-mono text-stone-400">
                    <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={handleSeek}
                    className="w-full accent-rose-500 h-1 bg-stone-100 rounded-lg cursor-pointer transition-all"
                  />

                  {/* Playback Controls button container */}
                  <div className="flex items-center justify-center gap-5 pt-1.5">
                    <button
                      onClick={handlePrev}
                      className="p-2 rounded-xl text-stone-400 hover:text-stone-800 transition-colors cursor-pointer"
                    >
                      <SkipBack className="w-5 h-5 fill-current" />
                    </button>

                    <button
                      onClick={handlePlayPause}
                      className="p-4 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md shadow-rose-100 transition-all scale-105 active:scale-95 cursor-pointer"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white pl-0.5" />}
                    </button>

                    <button
                      onClick={handleNext}
                      className="p-2 rounded-xl text-stone-400 hover:text-stone-800 transition-colors cursor-pointer"
                    >
                      <SkipForward className="w-5 h-5 fill-current" />
                    </button>
                  </div>
                </div>
              ) : (
                // IF EMBED LINK (SPOTIFY/YOUTUBE), WE RENDER INTERACTIVE INTERFACE WITH CUSTOM ICON
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-400 font-medium font-sans">Reproductor Integrado Externo</span>
                    <a
                      href={activeSong.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-rose-500 hover:text-rose-600 text-[10px] font-mono flex items-center gap-1 underline"
                    >
                      Abrir enlace original <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="w-full aspect-video rounded-2xl overflow-hidden border border-stone-100 shadow-xs bg-stone-950">
                    <iframe
                      src={activeSong.url}
                      title={activeSong.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; encrypted-media; fullscreen"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
              )}
            </div>

            {/* SONG SELECTION LIST */}
            <div className="bg-white rounded-3xl border-2 border-rose-100 p-6 shadow-md">
              <h4 className="font-serif font-extrabold text-stone-900 text-sm mb-4 border-b border-rose-50 pb-2 flex items-center gap-1.5">
                <Music className="w-4 h-4 text-rose-500" /> Todas nuestras canciones
              </h4>
              
              <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                {songs.map((song, index) => {
                  const isActive = index === currentSongIndex;
                  return (
                    <div
                      key={song.id}
                      onClick={() => {
                        setCurrentSongIndex(index);
                        setIsPlaying(false);
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isActive
                          ? 'bg-gradient-to-r from-rose-50 to-rose-100/45 border-rose-200 text-rose-900 shadow-xs'
                          : 'bg-stone-50/60 border-transparent hover:border-stone-200/50 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`p-2 rounded-xl ${isActive ? 'bg-rose-100 text-rose-600' : 'bg-stone-100 text-stone-400'}`}>
                          <Disc className={`w-4 h-4 ${isActive && isPlaying ? 'animate-spin' : ''}`} />
                        </span>
                        <div>
                          <span className="font-serif font-extrabold text-xs text-stone-900 block">{song.title}</span>
                          <span className="text-[10px] font-mono text-rose-500 font-bold block mt-0.5">{song.artist}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {song.isPreloaded && (
                          <span className="text-[9px] font-mono bg-rose-50 text-rose-600 border border-rose-100 px-1.5 py-0.5 rounded-md uppercase tracking-wider font-bold">
                            Pre-cargada
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(song.id);
                          }}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-white rounded-xl transition-all cursor-pointer"
                          title="Eliminar de la lista"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
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
              <h3 className="font-serif font-extrabold text-stone-900 text-lg mb-2">¿Eliminar canción?</h3>
              <p className="text-stone-500 text-xs leading-relaxed mb-6">
                Esta acción quitará la canción de vuestra lista de canciones favoritas. Podrás volver a añadirla cuando quieras.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteSong(deleteConfirmId)}
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
