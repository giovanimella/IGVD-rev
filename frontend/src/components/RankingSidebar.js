import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ChevronRight, Medal, ChevronLeft, Award, Star } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const RankingSidebar = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rankingType, setRankingType] = useState(() => {
    // Recuperar tipo de ranking do localStorage
    const saved = localStorage.getItem('rankingType');
    return saved || 'frequency'; // 'frequency' (PRINCIPAL), 'assessments' (médias) ou 'points' (pontos)
  });
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Recuperar estado do localStorage
    const saved = localStorage.getItem('rankingSidebarCollapsed');
    return saved === 'true';
  });

  useEffect(() => {
    fetchLeaderboard();
  }, [rankingType]);

  useEffect(() => {
    // Salvar estado no localStorage
    localStorage.setItem('rankingSidebarCollapsed', isCollapsed);
  }, [isCollapsed]);

  useEffect(() => {
    // Salvar tipo de ranking no localStorage
    localStorage.setItem('rankingType', rankingType);
  }, [rankingType]);

  const fetchLeaderboard = async () => {
    try {
      const endpoint = rankingType === 'frequency' 
        ? `${API_URL}/api/stats/leaderboard/frequency`
        : rankingType === 'assessments'
        ? `${API_URL}/api/stats/leaderboard/assessments`
        : `${API_URL}/api/stats/leaderboard`;
      
      const response = await axios.get(endpoint);
      setLeaderboard(response.data.slice(0, 10)); // Top 10
    } catch (error) {
      console.error('Erro ao buscar ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleRankingType = () => {
    setRankingType(prevType => prevType === 'assessments' ? 'points' : 'assessments');
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
      <aside 
        className={`hidden xl:flex xl:flex-col h-screen sticky top-0 overflow-hidden transition-all duration-300 ease-in-out ${
          isCollapsed ? 'xl:w-12' : 'xl:w-72'
        }`} 
        style={{ background: 'linear-gradient(to bottom, #3a919b, #1b4c51)' }}
      >
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </aside>
    );
  }

  const top3 = leaderboard.slice(0, 3);

  // Versão recolhida - apenas botão de expandir
  if (isCollapsed) {
    return (
      <aside 
        className="hidden xl:flex xl:flex-col xl:w-12 h-screen sticky top-0 overflow-hidden transition-all duration-300 ease-in-out" 
        style={{ background: 'linear-gradient(to bottom, #3a919b, #1b4c51)' }}
        data-testid="ranking-sidebar-collapsed"
      >
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-full h-14 text-white hover:bg-white/10 transition-colors"
          title="Expandir Ranking"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        {/* Ícone de troféu vertical */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-300" />
            <div className="text-white text-xs font-bold transform -rotate-90 whitespace-nowrap origin-center mt-8">
              RANKING
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside 
      className="hidden xl:flex xl:flex-col xl:w-72 h-screen sticky top-0 overflow-hidden transition-all duration-300 ease-in-out" 
      style={{ background: 'linear-gradient(to bottom, #3a919b, #1b4c51)' }} 
      data-testid="ranking-sidebar"
    >
      {/* Header com botão de recolher */}
      <div className="px-4 py-3 border-b border-white/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-300" />
            <h2 className="text-lg font-outfit font-bold text-white">Ranking</h2>
          </div>
          <div className="flex items-center gap-2">
            <Link 
              to="/leaderboard" 
              className="text-xs text-white/80 hover:text-white flex items-center gap-1 transition-colors"
              data-testid="ranking-see-all"
            >
              Ver todos <ChevronRight className="w-4 h-4" />
            </Link>
            <button
              onClick={toggleSidebar}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded transition-colors"
              title="Recolher Ranking"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Botões de alternância de tipo de ranking */}
        <div className="flex gap-1 bg-white/10 rounded-lg p-1">
          <button
            onClick={() => setRankingType('assessments')}
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              rankingType === 'assessments'
                ? 'bg-white text-cyan-700 shadow-md'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            Médias
          </button>
          <button
            onClick={() => setRankingType('points')}
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              rankingType === 'points'
                ? 'bg-white text-cyan-700 shadow-md'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Pontos
          </button>
        </div>
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
              <p className="text-cyan-200 text-[10px]">
                {rankingType === 'assessments' 
                  ? `${top3[1]?.average_score || 0}%` 
                  : top3[1]?.points || 0}
              </p>
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
              <p className="text-amber-300 text-xs font-semibold">
                {rankingType === 'assessments' 
                  ? `${top3[0]?.average_score || 0}%` 
                  : top3[0]?.points || 0}
              </p>
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
              <p className="text-cyan-200 text-[10px]">
                {rankingType === 'assessments' 
                  ? `${top3[2]?.average_score || 0}%` 
                  : top3[2]?.points || 0}
              </p>
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
              <div className="flex flex-col min-w-0">
                <span className="text-slate-800 font-bold text-sm truncate uppercase tracking-wide">
                  {user.full_name?.split(' ')[0]}
                </span>
                {rankingType === 'assessments' && user.total_assessments > 0 && (
                  <span className="text-[10px] text-slate-500">
                    {user.total_assessments} aval.
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end">
                <span className={`font-extrabold text-sm ${
                  index === 0 ? 'text-amber-500' :
                  index === 1 ? 'text-slate-500' :
                  index === 2 ? 'text-amber-700' :
                  'text-cyan-600'
                }`}>
                  {rankingType === 'assessments' 
                    ? `${user.average_score || 0}%` 
                    : user.points || 0}
                </span>
                {rankingType === 'assessments' && (
                  <span className="text-[9px] text-slate-400">
                    média
                  </span>
                )}
              </div>
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
