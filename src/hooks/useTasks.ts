import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { devDb } from '../lib/devDb';
import type { Task, TaskStatus } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';

const TYPE_ORDER: Record<string, number> = { lecture: 0, tutorial: 1, workshop: 2, assignment: 3 };
const sortTasks = (a: Task, b: Task) =>
  a.week_number - b.week_number ||
  (TYPE_ORDER[a.type] ?? 99) - (TYPE_ORDER[b.type] ?? 99) ||
  a.id.localeCompare(b.id);

const DEV = import.meta.env.VITE_SKIP_AUTH;

export function useTasks(courseId?: string) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (DEV) {
      if (!courseId) { setLoading(false); return; }
      setTasks(devDb.tasks.getByCourse(courseId));
      setLoading(false);
      return;
    }
    if (!user || !courseId) { setLoading(false); return; }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('course_id', courseId)
        .order('week_number', { ascending: true })
        .order('id', { ascending: true });

      if (error) throw error;
      setTasks((data as Task[]).sort(sortTasks));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, courseId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createMultipleTasks = async (tasksData: Omit<Task, 'id'>[]) => {
    if (DEV) {
      if (!courseId && tasksData.some(t => !t.course_id)) return;
      const items = tasksData.map(data => devDb.tasks.insert(data) as Task);
      setTasks(prev => [...prev, ...items]);
      return items;
    }
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert(tasksData)
        .select();

      if (error) throw error;
      setTasks(prev => [...prev, ...(data as Task[])]);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const createTask = async (taskData: Omit<Task, 'id' | 'course_id'>) => {
    if (DEV) {
      if (!courseId) return;
      const item = devDb.tasks.insert({ ...taskData, course_id: courseId }) as Task;
      setTasks(prev => [...prev, item]);
      return item;
    }
    if (!user || !courseId) return;
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{ ...taskData, course_id: courseId }])
        .select()
        .single();

      if (error) throw error;
      setTasks(prev => [...prev, data as Task]);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateTaskStatus = async (id: string, status: TaskStatus) => {
    if (DEV) {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
      devDb.tasks.update(id, { status });
      return;
    }
    if (!user) return;
    try {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
      const { error } = await supabase.from('tasks').update({ status }).eq('id', id);
      if (error) { fetchTasks(); throw error; }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateTask = async (id: string, updates: Partial<Omit<Task, 'id' | 'course_id'>>) => {
    if (DEV) {
      devDb.tasks.update(id, updates);
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      return;
    }
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setTasks(prev => prev.map(t => t.id === id ? (data as Task) : t));
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deleteTask = async (id: string) => {
    if (DEV) {
      setTasks(prev => prev.filter(t => t.id !== id));
      devDb.tasks.delete(id);
      return;
    }
    if (!user) return;
    try {
      setTasks(prev => prev.filter(t => t.id !== id));
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) { fetchTasks(); throw error; }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return { tasks, loading, error, createTask, createMultipleTasks, updateTaskStatus, updateTask, deleteTask, refetch: fetchTasks };
}
