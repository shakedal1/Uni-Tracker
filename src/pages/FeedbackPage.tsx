import { useState } from 'react';
import { useFeedback } from '../hooks/useFeedback';
import type { Feedback } from '../lib/types';

function formatForClaude(items: Feedback[]): string {
  if (!items.length) return 'No feedback submissions yet.';
  return items.map(f => {
    const date = new Date(f.created_at).toLocaleString();
    const images = f.image_urls.length
      ? `\n**Screenshots:** ${f.image_urls.join(', ')}`
      : '';
    return `### [${f.type === 'bug' ? 'Bug' : 'Suggestion'}] ${f.title}
**From:** ${f.user_email}
**Date:** ${date}

${f.description}${images}`;
  }).join('\n\n---\n\n');
}

function FeedbackCard({ item, onDelete }: { item: Feedback; onDelete: (id: string) => void }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyOne = () => {
    navigator.clipboard.writeText(formatForClaude([item]));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div
        className="rounded-2xl p-5 flex flex-col gap-3"
        style={{ background: '#141420', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{
                background: item.type === 'bug' ? 'rgba(239,68,68,0.15)' : 'rgba(0,212,170,0.15)',
                color: item.type === 'bug' ? '#f87171' : '#00D4AA',
              }}
            >
              {item.type === 'bug' ? '🐛 באג' : '💡 הצעה'}
            </span>
            <span className="text-text-primary font-semibold text-sm">{item.title}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={copyOne}
              title="Copy for Claude"
              className="text-xs px-2.5 py-1.5 rounded-lg transition-all cursor-pointer font-medium"
              style={{
                background: copied ? 'rgba(0,212,170,0.2)' : 'rgba(255,255,255,0.06)',
                color: copied ? '#00D4AA' : 'rgba(255,255,255,0.5)',
              }}
            >
              {copied ? '✓ Copied' : 'Copy for Claude'}
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="text-text-tertiary hover:text-red-400 transition-colors cursor-pointer"
              title="Delete"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        </div>

        <p className="text-text-secondary text-sm whitespace-pre-wrap leading-relaxed">{item.description}</p>

        {item.image_urls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {item.image_urls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`screenshot ${i + 1}`}
                onClick={() => setLightbox(url)}
                className="w-20 h-20 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>{item.user_email}</span>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {new Date(item.created_at).toLocaleString()}
          </span>
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="screenshot" className="max-w-full max-h-full rounded-2xl" />
        </div>
      )}
    </>
  );
}

export function FeedbackPage() {
  const { feedback, loading, deleteFeedback } = useFeedback();
  const [filter, setFilter] = useState<'all' | 'bug' | 'suggestion'>('all');
  const [copiedAll, setCopiedAll] = useState(false);

  const filtered = filter === 'all' ? feedback : feedback.filter(f => f.type === filter);

  const copyAll = () => {
    navigator.clipboard.writeText(
      `# Feedback Inbox — ${new Date().toLocaleDateString()}\n\n` + formatForClaude(filtered)
    );
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-text-primary font-bold text-xl">פידבק מהמשתמשים</h1>
          <p className="text-text-tertiary text-sm mt-0.5">{feedback.length} פניות סה"כ</p>
        </div>
        <button
          onClick={copyAll}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: copiedAll ? 'rgba(0,212,170,0.2)' : 'rgba(0,212,170,0.12)',
            color: copiedAll ? '#00D4AA' : '#00D4AA',
            border: '1px solid rgba(0,212,170,0.2)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
          </svg>
          {copiedAll ? 'Copied!' : 'Copy all for Claude'}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {(['all', 'bug', 'suggestion'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer"
            style={{
              background: filter === f ? 'rgba(0,212,170,0.15)' : 'transparent',
              color: filter === f ? '#00D4AA' : 'rgba(255,255,255,0.45)',
            }}
          >
            {f === 'all' ? 'הכל' : f === 'bug' ? '🐛 באגים' : '💡 הצעות'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 animate-spin"
            style={{ borderColor: 'rgba(0,212,170,0.2)', borderTopColor: '#00D4AA' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="text-4xl">📭</span>
          <p className="text-text-secondary text-sm">אין פניות עדיין</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(item => (
            <FeedbackCard key={item.id} item={item} onDelete={deleteFeedback} />
          ))}
        </div>
      )}
    </div>
  );
}
