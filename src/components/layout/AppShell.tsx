import { NavLink, Outlet, useNavigate, useLocation } from 'react-router';
import { useState } from 'react';
import { FeedbackModal } from '../FeedbackModal';
import { useAuth } from '../../contexts/AuthContext';
import { CHANGELOG } from '../../data/changelog';

// ── Icons ─────────────────────────────────────────────────────────
function IconDashboard({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="10" y="10" width="44" height="38" rx="8"/>
      <rect x="74" y="10" width="44" height="72" rx="8"/>
      <rect x="10" y="62" width="44" height="56" rx="8"/>
      <rect x="74" y="96" width="44" height="22" rx="8"/>
    </svg>
  );
}

function IconBook({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {/* Left page */}
      <path d="M12 6 C10 4.5 6.5 3.5 2.5 4 L2 4.5 L2 20.5 C6 20 10 19.5 12 21.5 Z"/>
      {/* Right page */}
      <path d="M12 6 C14 4.5 17.5 3.5 21.5 4 L22 4.5 L22 20.5 C18 20 14 19.5 12 21.5 Z"/>
    </svg>
  );
}

function IconCalendar({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="12" y="22" width="104" height="94" rx="10"/>
      <line x1="12" y1="50" x2="116" y2="50"/>
      <line x1="40" y1="12" x2="40" y2="34"/>
      <line x1="88" y1="12" x2="88" y2="34"/>
      <circle cx="38" cy="70" r="5" fill="currentColor" stroke="none"/>
      <circle cx="64" cy="70" r="5" fill="currentColor" stroke="none"/>
      <circle cx="90" cy="70" r="5" fill="currentColor" stroke="none"/>
      <circle cx="38" cy="94" r="5" fill="currentColor" stroke="none"/>
      <circle cx="64" cy="94" r="5" fill="currentColor" stroke="none"/>
      <circle cx="90" cy="94" r="5" fill="currentColor" stroke="none"/>
    </svg>
  );
}

function IconClipboard({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="18" y="22" width="92" height="98" rx="10"/>
      <rect x="44" y="12" width="40" height="22" rx="6"/>
      <polyline points="36,62 44,72 56,54"/>
      <line x1="66" y1="62" x2="90" y2="62"/>
      <polyline points="36,84 44,94 56,76"/>
      <line x1="66" y1="84" x2="90" y2="84"/>
      <polyline points="36,106 44,116 56,98"/>
      <line x1="66" y1="106" x2="90" y2="106"/>
    </svg>
  );
}

function IconFeedback({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function IconInfo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="8" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="12" y1="11" x2="12" y2="17"/>
    </svg>
  );
}

function IconSettings({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
      <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

const NAV_ITEMS = [
  { to: '/',            label: 'דשבורד',  Icon: IconDashboard },
  { to: '/courses',     label: 'קורסים',  Icon: IconBook      },
  { to: '/semesters',   label: 'סמסטרים', Icon: IconCalendar  },
  { to: '/assignments', label: 'מטלות',   Icon: IconClipboard },
];

function WhatsNewModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-6 flex flex-col gap-5 max-h-[80vh] overflow-y-auto"
        style={{ background: '#1a1a27', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary">מה חדש? ✨</h2>
            <p className="text-xs text-text-tertiary mt-0.5">היסטוריית גרסאות</p>
          </div>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-white/5 cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Versions */}
        <div className="flex flex-col gap-4">
          {CHANGELOG.map((entry) => (
            <div
              key={entry.version}
              className="flex flex-col gap-2 p-4 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-tertiary">{entry.date}</span>
                <span
                  className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(0,212,170,0.12)', color: '#00D4AA' }}
                >
                  v{entry.version}
                </span>
              </div>
              <ul className="flex flex-col gap-1.5 text-right">
                {entry.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 justify-end">
                    <span className="text-xs text-text-secondary leading-relaxed">{f}</span>
                    <span className="text-accent-primary mt-1 shrink-0 text-xs">•</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AppShell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showFeedback, setShowFeedback] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const onSettings = location.pathname === '/settings';
  const handleGear = () => onSettings ? navigate(-1) : navigate('/settings');

  const displayName: string =
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.email?.split('@')[0] ||
    'משתמש';
  const initial = displayName[0]?.toUpperCase() ?? 'מ';

  return (
    <div className="flex min-h-screen bg-bg-primary w-full overflow-x-hidden">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-56 flex-col bg-bg-sidebar border-l border-border-light p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-2.5 mb-8 px-2">
          <div className="w-2 h-2 bg-accent-primary rounded-full shrink-0"/>
          <span className="font-display text-base font-bold text-text-primary tracking-tight">Uni Tracker</span>
        </div>

        <nav className="flex flex-col gap-0.5 flex-1">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                'flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ' +
                (isActive
                  ? 'bg-accent-primary-light text-accent-primary font-semibold'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary')
              }>
              {() => (
                <>
                  <Icon size={17}/>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar user + settings */}
        <div className="pt-4 border-t border-border-light flex items-center justify-between px-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-accent-primary-light flex items-center justify-center text-accent-primary font-bold text-xs shrink-0">
              {initial}
            </div>
            <span className="text-xs text-text-secondary truncate">{displayName}</span>
          </div>
          <button
            onClick={handleGear}
            className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer shrink-0"
          >
            <IconSettings size={16}/>
          </button>
        </div>
      </aside>

      {/* ── Right column: top bar + content ── */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 w-full">

        {/* ── Top Bar ── */}
        <header
          className="sticky top-0 z-40 flex items-center justify-between px-5 md:px-8"
          style={{
            height: 60,
            background: 'rgba(13,13,20,0.88)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Left: avatar + name */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ background: 'rgba(0,212,170,0.15)', color: '#00D4AA' }}
            >
              {initial}
            </div>
            <span className="text-sm font-medium text-text-secondary">{displayName}</span>
          </div>

          {/* Right: whats-new + feedback + settings */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowWhatsNew(true)}
              className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-white/5"
              title="מה חדש?"
            >
              <IconInfo size={18}/>
            </button>
            <button
              onClick={() => setShowFeedback(true)}
              className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-white/5"
              title="דווח על באג / הצעה"
            >
              <IconFeedback size={18}/>
            </button>
            <button
              onClick={handleGear}
              className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-white/5"
            >
              <IconSettings size={20}/>
            </button>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 p-5 md:p-8 max-w-2xl w-full mx-auto mb-24 md:mb-0">
          <Outlet/>
        </main>
      </div>

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
      {showWhatsNew && <WhatsNewModal onClose={() => setShowWhatsNew(false)} />}

      {/* ── Mobile Bottom Nav ── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 flex justify-around items-center px-3 pt-2 pb-5"
        style={{
          background: '#0D0D14',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className="flex-1 flex justify-center"
          >
            {({ isActive }) => (
              <div
                className="flex flex-col items-center gap-1 transition-all duration-200"
                style={{
                  padding: '10px 16px',
                  borderRadius: 14,
                  background: isActive ? '#1C1C28' : 'transparent',
                  color: isActive ? '#00D4AA' : 'rgba(255,255,255,0.38)',
                }}
              >
                <Icon size={22}/>
                <span style={{
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#00D4AA' : 'rgba(255,255,255,0.38)',
                  letterSpacing: 0.1,
                }}>
                  {label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
        {/* Bottom accent line */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '15%',
          right: '15%',
          height: 2,
          background: 'linear-gradient(90deg, transparent, #00D4AA 40%, #00D4AA 60%, transparent)',
          borderRadius: 2,
        }} />
      </nav>
    </div>
  );
}
