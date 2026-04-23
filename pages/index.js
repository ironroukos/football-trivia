import React, { useState, useEffect, useRef } from 'react';
import { Beer, Check, X, RotateCcw, Sparkles, Minus, Plus, HelpCircle, Trophy, AlertTriangle } from 'lucide-react';

// ============================================================================
// UTILITIES
// ============================================================================
const greekToLatin = {
  'α':'a','β':'b','γ':'g','δ':'d','ε':'e','ζ':'z','η':'i',
  'θ':'th','ι':'i','κ':'k','λ':'l','μ':'m','ν':'n','ξ':'x',
  'ο':'o','π':'p','ρ':'r','σ':'s','ς':'s','τ':'t','υ':'y',
  'φ':'f','χ':'ch','ψ':'ps','ω':'o',
  'Α':'a','Β':'b','Γ':'g','Δ':'d','Ε':'e','Ζ':'z','Η':'i',
  'Θ':'th','Ι':'i','Κ':'k','Λ':'l','Μ':'m','Ν':'n','Ξ':'x',
  'Ο':'o','Π':'p','Ρ':'r','Σ':'s','Τ':'t','Υ':'y',
  'Φ':'f','Χ':'ch','Ψ':'ps','Ω':'o',
};
 
function normalize(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')       // Raúl → Raul
    .toLowerCase()
    .trim()
    .split('').map(c => greekToLatin[c] || c).join('')  // Greek → Latin
    .replace(/\s+/g, ' ');
}
// ============================================================================
// CATEGORY CONFIG
// ============================================================================
const CATEGORIES = [
  { name: 'History',         multipliers: [2, 2],    bg: '#8B4A2B', textColor: '#fff5e6' },
  { name: 'Geography',       multipliers: [2, 2],    bg: '#4A9FD9', textColor: '#ffffff' },
  { name: 'Logo Quiz',       multipliers: [2, 2],    bg: '#C8102E', textColor: '#ffffff' },
  { name: 'Retro Transfers', multipliers: [2, 2],    bg: '#1B4E7C', textColor: '#ffffff' },
  { name: 'Player ID',       multipliers: [2, 2],    bg: '#7B3FBF', textColor: '#ffffff' },
  { name: 'Club Combo',      multipliers: [2, 2],    bg: '#EA7E1E', textColor: '#ffffff' },
  { name: "Who's Missing",   multipliers: [3, 3],    bg: '#7BC142', textColor: '#f5ffe8' },
  { name: 'Top 5',           multipliers: [3, 3],    bg: '#4A7C28', textColor: '#f5ffe8' },
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

async function generateFiftyFifty(sheetAnswer, category, questionContext = '') {
  try {
    const res = await fetch('/api/fifty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetAnswer, category, questionContext }),
    });
    const data = await res.json();
    return data.options;
  } catch {
    return [sheetAnswer.split('|')[0], 'Άλλη επιλογή'];
  }
}

