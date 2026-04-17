import { useState, useRef, useCallback } from 'react';
import emailjs from '@emailjs/browser';
import { useFeedback } from '../hooks/useFeedback';
import type { FeedbackType } from '../lib/types';

const EMAILJS_SERVICE_ID = 'service_9d1vwu8';
const EMAILJS_TEMPLATE_ID = 'template_800zbab';
const EMAILJS_PUBLIC_KEY = 'xPyKaicNrmDFBhw9N';

interface Props {
  onClose: () => void;
}

export function FeedbackModal({ onClose }: Props) {
  const { submitFeedback } = useFeedback();
  const [type, setType] = useState<FeedbackType>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const valid = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!valid.length) return;
    setImages(prev => [...prev, ...valid]);
    valid.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => setPreviews(prev => [...prev, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  }, []);

  const removeImage = (i: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length) addFiles(files);
  }, [addFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    setErr(null);
    try {
      await submitFeedback(type, title.trim(), description.trim(), images);
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          type: type === 'bug' ? '🐛 Bug' : '💡 Suggestion',
          title: title.trim(),
          user_email: 'app user',
          description: description.trim(),
        },
        EMAILJS_PUBLIC_KEY
      );
      setDone(true);
    } catch (error: any) {
      setErr(error.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4 overflow-y-auto"
        style={{ background: '#141420', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '90dvh' }}
        onPaste={handlePaste}
      >
        {done ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
              style={{ background: 'rgba(0,212,170,0.15)' }}>
              ✓
            </div>
            <p className="text-text-primary font-semibold text-lg">תודה על הפידבק!</p>
            <p className="text-text-secondary text-sm">נבדוק אותו בהקדם.</p>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: 'rgba(0,212,170,0.15)', color: '#00D4AA' }}
            >
              סגור
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-text-primary font-semibold text-base">שלח פידבק</h2>
              <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Type toggle */}
            <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
              {(['bug', 'suggestion'] as FeedbackType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
                  style={{
                    background: type === t ? 'rgba(0,212,170,0.15)' : 'transparent',
                    color: type === t ? '#00D4AA' : 'rgba(255,255,255,0.45)',
                  }}
                >
                  {t === 'bug' ? '🐛 באג' : '💡 הצעה'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="כותרת קצרה"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl text-sm text-text-primary placeholder-text-tertiary outline-none transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <textarea
                placeholder="תאר את הבאג או ההצעה בפירוט..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-sm text-text-primary placeholder-text-tertiary outline-none resize-none transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              />

              {/* Image drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl cursor-pointer transition-colors"
                style={{
                  border: '1px dashed rgba(255,255,255,0.12)',
                  padding: previews.length ? '10px' : '20px 10px',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                {previews.length > 0 ? (
                  <div className="flex flex-wrap gap-2 w-full" onClick={e => e.stopPropagation()}>
                    {previews.map((src, i) => (
                      <div key={i} className="relative group">
                        <img src={src} alt="" className="w-16 h-16 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: '#ef4444', color: '#fff' }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <div
                      onClick={() => fileRef.current?.click()}
                      className="w-16 h-16 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                      style={{ border: '1px dashed rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.3)' }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </div>
                  </div>
                ) : (
                  <>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round">
                      <rect x="3" y="3" width="18" height="18" rx="3"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      גרור תמונה, הדבק (Ctrl+V) או לחץ להוספה
                    </span>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && addFiles(e.target.files)} />

              {err && <p className="text-xs" style={{ color: '#ef4444' }}>{err}</p>}

              <button
                type="submit"
                disabled={submitting || !title.trim() || !description.trim()}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#00D4AA', color: '#0D0D14' }}
              >
                {submitting ? 'שולח...' : 'שלח'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
