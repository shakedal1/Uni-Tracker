import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { devDb } from '../lib/devDb';
import { useSemesters } from '../hooks/useSemesters';
import { useAuth } from '../contexts/AuthContext';
import type { Task, TaskType, TaskStatus } from '../lib/types';

const DEV = import.meta.env.VITE_SKIP_AUTH;

type DashboardTask = Task & {
  course: { id: string; name: string; color: string };
};

const TASK_TYPE_MAP: Record<TaskType, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  lecture: {
    label: 'הרצאה', bg: 'rgba(74,144,226,0.15)', color: '#4A90E2',
    icon: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    ),
  },
  tutorial: {
    label: 'תרגול', bg: 'rgba(0,212,170,0.15)', color: '#00D4AA',
    icon: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
      </svg>
    ),
  },
  workshop: {
    label: 'סדנה', bg: 'rgba(168,85,247,0.15)', color: '#A855F7',
    icon: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3h6"/>
        <path d="M14 3v6l3.5 5.25A4 4 0 0 1 14 21H10a4 4 0 0 1-3.5-6.75L10 9V3"/>
      </svg>
    ),
  },
  assignment: {
    label: 'מטלה', bg: 'rgba(248,113,113,0.15)', color: '#F87171',
    icon: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1.5"/>
        <path d="M9 12h6M9 16h4"/>
      </svg>
    ),
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const timeWord = hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : 'ערב טוב';
  return `${timeWord}, ${name.split(' ')[0]}`;
}

