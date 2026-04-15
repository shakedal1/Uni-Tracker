import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { supabase } from '../lib/supabase';
import { devDb } from '../lib/devDb';
import { useTasks } from '../hooks/useTasks';
import type { Course } from '../lib/types';
import type { TaskType } from '../lib/types';
import { useSemesters } from '../hooks/useSemesters';
import { DatePicker } from '../components/DatePicker';

const DEV = import.meta.env.VITE_SKIP_AUTH;

const TYPE_LABEL_PLURAL: Record<TaskType, string> = {
  lecture: 'הרצאות',
  tutorial: 'תרגולים',
  workshop: 'סדנאות',
  assignment: 'מטלות',
};

function ProgressRing({ radius, stroke, progress, gradient, label }: { radius: number, stroke: number, progress: number, gradient: { start: string, end: string }, label: string }) {
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const isFinished = progress >= 100;
  const gid = `grad-${label.replace(/ /g, '-')}`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex justify-center items-center" style={{ width: radius * 2, height: radius * 2 }}>
        <svg height={radius * 2} width={radius * 2} className="transform -rotate-90" style={{ filter: isFinished ? `drop-shadow(0 0 10px ${gradient.start})` : 'none', transition: 'filter 0.5s ease' }}>
          <defs>
            <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradient.start} />
              <stop offset="100%" stopColor={gradient.end} />
            </linearGradient>
          </defs>
          <circle
            stroke={`${gradient.start}22`}
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={isFinished ? gradient.start : `url(#${gid})`}
            fill="transparent"
            strokeWidth={isFinished ? stroke * 1.4 : stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.8s ease-in-out' }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        {isFinished ? (
          <span className="absolute font-black flex items-center justify-center" style={{ color: 'white', fontSize: radius * 0.65, textShadow: `0 0 10px ${gradient.start}80`, lineHeight: 1 }}>✓</span>
        ) : (
          <span className="absolute flex items-center justify-center" style={{ color: 'white', fontFamily: "'Supermercado One', cursive", fontSize: radius * 0.42, lineHeight: 1 }}>
            {Math.round(progress)}%
          </span>
        )}
      </div>
      <span className="text-[12px] font-bold mt-3" style={{ color: 'rgba(255,255,255,0.7)' }}>{label}</span>
    </div>
  );
}

