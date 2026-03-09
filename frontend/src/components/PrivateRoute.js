import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SubscriptionGuard from './SubscriptionGuard';

export const PrivateRoute = ({ children, roles = [], skipSubscriptionCheck = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0a2a2f]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Rotas que não precisam de verificação de assinatura
  const noSubscriptionCheckPaths = ['/profile', '/onboarding/payment', '/subscription'];
  const isExemptPath = noSubscriptionCheckPaths.some(path => location.pathname.startsWith(path));

  // Se é licenciado e não está em rota exempta, verificar assinatura
  if (user.role === 'licenciado' && !skipSubscriptionCheck && !isExemptPath) {
    return (
      <SubscriptionGuard>
        {children}
      </SubscriptionGuard>
    );
  }

  return children;
};