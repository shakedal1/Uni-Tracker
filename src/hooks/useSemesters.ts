import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { devDb } from '../lib/devDb';
import type { Semester } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';

const DEV = import.meta.env.VITE_SKIP_AUTH;

export function useSemesters() {
  const { user } = useAuth();
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSemesters = async () => {
    if (DEV) {
      setSemesters(devDb.semesters.getAll());
      setLoading(false);
      return;
    }
    if (!user) { setLoading(false); return; }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('semesters')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setSemesters(data as Semester[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSemesters();
  }, [user]);

  const createSemester = async (semesterData: Omit<Semester, 'id' | 'user_id'>) => {
    if (DEV) {
      const item = devDb.semesters.insert(semesterData) as Semester;
      setSemesters(prev => [item, ...prev]);
      return item;
    }
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('semesters')
        .insert([{ ...semesterData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      setSemesters(prev => [data as Semester, ...prev]);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const setActiveSemester = async (id: string) => {
    if (DEV) {
      devDb.semesters.updateAll({ is_active: false });
      devDb.semesters.update(id, { is_active: true });
      setSemesters(devDb.semesters.getAll());
      return;
    }
    if (!user) return;
    try {
      await supabase.from('semesters').update({ is_active: false }).eq('user_id', user.id);
      const { data, error } = await supabase.from('semesters').update({ is_active: true }).eq('id', id).select().single();

      if (error) throw error;
      await fetchSemesters();
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deleteSemester = async (id: string) => {
    if (DEV) {
      devDb.semesters.delete(id);
      setSemesters(devDb.semesters.getAll());
      return;
    }
    if (!user) return;
    try {
      const { error } = await supabase.from('semesters').delete().eq('id', id);
      if (error) throw error;
      setSemesters(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateSemester = async (id: string, patch: Partial<Omit<Semester, 'id' | 'user_id'>>) => {
    if (DEV) {
      devDb.semesters.update(id, patch);
      setSemesters(devDb.semesters.getAll());
      return;
    }
    if (!user) return;
    try {
      const { data, error } = await supabase.from('semesters').update(patch).eq('id', id).select().single();
      if (error) throw error;
      setSemesters(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return { semesters, activeSemester: semesters.find(s => s.is_active), loading, error, createSemester, setActiveSemester, updateSemester, deleteSemester, refetch: fetchSemesters };
}
