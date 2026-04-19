import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const MONTHS_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const DAYS_SHORT = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳']; // Sun→Sat (RTL grid places Sun on right)

const BG     = '#09090F';
const CARD   = '#13131E';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT   = 'rgba(255,255,255,0.88)';
const MUTED  = 'rgba(255,255,255,0.32)';
const CARD2  = '#1A1A28';

interface DatePickerProps {
  value: string;           // "YYYY-MM-DD"
  onChange: (v: string) => void;
  label: string;
  accent?: string;
}

export function DatePicker({ value, onChange, label, accent = '#00D4AA' }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const d = value ? new Date(value + 'T12:00:00') : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedDate = value ? new Date(value + 'T12:00:00') : null;
  const today = new Date();

  // Sync view when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T12:00:00');
      setView({ year: d.getFullYear(), month: d.getMonth() });
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-datepicker]')) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const POPUP_W = 308;

  const openCalendar = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const popupH = 370;
    const top = spaceBelow > popupH ? rect.bottom + 6 : rect.top - popupH - 6;
    // Align right edge of popup to right edge of trigger; clamp to viewport
    const left = Math.max(8, Math.min(rect.right - POPUP_W, window.innerWidth - POPUP_W - 8));
    setPopupPos({ top, left, width: POPUP_W });
    setOpen(true);
  };

  // Build calendar grid
  const firstDayOfMonth = new Date(view.year, view.month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectDay = (day: number) => {
    const m = String(view.month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange(`${view.year}-${m}-${d}`);
    setOpen(false);
  };

  const isSelected = (day: number) =>
    !!selectedDate &&
    selectedDate.getFullYear() === view.year &&
    selectedDate.getMonth() === view.month &&
    selectedDate.getDate() === day;

  const isToday = (day: number) =>
    today.getFullYear() === view.year &&
    today.getMonth() === view.month &&
    today.getDate() === day;

  const prevMonth = () =>
    setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  const nextMonth = () =>
    setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });

  const displayValue = selectedDate
    ? `${selectedDate.getDate()} ${MONTHS_HE[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
    : 'בחר תאריך';

  return (
    <div data-datepicker>
      <label className="block text-[11px] font-bold tracking-widest mb-2" style={{ color: MUTED }}>
        {label}
      </label>

      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openCalendar}
        className="w-full px-4 py-3 text-sm flex items-center justify-between gap-2 transition-colors"
        style={{
          background: BG,
          border: `1px solid ${open ? accent + '60' : BORDER}`,
          color: selectedDate ? TEXT : MUTED,
          borderRadius: 8,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}>
          <rect x="3" y="4" width="18" height="18" rx="3"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
        </svg>
        <span className="flex-1 text-right">{displayValue}</span>
      </button>

      {/* Calendar popup — portalled to body to escape stacking contexts */}
      {open && createPortal(
        <div
          data-datepicker
          className="fixed z-[9999] rounded-[10px] shadow-2xl overflow-hidden"
          style={{
            top: popupPos.top,
            left: popupPos.left,
            width: popupPos.width,
            background: CARD,
            border: `1px solid ${BORDER}`,
            boxShadow: `0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px ${BORDER}`,
          }}
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <button type="button" onClick={nextMonth}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ color: accent, background: `${accent}18` }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>

            <span className="font-bold text-[16px] whitespace-nowrap" style={{ color: TEXT }}>
              {MONTHS_HE[view.month]} {view.year}
            </span>

            <button type="button" onClick={prevMonth}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ color: accent, background: `${accent}18` }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 px-3 pb-1">
            {DAYS_SHORT.map(d => (
              <div key={d} className="h-9 flex items-center justify-center text-[11px] font-bold" style={{ color: MUTED }}>
                {d}
              </div>
            ))}
          </div>

          {/* Date grid */}
          <div className="grid grid-cols-7 px-3 pb-5 gap-y-1">
            {cells.map((day, i) => (
              <div key={i} className="flex justify-center">
                {day ? (
                  <button
                    type="button"
                    onClick={() => selectDay(day)}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] relative transition-all hover:opacity-80"
                    style={{
                      background: isSelected(day) ? accent : isToday(day) ? CARD2 : 'transparent',
                      color: isSelected(day) ? '#09090F' : isToday(day) ? accent : TEXT,
                      fontWeight: isSelected(day) || isToday(day) ? 700 : 400,
                      border: isToday(day) && !isSelected(day) ? `1.5px solid ${accent}60` : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {day}
                  </button>
                ) : (
                  <div className="w-10 h-10" />
                )}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
