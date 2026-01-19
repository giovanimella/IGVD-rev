import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { Settings, Users, BookOpen, Award, FileText, TrendingUp, Save, ClipboardCheck, Upload, Trash2, Image, Webhook, Key, RefreshCw, Copy, Eye, EyeOff, Trophy, GraduationCap, ShoppingCart, Radio, DollarSign, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';

const AdminSystem = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [systemConfig, setSystemConfig] = useState({ 
    platform_name: 'UniOzoxx',
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
        platform_name: response.data.platform_name || 'UniOzoxx',
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
      // Recarregar para atualizar o nome em todo o app
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
    let key = 'uniozoxx_';
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

    // Validar extensão
    if (!file.name.toLowerCase().endsWith('.png')) {
      toast.error('Apenas arquivos PNG são aceitos');
      return;
    }

    // Validar tamanho (10MB)
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
    },
    {
      title: 'Níveis da Plataforma',
      description: 'Configurar níveis e progressão dos licenciados',
      icon: Trophy,
      link: '/admin/levels',
      color: 'bg-yellow-500',
      count: '-'
    },
    {
      title: 'Treinamentos Presenciais',
      description: 'Gerenciar turmas e inscrições',
      icon: UserCheck,
      link: '/admin/training',
      color: 'bg-indigo-500',
      count: '-'
    },
    {
      title: 'Relatório de Vendas',
      description: 'Acompanhar vendas e comissões',
      icon: DollarSign,
      link: '/admin/sales',
      color: 'bg-emerald-500',
      count: '-'
    },
    {
      title: 'Ozoxx Cast',
      description: 'Gerenciar vídeos de lives',
      icon: Radio,
      link: '/admin/ozoxx-cast',
      color: 'bg-pink-500',
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
          <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">Painel Administrativo</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Controle total do sistema UniOzoxx LMS</p>
        </div>

        {/* Logo da Plataforma */}
        <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/5 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <Image className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-outfit font-semibold text-slate-900 dark:text-white">Identidade da Plataforma</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Configure o nome e logo da plataforma</p>
            </div>
          </div>

          {/* Nome da Plataforma */}
          <div className="mb-6 p-4 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Nome da Plataforma
            </label>
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={systemConfig.platform_name}
                onChange={(e) => setSystemConfig({ ...systemConfig, platform_name: e.target.value })}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#0B0F18] text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="Ex: UniOzoxx"
                data-testid="platform-name-input"
              />
              <Button
                onClick={saveSystemConfig}
                disabled={savingConfig}
                className="bg-cyan-500 hover:bg-cyan-600"
                data-testid="save-platform-name-btn"
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
            {/* Preview da Logo */}
            <div className="w-48 h-24 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-lg flex items-center justify-center bg-slate-50 dark:bg-white/5 overflow-hidden">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={systemConfig.platform_name}
                  className="max-w-full max-h-full object-contain p-2"
                  data-testid="current-logo-preview"
                />
              ) : (
                <span className="text-slate-400 text-sm">Nenhuma logo</span>
              )}
            </div>

            {/* Ações */}
            <div className="flex flex-col gap-2">
              <input
                ref={logoInputRef}
                type="file"
                accept=".png"
                onChange={handleLogoUpload}
                className="hidden"
                data-testid="logo-file-input"
              />
              <Button
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                variant="outline"
                data-testid="upload-logo-btn"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploadingLogo ? 'Enviando...' : logoUrl ? 'Alterar Logo' : 'Enviar Logo'}
              </Button>
              
              {logoUrl && (
                <Button
                  onClick={handleRemoveLogo}
                  variant="outline"
                  className="text-red-600 hover:bg-red-50 hover:border-red-200"
                  data-testid="remove-logo-btn"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover
                </Button>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
            A logo será exibida na tela de login e no menu lateral (PNG, máximo 10MB).
          </p>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/5 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${stat.bgColor} dark:bg-opacity-20 rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">{stat.label}</p>
                <p className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Ferramentas Administrativas */}
        <div>
          <h2 className="text-xl font-outfit font-semibold text-slate-900 dark:text-white mb-4">Ferramentas de Gestão</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <a
                  key={index}
                  href={card.link}
                  className="group bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/5 p-6 hover:border-cyan-200 dark:hover:border-cyan-500/30 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 ${card.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    {card.count !== '-' && (
                      <span className="bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white px-3 py-1 rounded-full text-sm font-semibold">
                        {card.count}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-outfit font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">{card.description}</p>
                </a>
              );
            })}
          </div>
        </div>

        {/* Configurações do Sistema */}
        <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/5 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
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
                data-testid="passing-score-input"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Esta nota será aplicada a todas as avaliações de módulos
              </p>
            </div>
            <button
              onClick={saveSystemConfig}
              disabled={savingConfig}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50"
              data-testid="save-config-btn"
            >
              <Save className="w-4 h-4" />
              {savingConfig ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* Resumo do Sistema */}
        <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/5 p-6">
          <h3 className="text-lg font-outfit font-semibold text-slate-900 dark:text-white mb-4">Resumo do Sistema</h3>
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

        {/* Configurações de Webhook */}
        <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/5 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Webhook className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-outfit font-semibold text-slate-900 dark:text-white">Webhooks</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Configure integrações com sistemas externos</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Webhook de Entrada - API Key */}
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
              
              <div className="space-y-3">
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
                        data-testid="webhook-api-key-input"
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
            </div>

            {/* Webhook de Saída - URL */}
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
                    data-testid="webhook-url-input"
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemConfig.webhook_enabled || false}
                      onChange={(e) => setSystemConfig({ ...systemConfig, webhook_enabled: e.target.checked })}
                      className="sr-only peer"
                      data-testid="webhook-enabled-toggle"
                    />
                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {systemConfig.webhook_enabled ? 'Webhook habilitado' : 'Webhook desabilitado'}
                  </span>
                </div>
              </div>
            </div>

            {/* Payload de exemplo */}
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
                data-testid="save-webhook-btn"
              >
                <Save className="w-4 h-4 mr-2" />
                {savingWebhook ? 'Salvando...' : 'Salvar Webhooks'}
              </Button>
            </div>
          </div>
        </div>

        {/* Logs de Webhook */}
        {webhookLogs.length > 0 && (
          <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-outfit font-semibold text-slate-900 dark:text-white">Últimos Webhooks</h3>
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
    </Layout>
  );
};

export default AdminSystem;
