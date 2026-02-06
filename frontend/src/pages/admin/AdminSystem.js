import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { Settings, Save, Upload, Trash2, Image, Webhook, Key, RefreshCw, Copy, Eye, EyeOff, ClipboardCheck, Globe, DollarSign, Megaphone, ShieldAlert, FileCheck, Smartphone, Users, BookOpen, Award, TrendingUp } from 'lucide-react';
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
    webhook_api_key: ''
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState([]);
  const logoInputRef = useRef(null);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchSystemStats();
    fetchSystemConfig();
    fetchWebhookLogs();
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
        webhook_api_key: response.data.webhook_api_key || ''
      });
      if (response.data.platform_logo) {
        setLogoUrl(`${API_URL}${response.data.platform_logo}`);
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
    }
  };

  const fetchWebhookLogs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/webhook/logs?limit=10`);
      setWebhookLogs(response.data);
    } catch (error) {
      console.error('Erro ao buscar logs de webhook:', error);
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
        webhook_api_key: systemConfig.webhook_api_key
      });
      toast.success('Configurações de webhook salvas!');
    } catch (error) {
      console.error('Erro ao salvar webhook:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSavingWebhook(false);
    }
  };

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'igvd_';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSystemConfig({ ...systemConfig, webhook_api_key: key });
    toast.success('Nova API Key gerada! Clique em Salvar para confirmar.');
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
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="w-full justify-start border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 rounded-none p-0">
              <TabsTrigger 
                value="geral" 
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#1b4c51] data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 rounded-none px-6 py-4"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configurações Gerais
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
                    <h3 className="text-lg font-outfit font-semibold text-slate-900 dark:text-white">Webhooks</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Configure integrações com sistemas externos</p>
                  </div>
                </div>

                {/* Webhook de Entrada */}
                <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Webhook de Entrada (Receber Licenciados)
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Endpoint: <code className="bg-slate-200 dark:bg-white/10 px-2 py-1 rounded text-xs">{API_URL}/api/webhook/licensee</code>
                    <button 
                      onClick={() => copyToClipboard(`${API_URL}/api/webhook/licensee`)}
                      className="ml-2 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700"
                    >
                      <Copy className="w-4 h-4 inline" />
                    </button>
                  </p>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">API Key (Header: X-API-Key)</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={systemConfig.webhook_api_key || ''}
                          onChange={(e) => setSystemConfig({ ...systemConfig, webhook_api_key: e.target.value })}
                          className="w-full px-4 py-2 pr-20 border border-slate-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                          placeholder="Clique em Gerar para criar uma chave"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                          <button 
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          >
                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          {systemConfig.webhook_api_key && (
                            <button 
                              onClick={() => copyToClipboard(systemConfig.webhook_api_key)}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <Button onClick={generateApiKey} variant="outline" size="sm">
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Gerar
                      </Button>
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
                      <input
                        type="url"
                        value={systemConfig.webhook_url || ''}
                        onChange={(e) => setSystemConfig({ ...systemConfig, webhook_url: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                        placeholder="https://seu-sistema.com/webhook/onboarding"
                      />
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={systemConfig.webhook_enabled || false}
                          onChange={(e) => setSystemConfig({ ...systemConfig, webhook_enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {systemConfig.webhook_enabled ? 'Webhook habilitado' : 'Webhook desabilitado'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Exemplo Payload */}
                <div className="bg-slate-800 rounded-lg p-4 text-white">
                  <h4 className="font-medium mb-2 text-slate-200">Payload de Exemplo (Saída)</h4>
                  <pre className="text-xs text-slate-300 overflow-x-auto">
{`{
  "event": "onboarding_completed",
  "timestamp": "2026-01-16T12:00:00.000Z",
  "data": {
    "id": "123-abc-456",
    "full_name": "Nome do Licenciado"
  }
}`}
                  </pre>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={saveWebhookConfig}
                    disabled={savingWebhook}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {savingWebhook ? 'Salvando...' : 'Salvar Webhooks'}
                  </Button>
                </div>

                {/* Logs de Webhook */}
                {webhookLogs.length > 0 && (
                  <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-white/10">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-slate-900 dark:text-white">Últimos Webhooks</h4>
                      <Button variant="outline" size="sm" onClick={fetchWebhookLogs}>
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Atualizar
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {webhookLogs.map((log, idx) => (
                        <div 
                          key={idx} 
                          className={`flex items-center justify-between p-3 rounded-lg text-sm ${
                            log.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/30' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              log.type === 'incoming' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                            }`}>
                              {log.type === 'incoming' ? 'Entrada' : 'Saída'}
                            </span>
                            <span className="text-slate-600 dark:text-slate-300">{log.event}</span>
                          </div>
                          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                            <span>{new Date(log.created_at).toLocaleString('pt-BR')}</span>
                            <span className={`w-2 h-2 rounded-full ${log.success ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
