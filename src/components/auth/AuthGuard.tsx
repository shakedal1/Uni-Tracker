import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';

export function AuthGuard() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading && !import.meta.env.VITE_SKIP_AUTH) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="w-10 h-10 border-4 border-bg-tertiary border-t-accent-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user && !import.meta.env.VITE_SKIP_AUTH) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
