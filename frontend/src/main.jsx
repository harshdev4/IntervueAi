import React, {
  useEffect,
  useRef,
  useState,
  useCallback
} from "react";

import { createRoot } from "react-dom/client";
import "./styles.css";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const SpeechRec =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;


// ============================================================
// ICON
// ============================================================

const Icon = ({ name, size = 20 }) => {
  const paths = {
    upload: (
      <>
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M5 20h14" />
      </>
    ),

    spark: (
      <>
        <path d="m12 3-1.3 4.7L6 9l4.7 1.3L12 15l1.3-4.7L18 9l-4.7-1.3Z" />
        <path d="m19 15-.6 2.4L16 18l2.4.6L19 21l.6-2.4L19 15Z" />
      </>
    ),

    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),

    check: <path d="m5 12 4 4L19 6" />,

    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
      </>
    ),

    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
      </>
    ),

    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),

    volume: (
      <>
        <path d="M11 5 6 9H3v6h3l5 4Z" />
        <path d="M15 9a4 4 0 0 1 0 6" />
        <path d="M17.5 6.5a8 8 0 0 1 0 11" />
      </>
    ),

    volumeX: (
      <>
        <path d="M11 5 6 9H3v6h3l5 4Z" />
        <line x1="22" x2="16" y1="9" y2="15" />
        <line x1="16" x2="22" y1="9" y2="15" />
      </>
    ),

    mic: (
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8" />
      </>
    ),

    micOff: (
      <>
        <line x1="2" x2="22" y1="2" y2="22" />
        <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
        <path d="M5 10v2a7 7 0 0 0 12 5" />
        <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
        <line x1="12" x2="12" y1="19" y2="22" />
        <line x1="8" x2="16" y1="22" y2="22" />
      </>
    ),

    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </>
    ),

    rotate: (
      <>
        <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
        <path d="M3 21v-5h5" />
      </>
    ),

    chevron: <path d="m9 18 6-6-6-6" />,

    target: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),

    trend: (
      <>
        <path d="m3 17 6-6 4 4 8-9" />
        <path d="M16 6h5v5" />
      </>
    ),

    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),

    close: (
      <>
        <path d="m6 6 12 12" />
        <path d="M18 6 6 18" />
      </>
    ),

    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),

    menu: (
      <>
        <path d="M4 6h16" />
        <path d="M4 12h16" />
        <path d="M4 18h16" />
      </>
    ),

    stop: (
      <rect x="6" y="6" width="12" height="12" rx="2" />
    )
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] || null}
    </svg>
  );
};


// ============================================================
// APP
// ============================================================

