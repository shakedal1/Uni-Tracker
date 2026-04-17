export type Semester = {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  num_weeks: number;
  is_active: boolean;
};

export type Course = {
  id: string;
  semester_id: string;
  name: string;
  course_number: string | null;
  color: string;
};

export type TaskType = 'lecture' | 'tutorial' | 'workshop' | 'assignment';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export type Task = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  week_number: number;
  type: TaskType;
  status: TaskStatus;
  release_date?: string | null;
  due_date: string | null;
  is_surprise: boolean;
};

export type FeedbackType = 'bug' | 'suggestion';

export type Feedback = {
  id: string;
  user_id: string;
  user_email: string;
  type: FeedbackType;
  title: string;
  description: string;
  image_urls: string[];
  created_at: string;
};
