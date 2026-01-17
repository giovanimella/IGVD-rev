import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { Settings, Users, BookOpen, Award, FileText, TrendingUp, Save, ClipboardCheck, Upload, Trash2, Image, Webhook, Key, RefreshCw, Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';

const AdminSystem = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [systemConfig, setSystemConfig] = useState({ 
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
      const response = await axios.get(`${API_URL}/api/system/config`);
      setSystemConfig({
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
          <p className="text-slate-600 mt-2">Controle total do sistema UniOzoxx LMS</p>
        </div>

        {/* Logo da Plataforma */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
              <Image className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h3 className="text-lg font-outfit font-semibold text-slate-900">Logo da Plataforma</h3>
              <p className="text-sm text-slate-500">Faça upload da logo UniOzoxx (PNG, máximo 10MB)</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Preview da Logo */}
            <div className="w-48 h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Logo UniOzoxx" 
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

          <p className="text-xs text-slate-500 mt-4">
            A logo será exibida na tela de login, no menu lateral e em outros lugares da plataforma.
          </p>
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
                data-testid="passing-score-input"
              />
              <p className="text-xs text-slate-500 mt-1">
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
