import React, { useState, useEffect, useRef } from 'react';
import { Beer, Check, X, RotateCcw, Sparkles, Minus, Plus, Trophy } from 'lucide-react';
import { normalize } from '../lib/normalize'
// ============================================================================
// CATEGORY CONFIG
// ============================================================================
const FIXED_CATEGORIES = [
  { name: 'History',       multipliers: [2, 2], bg: '#8B4A2B', textColor: '#fff5e6' },
  { name: 'Geography',     multipliers: [2, 2], bg: '#4A9FD9', textColor: '#ffffff' },
  { name: "Who's Missing", multipliers: [3, 3], bg: '#7BC142', textColor: '#f5ffe8' },
  { name: 'Top 5',         multipliers: [3, 3], bg: '#4A7C28', textColor: '#f5ffe8' },
  { name: 'Player ID',     multipliers: [2, 2], bg: '#7B3FBF', textColor: '#ffffff' },
  { name: 'Logo Quiz',     multipliers: [1, 1], bg: '#C8102E', textColor: '#ffffff' },
];

const BANK_CATEGORIES = [
  { name: 'Retro Transfers', multipliers: [2, 2], bg: '#1B4E7C', textColor: '#ffffff' },
  { name: 'Higher/Lower',    multipliers: [1, 1], bg: '#EA7E1E', textColor: '#ffffff' },
  { name: 'Club Combo',      multipliers: [2, 2], bg: '#2C7873', textColor: '#ffffff' },
  { name: 'Lost Files',      multipliers: [2, 2], bg: '#5C4A6E', textColor: '#ffffff' },
];

// ============================================================================
// API HELPERS
// ============================================================================
async function verifyAnswer(sheetAnswer, userAnswer, questionContext = '', category = '', verifyLive = false) {
  try {
    const res = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: questionContext, sheetAnswer, userAnswer, category, verifyLive }),
    });
    const data = await res.json();
    return {
      correct: data.correct,
      canonical: data.canonical,
      note: data.flagOutdated ? `⚠️ ${data.note}` : data.note,
    };
  } catch {
    const accepted = sheetAnswer.split('|').map((s) => normalize(s));
    return {
      correct: accepted.some((a) => a === normalize(userAnswer)),
      canonical: sheetAnswer.split('|')[0],
      note: 'Offline check',
    };
  }
}

// ============================================================================
// SHARED CSS — MOBILE-FIRST
// ============================================================================
const sharedStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Patrick+Hand&display=swap');
  .handwritten { font-family: 'Caveat', cursive; }
  .body-font { font-family: 'Patrick Hand', cursive; }
  input { color: #1c1917; }
  .chip-shadow { box-shadow: inset 0 -2px 0 rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.2); }
  .card-shadow { box-shadow: 0 4px 0 rgba(0,0,0,0.15), 0 6px 12px rgba(0,0,0,0.1); }
  .card-shadow:active { transform: translateY(2px); box-shadow: 0 2px 0 rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.1); }
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7); }
    50% { box-shadow: 0 0 0 8px rgba(251, 191, 36, 0); }
  }
  .active-powerup { animation: pulse-glow 1.5s infinite; }
  @keyframes coin-spin {
    0%   { transform: rotateY(0deg) scale(1);   }
    50%  { transform: rotateY(1440deg) scale(1.2); }
    100% { transform: rotateY(2880deg) scale(1); }
  }
  .coin-flipping { animation: coin-spin 2.5s cubic-bezier(.35,.05,.35,1) forwards; }

  /* Mobile safe area support */
  .safe-bottom { padding-bottom: env(safe-area-inset-bottom, 16px); }
  
  /* Prevent iOS zoom on input focus */
  input, select, textarea {
    font-size: 16px !important;
  }
  
  /* Better tap targets on mobile */
  button { -webkit-tap-highlight-color: transparent; }
  
  /* Smooth scrolling on iOS */
  .modal-scroll { -webkit-overflow-scrolling: touch; }
