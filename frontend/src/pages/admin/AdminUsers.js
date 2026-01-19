import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { Users, Plus, Edit, Trash2, X, Mail, User, Shield, Upload, Download, Lock, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'licenciado',
    phone: '',
    supervisor_id: '',
    password: ''
  });

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchUsers();
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

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ email: '', full_name: '', role: 'licenciado', phone: '', supervisor_id: '', password: '' });
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone || '',
      supervisor_id: user.supervisor_id || '',
      password: ''
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
      if (editingUser) {
        // Editar usuário
        await axios.put(`${API_URL}/api/users/${editingUser.id}`, formData);
        toast.success('Usuário atualizado com sucesso!');
      } else {
        // Criar usuário
        await axios.post(`${API_URL}/api/users/`, formData);
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
            <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">Gerenciar Usuários</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Criar, editar e excluir usuários do sistema</p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Usuário</span>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/5 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 dark:text-slate-400 text-sm">Total de Usuários</p>
              <Users className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <p className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">{users.length}</p>
          </div>
          <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/5 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 dark:text-slate-400 text-sm">Licenciados</p>
              <User className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">
              {users.filter(u => u.role === 'licenciado').length}
            </p>
          </div>
          <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/5 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 dark:text-slate-400 text-sm">Supervisores</p>
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">
              {users.filter(u => u.role === 'supervisor').length}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Usuário</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Email</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Telefone</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Nível</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Supervisor</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Pontos</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openEditModal(user)}
                        className="font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 hover:underline"
                      >
                        {user.full_name}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{user.email}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{user.phone || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{getSupervisorName(user.supervisor_id)}</td>
                    <td className="px-6 py-4 text-slate-900 dark:text-white font-semibold">{user.points || 0}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#151B28] rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nome Completo</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
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
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nível</label>
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

              {/* Campo Supervisor - só aparece se for licenciado */}
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

              {/* Campo Senha */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    {editingUser ? 'Nova Senha (deixe vazio para manter)' : 'Senha'}
                  </div>
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
                  {editingUser ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Importação */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#151B28] rounded-xl max-w-md w-full p-6">
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