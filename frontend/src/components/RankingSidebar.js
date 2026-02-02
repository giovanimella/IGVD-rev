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
        <div className="px-2 pt-4 pb-2">
          <div className="flex items-end justify-center gap-1">
            {/* 2º Lugar */}
            <div className="flex flex-col items-center">
              <div className="text-white/70 text-xs font-semibold mb-1">02</div>
              <div className="w-10 h-10 flex items-center justify-center mb-1">
                <Trophy className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-white text-[10px] font-semibold uppercase tracking-wide">
                {top3[1]?.full_name?.split(' ')[0]}
              </p>
              <p className="text-cyan-200 text-[10px]">{top3[1]?.points}</p>
            </div>

            {/* 1º Lugar */}
            <div className="flex flex-col items-center -mt-4">
              <div className="text-white font-bold text-sm mb-1">01</div>
              <div className="w-12 h-12 flex items-center justify-center mb-1">
                <Trophy className="w-8 h-8 text-amber-400" />
              </div>
              <p className="text-white text-xs font-bold uppercase tracking-wide">
                {top3[0]?.full_name?.split(' ')[0]}
              </p>
              <p className="text-amber-300 text-xs font-semibold">{top3[0]?.points}</p>
            </div>

            {/* 3º Lugar */}
            <div className="flex flex-col items-center">
              <div className="text-white/70 text-xs font-semibold mb-1">03</div>
              <div className="w-10 h-10 flex items-center justify-center mb-1">
                <Trophy className="w-6 h-6 text-amber-600" />
              </div>
              <p className="text-white text-[10px] font-semibold uppercase tracking-wide">
                {top3[2]?.full_name?.split(' ')[0]}
              </p>
              <p className="text-cyan-200 text-[10px]">{top3[2]?.points}</p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Ranking - Estilo da imagem de referência */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2.5" data-testid="ranking-list">
        {leaderboard.map((user, index) => (
          <div 
            key={user.id || index}
            className="relative flex items-center bg-white rounded-full overflow-visible shadow-md hover:shadow-lg transition-all hover:scale-[1.02]"
            style={{ marginLeft: '8px' }}
            data-testid={`ranking-item-${index}`}
          >
            {/* Position Number - Estilo inclinado */}
            <div 
              className={`absolute -left-2 w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-lg z-10 ${
                index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500' :
                index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800' :
                'bg-gradient-to-br from-cyan-400 to-cyan-600'
              }`}
              style={{ transform: 'rotate(-5deg)' }}
            >
              {String(index + 1).padStart(2, '0')}
            </div>

            {/* User Avatar in Diamond Shape */}
            <div className="relative ml-9 -my-1.5 z-0">
              <div 
                className={`w-11 h-11 rotate-45 overflow-hidden border-[3px] shadow-md ${
                  index === 0 ? 'border-amber-400 bg-amber-50' :
                  index === 1 ? 'border-slate-400 bg-slate-50' :
                  index === 2 ? 'border-amber-600 bg-amber-50' :
                  'border-cyan-400 bg-cyan-50'
                }`}
              >
                {user.profile_picture ? (
                  <img 
                    src={`${API_URL}${user.profile_picture}`}
                    alt={user.full_name}
                    className="w-full h-full object-cover -rotate-45 scale-150"
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center -rotate-45 ${
                    index === 0 ? 'bg-gradient-to-br from-amber-100 to-amber-200' :
                    index === 1 ? 'bg-gradient-to-br from-slate-100 to-slate-200' :
                    index === 2 ? 'bg-gradient-to-br from-amber-100 to-orange-200' :
                    'bg-gradient-to-br from-cyan-100 to-blue-200'
                  }`}>
                    <span className="font-bold text-xs text-slate-700">
                      {getInitials(user.full_name)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 pl-3 pr-4 py-3 flex items-center justify-between min-w-0">
              <span className="text-slate-800 font-bold text-sm truncate uppercase tracking-wide">
                {user.full_name?.split(' ')[0]}
              </span>
              <span className={`font-extrabold text-sm ${
                index === 0 ? 'text-amber-500' :
                index === 1 ? 'text-slate-500' :
                index === 2 ? 'text-amber-700' :
                'text-cyan-600'
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
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-white/20 hover:bg-white/30 rounded-full text-white font-medium text-sm transition-colors"
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