function App() {
  const [screen, setScreen] = useState("home");

  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");

  const [interview, setInterview] = useState(null);
  const [question, setQuestion] = useState(null);

  const [answer, setAnswer] = useState("");

  const [evaluations, setEvaluations] = useState([]);
  const [overall, setOverall] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [seconds, setSeconds] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fileInput = useRef(null);

  // ==========================================================
  // VOICE STATE
  // ==========================================================

  const [voiceState, setVoiceState] = useState("IDLE");

  const audioRef = useRef(null);
  const audioUrlRef = useRef(null);

  // ==========================================================
  // STT STATE
  // ==========================================================

  const [sttState, setSttState] = useState("IDLE");
  const [micNotice, setMicNotice] = useState("");

  const recognitionRef = useRef(null);
  const baseAnswerRef = useRef("");

  // SpeechRecognition can end unexpectedly in Chrome, so keep
  // the logical recording session alive and reconnect it.
  const sttShouldListenRef = useRef(false);
  const sttStartingRef = useRef(false);
  const speechFinalRef = useRef("");
  const restartTimerRef = useRef(null);


  // ==========================================================
  // GENERIC API HELPER
  // ==========================================================

  const api = async (path, options = {}) => {
    const response = await fetch(`${API_BASE}${path}`, options);

    let data = {};

    try {
      data = await response.json();
    } catch {
      // Non-JSON response
    }

    if (!response.ok) {
      throw new Error(
        data.message || "Something went wrong"
      );
    }

    return data;
  };


  // ==========================================================
  // STOP AUDIO
  // ==========================================================

  const stopVoice = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {}

      audioRef.current = null;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    setVoiceState("IDLE");
  }, []);


  // ==========================================================
  // BASE64 → AUDIO
  // ==========================================================

  const base64ToBlob = useCallback(
    (base64, mimeType = "audio/wav") => {
      const binaryString = window.atob(base64);

      const length = binaryString.length;

      const bytes = new Uint8Array(length);

      for (let i = 0; i < length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return new Blob([bytes], {
        type: mimeType
      });
    },
    []
  );


  // ==========================================================
  // PLAY AUDIO RECEIVED WITH QUESTION
  // ==========================================================

  const playQuestionAudio = useCallback(
    async (audioBase64, mimeType = "audio/wav") => {
      if (!audioBase64) {
        console.warn("No audio returned from backend");
        setVoiceState("ERROR");
        return;
      }

      stopVoice();

      setVoiceState("LOADING");

      try {
        const blob = base64ToBlob(
          audioBase64,
          mimeType
        );

        const url = URL.createObjectURL(blob);

        audioUrlRef.current = url;

        const audio = new Audio();

        audio.preload = "auto";

        audio.src = url;

        audioRef.current = audio;


        // ------------------------------------------
        // Audio started
        // ------------------------------------------

        audio.onplay = () => {
          setVoiceState("SPEAKING");
        };


        // ------------------------------------------
        // Audio ended
        // ------------------------------------------

        audio.onended = () => {
          if (audioUrlRef.current) {
            URL.revokeObjectURL(
              audioUrlRef.current
            );

            audioUrlRef.current = null;
          }

          audioRef.current = null;

          setVoiceState("IDLE");
        };


        // ------------------------------------------
        // Audio error
        // ------------------------------------------

        audio.onerror = (event) => {
          console.error(
            "Audio playback error:",
            event
          );

          setVoiceState("ERROR");
        };


        // ------------------------------------------
        // Try autoplay
        // ------------------------------------------

        try {
          await audio.play();

          setVoiceState("SPEAKING");

        } catch (playError) {

          console.warn(
            "Autoplay blocked:",
            playError
          );

          setVoiceState("READY_TO_PLAY");
        }

      } catch (error) {

        console.error(
          "Audio processing error:",
          error
        );

        setVoiceState("ERROR");
      }
    },
    [base64ToBlob, stopVoice]
  );


  // ==========================================================
  // MANUAL PLAY BUTTON
  // ==========================================================

  const handlePlayAudio = useCallback(() => {

    // Existing audio waiting for user interaction
    if (
      audioRef.current &&
      voiceState === "READY_TO_PLAY"
    ) {
      audioRef.current
        .play()
        .then(() => {
          setVoiceState("SPEAKING");
        })
        .catch(() => {
          setVoiceState("READY_TO_PLAY");
        });

      return;
    }


    // If no audio exists, but question contains audio
    if (question?.audio) {

      playQuestionAudio(
        question.audio,
        question.audioMimeType || "audio/wav"
      );
    }

  }, [
    voiceState,
    question,
    playQuestionAudio
  ]);


  // ==========================================================
  // STOP STT
  // ==========================================================

  const stopListening = useCallback(() => {
    sttShouldListenRef.current = false;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    const recognition = recognitionRef.current;

    if (recognition) {
      try {
        recognition.stop();
      } catch (error) {
        console.warn("Speech recognition stop:", error);
      }

      recognitionRef.current = null;
    }

    sttStartingRef.current = false;
    setSttState("IDLE");
  }, []);


  // START / RESTART STT
  // ==========================================================

  const startListening = useCallback(() => {
    if (!SpeechRec) {
      setMicNotice(
        "Voice input isn't supported in this browser. You can type your answer."
      );
      return;
    }

    if (sttShouldListenRef.current || sttStartingRef.current) {
      return;
    }

    stopVoice();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    setMicNotice("");
    baseAnswerRef.current = answer.trim();
    speechFinalRef.current = "";
    sttShouldListenRef.current = true;
    sttStartingRef.current = false;

    const createRecognition = () => {
      if (!sttShouldListenRef.current || recognitionRef.current || sttStartingRef.current) {
        return;
      }

      const recognition = new SpeechRec();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognitionRef.current = recognition;
      sttStartingRef.current = true;

      recognition.onstart = () => {
        sttStartingRef.current = false;
        if (sttShouldListenRef.current) {
          setSttState("LISTENING");
        }
      };

      recognition.onresult = event => {
        let interimTranscript = "";
        let newFinalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result?.[0]?.transcript || "";

          if (result.isFinal) {
            newFinalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (newFinalTranscript.trim()) {
          const cleaned = newFinalTranscript.replace(/\s+/g, " ").trim();
          if (cleaned) {
            speechFinalRef.current = `${speechFinalRef.current} ${cleaned}`
              .replace(/\s+/g, " ")
              .trim();
          }
        }

        const combined = [
          baseAnswerRef.current.trim(),
          speechFinalRef.current.trim(),
          interimTranscript.replace(/\s+/g, " ").trim()
        ]
          .filter(Boolean)
          .join(" ");

        setAnswer(combined);
      };

      recognition.onerror = event => {
        console.warn("Speech recognition error:", event.error);

        if (event.error === "not-allowed" || event.error === "permission-denied") {
          sttShouldListenRef.current = false;
          setSttState("IDLE");
          setMicNotice("Microphone permission denied. Please allow microphone access or type your answer.");
          return;
        }

        if (event.error === "audio-capture") {
          setMicNotice("Microphone could not be accessed. Check your microphone and try again.");
          return;
        }

        if (event.error === "no-speech" || event.error === "aborted" || event.error === "network") {
          return;
        }

        setMicNotice(`Voice recognition issue (${event.error}). You can continue typing your answer.`);
      };

      recognition.onend = () => {
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null;
        }

        sttStartingRef.current = false;

        if (!sttShouldListenRef.current) {
          setSttState("IDLE");
          return;
        }

        setSttState("RECONNECTING");

        if (restartTimerRef.current) {
          clearTimeout(restartTimerRef.current);
        }

        restartTimerRef.current = setTimeout(() => {
          restartTimerRef.current = null;
          if (sttShouldListenRef.current) {
            createRecognition();
          }
        }, 250);
      };

      try {
        recognition.start();
      } catch (error) {
        console.warn("Speech recognition start failed:", error);
        recognitionRef.current = null;
        sttStartingRef.current = false;

        if (sttShouldListenRef.current) {
          restartTimerRef.current = setTimeout(() => {
            restartTimerRef.current = null;
            if (sttShouldListenRef.current) {
              createRecognition();
            }
          }, 500);
        }
      }
    };

    createRecognition();
  }, [SpeechRec, answer, stopVoice]);


  // CLEANUP
  // ==========================================================

  useEffect(() => {
    return () => {
      sttShouldListenRef.current = false;

      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }

      stopVoice();
      stopListening();
    };
  }, [stopVoice, stopListening]);


  // START INTERVIEW
  // ==========================================================

  const startInterview = async () => {

    if (
      !file ||
      !jobDescription.trim()
    ) {

      setError(
        "Upload your resume PDF and paste the job description to continue."
      );

      return;
    }


    setLoading(true);

    setError("");

    setScreen("processing");


    try {

      const body = new FormData();

      body.append("file", file);

      body.append(
        "jobDescription",
        jobDescription
      );


      const data = await api(
        "/start-interview",
        {
          method: "POST",
          body
        }
      );


      setInterview(data);

      setScreen("profile");

    } catch (e) {

      setError(e.message);

      setScreen("setup");

    } finally {

      setLoading(false);

    }
  };


  // ==========================================================
  // LOAD FIRST QUESTION
  // ==========================================================

  const loadQuestion = async () => {

    if (!interview?.interviewId) {
      return;
    }


    setLoading(true);

    setError("");

    setAnswer("");


    try {

      const data = await api(
        `/interview/${interview.interviewId}/question`,
        {
          method: "POST"
        }
      );


      setQuestion(data);

      setSeconds(0);

      setScreen("interview");


      // IMPORTANT:
      // Audio is now returned by the SAME route.
      if (data.audio) {

        playQuestionAudio(
          data.audio,
          data.audioMimeType || "audio/wav"
        );

      }

    } catch (e) {

      if (
        e.message
          .toLowerCase()
          .includes("completed")
      ) {

        setScreen("results");

      } else {

        setError(e.message);
      }

    } finally {

      setLoading(false);

    }
  };


  // ==========================================================
  // SUBMIT ANSWER
  // ==========================================================

  const submitAnswer = async () => {

    if (
      !answer.trim() ||
      !question ||
      loading
    ) {
      return;
    }


    // Stop recording
    stopListening();

    // Stop current interviewer audio
    stopVoice();


    setLoading(true);

    setError("");


    try {

      const data = await api(
        `/interview/${interview.interviewId}/answer`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            answer: answer.trim()
          })
        }
      );


      // ==========================================
      // Save question evaluation
      // ==========================================

      const completedEvaluation = {

        ...(data.evaluation || {}),

        question:
          question.question,

        questionNumber:
          question.questionNumber,

        topic:
          question.topic,

        difficulty:
          question.difficulty
      };


      setEvaluations(
        prev => [
          ...prev,
          completedEvaluation
        ]
      );


      // ==========================================
      // Interview completed
      // ==========================================

      if (data.completed) {

        setOverall(
          data.overallEvaluation
        );

        setScreen("results");

        return;
      }


      // ==========================================
      // Next question
      // ==========================================

      const nextQ = {

        question:
          data.question,

        questionNumber:
          data.questionNumber,

        totalQuestions:
          data.totalQuestions,

        topic:
          data.topic,

        difficulty:
          data.difficulty,

        // NEW
        audio:
          data.audio,

        audioMimeType:
          data.audioMimeType
      };


      setQuestion(nextQ);

      setAnswer("");

      setSeconds(0);


      // ==========================================
      // Play TTS returned from /answer
      // ==========================================

      if (data.audio) {

        playQuestionAudio(
          data.audio,
          data.audioMimeType || "audio/wav"
        );
      }

    } catch (e) {

      setError(e.message);

    } finally {

      setLoading(false);
    }
  };


  // ==========================================================
  // TIMER
  // ==========================================================

  useEffect(() => {

    if (screen !== "interview") {
      return;
    }


    const timer =
      setInterval(
        () =>
          setSeconds(
            s => s + 1
          ),
        1000
      );


    return () =>
      clearInterval(timer);

  }, [screen]);


  // ==========================================================
  // FORMAT TIME
  // ==========================================================

  const formatTime = s => {

    return `${String(
      Math.floor(s / 60)
    ).padStart(2, "0")}:${String(
      s % 60
    ).padStart(2, "0")}`;

  };


  // ==========================================================
  // RESET
  // ==========================================================

  const reset = () => {

    stopVoice();

    stopListening();


    setScreen("setup");

    setFile(null);

    setJobDescription("");

    setInterview(null);

    setQuestion(null);

    setAnswer("");

    setEvaluations([]);

    setOverall(null);

    setError("");

    setVoiceState("IDLE");

    setSttState("IDLE");

    setMicNotice("");
  };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="app-shell">

      <style>{`
        .app-shell small { font-size: 0.82rem; line-height: 1.45; }
        .app-shell .panel-kicker,
        .app-shell .session-label,
        .app-shell .required { font-size: 0.76rem; line-height: 1.35; }
        .app-shell .input-meta,
        .app-shell .answer-footer,
        .app-shell .stt-notice,
        .app-shell .listening-indicator,
        .app-shell .answer-hints { font-size: 0.86rem; line-height: 1.5; }
      `}</style>

      <header className="topbar">

        <button
          className="brand"
          onClick={() =>
            setScreen("home")
          }
        >

          <span className="brand-mark">
            <Icon
              name="spark"
              size={18}
            />
          </span>

          <span>
            intervue
            <span className="brand-accent">
              ai
            </span>
          </span>

        </button>


        <div className="topbar-right">

          <div className="status-pill">

            <span className="status-dot" />

            AI interviewer online

          </div>


          <button className="avatar">

            <Icon
              name="user"
              size={17}
            />

          </button>

        </div>

      </header>


      {error && (

        <div className="toast error-toast">

          <span>{error}</span>

          <button
            onClick={() =>
              setError("")
            }
          >

            <Icon
              name="close"
              size={16}
            />

          </button>

        </div>

      )}


      {screen === "home" && (
        <Home
          onStart={() =>
            setScreen("setup")
          }
        />
      )}


      {screen === "setup" && (

        <Setup
          file={file}
          setFile={setFile}
          jobDescription={
            jobDescription
          }
          setJobDescription={
            setJobDescription
          }
          fileInput={fileInput}
          onStart={
            startInterview
          }
          loading={loading}
        />

      )}


      {screen === "processing" && (
        <Processing />
      )}


      {screen === "profile" && (

        <Profile
          data={interview}
          onContinue={
            loadQuestion
          }
          loading={loading}
        />

      )}


      {screen === "interview" && (

        <Interview

          question={question}

          answer={answer}

          setAnswer={setAnswer}

          seconds={seconds}

          formatTime={formatTime}

          voiceState={
            voiceState
          }

          onPlayVoice={
            handlePlayAudio
          }

          onStopVoice={
            stopVoice
          }

          sttState={sttState}

          isSttSupported={
            Boolean(SpeechRec)
          }

          micNotice={
            micNotice
          }

          onStartListening={
            startListening
          }

          onStopListening={
            stopListening
          }

          onSubmit={
            submitAnswer
          }

          loading={loading}

        />

      )}


      {screen === "results" && (

        <Results
          overall={overall}
          evaluations={
            evaluations
          }
          interview={
            interview
          }
          onReset={reset}
        />

      )}


      {sidebarOpen && (

        <div
          className="mobile-overlay"
          onClick={() =>
            setSidebarOpen(false)
          }
        />

      )}


      <button
        className="mobile-menu"
        onClick={() =>
          setSidebarOpen(
            v => !v
          )
        }
      >

        <Icon name="menu" />

      </button>

    </div>
  );
}


