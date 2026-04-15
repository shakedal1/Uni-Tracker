import { BrowserRouter, Routes, Route } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { AuthProvider } from './contexts/AuthContext';
import { AuthGuard } from './components/auth/AuthGuard';
import { LoginPage } from './pages/LoginPage';
import { SemestersPage } from './pages/SemestersPage';
import { CoursesPage } from './pages/CoursesPage';
import { CourseDetailsPage } from './pages/CourseDetailsPage';
import { DashboardPage } from './pages/DashboardPage';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { SettingsPage } from './pages/SettingsPage';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route element={<AuthGuard />}>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="courses" element={<CoursesPage />} />
              <Route path="courses/:id" element={<CourseDetailsPage />} />
              <Route path="semesters" element={<SemestersPage />} />
              <Route path="assignments" element={<AssignmentsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
