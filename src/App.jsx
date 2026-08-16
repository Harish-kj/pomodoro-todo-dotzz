import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";

// ─── Types / Constants ──────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  workDuration: 25,
  breakDuration: 5,
  autoStartBreak: true,
  theme: "tomato",
};

const THEMES = {
  tomato: {
    name: "Tomato Red",
    work: "#E8431A",
    workLight: "#FF6B47",
    break: "#27AE60",
    breakLight: "#52D68A",
    bg: "#1A1A1A",
    surface: "#242424",
    surfaceHigh: "#2E2E2E",
    text: "#F5F5F0",
    textMuted: "#888880",
    accent: "#FF6B47",
    border: "#333330",
  },
  mint: {
    name: "Mint Green",
    work: "#E8431A",
    workLight: "#FF6B47",
    break: "#10B981",
    breakLight: "#34D399",
    bg: "#F0FDF4",
    surface: "#FFFFFF",
    surfaceHigh: "#ECFDF5",
    text: "#1A2E1A",
    textMuted: "#6B7280",
    accent: "#10B981",
    border: "#D1FAE5",
  },
  midnight: {
    name: "Midnight Dark",
    work: "#E8431A",
    workLight: "#FF6B47",
    break: "#6366F1",
    breakLight: "#818CF8",
    bg: "#0F0F1A",
    surface: "#16162A",
    surfaceHigh: "#1E1E35",
    text: "#E2E8F0",
    textMuted: "#64748B",
    accent: "#6366F1",
    border: "#2D2D4A",
  },
};

// ─── Context ─────────────────────────────────────────────────────────────────
const AppContext = createContext(null);
const useApp = () => useContext(AppContext);

// ─── Utility: localStorage ────────────────────────────────────────────────────
const load = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};
const save = (key, val) => localStorage.setItem(key, JSON.stringify(val));

// ─── Utility: audio beep ──────────────────────────────────────────────────────
const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine"; osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start(); osc.stop(ctx.currentTime + 0.8);
  } catch {}
};