`;
// ============================================================================
// MAIN APP
// ============================================================================
export default function FootballTrivia() {
  const [scores, setScores] = useState([0, 0]);
  const [scoreBreakdown, setScoreBreakdown] = useState({ 0: {}, 1: {} });
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [usedQuestions, setUsedQuestions] = useState({});
  const [turn, setTurn] = useState(0);
  const [powerUps, setPowerUps] = useState({ 0: { x2: true }, 1: { x2: true } });
  const [activePowerUp, setActivePowerUp] = useState(null);
  const [questionResolved, setQuestionResolved] = useState(false);
  const [phase, setPhase] = useState('landing');
  const [teamNames, setTeamNames] = useState(['RED team', 'BLUE team']);
  const [winnerIdx, setWinnerIdx] = useState(null);
  const [privilegeChoice, setPrivilegeChoice] = useState(null); // 'categories' | 'order'
  const [activeCategories, setActiveCategories] = useState(null);
  const [startingTeam, setStartingTeam] = useState(null);

  const [questions, setQuestions] = useState({});
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState(null);

  useEffect(() => {
    if (phase !== 'play') return;
    setQuestionsLoading(true);
    setQuestionsError(null);
    fetch('/api/questions')
      .then((r) => {
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setQuestions(data);
        setQuestionsLoading(false);
      })
      .catch((err) => {
        setQuestionsError(err.message);
        setQuestionsLoading(false);
      });
  }, [phase]);

 const totalSlots = (activeCategories || []).reduce((sum, c) => sum + c.multipliers.length, 0);

  useEffect(() => {
    if (phase !== 'play') return;
    if (Object.keys(usedQuestions).length >= totalSlots) {
      setPhase('finished');
    }
  }, [usedQuestions, phase, totalSlots]);

  const openQuestion = (category, multiplier, slotIndex) => {
    const key = `${category}-${slotIndex}`;
    if (usedQuestions[key]) return;

    const pool = questions[category] || [];
    if (pool.length === 0) return;

    const question =
      pool.find(q => q.slotIndex === slotIndex) ?? pool[slotIndex] ?? pool[0];
    if (!question) return;

    setActiveQuestion({
      ...question,
      q: question.question,
      a: question.answer,
      imageUrl: question.image_url,
      category,
      multiplier,
      slotKey: key,
    });
  };

  const handleUsePowerUp = (type) => {
    if (!powerUps[turn][type]) return;
    if (type === 'x2' && activeQuestion) return;
    setActivePowerUp(type);
  };

  const powerUpConsumedRef = useRef(false);

  const consumePowerUp = (type) => {
    if (powerUpConsumedRef.current) return;
    powerUpConsumedRef.current = true;
    setPowerUps((prev) => ({
      ...prev,
      [turn]: { ...prev[turn], [type]: false },
    }));
  };

  const awardPoints = (basePoints) => {
    setQuestionResolved(true);
    let pts = basePoints;

    if (activePowerUp === 'x2' && basePoints > 0) {
      pts = basePoints * 2;
      consumePowerUp('x2');
    }

    setScores((prev) => {
      const next = [...prev];
      next[turn] += pts;
      return next;
    });

    const category = activeQuestion?.category;
    if (category) {
      setScoreBreakdown((prev) => ({
        ...prev,
        [turn]: { ...prev[turn], [category]: (prev[turn][category] || 0) + pts },
      }));
    }
    return pts;
  };

  const markResolved = () => setQuestionResolved(true);

  const finishQuestion = () => {
    if (questionResolved) {
      setUsedQuestions((prev) => ({ ...prev, [activeQuestion.slotKey]: true }));
      setActivePowerUp(null);
      setTurn((t) => (t === 0 ? 1 : 0));
    }
    setActiveQuestion(null);
    setQuestionResolved(false);
    powerUpConsumedRef.current = false;
  };

  const resetGame = () => {
    setScores([0, 0]);
    setScoreBreakdown({ 0: {}, 1: {} });
    setUsedQuestions({});
    setTurn(0);
    setPowerUps({ 0: { x2: true }, 1: { x2: true } });
    setActivePowerUp(null);
    setActiveQuestion(null);
    setQuestionResolved(false);
    powerUpConsumedRef.current = false;
    setWinnerIdx(null);
    setPrivilegeChoice(null);
    setActiveCategories(null);
    setStartingTeam(null);
    setPhase('landing');
  };

  const startGame = (startIdx) => {
  setTurn(startIdx);
  setPhase('play');
  };
  
  if (phase === 'landing') {
    return <LandingPage sharedStyle={sharedStyle} teamNames={teamNames} onStart={(names) => { setTeamNames(names); setPhase('coinflip'); }} />;
  }

if (phase === 'coinflip') {
  return <CoinFlip sharedStyle={sharedStyle} teamNames={teamNames}
    onComplete={(idx) => { setWinnerIdx(idx); setPhase('privilege'); }} />;
}

if (phase === 'privilege') {
  return <PrivilegeChoice sharedStyle={sharedStyle} winnerName={teamNames[winnerIdx]}
    onChoose={(choice) => {
      setPrivilegeChoice(choice);
      setPhase(choice === 'categories' ? 'categoryPick' : 'orderPick');
    }} />;
}

if (phase === 'categoryPick') {
  const pickerIdx = privilegeChoice === 'categories' ? winnerIdx : (winnerIdx === 0 ? 1 : 0);
  return <CategoryPicker sharedStyle={sharedStyle} pickerName={teamNames[pickerIdx]} bank={BANK_CATEGORIES}
    onConfirm={(picked) => {
      setActiveCategories([...FIXED_CATEGORIES, ...picked]);
      if (startingTeam !== null) startGame(startingTeam);
      else setPhase('orderPick');
    }} />;
}

if (phase === 'orderPick') {
  const pickerIdx = privilegeChoice === 'order' ? winnerIdx : (winnerIdx === 0 ? 1 : 0);
  return <OrderPicker sharedStyle={sharedStyle} pickerName={teamNames[pickerIdx]}
    onChoose={(startIdx) => {
      setStartingTeam(startIdx);
      if (activeCategories !== null) startGame(startIdx);
      else setPhase('categoryPick');
    }} />;
}

  if (phase === 'finished') {
    const winnerIdx = scores[0] === scores[1] ? null : (scores[0] > scores[1] ? 0 : 1);
    return <FinishedScreen sharedStyle={sharedStyle} teamNames={teamNames} scores={scores} breakdown={scoreBreakdown} winnerIdx={winnerIdx} onNewGame={resetGame} categories={activeCategories || []}/>;
  }

  // PLAY PHASE
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 px-3 pb-6 safe-bottom" style={{ fontFamily: "'Patrick Hand', cursive" }}>
      <style>{sharedStyle}</style>

      <div className="max-w-md mx-auto">
        {/* Compact header for mobile */}
        <header className="flex items-center justify-center gap-2 pt-3 pb-2">
          <Beer size={36} className="text-amber-500 flex-shrink-0" strokeWidth={2.5} />
          <h1 className="handwritten text-3xl font-bold text-stone-800 leading-none">FOOTBALL TRIVIA</h1>
        </header>

        <div className={`rounded-xl py-1.5 px-3 mb-3 transform -rotate-1 card-shadow transition-colors ${turn === 0 ? 'bg-red-600' : 'bg-blue-700'}`}>
          <p className="handwritten text-xl text-white text-center italic font-semibold">
            Σειρά: {teamNames[turn]}
          </p>
        </div>

        {questionsLoading && (
          <div className="text-center py-3 body-font text-stone-500 flex items-center justify-center gap-2 text-sm">
            <Sparkles size={16} className="animate-spin text-amber-500" />
            Φόρτωση ερωτήσεων…
          </div>
        )}
        {questionsError && (
          <div className="bg-red-100 border-2 border-red-400 rounded-xl p-2 mb-2 text-center body-font text-red-700 text-xs">
            ⚠️ Αδυναμία φόρτωσης: {questionsError}
          </div>
        )}

        {/* Category grid — 2 cols, bigger tap targets */}
        <div className="grid grid-cols-2 gap-2 mb-4">
         {(activeCategories || []).map((cat) => (
            <CategoryCard key={cat.name} category={cat} usedQuestions={usedQuestions} onPick={openQuestion} hasQuestions={(questions[cat.name] || []).length > 0} />
          ))}
        </div>

        {/* Score panel */}
        <div className="bg-stone-100 rounded-2xl p-3 card-shadow">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center mb-3">
            <TeamPanel
              color="red" name={teamNames[0]} value={scores[0]}
              onChange={(v) => setScores([v, scores[1]])}
              active={turn === 0} powerUps={powerUps[0]}
              activePowerUp={turn === 0 ? activePowerUp : null}
              onArmX2={() => turn === 0 && handleUsePowerUp('x2')}
              onDisarmX2={() => turn === 0 && setActivePowerUp(null)}
              disabled={!!activeQuestion}
            />
            <div className="bg-white border-2 border-stone-800 rounded-xl py-1.5 px-3 w-fit">
              <h2 className="handwritten text-2xl text-stone-800 font-bold">Score</h2>
            </div>
            <TeamPanel
              color="blue" name={teamNames[1]} value={scores[1]}
              onChange={(v) => setScores([scores[0], v])}
              active={turn === 1} powerUps={powerUps[1]}
              activePowerUp={turn === 1 ? activePowerUp : null}
              onArmX2={() => turn === 1 && handleUsePowerUp('x2')}
              onDisarmX2={() => turn === 1 && setActivePowerUp(null)}
              disabled={!!activeQuestion}
            />
          </div>
          {activePowerUp === 'x2' && !activeQuestion && (
            <div className="mt-2 bg-amber-100 border-2 border-amber-500 rounded-xl py-1.5 px-3 text-center">
              <span className="handwritten text-lg text-amber-800 font-bold">
                ⚡ ×2 ενεργό — διάλεξε ερώτηση!
              </span>
            </div>
          )}
        </div>

        <button
          onClick={resetGame}
          className="mt-4 mx-auto flex items-center gap-2 bg-stone-800 text-white py-2.5 px-5 rounded-full body-font text-base hover:bg-stone-700 active:bg-stone-900 transition min-h-[44px]"
        >
          <RotateCcw size={16} /> Νέο παιχνίδι
        </button>
      </div>

      {activeQuestion && (
        <QuestionModal
          question={activeQuestion}
          onFinish={finishQuestion}
          onAward={awardPoints}
          onResolved={markResolved}
          activePowerUp={activePowerUp}
          onUsePowerUp={handleUsePowerUp}
          availablePowerUps={powerUps[turn]}
          turn={turn}
        />
      )}
    </div>
  );
}

// ============================================================================
// CATEGORY CARD — bigger chips for touch
// ============================================================================
function CategoryCard({ category, usedQuestions, onPick, hasQuestions }) {
  return (
    <div className="rounded-xl overflow-hidden card-shadow" style={{ backgroundColor: category.bg }}>
      <div className="py-1.5 px-2 text-center border-b-2" style={{ borderColor: 'rgba(0,0,0,0.2)' }}>
        <h3 className="handwritten text-lg font-bold leading-tight" style={{ color: category.textColor }}>
          {category.name}
        </h3>
      </div>
      <div className="flex justify-around items-center py-2.5 gap-2 px-2">
        {category.multipliers.map((mult, idx) => {
          const used = usedQuestions[`${category.name}-${idx}`];
          return (
            <button
              key={idx}
              onClick={() => onPick(category.name, mult, idx)}
              disabled={used || !hasQuestions}
              title={!hasQuestions ? 'Ερωτήσεις μη διαθέσιμες' : undefined}
              className={`w-14 h-14 rounded-full bg-white body-font text-lg font-bold text-stone-800 chip-shadow transition ${
                used || !hasQuestions ? 'opacity-30 cursor-not-allowed' : 'active:scale-95'
              }`}
            >
              {used ? '—' : `x${mult}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// TEAM PANEL — compact but touch-friendly
