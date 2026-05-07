function Tiebreaker({ sharedStyle, teamNames, onWinner }) {
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // phase: 'team1' | 'team2' | 'reveal'
  const [phase, setPhase] = useState('team1');
  const [answers, setAnswers] = useState(['', '']);
  const [input, setInput] = useState('');
  const [results, setResults] = useState([null, null]); // true/false per team
  const [verifying, setVerifying] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    fetch('/api/tiebreaker', { method: 'POST' })
      .then((r) => {
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setQuestion(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Focus input when phase changes
  useEffect(() => {
    if ((phase === 'team1' || phase === 'team2') && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [phase]);

  async function handleSubmit() {
    if (!input.trim() || verifying) return;
    inputRef.current?.blur();
    setVerifying(true);

    const teamIdx = phase === 'team1' ? 0 : 1;
    const ans = input.trim();

    // Check against correct option
    const correct = question.options[question.correctIndex];
    const normAns = ans.toLowerCase().trim();
    const normCorrect = correct.toLowerCase().trim();
    const isCorrect = normAns === normCorrect || normAns.includes(normCorrect) || normCorrect.includes(normAns);

    const newAnswers = [...answers];
    newAnswers[teamIdx] = ans;
    setAnswers(newAnswers);

    const newResults = [...results];
    newResults[teamIdx] = isCorrect;
    setResults(newResults);

    setInput('');
    setVerifying(false);

    if (phase === 'team1') {
      setPhase('team2');
    } else {
      // Both answered — determine winner
      setPhase('reveal');
    }
  }

  function handleRevealWinner() {
    const [r0, r1] = results;
    if (r0 && !r1) onWinner(0);
    else if (r1 && !r0) onWinner(1);
    else if (r0 && r1) {
      // Both correct — sudden death again? Or coin flip. Here we just re-ask.
      // For simplicity, declare no winner and let caller handle (re-render with new question)
      // We'll reload a new question
      setLoading(true);
      setError(null);
      setPhase('team1');
      setAnswers(['', '']);
      setResults([null, null]);
      setInput('');
      fetch('/api/tiebreaker', { method: 'POST' })
        .then(r => r.json())
        .then(data => { setQuestion(data); setLoading(false); })
        .catch(err => { setError(err.message); setLoading(false); });
    } else {
      // Both wrong — same, new question
      setLoading(true);
      setError(null);
      setPhase('team1');
      setAnswers(['', '']);
      setResults([null, null]);
      setInput('');
      fetch('/api/tiebreaker', { method: 'POST' })
        .then(r => r.json())
        .then(data => { setQuestion(data); setLoading(false); })
        .catch(err => { setError(err.message); setLoading(false); });
    }
  }

  const teamColor = phase === 'team1' || (phase === 'reveal')
    ? { border: 'border-red-500', bg: 'bg-red-50', text: 'text-red-600', btn: 'bg-red-600 active:bg-red-700' }
    : { border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', btn: 'bg-blue-700 active:bg-blue-800' };

  const currentTeamIdx = phase === 'team1' ? 0 : 1;
  const currentColor = currentTeamIdx === 0
    ? { border: 'border-red-500', bg: 'bg-red-50', text: 'text-red-600', btn: 'bg-red-600 active:bg-red-700' }
    : { border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', btn: 'bg-blue-700 active:bg-blue-800' };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 px-4 flex flex-col items-center justify-center safe-bottom" style={{ fontFamily: "'Patrick Hand', cursive" }}>
      <style>{sharedStyle}</style>
      <div className="max-w-md w-full space-y-3">

        {/* Header */}
        <div className="bg-amber-500 rounded-2xl py-3 px-4 text-center card-shadow">
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle size={22} className="text-white" />
            <h2 className="handwritten text-2xl text-white font-bold">ΑΙΦΝΙΔΙΑΣΤΙΚΟΣ ΓΥΡΟΣ</h2>
          </div>
          <p className="body-font text-amber-50 text-xs mt-1">
            Ισοπαλία! Κάθε ομάδα απαντά — ο πιο κοντά κερδίζει.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-2xl p-8 card-shadow flex flex-col items-center gap-3 border-4 border-stone-800">
            <Sparkles size={32} className="text-amber-500 animate-spin" />
            <p className="body-font text-stone-600 text-lg">Ετοιμάζεται ερώτηση…</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 rounded-2xl p-5 card-shadow border-4 border-red-500 text-center">
            <p className="body-font text-red-700">⚠️ Αδυναμία φόρτωσης</p>
            <button
              onClick={() => {
                setError(null); setLoading(true);
                fetch('/api/tiebreaker', { method: 'POST' }).then(r => r.json()).then(d => { setQuestion(d); setLoading(false); }).catch(e => { setError(e.message); setLoading(false); });
              }}
              className="mt-3 body-font bg-red-600 text-white py-2.5 px-5 rounded-xl font-bold min-h-[48px]"
            >
              Δοκίμασε ξανά
            </button>
          </div>
        )}

        {/* Question + input per team */}
        {question && !loading && (phase === 'team1' || phase === 'team2') && (
          <>
            {/* Question card */}
            <div className="bg-white rounded-2xl p-5 card-shadow border-4 border-stone-800">
              <p className="body-font text-xs text-stone-400 text-center uppercase tracking-wide mb-2">Ερώτηση</p>
              <p className="body-font text-xl text-stone-800 text-center leading-relaxed">
                {question.question}
              </p>
              <div className="mt-3 flex gap-2 justify-center flex-wrap">
                {question.options.map((opt, i) => (
                  <span key={i} className="bg-stone-100 border border-stone-300 rounded-full px-3 py-1 body-font text-sm text-stone-600">
                    {opt}
                  </span>
                ))}
              </div>
            </div>

            {/* Team input */}
            <div className={`${currentColor.bg} border-4 ${currentColor.border} rounded-2xl p-5 card-shadow space-y-3`}>
              <p className={`body-font font-bold text-center text-lg ${currentColor.text}`}>
                {currentTeamIdx === 0 ? '🔴' : '🔵'} {teamNames[currentTeamIdx]}
              </p>
              <p className="body-font text-stone-600 text-sm text-center">Διάλεξε — ή γράψε — την απάντησή σου:</p>

              {/* Quick-pick buttons */}
              <div className="flex gap-2">
                {question.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(opt); }}
                    className={`flex-1 py-3 px-2 rounded-xl border-2 body-font font-bold text-base transition min-h-[52px] text-center
                      ${input === opt
                        ? `${currentColor.btn} text-white border-transparent`
                        : 'bg-white border-stone-300 text-stone-700 active:bg-stone-50'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              <button
                onClick={handleSubmit}
                disabled={!input.trim() || verifying}
                className={`body-font w-full ${currentColor.btn} text-white py-3 rounded-xl text-lg font-bold disabled:opacity-40 transition min-h-[52px]`}
              >
                {verifying ? '...' : 'Κλείδωμα →'}
              </button>
            </div>
          </>
        )}

        {/* Reveal */}
        {question && !loading && phase === 'reveal' && (
          <>
            <div className="bg-white rounded-2xl p-5 card-shadow border-4 border-stone-800">
              <p className="body-font text-xl text-stone-800 text-center leading-relaxed mb-3">
                {question.question}
              </p>
              <div className="bg-amber-100 border-2 border-amber-500 rounded-xl py-2 px-4 text-center">
                <p className="body-font text-xs text-amber-700 uppercase tracking-wide">Σωστή απάντηση</p>
                <p className="handwritten text-3xl font-bold text-amber-800">{question.options[question.correctIndex]}</p>
              </div>
            </div>

            {/* Team results */}
            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map(i => {
                const isCorrect = results[i];
                return (
                  <div key={i} className={`rounded-xl p-3 text-center border-4 ${
                    isCorrect
                      ? i === 0 ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-blue-500'
                      : 'bg-stone-100 border-stone-300'
                  }`}>
                    <p className={`body-font text-xs font-bold uppercase mb-1 ${i === 0 ? 'text-red-600' : 'text-blue-700'}`}>
                      {i === 0 ? '🔴' : '🔵'} {teamNames[i]}
                    </p>
                    <p className="handwritten text-2xl font-bold text-stone-800">{answers[i]}</p>
                    <p className={`text-xl mt-1 ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                      {isCorrect ? '✓' : '✗'}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Winner announcement or replay */}
            {results[0] !== results[1] ? (
              <div className={`rounded-xl py-3 text-center ${results[0] ? 'bg-red-600' : 'bg-blue-700'}`}>
                <span className="handwritten text-2xl text-white font-bold">
                  🏆 {teamNames[results[0] ? 0 : 1]} κερδίζει!
                </span>
              </div>
            ) : (
              <div className="bg-amber-100 border-2 border-amber-500 rounded-xl py-2 px-4 text-center">
                <p className="handwritten text-xl text-amber-800 font-bold">
                  {results[0] ? '🤝 Και οι δύο σωστοί!' : '😅 Και οι δύο λάθος!'} Ξανά!
                </p>
              </div>
            )}

            <button
              onClick={handleRevealWinner}
              className="body-font w-full bg-stone-800 text-white py-3 rounded-xl text-lg font-bold active:bg-stone-700 min-h-[52px]"
            >
              {results[0] !== results[1] ? 'Συνέχεια →' : 'Νέα ερώτηση →'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
