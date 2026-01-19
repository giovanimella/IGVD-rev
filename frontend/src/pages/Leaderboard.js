import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { Trophy, Award, TrendingUp } from 'lucide-react';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/stats/leaderboard`);
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Erro ao buscar ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-500" />
            Ranking de Licenciados
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Veja os licenciados com melhor desempenho</p>
        </div>

        <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-100 dark:border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="leaderboard-table">
              <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Posição</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Licenciado</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Nível</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Pontos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {leaderboard.map((user, index) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors" data-testid={`leaderboard-row-${index}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {index === 0 && <span className="text-2xl">🥇</span>}
                        {index === 1 && <span className="text-2xl">🥈</span>}
                        {index === 2 && <span className="text-2xl">🥉</span>}
                        {index > 2 && <span className="text-slate-600 dark:text-slate-400 font-medium">#{index + 1}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-500/20 rounded-full flex items-center justify-center">
                          <span className="text-cyan-600 dark:text-cyan-400 font-semibold text-sm">{user.full_name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{user.full_name}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 text-sm font-medium">
                        <Award className="w-4 h-4" />
                        {user.level_title}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {user.points}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Leaderboard;