function formatTodayHebrew(): string {
  const d = new Date();
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  return `יום ${days[d.getDay()]}, ${d.getDate()} ב${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDueDate(due: string | null): string | null {
  if (!due) return null;
  const d = new Date(due);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function getSemesterDaysRemaining(startDate: string, numWeeks: number): number {
  const end = new Date(startDate).getTime() + numWeeks * 7 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
}

function getUserDisplayName(user: ReturnType<typeof useAuth>['user']): string {
  return (user as any)?.user_metadata?.full_name ||
         (user as any)?.email?.split('@')[0] ||
         'סטודנט';
}

function groupByCourse(tasks: DashboardTask[]): { course: DashboardTask['course']; tasks: DashboardTask[] }[] {
  const map = new Map<string, { course: DashboardTask['course']; tasks: DashboardTask[] }>();
  for (const task of tasks) {
    if (!map.has(task.course.id)) map.set(task.course.id, { course: task.course, tasks: [] });
    map.get(task.course.id)!.tasks.push(task);
  }
  return Array.from(map.values()).sort((a, b) => a.course.name.localeCompare(b.course.name));
}

// ── CheckSquare ────────────────────────────────────────────────────────────
// Matches CourseDetailsPage style: rounded square, SVG checkmark

function CheckSquare({ completed, onClick }: { completed: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
        border: completed ? 'none' : '2px solid rgba(255,255,255,0.18)',
        background: completed ? '#4ADE80' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      {completed && (
        <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="#0E0E16" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}

// ── CourseTaskGroup ────────────────────────────────────────────────────────

interface GroupProps {
  group: { course: DashboardTask['course']; tasks: DashboardTask[] };
  onToggle: (id: string, status: TaskStatus) => void;
  exitingTaskIds?: Set<string>;
  showWeek?: boolean;
  dimmed?: boolean;
  nonInteractive?: boolean;
  allCompleted?: boolean;
}

function CourseTaskGroup({ group, onToggle, exitingTaskIds, showWeek, dimmed, nonInteractive, allCompleted }: GroupProps) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderInlineEnd: `3px solid ${group.course.color}`,
        borderRadius: 8,
        overflow: 'hidden',
        opacity: dimmed ? 0.45 : 1,
      }}
    >
      {/* Course header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '7px 11px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: group.course.color, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 590, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.01em' }}>
          {group.course.name}
        </span>
      </div>

      {/* Task rows */}
      {group.tasks.map((task, i) => {
        const s = TASK_TYPE_MAP[task.type];
        const due = formatDueDate(task.due_date ?? null);
        const isExiting = exitingTaskIds?.has(task.id);
        const completed = allCompleted || task.status === 'completed';

        return (
          <div
            key={task.id}
            className={isExiting ? 'task-exit' : ''}
            onClick={!nonInteractive ? () => onToggle(task.id, task.status) : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '7px 11px',
              borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : undefined,
              cursor: !nonInteractive ? 'pointer' : 'default',
              position: 'relative',
            }}
          >
            {/* Strike line — phase 1 of exit animation */}
            {isExiting && (
              <div
                className="strike-line"
                style={{
                  position: 'absolute',
                  top: '50%', marginTop: -0.75,
                  right: 38, left: 11, // right=after checkbox+gap, left=padding
                  height: 1.5,
                  background: 'rgba(255,255,255,0.45)',
                  borderRadius: 1,
                  pointerEvents: 'none',
                }}
              />
            )}

            {!nonInteractive && (
              <CheckSquare
                completed={completed}
                onClick={e => { e.stopPropagation(); onToggle(task.id, task.status); }}
              />
            )}

            {/* Type icon */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', flexShrink: 0,
              color: completed ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.45)',
            }}>
              {s.icon}
            </span>

            {/* Title */}
            <span
              style={{
                fontSize: 13, fontWeight: 400, flex: 1,
                color: completed ? 'rgba(255,255,255,0.28)' : '#d0d6e0',
                textDecoration: completed ? 'line-through' : 'none',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {task.title}
            </span>

            {/* Week (overdue only) */}
            {showWeek && (
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', flexShrink: 0 }}>
                שב׳ {task.week_number}
              </span>
            )}

            {/* Due date */}
            {due && (
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', flexShrink: 0 }}>
                {due}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────

function SectionHeader({ label, action }: { label: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span style={{ fontSize: 11, fontWeight: 510, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.02em' }}>
        {label}
      </span>
      <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
      {action}
    </div>
  );
}

// ── CongratsCard ───────────────────────────────────────────────────────────

const PARTICLES = [
  { tx: '-38px', ty: '-52px', rot: '220deg', delay: '0s',    dur: '0.85s', char: '✦' },
  { tx: '40px',  ty: '-55px', rot: '-160deg',delay: '0.05s', dur: '0.9s',  char: '✦' },
  { tx: '-54px', ty: '-20px', rot: '300deg', delay: '0.1s',  dur: '0.8s',  char: '★' },
  { tx: '56px',  ty: '-18px', rot: '-280deg',delay: '0.08s', dur: '0.88s', char: '★' },
  { tx: '-28px', ty: '-60px', rot: '140deg', delay: '0.15s', dur: '0.95s', char: '·' },
  { tx: '30px',  ty: '-62px', rot: '-120deg',delay: '0.12s', dur: '0.92s', char: '·' },
  { tx: '-60px', ty: '-36px', rot: '80deg',  delay: '0.07s', dur: '0.82s', char: '✦' },
  { tx: '62px',  ty: '-34px', rot: '-60deg', delay: '0.18s', dur: '0.87s', char: '★' },
];

function CongratsCard({ nextWeek }: { nextWeek: number }) {
  const [particlesKey, setParticlesKey] = useState(0);

  useEffect(() => {
    // Re-trigger particles each time this card mounts
    setParticlesKey(k => k + 1);
  }, []);

  return (
    <div style={{ position: 'relative', marginBottom: 2 }}>
      {/* Glow ring */}
      <div
        className="animate-glow-ring"
        style={{
          position: 'absolute', inset: -6, borderRadius: 16,
          background: 'radial-gradient(ellipse at center, rgba(74,222,128,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Floating particles */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>
        {PARTICLES.map((p, i) => (
          <span
            key={`${particlesKey}-${i}`}
            className="particle-float"
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              fontSize: p.char === '·' ? 18 : 11,
              color: i % 3 === 0 ? '#4ADE80' : i % 3 === 1 ? '#00D4AA' : '#FACC15',
              fontWeight: 700,
              lineHeight: 1,
              '--tx': p.tx, '--ty': p.ty, '--rot': p.rot,
              '--delay': p.delay, '--dur': p.dur,
            } as React.CSSProperties}
          >
            {p.char}
          </span>
        ))}
      </div>

      {/* Card */}
      <div
        className="animate-congrats-pop"
        style={{
          background: 'linear-gradient(135deg, rgba(74,222,128,0.08) 0%, rgba(0,212,170,0.06) 100%)',
          border: '1px solid rgba(74,222,128,0.22)',
          borderRadius: 12,
          padding: '16px 18px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Shimmer stripe */}
        <div style={{
          position: 'absolute', top: 0, left: '-100%', width: '60%', height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
          animation: 'shimmer 2s ease-in-out 0.4s infinite',
          pointerEvents: 'none',
        }} />

        <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 6 }}>🎉</div>
        <div style={{ fontSize: 15, fontWeight: 650, color: '#4ADE80', marginBottom: 4, letterSpacing: '-0.2px' }}>
          כל הכבוד!
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>
          סיימת את כל המשימות של השבוע
        </div>
        {nextWeek > 0 && (
          <div style={{ fontSize: 11, color: 'rgba(74,222,128,0.6)', marginTop: 6, fontWeight: 500 }}>
            הנה מה שמחכה לך בשבוע {nextWeek} ↓
          </div>
        )}
      </div>
    </div>
  );
}

// ── DashboardPage ──────────────────────────────────────────────────────────

export function DashboardPage() {
  const { user } = useAuth();
  const { activeSemester, loading: semesterLoading } = useSemesters();
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [exitingTaskIds, setExitingTaskIds] = useState<Set<string>>(new Set());
  const [exitingGroupIds, setExitingGroupIds] = useState<Set<string>>(new Set());
  const [showCongrats, setShowCongrats] = useState(false);
  const prevThisWeekCountRef = useRef<number>(-1);

  useEffect(() => {
    async function fetchDashboardTasks() {
      if (DEV) {
        if (!activeSemester) { setLoading(false); return; }
        setTasks(devDb.tasks.getBySemester(activeSemester.id) as unknown as DashboardTask[]);
        setLoading(false);
        return;
      }
      if (!user || !activeSemester) { setLoading(false); return; }
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*, course:courses!inner(id, name, color, semester_id)')
          .eq('course.semester_id', activeSemester.id)
          .order('week_number', { ascending: true })
          .order('id', { ascending: true });
        if (error) throw error;
        setTasks(data as unknown as DashboardTask[]);
      } catch (err) {
        console.error('Error fetching dashboard tasks:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardTasks();
  }, [user, activeSemester]);

  // ── Congrats detection ────────────────────────────────────────────────────
  // Fires when the user completes the last this-week task (transition > 0 → 0).
  // prevThisWeekCountRef starts at -1 so a page load that's already at 0 doesn't trigger.
  const start0 = activeSemester ? new Date(activeSemester.start_date).getTime() : 0;
  const weeksPassed0 = activeSemester ? Math.floor((Date.now() - start0) / (1000 * 60 * 60 * 24 * 7)) + 1 : 1;
  const currentWeekForEffect = activeSemester
    ? Math.max(1, Math.min(weeksPassed0, activeSemester.num_weeks))
    : 1;
  const thisWeekPendingCount = tasks.filter(
    t => t.status !== 'completed' && t.week_number === currentWeekForEffect
  ).length;

  useEffect(() => {
    const prev = prevThisWeekCountRef.current;
    if (prev > 0 && thisWeekPendingCount === 0) {
      setShowCongrats(true);
    }
    prevThisWeekCountRef.current = thisWeekPendingCount;
  }, [thisWeekPendingCount]);

  const toggleTaskStatus = async (taskId: string, currentStatus: TaskStatus) => {
    const newStatus: TaskStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    if (newStatus === 'completed') {
      setExitingTaskIds(prev => new Set(prev).add(taskId));

      // Detect if this is the last pending task in its course's section group
      const task = tasks.find(t => t.id === taskId);
      let isLastInGroup = false;
      if (task && activeSemester) {
        const start = new Date(activeSemester.start_date).getTime();
        const cw = Math.max(1, Math.min(
          Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24 * 7)) + 1,
          activeSemester.num_weeks
        ));
        const isOverdue = task.week_number < cw;
        const isThisWeek = task.week_number === cw;
        if (isOverdue || isThisWeek) {
          const siblings = tasks.filter(t =>
            t.id !== taskId &&
            t.course_id === task.course_id &&
            t.status !== 'completed' &&
            (isOverdue ? t.week_number < cw : t.week_number === cw)
          );
          isLastInGroup = siblings.length === 0;
        }
      }

      if (isLastInGroup && task) {
        // Let task strike play first, then collapse the group, then update state
        await new Promise(resolve => setTimeout(resolve, 350));
        setExitingGroupIds(prev => new Set(prev).add(task.course.id));
        await new Promise(resolve => setTimeout(resolve, 380));
        setExitingGroupIds(prev => { const n = new Set(prev); n.delete(task.course.id); return n; });
      } else {
        await new Promise(resolve => setTimeout(resolve, 550)); // strike (300ms) + fade (240ms)
      }

      setExitingTaskIds(prev => { const n = new Set(prev); n.delete(taskId); return n; });
    }
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    if (DEV) { devDb.tasks.update(taskId, { status: newStatus }); return; }
    try {
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
      if (error) throw error;
    } catch (err) {
      console.error(err);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: currentStatus } : t));
    }
  };

  if (semesterLoading || loading) {
    return (
      <div className="flex justify-center items-center p-16">
        <div className="w-8 h-8 rounded-full animate-spin"
          style={{ border: '3px solid rgba(255,255,255,0.08)', borderTopColor: 'rgba(255,255,255,0.5)' }} />
      </div>
    );
  }

  if (!activeSemester) {
    return (
      <div className="text-center p-12 rounded-lg mt-4"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
        <p className="mb-1" style={{ color: '#d0d6e0', fontWeight: 510 }}>אין סמסטר פעיל</p>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>צור או בחר סמסטר כדי לראות את הדשבורד שלך</p>
      </div>
    );
  }

  // ── Computed ─────────────────────────────────────────────────────────────
  const start = new Date(activeSemester.start_date).getTime();
  const weeksPassed = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24 * 7)) + 1;
  const currentWeek = Math.max(1, Math.min(weeksPassed, activeSemester.num_weeks));
  const progressPercent = Math.max(0, Math.min(100, Math.round(((weeksPassed - 1) / activeSemester.num_weeks) * 100)));
  const daysRemaining = getSemesterDaysRemaining(activeSemester.start_date, activeSemester.num_weeks);
  const displayName = getUserDisplayName(user);

  const overdueTasks      = tasks.filter(t => t.status !== 'completed' && t.week_number < currentWeek);
  const thisWeekTasks     = tasks.filter(t => t.status !== 'completed' && t.week_number === currentWeek);
  const completedThisWeek = tasks.filter(t => t.status === 'completed' && t.week_number === currentWeek);
  const nextWeekTasks     = tasks.filter(t => t.status !== 'completed' && t.week_number === currentWeek + 1);

  const overdueGroups   = groupByCourse(overdueTasks);
  const thisWeekGroups  = groupByCourse(thisWeekTasks);
  const completedGroups = groupByCourse(completedThisWeek);
  const nextWeekGroups  = groupByCourse(nextWeekTasks);

  const thisWeekTotal = thisWeekTasks.length + completedThisWeek.length;
  // Show congrats + interactive next-week once all this-week tasks are done
  const showNextWeek = showCongrats || (thisWeekTasks.length === 0 && completedThisWeek.length > 0);

  return (
    <div className="animate-fade-in pb-4">

      {/* ── Greeting ── */}
      <div className="mb-4">
        <h2 style={{ fontSize: 22, fontWeight: 590, color: '#f7f8f8', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
          {getGreeting(displayName)}
        </h2>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', marginTop: 3, fontWeight: 400 }}>
          {formatTodayHebrew()}
        </p>
      </div>

      {/* ── Stats row (this week only) ── */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { value: thisWeekTotal,            label: 'סה״כ השבוע', color: '#00D4AA' },
          { value: completedThisWeek.length, label: 'הושלמו',     color: '#4ADE80' },
          { value: thisWeekTasks.length,     label: 'נותרו',      color: thisWeekTasks.length === 0 ? '#4ADE80' : '#F87171' },
        ].map(({ value, label, color }) => (
          <div
            key={label}
            className="rounded-lg p-2.5 text-center"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div style={{ fontSize: 20, lineHeight: 1, marginBottom: 3, color, fontWeight: 590 }}>
              {value}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontWeight: 510 }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Semester progress ── */}
      <div
        className="rounded-lg p-3 mb-4"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex justify-between items-center mb-2">
          <span style={{ fontWeight: 590, fontSize: 14, color: '#00D4AA' }}>
            שבוע {currentWeek} מתוך {activeSemester.num_weeks}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', fontWeight: 400 }}>
            {activeSemester.name} · {progressPercent}%
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden mb-1.5"
          style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, #00D4AA, #00EFBF)' }}
          />
        </div>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', fontWeight: 400 }}>
          {daysRemaining > 0 ? `${daysRemaining} ימים נותרו בסמסטר` : 'הסמסטר הסתיים'}
        </p>
      </div>

      {/* ── Task sections ── */}
      {tasks.length === 0 ? (
        <div className="text-center p-10 rounded-lg" style={{ border: '1px dashed rgba(255,255,255,0.08)' }}>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.28)' }}>אין משימות בסמסטר הזה</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">

          {/* Overdue */}
          {overdueGroups.length > 0 && (
            <div>
              <SectionHeader label={<span style={{ color: '#F87171' }}>באיחור</span>} />
              <div className="flex flex-col gap-1.5">
                {overdueGroups.map(group => (
                  <div key={group.course.id} className={exitingGroupIds.has(group.course.id) ? 'group-exit' : ''}>
                    <CourseTaskGroup
                      group={group}
                      onToggle={toggleTaskStatus}
                      exitingTaskIds={exitingTaskIds}
                      showWeek
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* This week */}
          {(thisWeekGroups.length > 0 || overdueGroups.length > 0 || showNextWeek) && (
            <div>
              <SectionHeader label={`שבוע נוכחי (${currentWeek})`} />
              {thisWeekGroups.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {thisWeekGroups.map(group => (
                    <div key={group.course.id} className={exitingGroupIds.has(group.course.id) ? 'group-exit' : ''}>
                      <CourseTaskGroup
                        group={group}
                        onToggle={toggleTaskStatus}
                        exitingTaskIds={exitingTaskIds}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {/* Congrats + interactive next-week suggestions */}
          {showNextWeek && (
            <div className="flex flex-col gap-3 animate-slide-up">
              {showCongrats && (
                <CongratsCard nextWeek={nextWeekGroups.length > 0 ? currentWeek + 1 : 0} />
              )}
              {nextWeekGroups.length > 0 && (
                <div>
                  <SectionHeader label={`הצצה לשבוע הבא (${currentWeek + 1})`} />
                  <div className="flex flex-col gap-1.5">
                    {nextWeekGroups.map(group => (
                      <CourseTaskGroup
                        key={group.course.id}
                        group={group}
                        onToggle={toggleTaskStatus}
                        exitingTaskIds={exitingTaskIds}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Completed this week — collapsible */}
          {completedGroups.length > 0 && (
            <div>
              <button
                onClick={() => setShowCompleted(v => !v)}
                className="w-full cursor-pointer"
                style={{ background: 'none', border: 'none', padding: 0 }}
              >
                <SectionHeader
                  label={`הושלמו השבוע (${completedThisWeek.length})`}
                  action={
                    <span style={{
                      fontSize: 10, color: 'rgba(255,255,255,0.25)',
                      display: 'inline-block', transition: 'transform 0.2s',
                      transform: showCompleted ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}>▾</span>
                  }
                />
              </button>
              {showCompleted && (
                <div className="flex flex-col gap-1.5">
                  {completedGroups.map(group => (
                    <CourseTaskGroup
                      key={group.course.id}
                      group={group}
                      onToggle={toggleTaskStatus}
                      allCompleted
                    />
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