// ─── Inline styles object factory ───────────────────────────────────────────
const makeStyles = (t) => ({
  app: {
    minHeight: "100vh",
    background: t.bg,
    color: t.text,
    fontFamily: "'Inter', system-ui, sans-serif",
    display: "flex",
    flexDirection: "column",
    transition: "background 0.3s, color 0.3s",
  },
  header: {
    background: t.surface,
    borderBottom: `1px solid ${t.border}`,
    padding: "0 24px",
    height: 56,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 1px 8px rgba(0,0,0,0.15)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  logo: {
    display: "flex", alignItems: "center", gap: 10,
    fontSize: 18, fontWeight: 700, letterSpacing: "-0.5px",
    color: t.text,
  },
  iconBtn: {
    background: "none", border: "none", cursor: "pointer",
    color: t.textMuted, padding: 8, borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "background 0.15s, color 0.15s",
  },
  main: {
    flex: 1, maxWidth: 720, width: "100%",
    margin: "0 auto", padding: "24px 16px",
    display: "flex", flexDirection: "column", gap: 20,
  },
  dashboard: {
    background: t.surface,
    border: `1px solid ${t.border}`,
    borderRadius: 16,
    padding: 20,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 16,
  },
  statCard: {
    display: "flex", flexDirection: "column", gap: 4,
    alignItems: "center", textAlign: "center",
  },
  statValue: { fontSize: 28, fontWeight: 800, lineHeight: 1 },
  statLabel: { fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" },
  progressBar: {
    height: 6, background: t.surfaceHigh, borderRadius: 999,
    overflow: "hidden", gridColumn: "1 / -1",
  },
  progressFill: {
    height: "100%", background: t.work,
    borderRadius: 999, transition: "width 0.4s ease",
  },
  section: {
    background: t.surface,
    border: `1px solid ${t.border}`,
    borderRadius: 16,
    overflow: "hidden",
  },
  sectionHead: {
    padding: "14px 20px",
    borderBottom: `1px solid ${t.border}`,
    display: "flex", alignItems: "center", gap: 10,
    fontSize: 13, fontWeight: 600, color: t.textMuted,
    textTransform: "uppercase", letterSpacing: "0.05em",
  },
  addRow: {
    display: "flex", gap: 10, padding: "12px 16px",
    borderBottom: `1px solid ${t.border}`,
  },
  addInput: {
    flex: 1, background: t.surfaceHigh,
    border: `1px solid ${t.border}`,
    borderRadius: 10, padding: "10px 14px",
    color: t.text, fontSize: 14, outline: "none",
    transition: "border-color 0.15s",
  },
  addBtn: {
    background: t.work, color: "#fff",
    border: "none", borderRadius: 10,
    padding: "10px 18px", fontSize: 14, fontWeight: 600,
    cursor: "pointer", whiteSpace: "nowrap",
    transition: "opacity 0.15s",
  },
  taskItem: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 16px",
    borderBottom: `1px solid ${t.border}`,
    transition: "background 0.15s",
    userSelect: "none",
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    border: `2px solid ${t.border}`, background: "none",
    cursor: "pointer", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.15s",
  },
  taskLabel: { flex: 1, fontSize: 14, lineHeight: 1.4, wordBreak: "break-word" },
  taskDone: { textDecoration: "line-through", color: t.textMuted },
  tomatoBtn: {
    background: "none", border: "none", cursor: "pointer",
    fontSize: 18, padding: 4, borderRadius: 8,
    transition: "transform 0.15s",
    flexShrink: 0,
  },
  deleteBtn: {
    background: "none", border: "none", cursor: "pointer",
    color: t.textMuted, padding: 4, borderRadius: 8,
    fontSize: 14, opacity: 0,
    transition: "opacity 0.15s, color 0.15s",
    flexShrink: 0,
  },
  empty: {
    padding: "32px 16px", textAlign: "center",
    color: t.textMuted, fontSize: 14,
  },
  // Timer overlay
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 500, padding: 20,
  },
  timerModal: {
    background: t.surface,
    border: `1px solid ${t.border}`,
    borderRadius: 24,
    padding: "32px 28px",
    width: "100%", maxWidth: 380,
    display: "flex", flexDirection: "column",
    alignItems: "center", gap: 24,
    boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
  },
  timerTitle: {
    fontSize: 13, fontWeight: 600, color: t.textMuted,
    textTransform: "uppercase", letterSpacing: "0.06em",
    textAlign: "center",
  },
  timerControls: {
    display: "flex", gap: 14, alignItems: "center",
  },
  timerControlBtn: {
    background: t.surfaceHigh, border: `1px solid ${t.border}`,
    borderRadius: 10, width: 36, height: 36,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: t.text, fontSize: 18, fontWeight: 700,
    transition: "background 0.15s",
  },
  timerMinutes: {
    fontSize: 15, fontWeight: 700, color: t.text, minWidth: 60, textAlign: "center",
  },
  timerActions: {
    display: "flex", gap: 12,
  },
  timerBtn: {
    border: "none", borderRadius: 12,
    padding: "12px 28px", fontSize: 15, fontWeight: 700,
    cursor: "pointer", transition: "opacity 0.15s, transform 0.1s",
  },
  settingsOverlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 600, padding: 20,
  },
  settingsModal: {
    background: t.surface,
    border: `1px solid ${t.border}`,
    borderRadius: 24,
    padding: "28px 28px",
    width: "100%", maxWidth: 400,
    display: "flex", flexDirection: "column", gap: 24,
    boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
  },
  settingsTitle: {
    fontSize: 18, fontWeight: 700, color: t.text,
    display: "flex", justifyContent: "space-between", alignItems: "center",
  },
  settingsSection: {
    display: "flex", flexDirection: "column", gap: 14,
  },
  settingsSectionLabel: {
    fontSize: 11, fontWeight: 600, color: t.textMuted,
    textTransform: "uppercase", letterSpacing: "0.06em",
  },
  settingsRow: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between", gap: 12,
  },
  settingsRowLabel: { fontSize: 14, color: t.text },
  numInput: {
    background: t.surfaceHigh, border: `1px solid ${t.border}`,
    borderRadius: 8, padding: "6px 10px", color: t.text,
    fontSize: 14, width: 64, textAlign: "center", outline: "none",
  },
  toggle: (on) => ({
    width: 44, height: 24, borderRadius: 999,
    background: on ? t.accent : t.border,
    cursor: "pointer", border: "none",
    position: "relative", transition: "background 0.2s",
    flexShrink: 0,
  }),
  toggleThumb: (on) => ({
    position: "absolute", top: 3,
    left: on ? 23 : 3,
    width: 18, height: 18, borderRadius: "50%",
    background: "#fff",
    transition: "left 0.2s",
    pointerEvents: "none",
  }),
  themeGrid: {
    display: "flex", gap: 10, flexWrap: "wrap",
  },
  themeChip: (active, color) => ({
    padding: "6px 14px", borderRadius: 999,
    border: active ? `2px solid ${color}` : `2px solid transparent`,
    background: active ? `${color}22` : t.surfaceHigh,
    color: active ? color : t.textMuted,
    cursor: "pointer", fontSize: 13, fontWeight: 600,
    transition: "all 0.15s",
  }),
});