// ============================================================
// HOME
// ============================================================

function Home({ onStart }) {

  return (

    <main className="home page">

      <div className="orb orb-one" />

      <div className="orb orb-two" />


      <section className="hero">

        <div className="eyebrow">

          <span className="eyebrow-line" />

          ADAPTIVE INTERVIEW COACH

        </div>


        <h1>
          Practice the interview.
          <br />
          <em>Not the script.</em>
        </h1>


        <p className="hero-copy">

          Upload your resume, add the job
          description, and let AI build a
          personalized technical interview
          that responds to how you actually
          perform.

        </p>


        <div className="hero-actions">

          <button
            className="primary-btn large"
            onClick={onStart}
          >

            Start an interview

            <Icon
              name="arrow"
              size={18}
            />

          </button>


          <div className="micro-proof">

            <span className="proof-avatars">
              AI
            </span>

            <span>
              Resume-aware · Adaptive ·
              Groq Orpheus Voice
            </span>

          </div>

        </div>

      </section>


      <section className="feature-grid">

        <Feature
          icon="target"
          title="Resume-aware"
          text="Questions connect to your actual skills, projects and experience."
        />

        <Feature
          icon="trend"
          title="Adaptive difficulty"
          text="Your performance influences what gets asked next."
        />

        <Feature
          icon="shield"
          title="Voice & Buffering"
          text="Interviewer speaks with Groq Orpheus while questions buffer with zero lag."
        />

      </section>

    </main>
  );
}


