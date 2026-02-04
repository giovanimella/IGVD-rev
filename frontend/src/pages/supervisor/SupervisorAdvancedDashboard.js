import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Users,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Clock,
  Calendar,
  TrendingUp,
  Award,
  BookOpen,
  Search,
  ChevronRight,
  BarChart3,
  Target
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SupervisorAdvancedDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('delayed');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/analytics/supervisor/advanced-dashboard`);
      setData(response.data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (days) => {
    if (days >= 30 || days === 999) return 'text-red-600 bg-red-100 dark:bg-red-500/20 dark:text-red-400';
    if (days >= 7) return 'text-amber-600 bg-amber-100 dark:bg-amber-500/20 dark:text-amber-400';
    return 'text-green-600 bg-green-100 dark:bg-green-500/20 dark:text-green-400';
  };

  const getStatusLabel = (days) => {
    if (days >= 30 || days === 999) return 'Inativo';
    if (days >= 7) return 'Atrasado';
    return 'Ativo';
  };

  const formatDays = (days) => {
    if (days === 999 || days === null) return 'Nunca acessou';
    if (days === 0) return 'Hoje';
    if (days === 1) return '1 dia atrás';
    return `${days} dias atrás`;
  };

  const filterUsers = (users) => {
    if (!searchTerm) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(u => 
      u.full_name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term)
    );
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

  if (!data) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-600 dark:text-slate-400">Erro ao carregar dados</p>
        </div>
      </Layout>
    );
  }

  const { summary, active_users, delayed_users, inactive_users } = data;

  const tabs = [
    { id: 'delayed', label: 'Atrasados', count: summary.delayed_count, icon: AlertTriangle, color: 'amber' },
    { id: 'inactive', label: 'Inativos', count: summary.inactive_count, icon: XCircle, color: 'red' },
    { id: 'active', label: 'Ativos', count: summary.active_count, icon: CheckCircle, color: 'green' }
  ];

  const currentUsers = activeTab === 'delayed' ? delayed_users :
                       activeTab === 'inactive' ? inactive_users :
                       active_users;

  const filteredUsers = filterUsers(currentUsers);

  const UserCard = ({ userItem }) => (
    <div
      onClick={() => navigate(`/supervisor/licensee/${userItem.id}`)}
      className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-4 hover:shadow-lg transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          {userItem.profile_picture ? (
            <img
              src={`${API_URL}${userItem.profile_picture}`}
              alt=""
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">
              {userItem.full_name?.charAt(0)}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
              {userItem.full_name}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{userItem.email}</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Último acesso</span>
          </div>
          <p className={`text-sm font-medium ${getStatusColor(userItem.days_since_access)}`}>
            {formatDays(userItem.days_since_access)}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">Progresso</span>
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {userItem.completion_percentage?.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Barra de Progresso */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
          <span>{userItem.completed_chapters}/{userItem.total_chapters} capítulos</span>
          <span>{userItem.completed_modules}/{userItem.total_modules} módulos</span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
            style={{ width: `${userItem.completion_percentage}%` }}
          />
        </div>
      </div>

      {/* Previsão de Conclusão */}
      {userItem.estimated_completion && (
        <div className="mt-3 flex items-center space-x-2 text-sm">
          <Calendar className="w-4 h-4 text-cyan-500" />
          <span className="text-slate-600 dark:text-slate-400">Previsão:</span>
          <span className="font-medium text-slate-900 dark:text-white">
            {userItem.estimated_completion === 'Concluído' 
              ? '✅ Concluído' 
              : new Date(userItem.estimated_completion).toLocaleDateString('pt-BR')}
          </span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Award className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-slate-900 dark:text-white">{userItem.points} pts</span>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(userItem.days_since_access)}`}>
          {getStatusLabel(userItem.days_since_access)}
        </span>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">Dashboard Avançado</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Visão detalhada da sua equipe de licenciados</p>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Total</p>
                <p className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">
                  {summary.total_licensees}
                </p>
              </div>
              <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Ativos</p>
                <p className="text-3xl font-outfit font-bold text-green-600 dark:text-green-400">
                  {summary.active_count}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Atrasados</p>
                <p className="text-3xl font-outfit font-bold text-amber-600 dark:text-amber-400">
                  {summary.delayed_count}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Inativos</p>
                <p className="text-3xl font-outfit font-bold text-red-600 dark:text-red-400">
                  {summary.inactive_count}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Progresso Geral */}
        <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-cyan-500" />
              <span className="font-medium text-slate-900 dark:text-white">Progresso Médio da Equipe</span>
            </div>
            <span className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
              {summary.avg_completion_percentage?.toFixed(0)}%
            </span>
          </div>
          <div className="h-4 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
              style={{ width: `${summary.avg_completion_percentage}%` }}
            />
          </div>
        </div>

        {/* Tabs e Lista */}
        <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center border-b border-slate-200 dark:border-white/10">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-4 py-4 border-b-2 transition-all ${
                    activeTab === tab.id
                      ? `border-${tab.color}-500 text-${tab.color}-600 dark:text-${tab.color}-400 bg-${tab.color}-50 dark:bg-${tab.color}-500/10`
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === tab.id
                      ? `bg-${tab.color}-100 dark:bg-${tab.color}-500/20 text-${tab.color}-700 dark:text-${tab.color}-400`
                      : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Busca */}
          <div className="p-4 border-b border-slate-200 dark:border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Lista de Usuários */}
          <div className="p-4">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400">
                  {searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário nesta categoria'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map((userItem) => (
                  <UserCard key={userItem.id} userItem={userItem} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SupervisorAdvancedDashboard;
