import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { devDb } from '../lib/devDb';
import type { Feedback, FeedbackType } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';

const DEV = import.meta.env.VITE_SKIP_AUTH;

export function useFeedback() {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedback = async () => {
    if (DEV) {
      setFeedback(devDb.feedback.getAll());
      setLoading(false);
      return;
    }
    if (!user) { setLoading(false); return; }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedback(data as Feedback[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [user]);

  const submitFeedback = async (
    type: FeedbackType,
    title: string,
    description: string,
    images: File[]
  ): Promise<void> => {
    if (DEV) {
      const item = devDb.feedback.insert({
        user_email: 'dev@dev.com',
        type,
        title,
        description,
        image_urls: [],
      });
      setFeedback(prev => [item, ...prev]);
      return;
    }
    if (!user) return;

    // Upload images
    const image_urls: string[] = [];
    for (const file of images) {
      const path = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from('feedback-images')
        .upload(path, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('feedback-images')
        .getPublicUrl(path);
      image_urls.push(publicUrl);
    }

    const { data, error } = await supabase
      .from('feedback')
      .insert([{
        user_id: user.id,
        user_email: user.email,
        type,
        title,
        description,
        image_urls,
      }])
      .select()
      .single();

    if (error) throw error;
    setFeedback(prev => [data as Feedback, ...prev]);
  };

  const deleteFeedback = async (id: string) => {
    if (DEV) {
      devDb.feedback.delete(id);
      setFeedback(prev => prev.filter(f => f.id !== id));
      return;
    }
    if (!user) return;
    const { error } = await supabase.from('feedback').delete().eq('id', id);
    if (error) throw error;
    setFeedback(prev => prev.filter(f => f.id !== id));
  };

  return { feedback, loading, error, submitFeedback, deleteFeedback, refetch: fetchFeedback };
}
