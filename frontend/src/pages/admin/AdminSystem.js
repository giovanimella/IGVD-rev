import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { Settings, Users, BookOpen, Award, FileText, TrendingUp, DollarSign, Calendar, Save, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';

const AdminSystem = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [systemConfig, setSystemConfig] = useState({ minimum_passing_score: 70 });
  const [savingConfig, setSavingConfig] = useState(false);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchSystemStats();
    fetchSystemConfig();
  }, []);

  const fetchSystemStats = async () => {
    try {
      const [dashboardRes, usersRes, modulesRes, rewardsRes] = await Promise.all([
        axios.get(`${API_URL}/api/stats/dashboard`),
        axios.get(`${API_URL}/api/users/`),
        axios.get(`${API_URL}/api/modules/`),
        axios.get(`${API_URL}/api/rewards/`)
      ]);

      setStats({
        dashboard: dashboardRes.data,
        allUsers: usersRes.data,
        allModules: modulesRes.data,
        allRewards: rewardsRes.data
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      toast.error('Erro ao carregar dados do sistema');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/system/config`);
      setSystemConfig(response.data);
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
    }
  };

  const saveSystemConfig = async () => {
    setSavingConfig(true);
    try {
      await axios.put(`${API_URL}/api/system/config`, {
        minimum_passing_score: systemConfig.minimum_passing_score
      });
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSavingConfig(false);
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

  const adminCards = [
    {
      title: 'Gerenciar Usuários',
      description: 'Criar, editar e excluir usuários do sistema',
      icon: Users,
      link: '/admin/users',
      color: 'bg-blue-500',
      count: stats?.allUsers?.length || 0
    },
    {
      title: 'Gerenciar Módulos',
      description: 'Criar e editar módulos de treinamento',
      icon: BookOpen,
      link: '/admin/modules',
      color: 'bg-purple-500',
      count: stats?.allModules?.length || 0
    },
    {
      title: 'Gerenciar Recompensas',
      description: 'Configurar recompensas e aprovar resgates',
      icon: Award,
      link: '/admin/rewards',
      color: 'bg-amber-500',
      count: stats?.allRewards?.length || 0
    },
    {
      title: 'Repositório de Arquivos',
      description: 'Gerenciar arquivos e materiais',
      icon: FileText,
      link: '/admin/files',
      color: 'bg-green-500',
      count: '-'
    },
    {
      title: 'Chat de Suporte',
      description: 'Responder mensagens dos licenciados',
      icon: Settings,
      link: '/admin/chat',
      color: 'bg-cyan-500',
      count: '-'
    }
  ];

  const quickStats = [
    {
      label: 'Total de Licenciados',
      value: stats?.allUsers?.filter(u => u.role === 'licenciado').length || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'Módulos Ativos',
      value: stats?.allModules?.length || 0,
      icon: BookOpen,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      label: 'Recompensas Pendentes',
      value: stats?.dashboard?.pending_redemptions || 0,
      icon: Award,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100'
    },
    {
      label: 'Recompensas Ativas',
      value: stats?.allRewards?.filter(r => r.active).length || 0,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-slate-900">Painel Administrativo</h1>
          <p className="text-slate-600 mt-2">Controle total do sistema Ozoxx LMS</p>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-slate-600 text-sm mb-1">{stat.label}</p>
                <p className="text-3xl font-outfit font-bold text-slate-900">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Ferramentas Administrativas */}
        <div>
          <h2 className="text-xl font-outfit font-semibold text-slate-900 mb-4">Ferramentas de Gestão</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <a
                  key={index}
                  href={card.link}
                  className="group bg-white rounded-xl border border-slate-200 p-6 hover:border-cyan-200 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 ${card.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    {card.count !== '-' && (
                      <span className="bg-slate-100 text-slate-900 px-3 py-1 rounded-full text-sm font-semibold">
                        {card.count}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-outfit font-semibold text-slate-900 mb-2 group-hover:text-cyan-600 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-slate-600 text-sm">{card.description}</p>
                </a>
              );
            })}
          </div>
        </div>

        {/* Configurações do Sistema */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h3 className="text-lg font-outfit font-semibold text-slate-900">Configurações de Avaliação</h3>
              <p className="text-sm text-slate-500">Configure a nota mínima global para aprovação</p>
            </div>
          </div>
          
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-xs">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nota Mínima para Aprovação (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={systemConfig.minimum_passing_score}
                onChange={(e) => setSystemConfig({ ...systemConfig, minimum_passing_score: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500 mt-1">
                Esta nota será aplicada a todas as avaliações de módulos
              </p>
            </div>
            <button
              onClick={saveSystemConfig}
              disabled={savingConfig}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingConfig ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* Ações Rápidas do Sistema */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-outfit font-semibold text-slate-900 mb-4">Resumo do Sistema</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="text-sm text-slate-600 mb-1">Usuários por Função</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-900">Admins:</span>
                  <span className="font-semibold">{stats?.allUsers?.filter(u => u.role === 'admin').length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-900">Supervisores:</span>
                  <span className="font-semibold">{stats?.allUsers?.filter(u => u.role === 'supervisor').length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-900">Licenciados:</span>
                  <span className="font-semibold">{stats?.allUsers?.filter(u => u.role === 'licenciado').length || 0}</span>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <p className="text-sm text-slate-600 mb-1">Conteúdo</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-900">Módulos Totais:</span>
                  <span className="font-semibold">{stats?.allModules?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-900">Módulos Acolhimento:</span>
                  <span className="font-semibold">{stats?.allModules?.filter(m => m.is_acolhimento).length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-900">Com Certificado:</span>
                  <span className="font-semibold">{stats?.allModules?.filter(m => m.has_certificate).length || 0}</span>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-amber-500 pl-4">
              <p className="text-sm text-slate-600 mb-1">Gamificação</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-900">Recompensas Ativas:</span>
                  <span className="font-semibold">{stats?.allRewards?.filter(r => r.active).length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-900">Recompensas Inativas:</span>
                  <span className="font-semibold">{stats?.allRewards?.filter(r => !r.active).length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-900">Resgates Pendentes:</span>
                  <span className="font-semibold text-amber-600">{stats?.dashboard?.pending_redemptions || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminSystem;
