import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Layout as LayoutIcon,
  Image,
  Type,
  Palette,
  Save,
  Upload,
  Eye,
  RefreshCw,
  Plus,
  Trash2,
  Settings,
  FileText,
  Loader2,
  ExternalLink
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminLandingPage = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('hero');
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/landing/admin/config`);
      setConfig(response.data);
    } catch (error) {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/landing/admin/config`, config);
      toast.success('Configurações salvas!');
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadHero = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingHero(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/api/landing/admin/upload-hero-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setConfig({ ...config, hero_image_url: response.data.image_url });
      toast.success('Imagem carregada!');
    } catch (error) {
      toast.error('Erro ao carregar imagem');
    } finally {
      setUploadingHero(false);
    }
  };

  const handleUploadLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/api/landing/admin/upload-logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setConfig({ ...config, logo_url: response.data.image_url });
      toast.success('Logo carregado!');
    } catch (error) {
      toast.error('Erro ao carregar logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Tem certeza que deseja resetar para as configurações padrão?')) return;

    try {
      await axios.post(`${API_URL}/api/landing/admin/reset`);
      fetchConfig();
      toast.success('Configurações resetadas!');
    } catch (error) {
      toast.error('Erro ao resetar');
    }
  };

  const addFeature = () => {
    setConfig({
      ...config,
      features: [
        ...(config.features || []),
        { icon: 'star', title: 'Nova Feature', description: 'Descrição da feature' }
      ]
    });
  };

  const removeFeature = (index) => {
    const newFeatures = [...config.features];
    newFeatures.splice(index, 1);
    setConfig({ ...config, features: newFeatures });
  };

  const updateFeature = (index, field, value) => {
    const newFeatures = [...config.features];
    newFeatures[index] = { ...newFeatures[index], [field]: value };
    setConfig({ ...config, features: newFeatures });
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

  const tabs = [
    { id: 'hero', label: 'Hero Section', icon: LayoutIcon },
    { id: 'colors', label: 'Cores', icon: Palette },
    { id: 'features', label: 'Features', icon: Settings },
    { id: 'footer', label: 'Rodapé', icon: FileText }
  ];

  const iconOptions = [
    'graduation-cap', 'trophy', 'users', 'certificate', 'award', 
    'book', 'star', 'zap', 'play', 'check'
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">Landing Page</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Configure a página inicial pública</p>
          </div>
          <div className="flex items-center space-x-3">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-4 py-2 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-white/20"
            >
              <Eye className="w-4 h-4" />
              <span>Visualizar</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={handleReset}
              className="flex items-center space-x-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Resetar</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Salvar</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Tabs Laterais */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Preview de Cores */}
            <div className="mt-4 bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-4">
              <h4 className="font-medium text-slate-900 dark:text-white mb-3">Preview</h4>
              <div 
                className="h-20 rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${config?.primary_color || '#06b6d4'} 0%, ${config?.secondary_color || '#3b82f6'} 100%)`
                }}
              />
            </div>
          </div>

          {/* Conteúdo da Tab */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-6">
              
              {/* Tab: Hero Section */}
              {activeTab === 'hero' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Hero Section</h3>

                  {/* Logo */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Logo</label>
                      <div className="flex items-center space-x-4">
                        {config?.logo_url ? (
                          <img
                            src={`${API_URL}${config.logo_url}`}
                            alt="Logo"
                            className="h-12 w-auto bg-slate-100 dark:bg-white/10 rounded-lg p-2"
                          />
                        ) : (
                          <div className="h-12 w-24 bg-slate-100 dark:bg-white/10 rounded-lg flex items-center justify-center text-slate-400">
                            Logo
                          </div>
                        )}
                        <label className="cursor-pointer">
                          <input type="file" accept="image/*" onChange={handleUploadLogo} className="hidden" />
                          <span className="flex items-center space-x-2 px-4 py-2 bg-slate-100 dark:bg-white/10 rounded-lg hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300">
                            {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            <span>Upload</span>
                          </span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Alt do Logo</label>
                      <input
                        type="text"
                        value={config?.logo_alt || ''}
                        onChange={(e) => setConfig({ ...config, logo_alt: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Títulos */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Título Linha 1</label>
                      <input
                        type="text"
                        value={config?.hero_title_line1 || ''}
                        onChange={(e) => setConfig({ ...config, hero_title_line1: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Título Linha 2 (colorido)</label>
                      <input
                        type="text"
                        value={config?.hero_title_line2 || ''}
                        onChange={(e) => setConfig({ ...config, hero_title_line2: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Subtítulo (badge)</label>
                    <input
                      type="text"
                      value={config?.hero_subtitle || ''}
                      onChange={(e) => setConfig({ ...config, hero_subtitle: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Descrição</label>
                    <textarea
                      value={config?.hero_description || ''}
                      onChange={(e) => setConfig({ ...config, hero_description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Texto do Botão</label>
                    <input
                      type="text"
                      value={config?.hero_button_text || ''}
                      onChange={(e) => setConfig({ ...config, hero_button_text: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Imagem Principal */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Imagem Principal</label>
                    <div className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl p-6">
                      {config?.hero_image_url ? (
                        <div className="relative">
                          <img
                            src={`${API_URL}${config.hero_image_url}`}
                            alt="Hero"
                            className="w-full max-h-64 object-contain rounded-lg"
                          />
                          <button
                            onClick={() => setConfig({ ...config, hero_image_url: null })}
                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center cursor-pointer py-8">
                          <input type="file" accept="image/*" onChange={handleUploadHero} className="hidden" />
                          {uploadingHero ? (
                            <Loader2 className="w-12 h-12 text-slate-400 animate-spin" />
                          ) : (
                            <>
                              <Image className="w-12 h-12 text-slate-400 mb-3" />
                              <p className="text-slate-600 dark:text-slate-400">Clique para fazer upload</p>
                              <p className="text-sm text-slate-400">PNG, JPG ou WebP até 5MB</p>
                            </>
                          )}
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Cores */}
              {activeTab === 'colors' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Esquema de Cores</h3>

                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Cor Primária</label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={config?.primary_color || '#06b6d4'}
                          onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                          className="w-12 h-12 rounded-lg cursor-pointer border-0"
                        />
                        <input
                          type="text"
                          value={config?.primary_color || '#06b6d4'}
                          onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                          className="flex-1 px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Cor Secundária</label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={config?.secondary_color || '#3b82f6'}
                          onChange={(e) => setConfig({ ...config, secondary_color: e.target.value })}
                          className="w-12 h-12 rounded-lg cursor-pointer border-0"
                        />
                        <input
                          type="text"
                          value={config?.secondary_color || '#3b82f6'}
                          onChange={(e) => setConfig({ ...config, secondary_color: e.target.value })}
                          className="flex-1 px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Cor de Destaque</label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={config?.accent_color || '#f97316'}
                          onChange={(e) => setConfig({ ...config, accent_color: e.target.value })}
                          className="w-12 h-12 rounded-lg cursor-pointer border-0"
                        />
                        <input
                          type="text"
                          value={config?.accent_color || '#f97316'}
                          onChange={(e) => setConfig({ ...config, accent_color: e.target.value })}
                          className="flex-1 px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cores Predefinidas */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Paletas Predefinidas</label>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { primary: '#06b6d4', secondary: '#3b82f6', name: 'Cyan/Blue' },
                        { primary: '#8b5cf6', secondary: '#ec4899', name: 'Purple/Pink' },
                        { primary: '#10b981', secondary: '#06b6d4', name: 'Green/Cyan' },
                        { primary: '#f59e0b', secondary: '#ef4444', name: 'Amber/Red' },
                      ].map((palette, index) => (
                        <button
                          key={index}
                          onClick={() => setConfig({ ...config, primary_color: palette.primary, secondary_color: palette.secondary })}
                          className="p-3 border border-slate-200 dark:border-white/10 rounded-xl hover:border-slate-400 dark:hover:border-white/30 transition-colors"
                        >
                          <div 
                            className="h-8 rounded-lg mb-2"
                            style={{ background: `linear-gradient(135deg, ${palette.primary} 0%, ${palette.secondary} 100%)` }}
                          />
                          <p className="text-xs text-slate-600 dark:text-slate-400">{palette.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Features */}
              {activeTab === 'features' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Features</h3>
                    <div className="flex items-center space-x-3">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={config?.show_features || false}
                          onChange={(e) => setConfig({ ...config, show_features: e.target.checked })}
                          className="w-4 h-4 text-cyan-500 rounded"
                        />
                        <span className="text-sm text-slate-600 dark:text-slate-400">Mostrar seção</span>
                      </label>
                      <button
                        onClick={addFeature}
                        className="flex items-center space-x-2 px-3 py-1.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Adicionar</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Título da Seção</label>
                    <input
                      type="text"
                      value={config?.features_title || ''}
                      onChange={(e) => setConfig({ ...config, features_title: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-4">
                    {(config?.features || []).map((feature, index) => (
                      <div key={index} className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-sm font-medium text-slate-500">Feature {index + 1}</span>
                          <button
                            onClick={() => removeFeature(index)}
                            className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Ícone</label>
                            <select
                              value={feature.icon}
                              onChange={(e) => updateFeature(index, 'icon', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-white text-sm"
                            >
                              {iconOptions.map((icon) => (
                                <option key={icon} value={icon}>{icon}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Título</label>
                            <input
                              type="text"
                              value={feature.title}
                              onChange={(e) => updateFeature(index, 'title', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Descrição</label>
                            <input
                              type="text"
                              value={feature.description}
                              onChange={(e) => updateFeature(index, 'description', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-white text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab: Rodapé */}
              {activeTab === 'footer' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Rodapé</h3>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Texto do Rodapé</label>
                    <input
                      type="text"
                      value={config?.footer_text || ''}
                      onChange={(e) => setConfig({ ...config, footer_text: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="border-t border-slate-200 dark:border-white/10 pt-6">
                    <h4 className="font-medium text-slate-900 dark:text-white mb-4">SEO</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Título da Página (Meta Title)</label>
                        <input
                          type="text"
                          value={config?.meta_title || ''}
                          onChange={(e) => setConfig({ ...config, meta_title: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Descrição (Meta Description)</label>
                        <textarea
                          value={config?.meta_description || ''}
                          onChange={(e) => setConfig({ ...config, meta_description: e.target.value })}
                          rows={2}
                          className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminLandingPage;
