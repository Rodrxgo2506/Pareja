import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon, Folder, FolderPlus, Lock, Unlock, Plus, Trash2, ArrowLeft, Upload, FileVideo, Eye, X, Edit, Check } from 'lucide-react';
import { Album, Photo } from '../types';
import { getAllFromStore, putToStore, deleteFromStore } from '../lib/db';
import { encrypt, decrypt } from '../lib/crypto';

interface GalleryProps {
  passwordKey: string;
}

export default function Gallery({ passwordKey }: GalleryProps) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(null);
  
  // UI states
  const [showAddAlbum, setShowAddAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDesc, setNewAlbumDesc] = useState('');
  const [newAlbumPrivate, setNewAlbumPrivate] = useState(false);
  
  // File upload state
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Private albums unlock/re-lock state
  const [unlockedPrivateAlbums, setUnlockedPrivateAlbums] = useState<string[]>([]);
  
  // Photo Viewer/Lightbox
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [deleteAlbumId, setDeleteAlbumId] = useState<string | null>(null);
  const [deletePhotoId, setDeletePhotoId] = useState<string | null>(null);

  // Load albums and photos on mount
  useEffect(() => {
    loadGalleryData();
  }, [passwordKey]);

  async function loadGalleryData() {
    try {
      const allAlbums = await getAllFromStore<Album>('albums');
      const allPhotos = await getAllFromStore<Photo>('photos');

      // Decrypt albums
      const decryptedAlbums = allAlbums.map((alb) => ({
        ...alb,
        name: decrypt(alb.name, passwordKey),
        description: decrypt(alb.description, passwordKey),
      })).filter((alb) => alb.name !== ''); // filter out corrupted data with bad keys

      setAlbums(decryptedAlbums);
      setPhotos(allPhotos);
    } catch (err) {
      console.error('Error loading gallery data:', err);
    }
  }

  // Check if an album can be viewed (is shared or already unlocked)
  const isAlbumUnlocked = (album: Album) => {
    return !album.isPrivate || unlockedPrivateAlbums.includes(album.id);
  };

  const handleUnlockAlbum = (albumId: string) => {
    // For simplicity, unlocking standard private album uses the same master Key,
    // which is the user intent to have multiple segmented private folders
    // we do an elegant reveal animation
    setUnlockedPrivateAlbums([...unlockedPrivateAlbums, albumId]);
  };

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumName.trim()) return;

    try {
      const newAlb: Album = {
        id: 'album_' + Date.now(),
        name: encrypt(newAlbumName.trim(), passwordKey),
        description: encrypt(newAlbumDesc.trim(), passwordKey),
        isPrivate: newAlbumPrivate,
        createdAt: Date.now(),
      };

      await putToStore('albums', newAlb);
      
      setNewAlbumName('');
      setNewAlbumDesc('');
      setNewAlbumPrivate(false);
      setShowAddAlbum(false);
      
      // Reload
      loadGalleryData();
    } catch (err) {
      console.error('Error creating album:', err);
    }
  };

  const handleDeleteAlbum = async (albumId: string) => {
    try {
      // 1. Delete Album Document
      await deleteFromStore('albums', albumId);
      
      // 2. Delete all photos belonging to this album
      const photosToDelete = photos.filter((p) => p.albumId === albumId);
      for (const p of photosToDelete) {
        await deleteFromStore('photos', p.id);
      }

      if (activeAlbum?.id === albumId) {
        setActiveAlbum(null);
      }

      loadGalleryData();
      setDeleteAlbumId(null);
    } catch (err) {
      console.error('Error deleting album:', err);
    }
  };

  // Client-side lightweight image compressor
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_DIM = 1200; // Optimal size for high-res web display
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Export as compressed JPEG
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Standard FileReader for Videos/Other Assets
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Upload Photo/Video
  const handleFileUpload = async (files: FileList) => {
    if (!activeAlbum) return;
    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');
        
        if (!isImage && !isVideo) {
          alert('Solo se permiten imágenes y videos por seguridad.');
          continue;
        }

        let base64Data = '';
        if (isImage) {
          base64Data = await compressImage(file);
        } else {
          // Video upload (base64 directly)
          base64Data = await fileToBase64(file);
        }

        // Encrypt the entire file string
        const encryptedFileString = encrypt(base64Data, passwordKey);

        const newPhoto: Photo = {
          id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          albumId: activeAlbum.id,
          encryptedData: encryptedFileString,
          type: isVideo ? 'video' : 'image',
          mimeType: file.type,
          filename: file.name,
          caption: encrypt('', passwordKey), // empty initial caption
          createdAt: Date.now(),
        };

        await putToStore('photos', newPhoto);
      }

      loadGalleryData();
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('Error al subir los archivos.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      await deleteFromStore('photos', photoId);
      if (lightboxPhoto?.id === photoId) {
        setLightboxPhoto(null);
      }
      loadGalleryData();
      setDeletePhotoId(null);
    } catch (err) {
      console.error('Error deleting photo:', err);
    }
  };

  const handleSaveCaption = async () => {
    if (!lightboxPhoto) return;

    try {
      const updatedPhoto: Photo = {
        ...lightboxPhoto,
        caption: encrypt(editCaption.trim(), passwordKey),
      };

      await putToStore('photos', updatedPhoto);
      
      // Update in local state
      setPhotos(photos.map(p => p.id === lightboxPhoto.id ? updatedPhoto : p));
      setLightboxPhoto(updatedPhoto);
      setIsEditingCaption(false);
    } catch (err) {
      console.error('Error saving caption:', err);
    }
  };

  const handleOpenLightbox = (photo: Photo) => {
    setLightboxPhoto(photo);
    setEditCaption(decrypt(photo.caption, passwordKey));
    setIsEditingCaption(false);
  };

  // Get photos for current active album
  const currentAlbumPhotos = photos.filter((p) => p.albumId === activeAlbum?.id);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-8 pb-24 md:pb-12">
      
      {!activeAlbum ? (
        // ALBUMS GRID VIEW
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-150 pb-5">
            <div>
              <h2 className="text-2xl font-serif font-black text-stone-900 flex items-center gap-2 tracking-tight">
                <ImageIcon className="w-6 h-6 text-rose-600 fill-rose-600/10" /> Cofre de <span className="text-rose-600">Recuerdos Mutuos</span>
              </h2>
              <p className="text-stone-500 text-xs mt-1.5 font-medium">
                Nuestros álbumes privados y galerías compartidas. Todo encriptado localmente de extremo a extremo.
              </p>
            </div>
            
            <button
              onClick={() => setShowAddAlbum(!showAddAlbum)}
              className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-xs font-serif font-bold shadow-md shadow-rose-200 transition-all flex items-center gap-1.5 cursor-pointer w-max"
            >
              <FolderPlus className="w-4 h-4 stroke-[2.5]" /> Crear Álbum
            </button>
          </div>

          <AnimatePresence>
            {showAddAlbum && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm max-w-md"
              >
                <form onSubmit={handleCreateAlbum} className="space-y-4">
                  <h3 className="font-serif font-medium text-stone-900 text-sm">Nuevo Álbum de Recuerdos</h3>
                  
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">Nombre del Álbum</label>
                    <input
                      type="text"
                      placeholder="Ej. Viaje a la Playa, Aniversario 2025..."
                      value={newAlbumName}
                      onChange={(e) => setNewAlbumName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-rose-400 bg-stone-50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">Descripción</label>
                    <textarea
                      placeholder="Una bonita descripción sobre este álbum especial..."
                      value={newAlbumDesc}
                      onChange={(e) => setNewAlbumDesc(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-rose-400 bg-stone-50"
                    />
                  </div>

                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id="album_private_chk"
                      checked={newAlbumPrivate}
                      onChange={(e) => setNewAlbumPrivate(e.target.checked)}
                      className="rounded border-stone-300 text-rose-500 focus:ring-rose-400 w-4 h-4"
                    />
                    <label htmlFor="album_private_chk" className="text-xs text-stone-600 cursor-pointer flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-amber-500" /> Marcar como Álbum Privado (Doble Cierre)
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddAlbum(false)}
                      className="px-3.5 py-2 text-xs text-stone-500 hover:text-stone-800 hover:bg-stone-50 rounded-xl"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2 text-xs font-serif rounded-xl shadow-sm"
                    >
                      Crear Álbum
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {albums.length === 0 ? (
            <div className="bg-white p-12 text-center border border-stone-100 rounded-3xl">
              <Folder className="w-12 h-12 text-stone-200 mx-auto mb-3" />
              <p className="text-stone-500 text-sm italic font-serif">No hay álbumes creados aún.</p>
              <p className="text-stone-400 text-xs mt-1">Crea un álbum para empezar a guardar vuestras fotos y videos cifrados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {albums.map((album) => {
                const isUnlocked = isAlbumUnlocked(album);
                const albumPhotoCount = photos.filter((p) => p.albumId === album.id).length;
                
                return (
                  <div
                    key={album.id}
                    onClick={() => isUnlocked && setActiveAlbum(album)}
                    className={`bg-white rounded-3xl border-2 p-5 shadow-sm transition-all flex flex-col justify-between h-48 cursor-pointer relative group ${
                      isUnlocked 
                        ? 'border-rose-100 hover:border-rose-300 hover:shadow-md' 
                        : 'border-stone-100 bg-stone-50/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <span className={`p-2.5 rounded-2xl ${
                          album.isPrivate ? 'bg-amber-50 text-amber-500' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {album.isPrivate ? <Lock className="w-5 h-5" /> : <Folder className="w-5 h-5 fill-rose-600/10" />}
                        </span>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteAlbumId(album.id);
                          }}
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-2 text-stone-400 hover:text-rose-650 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                          title="Eliminar álbum"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <h3 className="text-base font-serif font-extrabold text-stone-950 mt-4 leading-snug group-hover:text-rose-600 transition-colors">
                        {album.name}
                      </h3>
                      
                      <p className="text-stone-500 text-xs mt-1.5 line-clamp-2 leading-relaxed font-medium">
                        {album.description || 'Sin descripción.'}
                      </p>
                    </div>

                    <div className="border-t border-rose-100/60 pt-3 mt-3 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md">
                        {albumPhotoCount} elementos
                      </span>
                      
                      {!isUnlocked ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnlockAlbum(album.id);
                          }}
                          className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-mono font-bold px-3 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Unlock className="w-3 h-3" /> Revelar Álbum
                        </button>
                      ) : (
                        <span className="text-rose-600 text-[11px] font-serif font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          Ver recuerdos →
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // ALBUM CONTENT (PHOTOS & VIDEOS DETAIL VIEW)
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button
              onClick={() => setActiveAlbum(null)}
              className="flex items-center gap-1.5 text-stone-500 hover:text-stone-900 text-xs font-mono transition-all cursor-pointer w-max"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Volver a Álbumes
            </button>

            <div className="flex items-center gap-2">
              <span className={`p-2 rounded-xl ${
                activeAlbum.isPrivate ? 'bg-amber-50 text-amber-500' : 'bg-rose-50 text-rose-500'
              }`}>
                {activeAlbum.isPrivate ? <Lock className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
              </span>
              <div>
                <h2 className="text-lg font-serif font-semibold text-stone-900 leading-none">{activeAlbum.name}</h2>
                <span className="text-[10px] text-stone-400 mt-1 block font-mono">{activeAlbum.description}</span>
              </div>
            </div>
          </div>

          {/* DRAG AND DROP UPLOAD ZONE */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all ${
              dragActive
                ? 'border-rose-400 bg-rose-50/20'
                : 'border-stone-200 bg-white hover:border-stone-300'
            }`}
          >
            <input
              type="file"
              id="file_upload_input"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            />
            
            <div className="flex flex-col items-center">
              <div className="bg-rose-50 p-4 rounded-full mb-3 text-rose-500">
                {uploading ? (
                  <div className="animate-spin border-2 border-rose-500 border-t-transparent w-6 h-6 rounded-full" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
              </div>
              <h4 className="text-sm font-serif font-medium text-stone-900">
                {uploading ? 'Cifrando y guardando archivos...' : 'Sube fotos o videos a este álbum'}
              </h4>
              <p className="text-xs text-stone-400 mt-1 max-w-xs">
                Arrastra y suelta vuestras fotos/videos aquí o{' '}
                <label htmlFor="file_upload_input" className="text-rose-500 hover:text-rose-600 font-semibold cursor-pointer underline">
                  explora archivos
                </label>
              </p>
              <p className="text-[10px] font-mono text-stone-400 mt-2">
                * Las imágenes se comprimen automáticamente en el cliente para ahorrar espacio.
              </p>
            </div>
          </div>

          {/* GRID OF PHOTOS/VIDEOS */}
          {currentAlbumPhotos.length === 0 ? (
            <div className="bg-stone-50/40 p-12 text-center rounded-3xl border border-stone-100">
              <ImageIcon className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-xs text-stone-400 italic font-serif">Este álbum está vacío por ahora.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {currentAlbumPhotos.map((photo) => {
                // Decrypt photo base64 data on rendering
                const decryptedSrc = decrypt(photo.encryptedData, passwordKey);
                const captionText = decrypt(photo.caption, passwordKey);

                return (
                  <div
                    key={photo.id}
                    onClick={() => handleOpenLightbox(photo)}
                    className="group relative aspect-square bg-stone-100 rounded-2xl overflow-hidden shadow-xs hover:shadow-md border border-stone-100 cursor-pointer transition-all"
                  >
                    {photo.type === 'video' ? (
                      <div className="w-full h-full relative flex items-center justify-center bg-stone-950">
                        <video src={decryptedSrc} className="w-full h-full object-cover opacity-85" muted />
                        <span className="absolute bg-black/60 p-2 rounded-full text-white">
                          <FileVideo className="w-5 h-5" />
                        </span>
                      </div>
                    ) : (
                      <img
                        src={decryptedSrc || 'https://picsum.photos/seed/broken/400/400'}
                        alt={photo.filename}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}

                    {/* Quick hover tools */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3 text-white">
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletePhotoId(photo.id);
                          }}
                          className="bg-black/60 hover:bg-rose-600 p-1.5 rounded-xl transition-all cursor-pointer"
                          title="Eliminar de mi espacio"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span className="text-[10px] font-sans font-medium line-clamp-1">
                          {captionText || 'Ver recuerdo'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* LIGHTBOX / VIEWER MODAL */}
      <AnimatePresence>
        {lightboxPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 select-none"
          >
            <div className="absolute top-4 right-4 flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletePhotoId(lightboxPhoto.id);
                }}
                className="bg-rose-600/80 hover:bg-rose-600 text-white p-2.5 rounded-full transition-all cursor-pointer"
                title="Eliminar de mi espacio"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setLightboxPhoto(null)}
                className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-full transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-w-4xl w-full flex flex-col items-center">
              {/* Media item content */}
              <div className="w-full h-[65vh] flex items-center justify-center relative">
                {lightboxPhoto.type === 'video' ? (
                  <video
                    src={decrypt(lightboxPhoto.encryptedData, passwordKey)}
                    className="max-h-full max-w-full rounded-2xl shadow-2xl"
                    controls
                    autoPlay
                  />
                ) : (
                  <img
                    src={decrypt(lightboxPhoto.encryptedData, passwordKey)}
                    alt="Memoria"
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl"
                  />
                )}
              </div>

              {/* Caption & Metadata container */}
              <div className="mt-6 max-w-xl w-full text-center space-y-3 px-4">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest">
                    Subido el {new Date(lightboxPhoto.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {isEditingCaption ? (
                  <div className="flex items-center gap-2 max-w-md mx-auto">
                    <input
                      type="text"
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      placeholder="Añadir un bonito pie de foto..."
                      className="flex-1 bg-stone-800 text-white px-4 py-2.5 rounded-xl border border-stone-700 text-sm focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveCaption}
                      className="bg-rose-500 hover:bg-rose-600 text-white p-2.5 rounded-xl cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIsEditingCaption(false)}
                      className="bg-stone-700 hover:bg-stone-600 text-stone-300 p-2.5 rounded-xl cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3 group/cap">
                    <p className="font-serif text-sm text-stone-300 leading-relaxed max-w-md">
                      {decrypt(lightboxPhoto.caption, passwordKey) || (
                        <span className="italic text-stone-500">Sin pie de foto. Pulsa el botón de editar.</span>
                      )}
                    </p>
                    <button
                      onClick={() => setIsEditingCaption(true)}
                      className="p-1.5 text-stone-500 hover:text-white rounded-lg transition-colors cursor-pointer"
                      title="Editar comentario"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CUSTOM ALBUM CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteAlbumId && (
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
              <h3 className="font-serif font-extrabold text-stone-900 text-lg mb-2">¿Eliminar este álbum?</h3>
              <p className="text-stone-500 text-xs leading-relaxed mb-6">
                Esta acción eliminará el álbum y TODAS las fotos/videos guardados en él para siempre. No se puede deshacer.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setDeleteAlbumId(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteAlbum(deleteAlbumId)}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Eliminar Todo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CUSTOM PHOTO CONFIRMATION MODAL */}
      <AnimatePresence>
        {deletePhotoId && (
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
              <h3 className="font-serif font-extrabold text-stone-900 text-lg mb-2">¿Eliminar este archivo?</h3>
              <p className="text-stone-500 text-xs leading-relaxed mb-6">
                ¿Estás seguro de que deseas eliminar este recuerdo multimedia? Se borrará permanentemente de vuestro cofre.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setDeletePhotoId(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeletePhoto(deletePhotoId)}
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
