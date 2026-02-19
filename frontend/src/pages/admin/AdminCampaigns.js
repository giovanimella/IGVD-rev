import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Trophy, Target, Calendar, Users, TrendingUp, Percent, Star, Award } from 'lucide-react';
import { Button } from '../../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    period_type: 'monthly',
    metric_type: 'frequency',
    target_value: 80,
    reward_description: '',
    start_date: '',
    end_date: '',
    is_active: true,
    icon: '🏆',
    color: '#f59e0b'
  });

  const PERIOD_TYPES = [
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'semiannual', label: 'Semestral' },
    { value: 'annual', label: 'Anual' }
  ];

  const METRIC_TYPES = [
    { value: 'frequency', label: 'Frequência de Apresentações', icon: Percent, description: '% de dias com 2+ apresentações' },
    { value: 'average_score', label: 'Média de Notas', icon: Star, description: 'Média das avaliações de módulos' },
    { value: 'points', label: 'Pontuação', icon: Award, description: 'Total de pontos na plataforma' }
  ];

  const COLORS = [
    { value: '#f59e0b', name: 'Dourado' },
    { value: '#3b82f6', name: 'Azul' },
    { value: '#10b981', name: 'Verde' },
    { value: '#ef4444', name: 'Vermelho' },
    { value: '#8b5cf6', name: 'Roxo' },
    { value: '#06b6d4', name: 'Ciano' },
    { value: '#ec4899', name: 'Rosa' }
  ];

  const ICONS = ['🏆', '🎯', '⭐', '🔥', '💎', '🥇', '🏅', '🎖️', '👑', '🚀'];

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/campaigns/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCampaigns(response.data);
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error);
      toast.error('Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (editingCampaign) {
        await axios.put(
          `${API_URL}/api/campaigns/${editingCampaign.id}`,
          formData,
          { headers }
        );
        toast.success('Campanha atualizada!');
      } else {
        await axios.post(`${API_URL}/api/campaigns/`, formData, { headers });
        toast.success('Campanha criada!');
      }

      setShowModal(false);
      setEditingCampaign(null);
      resetForm();
      fetchCampaigns();
    } catch (error) {
      console.error('Erro ao salvar campanha:', error);
      toast.error(error.response?.data?.detail || 'Erro ao salvar campanha');
    }
  };

  const resetForm = () => {
    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setFormData({
      name: '',
      description: '',
      period_type: 'monthly',
      metric_type: 'frequency',
      target_value: 80,
      reward_description: '',
      start_date: today.toISOString().split('T')[0],
      end_date: endOfMonth.toISOString().split('T')[0],
      is_active: true,
      icon: '🏆',
      color: '#f59e0b'
    });
  };

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description,
      period_type: campaign.period_type,
      metric_type: campaign.metric_type,
      target_value: campaign.target_value,
      reward_description: campaign.reward_description,
      start_date: campaign.start_date.split('T')[0],
      end_date: campaign.end_date.split('T')[0],
      is_active: campaign.is_active,
      icon: campaign.icon || '🏆',
      color: campaign.color || '#f59e0b'
    });
    setShowModal(true);
  };

  const handleDelete = async (campaignId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta campanha?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/campaigns/${campaignId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Campanha excluída');
      fetchCampaigns();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir campanha');
    }
  };

  const getMetricLabel = (type) => {
    const metric = METRIC_TYPES.find(m => m.value === type);
    return metric ? metric.label : type;
  };

  const getPeriodLabel = (type) => {
    const period = PERIOD_TYPES.find(p => p.value === type);
    return period ? period.label : type;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };

  const isActive = (campaign) => {
    const now = new Date();
    const start = new Date(campaign.start_date);
    const end = new Date(campaign.end_date);
    return campaign.is_active && now >= start && now <= end;
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-500" />
              Campanhas de Ranking
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Crie metas e recompensas para motivar seus licenciados</p>
          </div>
          <Button 
            onClick={() => {
              setEditingCampaign(null);
              resetForm();
              setShowModal(true);
            }}
            className="bg-amber-500 hover:bg-amber-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Campanha
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 dark:text-slate-400 text-sm">Total de Campanhas</p>
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">{campaigns.length}</p>
          </div>
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 dark:text-slate-400 text-sm">Campanhas Ativas</p>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">
              {campaigns.filter(c => isActive(c)).length}
            </p>
          </div>
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 dark:text-slate-400 text-sm">Finalizadas</p>
              <Target className="w-5 h-5 text-slate-500" />
            </div>
            <p className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">
              {campaigns.filter(c => new Date(c.end_date) < new Date()).length}
            </p>
          </div>
        </div>

        {/* Grid de Campanhas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/10 p-12 text-center">
              <Trophy className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400">Nenhuma campanha criada ainda</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">Crie campanhas para motivar seus licenciados!</p>
            </div>
          ) : (
            campaigns.map((campaign) => {
              const active = isActive(campaign);
              return (
                <div 
                  key={campaign.id}
                  className={`bg-white dark:bg-[#1b4c51] rounded-xl border overflow-hidden hover:shadow-lg transition-all ${
                    active 
                      ? 'border-amber-300 dark:border-amber-500/50' 
                      : 'border-slate-200 dark:border-white/10'
                  }`}
                >
                  {/* Header colorido */}
                  <div 
                    className="p-4 text-white"
                    style={{ backgroundColor: campaign.color || '#f59e0b' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{campaign.icon}</span>
                      <div className="flex gap-1">
                        {active && (
                          <span className="px-2 py-1 bg-white/20 rounded text-xs font-medium">
                            ATIVA
                          </span>
                        )}
                        <span className="px-2 py-1 bg-white/20 rounded text-xs font-medium">
                          {getPeriodLabel(campaign.period_type)}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mt-2">{campaign.name}</h3>
                  </div>

                  <div className="p-4 space-y-3">
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                      {campaign.description}
                    </p>

                    <div className="flex items-center gap-2 text-sm">
                      <Target className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-700 dark:text-slate-300">
                        Meta: <strong>{campaign.target_value}{campaign.metric_type === 'frequency' || campaign.metric_type === 'average_score' ? '%' : ' pts'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Award className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-700 dark:text-slate-300">
                        {getMetricLabel(campaign.metric_type)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-700 dark:text-slate-300">
                        {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                      </span>
                    </div>

                    {campaign.reward_description && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          🎁 {campaign.reward_description}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleEdit(campaign)}
                        className="flex-1 py-2 px-3 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(campaign.id)}
                        className="py-2 px-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal de Criar/Editar Campanha */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex-shrink-0">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                {editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Nome e Ícone */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Nome da Campanha *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
                    placeholder="Ex: Campanha de Frequência Março"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Ícone
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setFormData({...formData, icon})}
                        className={`w-8 h-8 flex items-center justify-center rounded text-lg transition-all ${
                          formData.icon === icon 
                            ? 'bg-amber-100 dark:bg-amber-900/30 ring-2 ring-amber-500' 
                            : 'hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Descrição
                </label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
                  placeholder="Descreva a campanha..."
                />
              </div>

              {/* Período e Tipo de Métrica */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Período *
                  </label>
                  <select
                    required
                    value={formData.period_type}
                    onChange={(e) => setFormData({...formData, period_type: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
                  >
                    {PERIOD_TYPES.map((period) => (
                      <option key={period.value} value={period.value}>{period.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Métrica *
                  </label>
                  <select
                    required
                    value={formData.metric_type}
                    onChange={(e) => setFormData({...formData, metric_type: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
                  >
                    {METRIC_TYPES.map((metric) => (
                      <option key={metric.value} value={metric.value}>{metric.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descrição da métrica */}
              <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {METRIC_TYPES.find(m => m.value === formData.metric_type)?.description}
                </p>
              </div>

              {/* Meta */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Meta a Atingir *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.1"
                    value={formData.target_value}
                    onChange={(e) => setFormData({...formData, target_value: parseFloat(e.target.value)})}
                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
                  />
                  <span className="text-slate-600 dark:text-slate-400 text-lg font-medium">
                    {formData.metric_type === 'points' ? 'pontos' : '%'}
                  </span>
                </div>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Data de Início *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Data de Término *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Recompensa */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Descrição da Recompensa
                </label>
                <input
                  type="text"
                  value={formData.reward_description}
                  onChange={(e) => setFormData({...formData, reward_description: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
                  placeholder="Ex: Vale presente de R$ 100"
                />
              </div>

              {/* Cor */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Cor da Campanha
                </label>
                <div className="flex gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({...formData, color: color.value})}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        formData.color === color.value 
                          ? 'border-slate-900 dark:border-white scale-110' 
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-white/5 rounded-lg">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Campanha ativa
                </label>
              </div>
            </form>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 flex-shrink-0">
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingCampaign(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1 bg-amber-500 hover:bg-amber-600"
                >
                  {editingCampaign ? 'Atualizar' : 'Criar Campanha'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdminCampaigns;
