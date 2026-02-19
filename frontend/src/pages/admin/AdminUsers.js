import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import axios from 'axios';
import { Users, Plus, Edit, Trash2, X, Mail, User, Shield, Upload, Download, Lock, FileSpreadsheet, ArrowRight, AlertTriangle, Tag, Calendar, Award, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';

const AdminUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [stageUser, setStageUser] = useState(null);
  const [newStage, setNewStage] = useState('');
  const [updatingStage, setUpdatingStage] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'licenciado',
    phone: '',
    supervisor_id: '',
    category_ids: [],
    password: '',
    birthday: '',
    current_stage: 'registro',
    points: 0,
    level_title: 'Iniciante'
  });

  const STAGES = [
    { value: 'registro', label: 'Registro', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    { value: 'documentos_pf', label: 'Docs PF', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
    { value: 'acolhimento', label: 'Acolhimento', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300' },
    { value: 'treinamento_presencial', label: 'Treinamento', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
    { value: 'vendas_campo', label: 'Vendas em Campo', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
    { value: 'documentos_pj', label: 'Docs PJ', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300' },
    { value: 'completo', label: 'Completo', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' }
  ];

  const LEVELS = [
    'Iniciante',
    'Aprendiz',
    'Intermediário',
    'Avançado',
    'Expert',
    'Mestre'
  ];

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchUsers();
    fetchCategories();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users/`);
      setUsers(response.data);
      // Filtrar supervisores para o dropdown
      setSupervisors(response.data.filter(u => u.role === 'supervisor'));
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/categories/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ 
      email: '', 
      full_name: '', 
      role: 'licenciado', 
      phone: '', 
      supervisor_id: '', 
      category_ids: [], 
      password: '',
      birthday: '',
      current_stage: 'registro',
      points: 0,
      level_title: 'Iniciante'
    });
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    // Normalizar category_ids
    let categoryIds = user.category_ids || [];
    if (user.category_id && !categoryIds.includes(user.category_id)) {
      categoryIds = [...categoryIds, user.category_id];
    }
    
    setFormData({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone || '',
      supervisor_id: user.supervisor_id || '',
      category_ids: categoryIds,
      password: '',
      birthday: user.birthday || '',
      current_stage: user.current_stage || 'registro',
      points: user.points || 0,
      level_title: user.level_title || 'Iniciante'
    });
    setShowModal(true);
  };

  const downloadTemplate = () => {
    const template = 'email,full_name,phone,role,password\nexemplo@email.com,Nome Completo,11999999999,licenciado,senha123';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo_importacao_usuarios.csv';
    link.click();
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Selecione um arquivo');
      return;
    }

    setImporting(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', importFile);

    try {
      const response = await axios.post(`${API_URL}/api/users/import`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(`${response.data.imported} usuários importados!`);
      
      if (response.data.errors && response.data.errors.length > 0) {
        toast.error(`${response.data.errors.length} erro(s) na importação`);
        console.log('Erros:', response.data.errors);
      }
      
      setShowImportModal(false);
      setImportFile(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao importar usuários');
    } finally {
      setImporting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const dataToSend = { ...formData };
      // Converter points para número
      dataToSend.points = parseInt(dataToSend.points) || 0;
      
      if (editingUser) {
        // Editar usuário
        await axios.put(`${API_URL}/api/users/${editingUser.id}`, dataToSend);
        toast.success('Usuário atualizado com sucesso!');
      } else {
        // Criar usuário
        await axios.post(`${API_URL}/api/users/`, dataToSend);
        toast.success('Usuário criado com sucesso!');
      }
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      toast.error(error.response?.data?.detail || 'Erro ao salvar usuário');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Tem certeza que deseja deletar este usuário?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/users/${userId}`);
      toast.success('Usuário deletado com sucesso!');
      fetchUsers();
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      toast.error('Erro ao deletar usuário');
    }
  };

  const openStageModal = (user) => {
    setStageUser(user);
    setNewStage(user.current_stage || 'registro');
    setShowStageModal(true);
  };

  const handleUpdateStage = async () => {
    if (!stageUser || !newStage) return;
    
    setUpdatingStage(true);
    try {
      await axios.put(`${API_URL}/api/users/${stageUser.id}/stage`, {
        current_stage: newStage
      });
      toast.success(`Etapa atualizada para "${STAGES.find(s => s.value === newStage)?.label}" com sucesso!`);
      setShowStageModal(false);
      setStageUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Erro ao atualizar etapa:', error);
      toast.error(error.response?.data?.detail || 'Erro ao atualizar etapa');
    } finally {
      setUpdatingStage(false);
    }
  };

  const getStageInfo = (stage) => {
    return STAGES.find(s => s.value === stage) || STAGES[0];
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: 'bg-red-100 text-red-800',
      supervisor: 'bg-blue-100 text-blue-800',
      licenciado: 'bg-green-100 text-green-800'
    };
    return badges[role] || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Admin',
      supervisor: 'Supervisor',
      licenciado: 'Licenciado'
    };
    return labels[role] || role;
  };

  const getSupervisorName = (supervisorId) => {
    if (!supervisorId) return '-';
    const supervisor = supervisors.find(s => s.id === supervisorId);
    return supervisor ? supervisor.full_name : '-';
  };

  const toggleCategory = (categoryId) => {
    setFormData(prev => {
      const categoryIds = prev.category_ids || [];
      if (categoryIds.includes(categoryId)) {
        return { ...prev, category_ids: categoryIds.filter(id => id !== categoryId) };
      } else {
        return { ...prev, category_ids: [...categoryIds, categoryId] };
      }
    });
  };

  const getUserCategories = (user) => {
    const categoryIds = user.category_ids || [];
    if (user.category_id && !categoryIds.includes(user.category_id)) {
      categoryIds.push(user.category_id);
    }
    return categories.filter(c => categoryIds.includes(c.id));
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
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">Gerenciar Usuários</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Criar, editar e excluir usuários do sistema</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={openCreateModal}
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Novo Usuário</span>
            </button>
            <button
              onClick={() => navigate('/admin/categories')}
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-colors"
            >
              <Tag className="w-5 h-5" />
              <span>Categorias</span>
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-colors"
              data-testid="import-users-btn"
            >
              <Upload className="w-5 h-5" />
              <span>Importar</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 dark:text-slate-400 text-sm">Total de Usuários</p>
              <Users className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <p className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">{users.length}</p>
          </div>
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 dark:text-slate-400 text-sm">Licenciados</p>
              <User className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">
              {users.filter(u => u.role === 'licenciado').length}
            </p>
          </div>
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 dark:text-slate-400 text-sm">Supervisores</p>
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">
              {users.filter(u => u.role === 'supervisor').length}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Usuário</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Email</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Nível</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Categorias</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Etapa</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Pontos</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {users.map((user) => {
                  const stageInfo = getStageInfo(user.current_stage);
                  const userCategories = getUserCategories(user);
                  return (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openEditModal(user)}
                        className="font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 hover:underline"
                      >
                        {user.full_name}
                      </button>
                      {user.phone && (
                        <p className="text-xs text-slate-400 mt-1">{user.phone}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {userCategories.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {userCategories.slice(0, 2).map(cat => (
                            <span 
                              key={cat.id}
                              className="px-2 py-1 rounded text-xs font-medium"
                              style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                            >
                              {cat.icon} {cat.name}
                            </span>
                          ))}
                          {userCategories.length > 2 && (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              +{userCategories.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.role === 'licenciado' ? (
                        <button
                          onClick={() => openStageModal(user)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${stageInfo.color} hover:opacity-80 transition-opacity flex items-center gap-1`}
                          data-testid={`stage-btn-${user.id}`}
                        >
                          {stageInfo.label}
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-900 dark:text-white font-semibold">{user.points || 0}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                          title="Deletar"
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
        </div>
      </div>

      {/* Modal de Alterar Etapa */}
      <Dialog open={showStageModal} onOpenChange={setShowStageModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-cyan-500" />
              Alterar Etapa do Licenciado
            </DialogTitle>
            <DialogDescription>
              Alterando etapa de: <strong>{stageUser?.full_name}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  Alterar a etapa manualmente pode afetar o fluxo de onboarding do licenciado. 
                  Certifique-se de que esta ação é necessária.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Etapa Atual: <span className={`px-2 py-1 rounded text-xs ${getStageInfo(stageUser?.current_stage).color}`}>
                  {getStageInfo(stageUser?.current_stage).label}
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Nova Etapa
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STAGES.map((stage) => (
                  <button
                    key={stage.value}
                    type="button"
                    onClick={() => setNewStage(stage.value)}
                    className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      newStage === stage.value
                        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
                        : 'border-slate-200 dark:border-white/10 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {stage.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowStageModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpdateStage}
                disabled={updatingStage || newStage === stageUser?.current_stage}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600"
              >
                {updatingStage ? 'Salvando...' : 'Confirmar Alteração'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Criar/Editar Usuário */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10 flex-shrink-0">
              <h2 className="text-xl font-outfit font-bold text-slate-900 dark:text-white">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Informações Básicas */}
              <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Informações Básicas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nome Completo *</label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                      required
                      disabled={!!editingUser}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Telefone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Data de Nascimento
                      </div>
                    </label>
                    <input
                      type="date"
                      value={formData.birthday}
                      onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Nível e Permissões */}
              <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Nível e Permissões
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tipo de Usuário *</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                      required
                    >
                      <option value="licenciado">Licenciado</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {formData.role === 'licenciado' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Supervisor</label>
                      <select
                        value={formData.supervisor_id}
                        onChange={(e) => setFormData({ ...formData, supervisor_id: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                      >
                        <option value="">Nenhum supervisor</option>
                        {supervisors.map((supervisor) => (
                          <option key={supervisor.id} value={supervisor.id}>
                            {supervisor.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.role === 'licenciado' && editingUser && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        <div className="flex items-center gap-2">
                          <ArrowRight className="w-4 h-4" />
                          Etapa do Onboarding
                        </div>
                      </label>
                      <select
                        value={formData.current_stage}
                        onChange={(e) => setFormData({ ...formData, current_stage: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                      >
                        {STAGES.map(stage => (
                          <option key={stage.value} value={stage.value}>{stage.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Gamificação */}
              {editingUser && (
                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Gamificação
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4" />
                          Pontos
                        </div>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.points}
                        onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Título do Nível</label>
                      <select
                        value={formData.level_title}
                        onChange={(e) => setFormData({ ...formData, level_title: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                      >
                        {LEVELS.map(level => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Categorias */}
              {formData.role === 'licenciado' && categories.length > 0 && (
                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Categorias (pode selecionar várias)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {categories.map((category) => {
                      const isSelected = formData.category_ids?.includes(category.id);
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => toggleCategory(category.id)}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            isSelected
                              ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30'
                              : 'border-slate-200 dark:border-white/10 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-6 h-6 rounded flex items-center justify-center text-sm"
                              style={{ backgroundColor: `${category.color}20`, color: category.color }}
                            >
                              {category.icon}
                            </span>
                            <span className={`text-sm font-medium ${isSelected ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-700 dark:text-slate-300'}`}>
                              {category.name}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {formData.category_ids?.length > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      {formData.category_ids.length} categoria(s) selecionada(s)
                    </p>
                  )}
                </div>
              )}

              {/* Senha */}
              <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Segurança
                </h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {editingUser ? 'Nova Senha (deixe vazio para manter)' : 'Senha *'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                    placeholder={editingUser ? '••••••••' : 'Digite a senha'}
                    required={!editingUser}
                    minLength={6}
                    data-testid="user-password-input"
                  />
                  {!editingUser && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Mínimo 6 caracteres</p>
                  )}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
                >
                  {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Importação */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-outfit font-bold text-slate-900 dark:text-white">Importar Usuários</h2>
              <button
                onClick={() => { setShowImportModal(false); setImportFile(null); }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">Formato aceito: CSV</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Colunas: email, full_name, phone (opcional), role (opcional), password (opcional)
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={downloadTemplate}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-cyan-200 dark:border-cyan-700 text-cyan-700 dark:text-cyan-400 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-900/30 transition-colors"
                data-testid="download-template-btn"
              >
                <Download className="w-4 h-4" />
                Baixar Modelo de Importação
              </button>

              <div className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files?.[0])}
                  className="hidden"
                  id="import-file"
                  data-testid="import-file-input"
                />
                <label htmlFor="import-file" className="cursor-pointer">
                  <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {importFile ? importFile.name : 'Clique para selecionar arquivo'}
                  </p>
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowImportModal(false); setImportFile(null); }}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importFile || importing}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                  data-testid="confirm-import-btn"
                >
                  {importing ? 'Importando...' : 'Importar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdminUsers;