// ─── SVG Timer Face ───────────────────────────────────────────────────────────
const TimerFace = ({ progress, isBreak, timeLeft, total, theme: t }) => {
  const r = 90;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - progress);
  const color = isBreak ? t.break : t.work;
  const lightColor = isBreak ? t.breakLight : t.workLight;

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");

  return (
    <svg width="220" height="220" viewBox="0 0 220 220">
      <defs>
        <radialGradient id="faceGrad" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor={lightColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </radialGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor={color} floodOpacity="0.35" />
        </filter>
      </defs>
      {/* Background circle */}
      <circle cx="110" cy="110" r={r + 12} fill={color} opacity="0.08" />
      <circle cx="110" cy="110" r={r} fill="url(#faceGrad)" filter="url(#shadow)" />
      {/* Track */}
      <circle cx="110" cy="110" r={r}
        fill="none" stroke={color} strokeWidth="10" strokeOpacity="0.15"
        strokeDasharray={circ} strokeDashoffset="0" />
      {/* Progress arc */}
      <circle cx="110" cy="110" r={r}
        fill="none" stroke={color} strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={dash}
        transform="rotate(-90 110 110)"
        style={{ transition: "stroke-dashoffset 0.5s ease" }} />
      {/* Countdown */}
      <text x="110" y="100" textAnchor="middle" fill={t.text}
        fontSize="36" fontWeight="800" fontFamily="'Inter', monospace" letterSpacing="-1">
        {mins}:{secs}
      </text>
      <text x="110" y="126" textAnchor="middle" fill={t.textMuted}
        fontSize="12" fontWeight="500" fontFamily="'Inter', sans-serif">
        {isBreak ? "BREAK" : "FOCUS"}
      </text>
    </svg>
  );
};