// ============================================================================
// SHARED CSS
// ============================================================================
const sharedStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Patrick+Hand&display=swap');
  .handwritten { font-family: 'Caveat', cursive; }
  .body-font { font-family: 'Patrick Hand', cursive; }
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
`;

// ============================================================================
// MAIN APP
// ============================================================================
export default function FootballTrivia() {
  const [scores, setScores] = useState([0, 0]);
  const [scoreBreakdown, setScoreBreakdown] = useState({ 0: {}, 1: {} });
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [usedQuestions, setUsedQuestions] = useState({});
  const [turn, setTurn] = useState(0);
  const [powerUps, setPowerUps] = useState({ 0: { x2: true, fifty: true }, 1: { x2: true, fifty: true } });
  const [activePowerUp, setActivePowerUp] = useState(null);
  const [questionResolved, setQuestionResolved] = useState(false);
  const [phase, setPhase] = useState('landing');
  const [teamNames, setTeamNames] = useState(['RED team', 'BLUE team']);

  // FIX #4: Fetch questions from the API instead of using hardcoded mock data
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

  const totalSlots = CATEGORIES.reduce((sum, c) => sum + c.multipliers.length, 0);

  useEffect(() => {
    if (phase !== 'play') return;
    if (Object.keys(usedQuestions).length >= totalSlots) {
      if (scores[0] === scores[1]) setPhase('tiebreaker');
      else setPhase('finished');
    }
  }, [usedQuestions, phase, scores, totalSlots]);

  const openQuestion = (category, multiplier, slotIndex) => {
    const key = `${category}-${slotIndex}`;
    if (usedQuestions[key]) return;

    const pool = questions[category] || [];
    if (pool.length === 0) return;

    const question = pool[Math.floor(Math.random() * pool.length)];
    if (!question) return;

    // FIX #3: Include 'category' in the active question state
    setActiveQuestion({ ...question, category, multiplier, slotKey: key });
  };

  const handleUsePowerUp = (type) => {
    if (!powerUps[turn][type]) return;
    if (type === 'x2' && activeQuestion) return;
    if (type === 'fifty' && !activeQuestion) return;
    setActivePowerUp(type);
  };

  // FIX #7: Single source of truth for power-up consumption via a ref guard
  const powerUpConsumedRef = useRef(false);

  const consumePowerUp = (type) => {
    if (powerUpConsumedRef.current) return;
    powerUpConsumedRef.current = true;
    setPowerUps((prev) => ({
      ...prev,
      [turn]: { ...prev[turn], [type]: false },
    }));
  };

  // FIX #6: Simplified awardPoints — power-up multiplying always done here, not in child components
  const awardPoints = (basePoints) => {
    setQuestionResolved(true);
    let pts = basePoints;

    if (activePowerUp === 'x2') {
      pts = basePoints * 2;
      consumePowerUp('x2');
    } else if (activePowerUp === 'fifty') {
      pts = 1;
      consumePowerUp('fifty');
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
    powerUpConsumedRef.current = false; // reset for next question
  };

  const resetGame = () => {
    setScores([0, 0]);
    setScoreBreakdown({ 0: {}, 1: {} });
    setUsedQuestions({});
    setTurn(0);
    setPowerUps({ 0: { x2: true, fifty: true }, 1: { x2: true, fifty: true } });
    setActivePowerUp(null);
    setActiveQuestion(null);
    setQuestionResolved(false);
    powerUpConsumedRef.current = false;
    setPhase('landing');
  };

  const startGame = (startingTeam) => {
    setTurn(startingTeam);
    setPhase('play');
  };

  const resolveTiebreaker = (winnerIdx) => {
    setScores((prev) => {
      const next = [...prev];
      next[winnerIdx] += 1;
      return next;
    });
    setPhase('finished');
  };

  if (phase === 'landing') {
    return <LandingPage sharedStyle={sharedStyle} teamNames={teamNames} onStart={(names) => { setTeamNames(names); setPhase('coinflip'); }} />;
  }

  if (phase === 'coinflip') {
    return <CoinFlip sharedStyle={sharedStyle} teamNames={teamNames} onComplete={(winnerIdx) => startGame(winnerIdx)} />;
  }

  if (phase === 'tiebreaker') {
    return <Tiebreaker sharedStyle={sharedStyle} teamNames={teamNames} onWinner={resolveTiebreaker} />;
  }

  if (phase === 'finished') {
    const winnerIdx = scores[0] > scores[1] ? 0 : 1;
    return <FinishedScreen sharedStyle={sharedStyle} teamNames={teamNames} scores={scores} breakdown={scoreBreakdown} winnerIdx={winnerIdx} onNewGame={resetGame} />;
  }

  // PLAY PHASE
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 p-4 pb-10" style={{ fontFamily: "'Patrick Hand', cursive" }}>
      <style>{sharedStyle}</style>

      <div className="max-w-md mx-auto">
        <header className="flex items-center justify-center gap-3 pt-4 pb-3">
          <Beer size={44} className="text-amber-500" strokeWidth={2.5} />
          <h1 className="handwritten text-4xl font-bold text-stone-800">FOOTBALL TRIVIA</h1>
        </header>

        <div className="bg-red-600 rounded-2xl py-2 px-4 mb-4 transform -rotate-1 card-shadow">
          <p className="handwritten text-2xl text-white text-center italic font-semibold">
            Put some strategy on your game!
          </p>
        </div>

        {/* FIX #4: Show loading / error state for questions */}
        {questionsLoading && (
          <div className="text-center py-4 body-font text-stone-500 flex items-center justify-center gap-2">
            <Sparkles size={18} className="animate-spin text-amber-500" />
            Φόρτωση ερωτήσεων…
          </div>
        )}
        {questionsError && (
          <div className="bg-red-100 border-2 border-red-400 rounded-xl p-3 mb-3 text-center body-font text-red-700 text-sm">
            ⚠️ Αδυναμία φόρτωσης ερωτήσεων: {questionsError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-5">
          {CATEGORIES.map((cat) => (
            <CategoryCard key={cat.name} category={cat} usedQuestions={usedQuestions} onPick={openQuestion} hasQuestions={(questions[cat.name] || []).length > 0} />
          ))}
        </div>

        <div className="text-center mb-3">
          <span className="body-font text-lg text-stone-600">
            Σειρά:{' '}
            <span className={turn === 0 ? 'text-red-600 font-bold' : 'text-blue-700 font-bold'}>
              {teamNames[turn]}
            </span>
          </span>
        </div>

        <div className="bg-stone-100 rounded-2xl p-4 card-shadow">
          <div className="bg-white border-2 border-stone-800 rounded-xl py-2 px-8 mx-auto mb-4 w-fit">
            <h2 className="handwritten text-3xl text-stone-800 font-bold">Score</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TeamPanel
              color="red" name={teamNames[0]} value={scores[0]}
              onChange={(v) => setScores([v, scores[1]])}
              active={turn === 0} powerUps={powerUps[0]}
              activePowerUp={turn === 0 ? activePowerUp : null}
              onArmX2={() => turn === 0 && handleUsePowerUp('x2')}
              onDisarmX2={() => turn === 0 && setActivePowerUp(null)}
              disabled={!!activeQuestion}
            />
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
            <div className="mt-3 bg-amber-100 border-2 border-amber-500 rounded-xl py-2 px-3 text-center">
              <span className="handwritten text-xl text-amber-800 font-bold">
                ⚡ ×2 ενεργό — διάλεξε ερώτηση τώρα!
              </span>
            </div>
          )}
          <button
            onClick={() => setShowBreakdown(true)}
            className="mt-3 w-full body-font text-stone-700 bg-white border-2 border-stone-300 hover:bg-stone-50 rounded-xl py-2 text-sm font-bold flex items-center justify-center gap-2"
          >
            📊 Αναλυτική κατάσταση βαθμών
          </button>
        </div>

        <button
          onClick={resetGame}
          className="mt-5 mx-auto flex items-center gap-2 bg-stone-800 text-white py-2 px-5 rounded-full body-font text-lg hover:bg-stone-700 transition"
        >
          <RotateCcw size={18} /> Νέο παιχνίδι
        </button>
      </div>

      {showBreakdown && (
        <BreakdownModal breakdown={scoreBreakdown} totals={scores} teamNames={teamNames} onClose={() => setShowBreakdown(false)} />
      )}

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
// CATEGORY CARD
// ============================================================================
function CategoryCard({ category, usedQuestions, onPick, hasQuestions }) {
  return (
    <div className="rounded-xl overflow-hidden card-shadow" style={{ backgroundColor: category.bg }}>
      <div className="py-2 px-3 text-center border-b-2" style={{ borderColor: 'rgba(0,0,0,0.2)' }}>
        <h3 className="handwritten text-xl font-bold leading-tight" style={{ color: category.textColor }}>
          {category.name}
        </h3>
      </div>
      <div className="flex justify-around items-center py-3 gap-2 px-2">
        {category.multipliers.map((mult, idx) => {
          const used = usedQuestions[`${category.name}-${idx}`];
          return (
            <button
              key={idx}
              onClick={() => onPick(category.name, mult, idx)}
              disabled={used || !hasQuestions}
              title={!hasQuestions ? 'Ερωτήσεις μη διαθέσιμες' : undefined}
              className={`w-11 h-11 rounded-full bg-white body-font text-base font-bold text-stone-800 chip-shadow transition ${
                used || !hasQuestions ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 active:scale-95'
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
// TEAM PANEL
// ============================================================================
function TeamPanel({ color, name, value, onChange, active, powerUps, activePowerUp, onArmX2, onDisarmX2, disabled }) {
  const borderColor = color === 'red' ? 'border-red-600' : 'border-blue-700';
  const textColor = color === 'red' ? 'text-red-600' : 'text-blue-700';
  const bgAccent = color === 'red' ? 'bg-red-50' : 'bg-blue-50';
  const ring = active ? 'ring-4 ring-amber-300' : '';
  const x2Armed = activePowerUp === 'x2';

  return (
    <div className={`${bgAccent} border-4 ${borderColor} ${ring} rounded-xl p-3 transition-all`}>
      {name && (
        <div className={`text-center body-font font-bold text-sm mb-1 truncate ${textColor}`}>{name}</div>
      )}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => onChange(Math.max(0, value - 1))} className={`${textColor} hover:bg-white/50 rounded-full p-1`}>
          <Minus size={14} />
        </button>
        <span className={`handwritten text-3xl font-bold ${textColor}`}>{value}</span>
        <button onClick={() => onChange(value + 1)} className={`${textColor} hover:bg-white/50 rounded-full p-1`}>
          <Plus size={14} />
        </button>
      </div>
      <div className="flex gap-1 justify-center">
        <button
          onClick={x2Armed ? onDisarmX2 : onArmX2}
          disabled={!active || !powerUps.x2 || disabled}
          title={
            !powerUps.x2 ? 'Έχει χρησιμοποιηθεί'
            : !active ? 'Μόνο η ενεργή ομάδα'
            : disabled ? 'Ολοκλήρωσε την τρέχουσα ερώτηση'
            : x2Armed ? 'Πάτα ξανά για ακύρωση'
            : 'Ενεργοποίηση για την επόμενη ερώτηση'
          }
          className={`text-xs px-2 py-1 rounded-full border-2 font-bold transition ${
            !powerUps.x2
              ? 'bg-stone-200 border-stone-300 text-stone-400 line-through cursor-not-allowed'
              : x2Armed
              ? 'bg-amber-500 border-amber-700 text-white active-powerup'
              : active && !disabled
              ? 'bg-amber-400 border-amber-600 text-stone-900 hover:bg-amber-300 cursor-pointer'
              : 'bg-amber-200 border-amber-400 text-stone-700 cursor-not-allowed opacity-70'
          }`}
        >
          {x2Armed ? '⚡ ×2' : '×2'}
        </button>
        <span
          title="50/50 — χρήση μέσα στην ερώτηση"
          className={`text-xs px-2 py-1 rounded-full border-2 font-bold ${
            powerUps.fifty ? 'bg-cyan-400 border-cyan-600 text-stone-900' : 'bg-stone-200 border-stone-300 text-stone-400 line-through'
          }`}
        >
          50/50
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// BREAKDOWN MODAL
// ============================================================================
function BreakdownModal({ breakdown, totals, teamNames = ['RED', 'BLUE'], onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-gradient-to-b from-amber-50 to-orange-50 rounded-2xl max-w-md w-full p-5 card-shadow border-4 border-stone-800 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="handwritten text-2xl text-stone-800 font-bold">Αναλυτικοί πόντοι</h3>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-800"><X size={24} /></button>
        </div>
        <div className="bg-white rounded-xl border-2 border-stone-300 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 bg-stone-100 px-3 py-2 body-font text-sm font-bold text-stone-600 border-b-2 border-stone-300">
            <span>Κατηγορία</span>
            <span className="text-red-600 w-20 text-center truncate" title={teamNames[0]}>{teamNames[0]}</span>
            <span className="text-blue-700 w-20 text-center truncate" title={teamNames[1]}>{teamNames[1]}</span>
          </div>
          {CATEGORIES.map((cat) => {
            const r = breakdown[0][cat.name] || 0;
            const b = breakdown[1][cat.name] || 0;
            return (
              <div key={cat.name} className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2 body-font border-b border-stone-100 items-center">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.bg }}></span>
                  <span className="text-stone-700">{cat.name}</span>
                </span>
                <span className={`w-20 text-center font-bold ${r > 0 ? 'text-red-600' : 'text-stone-300'}`}>{r}</span>
                <span className={`w-20 text-center font-bold ${b > 0 ? 'text-blue-700' : 'text-stone-300'}`}>{b}</span>
              </div>
            );
          })}
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 bg-stone-800 px-3 py-3 body-font">
            <span className="handwritten text-xl text-white font-bold">Σύνολο</span>
            <span className="handwritten text-2xl text-red-400 w-12 text-center font-bold">{totals[0]}</span>
            <span className="handwritten text-2xl text-blue-300 w-12 text-center font-bold">{totals[1]}</span>
          </div>
        </div>
        <button onClick={onClose} className="mt-4 w-full body-font bg-stone-800 text-white py-2 rounded-xl hover:bg-stone-700">
          Κλείσιμο
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// QUESTION MODAL
// ============================================================================
function QuestionModal({ question, onFinish, onAward, onResolved, activePowerUp, onUsePowerUp, availablePowerUps, turn }) {
  // FIX #6: multiplier display accounts for x2 correctly
  const displayMultiplier = activePowerUp === 'x2'
    ? question.multiplier * 2
    : activePowerUp === 'fifty'
    ? 1
    : question.multiplier;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-gradient-to-b from-amber-50 to-orange-50 rounded-2xl max-w-md w-full my-4 p-5 card-shadow border-4 border-stone-800">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="body-font text-sm text-stone-500 uppercase tracking-wider">{question.category}</div>
            <div className="handwritten text-xl text-amber-700 font-bold">
              Αξίζει ×{displayMultiplier}
              {activePowerUp === 'x2' && <span className="text-amber-500"> (×2 active!)</span>}
              {activePowerUp === 'fifty' && <span className="text-cyan-600"> (50/50 active)</span>}
            </div>
          </div>
          <button onClick={onFinish} className="text-stone-500 hover:text-stone-800"><X size={24} /></button>
        </div>

        {!activePowerUp && question.type !== 'top5' && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => onUsePowerUp('fifty')}
              disabled={!availablePowerUps.fifty}
              className="flex-1 flex items-center justify-center gap-2 bg-cyan-400 border-2 border-cyan-600 text-stone-900 py-2 rounded-xl body-font font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cyan-300 transition"
            >
              <HelpCircle size={16} /> Χρήση 50/50
            </button>
          </div>
        )}

        {(() => {
          const props = { question, onFinish, onAward, onResolved, activePowerUp };
          switch (question.type) {
            case 'logo':       return <LogoQuestion {...props} />;
            case 'imageText':  return <ImageTextQuestion {...props} />;
            case 'transfer':   return <TransferQuestion {...props} />;
            case 'careerTable':return <CareerTableQuestion {...props} />;
            case 'lineup':     return <LineupQuestion {...props} />;
            case 'top5':       return <Top5Question {...props} />;
            default:           return <TextQuestion {...props} />;
          }
        })()}
      </div>
    </div>
  );
}

// ============================================================================
// SHARED ANSWER INPUT
// ============================================================================
function AnswerInput({ question, onFinish, onAward, onResolved, activePowerUp }) {
  const [userAnswer, setUserAnswer] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [fiftyOptions, setFiftyOptions] = useState(null);
  const [loadingFifty, setLoadingFifty] = useState(false);

  useEffect(() => {
    if (activePowerUp === 'fifty' && !fiftyOptions && !loadingFifty) {
      setLoadingFifty(true);
      generateFiftyFifty(question.a, question.category, question.q).then((opts) => {
        setFiftyOptions(opts);
        setLoadingFifty(false);
      });
    }
  }, [activePowerUp, fiftyOptions, loadingFifty, question]);

  const submit = async (answerText) => {
    if (!answerText || verifying || result) return;
    setVerifying(true);
    const verdict = await verifyAnswer(question.a, answerText, question.q, question.category, question.verifyLive);
    setResult(verdict);
    setVerifying(false);
    if (onResolved) onResolved();
    if (verdict.correct) onAward(question.multiplier);
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
          <p className="body-font text-stone-600 text-sm mb-1">Σωστή απάντηση: <strong>{result.canonical}</strong></p>
        )}
        <p className="body-font text-stone-700 text-sm">{result.note}</p>
        <button onClick={onFinish} className="body-font mt-4 w-full bg-stone-800 text-white py-2 rounded-xl hover:bg-stone-700">
          Σειρά επόμενης ομάδας →
        </button>
      </div>
    );
  }

  if (activePowerUp === 'fifty') {
    if (loadingFifty || !fiftyOptions) {
      return (
        <div className="flex items-center justify-center gap-2 py-6">
          <Sparkles size={22} className="animate-spin text-cyan-600" />
          <span className="body-font text-lg text-stone-700">Το AI ετοιμάζει τις επιλογές…</span>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <p className="body-font text-sm text-cyan-700 text-center">Διάλεξε μία — οι πόντοι πέφτουν στο ×1</p>
        {fiftyOptions.map((opt, i) => (
          <button
            key={i}
            onClick={() => submit(opt)}
            disabled={verifying}
            className="w-full body-font bg-white border-2 border-cyan-600 text-stone-900 py-3 rounded-xl text-lg font-bold hover:bg-cyan-50 transition disabled:opacity-50"
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  return (
    <>
      <input
        type="text"
        value={userAnswer}
        onChange={(e) => setUserAnswer(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit(userAnswer)}
        disabled={verifying}
        placeholder="Η απάντησή σου…"
        className="body-font w-full border-2 border-stone-800 rounded-xl px-4 py-3 text-lg mb-4 bg-white focus:outline-none focus:ring-4 focus:ring-amber-300"
        autoFocus
      />
      <button
        onClick={() => submit(userAnswer)}
        disabled={verifying || !userAnswer.trim()}
        className="body-font w-full bg-stone-800 text-white py-3 rounded-xl text-lg flex items-center justify-center gap-2 hover:bg-stone-700 disabled:opacity-50 transition"
      >
        {verifying
          ? <><Sparkles size={20} className="animate-spin" /> Το AI ελέγχει…</>
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
      <p className="body-font text-xl text-stone-800 mb-5 leading-relaxed">{question.q}</p>
      <AnswerInput question={question} onFinish={onFinish} onAward={onAward} onResolved={onResolved} activePowerUp={activePowerUp} />
    </>
  );
}

function LogoQuestion({ question, onFinish, onAward, onResolved, activePowerUp }) {
  return (
    <>
      <p className="body-font text-xl text-stone-800 mb-3 text-center">{question.q}</p>
      <div className="bg-white rounded-xl p-4 mb-4 flex justify-center items-center h-48 border-2 border-stone-300">
        <img src={question.imageUrl} alt="Logo" className="max-h-40 max-w-full object-contain" />
      </div>
      <AnswerInput question={question} onFinish={onFinish} onAward={onAward} onResolved={onResolved} activePowerUp={activePowerUp} />
    </>
  );
}

function ImageTextQuestion({ question, onFinish, onAward, onResolved, activePowerUp }) {
  return (
    <>
      <div className="rounded-xl overflow-hidden mb-3 border-2 border-stone-300 bg-stone-100">
        <img src={question.imageUrl} alt="question" className="w-full max-h-64 object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
      </div>
      <p className="body-font text-lg text-stone-800 mb-4 text-center">{question.q}</p>
      <AnswerInput question={question} onFinish={onFinish} onAward={onAward} onResolved={onResolved} activePowerUp={activePowerUp} />
    </>
  );
}

function TransferQuestion({ question, onFinish, onAward, onResolved, activePowerUp }) {
  return (
    <>
      <div className="bg-stone-800 rounded-t-xl py-2 px-4 text-center">
        <span className="handwritten text-xl text-white">Καλοκαίρι {question.year}</span>
      </div>
      <div className="bg-green-600 rounded-b-xl p-4 mb-4 flex items-center justify-around">
        <span className="handwritten text-2xl text-white font-bold">{question.from}</span>
        <span className="text-white text-2xl">▶</span>
        <span className="handwritten text-2xl text-white font-bold">{question.to}</span>
      </div>
      <p className="body-font text-stone-600 text-center mb-3">Ποιος παίκτης έκανε αυτή τη μεταγραφή;</p>
      <AnswerInput question={question} onFinish={onFinish} onAward={onAward} onResolved={onResolved} activePowerUp={activePowerUp} />
    </>
  );
}

function CareerTableQuestion({ question, onFinish, onAward, onResolved, activePowerUp }) {
  return (
    <>
      <div className="bg-gradient-to-b from-purple-600 to-purple-800 rounded-xl p-3 mb-4">
        <div className="flex justify-between text-purple-100 body-font text-sm uppercase tracking-wide border-b border-purple-400 pb-2 mb-2">
          <span>Ομάδα</span><span>Περίοδος</span>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {(question.career || []).map(([team, period], i) => (
            <div key={i} className={`flex justify-between body-font text-white py-1.5 px-2 rounded ${i % 2 ? 'bg-purple-700/40' : ''}`}>
              <span>{team}</span><span className="text-purple-200">{period}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="body-font text-stone-600 text-center mb-3">Ποιος είναι αυτός ο παίκτης;</p>
      <AnswerInput question={question} onFinish={onFinish} onAward={onAward} onResolved={onResolved} activePowerUp={activePowerUp} />
    </>
  );
}

function WhosMissingQuestion({ question, onAward, onSkip, multiplier, activePowerUp, onUsePowerUp }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null); // null | 'correct' | 'wrong'
  const [verifying, setVerifying] = useState(false);
  const [hint, setHint] = useState(null);
 
  async function handleSubmit() {
    if (verifying || result) return;
    setVerifying(true);
 
    // Local normalize check first
    const normInput = normalize(input);
    const acceptedAnswers = question.answer.split('|').map(normalize);
 
    if (acceptedAnswers.includes(normInput)) {
      setResult('correct');
      setVerifying(false);
      onAward(multiplier);
      return;
    }
 
    // Claude verify
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.question,
          sheetAnswer: question.answer,
          userAnswer: input,
        }),
      });
      const data = await res.json();
      if (data.correct) {
        setResult('correct');
        onAward(multiplier);
      } else {
        setResult('wrong');
        onAward(0);
      }
    } catch {
      setResult('wrong');
      onAward(0);
    }
    setVerifying(false);
  }
 
  function use5050() {
    if (!onUsePowerUp || activePowerUp !== '5050') return;
    // For Who's Missing, 50/50 reveals first letter as hint
    setHint(`Αρχικό: ${question.answer.split('|')[0][0].toUpperCase()}`);
    onUsePowerUp();
  }
 
  return (
    <div className="space-y-3">
      {/* Image */}
      {question.image_url && (
        <img
          src={question.image_url}
          alt="Who's missing?"
          className="w-full rounded-xl object-cover max-h-64"
        />
      )}
 
      {/* Question text */}
      <p className="text-center font-semibold text-gray-700">{question.question}</p>
 
      {/* Hint from 50/50 */}
      {hint && (
        <p className="text-center text-amber-600 font-bold">{hint}</p>
      )}
 
      {/* Result */}
      {result === 'correct' && (
        <div className="bg-green-100 border border-green-400 rounded-lg p-3 text-center">
          <p className="text-green-700 font-bold">✓ Σωστό!</p>
          <button onClick={onSkip} className="mt-2 bg-stone-700 text-white px-4 py-1 rounded-lg font-bold">
            Επόμενο →
          </button>
        </div>
      )}
 
      {result === 'wrong' && (
        <div className="bg-red-100 border border-red-400 rounded-lg p-3 text-center">
          <p className="text-red-700 font-bold">✗ Λάθος!</p>
          <p className="text-sm text-gray-600">Σωστό: {question.answer.split('|')[0]}</p>
          <button onClick={onSkip} className="mt-2 bg-stone-700 text-white px-4 py-1 rounded-lg font-bold">
            Επόμενο →
          </button>
        </div>
      )}
 
      {!result && (
        <div className="flex gap-2">
          <input
            className="flex-1 border-2 border-gray-300 rounded-lg p-2 focus:outline-none focus:border-blue-500"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Ποιος λείπει;"
            autoFocus
            disabled={verifying}
          />
          <button
            onClick={handleSubmit}
            disabled={verifying}
            className="bg-blue-600 text-white px-4 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
            {verifying ? '...' : 'OK'}
          </button>
        </div>
      )}
 
      {/* 50/50 for this category gives a letter hint */}
      {activePowerUp === '5050' && !result && !hint && (
        <button onClick={use5050}
          className="w-full text-xs text-amber-600 underline">
          Χρησιμοποίησε 50/50 (αποκαλύπτει αρχικό γράμμα)
        </button>
      )}
    </div>
  );
}
// ============================================================================
// TOP 5 QUESTION — FIX #5: "Continue" button now works
// ============================================================================
 
function Top5Question({ question, multiplier, onAward, onFinish }) {
  const answers = (question.answer || '').split('|').map(a => a.trim());
  const [revealed, setRevealed] = useState([]);   // indices of correct answers found
  const [wrongAnswers, setWrongAnswers] = useState([]);  // list of wrong guesses (max 2)
  const [input, setInput] = useState('');
  const [done, setDone] = useState(false);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [verifying, setVerifying] = useState(false);
 
  async function handleSubmit() {
    if (done || verifying || !input.trim()) return;
    setVerifying(true);
 
    const normInput = normalize(input);
 
    // Check against all 5 answers
    const matchIdx = answers.findIndex(
      (a, i) => !revealed.includes(i) && normalize(a) === normInput
    );
 
    if (matchIdx !== -1) {
      // CORRECT
      const newRevealed = [...revealed, matchIdx];
      setRevealed(newRevealed);
      setInput('');
      setVerifying(false);
 
      if (newRevealed.length === 5) {
        // All 5 found → full points
        setDone(true);
        onAward(multiplier);
      } else if (newRevealed.length === 4) {
        // 4 found → ask stop or continue
        setShowStopDialog(true);
      }
    } else {
      // WRONG
      const newWrong = [...wrongAnswers, input.trim()];
      setWrongAnswers(newWrong);
      setInput('');
      setVerifying(false);
 
      if (newWrong.length >= 2) {
        // 2nd wrong → lose
        setDone(true);
        onAward(0);
      }
      // 1st wrong → warning, continue playing
    }
  }
 
  function handleStop() {
    // Player chooses to stop at 4 → 1 point
    setShowStopDialog(false);
    setDone(true);
    onAward(1);
  }
 
  function handleContinue() {
    // Player chooses to go for 5th
    setShowStopDialog(false);
    // Game continues, if they get wrong next → 0pts (handled above)
  }
 
  return (
    <div className="space-y-2">
 
      {/* WRONG ANSWER SLOT — top, red, shows last wrong guess */}
      <div className={`p-2 rounded-lg text-center font-bold text-sm transition-all
        ${wrongAnswers.length > 0
          ? 'bg-red-500 text-white'
          : 'bg-gray-100 text-gray-300 border-2 border-dashed border-red-200'}`}>
        {wrongAnswers.length > 0 ? `✗ ${wrongAnswers[wrongAnswers.length - 1]}` : '✗'}
      </div>
 
      {/* Warning after 1st wrong */}
      {wrongAnswers.length === 1 && !done && (
        <p className="text-red-500 text-xs text-center font-semibold">
          ⚠️ Ένα ακόμα λάθος και χάνεις την ερώτηση!
        </p>
      )}
 
      {/* 5 CORRECT SLOTS */}
      {answers.map((ans, i) => (
        <div key={i}
          className={`p-2 rounded-lg text-center font-bold transition-all
            ${revealed.includes(i)
              ? 'bg-green-500 text-white shadow-md'
              : 'bg-gray-100 text-gray-400'}`}>
          {revealed.includes(i) ? ans : `${i + 1}.`}
        </div>
      ))}
 
      {/* STOP OR CONTINUE DIALOG — shows when 4 correct */}
      {showStopDialog && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 text-center space-y-3">
          <p className="font-bold text-amber-800">
            4 σωστές! Σταματάς ή συνεχίζεις;
          </p>
          <p className="text-sm text-amber-700">
            Σταμάτα → <strong>1 πόντος</strong> &nbsp;|&nbsp;
            Συνέχισε → <strong>3 πόντοι</strong> (ή 0 αν λάθος)
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleStop}
              className="bg-amber-500 text-white px-5 py-2 rounded-lg font-bold hover:bg-amber-600">
              Σταματώ (1 πόντος)
            </button>
            <button
              onClick={handleContinue}
              className="bg-green-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-green-700">
              Συνεχίζω!
            </button>
          </div>
        </div>
      )}
 
      {/* INPUT */}
      {!done && !showStopDialog && (
        <div className="flex gap-2 mt-3">
          <input
            className="flex-1 border-2 border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Απάντηση..."
            autoFocus
            disabled={verifying}
          />
          <button
            onClick={handleSubmit}
            disabled={verifying}
            className="bg-blue-600 text-white px-4 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
            {verifying ? '...' : 'OK'}
          </button>
        </div>
      )}
 
      {/* DONE STATE */}
      {done && (
        <div className="space-y-2">
          {/* Reveal remaining answers */}
          <p className="text-center text-sm text-gray-500">Οι υπόλοιπες απαντήσεις:</p>
          {answers.map((ans, i) => (
            !revealed.includes(i) && (
              <div key={i} className="bg-gray-200 text-gray-600 rounded p-2 text-center text-sm">
                {ans}
              </div>
            )
          ))}
          <button
            onClick={onFinish}
            className="w-full bg-stone-700 text-white py-2 rounded-lg font-bold mt-2 hover:bg-stone-800">
            Επόμενο →
          </button>
        </div>
      )}
    </div>
  );
}
function ClubComboQuestion({ question, onAward, onSkip, multiplier, activePowerUp, onUsePowerUp }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
 
  async function handleSubmit() {
    if (verifying || result) return;
    setVerifying(true);
 
    const normInput = normalize(input);
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
          question: `Club Combo: ${question.question}. Find a player who played for BOTH clubs.`,
          sheetAnswer: question.answer,
          userAnswer: input,
        }),
      });
      const data = await res.json();
      if (data.correct) {
        setResult('correct');
        onAward(multiplier);
      } else {
        setResult('wrong');
        onAward(0);
      }
    } catch {
      setResult('wrong');
      onAward(0);
    }
    setVerifying(false);
  }
 
  // Parse question to check if it's "Team A & Team B" format
  const teamMatch = question.question.match(/^(.+?)\s*[&×+]\s*(.+)$/);
  const teamA = teamMatch?.[1]?.trim();
  const teamB = teamMatch?.[2]?.trim();
 
  return (
    <div className="space-y-3">
      {/* Team display */}
      {teamA && teamB ? (
        <div className="flex items-center justify-center gap-3 py-3">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-center min-w-[100px]">
            {teamA}
          </div>
          <span className="text-2xl font-black text-gray-400">&</span>
          <div className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-center min-w-[100px]">
            {teamB}
          </div>
        </div>
      ) : (
        <p className="text-center font-semibold text-gray-700">{question.question}</p>
      )}
 
      <p className="text-center text-sm text-gray-500">
        Βρες παίκτη που αγωνίστηκε και στις δύο ομάδες
      </p>
 
      {result === 'correct' && (
        <div className="bg-green-100 border border-green-400 rounded-lg p-3 text-center">
          <p className="text-green-700 font-bold">✓ Σωστό!</p>
          <button onClick={onSkip} className="mt-2 bg-stone-700 text-white px-4 py-1 rounded-lg font-bold">
            Επόμενο →
          </button>
        </div>
      )}
 
      {result === 'wrong' && (
        <div className="bg-red-100 border border-red-400 rounded-lg p-3 text-center">
          <p className="text-red-700 font-bold">✗ Λάθος!</p>
          <p className="text-sm text-gray-600">Ένας σωστός: {question.answer.split('|')[0]}</p>
          <button onClick={onSkip} className="mt-2 bg-stone-700 text-white px-4 py-1 rounded-lg font-bold">
            Επόμενο →
          </button>
        </div>
      )}
 
      {!result && (
        <div className="flex gap-2">
          <input
            className="flex-1 border-2 border-gray-300 rounded-lg p-2 focus:outline-none focus:border-blue-500"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Όνομα παίκτη..."
            autoFocus
            disabled={verifying}
          />
          <button
            onClick={handleSubmit}
            disabled={verifying}
            className="bg-blue-600 text-white px-4 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
            {verifying ? '...' : 'OK'}
          </button>
        </div>
      )}
    </div>
  );
}
 
