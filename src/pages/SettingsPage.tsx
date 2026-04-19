import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useSemesters } from '../hooks/useSemesters';
const DEFAULT_DAYS_KEY = 'setting_default_task_days';

const BG     = '#09090F';
const CARD   = '#13131E';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT   = 'rgba(255,255,255,0.88)';
const MUTED  = 'rgba(255,255,255,0.35)';
const ACCENT = '#00D4AA';
const RED    = '#FF5050';
const GREEN  = '#4ADE80';

function SectionCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10 }} className="px-5 py-4">
      <p className="text-[10px] font-bold tracking-widest mb-4" style={{ color: MUTED }}>{label}</p>
      {children}
    </div>
  );
}

function getCurrentWeek(startDate: string, numWeeks: number): number {
  const diff = Math.floor((Date.now() - new Date(startDate + 'T12:00:00').getTime()) / (7 * 86400000));
  return Math.max(1, Math.min(diff + 1, numWeeks));
}

function startDateForWeek(targetWeek: number): string {
  const d = new Date();
  d.setDate(d.getDate() - (targetWeek - 1) * 7);
  return d.toISOString().split('T')[0];
}

function usePWAInstall() {
  const [prompt, setPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(
    window.matchMedia('(display-mode: standalone)').matches
  );

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setInstalled(true); setPrompt(null); });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') { setInstalled(true); setPrompt(null); }
  };

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return { prompt, installed, install, isIOS };
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { activeSemester, updateSemester } = useSemesters();

  // Account
  const displayName: string =
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.email?.split('@')[0] ||
    'משתמש';
  const email = (user as any)?.email || '';

  // Current week
  const currentWeek = activeSemester ? getCurrentWeek(activeSemester.start_date, activeSemester.num_weeks) : 1;
  const [week, setWeek] = useState(currentWeek);
  const [weekSaved, setWeekSaved] = useState(false);

  // Default task duration
  const [defaultDays, setDefaultDays] = useState(() =>
    parseInt(localStorage.getItem(DEFAULT_DAYS_KEY) || '7')
  );
  const [daysSaved, setDaysSaved] = useState(false);

  // PWA install
  const { prompt, installed, install, isIOS } = usePWAInstall();

  // Sign out
  const [signingOut, setSigningOut] = useState(false);

  // Delete all data
  const [deleteStep, setDeleteStep] = useState(0); // 0=idle 1=confirm 2=done
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Data export/import
  const importRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState('');

  const handleWeekSave = async () => {
    if (!activeSemester) return;
    await updateSemester(activeSemester.id, { start_date: startDateForWeek(week) });
    setWeekSaved(true);
    setTimeout(() => setWeekSaved(false), 2000);
  };

  const handleDaysSave = () => {
    localStorage.setItem(DEFAULT_DAYS_KEY, String(defaultDays));
    setDaysSaved(true);
    setTimeout(() => setDaysSaved(false), 2000);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    navigate('/login');
  };

  const handleExport = () => {
    const data = {
      exported_at: new Date().toISOString(),
      semesters: JSON.parse(localStorage.getItem('dev_semesters') || '[]'),
      courses: JSON.parse(localStorage.getItem('dev_courses') || '[]'),
      tasks: JSON.parse(localStorage.getItem('dev_tasks') || '[]'),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uni-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.semesters) localStorage.setItem('dev_semesters', JSON.stringify(data.semesters));
        if (data.courses)   localStorage.setItem('dev_courses',   JSON.stringify(data.courses));
        if (data.tasks)     localStorage.setItem('dev_tasks',     JSON.stringify(data.tasks));
        setImportMsg('יובא בהצלחה — רענן את הדף');
        setTimeout(() => setImportMsg(''), 4000);
      } catch {
        setImportMsg('קובץ לא תקין');
        setTimeout(() => setImportMsg(''), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDeleteAll = () => {
    if (deleteStep === 0) {
      setDeleteStep(1);
      deleteTimerRef.current = setTimeout(() => setDeleteStep(0), 4000);
      return;
    }
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    // Clear all data
    ['dev_semesters', 'dev_courses', 'dev_tasks', DEFAULT_DAYS_KEY].forEach(k => localStorage.removeItem(k));
    setDeleteStep(2);
    setTimeout(() => { setDeleteStep(0); window.location.reload(); }, 1500);
  };

  return (
    <div className="animate-fade-in flex flex-col gap-4" dir="rtl">
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs mb-1 hover:opacity-80 transition-opacity self-start"
        style={{ color: MUTED }}>
        &#8592; חזרה
      </button>

      <div className="mb-2">
        <h2 className="font-display text-[26px] font-bold text-text-primary mb-0.5">הגדרות</h2>
        <p className="text-sm" style={{ color: MUTED }}>ניהול חשבון והעדפות</p>
      </div>

      {/* Account */}
      <SectionCard label="חשבון">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
            style={{ background: `${ACCENT}20`, color: ACCENT }}>
            {displayName[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: TEXT }}>{displayName}</div>
            {email && <div className="text-[11px] truncate" style={{ color: MUTED }}>{email}</div>}
          </div>
        </div>
      </SectionCard>

      {/* Install app */}
      <SectionCard label="התקנת האפליקציה">
        {installed ? (
          <div className="flex items-center gap-2.5">
            <span style={{ color: '#4ADE80', fontSize: 18 }}>✓</span>
            <p className="text-sm font-medium" style={{ color: TEXT }}>האפליקציה מותקנת במכשיר</p>
          </div>
        ) : isIOS ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs leading-relaxed" style={{ color: MUTED }}>להתקנה על iPhone / iPad:</p>
            <div className="flex flex-col gap-2">
              {[
                'פתח את האתר ב-Safari',
                'לחץ על כפתור השיתוף ⎙',
                'בחר "הוסף למסך הבית"',
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: `${ACCENT}20`, color: ACCENT }}>{i + 1}</span>
                  <span className="text-xs" style={{ color: TEXT }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        ) : prompt ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs" style={{ color: MUTED }}>התקן את Uni Tracker כאפליקציה במכשיר שלך לגישה מהירה ומלאה ללא דפדפן.</p>
            <button onClick={install}
              className="w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
              style={{ background: ACCENT, color: '#0D0D14' }}>
              התקן אפליקציה
            </button>
          </div>
        ) : (
          <p className="text-xs" style={{ color: MUTED }}>פתח את האתר בדפדפן נייד כדי להתקין אותו כאפליקציה.</p>
        )}
      </SectionCard>

      {/* Current week */}
      {activeSemester && (
        <SectionCard label="שבוע נוכחי בסמסטר">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setWeek(w => Math.max(1, w - 1))}
                className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold transition-opacity hover:opacity-70"
                style={{ background: `${ACCENT}18`, color: ACCENT }}>−</button>
              <div className="text-center" style={{ minWidth: 48 }}>
                <div className="text-2xl font-black" style={{ color: TEXT }}>{week}</div>
                <div className="text-[10px]" style={{ color: MUTED }}>מתוך {activeSemester.num_weeks}</div>
              </div>
              <button onClick={() => setWeek(w => Math.min(activeSemester.num_weeks, w + 1))}
                className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold transition-opacity hover:opacity-70"
                style={{ background: `${ACCENT}18`, color: ACCENT }}>+</button>
            </div>
            <button onClick={handleWeekSave}
              className="px-5 py-2 text-sm font-bold rounded-xl transition-opacity hover:opacity-80"
              style={{ background: weekSaved ? `${GREEN}20` : ACCENT, color: weekSaved ? GREEN : BG }}>
              {weekSaved ? '✓ נשמר' : 'שמור'}
            </button>
          </div>
        </SectionCard>
      )}

      {/* Default task duration */}
      <SectionCard label="משך ברירת מחדל למטלות">
        <p className="text-[11px] mb-4" style={{ color: MUTED }}>מספר ימים בין שחרור ל-הגשה בעת יצירת מטלה חדשה</p>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setDefaultDays(d => Math.max(1, d - 1))}
              className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold transition-opacity hover:opacity-70"
              style={{ background: `${ACCENT}18`, color: ACCENT }}>−</button>
            <div className="text-center" style={{ minWidth: 48 }}>
              <div className="text-2xl font-black" style={{ color: TEXT }}>{defaultDays}</div>
              <div className="text-[10px]" style={{ color: MUTED }}>ימים</div>
            </div>
            <button onClick={() => setDefaultDays(d => Math.min(90, d + 1))}
              className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold transition-opacity hover:opacity-70"
              style={{ background: `${ACCENT}18`, color: ACCENT }}>+</button>
          </div>
          <button onClick={handleDaysSave}
            className="px-5 py-2 text-sm font-bold rounded-xl transition-opacity hover:opacity-80"
            style={{ background: daysSaved ? `${GREEN}20` : ACCENT, color: daysSaved ? GREEN : BG }}>
            {daysSaved ? '✓ נשמר' : 'שמור'}
          </button>
        </div>
      </SectionCard>

      {/* Theme */}
      <SectionCard label="ערכת נושא">
        <div className="flex gap-2">
          {[
            { id: 'dark', label: '🌙 כהה', active: true },
            { id: 'light', label: '☀️ בהיר', active: false },
            { id: 'system', label: '⚙️ מערכת', active: false },
          ].map(t => (
            <button key={t.id} disabled={!t.active}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-opacity"
              style={{
                background: t.active ? `${ACCENT}18` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${t.active ? ACCENT + '40' : BORDER}`,
                color: t.active ? ACCENT : MUTED,
                cursor: t.active ? 'pointer' : 'not-allowed',
              }}>
              {t.label}
              {!t.active && <span className="block text-[9px] mt-0.5" style={{ color: MUTED }}>בקרוב</span>}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Language */}
      <SectionCard label="שפה">
        <div className="flex gap-2">
          <button className="flex-1 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}40`, color: ACCENT }}>
            עברית
          </button>
          <button disabled className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-not-allowed"
            style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: MUTED }}>
            English
            <span className="text-[9px] font-normal mr-1.5" style={{ color: MUTED }}>בקרוב</span>
          </button>
        </div>
      </SectionCard>

      {/* Data export / import */}
      <SectionCard label="נתונים">
        <div className="flex gap-2">
          <button onClick={handleExport}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
            style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, color: TEXT }}>
            ייצוא JSON
          </button>
          <button onClick={() => importRef.current?.click()}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
            style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, color: TEXT }}>
            ייבוא JSON
          </button>
        </div>
        {importMsg && (
          <p className="text-[11px] mt-3 text-center font-bold" style={{ color: ACCENT }}>{importMsg}</p>
        )}
        <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
      </SectionCard>

      {/* Sign out */}
      <button onClick={handleSignOut} disabled={signingOut}
        className="w-full py-3.5 rounded-2xl text-sm font-bold transition-opacity hover:opacity-80"
        style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', color: RED }}>
        {signingOut ? '...' : 'התנתק'}
      </button>

      {/* Danger zone */}
      <div style={{ background: `${RED}08`, border: `1px solid ${RED}20`, borderRadius: 10 }} className="px-5 py-4">
        <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: `${RED}99` }}>אזור מסוכן</p>
        <p className="text-[11px] mb-4" style={{ color: MUTED }}>מחיקת כל הנתונים — פעולה בלתי הפיכה</p>
        <button onClick={handleDeleteAll}
          className="w-full py-3 rounded-xl text-sm font-bold transition-all"
          style={{
            background: deleteStep === 1 ? RED : `${RED}15`,
            border: `1px solid ${deleteStep === 1 ? RED : RED + '30'}`,
            color: deleteStep === 1 ? '#fff' : RED,
          }}>
          {deleteStep === 0 && 'מחק את כל הנתונים'}
          {deleteStep === 1 && '⚠️ לחץ שוב לאישור סופי'}
          {deleteStep === 2 && '✓ נמחק'}
        </button>
      </div>

    </div>
  );
}
