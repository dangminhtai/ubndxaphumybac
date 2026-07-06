import { Navigate } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { getMe } from '../api/authApi';
import type { User } from '../types/user';

function readUser() {
  const rawUser = localStorage.getItem('user');
  return rawUser ? (JSON.parse(rawUser) as Partial<User>) : null;
}

export default function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const token = localStorage.getItem('token');
  const user = readUser();
  const [checking, setChecking] = useState(Boolean(token));
  const [valid, setValid] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setChecking(false);
      setValid(false);
      return;
    }

    let alive = true;
    getMe()
      .then((freshUser) => {
        if (!alive) return;
        localStorage.setItem('user', JSON.stringify(freshUser));
        setValid(true);
      })
      .catch(() => {
        if (!alive) return;
        setValid(false);
      })
      .finally(() => {
        if (alive) setChecking(false);
      });

    return () => {
      alive = false;
    };
  }, [token]);

  if (!token || (!checking && !valid)) {
    return <Navigate to="/login" replace />;
  }

  if (checking) {
    return <div className="min-h-screen bg-background p-6 text-on-surface">Đang kiểm tra phiên đăng nhập...</div>;
  }

  if (user?.mustChangePassword && window.location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (roles && (!user?.role || !roles.includes(user.role))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
