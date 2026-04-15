import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { devDb } from '../lib/devDb';
import { useSemesters } from '../hooks/useSemesters';
import { useAuth } from '../contexts/AuthContext';
import type { TaskStatus } from '../lib/types';

const DEV = import.meta.env.VITE_SKIP_AUTH;

type AssignmentTask = {
  id: string;
  course_id: string;
  title: string;
  type: string;
  week_number: number;
  status: TaskStatus;
  due_date: string | null;
  course: { id: string; name: string; color: string };
};

// ── Helpers ────────────────────────────────────────────────────────────────

function getDaysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  due.setHours(23, 59, 59, 0);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDueLabel(dueDate: string | null): { text: string; color: string } {
  const days = getDaysUntilDue(dueDate);
  if (days === null) return { text: 'ללא תאריך הגשה', color: 'rgba(255,255,255,0.22)' };
  if (days < 0)  return { text: `איחור של ${Math.abs(days)} ימים`, color: '#F87171' };
  if (days === 0) return { text: 'היום!', color: '#F87171' };
  if (days === 1) return { text: 'מחר', color: '#FBBF24' };
  if (days <= 7)  return { text: `בעוד ${days} ימים`, color: '#FBBF24' };
  return { text: `בעוד ${days} ימים`, color: 'rgba(255,255,255,0.35)' };
}

