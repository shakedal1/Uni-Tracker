// localStorage-backed mock database for VITE_SKIP_AUTH dev mode

const DEV_USER_ID = 'dev-user-00000000-0000-0000-0000-000000000000';

function getCol<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
}
function setCol<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export const devDb = {
  userId: DEV_USER_ID,

  semesters: {
    getAll: () => getCol<any>('dev_semesters'),
    insert(data: any) {
      const item = { ...data, id: crypto.randomUUID(), user_id: DEV_USER_ID };
      const all = getCol<any>('dev_semesters');
      all.unshift(item);
      setCol('dev_semesters', all);
      return item;
    },
    update(id: string, patch: any) {
      const all = getCol<any>('dev_semesters');
      const idx = all.findIndex((s: any) => s.id === id);
      if (idx !== -1) all[idx] = { ...all[idx], ...patch };
      setCol('dev_semesters', all);
      return all[idx];
    },
    updateAll(patch: any) {
      const all = getCol<any>('dev_semesters').map((s: any) => ({ ...s, ...patch }));
      setCol('dev_semesters', all);
    },
    delete(id: string) {
      setCol('dev_semesters', getCol<any>('dev_semesters').filter((s: any) => s.id !== id));
    },
  },

  courses: {
    getAll: () => getCol<any>('dev_courses').sort((a: any, b: any) => a.name.localeCompare(b.name)),
    getBySemester: (semesterId: string) =>
      getCol<any>('dev_courses')
        .filter((c: any) => c.semester_id === semesterId)
        .sort((a: any, b: any) => a.name.localeCompare(b.name)),
    insert(data: any) {
      const item = { ...data, id: crypto.randomUUID() };
      const all = getCol<any>('dev_courses');
      all.push(item);
      setCol('dev_courses', all);
      return item;
    },
    delete(id: string) {
      setCol('dev_courses', getCol<any>('dev_courses').filter((c: any) => c.id !== id));
    },
  },

  feedback: {
    getAll: () => getCol<any>('dev_feedback').sort((a: any, b: any) => b.created_at.localeCompare(a.created_at)),
    insert(data: any) {
      const item = { ...data, id: crypto.randomUUID(), user_id: DEV_USER_ID, created_at: new Date().toISOString() };
      const all = getCol<any>('dev_feedback');
      all.unshift(item);
      setCol('dev_feedback', all);
      return item;
    },
    delete(id: string) {
      setCol('dev_feedback', getCol<any>('dev_feedback').filter((f: any) => f.id !== id));
    },
  },

  tasks: {
    getByCourse: (courseId: string) =>
      getCol<any>('dev_tasks')
        .filter((t: any) => t.course_id === courseId)
        .sort((a: any, b: any) => a.week_number - b.week_number || a.id.localeCompare(b.id)),
    getBySemester(semesterId: string) {
      const courses = getCol<any>('dev_courses').filter((c: any) => c.semester_id === semesterId);
      const courseMap = Object.fromEntries(courses.map((c: any) => [c.id, c]));
      const courseIds = new Set(courses.map((c: any) => c.id));
      return getCol<any>('dev_tasks')
        .filter((t: any) => courseIds.has(t.course_id))
        .map((t: any) => ({ ...t, course: courseMap[t.course_id] }))
        .sort((a: any, b: any) => a.week_number - b.week_number || a.id.localeCompare(b.id));
    },
    insert(data: any) {
      const item = { ...data, id: crypto.randomUUID() };
      const all = getCol<any>('dev_tasks');
      all.push(item);
      setCol('dev_tasks', all);
      return item;
    },
    update(id: string, patch: any) {
      const all = getCol<any>('dev_tasks');
      const idx = all.findIndex((t: any) => t.id === id);
      if (idx !== -1) all[idx] = { ...all[idx], ...patch };
      setCol('dev_tasks', all);
    },
    delete(id: string) {
      setCol('dev_tasks', getCol<any>('dev_tasks').filter((t: any) => t.id !== id));
    },
  },
};
