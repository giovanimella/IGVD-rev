import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Award, Bell } from 'lucide-react';

const Topbar = () => {
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-outfit font-semibold text-slate-900">Bem-vindo, {user?.full_name?.split(' ')[0]}</h2>
          <p className="text-sm text-slate-500 capitalize">{user?.role}</p>
        </div>

        <div className="flex items-center gap-4">
          {user?.role === 'franqueado' && (
            <div className="flex items-center gap-3 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
              <Award className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-xs text-amber-600 font-medium">Pontos</p>
                <p className="text-lg font-outfit font-bold text-amber-700" data-testid="user-points">{user?.points || 0}</p>
              </div>
            </div>
          )}

          {user?.role === 'franqueado' && (
            <div className="flex items-center gap-2 bg-cyan-50 px-4 py-2 rounded-lg border border-cyan-200">
              <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white font-outfit font-bold">
                {user?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs text-cyan-600 font-medium">Nível</p>
                <p className="text-sm font-outfit font-semibold text-cyan-700" data-testid="user-level">{user?.level_title}</p>
              </div>
            </div>
          )}

          {user?.role !== 'franqueado' && (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center text-white font-outfit font-bold text-lg">
                {user?.full_name?.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;