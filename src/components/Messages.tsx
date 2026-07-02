import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Pin, Heart, Trash2, Plus, FileText, Send, Sparkles, X } from 'lucide-react';
import { RomanticMessage } from '../types';
import { getAllFromStore, putToStore, deleteFromStore } from '../lib/db';
import { encrypt, decrypt } from '../lib/crypto';

interface MessagesProps {
  passwordKey: string;
  partnerAName: string;
}

const NOTE_COLORS = [
  { class: 'bg-rose-50 border-rose-100/85 text-rose-800', name: 'Rosa Romántico' },
  { class: 'bg-amber-50 border-amber-100 text-amber-900', name: 'Amarillo Sol' },
  { class: 'bg-sky-50 border-sky-100 text-sky-800', name: 'Cielo Azul' },
  { class: 'bg-violet-50 border-violet-100 text-violet-800', name: 'Lavanda Dulce' },
];

export default function Messages({ passwordKey, partnerAName }: MessagesProps) {
  const [messages, setMessages] = useState<RomanticMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'sticky' | 'letter'>('sticky');
  const [showCompose, setShowCompose] = useState(false);

  // Form state
  const [msgText, setMsgText] = useState('');
  const [msgAuthor, setMsgAuthor] = useState(partnerAName);
  const [msgColor, setMsgColor] = useState(NOTE_COLORS[0].class);
  const [msgStyle, setMsgStyle] = useState<'sticky' | 'letter'>('sticky');

  // Letter visual detail modal
  const [openLetter, setOpenLetter] = useState<RomanticMessage | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    loadMessages();
  }, [passwordKey]);

  async function loadMessages() {
    try {
      const allMsgs = await getAllFromStore<RomanticMessage>('messages');
      
      // Decrypt messages
      const decrypted = allMsgs.map((m) => ({
        ...m,
        author: decrypt(m.author, passwordKey),
        text: decrypt(m.text, passwordKey),
      })).filter((m) => m.text !== ''); // filter out data that can't be decrypted

      setMessages(decrypted);
    } catch (err) {
      console.error('Error loading romantic messages:', err);
    }
  }

  const handleCompose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgText.trim()) return;

    try {
      const newMsg: RomanticMessage = {
        id: 'msg_' + Date.now(),
        author: encrypt(msgAuthor.trim() || 'Anónimo', passwordKey),
        text: encrypt(msgText.trim(), passwordKey),
        color: msgColor,
        style: msgStyle,
        createdAt: Date.now(),
      };

      await putToStore('messages', newMsg);
      
      // Reset composer
      setMsgText('');
      setMsgAuthor(partnerAName);
      setShowCompose(false);

      // Reload
      loadMessages();
    } catch (err) {
      console.error('Error saving romantic message:', err);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      await deleteFromStore('messages', id);
      loadMessages();
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  // Split messages by visual styles
  const stickyNotes = messages.filter((m) => m.style === 'sticky');
  const loveLetters = messages.filter((m) => m.style === 'letter');

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 space-y-8 pb-24 md:pb-12">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-150 pb-5">
        <div>
          <h2 className="text-2xl font-serif font-black text-stone-900 flex items-center gap-2 tracking-tight">
            <Mail className="w-6 h-6 text-rose-600 fill-rose-600/10" /> Mensajitos y <span className="text-rose-600">Cartas de Amor</span>
          </h2>
          <p className="text-stone-500 text-xs mt-1.5 font-medium">
            Cartas y pósit románticos encriptados de extremo a extremo. Deja un suspiro secreto para alegrar su día.
          </p>
        </div>

        <button
          onClick={() => {
            setMsgStyle(activeTab);
            setShowCompose(!showCompose);
          }}
          className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-xs font-serif font-bold shadow-md shadow-rose-200 transition-all flex items-center gap-1.5 cursor-pointer w-max"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> Dejar Mensaje
        </button>
      </div>

      {/* STYLES SELECTOR TAB */}
      <div className="flex border-b-2 border-rose-50 gap-6">
        <button
          onClick={() => setActiveTab('sticky')}
          className={`py-3 text-xs font-serif font-bold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
            activeTab === 'sticky'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          Muro de Notas Adhesivas ({stickyNotes.length})
        </button>
        <button
          onClick={() => setActiveTab('letter')}
          className={`py-3 text-xs font-serif font-bold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
            activeTab === 'letter'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          Buzón de Cartas Largas ({loveLetters.length})
        </button>
      </div>

      {/* COMPOSE DIALOG */}
      <AnimatePresence>
        {showCompose && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm"
          >
            <form onSubmit={handleCompose} className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-serif font-medium text-stone-900 text-sm">Componer un Mensaje Especial</h3>
                <div className="flex bg-stone-100 p-0.5 rounded-xl gap-0.5">
                  <button
                    type="button"
                    onClick={() => setMsgStyle('sticky')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                      msgStyle === 'sticky' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-400 hover:text-stone-700'
                    }`}
                  >
                    Pósit
                  </button>
                  <button
                    type="button"
                    onClick={() => setMsgStyle('letter')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                      msgStyle === 'letter' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-400 hover:text-stone-700'
                    }`}
                  >
                    Carta
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">Tu Firma</label>
                  <input
                    type="text"
                    placeholder="Tu nombre especial..."
                    value={msgAuthor}
                    onChange={(e) => setMsgAuthor(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:outline-none"
                    required
                  />
                </div>

                {msgStyle === 'sticky' && (
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">Color del Pósit</label>
                    <div className="flex items-center gap-2 mt-1.5">
                      {NOTE_COLORS.map((col) => (
                        <button
                          key={col.class}
                          type="button"
                          onClick={() => setMsgColor(col.class)}
                          className={`w-5 h-5 rounded-full border border-stone-200 transition-all cursor-pointer ${col.class} ${
                            msgColor === col.class ? 'scale-125 ring-1 ring-rose-400 shadow-xs' : ''
                          }`}
                          title={col.name}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">Escribe tu Corazón</label>
                <textarea
                  placeholder={msgStyle === 'sticky' ? "Escribe un recordatorio alegre o un 'te amo'..." : "Querida mía, hoy quiero decirte que..."}
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  rows={msgStyle === 'sticky' ? 3 : 6}
                  className="w-full px-4 py-3 text-xs rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:outline-none focus:ring-1 focus:ring-rose-400 leading-relaxed"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCompose(false)}
                  className="px-3.5 py-2 text-xs text-stone-500 hover:text-stone-800 hover:bg-stone-55 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2 text-xs font-serif rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Colgar Mensaje
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STICKY NOTES DISPLAY TAB */}
      {activeTab === 'sticky' && (
        stickyNotes.length === 0 ? (
          <div className="bg-white p-12 text-center border border-stone-100 rounded-3xl">
            <Pin className="w-12 h-12 text-stone-200 mx-auto mb-3" />
            <p className="text-stone-500 text-sm italic font-serif">Muro limpio de pósit.</p>
            <p className="text-stone-400 text-xs mt-1">Escribe vuestra primera nota para sorprender a tu pareja.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {stickyNotes.map((msg, idx) => {
              // Create slight random rotation for awesome look
              const rotation = ['-rotate-1', 'rotate-1', '-rotate-2', 'rotate-2', 'rotate-0'][idx % 5];
              
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: idx * 0.04 }}
                  className={`p-5 rounded-2xl border flex flex-col justify-between aspect-square shadow-xs hover:shadow-md hover:scale-[1.01] transition-all relative ${msg.color} ${rotation}`}
                >
                  <div className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(msg.id);
                      }}
                      className="p-1 text-stone-400 hover:text-rose-600 bg-white/50 rounded-lg transition-colors cursor-pointer"
                      title="Quitar pósit"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <Pin className="w-4 h-4 text-stone-400 absolute top-2.5 left-1/2 -translate-x-1/2 drop-shadow-xs" />

                  <p className="font-serif text-[12px] leading-relaxed italic mt-3 overflow-y-auto max-h-[75%] pr-1 pt-1 whitespace-pre-wrap">
                    "{msg.text}"
                  </p>

                  <div className="border-t border-stone-900/10 pt-2 mt-2 flex items-center justify-between text-[10px] font-mono opacity-70">
                    <span>De: <strong>{msg.author}</strong></span>
                    <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      )}

      {/* LOVE LETTERS DISPLAY TAB */}
      {activeTab === 'letter' && (
        loveLetters.length === 0 ? (
          <div className="bg-white p-12 text-center border border-stone-100 rounded-3xl">
            <Mail className="w-12 h-12 text-stone-200 mx-auto mb-3" />
            <p className="text-stone-500 text-sm italic font-serif">El buzón de cartas está vacío.</p>
            <p className="text-stone-400 text-xs mt-1">Redacta una carta de amor más larga y sincera.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {loveLetters.map((letter, idx) => (
              <motion.div
                key={letter.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                onClick={() => setOpenLetter(letter)}
                className="bg-stone-50 hover:bg-white rounded-2xl border border-stone-100/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-44 cursor-pointer relative group"
              >
                <div className="absolute top-3 right-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(letter.id);
                    }}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                    title="Eliminar carta"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="p-2 bg-rose-50 rounded-xl text-rose-500">
                    <Mail className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-mono text-stone-400">
                    {new Date(letter.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>

                <div className="my-2 flex-1">
                  <p className="text-stone-500 font-serif italic text-xs line-clamp-2 mt-2 leading-relaxed">
                    "{letter.text}"
                  </p>
                </div>

                <div className="border-t border-stone-100/85 pt-3 mt-3 flex items-center justify-between text-xs">
                  <span className="font-sans text-stone-500">
                    Para ti, de: <strong className="text-stone-900 font-medium">{letter.author}</strong>
                  </span>
                  <span className="text-rose-500 font-serif text-[11px] font-medium group-hover:translate-x-0.5 transition-transform">
                    Abrir carta →
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )
      )}

      {/* FULL LETTER READING MODAL */}
      <AnimatePresence>
        {openLetter && (
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
              className="bg-white rounded-3xl border-2 border-rose-500 shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden relative outline outline-offset-4 outline-rose-150"
            >
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={() => setOpenLetter(null)}
                  className="bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 p-2 rounded-full transition-all cursor-pointer shadow-sm"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Decorative wax seal */}
              <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white p-5 flex items-center gap-2.5 shadow-md">
                <div className="bg-white text-rose-600 p-1.5 rounded-full shadow-inner flex items-center justify-center">
                  <Heart className="w-4 h-4 fill-rose-600" />
                </div>
                <div>
                  <span className="font-serif text-sm font-extrabold uppercase tracking-widest block">Carta de Amor Descifrada</span>
                  <span className="font-romantic text-2xl text-rose-100 block -mt-1 leading-none">Solo para tus ojos</span>
                </div>
              </div>

              {/* Scrollable Letter Sheet */}
              <div className="flex-1 overflow-y-auto p-8 font-serif leading-relaxed text-sm text-stone-800 whitespace-pre-wrap bg-cream/30">
                <div className="flex justify-between items-center text-[10px] font-mono text-rose-500 uppercase tracking-widest font-bold mb-6 border-b border-rose-100 pb-2">
                  <span>Remitente: {openLetter.author}</span>
                  <span>{new Date(openLetter.createdAt).toLocaleDateString()}</span>
                </div>
                
                <p className="italic text-stone-900 leading-loose text-sm sm:text-base pl-4 sm:pl-6 border-l-4 border-rose-500">
                  {openLetter.text}
                </p>

                <div className="mt-8 flex flex-col items-end pr-4">
                  <span className="text-xs text-stone-400 italic">Con todo mi amor,</span>
                  <span className="text-xl font-romantic text-rose-600 mt-2 block">{openLetter.author}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <h3 className="font-serif font-extrabold text-stone-900 text-lg mb-2">¿Eliminar mensaje?</h3>
              <p className="text-stone-500 text-xs leading-relaxed mb-6">
                Esta acción borrará este mensaje de amor para siempre de vuestro rincón secreto y no se podrá recuperar.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteMessage(deleteConfirmId)}
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
