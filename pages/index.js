import React, { useState, useEffect } from 'react';
import { Beer, Check, X, RotateCcw, Sparkles, Minus, Plus, Zap, HelpCircle, Trophy, AlertTriangle } from 'lucide-react';

// ============================================================================
// MOCK DATA — replace with Google Sheets fetch in production
// ============================================================================
const MOCK_QUESTIONS = {
  History: [
    { type: 'text', q: 'Ποια χώρα κέρδισε το πρώτο Παγκόσμιο Κύπελλο το 1930;', a: 'Ουρουγουάη|Uruguay' },
    { type: 'text', q: "Ποιος σκόραρε το γκολ 'Hand of God';", a: 'Maradona|Μαραντόνα' },
    { type: 'text', q: 'Σε ποιο έτος ξεκίνησε η Premier League;', a: '1992' },
  ],
  Geography: [
    { type: 'text', q: 'Σε ποια πόλη βρίσκεται το Camp Nou;', a: 'Βαρκελώνη|Barcelona' },
    { type: 'text', q: 'Το Wembley βρίσκεται σε ποια πόλη;', a: 'Λονδίνο|London' },
    { type: 'text', q: 'Σε ποια χώρα παίζεται η Serie A;', a: 'Ιταλία|Italy' },
  ],
  'Logo Quiz': [
    { type: 'logo', q: 'Ποιος σύλλογος;', a: 'Manchester United|Μάντσεστερ Γιουνάιτεντ', imageUrl: 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg' },
    { type: 'logo', q: 'Ποιος σύλλογος;', a: 'Borussia Dortmund|Ντόρτμουντ|BVB', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg' },
    { type: 'logo', q: 'Ποιος σύλλογος;', a: 'Juventus|Γιουβέντους', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Juventus_FC_2017_logo.svg' },
  ],
  'Retro Transfers': [
    { type: 'transfer', from: 'Dortmund', to: 'Arsenal', year: '2006', a: 'Tomáš Rosický|Ρόσιτσκι|Rosicky' },
    { type: 'transfer', from: 'Real Madrid', to: 'Chelsea', year: '2018', a: 'Thibaut Courtois|Κουρτουά|Courtois' },
    { type: 'transfer', from: 'Liverpool', to: 'Barcelona', year: '2018', a: 'Philippe Coutinho|Κουτίνιο|Coutinho' },
  ],
  'Player ID': [
    {
      type: 'careerTable',
      a: 'Jonathan Maidana|Μαιδάνα|Maidana',
      career: [
        ['Racing Club', '2010-2014'],
        ['Manchester City', '2014-2017'],
        ['Valencia (loan)', '2014-2015'],
        ['Córdoba (loan)', '2015'],
        ['Middlesbrough (loan)', '2015-2016'],
        ['AEK Athens (loan)', '2016'],
        ['Rayo Vallecano (loan)', '2016-2017'],
        ['Hellas Verona (loan)', '2017'],
        ['Hellas Verona', '2017-2018'],
        ['River Plate', '2018-2024'],
        ['Racing Club', '2024-'],
      ],
    },
    {
      type: 'careerTable',
      a: 'Cristiano Ronaldo|Ρονάλντο',
      career: [
        ['Sporting CP', '2002-2003'],
        ['Manchester United', '2003-2009'],
        ['Real Madrid', '2009-2018'],
        ['Juventus', '2018-2021'],
        ['Manchester United', '2021-2022'],
        ['Al-Nassr', '2023-'],
      ],
    },
  ],
  Gossip: [
    { type: 'text', q: 'Με ποια τραγουδίστρια έκανε σχέση ο Gerard Piqué για 12 χρόνια;', a: 'Shakira|Σακίρα' },
    { type: 'text', q: 'Ποιος παίκτης εμφανίστηκε γυμνός σε διαφήμιση για εσώρουχα Armani το 2008;', a: 'Cristiano Ronaldo|Ρονάλντο' },
    { type: 'text', q: "Ποιος είπε την ατάκα 'I am the Special One' στην πρώτη του συνέντευξη στην Chelsea;", a: 'Mourinho|Μουρίνιο|José Mourinho' },
    { type: 'text', q: 'Με ποια ηθοποιό είναι παντρεμένος ο David Beckham από το 1999;', a: 'Victoria|Victoria Beckham|Posh Spice' },
    { type: 'text', q: 'Ποιος πασίγνωστος προπονητής έγινε viral με το "This is Anfield" moment και τη φιλοσοφία του heavy metal football;', a: 'Klopp|Κλοπ|Jürgen Klopp' },
    { type: 'imageText', q: 'Ποιος παίκτης είναι στη φωτογραφία με τη σύζυγό του;', a: 'Messi|Μέσι', imageUrl: 'https://via.placeholder.com/400x300/EA7E1E/ffffff?text=Gossip+photo+1' },
    { type: 'imageText', q: 'Ποιος ποδοσφαιριστής εμφανίζεται σε αυτή τη διαφήμιση;', a: 'Zidane|Ζιντάν', imageUrl: 'https://via.placeholder.com/400x300/EA7E1E/ffffff?text=Gossip+photo+2' },
  ],
  "Who's Missing": [
    {
      type: 'lineup',
      q: 'Παναιτωλικός — Λεβαδειακός 0-0 (Super League 2024-25)',
      a: 'Karo|Κάρο',
      imageUrl: 'https://via.placeholder.com/400x500/22c55e/ffffff?text=Lineup+Image',
      visiblePlayers: ['Belevonis', 'Bouzoukis', 'Apostolopoulos', 'Luis', 'Perez', 'Bakakis', 'Sielis', 'Pantelakis', 'Stajic', 'Chaves'],
      missingPosition: 'Κέντρο άμυνας',
    },
    {
      type: 'lineup',
      q: 'Brazil 2002 World Cup Final',
      a: 'Ronaldinho|Ροναλντίνιο',
      imageUrl: 'https://via.placeholder.com/400x500/22c55e/ffffff?text=Brazil+2002',
      visiblePlayers: ['Marcos', 'Cafu', 'Lúcio', 'Edmílson', 'Roberto Carlos', 'Gilberto Silva', 'Kléberson', 'Rivaldo', 'Ronaldo'],
      missingPosition: 'Μέσος',
    },
  ],
  'Top 5': [
    { type: 'top5', q: 'Οι 5 παίκτες που χρησιμοποίησε περισσότερο ο Rafa Benitez στην καριέρα του', answers: ['Reina', 'Gerrard', 'Agger', 'Carragher', 'Xabi Alonso'] },
    { type: 'top5', q: 'Οι 5 παίκτες με τα περισσότερα γκολ στην ιστορία του Champions League', answers: ['Cristiano Ronaldo', 'Messi', 'Lewandowski', 'Benzema', 'Raúl'] },
  ],
};

// ============================================================================
// CATEGORY CONFIG
// ============================================================================
const CATEGORIES = [
  { name: 'History',         multipliers: [2, 2],    bg: '#8B4A2B', textColor: '#fff5e6' },
  { name: 'Geography',       multipliers: [2, 2],    bg: '#4A9FD9', textColor: '#ffffff' },
  { name: 'Logo Quiz',       multipliers: [2, 2],    bg: '#C8102E', textColor: '#ffffff' },
  { name: 'Retro Transfers', multipliers: [2, 2],    bg: '#1B4E7C', textColor: '#ffffff' },
  { name: 'Player ID',       multipliers: [2, 2],    bg: '#7B3FBF', textColor: '#ffffff' },
  { name: 'Gossip',          multipliers: [2, 2],    bg: '#EA7E1E', textColor: '#ffffff' },
  { name: "Who's Missing",   multipliers: [3, 3],    bg: '#7BC142', textColor: '#f5ffe8' },
  { name: 'Top 5',           multipliers: [3, 3],    bg: '#4A7C28', textColor: '#f5ffe8' },
];

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
    // Fallback
    const norm = (s) => (s || '').toLowerCase().trim();
    const accepted = sheetAnswer.split('|').map(norm);
    return {
      correct: accepted.some((a) => a === norm(userAnswer)),
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
// MAIN APP
// ============================================================================
export default function FootballTrivia() {
  const [scores, setScores] = useState([0, 0]);
  const [scoreBreakdown, setScoreBreakdown] = useState({
    0: {}, // team 0: { 'History': 3, 'Geography': 2, ... }
    1: {},
  });
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [usedQuestions, setUsedQuestions] = useState({});
  const [turn, setTurn] = useState(0); // 0 = red, 1 = blue
  const [powerUps, setPowerUps] = useState({
    0: { x2: true, fifty: true },
    1: { x2: true, fifty: true },
  });
  const [activePowerUp, setActivePowerUp] = useState(null);
  const [questionResolved, setQuestionResolved] = useState(false);

  // NEW: game flow state
  const [phase, setPhase] = useState('landing'); // landing | coinflip | play | tiebreaker | finished
  const [teamNames, setTeamNames] = useState(['RED team', 'BLUE team']);

  // Total question slots across all categories
  const totalSlots = CATEGORIES.reduce((sum, c) => sum + c.multipliers.length, 0);

  // After each question finishes, check if game is over
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

  setActiveQuestion({ ...question, category, multiplier, slotKey: key });
};

  const handleUsePowerUp = (type) => {
    if (!powerUps[turn][type]) return; // already used
    if (type === 'x2' && activeQuestion) return; // x2 must be pre-armed BEFORE opening a question
    if (type === 'fifty' && !activeQuestion) return; // 50/50 only inside a question
    setActivePowerUp(type);
  };

  const consumePowerUp = (type) => {
    setPowerUps((prev) => ({
      ...prev,
      [turn]: { ...prev[turn], [type]: false },
    }));
  };

  const awardPoints = (basePoints, overrideMultiplier = false) => {
    setQuestionResolved(true);
    let pts = basePoints;
    if (overrideMultiplier) {
      pts = basePoints;
      if (activePowerUp === 'x2') consumePowerUp('x2');
    } else if (activePowerUp === 'x2') {
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
        [turn]: {
          ...prev[turn],
          [category]: (prev[turn][category] || 0) + pts,
        },
      }));
    }
    return pts;
  };

  const markResolved = () => setQuestionResolved(true);

  const finishQuestion = () => {
    // Only mark the slot as used + consume power-ups + switch turn IF the question was actually resolved
    if (questionResolved) {
      setUsedQuestions((prev) => ({ ...prev, [activeQuestion.slotKey]: true }));
      // If 50/50 was activated but didn't succeed, still consume it
      if (activePowerUp === 'fifty' && powerUps[turn].fifty) consumePowerUp('fifty');
      if (activePowerUp === 'x2' && powerUps[turn].x2) consumePowerUp('x2');
      setActivePowerUp(null);
      setTurn((t) => (t === 0 ? 1 : 0));
    }
    // If user closed without answering: keep x2 armed, don't mark slot used, don't switch turn
    setActiveQuestion(null);
    setQuestionResolved(false);
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
    setPhase('landing');
  };

  // Called after coin flip: sets the starting team and enters play
  const startGame = (startingTeam) => {
    setTurn(startingTeam);
    setPhase('play');
  };

  // Tiebreaker handler: whichever team answers the tiebreaker first wins it
  const resolveTiebreaker = (winnerIdx) => {
    setScores((prev) => {
      const next = [...prev];
      next[winnerIdx] += 1;
      return next;
    });
    setPhase('finished');
  };

  // Shared CSS block
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

  // LANDING PAGE
  if (phase === 'landing') {
    return (
      <LandingPage
        sharedStyle={sharedStyle}
        teamNames={teamNames}
        onStart={(names) => {
          setTeamNames(names);
          setPhase('coinflip');
        }}
      />
    );
  }

  // COIN FLIP
  if (phase === 'coinflip') {
    return (
      <CoinFlip
        sharedStyle={sharedStyle}
        teamNames={teamNames}
        onComplete={(winnerIdx) => startGame(winnerIdx)}
      />
    );
  }

  // TIEBREAKER
  if (phase === 'tiebreaker') {
    return (
      <Tiebreaker
        sharedStyle={sharedStyle}
        teamNames={teamNames}
        onWinner={resolveTiebreaker}
      />
    );
  }

  // FINISHED
  if (phase === 'finished') {
    const winnerIdx = scores[0] > scores[1] ? 0 : 1;
    return (
      <FinishedScreen
        sharedStyle={sharedStyle}
        teamNames={teamNames}
        scores={scores}
        breakdown={scoreBreakdown}
        winnerIdx={winnerIdx}
        onNewGame={resetGame}
      />
    );
  }

  // PLAY PHASE — the main board
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 p-4 pb-10" style={{ fontFamily: "'Patrick Hand', cursive" }}>
      <style>{sharedStyle}</style>

      <div className="max-w-md mx-auto">
        {/* HEADER */}
        <header className="flex items-center justify-center gap-3 pt-4 pb-3">
          <Beer size={44} className="text-amber-500" strokeWidth={2.5} />
          <h1 className="handwritten text-4xl font-bold text-stone-800">FOOTBALL TRIVIA</h1>
        </header>

        <div className="bg-red-600 rounded-2xl py-2 px-4 mb-4 transform -rotate-1 card-shadow">
          <p className="handwritten text-2xl text-white text-center italic font-semibold">
            Put some strategy on your game!
          </p>
        </div>

        {/* CATEGORY GRID */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {CATEGORIES.map((cat) => (
            <CategoryCard key={cat.name} category={cat} usedQuestions={usedQuestions} onPick={openQuestion} />
          ))}
        </div>

        {/* TURN INDICATOR */}
        <div className="text-center mb-3">
          <span className="body-font text-lg text-stone-600">
            Σειρά:{' '}
            <span className={turn === 0 ? 'text-red-600 font-bold' : 'text-blue-700 font-bold'}>
              {teamNames[turn]}
            </span>
          </span>
        </div>

        {/* SCOREBOARD + POWER-UPS */}
        <div className="bg-stone-100 rounded-2xl p-4 card-shadow">
          <div className="bg-white border-2 border-stone-800 rounded-xl py-2 px-8 mx-auto mb-4 w-fit">
            <h2 className="handwritten text-3xl text-stone-800 font-bold">Score</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TeamPanel
              color="red"
              name={teamNames[0]}
              value={scores[0]}
              onChange={(v) => setScores([v, scores[1]])}
              active={turn === 0}
              powerUps={powerUps[0]}
              activePowerUp={turn === 0 ? activePowerUp : null}
              onArmX2={() => turn === 0 && handleUsePowerUp('x2')}
              onDisarmX2={() => turn === 0 && setActivePowerUp(null)}
              disabled={!!activeQuestion}
            />
            <TeamPanel
              color="blue"
              name={teamNames[1]}
              value={scores[1]}
              onChange={(v) => setScores([scores[0], v])}
              active={turn === 1}
              powerUps={powerUps[1]}
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

      {/* BREAKDOWN MODAL */}
      {showBreakdown && (
        <BreakdownModal
          breakdown={scoreBreakdown}
          totals={scores}
          teamNames={teamNames}
          onClose={() => setShowBreakdown(false)}
        />
      )}

      {/* QUESTION MODAL */}
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
function CategoryCard({ category, usedQuestions, onPick }) {
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
              disabled={used}
              className={`w-11 h-11 rounded-full bg-white body-font text-base font-bold text-stone-800 chip-shadow transition ${
                used ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 active:scale-95'
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
// TEAM PANEL (score + power-ups)
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
        <div className={`text-center body-font font-bold text-sm mb-1 truncate ${textColor}`}>
          {name}
        </div>
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
        {/* x2 button — clickable only for active team, not used yet, and no question open */}
        <button
          onClick={x2Armed ? onDisarmX2 : onArmX2}
          disabled={!active || !powerUps.x2 || disabled}
          title={
            !powerUps.x2
              ? 'Έχει χρησιμοποιηθεί'
              : !active
              ? 'Μόνο η ενεργή ομάδα'
              : disabled
              ? 'Ολοκλήρωσε την τρέχουσα ερώτηση'
              : x2Armed
              ? 'Πάτα ξανά για ακύρωση'
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
// BREAKDOWN MODAL — per-category score breakdown for both teams
// ============================================================================
function BreakdownModal({ breakdown, totals, teamNames = ['RED', 'BLUE'], onClose }) {
  const categoryOrder = CATEGORIES.map((c) => c.name);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-gradient-to-b from-amber-50 to-orange-50 rounded-2xl max-w-md w-full p-5 card-shadow border-4 border-stone-800 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="handwritten text-2xl text-stone-800 font-bold">Αναλυτικοί πόντοι</h3>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-800">
            <X size={24} />
          </button>
        </div>

        <div className="bg-white rounded-xl border-2 border-stone-300 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 bg-stone-100 px-3 py-2 body-font text-sm font-bold text-stone-600 border-b-2 border-stone-300">
            <span>Κατηγορία</span>
            <span className="text-red-600 w-20 text-center truncate" title={teamNames[0]}>{teamNames[0]}</span>
            <span className="text-blue-700 w-20 text-center truncate" title={teamNames[1]}>{teamNames[1]}</span>
          </div>

          {categoryOrder.map((cat) => {
            const r = breakdown[0][cat] || 0;
            const b = breakdown[1][cat] || 0;
            const catConfig = CATEGORIES.find((c) => c.name === cat);
            return (
              <div key={cat} className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2 body-font border-b border-stone-100 items-center">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: catConfig?.bg }}></span>
                  <span className="text-stone-700">{cat}</span>
                </span>
                <span className={`w-20 text-center font-bold ${r > 0 ? 'text-red-600' : 'text-stone-300'}`}>{r}</span>
                <span className={`w-20 text-center font-bold ${b > 0 ? 'text-blue-700' : 'text-stone-300'}`}>{b}</span>
              </div>
            );
          })}

          {/* Totals */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 bg-stone-800 px-3 py-3 body-font">
            <span className="handwritten text-xl text-white font-bold">Σύνολο</span>
            <span className="handwritten text-2xl text-red-400 w-12 text-center font-bold">{totals[0]}</span>
            <span className="handwritten text-2xl text-blue-300 w-12 text-center font-bold">{totals[1]}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full body-font bg-stone-800 text-white py-2 rounded-xl hover:bg-stone-700"
        >
          Κλείσιμο
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// QUESTION MODAL — routes to the right question-type renderer
// ============================================================================
function QuestionModal({ question, onFinish, onAward, onResolved, activePowerUp, onUsePowerUp, availablePowerUps, turn }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-gradient-to-b from-amber-50 to-orange-50 rounded-2xl max-w-md w-full my-4 p-5 card-shadow border-4 border-stone-800">
        {/* HEADER */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="body-font text-sm text-stone-500 uppercase tracking-wider">{question.category}</div>
            <div className="handwritten text-xl text-amber-700 font-bold">
              Αξίζει ×{activePowerUp === 'x2' ? question.multiplier * 2 : activePowerUp === 'fifty' ? 1 : question.multiplier}
              {activePowerUp === 'x2' && <span className="text-amber-500"> (×2 active!)</span>}
              {activePowerUp === 'fifty' && <span className="text-cyan-600"> (50/50 active)</span>}
            </div>
          </div>
          <button onClick={onFinish} className="text-stone-500 hover:text-stone-800">
            <X size={24} />
          </button>
        </div>

        {/* POWER-UP TOOLBAR (only 50/50 inside modal; x2 is pre-armed from scoreboard) */}
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

        {/* QUESTION BODY — router by type */}
        {(() => {
          switch (question.type) {
            case 'text':
              return <TextQuestion question={question} onFinish={onFinish} onAward={onAward} onResolved={onResolved} activePowerUp={activePowerUp} />;
            case 'logo':
              return <LogoQuestion question={question} onFinish={onFinish} onAward={onAward} onResolved={onResolved} activePowerUp={activePowerUp} />;
            case 'imageText':
              return <ImageTextQuestion question={question} onFinish={onFinish} onAward={onAward} onResolved={onResolved} activePowerUp={activePowerUp} />;
            case 'transfer':
              return <TransferQuestion question={question} onFinish={onFinish} onAward={onAward} onResolved={onResolved} activePowerUp={activePowerUp} />;
            case 'careerTable':
              return <CareerTableQuestion question={question} onFinish={onFinish} onAward={onAward} onResolved={onResolved} activePowerUp={activePowerUp} />;
            case 'lineup':
              return <LineupQuestion question={question} onFinish={onFinish} onAward={onAward} onResolved={onResolved} activePowerUp={activePowerUp} />;
            case 'top5':
              return <Top5Question question={question} onFinish={onFinish} onAward={onAward} onResolved={onResolved} activePowerUp={activePowerUp} />;
            default:
              return <TextQuestion question={question} onFinish={onFinish} onAward={onAward} onResolved={onResolved} activePowerUp={activePowerUp} />;
          }
        })()}
      </div>
    </div>
  );
}

// ============================================================================
// SHARED ANSWER INPUT — used by text / logo / transfer / careerTable / lineup
// ============================================================================
function AnswerInput({ question, onFinish, onAward, onResolved, activePowerUp }) {
  const [userAnswer, setUserAnswer] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [fiftyOptions, setFiftyOptions] = useState(null);
  const [loadingFifty, setLoadingFifty] = useState(false);

  // When 50/50 is activated, fetch the two options
  useEffect(() => {
    if (activePowerUp === 'fifty' && !fiftyOptions && !loadingFifty) {
      setLoadingFifty(true);
      generateFiftyFifty(question.a, question.category).then((opts) => {
        setFiftyOptions(opts);
        setLoadingFifty(false);
      });
    }
  }, [activePowerUp, fiftyOptions, loadingFifty, question]);

  const submit = async (answerText) => {
    if (!answerText || verifying) return;
    setVerifying(true);
    const verdict = await verifyAnswer(question.a, answerText);
    setResult(verdict);
    setVerifying(false);
    // Mark resolved regardless — submit happened, so x2 / 50/50 should consume
    if (onResolved) onResolved();
    if (verdict.correct) onAward(question.multiplier);
  };

  if (result) {
    return (
      <div className={`rounded-xl p-4 ${result.correct ? 'bg-green-100 border-2 border-green-600' : 'bg-red-100 border-2 border-red-600'}`}>
        <div className="flex items-center gap-2 mb-2">
          {result.correct ? (
            <>
              <Check size={28} className="text-green-700" />
              <span className="handwritten text-2xl text-green-700 font-bold">Σωστά!</span>
            </>
          ) : (
            <>
              <X size={28} className="text-red-700" />
              <span className="handwritten text-2xl text-red-700 font-bold">Λάθος</span>
            </>
          )}
        </div>
        <p className="body-font text-stone-700">{result.note}</p>
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
        {verifying ? (
          <>
            <Sparkles size={20} className="animate-spin" /> Το AI ελέγχει…
          </>
        ) : (
          'Υποβολή απάντησης'
        )}
      </button>
    </>
  );
}

// ============================================================================
// TEXT QUESTION
// ============================================================================
function TextQuestion({ question, onFinish, onAward, onResolved, activePowerUp }) {
  return (
    <>
      <p className="body-font text-xl text-stone-800 mb-5 leading-relaxed">{question.q}</p>
      <AnswerInput question={question} onFinish={onFinish} onAward={onAward} onResolved={onResolved} activePowerUp={activePowerUp} />
    </>
  );
}

// ============================================================================
// LOGO QUESTION
// ============================================================================
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

// ============================================================================
// IMAGE + TEXT QUESTION (used by Gossip — bigger, cover-style image)
// ============================================================================
function ImageTextQuestion({ question, onFinish, onAward, onResolved, activePowerUp }) {
  return (
    <>
      <div className="rounded-xl overflow-hidden mb-3 border-2 border-stone-300 bg-stone-100">
        <img
          src={question.imageUrl}
          alt="question"
          className="w-full max-h-64 object-cover"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </div>
      <p className="body-font text-lg text-stone-800 mb-4 text-center">{question.q}</p>
      <AnswerInput question={question} onFinish={onFinish} onAward={onAward} onResolved={onResolved} activePowerUp={activePowerUp} />
    </>
  );
}

// ============================================================================
// RETRO TRANSFER QUESTION
// ============================================================================
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

// ============================================================================
// CAREER TABLE (Player ID)
// ============================================================================
function CareerTableQuestion({ question, onFinish, onAward, onResolved, activePowerUp }) {
  return (
    <>
      <div className="bg-gradient-to-b from-purple-600 to-purple-800 rounded-xl p-3 mb-4">
        <div className="flex justify-between text-purple-100 body-font text-sm uppercase tracking-wide border-b border-purple-400 pb-2 mb-2">
          <span>Ομάδα</span>
          <span>Περίοδος</span>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {question.career.map(([team, period], i) => (
            <div key={i} className={`flex justify-between body-font text-white py-1.5 px-2 rounded ${i % 2 ? 'bg-purple-700/40' : ''}`}>
              <span>{team}</span>
              <span className="text-purple-200">{period}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="body-font text-stone-600 text-center mb-3">Ποιος είναι αυτός ο παίκτης;</p>
      <AnswerInput question={question} onFinish={onFinish} onAward={onAward} onResolved={onResolved} activePowerUp={activePowerUp} />
    </>
  );
}

// ============================================================================
// LINEUP (Who's Missing)
// ============================================================================
function LineupQuestion({ question, onFinish, onAward, onResolved, activePowerUp }) {
  return (
    <>
      <p className="body-font text-lg text-stone-800 mb-3 text-center">{question.q}</p>
      <div className="bg-green-700 rounded-xl p-3 mb-3 relative overflow-hidden" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 20px, transparent 20px 40px)' }}>
        <img src={question.imageUrl} alt="Lineup" className="w-full rounded-lg mb-2" onError={(e) => { e.target.style.display = 'none'; }} />
        <div className="grid grid-cols-2 gap-1 text-white body-font text-sm">
          {question.visiblePlayers.map((p, i) => (
            <div key={i} className="bg-blue-900/60 rounded px-2 py-1 text-center">{p}</div>
          ))}
          <div className="bg-red-600/80 rounded px-2 py-1 text-center font-bold col-span-2 border-2 border-dashed border-white">
            ? {question.missingPosition}
          </div>
        </div>
      </div>
      <p className="body-font text-stone-600 text-center mb-3">Ποιος παίκτης λείπει;</p>
      <AnswerInput question={question} onFinish={onFinish} onAward={onAward} onResolved={onResolved} activePowerUp={activePowerUp} />
    </>
  );
}

// ============================================================================
// TOP 5 QUESTION — progressive answers, stop-at-4 choice, x2 compatible
// ============================================================================
function Top5Question({ question, onFinish, onAward, onResolved, activePowerUp }) {
  const [found, setFound] = useState(Array(question.answers.length).fill(null));
  const [strikes, setStrikes] = useState(0);
  const [input, setInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [done, setDone] = useState(false);
  const [stoppedAt4, setStoppedAt4] = useState(false);
  const MAX_STRIKES = 1;

  const foundCount = found.filter(Boolean).length;
  const hasX2 = activePowerUp === 'x2';

  const checkAnswer = async () => {
    if (!input.trim() || verifying || done) return;
    setVerifying(true);

    const userNorm = norm(input);
    let matchedIdx = -1;
    question.answers.forEach((ans, i) => {
      if (found[i]) return;
      const ansNorm = norm(ans);
      if (ansNorm === userNorm || (ansNorm.length > 3 && (ansNorm.includes(userNorm) || userNorm.includes(ansNorm)))) {
        matchedIdx = i;
      }
    });

    await new Promise((r) => setTimeout(r, 400));

    if (matchedIdx >= 0) {
      const nextFound = [...found];
      nextFound[matchedIdx] = question.answers[matchedIdx];
      setFound(nextFound);
      setLastResult('correct');
      if (nextFound.every(Boolean)) {
        setDone(true);
        if (onResolved) onResolved();
        onAward(question.multiplier);
      }
    } else {
      const nextStrikes = strikes + 1;
      setStrikes(nextStrikes);
      setLastResult('wrong');
      if (nextStrikes >= MAX_STRIKES) {
        setDone(true);
        if (onResolved) onResolved();
        if (found.filter(Boolean).length >= 4) {
          onAward(hasX2 ? 2 : 1, /* overrideMultiplier */ true);
        }
        // Fewer than 4 → no points (x2 still consumed via onResolved path)
      }
    }
    setInput('');
    setVerifying(false);
    setTimeout(() => setLastResult(null), 1000);
  };

  const stopAt4 = () => {
    setStoppedAt4(true);
    setDone(true);
    if (onResolved) onResolved();
    onAward(hasX2 ? 2 : 1, /* overrideMultiplier */ true);
  };

  const surrender = () => {
    setDone(true);
    if (onResolved) onResolved();
    // No points — but x2 is still consumed because the player engaged
  };

  if (done) {
    const allFound = found.every(Boolean);
    const consolationPts = hasX2 ? 2 : 1;
    const fullPts = question.multiplier * (hasX2 ? 2 : 1);

    return (
      <div>
        <div className={`rounded-xl p-4 mb-3 ${allFound ? 'bg-green-100 border-2 border-green-600' : foundCount >= 4 ? 'bg-amber-100 border-2 border-amber-600' : 'bg-red-100 border-2 border-red-600'}`}>
          <div className="flex items-center gap-2 mb-2">
            {allFound ? (
              <>
                <Trophy size={28} className="text-green-700" />
                <span className="handwritten text-2xl text-green-700 font-bold">Τέλεια! +{fullPts} πόντοι</span>
              </>
            ) : foundCount >= 4 ? (
              <>
                <Trophy size={28} className="text-amber-600" />
                <span className="handwritten text-2xl text-amber-700 font-bold">
                  {stoppedAt4 ? 'Σταμάτησες στις 4' : 'Καλή προσπάθεια'} — +{consolationPts} {consolationPts === 1 ? 'πόντος' : 'πόντοι'}
                </span>
              </>
            ) : (
              <>
                <AlertTriangle size={28} className="text-red-700" />
                <span className="handwritten text-2xl text-red-700 font-bold">Τέλος — 1 λάθος</span>
              </>
            )}
          </div>
          <div className="body-font text-stone-700 mt-2">
            <div className="font-bold mb-1">Οι σωστές απαντήσεις:</div>
            <ol className="list-decimal list-inside">
              {question.answers.map((a, i) => (
                <li key={i} className={found[i] ? 'text-green-700 font-bold' : ''}>{a}</li>
              ))}
            </ol>
          </div>
        </div>
        <button onClick={onFinish} className="body-font w-full bg-stone-800 text-white py-2 rounded-xl hover:bg-stone-700">
          Σειρά επόμενης ομάδας →
        </button>
      </div>
    );
  }

  // Stop-at-4 prompt
  const showStopOption = foundCount === 4 && strikes === 0;

  return (
    <>
      <p className="body-font text-lg text-stone-800 mb-3 leading-relaxed">{question.q}</p>

      {/* ANSWER SLOTS */}
      <div className="bg-green-600 rounded-xl p-3 mb-3 space-y-2">
        {question.answers.map((_, i) => (
          <div key={i} className={`rounded-full px-4 py-2 flex items-center gap-3 transition ${found[i] ? 'bg-green-800' : 'bg-green-500'}`}>
            <span className="bg-white text-green-700 rounded-full w-7 h-7 flex items-center justify-center body-font font-bold text-sm flex-shrink-0">
              {i + 1}
            </span>
            <span className="handwritten text-xl text-white font-bold">
              {found[i] || '—'}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-2 border-t border-green-700">
          <span className="body-font text-white text-sm">Λάθος:</span>
          {Array.from({ length: MAX_STRIKES }).map((_, i) => (
            <div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center ${i < strikes ? 'bg-red-600' : 'bg-white/30'}`}>
              {i < strikes && <X size={16} className="text-white" strokeWidth={3} />}
            </div>
          ))}
        </div>
      </div>

      {/* STOP-AT-4 DECISION */}
      {showStopOption && (
        <div className="bg-amber-100 border-2 border-amber-500 rounded-xl p-3 mb-3">
          <p className="body-font text-amber-900 text-center font-bold mb-2">
            Βρήκες 4 στις 5! Τι κάνεις;
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={stopAt4}
              className="body-font bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg font-bold"
            >
              Σταμάτα (+{hasX2 ? 2 : 1} {hasX2 ? 'πόντοι' : 'πόντος'})
            </button>
            <button
              onClick={() => {}}
              className="body-font bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-bold"
              title="Συνέχισε για όλες τις 5 — όλα ή τίποτα"
            >
              Συνέχισε (όλα ή τίποτα)
            </button>
          </div>
          <p className="body-font text-amber-800 text-xs text-center mt-2">
            5/5 = {question.multiplier * (hasX2 ? 2 : 1)} πόντοι · 1 λάθος = 0
          </p>
        </div>
      )}

      {/* FEEDBACK FLASH */}
      {lastResult === 'correct' && (
        <div className="text-center mb-2 handwritten text-xl text-green-700 font-bold">✓ Σωστό!</div>
      )}
      {lastResult === 'wrong' && (
        <div className="text-center mb-2 handwritten text-xl text-red-700 font-bold">✗ Λάθος</div>
      )}

      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
        disabled={verifying}
        placeholder="Γράψε μία απάντηση…"
        className="body-font w-full border-2 border-stone-800 rounded-xl px-4 py-3 text-lg mb-3 bg-white focus:outline-none focus:ring-4 focus:ring-amber-300"
        autoFocus
      />
      <div className="flex gap-2">
        <button
          onClick={checkAnswer}
          disabled={verifying || !input.trim()}
          className="body-font flex-1 bg-stone-800 text-white py-2 rounded-xl hover:bg-stone-700 disabled:opacity-50"
        >
          {verifying ? 'Έλεγχος…' : 'Υποβολή'}
        </button>
        <button
          onClick={surrender}
          className="body-font px-4 bg-stone-500 text-white py-2 rounded-xl hover:bg-stone-600"
          title="Παραιτήσου — 0 πόντοι"
        >
          Παράδοση
        </button>
      </div>
    </>
  );
}

