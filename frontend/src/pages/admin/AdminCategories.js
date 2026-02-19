import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Users, Tag, Search, Check, X, UserPlus } from 'lucide-react';
import { Button } from '../../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [usersSearch, setUsersSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [savingUsers, setSavingUsers] = useState(false);
  const [categoryStats, setCategoryStats] = useState({});
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    icon: '📁'
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/categories/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
      
      // Buscar estatísticas de cada categoria
      const stats = {};
      for (const cat of response.data) {
        try {
          const statsRes = await axios.get(`${API_URL}/api/categories/stats/${cat.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          stats[cat.id] = statsRes.data;
        } catch (e) {
          stats[cat.id] = { total_users: 0, active_users: 0 };
        }
      }
      setCategoryStats(stats);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/categories/all-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllUsers(response.data);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (editingCategory) {
        await axios.put(
          `${API_URL}/api/categories/${editingCategory.id}`,
          formData,
          { headers }
        );
        toast.success('Categoria atualizada!');
      } else {
        await axios.post(`${API_URL}/api/categories/`, formData, { headers });
        toast.success('Categoria criada!');
      }

      setShowModal(false);
      setEditingCategory(null);
      setFormData({ name: '', description: '', color: '#3b82f6', icon: '📁' });
      fetchCategories();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      toast.error(error.response?.data?.detail || 'Erro ao salvar categoria');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color,
      icon: category.icon || '📁'
    });
    setShowModal(true);
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta categoria?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/categories/${categoryId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Categoria excluída');
      fetchCategories();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir categoria');
    }
  };

  const openUsersModal = async (category) => {
    setSelectedCategory(category);
    setUsersSearch('');
    await fetchAllUsers();
    
    // Marcar usuários que já estão nesta categoria
    const usersInCategory = allUsers.filter(u => 
      u.category_ids?.includes(category.id) || u.category_id === category.id
    );
    setSelectedUserIds(usersInCategory.map(u => u.id));
    
    setShowUsersModal(true);
  };

  const toggleUserSelection = (userId) => {
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredUsers.map(u => u.id);
    setSelectedUserIds(prev => {
      const newSelection = [...new Set([...prev, ...filteredIds])];
      return newSelection;
    });
  };

  const deselectAllFiltered = () => {
    const filteredIds = filteredUsers.map(u => u.id);
    setSelectedUserIds(prev => prev.filter(id => !filteredIds.includes(id)));
  };

  const handleSaveUserAssignments = async () => {
    if (!selectedCategory) return;
    
    setSavingUsers(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Obter usuários que atualmente estão na categoria
      const currentUsersInCategory = allUsers.filter(u => 
        u.category_ids?.includes(selectedCategory.id) || u.category_id === selectedCategory.id
      ).map(u => u.id);
      
      // Usuários para adicionar (selecionados mas não estavam na categoria)
      const usersToAdd = selectedUserIds.filter(id => !currentUsersInCategory.includes(id));
      
      // Usuários para remover (estavam na categoria mas não estão selecionados)
      const usersToRemove = currentUsersInCategory.filter(id => !selectedUserIds.includes(id));
      
      // Adicionar usuários à categoria
      if (usersToAdd.length > 0) {
        await axios.post(`${API_URL}/api/categories/assign-bulk`, {
          category_id: selectedCategory.id,
          user_ids: usersToAdd
        }, { headers });
      }
      
      // Remover usuários da categoria
      if (usersToRemove.length > 0) {
        await axios.post(`${API_URL}/api/categories/remove-bulk`, {
          category_id: selectedCategory.id,
          user_ids: usersToRemove
        }, { headers });
      }
      
      toast.success(`Usuários atualizados! ${usersToAdd.length} adicionado(s), ${usersToRemove.length} removido(s)`);
      setShowUsersModal(false);
      fetchCategories();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao atualizar usuários');
    } finally {
      setSavingUsers(false);
    }
  };

  // Filtrar usuários baseado na busca
  const filteredUsers = allUsers.filter(user => {
    if (!usersSearch) return true;
    const search = usersSearch.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search)
    );
  });

  // Verificar se um usuário já está na categoria selecionada (antes das alterações)
  const isUserInCategory = (userId) => {
    if (!selectedCategory) return false;
    const user = allUsers.find(u => u.id === userId);
    if (!user) return false;
    return user.category_ids?.includes(selectedCategory.id) || user.category_id === selectedCategory.id;
  };

  const colors = [
    { value: '#3b82f6', name: 'Azul' },
    { value: '#10b981', name: 'Verde' },
    { value: '#f59e0b', name: 'Laranja' },
    { value: '#ef4444', name: 'Vermelho' },
    { value: '#8b5cf6', name: 'Roxo' },
    { value: '#06b6d4', name: 'Ciano' },
    { value: '#ec4899', name: 'Rosa' },
    { value: '#6b7280', name: 'Cinza' }
  ];

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
            <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">Categorias de Usuários</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Organize seus licenciados em categorias</p>
          </div>
          <Button 
            onClick={() => {
              setEditingCategory(null);
              setFormData({ name: '', description: '', color: '#3b82f6', icon: '📁' });
              setShowModal(true);
            }}
            className="bg-cyan-500 hover:bg-cyan-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Categoria
          </Button>
        </div>

        {/* Grid de Categorias */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/10 p-12 text-center">
              <Tag className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400">Nenhuma categoria criada ainda</p>
            </div>
          ) : (
            categories.map((category) => (
              <div 
                key={category.id}
                className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/10 p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${category.color}20`, color: category.color }}
                  >
                    {category.icon}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openUsersModal(category)}
                      className="p-2 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-lg transition-colors"
                      title="Gerenciar Usuários"
                    >
                      <UserPlus className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    </button>
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {category.name}
                </h3>
                
                {category.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    {category.description}
                  </p>
                )}

                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Users className="w-4 h-4" />
                  <span>{categoryStats[category.id]?.total_users || 0} usuários</span>
                </div>

                {/* Botão de gerenciar usuários */}
                <button
                  onClick={() => openUsersModal(category)}
                  className="w-full mt-4 py-2 px-4 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Gerenciar Usuários
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de Criar/Editar Categoria */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Nome da Categoria *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
                  placeholder="Ex: Iniciantes, Avançados, VIP..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Descrição
                </label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
                  placeholder="Descrição opcional da categoria..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Cor
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({...formData, color: color.value})}
                      className={`w-full h-10 rounded-lg border-2 transition-all ${
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

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Ícone (Emoji)
                </label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({...formData, icon: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#142d30] text-slate-900 dark:text-white text-2xl text-center"
                  placeholder="📁"
                  maxLength={2}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
                  Cole um emoji aqui (📁 🎯 🏆 ⭐ 💼 👥)
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingCategory(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600"
                >
                  {editingCategory ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Gerenciar Usuários da Categoria */}
      {showUsersModal && selectedCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${selectedCategory.color}20`, color: selectedCategory.color }}
                  >
                    {selectedCategory.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                      {selectedCategory.name}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Selecione os usuários que pertencem a esta categoria
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUsersModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
              </div>
            </div>

            {/* Barra de busca */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nome ou email..."
                    value={usersSearch}
                    onChange={(e) => setUsersSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllFiltered}
                    className="px-3 py-2 text-sm bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded-lg hover:bg-cyan-200 dark:hover:bg-cyan-900/50 transition-colors"
                  >
                    Selecionar Todos
                  </button>
                  <button
                    onClick={deselectAllFiltered}
                    className="px-3 py-2 text-sm bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
                  >
                    Limpar Seleção
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {selectedUserIds.length} usuário(s) selecionado(s) • {filteredUsers.length} usuário(s) encontrado(s)
              </p>
            </div>

            {/* Lista de usuários */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-2">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum usuário encontrado</p>
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = selectedUserIds.includes(user.id);
                    const wasInCategory = isUserInCategory(user.id);
                    
                    return (
                      <button
                        key={user.id}
                        onClick={() => toggleUserSelection(user.id)}
                        className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                          isSelected
                            ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30'
                            : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'border-cyan-500 bg-cyan-500'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900 dark:text-white truncate">
                              {user.full_name}
                            </p>
                            {wasInCategory && (
                              <span className="px-2 py-0.5 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                Já na categoria
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                            {user.email}
                          </p>
                        </div>
                        
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            : user.role === 'supervisor'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        }`}>
                          {user.role === 'admin' ? 'Admin' : user.role === 'supervisor' ? 'Supervisor' : 'Licenciado'}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer com botões */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 flex-shrink-0">
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setShowUsersModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveUserAssignments}
                  disabled={savingUsers}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600"
                >
                  {savingUsers ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdminCategories;