// ============================================================
// FEATURE
// ============================================================

function Feature({
  icon,
  title,
  text
}) {

  return (

    <div className="feature-card">

      <div className="feature-icon">

        <Icon name={icon} />

      </div>

      <div>

        <h3>{title}</h3>

        <p>{text}</p>

      </div>

    </div>

  );
}


// ============================================================
// SETUP
// ============================================================

function Setup({
  file,
  setFile,
  jobDescription,
  setJobDescription,
  fileInput,
  onStart,
  loading
}) {

  const [drag, setDrag] =
    useState(false);


  const acceptFile = f => {

    if (
      f?.type ===
      "application/pdf"
    ) {
      setFile(f);
    }

  };


  return (

    <main className="page setup-page">

      <div className="section-heading">

        <div>

          <div className="eyebrow">

            <span className="eyebrow-line" />

            SET UP YOUR SESSION

          </div>


          <h2>
            Give the interviewer some context.
          </h2>


          <p>
            The more relevant context you
            provide, the more targeted the
            interview becomes.
          </p>

        </div>


        <div className="stepper">

          <span className="step active">
            01
          </span>

          <i />

          <span className="step">
            02
          </span>

          <i />

          <span className="step">
            03
          </span>

        </div>

      </div>


      <div className="setup-grid">

        <div className="panel">

          <div className="panel-head">

            <div>

              <span className="panel-kicker">
                01 · RESUME
              </span>

              <h3>
                Your experience
              </h3>

            </div>


            <span className="required">
              PDF · MAX 2 MB
            </span>

          </div>


          <div
            className={`dropzone ${
              drag ? "dragging" : ""
            } ${
              file ? "has-file" : ""
            }`}

            onDragOver={e => {
              e.preventDefault();
              setDrag(true);
            }}

            onDragLeave={() =>
              setDrag(false)
            }

            onDrop={e => {

              e.preventDefault();

              setDrag(false);

              acceptFile(
                e.dataTransfer.files?.[0]
              );

            }}

            onClick={() =>
              fileInput.current?.click()
            }
          >

            <input
              ref={fileInput}
              type="file"
              accept="application/pdf"
              hidden
              onChange={e =>
                acceptFile(
                  e.target.files?.[0]
                )
              }
            />


            {file ? (

              <>

                <div className="file-icon">

                  <Icon
                    name="file"
                    size={26}
                  />

                </div>


                <strong>
                  {file.name}
                </strong>


                <span>
                  {(file.size / 1024 / 1024).toFixed(2)}
                  {" "}MB · PDF selected
                </span>


                <button
                  className="text-btn"

                  onClick={e => {

                    e.stopPropagation();

                    setFile(null);

                  }}
                >

                  Choose another

                </button>

              </>

            ) : (

              <>

                <div className="upload-icon">

                  <Icon
                    name="upload"
                    size={24}
                  />

                </div>


                <strong>
                  Drop your resume here
                </strong>


                <span>
                  or click to browse your files
                </span>


                <small>
                  Your PDF is used only to build
                  your interview profile.
                </small>

              </>

            )}

          </div>

        </div>


        <div className="panel">

          <div className="panel-head">

            <div>

              <span className="panel-kicker">
                02 · ROLE
              </span>

              <h3>
                Job description
              </h3>

            </div>


            <span className="required">
              REQUIRED
            </span>

          </div>


          <textarea
            className="jd-input"

            value={jobDescription}

            onChange={e =>
              setJobDescription(
                e.target.value
              )
            }

            placeholder={
              "Paste the job description here...\n\nInclude responsibilities, requirements, technologies and anything else the company is looking for."
            }
          />


          <div className="input-meta">

            <span>
              {jobDescription.length}
              {" "}characters
            </span>

            <span>
              Tip: include the tech stack
            </span>

          </div>

        </div>

      </div>


      <div className="setup-footer">

        <div className="privacy-note">

          <Icon
            name="shield"
            size={17}
          />

          <span>
            Session data stays in your current
            backend session.
          </span>

        </div>


        <button
          className="primary-btn"

          disabled={
            loading ||
            !file ||
            !jobDescription.trim()
          }

          onClick={onStart}
        >

          {loading
            ? "Building your interview…"
            : "Build my interview"}

          <Icon
            name="arrow"
            size={17}
          />

        </button>

      </div>

    </main>
  );
}


