import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { devDb } from '../lib/devDb';
import type { Course } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';

const DEV = import.meta.env.VITE_SKIP_AUTH;

export function useCourses(semesterId?: string) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = async () => {
    if (DEV) {
      const data = semesterId
        ? devDb.courses.getBySemester(semesterId)
        : devDb.courses.getAll();
      setCourses(data);
      setLoading(false);
      return;
    }
    if (!user) { setLoading(false); return; }
    try {
      setLoading(true);
      let query = supabase.from('courses').select('*').order('name');
      if (semesterId) query = query.eq('semester_id', semesterId);
      const { data, error } = await query;
      if (error) throw error;
      setCourses(data as Course[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [user, semesterId]);

  const createCourse = async (courseData: Omit<Course, 'id'>) => {
    if (DEV) {
      const item = devDb.courses.insert(courseData) as Course;
      setCourses(prev => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)));
      return item;
    }
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('courses')
        .insert([courseData])
        .select()
        .single();

      if (error) throw error;
      setCourses(prev => [...prev, data as Course]);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return { courses, loading, error, createCourse, refetch: fetchCourses };
}