function formatAbsoluteDate(dueDate: string | null): string | null {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function sortByDueDate(a: AssignmentTask, b: AssignmentTask): number {
  if (!a.due_date && !b.due_date) return 0;
  if (!a.due_date) return 1;
  if (!b.due_date) return -1;
  return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
}

// ── AssignmentCard ─────────────────────────────────────────────────────────

interface CardProps {
  task: AssignmentTask;
  onToggle: (id: string, status: TaskStatus) => void;
  completed?: boolean;
}

function AssignmentCard({ task, onToggle, completed }: CardProps) {
  const done = completed || task.status === 'completed';
  const dueLabel = formatDueLabel(done ? null : task.due_date);
  const absDate = formatAbsoluteDate(task.due_date);

  return (
    <div
      onClick={() => onToggle(task.id, task.status)}
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderInlineEnd: `3px solid ${task.course.color}`,
        borderRadius: 10,
        padding: '11px 13px',
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        cursor: 'pointer',
        opacity: done ? 0.5 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {/* Checkbox */}
      <button
        onClick={e => { e.stopPropagation(); onToggle(task.id, task.status); }}
        style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
          border: done ? 'none' : '2px solid rgba(255,255,255,0.18)',
          background: done ? '#4ADE80' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        {done && (
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#0E0E16" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 500, color: done ? 'rgba(255,255,255,0.28)' : '#d0d6e0',
          textDecoration: done ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginBottom: 4,
        }}>
          {task.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Course pill */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10, fontWeight: 510, color: 'rgba(255,255,255,0.45)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: task.course.color, flexShrink: 0, display: 'inline-block' }} />
            {task.course.name}
          </span>
          {/* Week */}
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>
            שב׳ {task.week_number}
          </span>
        </div>
      </div>

      {/* Due info */}
      <div style={{ textAlign: 'start', flexShrink: 0 }}>
        {!done && (
          <div style={{ fontSize: 11, fontWeight: 590, color: dueLabel.color, marginBottom: 2 }}>
            {dueLabel.text}
          </div>
        )}
        {absDate && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
            {absDate}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────

function SectionHeader({ label, count, accent }: { label: string; count: number; accent?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 510, color: accent ?? 'rgba(255,255,255,0.28)', letterSpacing: '0.02em' }}>
        {label}
      </span>
      <span style={{
        fontSize: 10, fontWeight: 600, color: accent ?? 'rgba(255,255,255,0.28)',
        background: accent ? `${accent}22` : 'rgba(255,255,255,0.06)',
        padding: '1px 6px', borderRadius: 20,
      }}>
        {count}
      </span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}

// ── AssignmentsPage ────────────────────────────────────────────────────────

export function AssignmentsPage() {
  const { user } = useAuth();
  const { activeSemester, loading: semesterLoading } = useSemesters();
  const [tasks, setTasks] = useState<AssignmentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    async function fetchAssignments() {
      if (DEV) {
        if (!activeSemester) { setLoading(false); return; }
        const all = devDb.tasks.getBySemester(activeSemester.id) as unknown as AssignmentTask[];
        setTasks(all.filter(t => t.type === 'assignment'));
        setLoading(false);
        return;
      }
      if (!user || !activeSemester) { setLoading(false); return; }
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*, course:courses!inner(id, name, color, semester_id)')
          .eq('course.semester_id', activeSemester.id)
          .eq('type', 'assignment')
          .order('due_date', { ascending: true, nullsFirst: false });
        if (error) throw error;
        setTasks(data as unknown as AssignmentTask[]);
      } catch (err) {
        console.error('Error fetching assignments:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAssignments();
  }, [user, activeSemester]);

  const toggleStatus = async (taskId: string, currentStatus: TaskStatus) => {
    const newStatus: TaskStatus = currentStatus === 'completed' ? 'pending' : 'completed';
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
      <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
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
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>צור או בחר סמסטר כדי לראות את המטלות שלך</p>
      </div>
    );
  }

  // ── Group by urgency ──────────────────────────────────────────────────────
  const pending = tasks.filter(t => t.status !== 'completed');
  const completed = tasks.filter(t => t.status === 'completed');

  const overdue   = pending.filter(t => { const d = getDaysUntilDue(t.due_date); return d !== null && d < 0; }).sort(sortByDueDate);
  const dueThisWeek = pending.filter(t => { const d = getDaysUntilDue(t.due_date); return d !== null && d >= 0 && d <= 7; }).sort(sortByDueDate);
  const upcoming  = pending.filter(t => { const d = getDaysUntilDue(t.due_date); return d === null || d > 7; }).sort(sortByDueDate);
  const completedSorted = [...completed].sort(sortByDueDate);

  const isEmpty = tasks.length === 0;

  return (
    <div className="animate-fade-in pb-4">

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 590, color: '#f7f8f8', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
          מטלות
        </h2>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', marginTop: 3 }}>
          {activeSemester.name}
          {tasks.length > 0 && ` · ${pending.length} ממתינות`}
        </p>
      </div>

      {isEmpty ? (
        <div className="text-center p-12 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <p style={{ color: '#d0d6e0', fontWeight: 510, marginBottom: 4 }}>אין מטלות בסמסטר</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>הוסף מטלות דרך דף הקורס</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Overdue */}
          {overdue.length > 0 && (
            <div>
              <SectionHeader label="באיחור" count={overdue.length} accent="#F87171" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {overdue.map(t => <AssignmentCard key={t.id} task={t} onToggle={toggleStatus} />)}
              </div>
            </div>
          )}

          {/* Due this week */}
          {dueThisWeek.length > 0 && (
            <div>
              <SectionHeader label="השבוע" count={dueThisWeek.length} accent="#FBBF24" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dueThisWeek.map(t => <AssignmentCard key={t.id} task={t} onToggle={toggleStatus} />)}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div>
              <SectionHeader label="הגשות קרובות" count={upcoming.length} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {upcoming.map(t => <AssignmentCard key={t.id} task={t} onToggle={toggleStatus} />)}
              </div>
            </div>
          )}

          {/* All done — no pending */}
          {pending.length === 0 && completed.length > 0 && (
            <div className="text-center py-6 rounded-lg"
              style={{ background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.1)' }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
              <p style={{ fontSize: 13, color: '#4ADE80', fontWeight: 510 }}>כל המטלות הוגשו!</p>
            </div>
          )}

          {/* Completed — collapsible */}
          {completedSorted.length > 0 && (
            <div>
              <button
                onClick={() => setShowCompleted(v => !v)}
                style={{ background: 'none', border: 'none', padding: 0, width: '100%', cursor: 'pointer' }}
              >
                <SectionHeader
                  label={`הוגשו (${completedSorted.length})`}
                  count={completedSorted.length}
                />
              </button>
              {showCompleted && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {completedSorted.map(t => <AssignmentCard key={t.id} task={t} onToggle={toggleStatus} completed />)}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
