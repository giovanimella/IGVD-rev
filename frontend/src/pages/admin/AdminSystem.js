import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { Settings, Save, Upload, Trash2, Image, Webhook, Key, RefreshCw, Copy, Eye, EyeOff, ClipboardCheck, Globe, DollarSign, Megaphone, ShieldAlert, FileCheck, Smartphone, Users, BookOpen, Award, TrendingUp, FileText, MessageCircle, Calendar, Trophy, Target, GraduationCap, Radio, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useNavigate } from 'react-router-dom';

const AdminSystem = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [systemConfig, setSystemConfig] = useState({ 
    platform_name: 'IGVD - Instituto Global de Vendas Diretas',
    minimum_passing_score: 70,
    webhook_url: '',
    webhook_enabled: false,
    webhook_api_key: '',
    webhook_production_api_key: '',
    webhook_sandbox_api_key: '',
    webhook_receive_enabled: false
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showProductionKey, setShowProductionKey] = useState(false);
  const [showSandboxKey, setShowSandboxKey] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [webhookStats, setWebhookStats] = useState(null);
  const [logFilter, setLogFilter] = useState('all'); // 'all', 'sandbox', 'production'
  const logoInputRef = useRef(null);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchSystemStats();
    fetchSystemConfig();
    fetchWebhookLogs();
    fetchWebhookStats();
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
      const response = await axios.get(`${API_URL}/api/system/config/full`);
      setSystemConfig({
        platform_name: response.data.platform_name || 'IGVD',
        minimum_passing_score: response.data.minimum_passing_score || 70,
        webhook_url: response.data.webhook_url || '',
        webhook_enabled: response.data.webhook_enabled || false,
        webhook_api_key: response.data.webhook_api_key || '',
        webhook_production_api_key: response.data.webhook_production_api_key || response.data.webhook_api_key || '',
        webhook_sandbox_api_key: response.data.webhook_sandbox_api_key || '',
        webhook_receive_enabled: response.data.webhook_receive_enabled || false
      });
      if (response.data.platform_logo) {
        setLogoUrl(`${API_URL}${response.data.platform_logo}`);
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
    }
  };

  const fetchWebhookLogs = async (filter = logFilter) => {
    try {
      let url = `${API_URL}/api/webhook/logs?limit=20`;
      if (filter === 'sandbox') {
        url += '&environment=sandbox';
      } else if (filter === 'production') {
        url += '&environment=production';
      }
      const response = await axios.get(url);
      setWebhookLogs(response.data);
    } catch (error) {
      console.error('Erro ao buscar logs de webhook:', error);
    }
  };

  const fetchWebhookStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/webhook/logs/stats`);
      setWebhookStats(response.data);
    } catch (error) {
      console.error('Erro ao buscar estatísticas de webhook:', error);
    }
  };

  const clearSandboxLogs = async () => {
    if (!window.confirm('Limpar todos os logs do ambiente SANDBOX?')) return;
    try {
      await axios.delete(`${API_URL}/api/webhook/logs/sandbox`);
      toast.success('Logs de sandbox limpos!');
      fetchWebhookLogs();
      fetchWebhookStats();
    } catch (error) {
      toast.error('Erro ao limpar logs');
    }
  };

  const saveSystemConfig = async () => {
    setSavingConfig(true);
    try {
      await axios.put(`${API_URL}/api/system/config`, {
        platform_name: systemConfig.platform_name,
        minimum_passing_score: systemConfig.minimum_passing_score
      });
      toast.success('Configurações salvas com sucesso!');
      window.location.reload();
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSavingConfig(false);
    }
  };

  const saveWebhookConfig = async () => {
    setSavingWebhook(true);
    try {
      await axios.put(`${API_URL}/api/system/config`, {
        webhook_url: systemConfig.webhook_url,
        webhook_enabled: systemConfig.webhook_enabled,
        webhook_production_api_key: systemConfig.webhook_production_api_key,
        webhook_sandbox_api_key: systemConfig.webhook_sandbox_api_key,
        webhook_receive_enabled: systemConfig.webhook_receive_enabled
      });
      toast.success('Configurações de webhook salvas!');
    } catch (error) {
      console.error('Erro ao salvar webhook:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSavingWebhook(false);
    }
  };

  const generateProductionKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'igvd_prod_';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSystemConfig({ ...systemConfig, webhook_production_api_key: key });
    toast.success('Nova API Key de PRODUÇÃO gerada! Clique em Salvar para confirmar.');
  };

  const generateSandboxKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'igvd_sandbox_';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSystemConfig({ ...systemConfig, webhook_sandbox_api_key: key });
    toast.success('Nova API Key de SANDBOX gerada! Clique em Salvar para confirmar.');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.png')) {
      toast.error('Apenas arquivos PNG são aceitos');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 10MB');
      return;
    }

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/api/system/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setLogoUrl(`${API_URL}${response.data.logo_url}`);
      toast.success('Logo enviada com sucesso!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao enviar logo');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!window.confirm('Remover a logo da plataforma?')) return;

    try {
      await axios.delete(`${API_URL}/api/system/logo`);
      setLogoUrl(null);
      toast.success('Logo removida');
    } catch (error) {
      toast.error('Erro ao remover logo');
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

  const quickStats = [
    {
      label: 'Total de Licenciados',
      value: stats?.allUsers?.filter(u => u.role === 'licenciado').length || 0,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-500/20'
    },
    {
      label: 'Módulos Ativos',
      value: stats?.allModules?.length || 0,
      icon: BookOpen,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-500/20'
    },
    {
      label: 'Recompensas Pendentes',
      value: stats?.dashboard?.pending_redemptions || 0,
      icon: Award,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-500/20'
    },
    {
      label: 'Recompensas Ativas',
      value: stats?.allRewards?.filter(r => r.active).length || 0,
      icon: TrendingUp,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-500/20'
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">Painel do Sistema</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Configure e gerencie todas as funcionalidades da plataforma</p>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">{stat.label}</p>
                <p className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Tabs de Configuração */}
        <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden">
          <Tabs defaultValue="gestao" className="w-full">
            <TabsList className="w-full justify-start border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 rounded-none p-0 flex-wrap">
              <TabsTrigger 
                value="gestao" 
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#1b4c51] data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 rounded-none px-6 py-4"
              >
                <Users className="w-4 h-4 mr-2" />
                Gestão
              </TabsTrigger>
              <TabsTrigger 
                value="geral" 
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#1b4c51] data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 rounded-none px-6 py-4"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </TabsTrigger>
              <TabsTrigger 
                value="conteudo" 
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#1b4c51] data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 rounded-none px-6 py-4"
              >
                <Megaphone className="w-4 h-4 mr-2" />
                Conteúdo
              </TabsTrigger>
              <TabsTrigger 
                value="integracoes" 
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#1b4c51] data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 rounded-none px-6 py-4"
              >
                <Webhook className="w-4 h-4 mr-2" />
                Integrações
              </TabsTrigger>
              <TabsTrigger 
                value="seguranca" 
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#1b4c51] data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 rounded-none px-6 py-4"
              >
                <ShieldAlert className="w-4 h-4 mr-2" />
                Segurança
              </TabsTrigger>
            </TabsList>

            {/* ABA: Gestão (NOVA) */}
            <TabsContent value="gestao" className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Ferramentas de Gestão</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Usuários */}
                  <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-6 border border-slate-200 dark:border-white/10 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all cursor-pointer" onClick={() => navigate('/admin/users')}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Usuários</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Criar, editar e excluir usuários</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats?.allUsers?.length || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Recompensas */}
                  <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-6 border border-slate-200 dark:border-white/10 hover:border-amber-200 dark:hover:border-amber-500/30 transition-all cursor-pointer" onClick={() => navigate('/admin/rewards')}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Award className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Recompensas</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Configurar e aprovar resgates</p>
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats?.allRewards?.filter(r => r.active).length || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Chat de Suporte */}
                  <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-6 border border-slate-200 dark:border-white/10 hover:border-cyan-200 dark:hover:border-cyan-500/30 transition-all cursor-pointer" onClick={() => navigate('/admin/chat')}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Atendimento</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Responder mensagens dos licenciados</p>
                      </div>
                    </div>
                  </div>

                  {/* Eventos Empresa */}
                  <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-6 border border-slate-200 dark:border-white/10 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all cursor-pointer" onClick={() => navigate('/admin/company-events')}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Eventos Empresa</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Gerenciar eventos e compromissos</p>
                      </div>
                    </div>
                  </div>

                  {/* Conquistas */}
                  <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-6 border border-slate-200 dark:border-white/10 hover:border-yellow-200 dark:hover:border-yellow-500/30 transition-all cursor-pointer" onClick={() => navigate('/admin/badges')}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Conquistas</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Gerenciar badges e conquistas</p>
                      </div>
                    </div>
                  </div>

                  {/* Desafios */}
                  <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-6 border border-slate-200 dark:border-white/10 hover:border-orange-200 dark:hover:border-orange-500/30 transition-all cursor-pointer" onClick={() => navigate('/admin/challenges')}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-orange-100 dark:bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Target className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Desafios</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Configurar desafios e metas</p>
                      </div>
                    </div>
                  </div>

                  {/* Certificados */}
                  <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-6 border border-slate-200 dark:border-white/10 hover:border-emerald-200 dark:hover:border-emerald-500/30 transition-all cursor-pointer" onClick={() => navigate('/admin/certificates')}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Award className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Certificados</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Gerenciar templates e emissão</p>
                      </div>
                    </div>
                  </div>

                  {/* Treinamentos Presenciais */}
                  <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-6 border border-slate-200 dark:border-white/10 hover:border-violet-200 dark:hover:border-violet-500/30 transition-all cursor-pointer" onClick={() => navigate('/admin/training')}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-violet-100 dark:bg-violet-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <UserCheck className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Treinamentos Presenciais</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Gerenciar turmas e inscrições</p>
                      </div>
                    </div>
                  </div>

                  {/* Relatório de Vendas */}
                  <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-6 border border-slate-200 dark:border-white/10 hover:border-green-200 dark:hover:border-green-500/30 transition-all cursor-pointer" onClick={() => navigate('/admin/sales')}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Relatório de Vendas</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Acompanhar vendas e comissões</p>
                      </div>
                    </div>
                  </div>

                  {/* IGVD Cast */}
                  <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-6 border border-slate-200 dark:border-white/10 hover:border-pink-200 dark:hover:border-pink-500/30 transition-all cursor-pointer" onClick={() => navigate('/admin/igvd-cast')}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-pink-100 dark:bg-pink-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Radio className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">IGVD Cast</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Gerenciar vídeos de lives</p>
                      </div>
                    </div>
                  </div>

                  {/* Níveis da Plataforma */}
                  <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-6 border border-slate-200 dark:border-white/10 hover:border-purple-200 dark:hover:border-purple-500/30 transition-all cursor-pointer" onClick={() => navigate('/admin/levels')}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Níveis da Plataforma</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Configurar níveis e progressão</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ABA: Configurações Gerais */}
            <TabsContent value="geral" className="p-6 space-y-6">
              {/* Identidade da Plataforma */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg flex items-center justify-center">
                    <Image className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-outfit font-semibold text-slate-900 dark:text-white">Identidade da Plataforma</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Configure o nome e logo da plataforma</p>
                  </div>
                </div>

                {/* Nome da Plataforma */}
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Nome da Plataforma
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="text"
                      value={systemConfig.platform_name}
                      onChange={(e) => setSystemConfig({ ...systemConfig, platform_name: e.target.value })}
                      className="flex-1 px-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#142d30] text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      placeholder="Ex: IGVD"
                    />
                    <Button
                      onClick={saveSystemConfig}
                      disabled={savingConfig}
                      className="bg-cyan-500 hover:bg-cyan-600"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {savingConfig ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Este nome aparecerá na tela de login, emails, título das páginas e em toda a plataforma.
                  </p>
                </div>

                {/* Logo */}
                <div className="flex items-center gap-6">
                  <div className="w-48 h-24 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-lg flex items-center justify-center bg-slate-50 dark:bg-white/5 overflow-hidden">
                    {logoUrl ? (
                      <img 
                        src={logoUrl} 
                        alt={systemConfig.platform_name}
                        className="max-w-full max-h-full object-contain p-2"
                      />
                    ) : (
                      <span className="text-slate-400 text-sm">Nenhuma logo</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept=".png"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      variant="outline"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingLogo ? 'Enviando...' : logoUrl ? 'Alterar Logo' : 'Enviar Logo'}
                    </Button>
                    
                    {logoUrl && (
                      <Button
                        onClick={handleRemoveLogo}
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 hover:border-red-200"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remover
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  A logo será exibida na tela de login e no menu lateral (PNG, máximo 10MB).
                </p>
              </div>

              {/* Configurações de Avaliação */}
              <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <ClipboardCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-outfit font-semibold text-slate-900 dark:text-white">Configurações de Avaliação</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Configure a nota mínima global para aprovação</p>
                  </div>
                </div>
                
                <div className="flex items-end gap-4">
                  <div className="flex-1 max-w-xs">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Nota Mínima para Aprovação (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={systemConfig.minimum_passing_score}
                      onChange={(e) => setSystemConfig({ ...systemConfig, minimum_passing_score: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Esta nota será aplicada a todas as avaliações de módulos
                    </p>
                  </div>
                  <Button
                    onClick={saveSystemConfig}
                    disabled={savingConfig}
                    className="bg-cyan-500 hover:bg-cyan-600"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {savingConfig ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>

              {/* Resumo do Sistema */}
              <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-white/10">
                <h3 className="text-lg font-outfit font-semibold text-slate-900 dark:text-white">Resumo do Sistema</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Usuários por Função</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-900 dark:text-white">Admins:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{stats?.allUsers?.filter(u => u.role === 'admin').length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-900 dark:text-white">Supervisores:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{stats?.allUsers?.filter(u => u.role === 'supervisor').length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-900 dark:text-white">Licenciados:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{stats?.allUsers?.filter(u => u.role === 'licenciado').length || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-l-4 border-purple-500 pl-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Conteúdo</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-900 dark:text-white">Módulos Totais:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{stats?.allModules?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-900 dark:text-white">Módulos Acolhimento:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{stats?.allModules?.filter(m => m.is_acolhimento).length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-900 dark:text-white">Com Certificado:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{stats?.allModules?.filter(m => m.has_certificate).length || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-l-4 border-amber-500 pl-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Gamificação</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-900 dark:text-white">Recompensas Ativas:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{stats?.allRewards?.filter(r => r.active).length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-900 dark:text-white">Recompensas Inativas:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{stats?.allRewards?.filter(r => !r.active).length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-900 dark:text-white">Resgates Pendentes:</span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">{stats?.dashboard?.pending_redemptions || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ABA: Conteúdo */}
            <TabsContent value="conteudo" className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Gestão de Conteúdo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Módulos */}
                  <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-6 border border-slate-200 dark:border-white/10 hover:border-purple-200 dark:hover:border-purple-500/30 transition-all cursor-pointer" onClick={() => navigate('/admin/modules')}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Módulos</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Criar e editar módulos de treinamento</p>
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats?.allModules?.length || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Arquivos */}
                  <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-6 border border-slate-200 dark:border-white/10 hover:border-green-200 dark:hover:border-green-500/30 transition-all cursor-pointer" onClick={() => navigate('/admin/files')}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Repositório de Arquivos</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Gerenciar arquivos e materiais</p>
                      </div>
                    </div>
                  </div>

                  {/* Landing Page */}
                  <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-6 border border-slate-200 dark:border-white/10 hover:border-cyan-200 dark:hover:border-cyan-500/30 transition-all cursor-pointer" onClick={() => navigate('/admin/landing-page')}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Landing Page</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Configure textos e imagens da página pública</p>
                      </div>
                    </div>
                  </div>

                  {/* Banners */}
                  <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-6 border border-slate-200 dark:border-white/10 hover:border-pink-200 dark:hover:border-pink-500/30 transition-all cursor-pointer" onClick={() => navigate('/admin/banners')}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-pink-100 dark:bg-pink-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Image className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Banners</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Banners rotativos do dashboard</p>
                      </div>
                    </div>
                  </div>

                  {/* Comunicados */}
                  <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-6 border border-slate-200 dark:border-white/10 hover:border-amber-200 dark:hover:border-amber-500/30 transition-all cursor-pointer" onClick={() => navigate('/admin/posts')}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Megaphone className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Comunicados</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Avisos importantes para usuários</p>
                      </div>
                    </div>
                  </div>

                  {/* Termos de Aceite */}
                  <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-6 border border-slate-200 dark:border-white/10 hover:border-teal-200 dark:hover:border-teal-500/30 transition-all cursor-pointer" onClick={() => navigate('/admin/terms')}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-teal-100 dark:bg-teal-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileCheck className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Termos de Aceite</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Termos e políticas de uso</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ABA: Integrações */}
            <TabsContent value="integracoes" className="p-6 space-y-6">
              {/* WhatsApp */}
              <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-6 border border-slate-200 dark:border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Smartphone className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">WhatsApp (Evolution API)</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Configure notificações automáticas via WhatsApp para aniversários, novos módulos e mais</p>
                    </div>
                  </div>
                  <Button onClick={() => navigate('/admin/whatsapp')} className="bg-green-600 hover:bg-green-700 ml-4">
                    Configurar
                  </Button>
                </div>
              </div>

              {/* Pagamentos */}
              <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-6 border border-slate-200 dark:border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Pagamentos (MercadoPago)</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Configure credenciais do MercadoPago para pagamentos de licenciados</p>
                    </div>
                  </div>
                  <Button onClick={() => navigate('/admin/payment-settings')} className="bg-emerald-600 hover:bg-emerald-700 ml-4">
                    Configurar
                  </Button>
                </div>
              </div>

              {/* Webhooks */}
              <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Webhook className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-outfit font-semibold text-slate-900 dark:text-white">Webhooks de Integração</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Ambiente Sandbox para testes e Produção para cadastros reais</p>
                  </div>
                </div>

                {/* Toggle de Recebimento */}
                <div className={`rounded-lg p-4 border-2 ${systemConfig.webhook_receive_enabled ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'}`}>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${systemConfig.webhook_receive_enabled ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></div>
                      <div>
                        <h4 className="font-medium text-slate-900 dark:text-white">
                          {systemConfig.webhook_receive_enabled ? '🟢 Recebimento ATIVO' : '🟡 Recebimento DESATIVADO'}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {systemConfig.webhook_receive_enabled 
                            ? 'Cadastros via API de produção estão sendo aceitos' 
                            : 'Cadastros via produção bloqueados (sandbox continua funcionando)'}
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={systemConfig.webhook_receive_enabled || false}
                        onChange={(e) => setSystemConfig({ ...systemConfig, webhook_receive_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-7 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>
                </div>

                {/* Ambiente SANDBOX */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-700/50">
                  <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                    🧪 Ambiente SANDBOX (Testes)
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mb-4">
                    Use para testar a integração. Dados são validados mas NÃO são criados no sistema.
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">Endpoint Sandbox</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-white dark:bg-white/10 px-3 py-2 rounded text-xs font-mono text-amber-900 dark:text-amber-200 overflow-x-auto">
                          {API_URL}/api/webhook/sandbox/licensee
                        </code>
                        <button onClick={() => copyToClipboard(`${API_URL}/api/webhook/sandbox/licensee`)} className="p-2 text-amber-600 hover:text-amber-700 bg-white dark:bg-white/10 rounded">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">API Key Sandbox</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showSandboxKey ? 'text' : 'password'}
                            value={systemConfig.webhook_sandbox_api_key || ''}
                            onChange={(e) => setSystemConfig({ ...systemConfig, webhook_sandbox_api_key: e.target.value })}
                            className="w-full px-4 py-2 pr-16 border border-amber-300 dark:border-amber-600 rounded-lg focus:ring-2 focus:ring-amber-500 font-mono text-sm bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                            placeholder="Clique em Gerar"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                            <button onClick={() => setShowSandboxKey(!showSandboxKey)} className="p-1 text-amber-500 hover:text-amber-700">
                              {showSandboxKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            {systemConfig.webhook_sandbox_api_key && (
                              <button onClick={() => copyToClipboard(systemConfig.webhook_sandbox_api_key)} className="p-1 text-amber-500 hover:text-amber-700">
                                <Copy className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        <Button onClick={generateSandboxKey} variant="outline" size="sm" className="border-amber-400 text-amber-700 hover:bg-amber-100">
                          <RefreshCw className="w-4 h-4 mr-1" /> Gerar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ambiente PRODUÇÃO */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700/50">
                  <h4 className="font-medium text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                    🚀 Ambiente PRODUÇÃO
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-400 mb-4">
                    Cria licenciados de verdade. {!systemConfig.webhook_receive_enabled && <strong className="text-amber-600">⚠️ Atualmente DESATIVADO</strong>}
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-green-800 dark:text-green-300 mb-1">Endpoint Produção</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-white dark:bg-white/10 px-3 py-2 rounded text-xs font-mono text-green-900 dark:text-green-200 overflow-x-auto">
                          {API_URL}/api/webhook/licensee
                        </code>
                        <button onClick={() => copyToClipboard(`${API_URL}/api/webhook/licensee`)} className="p-2 text-green-600 hover:text-green-700 bg-white dark:bg-white/10 rounded">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-green-800 dark:text-green-300 mb-1">API Key Produção</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showProductionKey ? 'text' : 'password'}
                            value={systemConfig.webhook_production_api_key || ''}
                            onChange={(e) => setSystemConfig({ ...systemConfig, webhook_production_api_key: e.target.value })}
                            className="w-full px-4 py-2 pr-16 border border-green-300 dark:border-green-600 rounded-lg focus:ring-2 focus:ring-green-500 font-mono text-sm bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                            placeholder="Clique em Gerar"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                            <button onClick={() => setShowProductionKey(!showProductionKey)} className="p-1 text-green-500 hover:text-green-700">
                              {showProductionKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            {systemConfig.webhook_production_api_key && (
                              <button onClick={() => copyToClipboard(systemConfig.webhook_production_api_key)} className="p-1 text-green-500 hover:text-green-700">
                                <Copy className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        <Button onClick={generateProductionKey} variant="outline" size="sm" className="border-green-400 text-green-700 hover:bg-green-100">
                          <RefreshCw className="w-4 h-4 mr-1" /> Gerar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Webhook de Saída */}
                <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <Webhook className="w-4 h-4" />
                    Webhook de Saída (Onboarding Completo)
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Envia notificação quando um licenciado atinge "Completo - Acesso Total"
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL de Destino</label>
                      <input type="url" value={systemConfig.webhook_url || ''} onChange={(e) => setSystemConfig({ ...systemConfig, webhook_url: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-white/5 text-slate-900 dark:text-white" placeholder="https://seu-sistema.com/webhook" />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={systemConfig.webhook_enabled || false} onChange={(e) => setSystemConfig({ ...systemConfig, webhook_enabled: e.target.checked })} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{systemConfig.webhook_enabled ? 'Habilitado' : 'Desabilitado'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={saveWebhookConfig} disabled={savingWebhook} className="bg-purple-600 hover:bg-purple-700">
                    <Save className="w-4 h-4 mr-2" />
                    {savingWebhook ? 'Salvando...' : 'Salvar Configurações'}
                  </Button>
                </div>

                {/* Logs de Webhook */}
                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-white/10">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="font-semibold text-slate-900 dark:text-white">Logs de Webhook</h4>
                    <div className="flex items-center gap-2">
                      <select value={logFilter} onChange={(e) => { setLogFilter(e.target.value); fetchWebhookLogs(e.target.value); }} className="text-sm border border-slate-200 dark:border-white/10 rounded px-2 py-1 bg-white dark:bg-white/5 text-slate-900 dark:text-white">
                        <option value="all">Todos</option>
                        <option value="sandbox">Sandbox</option>
                        <option value="production">Produção</option>
                      </select>
                      <Button variant="outline" size="sm" onClick={() => fetchWebhookLogs()}><RefreshCw className="w-4 h-4" /></Button>
                      <Button variant="outline" size="sm" onClick={clearSandboxLogs} className="text-amber-600 border-amber-300 hover:bg-amber-50"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  {webhookLogs.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {webhookLogs.map((log, idx) => (
                        <div key={idx} className={`p-3 rounded-lg text-sm border ${log.environment === 'sandbox' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200' : log.success ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : 'bg-red-50 dark:bg-red-900/20 border-red-200'}`}>
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${log.environment === 'sandbox' ? 'bg-amber-200 text-amber-800' : 'bg-green-200 text-green-800'}`}>
                                {log.environment === 'sandbox' ? '🧪 Sandbox' : '🚀 Prod'}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${log.type === 'incoming' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                {log.type === 'incoming' ? '📥' : '📤'}
                              </span>
                              <span className="text-slate-600 dark:text-slate-300">{log.event}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 text-xs">
                              <span>{new Date(log.created_at).toLocaleString('pt-BR')}</span>
                              <span className={`w-2 h-2 rounded-full ${log.success ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400">Nenhum log encontrado</div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ABA: Segurança */}
            <TabsContent value="seguranca" className="p-6">
              <div className="grid grid-cols-1 gap-6">
                {/* Filtro de Palavras */}
                <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-6 border border-slate-200 dark:border-white/10">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Filtro de Palavras Proibidas</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Configure lista de palavras que serão bloqueadas em comentários e posts da comunidade</p>
                      </div>
                    </div>
                    <Button onClick={() => navigate('/admin/banned-words')} className="bg-red-600 hover:bg-red-700 ml-4">
                      Configurar
                    </Button>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    💡 <strong>Dica:</strong> Mantenha a lista de palavras proibidas atualizada para garantir um ambiente seguro e respeitoso para todos os usuários.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default AdminSystem;
