import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useSemesters } from '../hooks/useSemesters';
import { useCourses } from '../hooks/useCourses';
import { useTasks } from '../hooks/useTasks';
import type { TaskType } from '../lib/types';

// ── Tokens ─────────────────────────────────────────────
const BG     = '#09090F';
const CARD   = '#0F0F1A';
const FIELD  = '#0C0C17';
const BORDER = 'rgba(255,255,255,0.06)';
const TEAL   = '#00D4AA';
const WHITE  = '#EEEEF8';
const MUTED  = 'rgba(238,238,248,0.38)';
const DIM    = 'rgba(238,238,248,0.55)';
const PURPLE = '#00D4AA';

const PALETTE = [
  '#00D4AA', // teal
  '#3B82F6', // blue
  '#06B6D4', // cyan
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#EC4899', // pink
];

const STRUCTURE = [
  {
    id: 'lectures',
    label: 'הרצאות',
    sub: 'שיעורים והקלטות',
    icon: (active: boolean) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke={active ? PURPLE : 'rgba(255,255,255,0.3)'} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    ),
  },
  {
    id: 'tutorials',
    label: 'תרגולים',
    sub: 'תרגול ופתרון בעיות',
    icon: (active: boolean) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke={active ? PURPLE : 'rgba(255,255,255,0.3)'} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    id: 'workshops',
    label: 'סדנאות / מעבדה',
    sub: 'עבודה מעשית וניסויים',
    icon: (active: boolean) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke={active ? PURPLE : 'rgba(255,255,255,0.3)'} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2v7.31l-3.24 5.4A2 2 0 0 0 8.49 18H16a2 2 0 0 0 1.73-2.29L14.39 8.7 14 8V2"/>
        <path d="M6.8 2h10.4"/>
      </svg>
    ),
  },
];