// ============================================================
// PROCESSING
// ============================================================

function Processing() {

  return (

    <main className="page centered">

      <div className="processing-card">

        <div className="loader-ring" />

        <div className="eyebrow">
          BUILDING YOUR SESSION
        </div>

        <h2>
          Reading your experience
          <span className="dots">
            ...
          </span>
        </h2>

        <p>
          Profiling your resume and matching
          it with the role requirements.
        </p>


        <div className="processing-steps">

          <span>
            <b>✓</b>
            Resume uploaded
          </span>

          <span>
            <b className="pulse">
              •
            </b>
            Creating candidate profile
          </span>

          <span>
            <b>○</b>
            Planning interview topics
          </span>

        </div>

      </div>

    </main>
  );
}


// ============================================================
// PROFILE
// ============================================================

function Profile({
  data,
  onContinue,
  loading
}) {

  const p =
    data?.candidate || {};

  const plan =
    data?.interviewPlan || {};


  const skills =
    Object.entries(
      p.technical_skills || {}
    )
      .flatMap(
        ([k, v]) =>
          v.map(x => ({
            x,
            k
          }))
      );


  return (

    <main className="page profile-page">

      <div className="profile-hero">

        <div>

          <div className="eyebrow">

            <span className="eyebrow-line" />

            YOUR INTERVIEW PROFILE

          </div>


          <h2>

            Meet your interviewer,
            <br />

            <em>
              {p.name || "candidate"}.
            </em>

          </h2>


          <p>
            We've mapped your background
            against the role. Here's what the
            session will focus on.
          </p>

        </div>


        <div className="profile-badge">

          <Icon
            name="spark"
            size={21}
          />

          <span>
            AI
            <br />
            <small>matched</small>
          </span>

        </div>

      </div>


      <div className="profile-grid">

        <div className="panel">

          <span className="panel-kicker">
            CANDIDATE SNAPSHOT
          </span>

          <h3>
            {p.name || "Candidate"}
          </h3>


          <div className="education">

            {(p.education || [])
              .map((e, i) => (

                <div
                  className="edu"
                  key={i}
                >

                  <span>
                    {e.degree}
                  </span>

                  <b>
                    {e.institution}
                  </b>

                  <small>

                    {e.duration}

                    {e.cgpa
                      ? ` · CGPA ${e.cgpa}`
                      : ""}

                  </small>

                </div>

              ))}

          </div>

        </div>


        <div className="panel">

          <span className="panel-kicker">
            INTERVIEW PLAN
          </span>

          <h3>
            {plan.difficulty ||
              "Adaptive"}{" "}
            difficulty
          </h3>


          <div className="topic-list">

            {(plan.topics || [])
              .map((t, i) => (

                <div
                  className="topic-row"
                  key={i}
                >

                  <span className="topic-index">
                    0{i + 1}
                  </span>

                  <div>

                    <b>
                      {t.topic}
                    </b>

                    <small>
                      {t.reason}
                    </small>

                  </div>

                  <strong>

                    {t.question_count}

                    {" "}

                    {t.question_count === 1
                      ? "Q"
                      : "Qs"}

                  </strong>

                </div>

              ))}

          </div>

        </div>

      </div>


      <div className="skill-strip">

        <span className="panel-kicker">
          SKILLS IN SCOPE
        </span>


        <div className="chips">

          {skills
            .slice(0, 18)
            .map((s, i) => (

              <span
                className="chip"
                key={i}
              >
                {s.x}
              </span>

            ))}

        </div>

      </div>


      <div className="continue-row">

        <span>

          <Icon
            name="clock"
            size={16}
          />

          Take your time. Questions adapt
          as you answer.

        </span>


        <button
          className="primary-btn"
          onClick={onContinue}
          disabled={loading}
        >

          {loading
            ? "Generating first question…"
            : "Enter interview"}

          <Icon
            name="arrow"
            size={17}
          />

        </button>

      </div>

    </main>
  );
}


