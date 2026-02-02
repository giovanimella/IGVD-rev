import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ChevronRight, Medal } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const RankingSidebar = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/stats/leaderboard`);
      setLeaderboard(response.data.slice(0, 10)); // Top 10
    } catch (error) {
      console.error('Erro ao buscar ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const getPositionColor = (index) => {
    switch(index) {
      case 0: return 'from-amber-400 to-amber-600'; // Ouro
      case 1: return 'from-slate-300 to-slate-500'; // Prata
      case 2: return 'from-amber-600 to-amber-800'; // Bronze
      default: return 'from-cyan-400 to-cyan-600';
    }
  };

  const getPositionBg = (index) => {
    switch(index) {
      case 0: return 'bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-500/30 dark:to-amber-600/20 border-amber-300 dark:border-amber-500/50';
      case 1: return 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-500/30 dark:to-slate-600/20 border-slate-300 dark:border-slate-500/50';
      case 2: return 'bg-gradient-to-br from-amber-100 to-orange-200 dark:from-amber-600/30 dark:to-orange-600/20 border-amber-400 dark:border-amber-600/50';
      default: return 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10';
    }
  };

  if (loading) {
    return (
      <aside className="hidden xl:flex xl:flex-col xl:w-72 bg-gradient-to-b from-cyan-500 to-blue-600 dark:from-cyan-600 dark:to-blue-700 h-screen sticky top-0 overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </aside>
    );
  }

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <aside className="hidden xl:flex xl:flex-col xl:w-72 bg-gradient-to-b from-cyan-500 to-blue-600 dark:from-cyan-600 dark:to-blue-700 h-screen sticky top-0 overflow-hidden" data-testid="ranking-sidebar">
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-white/20">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-300" />
          <h2 className="text-lg font-outfit font-bold text-white">Ranking</h2>
        </div>
        <Link 
          to="/leaderboard" 
          className="text-xs text-white/80 hover:text-white flex items-center gap-1 transition-colors"
          data-testid="ranking-see-all"
        >
          Ver todos <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Podium - Top 3 */}
      {top3.length >= 3 && (
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-end justify-center gap-2 h-32">
            {/* 2º Lugar */}
            <div className="flex flex-col items-center">
              <div className="relative mb-1">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 p-0.5">
                  {top3[1]?.profile_picture ? (
                    <img 
                      src={`${API_URL}${top3[1].profile_picture}`}
                      alt={top3[1].full_name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 flex items-center justify-center">
                      <span className="text-slate-600 dark:text-slate-300 font-bold text-sm">
                        {getInitials(top3[1]?.full_name)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-400 flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                  2
                </div>
              </div>
              <div className="bg-slate-400/30 rounded-t-lg w-16 h-16 flex flex-col items-center justify-center">
                <span className="text-white text-[10px] font-medium text-center truncate max-w-full px-1">
                  {top3[1]?.full_name?.split(' ')[0]}
                </span>
                <span className="text-amber-300 text-xs font-bold">{top3[1]?.points}</span>
              </div>
            </div>

            {/* 1º Lugar */}
            <div className="flex flex-col items-center -mt-4">
              <div className="relative mb-1">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-0.5">
                  {top3[0]?.profile_picture ? (
                    <img 
                      src={`${API_URL}${top3[0].profile_picture}`}
                      alt={top3[0].full_name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 flex items-center justify-center">
                      <span className="text-amber-600 dark:text-amber-400 font-bold">
                        {getInitials(top3[0]?.full_name)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                  1
                </div>
              </div>
              <div className="bg-amber-500/30 rounded-t-lg w-18 h-20 flex flex-col items-center justify-center" style={{width: '72px'}}>
                <span className="text-white text-[10px] font-medium text-center truncate max-w-full px-1">
                  {top3[0]?.full_name?.split(' ')[0]}
                </span>
                <span className="text-amber-300 text-sm font-bold">{top3[0]?.points}</span>
              </div>
            </div>

            {/* 3º Lugar */}
            <div className="flex flex-col items-center">
              <div className="relative mb-1">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 p-0.5">
                  {top3[2]?.profile_picture ? (
                    <img 
                      src={`${API_URL}${top3[2].profile_picture}`}
                      alt={top3[2].full_name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 flex items-center justify-center">
                      <span className="text-amber-700 dark:text-amber-500 font-bold text-sm">
                        {getInitials(top3[2]?.full_name)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-700 flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                  3
                </div>
              </div>
              <div className="bg-amber-700/30 rounded-t-lg w-16 h-12 flex flex-col items-center justify-center">
                <span className="text-white text-[10px] font-medium text-center truncate max-w-full px-1">
                  {top3[2]?.full_name?.split(' ')[0]}
                </span>
                <span className="text-amber-300 text-xs font-bold">{top3[2]?.points}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Ranking */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2" data-testid="ranking-list">
        {leaderboard.map((user, index) => (
          <div 
            key={user.id || index}
            className={`relative flex items-center rounded-full overflow-hidden transition-all hover:scale-[1.02] ${
              index < 3 ? 'bg-white/20' : 'bg-white/10'
            }`}
            data-testid={`ranking-item-${index}`}
          >
            {/* Position Badge */}
            <div 
              className={`w-10 h-10 flex items-center justify-center text-white font-bold text-sm ${
                index === 0 ? 'bg-amber-500' :
                index === 1 ? 'bg-slate-400' :
                index === 2 ? 'bg-amber-700' :
                'bg-cyan-600/50'
              }`}
              style={{
                clipPath: 'polygon(0 0, 100% 0, 70% 100%, 0% 100%)',
                paddingRight: '8px'
              }}
            >
              {String(index + 1).padStart(2, '0')}
            </div>

            {/* User Avatar in Diamond Shape */}
            <div className="relative -ml-1 w-10 h-10 flex items-center justify-center">
              <div 
                className={`w-9 h-9 rotate-45 overflow-hidden border-2 ${
                  index === 0 ? 'border-amber-400 bg-amber-100' :
                  index === 1 ? 'border-slate-400 bg-slate-100' :
                  index === 2 ? 'border-amber-600 bg-amber-100' :
                  'border-white/50 bg-white/20'
                }`}
              >
                {user.profile_picture ? (
                  <img 
                    src={`${API_URL}${user.profile_picture}`}
                    alt={user.full_name}
                    className="w-full h-full object-cover -rotate-45 scale-150"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center -rotate-45">
                    <span className={`font-semibold text-xs ${
                      index < 3 ? 'text-slate-700' : 'text-white'
                    }`}>
                      {getInitials(user.full_name)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 pl-2 pr-4 py-2 flex items-center justify-between min-w-0">
              <span className="text-white font-medium text-sm truncate">
                {user.full_name?.split(' ')[0]}
              </span>
              <span className={`font-bold text-sm ${
                index === 0 ? 'text-amber-300' :
                index === 1 ? 'text-slate-200' :
                index === 2 ? 'text-amber-400' :
                'text-cyan-200'
              }`}>
                {user.points}
              </span>
            </div>
          </div>
        ))}

        {leaderboard.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-white/70">
            <Trophy className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">Nenhum ranking disponível</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/20">
        <Link 
          to="/leaderboard" 
          className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-white/20 hover:bg-white/30 rounded-lg text-white font-medium text-sm transition-colors"
          data-testid="ranking-full-button"
        >
          <Medal className="w-4 h-4" />
          Ver Ranking Completo
        </Link>
      </div>
    </aside>
  );
};

export default RankingSidebar;