// ─── Timer Modal ──────────────────────────────────────────────────────────────
const TimerModal = ({ task, onClose }) => {
  const { settings, theme: t, addPomodoro } = useApp();
  const s = makeStyles(t);

  const [workMins, setWorkMins] = useState(settings.workDuration);
  const [phase, setPhase] = useState("work"); // "work" | "break" | "done"
  const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);
  const totalRef = useRef(settings.workDuration * 60);

  const total = phase === "work" ? workMins * 60 : settings.breakDuration * 60;
  const progress = 1 - timeLeft / total;

  const reset = useCallback(() => {
    clearInterval(intervalRef.current);
    setRunning(false);
    const secs = workMins * 60;
    setTimeLeft(secs);
    totalRef.current = secs;
    setPhase("work");
  }, [workMins]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          playBeep();
          if (phase === "work") {
            addPomodoro();
            if (settings.autoStartBreak) {
              setPhase("break");
              setTimeLeft(settings.breakDuration * 60);
              totalRef.current = settings.breakDuration * 60;
              setRunning(true);
            } else {
              setPhase("break");
              setTimeLeft(settings.breakDuration * 60);
              totalRef.current = settings.breakDuration * 60;
              setRunning(false);
            }
          } else {
            setPhase("done");
            setRunning(false);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, phase, settings, addPomodoro]);

  const adjustWork = (delta) => {
    if (running) return;
    const next = Math.max(1, Math.min(60, workMins + delta));
    setWorkMins(next);
    setTimeLeft(next * 60);
    totalRef.current = next * 60;
  };

  // Keyboard
  useEffect(() => {
    const handler = (e) => {
      if (e.code === "Space") { e.preventDefault(); setRunning(r => !r); }
      if (e.code === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const isBreak = phase === "break";
  const accentColor = isBreak ? t.break : t.work;

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.timerModal}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>{isBreak ? "☕" : "🍅"}</div>
          <div style={s.timerTitle}>
            {phase === "done" ? "Session complete!" : task.label}
          </div>
        </div>

        {phase !== "done" && (
          <TimerFace
            progress={progress}
            isBreak={isBreak}
            timeLeft={timeLeft}
            total={total}
            theme={t}
          />
        )}

        {phase === "done" && (
          <div style={{ textAlign: "center", fontSize: 48 }}>🎉</div>
        )}

        {/* Duration control — only in work phase, not running */}
        {phase === "work" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Work duration
            </span>
            <div style={s.timerControls}>
              <button style={s.timerControlBtn} onClick={() => adjustWork(-1)}>−</button>
              <span style={s.timerMinutes}>{workMins} min</span>
              <button style={s.timerControlBtn} onClick={() => adjustWork(1)}>+</button>
            </div>
          </div>
        )}

        <div style={s.timerActions}>
          {phase !== "done" && (
            <button
              style={{ ...s.timerBtn, background: accentColor, color: "#fff", minWidth: 100 }}
              onClick={() => setRunning(r => !r)}
            >
              {running ? "Pause" : "Start"}
            </button>
          )}
          <button
            style={{ ...s.timerBtn, background: t.surfaceHigh, color: t.text, border: `1px solid ${t.border}` }}
            onClick={phase === "done" ? onClose : reset}
          >
            {phase === "done" ? "Done" : "Reset"}
          </button>
          {phase !== "done" && (
            <button
              style={{ ...s.timerBtn, background: "none", color: t.textMuted, padding: "12px 14px" }}
              onClick={onClose}
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Settings Modal ───────────────────────────────────────────────────────────
const SettingsModal = ({ onClose }) => {
  const { settings, setSettings, themeName, setThemeName, theme: t } = useApp();
  const s = makeStyles(t);
  const [local, setLocal] = useState({ ...settings });

  const apply = () => { setSettings(local); onClose(); };

  useEffect(() => {
    const handler = (e) => { if (e.code === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div style={s.settingsOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.settingsModal}>
        <div style={s.settingsTitle}>
          <span>Settings</span>
          <button style={{ ...s.iconBtn, color: t.textMuted, fontSize: 18 }} onClick={onClose}>✕</button>
        </div>

        <div style={s.settingsSection}>
          <div style={s.settingsSectionLabel}>Timer Durations</div>
          <div style={s.settingsRow}>
            <span style={s.settingsRowLabel}>Work (minutes)</span>
            <input type="number" min={1} max={60} style={s.numInput}
              value={local.workDuration}
              onChange={e => setLocal(l => ({ ...l, workDuration: +e.target.value }))} />
          </div>
          <div style={s.settingsRow}>
            <span style={s.settingsRowLabel}>Break (minutes)</span>
            <input type="number" min={1} max={30} style={s.numInput}
              value={local.breakDuration}
              onChange={e => setLocal(l => ({ ...l, breakDuration: +e.target.value }))} />
          </div>
          <div style={s.settingsRow}>
            <span style={s.settingsRowLabel}>Auto-start break</span>
            <button style={s.toggle(local.autoStartBreak)}
              onClick={() => setLocal(l => ({ ...l, autoStartBreak: !l.autoStartBreak }))}>
              <div style={s.toggleThumb(local.autoStartBreak)} />
            </button>
          </div>
        </div>

        <div style={s.settingsSection}>
          <div style={s.settingsSectionLabel}>Theme</div>
          <div style={s.themeGrid}>
            {Object.entries(THEMES).map(([key, th]) => (
              <button key={key} style={s.themeChip(themeName === key, th.work)}
                onClick={() => setThemeName(key)}>
                {th.name}
              </button>
            ))}
          </div>
        </div>

        <button
          style={{ ...s.addBtn, width: "100%", padding: "13px", fontSize: 15, background: t.work, color: "#fff", borderRadius: 12 }}
          onClick={apply}>
          Save Settings
        </button>
      </div>
    </div>
  );
};

// ─── Task Item ────────────────────────────────────────────────────────────────
const TaskItem = ({ task, onToggle, onDelete, onTimer, onEdit, dragging, onDragStart, onDragOver, onDrop }) => {
  const { theme: t } = useApp();
  const s = makeStyles(t);
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(task.label);
  const inputRef = useRef(null);

  const commitEdit = () => {
    if (editVal.trim()) onEdit(task.id, editVal.trim());
    setEditing(false);
  };

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task.id)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(task.id); }}
      onDrop={() => onDrop(task.id)}
      style={{
        ...s.taskItem,
        background: hovered ? t.surfaceHigh : "transparent",
        opacity: dragging ? 0.4 : 1,
        cursor: "grab",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Checkbox */}
      <div
        style={{
          ...s.checkbox,
          background: task.done ? t.work : "none",
          borderColor: task.done ? t.work : t.border,
        }}
        onClick={() => onToggle(task.id)}
        role="checkbox" aria-checked={task.done} tabIndex={0}
        onKeyDown={e => e.key === "Enter" && onToggle(task.id)}
      >
        {task.done && <span style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>✓</span>}
      </div>

      {/* Label */}
      {editing ? (
        <input
          ref={inputRef}
          value={editVal}
          onChange={e => setEditVal(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(false); }}
          autoFocus
          style={{ ...s.addInput, flex: 1, padding: "4px 8px" }}
        />
      ) : (
        <span
          style={{ ...s.taskLabel, ...(task.done ? s.taskDone : {}) }}
          onDoubleClick={() => { setEditing(true); setEditVal(task.label); }}
          title="Double-click to edit"
        >
          {task.label}
        </span>
      )}

      {/* Tomato */}
      {!task.done && (
        <button style={s.tomatoBtn} onClick={() => onTimer(task)}
          title="Start Pomodoro" aria-label="Start timer">
          🍅
        </button>
      )}

      {/* Delete */}
      <button
        style={{ ...s.deleteBtn, opacity: hovered ? 1 : 0, color: hovered ? "#E8431A" : t.textMuted }}
        onClick={() => onDelete(task.id)} title="Delete" aria-label="Delete task"
      >
        ✕
      </button>
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function PomodoroTodo() {
  const [themeName, setThemeNameState] = useState(() => load("pomo_theme", "tomato"));
  const [settings, setSettingsState] = useState(() => load("pomo_settings", DEFAULT_SETTINGS));
  const [tasks, setTasks] = useState(() => load("pomo_tasks", []));
  const [pomodoroCount, setPomodoroCount] = useState(() => load("pomo_count_today", 0));
  const [streak, setStreak] = useState(() => load("pomo_streak", 0));
  const [timerTask, setTimerTask] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [addText, setAddText] = useState("");
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [, forceUpdate] = useState(0);

  const theme = THEMES[themeName] || THEMES.tomato;
  const s = makeStyles(theme);

  const setThemeName = (name) => {
    setThemeNameState(name);
    save("pomo_theme", name);
  };
  const setSettings = (next) => {
    setSettingsState(next);
    save("pomo_settings", next);
  };

  useEffect(() => { save("pomo_tasks", tasks); }, [tasks]);
  useEffect(() => { save("pomo_count_today", pomodoroCount); }, [pomodoroCount]);

  const addPomodoro = useCallback(() => {
    setPomodoroCount(c => c + 1);
    setStreak(s => { const n = s + 1; save("pomo_streak", n); return n; });
  }, []);

  const addTask = () => {
    const label = addText.trim();
    if (!label) return;
    setTasks(ts => [{ id: Date.now(), label, done: false }, ...ts]);
    setAddText("");
  };

  const toggleTask = (id) => setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const deleteTask = (id) => setTasks(ts => ts.filter(t => t.id !== id));
  const editTask = (id, label) => setTasks(ts => ts.map(t => t.id === id ? { ...t, label } : t));

  // Drag & drop
  const handleDragOver = (overId) => setDragOverId(overId);
  const handleDrop = () => {
    if (!dragId || dragId === dragOverId) return;
    setTasks(ts => {
      const from = ts.findIndex(t => t.id === dragId);
      const to = ts.findIndex(t => t.id === dragOverId);
      if (from < 0 || to < 0) return ts;
      const next = [...ts];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setDragId(null); setDragOverId(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.code === "KeyS") { e.preventDefault(); setShowSettings(s => !s); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const active = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done);
  const pct = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;

  const ctx = { settings, setSettings, themeName, setThemeName, theme, addPomodoro };

  return (
    <AppContext.Provider value={ctx}>
      <div style={s.app}>
        {/* Header */}
        <header style={s.header}>
          <div style={s.logo}>
            <span>🍅</span>
            <span>PomodoroTodo</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={s.iconBtn} onClick={() => setPomodoroCount(0)}
              title="Reset today's count" aria-label="Reset pomodoro count">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
            </button>
            <button style={{ ...s.iconBtn, ...(showSettings ? { color: theme.work, background: theme.surfaceHigh } : {}) }}
              onClick={() => setShowSettings(s => !s)} title="Settings (S)" aria-label="Open settings">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </button>
          </div>
        </header>

        <main style={s.main}>
          {/* Dashboard */}
          <div style={s.dashboard}>
            <div style={s.statCard}>
              <span style={{ ...s.statValue, color: theme.work }}>{active.length}</span>
              <span style={s.statLabel}>Active Tasks</span>
            </div>
            <div style={s.statCard}>
              <span style={{ ...s.statValue, color: theme.break }}>{done.length}</span>
              <span style={s.statLabel}>Completed</span>
            </div>
            <div style={s.statCard}>
              <span style={{ ...s.statValue, color: theme.accent }}>{pomodoroCount}</span>
              <span style={s.statLabel}>🍅 Today</span>
            </div>
            <div style={s.statCard}>
              <span style={{ ...s.statValue, color: theme.workLight }}>{streak}</span>
              <span style={s.statLabel}>🔥 Streak</span>
            </div>
            {tasks.length > 0 && (
              <div style={s.progressBar}>
                <div style={{ ...s.progressFill, width: `${pct}%`, background: pct === 100 ? theme.break : theme.work }} />
              </div>
            )}
          </div>

          {/* Active tasks */}
          <div style={s.section}>
            <div style={s.sectionHead}>
              <span>📋</span> Tasks <span style={{ marginLeft: "auto", color: theme.textMuted }}>{active.length}</span>
            </div>
            <div style={s.addRow}>
              <input
                style={s.addInput}
                placeholder="Add a task… (Enter to add)"
                value={addText}
                onChange={e => setAddText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTask()}
              />
              <button style={s.addBtn} onClick={addTask}>Add</button>
            </div>
            {active.length === 0 ? (
              <div style={s.empty}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                No tasks yet — add one above!
              </div>
            ) : (
              active.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                  onTimer={setTimerTask}
                  onEdit={editTask}
                  dragging={dragId === task.id}
                  onDragStart={setDragId}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                />
              ))
            )}
          </div>

          {/* Completed tasks */}
          {done.length > 0 && (
            <div style={{ ...s.section, opacity: 0.7 }}>
              <div style={s.sectionHead}>
                <span>✅</span> Done <span style={{ marginLeft: "auto", color: theme.textMuted }}>{done.length}</span>
              </div>
              {done.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                  onTimer={setTimerTask}
                  onEdit={editTask}
                  dragging={dragId === task.id}
                  onDragStart={setDragId}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                />
              ))}
            </div>
          )}

          <div style={{ textAlign: "center", fontSize: 11, color: theme.textMuted, paddingBottom: 8 }}>
            <kbd style={{ background: theme.surfaceHigh, border: `1px solid ${theme.border}`, borderRadius: 4, padding: "2px 6px" }}>Space</kbd> start/pause &nbsp;
            <kbd style={{ background: theme.surfaceHigh, border: `1px solid ${theme.border}`, borderRadius: 4, padding: "2px 6px" }}>S</kbd> settings &nbsp;
            <kbd style={{ background: theme.surfaceHigh, border: `1px solid ${theme.border}`, borderRadius: 4, padding: "2px 6px" }}>Esc</kbd> close timer
          </div>
        </main>

        {/* Timer */}
        {timerTask && <TimerModal task={timerTask} onClose={() => setTimerTask(null)} />}

        {/* Settings */}
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      </div>
    </AppContext.Provider>
  );
}
