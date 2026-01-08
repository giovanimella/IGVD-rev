import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { Users, Plus, Edit, Trash2, X, Mail, User, Shield } from 'lucide-react';
import { toast } from 'sonner';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'licenciado',
    phone: ''
  });

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users/`);
      setUsers(response.data);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ email: '', full_name: '', role: 'licenciado', phone: '' });
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone || ''
    });
    setShowModal(true);
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
            <h1 className="text-3xl font-outfit font-bold text-slate-900">Gerenciar Usuários</h1>
            <p className="text-slate-600 mt-2">Criar, editar e excluir usuários do sistema</p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Usuário</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 text-sm">Total de Usuários</p>
              <Users className="w-5 h-5 text-cyan-600" />
            </div>
            <p className="text-3xl font-outfit font-bold text-slate-900">{users.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 text-sm">Licenciados</p>
              <User className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-outfit font-bold text-slate-900">
              {users.filter(u => u.role === 'licenciado').length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 text-sm">Supervisores</p>
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-outfit font-bold text-slate-900">
              {users.filter(u => u.role === 'supervisor').length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Usuário</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Email</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Telefone</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Nível</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Pontos</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openEditModal(user)}
                        className="font-semibold text-cyan-600 hover:text-cyan-700 hover:underline"
                      >
                        {user.full_name}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{user.email}</td>
                    <td className="px-6 py-4 text-slate-600">{user.phone || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-900 font-semibold">{user.points || 0}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
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
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-outfit font-bold text-slate-900">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nome Completo</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                  disabled={!!editingUser}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Telefone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nível</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                >
                  <option value="licenciado">Licenciado</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
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
    </Layout>
  );
};

export default AdminUsers;