// ============================================================
// INTERVIEW
// ============================================================

function Interview({
  question,
  answer,
  setAnswer,
  seconds,
  formatTime,
  voiceState,
  onPlayVoice,
  onStopVoice,
  sttState,
  isSttSupported,
  micNotice,
  onStartListening,
  onStopListening,
  onSubmit,
  loading
}) {

  const [focus, setFocus] =
    useState(false);


  const totalQ =
    question?.totalQuestions || 5;

  const currentQNum =
    question?.questionNumber || 1;


  return (

    <main className="page interview-page">

      <div className="interview-top">

        <div>

          <span className="session-label">
            TECHNICAL INTERVIEW
          </span>


          <div className="question-progress">

            Question{" "}

            <b>
              {currentQNum}
            </b>

            {" "}of{" "}

            <b>
              {totalQ}
            </b>

          </div>

        </div>


        <div className="timer">

          <Icon
            name="clock"
            size={16}
          />

          {formatTime(seconds)}

        </div>

      </div>


      <div className="progress-line">

        <span
          style={{
            width: `${Math.min(
              (currentQNum /
                totalQ) *
                100,
              100
            )}%`
          }}
        />

      </div>


      <div className="interview-layout">

        <aside className="interview-sidebar">

          <div className="side-card current">

            <span className="panel-kicker">
              CURRENT TOPIC
            </span>

            <h4>
              {question?.topic ||
                "Technical skills"}
            </h4>


            <div className="difficulty">

              <span className="dot" />

              Adaptive:{" "}
              {question?.difficulty ||
                "medium"}

            </div>

          </div>


          <div className="side-card">

            <span className="panel-kicker">
              INTERVIEWER VOICE
            </span>

            <p>
              Interviewer questions use
              Groq Orpheus. You can answer
              using voice or keyboard.
            </p>

          </div>

        </aside>


        <section className="question-area">

          <div className="question-meta">

            <span>
              QUESTION {currentQNum}
            </span>


            <div className="voice-controls">

              {voiceState ===
                "LOADING" && (

                <span className="voice-status-pill loading">

                  <span className="pulse-dot" />

                  Preparing voice…

                </span>

              )}


              {voiceState ===
                "SPEAKING" && (

                <button
                  className="icon-btn speaking"
                  onClick={
                    onStopVoice
                  }
                  title="Stop voice"
                >

                  <Icon
                    name="volume"
                    size={17}
                  />

                  Speaking

                  <span className="sound-wave">

                    <span />
                    <span />
                    <span />

                  </span>

                </button>

              )}


              {voiceState ===
                "READY_TO_PLAY" && (

                <button
                  className="icon-btn highlight"
                  onClick={
                    onPlayVoice
                  }
                  title="Play question audio"
                >

                  <Icon
                    name="volume"
                    size={17}
                  />

                  Play Question

                </button>

              )}


              {voiceState ===
                "ERROR" && (

                <button
                  className="icon-btn"
                  onClick={
                    onPlayVoice
                  }
                  title="Retry voice"
                >

                  <Icon
                    name="volumeX"
                    size={17}
                  />

                  Retry Voice

                </button>

              )}


              {voiceState ===
                "IDLE" && (

                <button
                  className="icon-btn"
                  onClick={
                    onPlayVoice
                  }
                  title="Listen again"
                >

                  <Icon
                    name="volume"
                    size={17}
                  />

                  Listen

                </button>

              )}

            </div>

          </div>


          <h1>
            {question?.question}
          </h1>


          {/* ==================================================
              SPEECH RECOGNITION
          ================================================== */}

          <div className="stt-bar">

            {isSttSupported ? (

              (sttState === "LISTENING" ||
                sttState === "RECONNECTING") ? (

                <button
                  className="mic-btn recording"
                  type="button"
                  onClick={
                    onStopListening
                  }
                >

                  <span className="rec-dot" />

                  Stop Recording

                </button>

              ) : (

                <button
                  className="mic-btn idle"
                  type="button"
                  onClick={
                    onStartListening
                  }
                >

                  <Icon
                    name="mic"
                    size={16}
                  />

                  Start Answer (Voice)

                </button>

              )

            ) : (

              <span className="stt-notice muted">

                <Icon
                  name="micOff"
                  size={14}
                />

                Voice input isn't supported
                in this browser. You can type
                your answer.

              </span>

            )}


            {sttState ===
              "LISTENING" && (

              <span className="listening-indicator">

                <span className="pulsing-mic" />

                Listening… Speak clearly

              </span>

            )}


            {micNotice && (

              <span className="stt-notice warning">

                {micNotice}

              </span>

            )}

          </div>


          {/* ==================================================
              ANSWER
          ================================================== */}

          <div
            className={`answer-box ${
              focus ? "focused" : ""
            }`}
          >

            <textarea

              value={answer}

              onFocus={() =>
                setFocus(true)
              }

              onBlur={() =>
                setFocus(false)
              }

              onChange={e =>
                setAnswer(
                  e.target.value
                )
              }

              placeholder="Speak using the microphone or type your answer here. You can review and edit your transcript before submitting…"

            />


            <div className="answer-footer">

              <span>
                {answer.length}
                {" "}characters
              </span>


              <button
                className="secondary-btn submit-btn"

                disabled={
                  !answer.trim() ||
                  loading
                }

                onClick={
                  onSubmit
                }
              >

                {loading
                  ? "Evaluating…"
                  : "Submit answer"}

                <Icon
                  name="send"
                  size={16}
                />

              </button>

            </div>

          </div>


          <div className="answer-hints">

            <span>

              <kbd>Tip</kbd>

              Structure your answer:
              approach → implementation →
              trade-offs.

            </span>


            <span className="optional-mic">

              <Icon
                name="mic"
                size={14}
              />

              Answers are submitted only
              when you click "Submit answer".

            </span>

          </div>

        </section>

      </div>

    </main>
  );
}


