import { useState } from 'react';
import { useSemesters } from '../hooks/useSemesters';

export function SemestersPage() {
  const { semesters, loading, createSemester, setActiveSemester, deleteSemester } = useSemesters();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [numWeeks, setNumWeeks] = useState(13);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteSemester(id);
    } catch (err: any) {
      alert('שגיאה: ' + (err.message || JSON.stringify(err)));
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createSemester({ name, start_date: startDate, num_weeks: numWeeks, is_active: semesters.length === 0 });
      setShowAdd(false);
      setName('');
      setStartDate('');
      setNumWeeks(13);
    } catch (err: any) {
      alert('שגיאה: ' + (err.message || JSON.stringify(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-display text-[26px] font-bold text-text-primary mb-0.5">סמסטרים</h2>
          <p className="text-text-tertiary text-sm">נהל את תקופות הלימודים שלך</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-accent-primary text-white text-sm font-bold py-2 px-4 rounded-lg shadow-sm hover:bg-accent-primary-hover transition-colors cursor-pointer"
        >
          {showAdd ? 'ביטול' : '+ הוסף'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-bg-card border border-border rounded-lg p-5 mb-6 shadow-card">
          <p className="text-[10px] font-bold tracking-widest text-accent-primary mb-4">סמסטר חדש</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">שם הסמסטר</label>
              <input
                required value={name} onChange={e => setName(e.target.value)}
                placeholder="לדוג׳ סמסטר א׳ תשפ״ה"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary focus:outline-none focus:border-accent-primary transition-colors text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">תאריך התחלה</label>
                <input
                  required value={startDate} onChange={e => setStartDate(e.target.value)}
                  type="date" dir="ltr"
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary focus:outline-none focus:border-accent-primary transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">מספר שבועות</label>
                <input
                  required value={numWeeks} onChange={e => setNumWeeks(parseInt(e.target.value))}
                  type="number" min="1" max="52" dir="ltr"
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary focus:outline-none focus:border-accent-primary transition-colors text-sm text-right"
                />
              </div>
            </div>
            <button
              disabled={isSubmitting} type="submit"
              className="mt-1 bg-accent-primary text-white font-bold py-2.5 rounded-lg hover:bg-accent-primary-hover transition-colors cursor-pointer disabled:opacity-60 text-sm"
            >
              {isSubmitting ? '...' : 'שמור סמסטר'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '3px solid rgba(255,255,255,0.08)', borderTopColor: 'rgba(255,255,255,0.5)' }} />
        </div>
      ) : semesters.length === 0 ? (
        <div className="text-center p-12 bg-bg-card border border-dashed border-border rounded-lg">
          <p className="text-text-secondary mb-1 font-medium">אין סמסטרים עדיין</p>
          <p className="text-sm text-text-tertiary">לחץ הוסף כדי להתחיל</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {semesters.map(semester => (
            <div
              key={semester.id}
              className={`p-5 rounded-lg border transition-all ${
                semester.is_active
                  ? 'bg-accent-primary-light border-accent-primary shadow-card'
                  : 'bg-bg-card border-border hover:border-border-light'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-bold text-base text-text-primary">{semester.name}</h3>
                <div className="flex items-center gap-2">
                  {semester.is_active && (
                    <span className="text-[10px] font-bold bg-accent-primary text-white py-0.5 px-2.5 rounded-full">פעיל</span>
                  )}
                  {confirmDeleteId === semester.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDelete(semester.id)}
                        disabled={deletingId === semester.id}
                        className="text-[11px] font-bold text-danger hover:text-danger/80 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {deletingId === semester.id ? '...' : 'מחק'}
                      </button>
                      <span className="text-text-tertiary text-xs">|</span>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-[11px] font-bold text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
                      >
                        ביטול
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(semester.id)}
                      className="text-text-tertiary hover:text-danger transition-colors cursor-pointer p-0.5"
                      title="מחק סמסטר"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-text-secondary mb-4">
                מתחיל ב: {new Date(semester.start_date).toLocaleDateString('he-IL')} &bull; {semester.num_weeks} שבועות
              </p>
              {!semester.is_active && confirmDeleteId !== semester.id && (
                <button
                  onClick={() => setActiveSemester(semester.id)}
                  className="text-xs font-bold text-accent-primary hover:text-accent-primary-hover transition-colors cursor-pointer"
                >
                  הגדר כסמסטר פעיל
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