export function CoursesPage() {
  const navigate = useNavigate();
  const { activeSemester } = useSemesters();
  const { courses, loading, createCourse } = useCourses(activeSemester?.id);
  const { createMultipleTasks } = useTasks();

  const [showAdd, setShowAdd]           = useState(false);
  const [name, setName]                 = useState('');
  const [courseNumber, setCourseNumber] = useState('');
  const [department, setDepartment]     = useState('');
  const [color, setColor]               = useState(PALETTE[0]);
  const [structure, setStructure]       = useState<Set<string>>(new Set(['lectures']));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleStructure = (id: string) =>
    setStructure(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const resetForm = () => {
    setName(''); setCourseNumber(''); setDepartment('');
    setColor(PALETTE[0]); setStructure(new Set(['lectures'])); setShowAdd(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSemester) return;
    setIsSubmitting(true);
    try {
      const createdCourse = await createCourse({ semester_id: activeSemester.id, name, course_number: courseNumber || null, color });
      
      if (createdCourse && structure.size > 0 && activeSemester.num_weeks) {
        const weeks = activeSemester.num_weeks;
        const newTasks = [];
        
        for (let w = 1; w <= weeks; w++) {
          if (structure.has('lectures')) {
            newTasks.push({ course_id: createdCourse.id, title: `הרצאה שבוע ${w}`, type: 'lecture' as TaskType, week_number: w, status: 'pending' as const, description: null, due_date: null, is_surprise: false });
          }
          if (structure.has('tutorials')) {
            newTasks.push({ course_id: createdCourse.id, title: `תרגול שבוע ${w}`, type: 'tutorial' as TaskType, week_number: w, status: 'pending' as const, description: null, due_date: null, is_surprise: false });
          }
          if (structure.has('workshops')) {
            newTasks.push({ course_id: createdCourse.id, title: `סדנה שבוע ${w}`, type: 'workshop' as TaskType, week_number: w, status: 'pending' as const, description: null, due_date: null, is_surprise: false });
          }
        }

        if (newTasks.length > 0) {
          await createMultipleTasks(newTasks);
        }
      }

      resetForm();
    } catch (err: any) {
      alert('שגיאה: ' + (err.message || JSON.stringify(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!activeSemester) {
    return (
      <div className="text-center p-12 bg-bg-card border border-dashed border-border rounded-lg mt-4">
        <p className="text-text-secondary mb-1 font-medium">אין סמסטר פעיל</p>
        <p className="text-sm text-text-tertiary">אנא בחר סמסטר פעיל כדי לנהל קורסים</p>
      </div>
    );
  }

  /* ─────────────────────────────────────────────
     COURSE CREATOR
  ───────────────────────────────────────────── */
  if (showAdd) {
    return (
      <div style={{ background: BG, minHeight: '100vh', color: WHITE }} className="pb-10 -mx-5 -mt-5 px-5 pt-5 md:-mx-8 md:-mt-8 md:px-8 md:pt-8">

        {/* ── Nav row ── */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={resetForm}
            className="flex items-center gap-1 text-sm font-semibold cursor-pointer transition-opacity hover:opacity-70"
            style={{ color: PURPLE }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            קורסים
          </button>
          <span className="text-sm font-semibold" style={{ color: DIM }}>הוספת קורס</span>
          <div style={{ width: 56 }}/>
        </div>

        {/* ── Color strip accent ── */}
        <div style={{
          height: 3, borderRadius: 99, marginBottom: 28,
          background: `linear-gradient(90deg, ${color}, ${color}44)`,
          transition: 'background 0.3s',
        }}/>

        {/* ── Hero text ── */}
        <p className="text-[10px] font-black tracking-[0.18em] mb-2.5" style={{ color: TEAL }}>
          הוספת קורס חדש
        </p>
        <h1 className="font-display font-black leading-none mb-3"
          style={{
            fontSize: 40, letterSpacing: -1, transition: 'color 0.3s',
            background: name ? `linear-gradient(135deg, ${color} 0%, #00EFBF 100%)` : undefined,
            WebkitBackgroundClip: name ? 'text' : undefined,
            backgroundClip: name ? 'text' : undefined,
            WebkitTextFillColor: name ? 'transparent' : undefined,
            color: name ? 'transparent' : WHITE,
          }}>
          {name || 'שם הקורס'}
        </h1>
        <p className="text-sm mb-8 leading-relaxed" style={{ color: MUTED }}>
          הגדר את פרטי הקורס ומבנה הלימוד שלו
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* ── Course Name ── */}
          <div>
            <label className="block text-[10px] font-black tracking-[0.15em] mb-2.5" style={{ color: PURPLE }}>
              שם הקורס
            </label>
            <input
              required value={name} onChange={e => setName(e.target.value)}
              placeholder="לדוגמה: אלגוריתמים מתקדמים"
              style={{ background: FIELD, border: `1px solid ${BORDER}`, borderRadius: 8, color: WHITE, outline: 'none', width: '100%', padding: '16px 18px', fontSize: 17, transition: 'border-color 0.2s' }}
              onFocus={e => (e.target.style.borderColor = `${color}80`)}
              onBlur={e => (e.target.style.borderColor = BORDER)}
            />
          </div>

          {/* ── Number + Department ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'מספר קורס', value: courseNumber, set: setCourseNumber, placeholder: 'CS-301', dir: 'ltr' as const },
              { label: 'מחלקה',     value: department,   set: setDepartment,   placeholder: 'מדעי המחשב', dir: 'rtl' as const },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-[10px] font-black tracking-[0.15em] mb-2.5" style={{ color: PURPLE }}>
                  {f.label}
                </label>
                <input
                  value={f.value} onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder} dir={f.dir}
                  style={{ background: FIELD, border: `1px solid ${BORDER}`, borderRadius: 8, color: WHITE, outline: 'none', width: '100%', padding: '15px 16px', fontSize: 16, transition: 'border-color 0.2s' }}
                  onFocus={e => (e.target.style.borderColor = `${color}80`)}
                  onBlur={e => (e.target.style.borderColor = BORDER)}
                />
              </div>
            ))}
          </div>

          {/* ── Color ── */}
          <div>
            <label className="block text-[10px] font-black tracking-[0.15em] mb-3" style={{ color: PURPLE }}>
              צבע הקורס
            </label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {PALETTE.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className="cursor-pointer transition-all duration-200 flex-shrink-0"
                  style={{
                    width: color === c ? 44 : 34,
                    height: color === c ? 44 : 34,
                    borderRadius: '50%',
                    background: c,
                    boxShadow: color === c ? `0 0 0 3px ${BG}, 0 0 0 5px ${c}` : 'none',
                    transition: 'all 0.2s',
                  }}
                />
              ))}
            </div>
          </div>

          {/* ── Divider ── */}
          <div style={{ height: 1, background: BORDER, marginBlock: 2 }}/>

          {/* ── Course Structure ── */}
          <div>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-display font-bold" style={{ fontSize: 18, color: WHITE }}>מבנה הקורס</h2>
              <span className="text-[11px]" style={{ color: MUTED }}>בחר מה שרלוונטי</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {STRUCTURE.map(opt => {
                const on = structure.has(opt.id);
                return (
                  <button key={opt.id} type="button" onClick={() => toggleStructure(opt.id)}
                    className="cursor-pointer transition-all duration-200 text-right"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '16px 18px',
                      borderRadius: 8,
                      background: on ? `${PURPLE}12` : CARD,
                      border: `1px solid ${on ? `${PURPLE}60` : BORDER}`,
                    }}>

                    {/* Check */}
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${on ? PURPLE : 'rgba(255,255,255,0.15)'}`,
                      background: on ? PURPLE : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}>
                      {on && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: on ? WHITE : DIM, lineHeight: 1.2 }}>
                        {opt.label}
                      </p>
                      <p style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>{opt.sub}</p>
                    </div>

                    {/* Icon box */}
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: on ? `${PURPLE}20` : 'rgba(255,255,255,0.04)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}>
                      {opt.icon(on)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Save ── */}
          <div style={{ paddingTop: 8 }}>
            <button type="submit" disabled={isSubmitting}
              className="cursor-pointer transition-opacity disabled:opacity-50"
              style={{
                width: '100%', padding: '17px 24px', borderRadius: 9,
                background: `linear-gradient(135deg, ${color} 0%, #00EFBF 100%)`,
                color: 'white', fontWeight: 800, fontSize: 15, letterSpacing: 0.2,
                boxShadow: `0 8px 32px ${color}40`,
                transition: 'box-shadow 0.3s, opacity 0.2s',
              }}>
              {isSubmitting ? '...' : 'שמור קורס'}
            </button>
            <button type="button" onClick={resetForm}
              className="cursor-pointer transition-opacity hover:opacity-60 w-full mt-4 text-sm"
              style={{ color: MUTED, textAlign: 'center' }}>
              ביטול
            </button>
          </div>

        </form>
      </div>
    );
  }

  /* ─────────────────────────────────────────────
     COURSE LIST
  ───────────────────────────────────────────── */
  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-display text-[26px] font-bold text-text-primary mb-0.5">הקורסים שלי</h2>
          <p className="text-text-tertiary text-sm">סמסטר נוכחי: {activeSemester.name}</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="bg-accent-primary text-white text-sm font-bold py-2 px-4 rounded-xl hover:bg-accent-primary-hover transition-colors cursor-pointer">
          + הוסף קורס
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="w-8 h-8 rounded-full animate-spin"
            style={{ border: '3px solid rgba(255,255,255,0.08)', borderTopColor: 'rgba(255,255,255,0.5)' }}/>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center p-12 bg-bg-card border border-dashed border-border rounded-lg">
          <p className="text-text-secondary mb-1 font-medium">אין קורסים בסמסטר זה</p>
          <p className="text-sm text-text-tertiary">לחץ הוסף קורס כדי להתחיל</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {courses.map(course => (
            <div key={course.id} onClick={() => navigate(`/courses/${course.id}`)}
              className="bg-bg-card border border-border rounded-lg p-4 shadow-card hover:bg-bg-card-hover transition-all relative overflow-hidden cursor-pointer">
              <div className="absolute top-0 right-0 left-0 h-1 rounded-t-2xl" style={{ background: course.color }}/>
              <h3 className="font-display text-[15px] font-bold text-text-primary mb-1 mt-1">{course.name}</h3>
              {course.course_number && (
                <p className="text-[11px] font-semibold mb-3 px-2 py-0.5 rounded-md inline-block"
                  style={{ background: `${course.color}18`, color: course.color }}>
                  {course.course_number}
                </p>
              )}
              <div className="flex gap-4 mt-3">
                <div className="flex flex-col">
                  <span className="text-base font-bold" style={{ color: '#4ADE80' }}>0</span>
                  <span className="text-[10px] text-text-tertiary">הושלמו</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold text-accent-primary">0</span>
                  <span className="text-[10px] text-text-tertiary">נשארו</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
