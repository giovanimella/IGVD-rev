import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Target, Plus, Edit2, Trash2, X, Calendar, Trophy } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CHALLENGE_TYPES = [
  { value: 'complete_modules', label: 'Completar Módulos' },
  { value: 'complete_chapters', label: 'Completar Capítulos' },
  { value: 'earn_points', label: 'Acumular Pontos' },
  { value: 'daily_access', label: 'Acessos Diários' },
];

const AdminChallenges = () => {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    challenge_type: 'complete_chapters',
    target_value: 5,
    points_reward: 50,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    active: true
  });

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/gamification/challenges/all`);
      setChallenges(response.data);
    } catch (error) {
      console.error('Erro ao buscar desafios:', error);
      toast.error('Erro ao carregar desafios');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingChallenge) {
        await axios.put(`${API_URL}/api/gamification/challenges/${editingChallenge.id}`, formData);
        toast.success('Desafio atualizado com sucesso!');
      } else {
        await axios.post(`${API_URL}/api/gamification/challenges`, formData);
        toast.success('Desafio criado com sucesso!');
      }
      
      setShowModal(false);
      resetForm();
      fetchChallenges();
    } catch (error) {
      console.error('Erro ao salvar desafio:', error);
      toast.error('Erro ao salvar desafio');
    }
  };

  const handleEdit = (challenge) => {
    setEditingChallenge(challenge);
    setFormData({
      title: challenge.title,
      description: challenge.description,
      challenge_type: challenge.challenge_type,
      target_value: challenge.target_value,
      points_reward: challenge.points_reward,
      start_date: challenge.start_date,
      end_date: challenge.end_date,
      active: challenge.active
    });
    setShowModal(true);
  };

  const handleDelete = async (challengeId) => {
    if (!window.confirm('Tem certeza que deseja excluir este desafio?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/gamification/challenges/${challengeId}`);
      toast.success('Desafio excluído com sucesso!');
      fetchChallenges();
    } catch (error) {
      console.error('Erro ao excluir desafio:', error);
      toast.error('Erro ao excluir desafio');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      challenge_type: 'complete_chapters',
      target_value: 5,
      points_reward: 50,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      active: true
    });
    setEditingChallenge(null);
  };

  const openNewChallengeModal = () => {
    resetForm();
    setShowModal(true);
  };

  const getChallengeTypeLabel = (type) => {
    return CHALLENGE_TYPES.find(c => c.value === type)?.label || type;
  };

  const getChallengeStatus = (challenge) => {
    const today = new Date().toISOString().split('T')[0];
    if (!challenge.active) return { label: 'Inativo', color: 'bg-slate-100 text-slate-700' };
    if (challenge.start_date > today) return { label: 'Agendado', color: 'bg-blue-100 text-blue-700' };
    if (challenge.end_date < today) return { label: 'Encerrado', color: 'bg-red-100 text-red-700' };
    return { label: 'Ativo', color: 'bg-green-100 text-green-700' };
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
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

  const activeChallenges = challenges.filter(c => {
    const today = new Date().toISOString().split('T')[0];
    return c.active && c.start_date <= today && c.end_date >= today;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">Desafios Semanais</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Crie missões para engajar os licenciados</p>
          </div>
          <button
            onClick={openNewChallengeModal}
            className="flex items-center gap-2 bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Desafio
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-100 dark:border-white/5 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Total de Desafios</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{challenges.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-100 dark:border-white/5 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Desafios Ativos</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{activeChallenges.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-100 dark:border-white/5 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Pontos em Recompensas</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{activeChallenges.reduce((acc, c) => acc + c.points_reward, 0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Challenges List */}
        <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-100 dark:border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-white/5">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">Desafio</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">Tipo</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">Meta</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">Recompensa</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">Período</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {challenges.map((challenge) => {
                  const status = getChallengeStatus(challenge);
                  return (
                    <tr key={challenge.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{challenge.title}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs">{challenge.description}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600 dark:text-slate-400">{getChallengeTypeLabel(challenge.challenge_type)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{challenge.target_value}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-amber-600 dark:text-amber-400">+{challenge.points_reward} pts</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {formatDate(challenge.start_date)} - {formatDate(challenge.end_date)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(challenge)}
                            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(challenge.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {challenges.length === 0 && (
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Nenhum desafio cadastrado</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">Crie desafios semanais para motivar os licenciados!</p>
              <button
                onClick={openNewChallengeModal}
                className="bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition-colors"
              >
                Criar Primeiro Desafio
              </button>
            </div>
          )}
        </div>

        {/* Modal de Desafio */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">
                  {editingChallenge ? 'Editar Desafio' : 'Novo Desafio'}
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Maratona de Estudos"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ex: Complete 5 capítulos esta semana"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    rows={2}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Desafio</label>
                    <select
                      value={formData.challenge_type}
                      onChange={(e) => setFormData({ ...formData, challenge_type: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    >
                      {CHALLENGE_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Meta</label>
                    <input
                      type="number"
                      value={formData.target_value}
                      onChange={(e) => setFormData({ ...formData, target_value: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      min="1"
                      required
                    />
                  </div>
                </div>

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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data Início</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data Fim</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 text-cyan-500 rounded"
                  />
                  <label htmlFor="active" className="text-sm text-slate-700">Desafio ativo</label>
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
                    {editingChallenge ? 'Salvar' : 'Criar Desafio'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminChallenges;
