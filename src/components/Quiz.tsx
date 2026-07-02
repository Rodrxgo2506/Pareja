import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, HelpCircle, Gift, Plus, Award, CheckCircle2, AlertCircle, RefreshCw, Sparkles, Trash2, Heart, X } from 'lucide-react';
import { QuizQuestion, Coupon } from '../types';
import { getAllFromStore, putToStore } from '../lib/db';

interface QuizProps {
  passwordKey: string;
}

// Pre-defined default romantic trivia questions
const DEFAULT_QUESTIONS: QuizQuestion[] = [
  {
    id: 'def_1',
    question: '¿Quién dijo "Te amo" primero en nuestra relación?',
    options: ['Tú, sin dudarlo', 'Yo, con mucha emoción', 'Lo dijimos a la vez', 'Fue por un mensaje de texto'],
    correctAnswerIndex: 0,
    hint: 'Piensa en quién es el más lanzado de los dos...',
  },
  {
    id: 'def_2',
    question: '¿Dónde fue nuestro primer beso oficial?',
    options: ['En el coche / transporte', 'Bajo la lluvia', 'En una hermosa cita', 'En la puerta de casa'],
    correctAnswerIndex: 2,
    hint: 'Estábamos un poco nerviosos pero fue sumamente especial.',
  },
  {
    id: 'def_3',
    question: '¿Cuál es la actividad favorita de vuestro fin de semana ideal?',
    options: ['Ir a comer a un sitio nuevo', 'Tarde de películas y mimos en el sofá', 'Viajar o hacer senderismo', 'Salir de fiesta con amigos'],
    correctAnswerIndex: 1,
    hint: 'No hay nada como estar abrazados sin hacer nada más.',
  },
  {
    id: 'def_4',
    question: '¿Qué cenamos en nuestra primera cena romántica?',
    options: ['Pizza', 'Pasta italiana deliciosa', 'Sushi / Comida asiática', 'Hamburguesas'],
    correctAnswerIndex: 1,
    hint: 'Un clásico italiano siempre conquista corazones.',
  },
];

