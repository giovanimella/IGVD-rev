import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import Layout from '../components/Layout';
import StageProgressBar from '../components/StageProgressBar';
import BannerCarousel from '../components/BannerCarousel';
import PostsList from '../components/PostsList';
import axios from 'axios';
import { BookOpen, Users, Award, Clock, TrendingUp, Trophy, CheckCircle, Activity, Flame, Target, Calendar, Briefcase, GraduationCap, Bell, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [stageInfo, setStageInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [accessHistory, setAccessHistory] = useState([]);
  const [gamificationStats, setGamificationStats] = useState(null);
  const [myBadges, setMyBadges] = useState([]);
  const [streak, setStreak] = useState(null);
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchDashboardStats();
    if (user?.role === 'licenciado') {
      fetchStageInfo();
      fetchRecentActivity();
      fetchAccessHistory();
      fetchGamificationData();
      fetchUpcomingAppointments();
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

  const fetchGamificationData = async () => {
    try {
      const [statsRes, badgesRes, streakRes, challengesRes] = await Promise.all([
        axios.get(`${API_URL}/api/gamification/stats`),
        axios.get(`${API_URL}/api/gamification/my-badges`),
        axios.get(`${API_URL}/api/gamification/streak`),
        axios.get(`${API_URL}/api/gamification/challenges/my-progress`)
      ]);
      setGamificationStats(statsRes.data);
      setMyBadges(badgesRes.data);
      setStreak(streakRes.data);
      setActiveChallenges(challengesRes.data);
    } catch (error) {
      console.error('Erro ao buscar dados de gamificação:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/stats/recent-activity`);
      setRecentActivity(response.data);
    } catch (error) {
      console.error('Erro ao buscar atividades recentes:', error);
    }
  };

  const fetchAccessHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/stats/access-history`);
      setAccessHistory(response.data);
    } catch (error) {
      console.error('Erro ao buscar histórico de acessos:', error);
    }
  };

  const fetchUpcomingAppointments = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/appointments/upcoming`);
      setUpcomingAppointments(response.data);
    } catch (error) {
      console.error('Erro ao buscar compromissos:', error);
    }
  };

  const getCategoryInfo = (categoryKey) => {
    const categories = {
      visita_cliente: { label: 'Visita a Cliente', icon: Users, color: 'bg-blue-500' },
      reuniao: { label: 'Reunião', icon: Briefcase, color: 'bg-purple-500' },
      treinamento: { label: 'Treinamento', icon: GraduationCap, color: 'bg-green-500' },
      lembrete: { label: 'Lembrete', icon: Bell, color: 'bg-amber-500' },
      outro: { label: 'Outro', icon: MoreHorizontal, color: 'bg-slate-500' }
    };
    return categories[categoryKey] || categories.outro;
  };

  const formatAppointmentDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.getTime() === today.getTime()) {
      return 'Hoje';
    } else if (date.getTime() === tomorrow.getTime()) {
      return 'Amanhã';
    } else {
      return date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
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
            <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">Dashboard Administrativo</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Visão geral da plataforma</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-100 dark:border-white/5 p-4 lg:p-6 hover:border-cyan-100 dark:hover:border-cyan-500/30 transition-all" data-testid="stat-card-users">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Total de Licenciados</p>
              <p className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">{stats?.total_users || 0}</p>
            </div>

            <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-100 dark:border-white/5 p-6 hover:border-cyan-100 dark:hover:border-blue-500/30 transition-all" data-testid="stat-card-modules">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Total de Módulos</p>
              <p className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">{stats?.total_modules || 0}</p>
            </div>

            <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-100 dark:border-white/5 p-6 hover:border-cyan-100 dark:hover:border-amber-500/30 transition-all" data-testid="stat-card-rewards">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <Award className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Recompensas Ativas</p>
              <p className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">{stats?.total_rewards || 0}</p>
            </div>

            <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-100 dark:border-white/5 p-6 hover:border-cyan-100 dark:hover:border-orange-500/30 transition-all" data-testid="stat-card-pending">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Resgates Pendentes</p>
              <p className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">{stats?.pending_redemptions || 0}</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-100 dark:border-white/5 p-6">
              <h3 className="text-xl font-outfit font-semibold text-slate-900 dark:text-white mb-6">Crescimento ao Longo do Tempo</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
                  <Legend />
                  <Line type="monotone" dataKey="licenciados" stroke="#06b6d4" strokeWidth={2} name="Licenciados" />
                  <Line type="monotone" dataKey="modulos" stroke="#8b5cf6" strokeWidth={2} name="Módulos Concluídos" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-100 dark:border-white/5 p-6">
              <h3 className="text-xl font-outfit font-semibold text-slate-900 dark:text-white mb-6">Distribuição por Etapa</h3>
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
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-100 dark:border-white/5 p-6">
              <h3 className="text-xl font-outfit font-semibold text-slate-900 dark:text-white mb-4">Ações Rápidas</h3>
              <div className="space-y-3">
                <Link to="/admin/users" className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                    <span className="font-medium text-slate-900 dark:text-white">Gerenciar Usuários</span>
                  </div>
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link to="/admin/modules" className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                    <span className="font-medium text-slate-900 dark:text-white">Gerenciar Módulos</span>
                  </div>
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link to="/admin/rewards" className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                    <span className="font-medium text-slate-900 dark:text-white">Gerenciar Recompensas</span>
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
            <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">Dashboard do Supervisor</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Visão geral dos seus licenciados</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-100 dark:border-white/5 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Total de Licenciados</p>
              <p className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">{stats?.total_licensees || 0}</p>
            </div>

            <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-100 dark:border-white/5 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Módulos Disponíveis</p>
              <p className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">{stats?.total_modules || 0}</p>
            </div>

            <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-100 dark:border-white/5 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Award className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Licenciados Completos</p>
              <p className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">
                {stats?.licensees?.filter(l => l.current_stage === 'completo').length || 0}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-100 dark:border-white/5 p-6">
              <h3 className="text-xl font-outfit font-semibold text-slate-900 dark:text-white mb-4">Ações Rápidas</h3>
              <div className="space-y-3">
                <Link to="/supervisor/licensees" className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                    <span className="font-medium text-slate-900 dark:text-white">Gerenciar Licenciados</span>
                  </div>
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link to="/modules" className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                    <span className="font-medium text-slate-900 dark:text-white">Ver Módulos</span>
                  </div>
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link to="/leaderboard" className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                    <span className="font-medium text-slate-900 dark:text-white">Ver Ranking</span>
                  </div>
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-100 dark:border-white/5 p-6">
              <h3 className="text-xl font-outfit font-semibold text-slate-900 dark:text-white mb-4">Licenciados Recentes</h3>
              <div className="space-y-3">
                {stats?.licensees?.slice(0, 5).map((licensee) => (
                  <div key={licensee.id} className="flex items-center justify-between p-3 border border-slate-100 dark:border-white/5 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{licensee.full_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{licensee.email}</p>
                    </div>
                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{licensee.points || 0} pts</span>
                  </div>
                )) || <p className="text-slate-500 dark:text-slate-400 text-center py-4">Nenhum licenciado ainda</p>}
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
            <h1 className="text-2xl lg:text-3xl font-outfit font-bold text-slate-900 dark:text-white">Meu Dashboard</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1 lg:mt-2 text-sm lg:text-base">Acompanhe seu progresso e conquistas</p>
          </div>

          {/* Banner Rotativo */}
          <BannerCarousel />

          {/* Compromissos Próximos */}
          {upcomingAppointments.length > 0 && (
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800/50 p-6" data-testid="upcoming-appointments-widget">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-outfit font-semibold text-slate-900 dark:text-white">Próximos Compromissos</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Hoje e nos próximos 3 dias</p>
                  </div>
                </div>
                <Link 
                  to="/agenda" 
                  className="text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium"
                >
                  Ver Agenda →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingAppointments.slice(0, 6).map((apt) => {
                  const catInfo = getCategoryInfo(apt.category);
                  const Icon = catInfo.icon;
                  return (
                    <div 
                      key={apt.id} 
                      className="bg-white dark:bg-[#151B28] rounded-lg p-4 border border-slate-200 dark:border-white/10 hover:border-cyan-300 dark:hover:border-cyan-500/50 transition-colors"
                      data-testid={`upcoming-apt-${apt.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg ${catInfo.color} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white truncate">{apt.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              formatAppointmentDate(apt.date) === 'Hoje' 
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' 
                                : formatAppointmentDate(apt.date) === 'Amanhã'
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>
                              {formatAppointmentDate(apt.date)}
                            </span>
                            <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {apt.time}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Novidades e Comunicados */}
          <PostsList />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 rounded-xl border border-amber-200 dark:border-amber-700/50 p-4 lg:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-amber-700 dark:text-amber-400 text-sm font-medium">Pontos Totais</p>
                  <p className="text-3xl font-outfit font-bold text-amber-900 dark:text-amber-300">{stats?.points || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-100 dark:border-white/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">Meu Nível</p>
                  <p className="text-2xl font-outfit font-bold text-slate-900 dark:text-white">{stats?.level_title}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-100 dark:border-white/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">Módulos Completos</p>
                  <p className="text-2xl font-outfit font-bold text-slate-900 dark:text-white">{stats?.completed_modules}/{stats?.total_modules}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-100 dark:border-white/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">Minha Posição</p>
                  <p className="text-2xl font-outfit font-bold text-slate-900 dark:text-white">#{stats?.my_rank}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Seção de Gamificação */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Streak */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl border border-orange-200 dark:border-orange-700/50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-orange-700 dark:text-orange-400 text-sm font-medium">Streak Atual</p>
                  <p className="text-3xl font-outfit font-bold text-orange-900 dark:text-orange-300">
                    {streak?.current_streak || 0} {streak?.current_streak === 1 ? 'dia' : 'dias'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-orange-600 dark:text-orange-400">Recorde:</span>
                <span className="font-semibold text-orange-900 dark:text-orange-300">{streak?.longest_streak || 0} dias 🔥</span>
              </div>
            </div>

            {/* Badges Conquistados */}
            <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-100 dark:border-white/5 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h3 className="font-semibold text-slate-900 dark:text-white">Meus Badges</h3>
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {gamificationStats?.badges_earned || 0}/{gamificationStats?.total_badges || 0}
                </span>
              </div>
              {myBadges.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {myBadges.slice(0, 6).map((badge, index) => (
                    <div
                      key={index}
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: `${badge.color}20` }}
                      title={`${badge.name} - ${badge.description}`}
                    >
                      {badge.icon}
                    </div>
                  ))}
                  {myBadges.length > 6 && (
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium">
                      +{myBadges.length - 6}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Trophy className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum badge ainda</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Complete módulos para ganhar!</p>
                </div>
              )}
            </div>

            {/* Desafio da Semana */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-700/50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-semibold text-purple-900 dark:text-purple-300">Desafio da Semana</h3>
              </div>
              {activeChallenges.length > 0 ? (
                <div className="space-y-3">
                  {activeChallenges.slice(0, 2).map((challenge, index) => (
                    <div key={index} className="bg-white/60 dark:bg-white/10 rounded-lg p-3">
                      <p className="font-medium text-purple-900 dark:text-purple-300 text-sm mb-1">{challenge.title}</p>
                      <p className="text-xs text-purple-600 dark:text-purple-400 mb-2">{challenge.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 bg-purple-200 dark:bg-purple-800 rounded-full h-2 mr-3">
                          <div
                            className="bg-purple-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min((challenge.user_progress / challenge.target_value) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-purple-700 dark:text-purple-400">
                          {challenge.user_progress}/{challenge.target_value}
                        </span>
                      </div>
                      {challenge.user_completed && (
                        <span className="inline-block mt-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
                          ✓ Completado!
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Target className="w-10 h-10 text-purple-300 dark:text-purple-600 mx-auto mb-2" />
                  <p className="text-sm text-purple-600 dark:text-purple-400">Nenhum desafio ativo</p>
                  <p className="text-xs text-purple-400 dark:text-purple-500">Aguarde novos desafios!</p>
                </div>
              )}
            </div>
          </div>

          {/* Progress Chart + Atividades Recentes + Gráfico de Acessos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico de Pizza - Progresso de Módulos */}
            <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-100 dark:border-white/5 p-6">
              <h3 className="text-xl font-outfit font-semibold text-slate-900 dark:text-white mb-6">Progresso de Módulos</h3>
              {stats?.total_modules > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={progressChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {progressChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-56">
                  <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-1">Nenhum módulo disponível</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Módulos aparecerão aqui</p>
                </div>
              )}
            </div>

            {/* Lista de Atividades Recentes */}
            <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-100 dark:border-white/5 p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h3 className="text-xl font-outfit font-semibold text-slate-900 dark:text-white">Atividades Recentes</h3>
              </div>
              {recentActivity.length > 0 ? (
                <div className="space-y-3 max-h-56 overflow-y-auto">
                  {recentActivity.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/10">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{activity.chapter_title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{activity.module_title}</p>
                        {activity.completed_at && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            {new Date(activity.completed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-56">
                  <Activity className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-1">Nenhuma atividade ainda</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center">Complete módulos para ver seu histórico</p>
                </div>
              )}
            </div>

            {/* Gráfico de Acessos - Últimos 7 Dias */}
            <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-100 dark:border-white/5 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-cyan-500" />
                <h3 className="text-xl font-outfit font-semibold text-slate-900 dark:text-white">Acessos (7 dias)</h3>
              </div>
              {accessHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={accessHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                      formatter={(value) => [`${value} acesso(s)`, 'Acessos']}
                    />
                    <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Acessos" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-56">
                  <Activity className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-1">Sem dados de acesso</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center">Seus acessos aparecerão aqui</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Link to="/modules" className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-100 dark:border-white/5 p-8 hover:shadow-lg dark:hover:border-cyan-500/30 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-xl font-outfit font-semibold text-slate-900 dark:text-white mb-1">Continuar Aprendendo</h3>
                  <p className="text-slate-600 dark:text-slate-400">Acesse seus módulos de treinamento</p>
                </div>
              </div>
            </Link>

            <Link to="/rewards" className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-700/50 p-8 hover:shadow-lg transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-amber-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-outfit font-semibold text-amber-900 dark:text-amber-300 mb-1">Ver Recompensas</h3>
                  <p className="text-amber-700 dark:text-amber-400">Troque seus pontos por prêmios</p>
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
