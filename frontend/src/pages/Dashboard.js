import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import axios from 'axios';
import { BookOpen, Users, Award, Clock, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchDashboardStats();
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
              <p className="text-slate-600 text-sm mb-1">Total de Franqueados</p>
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
                <Link to="/modules" className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
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

  if (user?.role === 'franqueado') {
    return (
      <Layout>
        <div className="space-y-6">
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