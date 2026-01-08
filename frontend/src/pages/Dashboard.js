import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import StageProgressBar from '../components/StageProgressBar';
import axios from 'axios';
import { BookOpen, Users, Award, Clock, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [stageInfo, setStageInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchDashboardStats();
    if (user?.role === 'licenciado') {
      fetchStageInfo();
    }
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/stats/dashboard`);
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStageInfo = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/onboarding/my-stage`);
      setStageInfo(response.data);
    } catch (error) {
      console.error('Erro ao buscar estágio:', error);
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

  if (user?.role === 'admin') {
    // Dados mockados para gráficos (em produção, vir da API)
    const progressData = [
      { month: 'Jan', licenciados: 10, modulos: 15 },
      { month: 'Fev', licenciados: 15, modulos: 20 },
      { month: 'Mar', licenciados: 25, modulos: 30 },
      { month: 'Abr', licenciados: 30, modulos: 35 },
      { month: 'Mai', licenciados: 40, modulos: 45 },
      { month: 'Jun', licenciados: 50, modulos: 50 }
    ];

    const stageDistribution = [
      { name: 'Registro', value: 5, color: '#06b6d4' },
      { name: 'Documentos', value: 8, color: '#0ea5e9' },
      { name: 'Pagamento', value: 12, color: '#3b82f6' },
      { name: 'Acolhimento', value: 20, color: '#8b5cf6' },
      { name: 'Completo', value: stats?.total_users || 35, color: '#22c55e' }
    ];

    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-outfit font-bold text-slate-900">Dashboard Administrativo</h1>
            <p className="text-slate-600 mt-2">Visão geral da plataforma</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl border border-slate-100 p-6 hover:border-cyan-100 transition-colors" data-testid="stat-card-users">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-cyan-600" />
                </div>
              </div>
              <p className="text-slate-600 text-sm mb-1">Total de Licenciados</p>
              <p className="text-3xl font-outfit font-bold text-slate-900">{stats?.total_users || 0}</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 p-6 hover:border-cyan-100 transition-colors" data-testid="stat-card-modules">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-slate-600 text-sm mb-1">Total de Módulos</p>
              <p className="text-3xl font-outfit font-bold text-slate-900">{stats?.total_modules || 0}</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 p-6 hover:border-cyan-100 transition-colors" data-testid="stat-card-rewards">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Award className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <p className="text-slate-600 text-sm mb-1">Recompensas Ativas</p>
              <p className="text-3xl font-outfit font-bold text-slate-900">{stats?.total_rewards || 0}</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 p-6 hover:border-cyan-100 transition-colors" data-testid="stat-card-pending">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <p className="text-slate-600 text-sm mb-1">Resgates Pendentes</p>
              <p className="text-3xl font-outfit font-bold text-slate-900">{stats?.pending_redemptions || 0}</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <h3 className="text-xl font-outfit font-semibold text-slate-900 mb-6">Crescimento ao Longo do Tempo</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="licenciados" stroke="#06b6d4" strokeWidth={2} name="Licenciados" />
                  <Line type="monotone" dataKey="modulos" stroke="#8b5cf6" strokeWidth={2} name="Módulos Concluídos" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <h3 className="text-xl font-outfit font-semibold text-slate-900 mb-6">Distribuição por Etapa</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stageDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stageDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <h3 className="text-xl font-outfit font-semibold text-slate-900 mb-4">Ações Rápidas</h3>
              <div className="space-y-3">
                <Link to="/admin/users" className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-cyan-600" />
                    <span className="font-medium text-slate-900">Gerenciar Usuários</span>
                  </div>
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link to="/admin/modules" className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-cyan-600" />
                    <span className="font-medium text-slate-900">Gerenciar Módulos</span>
                  </div>
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link to="/admin/rewards" className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-cyan-600" />
                    <span className="font-medium text-slate-900">Gerenciar Recompensas</span>
                  </div>
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Dashboard do Supervisor
  if (user?.role === 'supervisor') {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-outfit font-bold text-slate-900">Dashboard do Supervisor</h1>
            <p className="text-slate-600 mt-2">Vis\u00e3o geral dos seus licenciados</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-cyan-600" />
                </div>
              </div>
              <p className="text-slate-600 text-sm mb-1">Total de Licenciados</p>
              <p className="text-3xl font-outfit font-bold text-slate-900">{stats?.total_licensees || 0}</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-slate-600 text-sm mb-1">M\u00f3dulos Dispon\u00edveis</p>
              <p className="text-3xl font-outfit font-bold text-slate-900">{stats?.total_modules || 0}</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Award className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-slate-600 text-sm mb-1">Licenciados Completos</p>
              <p className="text-3xl font-outfit font-bold text-slate-900">
                {stats?.licensees?.filter(l => l.current_stage === 'completo').length || 0}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <h3 className="text-xl font-outfit font-semibold text-slate-900 mb-4">A\u00e7\u00f5es R\u00e1pidas</h3>
              <div className="space-y-3">
                <Link to="/supervisor/licensees" className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-cyan-600" />
                    <span className="font-medium text-slate-900">Gerenciar Licenciados</span>
                  </div>
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link to="/modules" className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-cyan-600" />
                    <span className="font-medium text-slate-900">Ver M\u00f3dulos</span>
                  </div>
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link to="/leaderboard" className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-cyan-600" />
                    <span className="font-medium text-slate-900">Ver Ranking</span>
                  </div>
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <h3 className="text-xl font-outfit font-semibold text-slate-900 mb-4">Licenciados Recentes</h3>
              <div className="space-y-3">
                {stats?.licensees?.slice(0, 5).map((licensee) => (
                  <div key={licensee.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{licensee.full_name}</p>
                      <p className="text-xs text-slate-500">{licensee.email}</p>
                    </div>
                    <span className="text-sm font-semibold text-amber-600">{licensee.points || 0} pts</span>
                  </div>
                )) || <p className="text-slate-500 text-center py-4">Nenhum licenciado ainda</p>}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (user?.role === 'licenciado') {
    const progressChartData = [
      { name: 'Completos', value: stats?.completed_modules || 0, color: '#22c55e' },
      { name: 'Pendentes', value: (stats?.total_modules || 0) - (stats?.completed_modules || 0), color: '#e2e8f0' }
    ];

    return (
      <Layout>
        <div className="space-y-6">
          {stageInfo && stageInfo.current_stage !== 'completo' && (
            <StageProgressBar currentStage={stageInfo.current_stage} />
          )}

          <div>
            <h1 className="text-3xl font-outfit font-bold text-slate-900">Meu Dashboard</h1>
            <p className="text-slate-600 mt-2">Acompanhe seu progresso e conquistas</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-amber-700 text-sm font-medium">Pontos Totais</p>
                  <p className="text-3xl font-outfit font-bold text-amber-900">{stats?.points || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-cyan-600" />
                </div>
                <div>
                  <p className="text-slate-600 text-sm">Meu Nível</p>
                  <p className="text-2xl font-outfit font-bold text-slate-900">{stats?.level_title}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-slate-600 text-sm">Módulos Completos</p>
                  <p className="text-2xl font-outfit font-bold text-slate-900">{stats?.completed_modules}/{stats?.total_modules}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-slate-600 text-sm">Minha Posição</p>
                  <p className="text-2xl font-outfit font-bold text-slate-900">#{stats?.my_rank}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Chart */}
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <h3 className="text-xl font-outfit font-semibold text-slate-900 mb-6">Meu Progresso de Módulos</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={progressChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {progressChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Link to="/modules" className="bg-white rounded-xl border border-slate-100 p-8 hover:shadow-lg transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-cyan-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="w-8 h-8 text-cyan-600" />
                </div>
                <div>
                  <h3 className="text-xl font-outfit font-semibold text-slate-900 mb-1">Continuar Aprendendo</h3>
                  <p className="text-slate-600">Acesse seus módulos de treinamento</p>
                </div>
              </div>
            </Link>

            <Link to="/rewards" className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-8 hover:shadow-lg transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-amber-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-outfit font-semibold text-amber-900 mb-1">Ver Recompensas</h3>
                  <p className="text-amber-700">Troque seus pontos por prêmios</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>Dashboard para {user?.role}</div>
    </Layout>
  );
};

export default Dashboard;