// ============================================================
// RESULTS
// ============================================================

function Results({
  overall,
  evaluations = [],
  interview,
  onReset
}) {

  if (!overall) {

    return (

      <main className="page centered">

        <div className="processing-card">

          <div className="eyebrow">
            SESSION COMPLETE
          </div>

          <h2>
            Evaluation is being prepared
          </h2>

          <p>
            The interview has ended. Your
            final evaluation will appear here
            once the backend returns it.
          </p>


          <button
            className="primary-btn"
            onClick={onReset}
          >
            Start again
          </button>

        </div>

      </main>
    );
  }


  const formatScore = val => {

    const num = Number(val);

    return Number.isFinite(num)
      ? num.toFixed(1)
      : "—";
  };


  const metrics = [

    [
      "Technical knowledge",
      overall.technical_knowledge
    ],

    [
      "Problem solving",
      overall.problem_solving
    ],

    [
      "Communication",
      overall.communication
    ]

  ];


  return (

    <main className="page results-page">

      <div className="results-heading">

        <div>

          <div className="eyebrow">

            <span className="eyebrow-line" />

            SESSION COMPLETE

          </div>


          <h2>
            Interview debrief.
          </h2>


          <p>
            Your overall performance and
            evidence from every answer,
            evaluated at the end.
          </p>

        </div>


        <div className="final-score">

          <span>
            OVERALL
          </span>

          <strong>
            {formatScore(
              overall.overall_score
            )}
          </strong>

          <small>
            / 10
          </small>

        </div>

      </div>


      <div className="metric-grid">

        {metrics.map(
          ([label, value]) => {

            const scoreNum =
              Number(value);

            const percent =
              Number.isFinite(
                scoreNum
              )
                ? Math.min(
                    Math.max(
                      scoreNum * 10,
                      0
                    ),
                    100
                  )
                : 0;


            return (

              <div
                className="metric-card"
                key={label}
              >

                <span>
                  {label}
                </span>

                <div className="metric-value">

                  {formatScore(value)}

                  <small>
                    /10
                  </small>

                </div>


                <div className="metric-bar">

                  <span
                    style={{
                      width:
                        `${percent}%`
                    }}
                  />

                </div>

              </div>
            );
          }
        )}

      </div>


      <div className="results-grid">

        <div className="panel">

          <span className="panel-kicker">
            SUMMARY
          </span>

          <p className="summary">
            {overall.summary ||
              "Summary of interview performance."}
          </p>


          <div className="recommendation">

            <span className="panel-kicker">
              RECOMMENDATION
            </span>

            <p>
              {overall.recommendation ||
                "Recommended next steps."}
            </p>

          </div>

        </div>


        <div className="panel">

          <span className="panel-kicker">
            PERFORMANCE SNAPSHOT
          </span>


          <div className="focus-list">

            {(overall.strengths || [])
              .map((x, i) => (

                <div key={i}>

                  <span className="check-circle">

                    <Icon
                      name="check"
                      size={13}
                    />

                  </span>

                  {x}

                </div>

              ))}


            {(overall.areas_for_improvement || [])
              .map((x, i) => (

                <div
                  key={"i" + i}
                >

                  <span className="warning-circle">
                    !
                  </span>

                  {x}

                </div>

              ))}

          </div>

        </div>

      </div>


      <section className="question-review">

        <div className="review-heading">

          <div>

            <span className="panel-kicker">
              QUESTION-WISE EVALUATION
            </span>

            <h3>
              Every answer, reviewed.
            </h3>

          </div>


          <span className="review-count">

            {evaluations.length}
            {" "}answers

          </span>

        </div>


        <div className="review-list">

          {evaluations.map(
            (ev, i) => {

              const scoreNum =
                Number(ev.score);

              const scoreText =
                Number.isFinite(
                  scoreNum
                )
                  ? scoreNum.toFixed(1)
                  : "—";


              const correctness =
                (
                  ev.correctness ||
                  "evaluated"
                ).replaceAll(
                  "_",
                  " "
                );


              return (

                <details
                  className="review-card"
                  key={`${ev.questionNumber || i}-${i}`}
                >

                  <summary>

                    <span className="review-number">

                      {String(
                        ev.questionNumber ||
                          i + 1
                      ).padStart(
                        2,
                        "0"
                      )}

                    </span>


                    <span className="review-question">

                      <b>
                        {ev.question ||
                          `Question ${i + 1}`}
                      </b>

                      <small>

                        {ev.topic ||
                          "Technical interview"}

                        {" · "}

                        {correctness}

                      </small>

                    </span>


                    <strong>

                      {scoreText}

                      <small>
                        /10
                      </small>

                    </strong>


                    <Icon
                      name="chevron"
                      size={17}
                    />

                  </summary>


                  <div className="review-body">

                    <div className="review-columns">

                      <div>

                        <span className="panel-kicker">
                          FEEDBACK
                        </span>

                        <p>
                          {ev.feedback}
                        </p>

                      </div>


                      <div>

                        <span className="panel-kicker">
                          CONCEPTS COVERED
                        </span>

                        <div className="chips">

                          {(ev.concepts_covered || [])
                            .map(
                              (x, j) => (

                                <span
                                  className="chip"
                                  key={j}
                                >
                                  {x}
                                </span>

                              )
                            )}

                        </div>

                      </div>


                      <div>

                        <span className="panel-kicker">
                          STRENGTHS
                        </span>

                        <ul className="mini-list">

                          {(ev.strengths || [])
                            .map(
                              (x, j) => (

                                <li key={j}>

                                  <span>
                                    +
                                  </span>

                                  {x}

                                </li>

                              )
                            )}

                        </ul>

                      </div>


                      <div>

                        <span className="panel-kicker">
                          AREAS TO IMPROVE
                        </span>

                        <ul className="mini-list improve">

                          {(ev.weaknesses || [])
                            .map(
                              (x, j) => (

                                <li key={j}>

                                  <span>
                                    −
                                  </span>

                                  {x}

                                </li>

                              )
                            )}

                        </ul>

                      </div>

                    </div>

                  </div>

                </details>

              );
            }
          )}


          {!evaluations.length && (

            <div className="empty-review">

              No question-wise evaluations
              were recorded.

            </div>

          )}

        </div>

      </section>


      <div className="results-actions">

        <button
          className="secondary-btn"
          onClick={onReset}
        >

          <Icon
            name="rotate"
            size={16}
          />

          Practice another interview

        </button>

      </div>

    </main>
  );
}


// ============================================================
// MOUNT
// ============================================================

createRoot(
  document.getElementById("root")
).render(
  <App />
);