// ============================================================================
function TeamPanel({ color, name, value, onChange, active, powerUps, activePowerUp, onArmX2, onDisarmX2, disabled }) {
  const borderColor = color === 'red' ? 'border-red-600' : 'border-blue-700';
  const textColor = color === 'red' ? 'text-red-600' : 'text-blue-700';
  const bgAccent = color === 'red' ? 'bg-red-50' : 'bg-blue-50';
  const ring = active ? 'ring-4 ring-amber-300' : '';
  const x2Armed = activePowerUp === 'x2';

  return (
    <div className={`${bgAccent} border-4 ${borderColor} ${ring} rounded-xl p-2 transition-all`}>
      {name && (
        <div className={`text-center body-font font-bold text-xs mb-1 truncate ${textColor}`}>{name}</div>
      )}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className={`${textColor} hover:bg-white/50 active:bg-white/70 rounded-full p-2 min-w-[36px] min-h-[36px] flex items-center justify-center`}
        >
          <Minus size={16} />
        </button>
        <span className={`handwritten text-4xl font-bold ${textColor}`}>{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className={`${textColor} hover:bg-white/50 active:bg-white/70 rounded-full p-2 min-w-[36px] min-h-[36px] flex items-center justify-center`}
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="flex gap-1 justify-center">
        <button
          onClick={x2Armed ? onDisarmX2 : onArmX2}
          disabled={!active || !powerUps.x2 || disabled}
          className={`text-xs px-2 py-1.5 rounded-full border-2 font-bold transition min-h-[36px] ${
            !powerUps.x2
              ? 'bg-stone-200 border-stone-300 text-stone-400 line-through cursor-not-allowed'
              : x2Armed
              ? 'bg-amber-500 border-amber-700 text-white active-powerup'
              : active && !disabled
              ? 'bg-amber-400 border-amber-600 text-stone-900 active:bg-amber-300 cursor-pointer'
              : 'bg-amber-200 border-amber-400 text-stone-700 cursor-not-allowed opacity-70'
          }`}
        >
          {x2Armed ? '⚡ ×2' : '×2'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// BREAKDOWN MODAL
// ============================================================================
function BreakdownModal({ breakdown, totals, teamNames = ['RED', 'BLUE'], categories = [], onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 backdrop-blur-sm">
      <div className="bg-gradient-to-b from-amber-50 to-orange-50 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-4 sm:p-5 card-shadow border-t-4 sm:border-4 border-stone-800 max-h-[85vh] overflow-y-auto modal-scroll safe-bottom">
        <div className="flex justify-between items-center mb-3">
          <h3 className="handwritten text-2xl text-stone-800 font-bold">Αναλυτικοί πόντοι</h3>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-800 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X size={24} />
          </button>
        </div>
        <div className="bg-white rounded-xl border-2 border-stone-300 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] gap-1 bg-stone-100 px-3 py-2 body-font text-xs font-bold text-stone-600 border-b-2 border-stone-300">
            <span>Κατηγορία</span>
            <span className="text-red-600 w-16 text-center truncate" title={teamNames[0]}>{teamNames[0]}</span>
            <span className="text-blue-700 w-16 text-center truncate" title={teamNames[1]}>{teamNames[1]}</span>
          </div>
            {categories.map((cat) => { => (
            const r = breakdown[0][cat.name] || 0;
            const b = breakdown[1][cat.name] || 0;
            return (
              <div key={cat.name} className="grid grid-cols-[1fr_auto_auto] gap-1 px-3 py-2 border-b border-stone-100 body-font text-sm">
                <span className="text-stone-700">{cat.name}</span>
                <span className="text-red-600 font-bold w-16 text-center">{r > 0 ? `+${r}` : '—'}</span>
                <span className="text-blue-700 font-bold w-16 text-center">{b > 0 ? `+${b}` : '—'}</span>
              </div>
            );
          })}
          <div className="grid grid-cols-[1fr_auto_auto] gap-1 px-3 py-2 bg-stone-100 body-font text-sm font-bold">
            <span className="text-stone-800">Σύνολο</span>
            <span className="text-red-600 w-16 text-center">{totals[0]}</span>
            <span className="text-blue-700 w-16 text-center">{totals[1]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// QUESTION MODAL — full-screen on mobile, proper keyboard handling
// ============================================================================
function QuestionModal({ question, onFinish, onAward, onResolved, activePowerUp, onUsePowerUp, availablePowerUps, turn }) {
  const displayMultiplier = activePowerUp === 'x2'
    ? question.multiplier * 2
    : question.multiplier;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gradient-to-b from-amber-50 to-orange-50 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[95vh] flex flex-col border-t-4 sm:border-4 border-stone-800 safe-bottom">
        {/* Fixed header */}
        <div className="flex justify-between items-start p-4 pb-2 flex-shrink-0">
          <div>
            <div className="body-font text-xs text-stone-500 uppercase tracking-wider">{question.category}</div>
            <div className="handwritten text-xl text-amber-700 font-bold">
              Αξίζει ×{displayMultiplier}
              {activePowerUp === 'x2' && <span className="text-amber-500"> (×2!)</span>}
            </div>
          </div>
          <button onClick={onFinish} className="text-stone-500 hover:text-stone-800 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto modal-scroll px-4 pb-4">
          {(() => {
            const props = {
              question, onFinish, onAward, onResolved, activePowerUp,
              multiplier: question.multiplier,
              onSkip: onFinish,
            };
            switch (question.type) {
              case 'logo':        return <LogoQuestion {...props} />;
              case 'imageText':   return <ImageTextQuestion {...props} />;
              case 'transfer':    return <TransferQuestion {...props} />;
              case 'careerTable': return <CareerTableQuestion {...props} />;
              case 'whomissing':  return <WhosMissingQuestion {...props} />;
              case 'higherlower': return <HigherLowerQuestion {...props} />;
              case 'top5':        return <Top5Question {...props} />;
              default:            return <TextQuestion {...props} />;
            }
          })()}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SHARED ANSWER INPUT — mobile keyboard aware
// ============================================================================
function AnswerInput({ question, onFinish, onAward, onResolved, activePowerUp }) {
  const [userAnswer, setUserAnswer] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  // Delay focus to avoid iOS keyboard jump
  useEffect(() => {
    if (!result && !activePowerUp && inputRef.current) {
      const timer = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [result, activePowerUp]);

  const submit = async (answerText) => {
    if (!answerText || verifying || result) return;
    // Dismiss keyboard on mobile before verifying
    inputRef.current?.blur();
    setVerifying(true);
    const verdict = await verifyAnswer(question.a, answerText, question.q, question.category, question.verifyLive);
    setResult(verdict);
    setVerifying(false);
    if (onResolved) onResolved();
    onAward(verdict.correct ? question.multiplier : 0);
  };

  if (result) {
    return (
      <div className={`rounded-xl p-4 ${result.correct ? 'bg-green-100 border-2 border-green-600' : 'bg-red-100 border-2 border-red-600'}`}>
        <div className="flex items-center gap-2 mb-2">
          {result.correct
            ? <><Check size={28} className="text-green-700" /><span className="handwritten text-2xl text-green-700 font-bold">Σωστά!</span></>
            : <><X size={28} className="text-red-700" /><span className="handwritten text-2xl text-red-700 font-bold">Λάθος</span></>
          }
        </div>
        {!result.correct && result.canonical && (
          <p className="body-font text-stone-600 text-sm mb-1">Σωστή: <strong>{result.canonical}</strong></p>
        )}
        <p className="body-font text-stone-700 text-sm">{result.note}</p>
        <button onClick={onFinish} className="body-font mt-3 w-full bg-stone-800 text-white py-3 rounded-xl min-h-[48px] active:bg-stone-700">
          Σειρά επόμενης ομάδας →
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        value={userAnswer}
        onChange={(e) => setUserAnswer(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit(userAnswer)}
        disabled={verifying}
        placeholder="Η απάντησή σου…"
        className="body-font w-full border-2 border-stone-800 rounded-xl px-4 py-3 text-lg mb-3 bg-white focus:outline-none focus:ring-4 focus:ring-amber-300"
      />
      <button
        onClick={() => submit(userAnswer)}
        disabled={verifying || !userAnswer.trim()}
        className="body-font w-full bg-stone-800 text-white py-3 rounded-xl text-lg flex items-center justify-center gap-2 active:bg-stone-700 disabled:opacity-50 transition min-h-[52px]"
      >
        {verifying
          ? <><Sparkles size={20} className="animate-spin" /> Ελέγχει…</>
          : 'Υποβολή απάντησης'
        }
      </button>
    </>
  );
}

// ============================================================================
// QUESTION TYPE COMPONENTS
// ============================================================================
function TextQuestion({ question, onFinish, onAward, onResolved, activePowerUp }) {
  return (
    <>
      <p className="body-font text-xl text-stone-800 mb-4 leading-relaxed">{question.q}</p>
      <AnswerInput question={question} onFinish={onFinish} onAward={onAward} onResolved={onResolved} activePowerUp={activePowerUp} />
    </>
  );
}

function LogoQuestion({ question, onFinish, onAward, onResolved, activePowerUp }) {
  return (
    <>
      <p className="body-font text-xl text-stone-800 mb-3 text-center">{question.q}</p>
      <div className="bg-white rounded-xl p-3 mb-4 flex justify-center items-center h-44 border-2 border-stone-300">
        <img src={question.imageUrl} alt="Logo" className="max-h-36 max-w-full object-contain" />
      </div>
      <AnswerInput question={question} onFinish={onFinish} onAward={onAward} onResolved={onResolved} activePowerUp={activePowerUp} />
    </>
  );
}

function ImageTextQuestion({ question, onFinish, onAward, onResolved, activePowerUp }) {
  return (
    <>
      <div className="rounded-xl overflow-hidden mb-3 border-2 border-stone-300 bg-stone-100">
        <img src={question.imageUrl} alt="question" className="w-full max-h-56 object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
      </div>
      <p className="body-font text-lg text-stone-800 mb-3 text-center">{question.q}</p>
      <AnswerInput question={question} onFinish={onFinish} onAward={onAward} onResolved={onResolved} activePowerUp={activePowerUp} />
    </>
  );
}

function TransferQuestion({ question, onFinish, onAward, onResolved, activePowerUp }) {
  return (
    <>
      <div className="bg-stone-800 rounded-t-xl py-2 px-4 text-center">
        <span className="handwritten text-xl text-white">
          {question.question} {question.year}
        </span>
      </div>
      <div className="bg-green-600 rounded-b-xl p-3 mb-4 flex items-center justify-around">
        <span className="handwritten text-2xl text-white font-bold text-center">{question.from}</span>
        <span className="text-white text-2xl flex-shrink-0">▶</span>
        <span className="handwritten text-2xl text-white font-bold text-center">{question.to}</span>
      </div>
      <p className="body-font text-stone-600 text-center mb-3 text-sm">Ποιος παίκτης έκανε αυτή τη μεταγραφή;</p>
      <AnswerInput question={question} onFinish={onFinish} onAward={onAward} onResolved={onResolved} activePowerUp={activePowerUp} />
    </>
  );
}

function CareerTableQuestion({ question, onFinish, onAward, onResolved, activePowerUp }) {
  return (
    <>
      <div className="bg-gradient-to-b from-purple-600 to-purple-800 rounded-xl p-3 mb-4">
        <div className="flex justify-between text-purple-100 body-font text-xs uppercase tracking-wide border-b border-purple-400 pb-2 mb-2">
          <span>Ομάδα</span><span>Περίοδος</span>
        </div>
        <div className="max-h-48 overflow-y-auto modal-scroll">
          {(question.career || []).map(([team, period], i) => (
            <div key={i} className={`flex justify-between body-font text-white py-1.5 px-2 rounded ${i % 2 ? 'bg-purple-700/40' : ''}`}>
              <span className="text-sm">{team}</span><span className="text-purple-200 text-sm">{period}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="body-font text-stone-600 text-center mb-3 text-sm">Ποιος είναι αυτός ο παίκτης;</p>
      <AnswerInput question={question} onFinish={onFinish} onAward={onAward} onResolved={onResolved} activePowerUp={activePowerUp} />
    </>
  );
}

function WhosMissingQuestion({ question, onAward, onSkip, multiplier, activePowerUp, onUsePowerUp }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const inputRef = useRef(null);

  async function handleSubmit(answerText) {
    const ans = answerText ?? input;
    if (verifying || result || !ans.trim()) return;
    inputRef.current?.blur();
    setVerifying(true);

    const normInput = normalize(ans);
    const acceptedAnswers = question.answer.split('|').map(normalize);

    if (acceptedAnswers.includes(normInput)) {
      setResult('correct');
      setVerifying(false);
      onAward(multiplier);
      return;
    }

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.question,
          sheetAnswer: question.answer,
          userAnswer: ans,
        }),
      });
      const data = await res.json();
      if (data.correct) { setResult('correct'); onAward(multiplier); }
      else               { setResult('wrong');   onAward(0); }
    } catch {
      setResult('wrong');
      onAward(0);
    }
    setVerifying(false);
  }

  return (
    <div className="space-y-3">
      <p className="text-center font-bold text-lg text-stone-800 body-font">{question.question}</p>
      <p className="text-center text-stone-500 text-sm body-font">Ποιος λείπει από την 11άδα;</p>

      {question.image_url && (
        <div className="w-full rounded-xl overflow-hidden bg-black">
          <img
            src={question.image_url}
            alt="Formation"
            className="w-full h-auto object-contain"
            style={{ maxHeight: '280px' }}
          />
        </div>
      )}

      {!result && (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            className="flex-1 border-2 border-gray-300 rounded-lg p-3 focus:outline-none focus:border-blue-500 body-font"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Ποιος λείπει;"
            disabled={verifying}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={verifying}
            className="bg-blue-600 text-white px-5 rounded-lg font-bold active:bg-blue-700 disabled:opacity-50 min-w-[60px] min-h-[52px] body-font">
            {verifying ? '...' : 'OK'}
          </button>
        </div>
      )}

      {result === 'correct' && (
        <div className="bg-green-100 border border-green-400 rounded-lg p-3 text-center">
          <p className="text-green-700 font-bold body-font">✓ Σωστό!</p>
          <button onClick={onSkip} className="mt-2 bg-stone-700 text-white px-6 py-2.5 rounded-lg font-bold min-h-[44px] body-font">
            Επόμενο →
          </button>
        </div>
      )}

      {result === 'wrong' && (
        <div className="bg-red-100 border border-red-400 rounded-lg p-3 text-center">
          <p className="text-red-700 font-bold body-font">✗ Λάθος!</p>
          <p className="text-sm text-gray-600 body-font">Σωστό: {question.answer.split('|')[0]}</p>
          <button onClick={onSkip} className="mt-2 bg-stone-700 text-white px-6 py-2.5 rounded-lg font-bold min-h-[44px] body-font">
            Επόμενο →
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TOP 5 QUESTION
// ============================================================================
function Top5Question({ question, multiplier, onAward, onFinish }) {
  const answers = (question.answer || '').split('|').map(a => a.trim());
  const [revealed, setRevealed] = useState([]);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [input, setInput] = useState('');
  const [done, setDone] = useState(false);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const inputRef = useRef(null);

  async function handleSubmit() {
    if (done || verifying || !input.trim()) return;
    inputRef.current?.blur();
    setVerifying(true);

    const normInput = normalize(input);

    const matchIdx = answers.findIndex(
      (a, i) => !revealed.includes(i) && normalize(a) === normInput
    );

    if (matchIdx !== -1) {
      const newRevealed = [...revealed, matchIdx];
      setRevealed(newRevealed);
      setInput('');
      setVerifying(false);
      if (newRevealed.length === answers.length) { setDone(true); onAward(multiplier); }
      else if (newRevealed.length === answers.length - 1) { setShowStopDialog(true); }
      return;
    }

    const remaining = answers.filter((_, i) => !revealed.includes(i)).join('|');
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Top 5 quiz. The player is trying to name one of the remaining correct answers.`,
          sheetAnswer: remaining,
          userAnswer: input,
          category: 'Top 5',
        }),
      });
      const data = await res.json();

      if (data.correct) {
        const canonical = data.canonical || '';
        let idxToReveal = answers.findIndex(
          (a, i) => !revealed.includes(i) && normalize(a) === normalize(canonical)
        );
        if (idxToReveal === -1) {
          idxToReveal = answers.findIndex(
            (a, i) => !revealed.includes(i) && normalize(a) === normInput
          );
        }
        if (idxToReveal === -1) {
          const newWrong = [...wrongAnswers, input.trim()];
          setWrongAnswers(newWrong);
          setInput('');
          setVerifying(false);
          if (newWrong.length >= 2) { setDone(true); onAward(0); }
          return;
        }
        const newRevealed = [...revealed, idxToReveal];
        setRevealed(newRevealed);
        setInput('');
        setVerifying(false);
        if (newRevealed.length === answers.length) { setDone(true); onAward(multiplier); }
        else if (newRevealed.length === answers.length - 1) { setShowStopDialog(true); }
        return;
      }
    } catch { }

    const newWrong = [...wrongAnswers, input.trim()];
    setWrongAnswers(newWrong);
    setInput('');
    setVerifying(false);
    if (newWrong.length >= 2) { setDone(true); onAward(0); }
  }

  function handleStop() { setShowStopDialog(false); setDone(true); onAward(1); }
  function handleContinue() { setShowStopDialog(false); }

  const lastWrong = wrongAnswers[wrongAnswers.length - 1];

  return (
    <div className="space-y-3">
      {question.q && (
        <p className="body-font text-center font-bold text-stone-800 text-lg">{question.q}</p>
      )}

      <div className="bg-green-600 rounded-xl p-2.5 space-y-1.5">
        {answers.map((ans, i) => (
          <div key={i} className={`rounded-full px-3 py-2 flex items-center gap-2.5 transition-all
            ${revealed.includes(i) ? 'bg-green-800' : 'bg-green-500'}`}>
            <span className="bg-white text-green-700 rounded-full w-7 h-7 flex items-center justify-center body-font font-bold text-sm flex-shrink-0">
              {i + 1}
            </span>
            <span className="handwritten text-xl text-white font-bold">
              {revealed.includes(i) ? ans : '—'}
            </span>
          </div>
        ))}

        <div className={`rounded-full px-3 py-2 flex items-center gap-2.5 transition-all mt-1
          ${wrongAnswers.length > 0 ? 'bg-red-500' : 'bg-red-800/40'}`}>
          <span className="bg-white text-red-600 rounded-full w-7 h-7 flex items-center justify-center body-font font-bold text-sm flex-shrink-0">
            ✗
          </span>
          <span className="handwritten text-xl text-white font-bold">
            {lastWrong || '—'}
          </span>
          {wrongAnswers.length === 1 && !done && (
            <span className="body-font text-xs text-white/80 ml-auto">⚠️ 1 ακόμα!</span>
          )}
        </div>
      </div>

      {showStopDialog && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-3 text-center space-y-2">
          <p className="body-font font-bold text-amber-800 text-sm">4 σωστές! Σταματάς ή συνεχίζεις;</p>
          <p className="body-font text-xs text-amber-700">
            Σταμάτα → <strong>1 πόντος</strong> | Συνέχισε → <strong>{multiplier}</strong> (ή 0)
          </p>
          <div className="flex gap-2 justify-center">
            <button onClick={handleStop}
              className="body-font bg-amber-500 text-white px-4 py-2.5 rounded-lg font-bold active:bg-amber-600 min-h-[44px]">
              Σταματώ
            </button>
            <button onClick={handleContinue}
              className="body-font bg-green-600 text-white px-4 py-2.5 rounded-lg font-bold active:bg-green-700 min-h-[44px]">
              Συνεχίζω!
            </button>
          </div>
        </div>
      )}

      {!done && !showStopDialog && (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            className="flex-1 border-2 border-stone-300 rounded-lg p-3 body-font text-stone-900 focus:outline-none focus:border-green-500"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Απάντηση..."
            disabled={verifying}
          />
          <button onClick={handleSubmit} disabled={verifying}
            className="body-font bg-green-600 text-white px-5 rounded-lg font-bold active:bg-green-700 disabled:opacity-50 min-w-[60px] min-h-[52px]">
            {verifying ? '...' : 'OK'}
          </button>
        </div>
      )}

      {done && (
        <div className="space-y-2">
          {answers.some((_, i) => !revealed.includes(i)) && (
            <>
              <p className="body-font text-center text-xs text-stone-500">Οι υπόλοιπες:</p>
              {answers.map((ans, i) => !revealed.includes(i) && (
                <div key={i} className="bg-stone-200 text-stone-600 rounded-lg p-2 text-center body-font text-sm">{ans}</div>
              ))}
            </>
          )}
          <button onClick={onFinish}
            className="body-font w-full bg-stone-700 text-white py-3 rounded-lg font-bold active:bg-stone-800 min-h-[48px]">
            Επόμενο →
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HIGHER / LOWER QUESTION
// Sheet columns:
//   subject  — the comparison theme  (e.g. "Ακριβότερη μεταγραφή")
//   values   — the two options       (e.g. "Sancho & Antony")
//   answer   — the correct one       (e.g. "Antony")
// ============================================================================
function HigherLowerQuestion({ question, onAward, onSkip, multiplier }) {
  const subject = question.subject || question.question || '';
  // Parse "A & B" — support & or vs or |
  const rawValues = question.values || question.q || '';
  const parts = rawValues.split(/\s*[&|]\s*|\s+vs\s+/i).map(s => s.trim()).filter(Boolean);
  const optionA = parts[0] || 'Option A';
  const optionB = parts[1] || 'Option B';
  const correctAnswer = normalize(question.answer || '');

  const [picked, setPicked] = useState(null);   // 'A' | 'B'
  const [revealed, setRevealed] = useState(false);

  const correctOption = normalize(optionA) === correctAnswer ? 'A' : 'B';

  function handlePick(choice) {
    if (revealed) return;
    setPicked(choice);
    setRevealed(true);
    onAward(choice === correctOption ? multiplier : 0);
  }

  function btnStyle(choice) {
    const base = 'w-full py-5 px-4 rounded-2xl body-font text-xl font-bold border-4 transition active:scale-95 min-h-[72px] flex items-center justify-center text-center leading-snug';
    if (!revealed) {
      return choice === 'A'
        ? `${base} bg-blue-50 border-blue-500 text-blue-900`
        : `${base} bg-red-50 border-red-500 text-red-900`;
    }
    const isCorrect  = choice === correctOption;
    const wasPicked  = choice === picked;
    if (isCorrect)             return `${base} bg-green-100 border-green-600 text-green-900`;
    if (wasPicked && !isCorrect) return `${base} bg-red-100 border-red-600 text-red-900`;
    return `${base} bg-stone-100 border-stone-300 text-stone-400 opacity-50`;
  }

  return (
    <div className="space-y-4">
      {/* Theme banner */}
      <div className="bg-orange-600 rounded-2xl py-3 px-4 text-center">
        <p className="body-font text-orange-200 text-xs uppercase tracking-widest mb-0.5">Ποιο είναι υψηλότερο/μεγαλύτερο;</p>
        <p className="handwritten text-2xl text-white font-bold leading-tight">{subject}</p>
      </div>

      {/* The two options */}
      <div className="space-y-3">
        <button onClick={() => handlePick('A')} disabled={revealed} className={btnStyle('A')}>
          {revealed && correctOption === 'A' && <span className="mr-2 text-green-600 text-2xl">✓</span>}
          {revealed && picked === 'A' && correctOption !== 'A' && <span className="mr-2 text-red-500 text-2xl">✗</span>}
          <span>{optionA}</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-stone-300" />
          <span className="body-font text-stone-400 text-sm font-bold">VS</span>
          <div className="flex-1 h-px bg-stone-300" />
        </div>

        <button onClick={() => handlePick('B')} disabled={revealed} className={btnStyle('B')}>
          {revealed && correctOption === 'B' && <span className="mr-2 text-green-600 text-2xl">✓</span>}
          {revealed && picked === 'B' && correctOption !== 'B' && <span className="mr-2 text-red-500 text-2xl">✗</span>}
          <span>{optionB}</span>
        </button>
      </div>

      {/* Result */}
      {revealed && (
        <>
          <div className={`rounded-xl p-3 text-center border-2 ${
            picked === correctOption ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500'
          }`}>
            <p className={`handwritten text-2xl font-bold ${
              picked === correctOption ? 'text-green-700' : 'text-red-700'
            }`}>
              {picked === correctOption ? '✓ Σωστά!' : '✗ Λάθος!'}
            </p>
            {picked !== correctOption && (
              <p className="body-font text-stone-600 text-sm mt-1">
                Σωστό: <strong>{correctOption === 'A' ? optionA : optionB}</strong>
              </p>
            )}
          </div>

          <button onClick={onSkip} className="body-font w-full bg-stone-800 text-white py-3 rounded-xl font-bold active:bg-stone-700 min-h-[48px]">
            Επόμενο →
          </button>
        </>
      )}
    </div>
  );
}

// ============================================================================
// LANDING PAGE
// ============================================================================
function LandingPage({ sharedStyle, teamNames, onStart }) {
  const [names, setNames] = useState([...teamNames]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 px-4 flex flex-col items-center justify-center safe-bottom" style={{ fontFamily: "'Patrick Hand', cursive" }}>
      <style>{sharedStyle}</style>
      <div className="max-w-md w-full text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Beer size={48} className="text-amber-500 flex-shrink-0" strokeWidth={2.5} />
          <h1 className="handwritten text-4xl sm:text-5xl font-bold text-stone-800">FOOTBALL TRIVIA</h1>
        </div>
        <div className="bg-red-600 rounded-2xl py-2 px-4 mb-6 transform -rotate-1 card-shadow">
          <p className="handwritten text-xl sm:text-2xl text-white text-center italic font-semibold">
            Put some strategy on your game!
          </p>
        </div>
        <div className="bg-white rounded-2xl p-5 card-shadow border-4 border-stone-800 mb-5">
          <h2 className="handwritten text-2xl text-stone-800 font-bold mb-4">Ονόματα ομάδων</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl flex-shrink-0">🔴</span>
              <input
                type="text"
                value={names[0]}
                onChange={(e) => setNames([e.target.value, names[1]])}
                placeholder="RED team"
                className="body-font flex-1 border-2 border-red-400 rounded-xl px-3 py-3 text-lg focus:outline-none focus:ring-4 focus:ring-red-200 min-h-[52px]"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl flex-shrink-0">🔵</span>
              <input
                type="text"
                value={names[1]}
                onChange={(e) => setNames([names[0], e.target.value])}
                placeholder="BLUE team"
                className="body-font flex-1 border-2 border-blue-500 rounded-xl px-3 py-3 text-lg focus:outline-none focus:ring-4 focus:ring-blue-200 min-h-[52px]"
              />
            </div>
          </div>
        </div>
        <button
          onClick={() => onStart([names[0].trim() || 'RED team', names[1].trim() || 'BLUE team'])}
          className="body-font bg-stone-800 text-white py-4 px-10 rounded-2xl text-xl font-bold active:bg-stone-700 transition card-shadow min-h-[56px]"
        >
          Ας παίξουμε! 🎮
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// COIN FLIP
// ============================================================================
function CoinFlip({ sharedStyle, teamNames, onComplete }) {
  const [phase, setPhase] = useState('loading');
  const [question, setQuestion] = useState(null);
  const [guesses, setGuesses] = useState(['', '']);
  const [input, setInput] = useState('');
  const [winner, setWinner] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetch('/api/coinflip')
      .then(r => r.json())
      .then(q => { setQuestion(q); setPhase('ready'); })
      .catch(() => setPhase('error'));
  }, []);

  function handleGuess() {
    if (!input.trim() || isNaN(parseInt(input))) return;
    const val = parseInt(input);
    inputRef.current?.blur();

    if (phase === 'team1') {
      setGuesses([val, '']);
      setInput('');
      setPhase('team2');
    } else if (phase === 'team2') {
      const g0 = guesses[0];
      const g1 = val;
      const correct = parseInt(question.answer.replace(/\D/g, ''), 10);
      const diff0 = Math.abs(g0 - correct);
      const diff1 = Math.abs(g1 - correct);
      const w = diff0 <= diff1 ? 0 : 1;
      setGuesses([g0, g1]);
      setWinner(w);
      setPhase('reveal');
    }
  }

  const winnerColor = winner === 0 ? 'text-red-600' : 'text-blue-700';
  const winnerBg = winner === 0 ? 'bg-red-600' : 'bg-blue-700';

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 px-4 flex flex-col items-center justify-center safe-bottom" style={{ fontFamily: "'Patrick Hand', cursive" }}>
      <style>{sharedStyle}</style>
      <div className="max-w-md w-full">
        <div className="text-center mb-5">
          <h2 className="handwritten text-3xl text-stone-800 font-bold mb-1">Ποιος ξεκινάει;</h2>
          <p className="body-font text-stone-500">{teamNames[0]} <span className="mx-2 text-stone-300">vs</span> {teamNames[1]}</p>
        </div>

        {phase === 'loading' && (
          <p className="body-font text-center text-stone-500 animate-pulse">Φόρτωση ερώτησης…</p>
        )}

        {phase === 'error' && (
          <div className="text-center space-y-3">
            <p className="body-font text-red-500">Δεν φορτώθηκε ερώτηση.</p>
            <button onClick={() => onComplete(0)} className="body-font bg-stone-800 text-white py-3 px-6 rounded-xl min-h-[48px]">
              Συνέχεια χωρίς ερώτηση
            </button>
          </div>
        )}

        {phase === 'ready' && (
          <div className="bg-white rounded-2xl p-5 card-shadow text-center space-y-4">
            <p className="body-font text-stone-500 text-xs uppercase tracking-wide">Ερώτηση νομίσματος</p>
            <p className="body-font text-stone-800 text-lg font-bold leading-snug">{question.q}</p>
            <p className="body-font text-stone-500 text-sm">Κάθε ομάδα δίνει εκτίμηση — ο πιο κοντά διαλέγει σειρά</p>
            <button
              onClick={() => setPhase('team1')}
              className="body-font w-full bg-stone-800 text-white py-3 rounded-xl text-lg font-bold active:bg-stone-700 transition min-h-[52px]">
              Ξεκινάμε →
            </button>
          </div>
        )}

        {phase === 'team1' && (
          <div className="bg-red-50 border-4 border-red-500 rounded-2xl p-5 card-shadow space-y-4">
            <p className="body-font text-red-600 font-bold text-center text-lg">🔴 {teamNames[0]}</p>
            <p className="body-font text-stone-800 font-bold text-center leading-snug">{question.q}</p>
            <input
              ref={inputRef}
              type="number"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGuess()}
              placeholder="Εκτίμηση..."
              className="body-font w-full border-2 border-red-300 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:border-red-500 min-h-[52px]"
            />
            <button
              onClick={handleGuess}
              disabled={!input.trim()}
              className="body-font w-full bg-red-600 text-white py-3 rounded-xl text-lg font-bold active:bg-red-700 disabled:opacity-40 transition min-h-[52px]">
              Κλείδωμα →
            </button>
          </div>
        )}

        {phase === 'team2' && (
          <div className="bg-blue-50 border-4 border-blue-500 rounded-2xl p-5 card-shadow space-y-4">
            <p className="body-font text-blue-700 font-bold text-center text-lg">🔵 {teamNames[1]}</p>
            <p className="body-font text-stone-800 font-bold text-center leading-snug">{question.q}</p>
            <input
              ref={inputRef}
              type="number"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGuess()}
              placeholder="Εκτίμηση..."
              className="body-font w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:border-blue-500 min-h-[52px]"
            />
            <button
              onClick={handleGuess}
              disabled={!input.trim()}
              className="body-font w-full bg-blue-700 text-white py-3 rounded-xl text-lg font-bold active:bg-blue-800 disabled:opacity-40 transition min-h-[52px]">
              Κλείδωμα →
            </button>
          </div>
        )}

        {phase === 'reveal' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 card-shadow text-center">
              <p className="body-font text-stone-500 text-sm mb-1">{question.q}</p>
              <p className="body-font text-stone-500 text-xs">Σωστή απάντηση</p>
              <span className="handwritten text-5xl font-bold text-amber-600">
                {question.answer}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map(i => {
                const correct = parseInt(question.answer.replace(/\D/g, ''), 10);
                const diff = Math.abs(guesses[i] - correct);
                const isWinner = i === winner;
                return (
                  <div key={i} className={`rounded-xl p-3 text-center border-4 transition-all ${
                    isWinner
                      ? i === 0 ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-blue-500'
                      : 'bg-stone-100 border-stone-200 opacity-50'
                  }`}>
                    <p className={`body-font text-xs font-bold uppercase mb-1 ${i === 0 ? 'text-red-600' : 'text-blue-700'}`}>
                      {i === 0 ? '🔴' : '🔵'} {teamNames[i]}
                    </p>
                    <p className="handwritten text-3xl font-bold text-stone-800">{guesses[i]}'</p>
                    <p className="body-font text-xs text-stone-400">Δ {diff}'</p>
                    {isWinner && <p className="handwritten text-base text-green-600 font-bold mt-1">✓ Επιλέγει!</p>}
                  </div>
                );
              })}
            </div>

            <div className={`rounded-xl py-3 text-center ${winnerBg}`}>
              <span className="handwritten text-2xl text-white font-bold">
                {teamNames[winner]} επιλέγει σειρά!
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onComplete(winner)}
                className="body-font bg-stone-800 text-white py-3 rounded-xl font-bold active:bg-stone-700 min-h-[52px]">
                Παίζω 1ος 🥇
              </button>
              <button
                onClick={() => onComplete(winner === 0 ? 1 : 0)}
                className="body-font bg-stone-500 text-white py-3 rounded-xl font-bold active:bg-stone-400 min-h-[52px]">
                Παίζω 2ος
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PrivilegeChoice({ sharedStyle, winnerName, onChoose }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50 px-4">
      <style>{sharedStyle}</style>
      <div className="max-w-sm w-full text-center space-y-4">
        <h2 className="handwritten text-3xl text-stone-800 font-bold">{winnerName} κέρδισε!</h2>
        <p className="body-font text-stone-600">Διάλεξε τι θα κρατήσεις:</p>
        <button onClick={() => onChoose('categories')}
          className="w-full bg-purple-700 text-white py-4 rounded-xl font-bold body-font text-lg card-shadow">
          Δομώ το παιχνίδι
        </button>
        <button onClick={() => onChoose('order')}
          className="w-full bg-blue-700 text-white py-4 rounded-xl font-bold body-font text-lg card-shadow">
          Διαλέγω σειρά
        </button>
      </div>
    </div>
  );
}

function OrderPicker({ sharedStyle, pickerName, onChoose }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50 px-4">
      <style>{sharedStyle}</style>
      <div className="max-w-sm w-full text-center space-y-4">
        <h2 className="handwritten text-3xl text-stone-800 font-bold">{pickerName}</h2>
        <p className="body-font text-stone-600">Διάλεξε σειρά:</p>
        <button onClick={() => onChoose(0)} className="w-full bg-red-600 text-white py-4 rounded-xl font-bold body-font text-lg card-shadow">
          Παίζω πρώτος/η
        </button>
        <button onClick={() => onChoose(1)} className="w-full bg-blue-700 text-white py-4 rounded-xl font-bold body-font text-lg card-shadow">
          Παίζει πρώτος/η ο αντίπαλος
        </button>
      </div>
    </div>
  );
}

function CategoryPicker({ sharedStyle, pickerName, bank, onConfirm }) {
  const [selected, setSelected] = useState([]);
  const toggle = (cat) => {
    setSelected((prev) =>
      prev.includes(cat.name) ? prev.filter((n) => n !== cat.name)
      : prev.length < 2 ? [...prev, cat.name] : prev
    );
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 px-4 py-6">
      <style>{sharedStyle}</style>
      <div className="max-w-sm mx-auto space-y-4">
        <h2 className="handwritten text-3xl text-stone-800 font-bold text-center">{pickerName}</h2>
        <p className="body-font text-stone-600 text-center">Διάλεξε 2 κατηγορίες ({selected.length}/2)</p>
        <div className="grid grid-cols-2 gap-2">
          {bank.map((cat) => {
            const isSel = selected.includes(cat.name);
            return (
              <button key={cat.name} onClick={() => toggle(cat)}
                className="rounded-xl p-3 font-bold body-font text-sm card-shadow border-4"
                style={{ backgroundColor: cat.bg, color: cat.textColor, borderColor: isSel ? '#1c1917' : 'transparent', opacity: isSel ? 1 : 0.55 }}>
                {cat.name}
              </button>
            );
          })}
        </div>
        <button disabled={selected.length !== 2}
          onClick={() => onConfirm(bank.filter((c) => selected.includes(c.name)))}
          className="w-full bg-stone-800 text-white py-4 rounded-xl font-bold body-font text-lg disabled:opacity-40">
          Επιβεβαίωση
        </button>
      </div>
    </div>
  );
}
// ============================================================================
// FINISHED SCREEN
// ============================================================================
function FinishedScreen({ sharedStyle, teamNames, scores, breakdown, winnerIdx, onNewGame, Categories }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const isTie = winnerIdx === null;
  const winnerBg = isTie ? 'from-stone-500 to-stone-700' : winnerIdx === 0 ? 'from-red-500 to-red-700' : 'from-blue-600 to-blue-800';

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 px-4 flex flex-col items-center justify-center safe-bottom" style={{ fontFamily: "'Patrick Hand', cursive" }}>
      <style>{sharedStyle}</style>
      <div className="max-w-md w-full text-center">
        <Trophy size={72} className="text-amber-500 mx-auto mb-2" strokeWidth={2} />
        <h1 className="handwritten text-4xl text-stone-800 font-bold mb-2">Τέλος παιχνιδιού!</h1>
        <div className={`bg-gradient-to-br ${winnerBg} rounded-2xl p-5 my-4 card-shadow`}>
          {isTie ? (
            <>
              <p className="body-font text-white/80 text-sm mb-1">Αποτέλεσμα</p>
              <p className="handwritten text-4xl text-white font-bold leading-tight break-words">🤝 Ισοπαλία!</p>
            </>
          ) : (
            <>
              <p className="body-font text-white/80 text-sm mb-1">Νικητές</p>
              <p className="handwritten text-4xl text-white font-bold leading-tight break-words">{teamNames[winnerIdx]} 🏆</p>
            </>
          )}
        </div>
        <div className="bg-white rounded-2xl p-4 card-shadow mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="body-font text-red-600 font-bold text-sm truncate">{teamNames[0]}</div>
              <div className="handwritten text-5xl text-red-600 font-bold">{scores[0]}</div>
            </div>
            <div>
              <div className="body-font text-blue-700 font-bold text-sm truncate">{teamNames[1]}</div>
              <div className="handwritten text-5xl text-blue-700 font-bold">{scores[1]}</div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={() => setShowBreakdown(true)} className="body-font bg-white border-2 border-stone-300 text-stone-700 py-3 rounded-xl text-sm font-bold active:bg-stone-50 min-h-[48px]">
            📊 Αναλυτική κατάσταση βαθμών
          </button>
          <button onClick={onNewGame} className="body-font bg-stone-800 text-white py-3 rounded-xl text-lg font-bold active:bg-stone-700 flex items-center justify-center gap-2 min-h-[52px]">
            <RotateCcw size={18} /> Νέο παιχνίδι
          </button>
        </div>
      </div>
      {showBreakdown && <BreakdownModal breakdown={breakdown} totals={scores} teamNames={teamNames} categories={categories} onClose={() => setShowBreakdown(false)} />}
    </div>
  );
}