// ============================================================================
// LANDING PAGE — team names input
// ============================================================================
function LandingPage({ sharedStyle, teamNames, onStart }) {
  const [team1, setTeam1] = useState(teamNames[0] === 'RED team' ? '' : teamNames[0]);
  const [team2, setTeam2] = useState(teamNames[1] === 'BLUE team' ? '' : teamNames[1]);

  const canStart = team1.trim() && team2.trim() && team1.trim() !== team2.trim();

  const handleStart = () => {
    if (!canStart) return;
    onStart([team1.trim(), team2.trim()]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 p-4 flex flex-col items-center justify-center" style={{ fontFamily: "'Patrick Hand', cursive" }}>
      <style>{sharedStyle}</style>

      <div className="max-w-md w-full">
        <header className="flex flex-col items-center gap-2 mb-6">
          <Beer size={64} className="text-amber-500" strokeWidth={2.5} />
          <h1 className="handwritten text-5xl font-bold text-stone-800 text-center leading-tight">
            FOOTBALL TRIVIA
          </h1>
        </header>

        <div className="bg-red-600 rounded-2xl py-3 px-4 mb-8 transform -rotate-1 card-shadow">
          <p className="handwritten text-2xl text-white text-center italic font-semibold">
            Put some strategy on your game!
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 card-shadow space-y-4">
          <h2 className="handwritten text-2xl text-stone-800 font-bold text-center">
            Ποιοι παίζουν;
          </h2>

          <div>
            <label className="body-font text-red-600 font-bold text-sm mb-1 block">🔴 Ομάδα 1</label>
            <input
              type="text"
              value={team1}
              onChange={(e) => setTeam1(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              placeholder="π.χ. Κόκκινοι λύκοι"
              maxLength={20}
              className="body-font w-full border-2 border-red-300 focus:border-red-600 rounded-xl px-4 py-3 text-lg bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 transition"
              autoFocus
            />
          </div>

          <div>
            <label className="body-font text-blue-700 font-bold text-sm mb-1 block">🔵 Ομάδα 2</label>
            <input
              type="text"
              value={team2}
              onChange={(e) => setTeam2(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              placeholder="π.χ. Μπλε κεραυνοί"
              maxLength={20}
              className="body-font w-full border-2 border-blue-300 focus:border-blue-600 rounded-xl px-4 py-3 text-lg bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
            />
          </div>

          {team1.trim() && team2.trim() && team1.trim() === team2.trim() && (
            <p className="body-font text-sm text-amber-700 text-center">
              Οι ομάδες πρέπει να έχουν διαφορετικά ονόματα
            </p>
          )}

          <button
            onClick={handleStart}
            disabled={!canStart}
            className="body-font w-full bg-stone-800 text-white py-4 rounded-xl text-xl font-bold hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Ξεκίνα το παιχνίδι →
          </button>
        </div>

        <p className="text-center mt-6 body-font text-stone-500 text-sm">
          Ένας γύρος = 16 ερωτήσεις · 2 βοήθειες ανά ομάδα
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// COIN FLIP — animated coin decides who starts
// ============================================================================
function CoinFlip({ sharedStyle, teamNames, onComplete }) {
  const [phase, setPhase] = useState('ready'); // ready | flipping | result
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
        <h2 className="handwritten text-3xl text-stone-800 font-bold mb-2">
          Ποιος ξεκινάει;
        </h2>
        <p className="body-font text-stone-600 mb-8">
          {teamNames[0]} <span className="text-stone-400 mx-2">vs</span> {teamNames[1]}
        </p>

        {/* COIN */}
        <div className="flex justify-center mb-8 perspective-1000" style={{ perspective: '1000px' }}>
          <div
            className={`w-40 h-40 rounded-full flex items-center justify-center font-bold text-white shadow-2xl ${phase === 'flipping' ? 'coin-flipping' : ''} ${
              phase === 'result' ? winnerBg : 'bg-amber-500'
            }`}
            style={{
              background: phase === 'result'
                ? undefined
                : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
              border: '6px solid rgba(0,0,0,0.15)',
            }}
          >
            {phase === 'ready' && <Beer size={72} strokeWidth={2.5} />}
            {phase === 'flipping' && <Beer size={72} strokeWidth={2.5} />}
            {phase === 'result' && (
              <span className="handwritten text-3xl leading-none px-2 text-center">
                {teamNames[winnerIdx]}
              </span>
            )}
          </div>
        </div>

        {phase === 'ready' && (
          <button
            onClick={startFlip}
            className="body-font bg-stone-800 text-white py-3 px-8 rounded-xl text-lg font-bold hover:bg-stone-700 transition"
          >
            🪙 Ρίξε το κέρμα
          </button>
        )}

        {phase === 'flipping' && (
          <p className="handwritten text-2xl text-stone-600 italic animate-pulse">
            Στρίβει…
          </p>
        )}

        {phase === 'result' && (
          <div className="space-y-4 animate-in fade-in">
            <p className="handwritten text-3xl font-bold">
              <span className={winnerColor}>{teamNames[winnerIdx]}</span>
              <span className="text-stone-800"> ξεκινάει!</span>
            </p>
            <button
              onClick={() => onComplete(winnerIdx)}
              className="body-font bg-stone-800 text-white py-3 px-8 rounded-xl text-lg font-bold hover:bg-stone-700 transition"
            >
              Ας παίξουμε →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TIEBREAKER — one sudden-death question, whoever buzzes in correct wins
// ============================================================================
function Tiebreaker({ sharedStyle, teamNames, onWinner }) {
  // Pool of suitable tiebreakers — in production, fetch a random one
  // tagged 'tiebreaker' from your Google Sheet
  const TIEBREAKERS = [
    { q: 'Ποιο έτος κέρδισε η Ελλάδα το Euro;', a: '2004' },
    { q: 'Πόσα Champions League έχει η Real Madrid; (αριθμός)', a: '15' },
    { q: 'Ποιος σκόραρε το πρώτο γκολ στον τελικό World Cup 2022;', a: 'Messi|Μέσι' },
    { q: 'Σε ποιο έτος ιδρύθηκε ο Ολυμπιακός;', a: '1925' },
    { q: 'Ποιος είναι ο πρώτος σκόρερ στην ιστορία του Champions League;', a: 'Cristiano Ronaldo|Ρονάλντο' },
  ];

  const [question] = useState(TIEBREAKERS[Math.floor(Math.random() * TIEBREAKERS.length)]);
  const [buzzer, setBuzzer] = useState(null); // which team buzzed in
  const [answer, setAnswer] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null); // 'correct' | 'wrong'
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
      setAttempted((prev) => {
        const next = [...prev];
        next[buzzer] = true;
        return next;
      });
      // If both teams got it wrong, the other team wins by default
      setTimeout(() => {
        const nextAttempted = [...attempted];
        nextAttempted[buzzer] = true;
        if (nextAttempted[0] && nextAttempted[1]) {
          // Both failed — draw stays, but we need a winner.
          // Award to whoever buzzed LAST (the "brave" one) — can also randomize.
          onWinner(buzzer === 0 ? 1 : 0);
        } else {
          // Reset buzzer so the other team can try
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
            <h2 className="handwritten text-2xl text-white font-bold">
              ΑΙΦΝΙΔΙΑΣΤΙΚΟΣ ΓΥΡΟΣ
            </h2>
          </div>
          <p className="body-font text-amber-50 text-sm mt-1">
            Ισοπαλία! Όποιος χτυπήσει το buzzer πρώτος & απαντήσει σωστά κερδίζει.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 card-shadow mb-5 border-4 border-stone-800">
          <p className="body-font text-xl text-stone-800 text-center leading-relaxed">
            {question.q}
          </p>
        </div>

        {/* BUZZERS — visible when no team has buzzed yet */}
        {buzzer === null && !attempted.every(Boolean) && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => buzz(0)}
              disabled={attempted[0]}
              className={`py-8 rounded-2xl body-font text-xl font-bold border-4 transition card-shadow ${
                attempted[0]
                  ? 'bg-stone-200 border-stone-300 text-stone-400 line-through'
                  : 'bg-red-50 border-red-600 text-red-700 hover:bg-red-100 active:scale-95'
              }`}
            >
              🔴<br/>{teamNames[0]}
            </button>
            <button
              onClick={() => buzz(1)}
              disabled={attempted[1]}
              className={`py-8 rounded-2xl body-font text-xl font-bold border-4 transition card-shadow ${
                attempted[1]
                  ? 'bg-stone-200 border-stone-300 text-stone-400 line-through'
                  : 'bg-blue-50 border-blue-700 text-blue-800 hover:bg-blue-100 active:scale-95'
              }`}
            >
              🔵<br/>{teamNames[1]}
            </button>
          </div>
        )}

        {/* ANSWER INPUT */}
        {buzzer !== null && result === null && (
          <div className={`rounded-2xl p-4 border-4 card-shadow ${buzzer === 0 ? 'bg-red-50 border-red-600' : 'bg-blue-50 border-blue-700'}`}>
            <p className={`body-font font-bold text-center mb-3 ${buzzer === 0 ? 'text-red-700' : 'text-blue-800'}`}>
              {teamNames[buzzer]} — απάντα!
            </p>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              disabled={verifying}
              placeholder="Η απάντηση…"
              className="body-font w-full border-2 border-stone-800 rounded-xl px-4 py-3 text-lg mb-3 bg-white focus:outline-none focus:ring-4 focus:ring-amber-300"
              autoFocus
            />
            <button
              onClick={submit}
              disabled={verifying || !answer.trim()}
              className="body-font w-full bg-stone-800 text-white py-3 rounded-xl text-lg font-bold flex items-center justify-center gap-2 hover:bg-stone-700 disabled:opacity-50"
            >
              {verifying ? (
                <><Sparkles size={20} className="animate-spin" /> Ελέγχει…</>
              ) : (
                'Υποβολή'
              )}
            </button>
          </div>
        )}

        {/* RESULT FLASH */}
        {result === 'correct' && (
          <div className="bg-green-100 border-4 border-green-600 rounded-2xl p-5 text-center card-shadow">
            <Check size={40} className="text-green-700 mx-auto mb-2" />
            <p className="handwritten text-3xl text-green-700 font-bold">
              Σωστά! {teamNames[buzzer]} νικάει!
            </p>
          </div>
        )}
        {result === 'wrong' && (
          <div className="bg-red-100 border-4 border-red-600 rounded-2xl p-5 text-center card-shadow">
            <X size={40} className="text-red-700 mx-auto mb-2" />
            <p className="handwritten text-2xl text-red-700 font-bold">
              {attempted[buzzer === 0 ? 1 : 0] ? 'Και η άλλη ομάδα έχασε — νικάει η αντίπαλη!' : 'Λάθος! Σειρά αντιπάλου…'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// FINISHED SCREEN — winner reveal + final breakdown
// ============================================================================
function FinishedScreen({ sharedStyle, teamNames, scores, breakdown, winnerIdx, onNewGame }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const winnerColor = winnerIdx === 0 ? 'text-red-600' : 'text-blue-700';
  const winnerBg = winnerIdx === 0 ? 'from-red-500 to-red-700' : 'from-blue-600 to-blue-800';

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 p-4 flex flex-col items-center justify-center" style={{ fontFamily: "'Patrick Hand', cursive" }}>
      <style>{sharedStyle}</style>

      <div className="max-w-md w-full text-center">
        <Trophy size={80} className="text-amber-500 mx-auto mb-3" strokeWidth={2} />

        <h1 className="handwritten text-4xl text-stone-800 font-bold mb-2">
          Τέλος παιχνιδιού!
        </h1>

        <div className={`bg-gradient-to-br ${winnerBg} rounded-2xl p-6 my-6 card-shadow`}>
          <p className="body-font text-white/80 text-sm mb-1">Νικητές</p>
          <p className="handwritten text-5xl text-white font-bold leading-tight break-words">
            {teamNames[winnerIdx]} 🏆
          </p>
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
          <button
            onClick={() => setShowBreakdown(true)}
            className="body-font bg-white border-2 border-stone-300 text-stone-700 py-2 rounded-xl text-sm font-bold hover:bg-stone-50"
          >
            📊 Αναλυτική κατάσταση βαθμών
          </button>
          <button
            onClick={onNewGame}
            className="body-font bg-stone-800 text-white py-3 rounded-xl text-lg font-bold hover:bg-stone-700 flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} /> Νέο παιχνίδι
          </button>
        </div>
      </div>

      {showBreakdown && (
        <BreakdownModal
          breakdown={breakdown}
          totals={scores}
          teamNames={teamNames}
          onClose={() => setShowBreakdown(false)}
        />
      )}
    </div>
  );
}