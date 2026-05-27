import React, { useState, useRef, useEffect } from 'react';

// Voice Command Examples shown to user
const VOICE_EXAMPLES = [
  { cmd: '"Create new lease"', desc: 'Start a new lease form' },
  { cmd: '"Lease type: residential monthly"', desc: 'Set the lease type' },
  { cmd: '"Lease holder: John Smith"', desc: 'Set the lessor/landlord name' },
  { cmd: '"Recipient: Sarah Johnson"', desc: 'Set the tenant/client name' },
  { cmd: '"Recipient email: sarah@example.com"', desc: 'Set where OTP will be sent' },
  { cmd: '"Property: 14 Ocean Drive, Cape Town"', desc: 'Set property address' },
  { cmd: '"Rent is 12000"', desc: 'Set monthly rent amount' },
  { cmd: '"Currency: ZAR"', desc: 'Set currency (ZAR/USD/GBP/EUR)' },
  { cmd: '"Start date: March 1 2026"', desc: 'Set lease start date' },
  { cmd: '"End date: February 28 2027"', desc: 'Set lease end date' },
  { cmd: '"Duration: 12 months"', desc: 'Set lease duration' },
  { cmd: '"Notes: parking included"', desc: 'Add special notes' },
  { cmd: '"Save lease"', desc: 'Save and create the lease' },
  { cmd: '"Show leases"', desc: 'Switch to Lease Manager view' },
  { cmd: '"Clear"', desc: 'Reset the form' },
];

export default function VoiceCommand({ onCommand, onTranscriptChange }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [interim, setInterim] = useState('');
  const [showExamples, setShowExamples] = useState(false);
  const [pulseLevel, setPulseLevel] = useState(0);
  const recognitionRef = useRef(null);
  const pulseRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-ZA'; // South African English; fallback: en-US

    recognition.onresult = (event) => {
      let interimText = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }
      if (interimText) {
        setInterim(interimText);
        onTranscriptChange(interimText);
      }
      if (finalText.trim()) {
        setInterim('');
        onTranscriptChange(finalText.trim());
        onCommand(finalText.trim());
      }
    };

    recognition.onerror = (e) => {
      if (e.error !== 'no-speech') {
        console.warn('Speech error:', e.error);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still "listening"
      if (recognitionRef.current?._active) {
        try { recognition.start(); } catch (_) {}
      }
    };

    recognitionRef.current = recognition;
    return () => {
      recognition.abort();
    };
  }, [onCommand, onTranscriptChange]);

  const toggleListening = () => {
    if (!supported) return;
    if (listening) {
      recognitionRef.current._active = false;
      recognitionRef.current.abort();
      setListening(false);
      setInterim('');
      clearInterval(pulseRef.current);
      setPulseLevel(0);
    } else {
      recognitionRef.current._active = true;
      try {
        recognitionRef.current.start();
        setListening(true);
        // Animate pulse level
        pulseRef.current = setInterval(() => {
          setPulseLevel(Math.random());
        }, 150);
      } catch (e) {
        console.warn('Could not start recognition:', e);
      }
    }
  };

  const barCount = 12;

  return (
    <section className="voice-section">
      {/* ── Main mic button ─────────────────────────────────────────── */}
      <div className="voice-center">
        <button
          className={`mic-btn ${listening ? 'mic-active' : ''}`}
          onClick={toggleListening}
          title={listening ? 'Click to stop listening' : 'Click to start voice command'}
          disabled={!supported}
        >
          {/* Outer pulse rings */}
          {listening && (
            <>
              <span className="mic-ring ring-1" />
              <span className="mic-ring ring-2" />
              <span className="mic-ring ring-3" />
            </>
          )}
          <span className="mic-icon">{listening ? '🔴' : '🎙️'}</span>
        </button>

        {/* Waveform bars */}
        {listening && (
          <div className="waveform">
            {Array.from({ length: barCount }).map((_, i) => (
              <div
                key={i}
                className="wave-bar"
                style={{
                  height: `${20 + Math.abs(Math.sin((i + pulseLevel * 10) * 0.8)) * 50}px`,
                  animationDelay: `${i * 0.08}s`,
                }}
              />
            ))}
          </div>
        )}

        <p className="mic-status">
          {!supported
            ? '⚠️ Speech recognition not supported in this browser (use Chrome/Edge)'
            : listening
            ? interim
              ? <><span className="listening-label">Listening…</span> <em>{interim}</em></>
              : <span className="listening-label">🎙️ Listening for command…</span>
            : 'Press to activate voice commands'}
        </p>
      </div>

      {/* ── Examples toggle ──────────────────────────────────────────── */}
      <button
        className="examples-toggle"
        onClick={() => setShowExamples(v => !v)}
      >
        {showExamples ? '▲ Hide' : '▼ Show'} Voice Command Examples
      </button>

      {showExamples && (
        <div className="examples-grid">
          {VOICE_EXAMPLES.map(({ cmd, desc }) => (
            <div key={cmd} className="example-card">
              <span className="example-cmd">{cmd}</span>
              <span className="example-desc">{desc}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
