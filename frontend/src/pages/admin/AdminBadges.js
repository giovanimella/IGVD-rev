import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Award, Plus, Edit2, Trash2, X, Gift } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CRITERIA_TYPES = [
  { value: 'first_module', label: 'Primeiro Módulo Completo' },
  { value: 'modules_completed', label: 'X Módulos Completos' },
  { value: 'all_modules', label: 'Todos os Módulos Completos' },
  { value: 'points_reached', label: 'Alcançar X Pontos' },
  { value: 'days_streak', label: 'Streak de X Dias' },
  { value: 'manual', label: 'Concedido Manualmente' },
];

const BADGE_COLORS = [
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#22c55e', // green
  '#ef4444', // red
  '#f97316', // orange
];

const BADGE_ICONS = ['🏆', '⭐', '🎯', '🔥', '💎', '🥇', '🥈', '🥉', '🎖️', '🏅', '👑', '🚀', '💪', '🎓', '📚', '✨'];

const AdminBadges = () => {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBadge, setEditingBadge] = useState(null);
  const [users, setUsers] = useState([]);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '🏆',
    color: '#06b6d4',
    points_reward: 0,
    criteria_type: 'manual',
    criteria_value: 0,
    active: true
  });

  useEffect(() => {
    fetchBadges();
    fetchUsers();
  }, []);

  const fetchBadges = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/gamification/badges/all`);
      setBadges(response.data);
    } catch (error) {
      console.error('Erro ao buscar badges:', error);
      toast.error('Erro ao carregar badges');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users`);
      setUsers(response.data.filter(u => u.role === 'licenciado'));
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingBadge) {
        await axios.put(`${API_URL}/api/gamification/badges/${editingBadge.id}`, formData);
        toast.success('Badge atualizado com sucesso!');
      } else {
        await axios.post(`${API_URL}/api/gamification/badges`, formData);
        toast.success('Badge criado com sucesso!');
      }
      
      setShowModal(false);
      resetForm();
      fetchBadges();
    } catch (error) {
      console.error('Erro ao salvar badge:', error);
      toast.error('Erro ao salvar badge');
    }
  };

  const handleEdit = (badge) => {
    setEditingBadge(badge);
    setFormData({
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      color: badge.color,
      points_reward: badge.points_reward,
      criteria_type: badge.criteria_type,
      criteria_value: badge.criteria_value,
      active: badge.active
    });
    setShowModal(true);
  };

  const handleDelete = async (badgeId) => {
    if (!window.confirm('Tem certeza que deseja excluir este badge?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/gamification/badges/${badgeId}`);
      toast.success('Badge excluído com sucesso!');
      fetchBadges();
    } catch (error) {
      console.error('Erro ao excluir badge:', error);
      toast.error('Erro ao excluir badge');
    }
  };

  const handleAwardBadge = async () => {
    if (!selectedUserId || !selectedBadge) return;
    
    try {
      await axios.post(`${API_URL}/api/gamification/badges/${selectedBadge.id}/award/${selectedUserId}`);
      toast.success(`Badge "${selectedBadge.name}" concedido com sucesso!`);
      setShowAwardModal(false);
      setSelectedBadge(null);
      setSelectedUserId('');
    } catch (error) {
      console.error('Erro ao conceder badge:', error);
      toast.error(error.response?.data?.detail || 'Erro ao conceder badge');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      icon: '🏆',
      color: '#06b6d4',
      points_reward: 0,
      criteria_type: 'manual',
      criteria_value: 0,
      active: true
    });
    setEditingBadge(null);
  };

  const openNewBadgeModal = () => {
    resetForm();
    setShowModal(true);
  };

  const getCriteriaLabel = (type) => {
    return CRITERIA_TYPES.find(c => c.value === type)?.label || type;
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">Conquistas</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Gerencie as conquistas dos licenciados</p>
          </div>
          <button
            onClick={openNewBadgeModal}
            className="flex items-center gap-2 bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova Conquista
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-100 dark:border-white/5 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Total de Conquistas</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{badges.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-100 dark:border-white/5 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Conquistas Ativas</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{badges.filter(b => b.active).length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-100 dark:border-white/5 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Gift className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Total de Pontos</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{badges.reduce((acc, b) => acc + b.points_reward, 0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Conquistas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`bg-white dark:bg-[#151B28] rounded-xl border ${badge.active ? 'border-slate-100 dark:border-white/5' : 'border-red-200 dark:border-red-700/30 bg-red-50 dark:bg-red-900/20'} p-6 hover:shadow-lg dark:hover:border-cyan-500/30 transition-all`}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                  style={{ backgroundColor: `${badge.color}20` }}
                >
                  {badge.icon}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedBadge(badge);
                      setShowAwardModal(true);
                    }}
                    className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                    title="Conceder Badge"
                  >
                    <Gift className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleEdit(badge)}
                    className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(badge.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{badge.name}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{badge.description}</p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Critério:</span>
                  <span className="font-medium text-slate-900 dark:text-white">{getCriteriaLabel(badge.criteria_type)}</span>
                </div>
                {badge.criteria_value > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Valor:</span>
                    <span className="font-medium text-slate-900 dark:text-white">{badge.criteria_value}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Pontos:</span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">+{badge.points_reward} pts</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                    {badge.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {badges.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-[#151B28] rounded-xl border border-slate-100 dark:border-white/5">
            <Award className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Nenhum badge cadastrado</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">Crie badges para motivar seus licenciados!</p>
            <button
              onClick={openNewBadgeModal}
              className="bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition-colors"
            >
              Criar Primeiro Badge
            </button>
          </div>
        )}

        {/* Modal de Badge */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">
                  {editingBadge ? 'Editar Badge' : 'Novo Badge'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    rows={2}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Ícone</label>
                  <div className="flex flex-wrap gap-2">
                    {BADGE_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center border-2 transition-all ${
                          formData.icon === icon ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Cor</label>
                  <div className="flex flex-wrap gap-2">
                    {BADGE_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-10 h-10 rounded-lg border-2 transition-all ${
                          formData.color === color ? 'border-slate-900 scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Critério de Conquista</label>
                  <select
                    value={formData.criteria_type}
                    onChange={(e) => setFormData({ ...formData, criteria_type: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    {CRITERIA_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                {['modules_completed', 'points_reached', 'days_streak'].includes(formData.criteria_type) && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Valor do Critério
                    </label>
                    <input
                      type="number"
                      value={formData.criteria_value}
                      onChange={(e) => setFormData({ ...formData, criteria_value: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      min="0"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Pontos de Recompensa
                  </label>
                  <input
                    type="number"
                    value={formData.points_reward}
                    onChange={(e) => setFormData({ ...formData, points_reward: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    min="0"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 text-cyan-500 rounded"
                  />
                  <label htmlFor="active" className="text-sm text-slate-700">Badge ativo</label>
                </div>

                {/* Preview */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 mb-2">Preview:</p>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${formData.color}20` }}
                    >
                      {formData.icon}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{formData.name || 'Nome do Badge'}</p>
                      <p className="text-sm text-amber-600">+{formData.points_reward} pts</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
                  >
                    {editingBadge ? 'Salvar' : 'Criar Badge'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Conceder Badge */}
        {showAwardModal && selectedBadge && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Conceder Badge</h2>
                <button
                  onClick={() => setShowAwardModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${selectedBadge.color}20` }}
                  >
                    {selectedBadge.icon}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{selectedBadge.name}</p>
                    <p className="text-sm text-amber-600">+{selectedBadge.points_reward} pts</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Selecione o Licenciado
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="">Selecione...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAwardModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAwardBadge}
                    disabled={!selectedUserId}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Conceder
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminBadges;