// ============================================================================
// COIN FLIP
// ============================================================================
function CoinFlip({ sharedStyle, teamNames, onComplete }) {
  const [phase, setPhase] = useState('ready');
  const [winnerIdx, setWinnerIdx] = useState(null);

  const startFlip = () => {
    const winner = Math.random() < 0.5 ? 0 : 1;
    setWinnerIdx(winner);
    setPhase('flipping');
    setTimeout(() => setPhase('result'), 2700);
  };

  const winnerColor = winnerIdx === 0 ? 'text-red-600' : 'text-blue-700';
  const winnerBg = winnerIdx === 0 ? 'bg-red-600' : 'bg-blue-700';

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 p-4 flex flex-col items-center justify-center" style={{ fontFamily: "'Patrick Hand', cursive" }}>
      <style>{sharedStyle}</style>
      <div className="max-w-md w-full text-center">
        <h2 className="handwritten text-3xl text-stone-800 font-bold mb-2">Ποιος ξεκινάει;</h2>
        <p className="body-font text-stone-600 mb-8">{teamNames[0]} <span className="text-stone-400 mx-2">vs</span> {teamNames[1]}</p>
        <div className="flex justify-center mb-8" style={{ perspective: '1000px' }}>
          <div
            className={`w-40 h-40 rounded-full flex items-center justify-center font-bold text-white shadow-2xl ${phase === 'flipping' ? 'coin-flipping' : ''} ${phase === 'result' ? winnerBg : ''}`}
            style={{
              background: phase === 'result' ? undefined : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
              border: '6px solid rgba(0,0,0,0.15)',
            }}
          >
            {phase !== 'result' && <Beer size={72} strokeWidth={2.5} />}
            {phase === 'result' && <span className="handwritten text-3xl leading-none px-2 text-center">{teamNames[winnerIdx]}</span>}
          </div>
        </div>
        {phase === 'ready' && <button onClick={startFlip} className="body-font bg-stone-800 text-white py-3 px-8 rounded-xl text-lg font-bold hover:bg-stone-700 transition">🪙 Ρίξε το κέρμα</button>}
        {phase === 'flipping' && <p className="handwritten text-2xl text-stone-600 italic animate-pulse">Στρίβει…</p>}
        {phase === 'result' && (
          <div className="space-y-4">
            <p className="handwritten text-3xl font-bold">
              <span className={winnerColor}>{teamNames[winnerIdx]}</span>
              <span className="text-stone-800"> ξεκινάει!</span>
            </p>
            <button onClick={() => onComplete(winnerIdx)} className="body-font bg-stone-800 text-white py-3 px-8 rounded-xl text-lg font-bold hover:bg-stone-700 transition">Ας παίξουμε →</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TIEBREAKER
// ============================================================================
function Tiebreaker({ sharedStyle, teamNames, onWinner }) {
  const TIEBREAKERS = [
    { q: 'Ποιο έτος κέρδισε η Ελλάδα το Euro;', a: '2004' },
    { q: 'Πόσα Champions League έχει η Real Madrid; (αριθμός)', a: '15' },
    { q: 'Ποιος σκόραρε το πρώτο γκολ στον τελικό World Cup 2022;', a: 'Messi|Μέσι' },
    { q: 'Σε ποιο έτος ιδρύθηκε ο Ολυμπιακός;', a: '1925' },
    { q: 'Ποιος είναι ο πρώτος σκόρερ στην ιστορία του Champions League;', a: 'Cristiano Ronaldo|Ρονάλντο' },
  ];
  const [question] = useState(TIEBREAKERS[Math.floor(Math.random() * TIEBREAKERS.length)]);
  const [buzzer, setBuzzer] = useState(null);
  const [answer, setAnswer] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [attempted, setAttempted] = useState([false, false]);

  const buzz = (teamIdx) => {
    if (buzzer !== null || attempted[teamIdx]) return;
    setBuzzer(teamIdx);
    setAnswer('');
    setResult(null);
  };

  const submit = async () => {
    if (!answer.trim() || verifying) return;
    setVerifying(true);
    const verdict = await verifyAnswer(question.a, answer);
    setVerifying(false);
    if (verdict.correct) {
      setResult('correct');
      setTimeout(() => onWinner(buzzer), 1500);
    } else {
      setResult('wrong');
      const nextAttempted = [...attempted];
      nextAttempted[buzzer] = true;
      setAttempted(nextAttempted);
      setTimeout(() => {
        if (nextAttempted[0] && nextAttempted[1]) {
          onWinner(buzzer === 0 ? 1 : 0);
        } else {
          setBuzzer(null);
          setAnswer('');
          setResult(null);
        }
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 p-4 flex flex-col items-center justify-center" style={{ fontFamily: "'Patrick Hand', cursive" }}>
      <style>{sharedStyle}</style>
      <div className="max-w-md w-full">
        <div className="bg-amber-500 rounded-2xl py-3 px-4 mb-5 text-center card-shadow">
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle size={24} className="text-white" />
            <h2 className="handwritten text-2xl text-white font-bold">ΑΙΦΝΙΔΙΑΣΤΙΚΟΣ ΓΥΡΟΣ</h2>
          </div>
          <p className="body-font text-amber-50 text-sm mt-1">Ισοπαλία! Όποιος χτυπήσει το buzzer πρώτος & απαντήσει σωστά κερδίζει.</p>
        </div>
        <div className="bg-white rounded-2xl p-5 card-shadow mb-5 border-4 border-stone-800">
          <p className="body-font text-xl text-stone-800 text-center leading-relaxed">{question.q}</p>
        </div>
        {buzzer === null && !attempted.every(Boolean) && (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1].map((idx) => (
              <button key={idx} onClick={() => buzz(idx)} disabled={attempted[idx]}
                className={`py-8 rounded-2xl body-font text-xl font-bold border-4 transition card-shadow ${
                  attempted[idx]
                    ? 'bg-stone-200 border-stone-300 text-stone-400 line-through'
                    : idx === 0
                    ? 'bg-red-50 border-red-600 text-red-700 hover:bg-red-100 active:scale-95'
                    : 'bg-blue-50 border-blue-700 text-blue-800 hover:bg-blue-100 active:scale-95'
                }`}
              >
                {idx === 0 ? '🔴' : '🔵'}<br/>{teamNames[idx]}
              </button>
            ))}
          </div>
        )}
        {buzzer !== null && result === null && (
          <div className={`rounded-2xl p-4 border-4 card-shadow ${buzzer === 0 ? 'bg-red-50 border-red-600' : 'bg-blue-50 border-blue-700'}`}>
            <p className={`body-font font-bold text-center mb-3 ${buzzer === 0 ? 'text-red-700' : 'text-blue-800'}`}>{teamNames[buzzer]} — απάντα!</p>
            <input type="text" value={answer} onChange={(e) => setAnswer(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} disabled={verifying} placeholder="Η απάντηση…" className="body-font w-full border-2 border-stone-800 rounded-xl px-4 py-3 text-lg mb-3 bg-white focus:outline-none focus:ring-4 focus:ring-amber-300" autoFocus />
            <button onClick={submit} disabled={verifying || !answer.trim()} className="body-font w-full bg-stone-800 text-white py-3 rounded-xl text-lg font-bold flex items-center justify-center gap-2 hover:bg-stone-700 disabled:opacity-50">
              {verifying ? <><Sparkles size={20} className="animate-spin" /> Ελέγχει…</> : 'Υποβολή'}
            </button>
          </div>
        )}
        {result === 'correct' && (
          <div className="bg-green-100 border-4 border-green-600 rounded-2xl p-5 text-center card-shadow">
            <Check size={40} className="text-green-700 mx-auto mb-2" />
            <p className="handwritten text-3xl text-green-700 font-bold">Σωστά! {teamNames[buzzer]} νικάει!</p>
          </div>
        )}
        {result === 'wrong' && (
          <div className="bg-red-100 border-4 border-red-600 rounded-2xl p-5 text-center card-shadow">
            <X size={40} className="text-red-700 mx-auto mb-2" />
            <p className="handwritten text-2xl text-red-700 font-bold">
              {attempted.every(Boolean) ? 'Και οι δύο έχασαν!' : 'Λάθος! Σειρά αντιπάλου…'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// FINISHED SCREEN
// ============================================================================
function FinishedScreen({ sharedStyle, teamNames, scores, breakdown, winnerIdx, onNewGame }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const winnerBg = winnerIdx === 0 ? 'from-red-500 to-red-700' : 'from-blue-600 to-blue-800';

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 p-4 flex flex-col items-center justify-center" style={{ fontFamily: "'Patrick Hand', cursive" }}>
      <style>{sharedStyle}</style>
      <div className="max-w-md w-full text-center">
        <Trophy size={80} className="text-amber-500 mx-auto mb-3" strokeWidth={2} />
        <h1 className="handwritten text-4xl text-stone-800 font-bold mb-2">Τέλος παιχνιδιού!</h1>
        <div className={`bg-gradient-to-br ${winnerBg} rounded-2xl p-6 my-6 card-shadow`}>
          <p className="body-font text-white/80 text-sm mb-1">Νικητές</p>
          <p className="handwritten text-5xl text-white font-bold leading-tight break-words">{teamNames[winnerIdx]} 🏆</p>
        </div>
        <div className="bg-white rounded-2xl p-5 card-shadow mb-5">
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
          <button onClick={() => setShowBreakdown(true)} className="body-font bg-white border-2 border-stone-300 text-stone-700 py-2 rounded-xl text-sm font-bold hover:bg-stone-50">
            📊 Αναλυτική κατάσταση βαθμών
          </button>
          <button onClick={onNewGame} className="body-font bg-stone-800 text-white py-3 rounded-xl text-lg font-bold hover:bg-stone-700 flex items-center justify-center gap-2">
            <RotateCcw size={18} /> Νέο παιχνίδι
          </button>
        </div>
      </div>
      {showBreakdown && <BreakdownModal breakdown={breakdown} totals={scores} teamNames={teamNames} onClose={() => setShowBreakdown(false)} />}
    </div>
  );
}