export default function Quiz({ passwordKey }: QuizProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [lovePoints, setLovePoints] = useState<number>(0);

  // Quiz active states
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);
  const [quizScore, setQuizScore] = useState<number>(0);

  // Custom question add state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [opt0, setOpt0] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [opt3, setOpt3] = useState('');
  const [correctIdx, setCorrectIdx] = useState(0);
  const [newHint, setNewHint] = useState('');

  // Confetti Canvas setup
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiIntervalRef = useRef<any>(null);

  useEffect(() => {
    loadQuizAndCoupons();
  }, [passwordKey]);

  async function loadQuizAndCoupons() {
    try {
      // 1. Load Custom Questions from DB config
      const configs = await getAllFromStore<any>('config');
      const customQuestionsConfig = configs.find((c) => c.id === 'custom_questions');
      const customList: QuizQuestion[] = (customQuestionsConfig && customQuestionsConfig.list) || [];
      
      // Combine default and custom questions
      setQuestions([...DEFAULT_QUESTIONS, ...customList]);

      // 2. Load Coupons
      const loadedCoupons = await getAllFromStore<Coupon>('coupons');
      setCoupons(loadedCoupons);

      // 3. Load Love Points from DB config
      const pointsConfig = configs.find((c) => c.id === 'love_points');
      setLovePoints(pointsConfig ? pointsConfig.amount : 0);
    } catch (err) {
      console.error('Error loading quiz/coupons data:', err);
    }
  }

  // Confetti Physics Trigger inside Canvas (zero dependencies, 100% offline)
  const triggerConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#f43f5e', '#fbbf24', '#60a5fa', '#a78bfa', '#f472b6'];
    const particles: any[] = [];

    // Spawn 80 particles
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height + 50 + Math.random() * 100,
        vx: (Math.random() - 0.5) * 12,
        vy: -15 - Math.random() * 15,
        radius: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 5,
      });
    }

    if (confettiIntervalRef.current) clearInterval(confettiIntervalRef.current);

    confettiIntervalRef.current = setInterval(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let allDone = true;
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        
        // Draw heart or circle confetti
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (p.y < canvas.height + 100) {
          allDone = false;
        }
      });

      if (allDone) {
        clearInterval(confettiIntervalRef.current);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }, 20);
  };

  const handleSelectOption = (index: number) => {
    if (isAnswered) return;
    setSelectedOptionIdx(index);
  };

  const handleVerifyAnswer = async () => {
    if (selectedOptionIdx === null || isAnswered || questions.length === 0) return;

    setIsAnswered(true);
    const activeQ = questions[currentQuestionIdx];
    const isCorrect = selectedOptionIdx === activeQ.correctAnswerIndex;

    if (isCorrect) {
      triggerConfetti();
      setQuizScore((prev) => prev + 1);
      
      // Earn 25 Love Points per correct answer!
      const newPoints = lovePoints + 25;
      setLovePoints(newPoints);
      
      // Save updated points in DB
      await putToStore('config', { id: 'love_points', amount: newPoints });
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
      setSelectedOptionIdx(null);
      setIsAnswered(false);
    } else {
      setQuizFinished(true);
    }
  };

  const handleResetQuiz = () => {
    setCurrentQuestionIdx(0);
    setSelectedOptionIdx(null);
    setIsAnswered(false);
    setQuizFinished(false);
    setQuizScore(0);
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !opt0.trim() || !opt1.trim() || !opt2.trim() || !opt3.trim()) return;

    try {
      const customQ: QuizQuestion = {
        id: 'cust_q_' + Date.now(),
        question: newQuestion.trim(),
        options: [opt0.trim(), opt1.trim(), opt2.trim(), opt3.trim()],
        correctAnswerIndex: correctIdx,
        hint: newHint.trim() || undefined,
        isCustom: true,
      };

      // Load existing custom questions from DB config
      const configs = await getAllFromStore<any>('config');
      const customConfig = configs.find((c) => c.id === 'custom_questions');
      const customList = (customConfig && customConfig.list) || [];
      const updatedList = [...customList, customQ];

      // Save list
      await putToStore('config', {
        id: 'custom_questions',
        list: updatedList,
      });

      // Clear fields
      setNewQuestion('');
      setOpt0('');
      setOpt1('');
      setOpt2('');
      setOpt3('');
      setCorrectIdx(0);
      setNewHint('');
      setShowAddForm(false);

      // Reload
      loadQuizAndCoupons();
    } catch (err) {
      console.error('Error adding custom question:', err);
    }
  };

  const handleUnlockCoupon = async (coupon: Coupon) => {
    if (lovePoints < coupon.pointsRequired) {
      alert('¡Vaya! Necesitas más Puntos de Amor para desbloquear este cupón. ¡Completa más preguntas de la trivia!');
      return;
    }

    try {
      const updatedCoupon: Coupon = {
        ...coupon,
        unlocked: true,
        claimedAt: Date.now(),
      };

      // Deduct points
      const remainingPoints = lovePoints - coupon.pointsRequired;
      setLovePoints(remainingPoints);

      // Save to IndexedDB
      await putToStore('coupons', updatedCoupon);
      await putToStore('config', { id: 'love_points', amount: remainingPoints });

      triggerConfetti();
      
      // Reload
      loadQuizAndCoupons();
    } catch (err) {
      console.error('Error unlocking coupon:', err);
    }
  };

  const activeQuestion = questions[currentQuestionIdx];

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-8 pb-24 md:pb-12">
      
      {/* Hidden Canvas for beautiful Confetti animations */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-50 pointer-events-none w-screen h-screen"
      />

      {/* DASHBOARD HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-150 pb-5">
        <div>
          <h2 className="text-2xl font-serif font-black text-stone-900 flex items-center gap-2 tracking-tight">
            <Trophy className="w-6 h-6 text-rose-600 fill-rose-600/10 animate-bounce" /> Trivia Romántica & <span className="text-rose-600">Premios</span>
          </h2>
          <p className="text-stone-500 text-xs mt-1.5 font-medium">
            Poned a prueba vuestros recuerdos, responded la trivia de vuestra relación y canjead "Puntos de Amor" por tiernos cupones de premio físicos.
          </p>
        </div>

        {/* Love Points Banner - High contrast White and Red! */}
        <div className="bg-rose-600 text-white border-2 border-rose-500 px-4 py-2.5 rounded-2xl flex items-center gap-2 w-max shadow-lg shadow-rose-200 animate-pulse">
          <Heart className="w-4.5 h-4.5 fill-white text-white" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider">
            {lovePoints} Puntos de Amor
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
        
        {/* LEFT COLUMN: INTERACTIVE TRIVIA GAME */}
        <div className="md:col-span-3 space-y-6">
          
          <div className="bg-white rounded-3xl border-2 border-rose-100 p-6 shadow-md space-y-6">
            <div className="flex items-center justify-between border-b border-rose-50 pb-3">
              <h3 className="font-serif font-extrabold text-stone-900 text-base flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-rose-500" /> Trivia de Recuerdos
              </h3>
              
              {questions.length > 0 && !quizFinished && (
                <span className="text-[10px] font-mono bg-rose-55 text-rose-600 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                  Pregunta {currentQuestionIdx + 1} de {questions.length}
                </span>
              )}
            </div>

            {questions.length === 0 ? (
              <p className="text-xs text-stone-400 italic text-center py-8">Cargando preguntas de trivia...</p>
            ) : quizFinished ? (
              // QUIZ FINISHED PANEL
              <div className="text-center py-6 space-y-4">
                <div className="bg-rose-50 p-4 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-rose-500">
                  <Award className="w-8 h-8" />
                </div>
                <h4 className="font-serif font-medium text-stone-900 text-base">¡Trivia Completada!</h4>
                <p className="text-stone-500 text-xs max-w-xs mx-auto leading-relaxed">
                  Has respondido correctamente <strong className="text-rose-500">{quizScore}</strong> de vuestras {questions.length} preguntas de recuerdos. ¡Gran trabajo!
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    onClick={handleResetQuiz}
                    className="bg-stone-100 hover:bg-stone-200 text-stone-600 px-4 py-2 rounded-xl text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Jugar de Nuevo
                  </button>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2 rounded-xl text-xs font-serif shadow-sm transition-all cursor-pointer"
                  >
                    Crear Nueva Pregunta
                  </button>
                </div>
              </div>
            ) : (
              // ACTIVE QUESTION VIEW
              <div className="space-y-5">
                
                {/* Question */}
                <h4 className="font-serif font-semibold text-sm text-stone-950 bg-stone-50 p-4 rounded-2xl border border-stone-100/50 leading-relaxed">
                  {activeQuestion.question}
                </h4>

                {/* Options Grid */}
                <div className="grid grid-cols-1 gap-2.5">
                  {activeQuestion.options.map((opt, index) => {
                    const isSelected = selectedOptionIdx === index;
                    let optionStyle = 'bg-stone-50 border-stone-200/80 text-stone-700 hover:bg-stone-100';
                    
                    if (isSelected) {
                      optionStyle = 'bg-rose-50 border-rose-300 text-rose-800 font-medium';
                    }
                    if (isAnswered) {
                      const isCorrect = index === activeQuestion.correctAnswerIndex;
                      if (isCorrect) {
                        optionStyle = 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold';
                      } else if (isSelected) {
                        optionStyle = 'bg-rose-100 border-rose-300 text-rose-800 line-through';
                      } else {
                        optionStyle = 'bg-stone-50/50 border-stone-100 text-stone-400 opacity-60';
                      }
                    }

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectOption(index)}
                        disabled={isAnswered}
                        className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer ${optionStyle}`}
                      >
                        <span>{opt}</span>
                        {isAnswered && index === activeQuestion.correctAnswerIndex && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Hint if active */}
                {activeQuestion.hint && !isAnswered && (
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100/50 text-[10px] text-stone-500 flex items-start gap-1.5 leading-relaxed">
                    <AlertCircle className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                    <span>Pista: {activeQuestion.hint}</span>
                  </div>
                )}

                {/* Answer Feedback / Next Button */}
                <div className="border-t border-stone-100/80 pt-4 mt-4 flex justify-between items-center">
                  <div>
                    {isAnswered && (
                      <span className={`text-[11px] font-medium font-serif ${
                        selectedOptionIdx === activeQuestion.correctAnswerIndex ? 'text-emerald-600' : 'text-rose-500'
                      }`}>
                        {selectedOptionIdx === activeQuestion.correctAnswerIndex 
                          ? '🎉 ¡Correcto! Has ganado +25 Puntos.' 
                          : `💔 Oh... La respuesta era: "${activeQuestion.options[activeQuestion.correctAnswerIndex]}"`}
                      </span>
                    )}
                  </div>

                  {!isAnswered ? (
                    <button
                      onClick={handleVerifyAnswer}
                      disabled={selectedOptionIdx === null}
                      className={`px-5 py-2 rounded-xl text-xs font-serif transition-all shadow-sm cursor-pointer ${
                        selectedOptionIdx !== null
                          ? 'bg-rose-500 hover:bg-rose-600 text-white'
                          : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                      }`}
                    >
                      Comprobar Respuesta
                    </button>
                  ) : (
                    <button
                      onClick={handleNextQuestion}
                      className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2 rounded-xl text-xs font-serif shadow-sm cursor-pointer"
                    >
                      {currentQuestionIdx === questions.length - 1 ? 'Finalizar Trivia' : 'Siguiente Pregunta'}
                    </button>
                  )}
                </div>

              </div>
            )}
          </div>

          {/* ADD CUSTOM QUESTION MODAL */}
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm"
              >
                <form onSubmit={handleAddQuestion} className="space-y-4">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-serif font-medium text-stone-900 text-sm">Añadir Pregunta de Trivia Personalizada</h3>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="p-1 text-stone-400 hover:text-stone-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">Pregunta Trivia</label>
                    <input
                      type="text"
                      placeholder="Ej. ¿A dónde fuimos en nuestro primer viaje juntos?"
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-1 focus:ring-rose-400"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono uppercase text-stone-400">Opciones (Marca la Correcta)</label>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correct_idx"
                          checked={correctIdx === 0}
                          onChange={() => setCorrectIdx(0)}
                          className="text-rose-500 focus:ring-rose-400 w-4 h-4"
                        />
                        <input
                          type="text"
                          placeholder="Opción A (Ej. Cancún)"
                          value={opt0}
                          onChange={(e) => setOpt0(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-stone-50"
                          required
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correct_idx"
                          checked={correctIdx === 1}
                          onChange={() => setCorrectIdx(1)}
                          className="text-rose-500 focus:ring-rose-400 w-4 h-4"
                        />
                        <input
                          type="text"
                          placeholder="Opción B (Ej. Madrid)"
                          value={opt1}
                          onChange={(e) => setOpt1(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-stone-50"
                          required
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correct_idx"
                          checked={correctIdx === 2}
                          onChange={() => setCorrectIdx(2)}
                          className="text-rose-500 focus:ring-rose-400 w-4 h-4"
                        />
                        <input
                          type="text"
                          placeholder="Opción C"
                          value={opt2}
                          onChange={(e) => setOpt2(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-stone-50"
                          required
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correct_idx"
                          checked={correctIdx === 3}
                          onChange={() => setCorrectIdx(3)}
                          className="text-rose-500 focus:ring-rose-400 w-4 h-4"
                        />
                        <input
                          type="text"
                          placeholder="Opción D"
                          value={opt3}
                          onChange={(e) => setOpt3(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-stone-50"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">Pista Opcional</label>
                    <input
                      type="text"
                      placeholder="Una pista sutil para ayudar..."
                      value={newHint}
                      onChange={(e) => setNewHint(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3.5 py-2 text-xs text-stone-500 hover:text-stone-800 hover:bg-stone-55 rounded-xl animate-none"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2 text-xs font-serif rounded-xl shadow-sm cursor-pointer"
                    >
                      Crear Trivia
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* RIGHT COLUMN: REWARD COUPONS STORE */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border-2 border-rose-100 p-6 shadow-md space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full filter blur-2xl -z-10"></div>
            <h3 className="font-serif font-extrabold text-stone-900 text-base flex items-center gap-2 border-b border-rose-50 pb-3">
              <Gift className="w-5 h-5 text-rose-600" /> Cupones de Premio
            </h3>
            
            <p className="text-xs text-stone-500 leading-relaxed font-medium">
              Desbloquea cupones de amor especiales acumulando vuestros Puntos de Amor. ¡Canjéalos para disfrutar de momentos mágicos en pareja!
            </p>

            <div className="space-y-4 pt-2">
              {coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className={`border rounded-2xl p-4.5 flex flex-col justify-between transition-all relative ${
                    coupon.unlocked
                      ? 'bg-gradient-to-br from-rose-50/75 to-rose-100/30 border-rose-200 shadow-sm'
                      : 'bg-stone-50/60 border-stone-200/70 opacity-90 hover:border-rose-200/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-serif font-extrabold text-xs sm:text-sm text-stone-900 flex items-center gap-1.5 leading-snug">
                        {coupon.unlocked && <Sparkles className="w-4 h-4 text-rose-500 fill-rose-500/25 animate-pulse" />}
                        {coupon.title}
                      </h4>
                      <p className="text-stone-500 text-[10px] mt-1.5 leading-normal pr-2 font-medium">
                        {coupon.description}
                      </p>
                    </div>

                    <span className="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100 shrink-0 mt-0.5">
                      {coupon.pointsRequired} pts
                    </span>
                  </div>

                  <div className="border-t border-rose-100/50 pt-3 mt-3 flex items-center justify-between">
                    <span className="text-[9px] font-mono text-stone-400 font-medium">
                      {coupon.unlocked 
                        ? `❤ Canjeado el ${new Date(coupon.claimedAt!).toLocaleDateString()}` 
                        : 'Estado: Bloqueado'}
                    </span>

                    {!coupon.unlocked ? (
                      <button
                        onClick={() => handleUnlockCoupon(coupon)}
                        disabled={lovePoints < coupon.pointsRequired}
                        className={`text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                          lovePoints >= coupon.pointsRequired
                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-100'
                            : 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200'
                        }`}
                      >
                        Canjear Cupón
                      </button>
                    ) : (
                      <span className="text-rose-650 text-[10px] font-serif font-extrabold flex items-center gap-1">
                        ♥ Listo para cobrar
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