export function CourseDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeSemester } = useSemesters();
  const { tasks, loading: tasksLoading, createTask, updateTask, updateTaskStatus, deleteTask } = useTasks(id);

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [postponingTaskId, setPostponingTaskId] = useState<string | null>(null);
  const [postponeDate, setPostponeDate] = useState('');

  useEffect(() => {
    if (!id) return;
    if (DEV) {
      const found = devDb.courses.getAll().find((c: any) => c.id === id) ?? null;
      setCourse(found);
      setLoading(false);
      return;
    }
    supabase.from('courses').select('*').eq('id', id).single().then(({ data, error }) => {
      if (!error) setCourse(data);
      setLoading(false);
    });
  }, [id]);

  const handleDeleteCourse = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      if (DEV) {
        devDb.courses.delete(id);
      } else {
        await supabase.from('courses').delete().eq('id', id);
      }
      navigate('/courses');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Compute week number from due date (deadline week), falling back to release date, then 1
    let weekNum = 1;
    const dateForWeek = dueDate || releaseDate;
    if (dateForWeek && activeSemester?.start_date) {
      const diff = Math.floor((new Date(dateForWeek).getTime() - new Date(activeSemester.start_date).getTime()) / (7 * 86400000));
      weekNum = Math.max(1, Math.min(diff + 1, activeSemester.num_weeks));
    }
    try {
      await createTask({
        title,
        type: 'assignment',
        week_number: weekNum,
        status: 'pending',
        description: null,
        release_date: releaseDate || null,
        due_date: dueDate || null,
        is_surprise: false,
      });
      setShowAdd(false);
      setTitle('');
      setReleaseDate('');
      setDueDate('');

    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostpone = async () => {
    if (!postponingTaskId || !postponeDate || !activeSemester) return;
    const diff = Math.floor(
      (new Date(postponeDate).getTime() - new Date(activeSemester.start_date).getTime()) /
      (7 * 24 * 60 * 60 * 1000)
    );
    const newWeek = Math.max(1, Math.min(diff + 1, activeSemester.num_weeks));
    await updateTask(postponingTaskId, { due_date: postponeDate, week_number: newWeek });
    setPostponingTaskId(null);
    setPostponeDate('');
  };

  if (loading || tasksLoading) {
    return (
      <div style={{ background: '#0E0E16', minHeight: '100vh' }} className="flex justify-center items-center">
        <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '3px solid rgba(255,255,255,0.08)', borderTopColor: 'rgba(255,255,255,0.5)' }} />
      </div>
    );
  }

  if (!course || !activeSemester) {
    return (
      <div style={{ background: '#0E0E16', minHeight: '100vh', color: 'white' }} className="flex justify-center items-center text-sm opacity-50">
        קורס לא נמצא
      </div>
    );
  }

  const weeks = Array.from({ length: activeSemester.num_weeks }, (_, i) => i + 1);
  const tasksByWeek = tasks.reduce((acc, task) => {
    if (!acc[task.week_number]) acc[task.week_number] = [];
    acc[task.week_number].push(task);
    return acc;
  }, {} as Record<number, typeof tasks>);

  const lessonTasks = tasks.filter(t => t.type !== 'assignment');
  const assignmentTasks = tasks.filter(t => t.type === 'assignment');
  const accent = course.color || '#C4652A';

  const BG = '#0E0E16';
  const CARD = '#16161F';
  const BORDER = 'rgba(255,255,255,0.07)';
  const TEXT = 'rgba(255,255,255,0.85)';
  const MUTED = 'rgba(255,255,255,0.35)';
  const GREEN = '#4ADE80';

  const TYPE_GRADIENT: Record<TaskType, { start: string, end: string }> = {
    lecture: { start: '#00C6FF', end: '#0072FF' },
    tutorial: { start: '#F54EA2', end: '#FF7676' },
    workshop: { start: '#17EAD9', end: '#6078EA' },
    assignment: { start: '#FF8008', end: '#FFC837' }
  };

  const typeStats = (['lecture', 'tutorial', 'workshop', 'assignment'] as TaskType[]).map(tType => {
      const typeTasks = tasks.filter(t => t.type === tType);
      if (typeTasks.length === 0) return null;
      const completed = typeTasks.filter(t => t.status === 'completed').length;
      return {
        type: tType,
        total: typeTasks.length,
        completed,
        pct: Math.round((completed / typeTasks.length) * 100)
      }
  }).filter(Boolean) as { type: TaskType, total: number, completed: number, pct: number }[];

  return (
    <div style={{ background: BG, minHeight: '100vh', color: TEXT }} className="pb-28">

      {/* Header + Rings — single merged block */}
      <div style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }} className="px-5 pt-5 pb-6">
        <button
          onClick={() => navigate(-1)}
          style={{ color: MUTED }}
          className="text-xs mb-4 flex items-center gap-1 hover:opacity-80 cursor-pointer"
        >
          &#8592; חזרה לקורסים
        </button>

        <div className="flex items-start gap-3">
          <div className="w-1 h-12 rounded-full mt-0.5 flex-shrink-0" style={{ background: accent }} />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-[26px] font-bold leading-tight" style={{ color: 'rgba(255,255,255,0.95)' }}>
              {course.name}
            </h1>
            {course.course_number && (
              <span className="text-[11px] font-bold mt-1 inline-block px-2.5 py-0.5 rounded-full" style={{ background: `${accent}22`, color: accent }}>
                {course.course_number}
              </span>
            )}
          </div>
        </div>

        {typeStats.length > 0 && (() => {
          const count = typeStats.length;
          const radius = count >= 3 ? 42 : 50;
          const is2x2 = count === 4;
          return (
            <div
              className={is2x2 ? 'grid grid-cols-2 justify-items-center gap-y-5 mt-6' : 'flex justify-around mt-6'}
              style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20 }}
            >
              {typeStats.map(stat => (
                <ProgressRing
                  key={stat.type}
                  radius={radius}
                  stroke={7}
                  progress={stat.pct}
                  gradient={TYPE_GRADIENT[stat.type]}
                  label={TYPE_LABEL_PLURAL[stat.type]}
                />
              ))}
            </div>
          );
        })()}
      </div>

      <div className="px-4 pt-5 flex flex-col gap-5">

        {/* Curriculum roadmap */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold tracking-widest" style={{ color: MUTED }}>מפת לימוד</span>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.07)', color: MUTED }}>
              {activeSemester.num_weeks} שבועות
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {weeks.map(w => {
              const weekTasks = tasksByWeek[w] || [];
              const weekLessons = weekTasks.filter(t => t.type !== 'assignment');
              if (weekTasks.length === 0) return null;
              const allDone = weekTasks.length > 0 && weekTasks.every(t => t.status === 'completed');
              const doneLessons = weekLessons.filter(t => t.status === 'completed').length;

              return (
                <div key={w} style={{
                  background: CARD,
                  border: `1px solid ${allDone ? 'rgba(74,222,128,0.2)' : BORDER}`,
                  borderRadius: 9,
                  overflow: 'hidden',
                }}>
                  {/* Week header row */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: allDone ? GREEN : 'rgba(255,255,255,0.07)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {allDone
                        ? <span style={{ color: '#0E0E16', fontSize: 13, fontWeight: 900 }}>✓</span>
                        : <span style={{ color: MUTED, fontSize: 11, fontWeight: 700 }}>{w}</span>
                      }
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold" style={{ color: TEXT }}>שבוע {w}</div>
                    </div>
                    {allDone && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(74,222,128,0.15)', color: GREEN }}>
                        הושלם
                      </span>
                    )}
                    {!allDone && doneLessons > 0 && weekLessons.length > 0 && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)', color: MUTED }}>
                        {doneLessons}/{weekLessons.length}
                      </span>
                    )}
                  </div>

                  {/* Task rows */}
                  {weekTasks.filter(t => t.type !== 'assignment').map(task => (
                    <div key={task.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                      className="flex items-center gap-2.5 px-4 py-1.5">
                      <button
                        onClick={() => updateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                        style={{
                          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                          border: task.status === 'completed' ? 'none' : '2px solid rgba(255,255,255,0.18)',
                          background: task.status === 'completed' ? 'rgba(255,255,255,0.22)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        {task.status === 'completed' && <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 900 }}>✓</span>}
                      </button>
                      <span className="flex-1 text-xs truncate" style={{
                        color: task.status === 'completed' ? 'rgba(255,255,255,0.25)' : TEXT,
                        textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                      }}>
                        {task.title}
                      </span>
                      <button onClick={() => deleteTask(task.id)}
                        style={{ color: 'rgba(255,80,80,0.4)', fontSize: 18, lineHeight: 1, flexShrink: 0, cursor: 'pointer' }}
                        className="hover:opacity-80">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}

            {lessonTasks.length === 0 && !showAdd && (
              <div style={{ border: `1px dashed rgba(255,255,255,0.1)`, borderRadius: 9, color: MUTED }}
                className="text-center py-10 text-sm">
                אין שיעורים — לחץ הוסף שיעור כדי להתחיל
              </div>
            )}
          </div>
        </div>

        {/* Assignments */}
        {assignmentTasks.length > 0 && (
          <div>
            <div className="text-[10px] font-bold tracking-widest mb-3" style={{ color: MUTED }}>מטלות</div>
            <div className="flex flex-col gap-2">
              {assignmentTasks.map(task => (
                <div key={task.id} style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  borderInlineEnd: `3px solid ${accent}`,
                  borderRadius: 9,
                }} className="px-4 py-3 flex items-center gap-3">
                  <button
                    onClick={() => updateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                    style={{
                      width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                      border: task.status === 'completed' ? 'none' : '2px solid rgba(255,255,255,0.18)',
                      background: task.status === 'completed' ? GREEN : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    {task.status === 'completed' && <span style={{ color: '#0E0E16', fontSize: 11, fontWeight: 900 }}>✓</span>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold" style={{
                      color: task.status === 'completed' ? 'rgba(255,255,255,0.3)' : TEXT,
                      textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                    }}>
                      {task.title}
                    </div>
                    <div className="text-[11px] mt-0.5 flex items-center gap-2" style={{ color: MUTED }}>
                      <span>שבוע {task.week_number}</span>
                      {task.due_date && (
                        <span>· הגשה {new Date(task.due_date).getDate()}/{new Date(task.due_date).getMonth() + 1}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0" style={{
                    background: task.status === 'completed' ? 'rgba(74,222,128,0.15)' : 'rgba(255,160,60,0.15)',
                    color: task.status === 'completed' ? GREEN : '#FFA03C',
                  }}>
                    {task.status === 'completed' ? 'הושלם' : 'ממתין'}
                  </span>
                  {/* Postpone button */}
                  <button
                    onClick={() => { setPostponingTaskId(task.id); setPostponeDate(task.due_date ?? ''); }}
                    title="דחה הגשה"
                    style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14, lineHeight: 1, cursor: 'pointer', flexShrink: 0 }}
                    className="hover:opacity-80"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                      <path d="M17 14l-5 5-2-2"/>
                    </svg>
                  </button>
                  <button onClick={() => deleteTask(task.id)}
                    style={{ color: 'rgba(255,80,80,0.4)', fontSize: 18, lineHeight: 1, cursor: 'pointer' }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Delete course button */}
      <div className="px-4 pt-2 pb-4">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full py-3 rounded-lg text-sm font-bold transition-opacity hover:opacity-80 cursor-pointer"
          style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', color: '#FF5050' }}
        >
          מחק קורס
        </button>
      </div>

      {/* FAB */}
      <button
        onClick={() => {
          const today = new Date();
          const nextWeek = new Date(today);
          const defaultDays = parseInt(localStorage.getItem('setting_default_task_days') || '7');
          nextWeek.setDate(today.getDate() + defaultDays);
          const fmt = (d: Date) => d.toISOString().split('T')[0];
          setTitle(`${course.name} תרגיל בית ${assignmentTasks.length + 1}`);
          setReleaseDate(fmt(today));
          setDueDate(fmt(nextWeek));
          setShowAdd(true);
        }}
        className="fixed bottom-24 md:bottom-8 right-4 md:right-8 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl z-40 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        style={{ background: '#00D4AA', color: '#09090F', fontSize: 28, fontWeight: 300, boxShadow: '0 4px 16px rgba(0,212,170,0.2)' }}
      >
        +
      </button>

      {/* Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div style={{ background: CARD, border: `1px solid ${BORDER}` }} className="w-full max-w-sm rounded-xl shadow-2xl">
            <div className="px-6 py-5 border-b" style={{ borderColor: BORDER }}>
              <div className="flex justify-between items-center">
                <h3 className="font-display font-bold text-lg text-white">משימה חדשה</h3>
                <button type="button" onClick={() => setShowAdd(false)} className="text-white/40 hover:text-white pb-1 text-2xl leading-none cursor-pointer">×</button>
              </div>
            </div>
            <form onSubmit={handleAddTask} className="p-6 flex flex-col gap-4">

              <div>
                <label className="block text-[11px] font-bold tracking-widest mb-2" style={{ color: MUTED }}>שם המטלה</label>
                <input required value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="לדוגמה: מטלה 1"
                  style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 8 }}
                  className="w-full px-4 py-3 text-sm focus:outline-none"
                />
              </div>

              <DatePicker value={releaseDate} onChange={setReleaseDate} label="תאריך שחרור" accent={accent} />
              <DatePicker value={dueDate} onChange={setDueDate} label="תאריך הגשה" accent={accent} />

              <button disabled={isSubmitting} type="submit"
                style={{ background: accent, borderRadius: 8, color: 'white' }}
                className="w-full font-bold py-3.5 text-sm mt-2 transition-opacity hover:opacity-90 cursor-pointer">
                {isSubmitting ? '...' : 'הוסף מטלה'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Postpone modal */}
      {postponingTaskId && (() => {
        const task = tasks.find(t => t.id === postponingTaskId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20 }}
              className="w-full max-w-sm shadow-2xl p-6 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 style={{ fontSize: 16, fontWeight: 650, color: TEXT }}>דחיית הגשה</h3>
                <button onClick={() => setPostponingTaskId(null)} style={{ color: MUTED, fontSize: 20, lineHeight: 1, cursor: 'pointer' }}>×</button>
              </div>
              <p style={{ fontSize: 13, color: MUTED }}>
                {task?.title}
                {task?.due_date && (
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {' '}· הגשה נוכחית: {new Date(task.due_date).getDate()}/{new Date(task.due_date).getMonth() + 1}
                  </span>
                )}
              </p>
              <DatePicker
                value={postponeDate}
                onChange={setPostponeDate}
                label="תאריך הגשה חדש"
                accent={accent}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setPostponingTaskId(null)}
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', borderRadius: 12, cursor: 'pointer' }}
                  className="flex-1 py-3 text-sm font-bold"
                >
                  ביטול
                </button>
                <button
                  onClick={handlePostpone}
                  disabled={!postponeDate}
                  style={{
                    background: postponeDate ? accent : 'rgba(255,255,255,0.1)',
                    color: postponeDate ? 'white' : 'rgba(255,255,255,0.3)',
                    borderRadius: 12, cursor: postponeDate ? 'pointer' : 'default',
                  }}
                  className="flex-1 py-3 text-sm font-bold transition-colors"
                >
                  אשר דחייה
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div style={{ background: CARD, border: '1px solid rgba(255,80,80,0.2)', borderRadius: 24 }}
            className="w-full max-w-sm shadow-2xl p-6 flex flex-col gap-4">
            <div className="text-center">
              <div className="text-3xl mb-3">🗑️</div>
              <h3 className="font-display font-bold text-lg text-white mb-1">מחיקת קורס</h3>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                האם למחוק את <span className="font-bold text-white">{course.name}</span>?<br/>
                פעולה זו תמחק את כל המשימות של הקורס ולא ניתן לשחזר.
              </p>
            </div>
            <div className="flex gap-3 mt-1">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)' }}
              >
                ביטול
              </button>
              <button
                onClick={handleDeleteCourse}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-80 cursor-pointer"
                style={{ background: '#FF5050', color: 'white' }}
              >
                {isDeleting ? '...' : 'מחק'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
