import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import {
  Trophy,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Save,
  X,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

const AdminLevels = () => {
  const navigate = useNavigate();
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    min_points: 0,
    icon: '⭐',
    color: '#3b82f6',
    description: ''
  });

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  const iconOptions = ['🌱', '📚', '⭐', '🚀', '🏆', '👑', '💎', '🔥', '⚡', '🎯', '🏅', '🥇'];
  const colorOptions = [
    { name: 'Cinza', value: '#6b7280' },
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Roxo', value: '#8b5cf6' },
    { name: 'Laranja', value: '#f59e0b' },
    { name: 'Vermelho', value: '#ef4444' },
    { name: 'Dourado', value: '#eab308' },
    { name: 'Verde', value: '#22c55e' },
    { name: 'Rosa', value: '#ec4899' },
    { name: 'Ciano', value: '#06b6d4' }
  ];

  useEffect(() => {
    fetchLevels();
  }, []);

  const fetchLevels = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/levels/`);
      setLevels(response.data);
    } catch (error) {
      console.error('Erro ao buscar níveis:', error);
      toast.error('Erro ao carregar níveis');
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setEditingLevel(null);
    setFormData({
      title: '',
      min_points: 0,
      icon: '⭐',
      color: '#3b82f6',
      description: ''
    });
    setShowModal(true);
  };

  const openEditModal = (level) => {
    setEditingLevel(level);
    setFormData({
      title: level.title,
      min_points: level.min_points,
      icon: level.icon,
      color: level.color,
      description: level.description || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Informe o título do nível');
      return;
    }
    
    try {
      if (editingLevel) {
        await axios.put(`${API_URL}/api/levels/${editingLevel.id}`, formData);
        toast.success('Nível atualizado com sucesso!');
      } else {
        await axios.post(`${API_URL}/api/levels/`, formData);
        toast.success('Nível criado com sucesso!');
      }
      setShowModal(false);
      fetchLevels();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar nível');
    }
  };

  const handleDelete = async (levelId) => {
    if (!window.confirm('Tem certeza que deseja excluir este nível?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/levels/${levelId}`);
      toast.success('Nível excluído!');
      fetchLevels();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao excluir nível');
    }
  };

  const seedDefaultLevels = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/levels/seed`);
      toast.success(response.data.message);
      fetchLevels();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar níveis padrão');
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/system')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-outfit font-bold text-slate-900">
                Níveis da Plataforma
              </h1>
              <p className="text-slate-600 mt-1">
                Configure os níveis que os licenciados podem alcançar
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {levels.length === 0 && (
              <Button
                onClick={seedDefaultLevels}
                variant="outline"
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Criar Níveis Padrão
              </Button>
            )}
            <Button
              onClick={openNewModal}
              className="bg-cyan-500 hover:bg-cyan-600"
              data-testid="new-level-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Nível
            </Button>
          </div>
        </div>

        {/* Lista de Níveis */}
        {levels.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Nenhum nível configurado
            </h3>
            <p className="text-slate-600 mb-4">
              Crie níveis para motivar seus licenciados a acumularem mais pontos
            </p>
            <Button onClick={seedDefaultLevels} variant="outline">
              <Sparkles className="w-4 h-4 mr-2" />
              Criar Níveis Padrão
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                      Ordem
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                      Nível
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                      Pontos Mínimos
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                      Descrição
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {levels.map((level, index) => (
                    <tr
                      key={level.id}
                      className="hover:bg-slate-50 transition-colors"
                      data-testid={`level-row-${level.id}`}
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-500">
                          #{index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                            style={{ backgroundColor: level.color + '20' }}
                          >
                            {level.icon}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{level.title}</p>
                            <div
                              className="w-4 h-1 rounded mt-1"
                              style={{ backgroundColor: level.color }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                          style={{ 
                            backgroundColor: level.color + '20',
                            color: level.color 
                          }}
                        >
                          {level.min_points.toLocaleString()} pts
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600">
                          {level.description || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(level)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            data-testid={`edit-level-${level.id}`}
                          >
                            <Edit className="w-4 h-4 text-slate-500" />
                          </button>
                          <button
                            onClick={() => handleDelete(level.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                            data-testid={`delete-level-${level.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Dica */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            <strong>Dica:</strong> Os níveis são atribuídos automaticamente aos licenciados 
            com base nos pontos acumulados. Configure pontos progressivos para incentivar 
            o engajamento contínuo.
          </p>
        </div>
      </div>

      {/* Modal de Nível */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingLevel ? 'Editar Nível' : 'Novo Nível'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Título do Nível *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="Ex: Intermediário"
                required
                data-testid="level-title-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Pontos Mínimos *
              </label>
              <input
                type="number"
                value={formData.min_points}
                onChange={(e) => setFormData({ ...formData, min_points: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                min="0"
                required
                data-testid="level-points-input"
              />
              <p className="text-xs text-slate-500 mt-1">
                Quantidade de pontos necessários para atingir este nível
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Ícone
              </label>
              <div className="flex flex-wrap gap-2">
                {iconOptions.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                      formData.icon === icon
                        ? 'bg-cyan-100 ring-2 ring-cyan-500'
                        : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Cor
              </label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`w-8 h-8 rounded-full transition-all ${
                      formData.color === color.value
                        ? 'ring-2 ring-offset-2 ring-slate-400'
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Descrição
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="Ex: Em fase de aprendizado"
                data-testid="level-description-input"
              />
            </div>

            {/* Preview */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-2">Pré-visualização:</p>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                  style={{ backgroundColor: formData.color + '20' }}
                >
                  {formData.icon}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{formData.title || 'Título'}</p>
                  <p className="text-sm" style={{ color: formData.color }}>
                    {formData.min_points.toLocaleString()} pontos
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-cyan-500 hover:bg-cyan-600"
                data-testid="save-level-btn"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingLevel ? 'Salvar Alterações' : 'Criar Nível'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AdminLevels;
