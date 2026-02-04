import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Users,
  Download,
  Save
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminTerms = () => {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [showAcceptances, setShowAcceptances] = useState(null);
  const [acceptances, setAcceptances] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    version: '1.0',
    is_active: true,
    is_required: true
  });

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/terms/admin/all`);
      setTerms(response.data.terms);
    } catch (error) {
      toast.error('Erro ao carregar termos');
    } finally {
      setLoading(false);
    }
  };

  const fetchAcceptances = async (termId) => {
    try {
      const response = await axios.get(`${API_URL}/api/terms/admin/${termId}/acceptances`);
      setAcceptances(response.data.acceptances);
      setShowAcceptances(response.data.term);
    } catch (error) {
      toast.error('Erro ao carregar aceites');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTerm) {
        await axios.put(`${API_URL}/api/terms/admin/${editingTerm.id}`, formData);
        toast.success('Termo atualizado!');
      } else {
        await axios.post(`${API_URL}/api/terms/admin`, formData);
        toast.success('Termo criado!');
      }
      setShowModal(false);
      setEditingTerm(null);
      setFormData({ title: '', content: '', version: '1.0', is_active: true, is_required: true });
      fetchTerms();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar termo');
    }
  };

  const handleDelete = async (termId) => {
    if (!window.confirm('Tem certeza que deseja excluir este termo?')) return;
    try {
      await axios.delete(`${API_URL}/api/terms/admin/${termId}`);
      toast.success('Termo excluído!');
      fetchTerms();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao excluir termo');
    }
  };

  const handleEdit = (term) => {
    setEditingTerm(term);
    setFormData({
      title: term.title,
      content: term.content,
      version: term.version,
      is_active: term.is_active,
      is_required: term.is_required
    });
    setShowModal(true);
  };

  const handleToggleActive = async (term) => {
    try {
      await axios.put(`${API_URL}/api/terms/admin/${term.id}`, {
        is_active: !term.is_active
      });
      toast.success(term.is_active ? 'Termo desativado' : 'Termo ativado');
      fetchTerms();
    } catch (error) {
      toast.error('Erro ao alterar status');
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">Termos de Aceite</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Gerencie os termos que os usuários devem aceitar</p>
          </div>
          <button
            onClick={() => { setShowModal(true); setEditingTerm(null); setFormData({ title: '', content: '', version: '1.0', is_active: true, is_required: true }); }}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Termo</span>
          </button>
        </div>

        {/* Lista de Termos */}
        <div className="grid gap-4">
          {terms.length === 0 ? (
            <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-12 text-center">
              <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Nenhum termo cadastrado</h3>
              <p className="text-slate-600 dark:text-slate-400">Crie o primeiro termo de aceite</p>
            </div>
          ) : (
            terms.map((term) => (
              <div key={term.id} className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{term.title}</h3>
                      <span className="text-sm text-slate-500 dark:text-slate-400">v{term.version}</span>
                      {term.is_active ? (
                        <span className="flex items-center space-x-1 px-2 py-1 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          <span>Ativo</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 px-2 py-1 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 text-xs font-medium rounded-full">
                          <XCircle className="w-3 h-3" />
                          <span>Inativo</span>
                        </span>
                      )}
                      {term.is_required && (
                        <span className="px-2 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
                          Obrigatório
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 line-clamp-2">
                      {term.content.replace(/<[^>]*>/g, '').substring(0, 200)}...
                    </p>
                    <div className="flex items-center space-x-4 mt-3 text-sm text-slate-500 dark:text-slate-400">
                      <span className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{term.acceptance_count || 0} aceites</span>
                      </span>
                      <span>Criado em {new Date(term.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => fetchAcceptances(term.id)}
                      className="p-2 text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 rounded-lg"
                      title="Ver aceites"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleEdit(term)}
                      className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg"
                      title="Editar"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(term)}
                      className={`p-2 rounded-lg ${term.is_active ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10' : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10'}`}
                      title={term.is_active ? 'Desativar' : 'Ativar'}
                    >
                      {term.is_active ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(term.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
                      title="Excluir"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal de Criar/Editar */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1b4c51] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200 dark:border-white/10">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingTerm ? 'Editar Termo' : 'Novo Termo'}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Título</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Versão</label>
                    <input
                      type="text"
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      required
                    />
                  </div>
                  <div className="flex items-center space-x-6 pt-6">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4 text-cyan-500 rounded focus:ring-cyan-500"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">Ativo</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_required}
                        onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                        className="w-4 h-4 text-cyan-500 rounded focus:ring-cyan-500"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">Obrigatório</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Conteúdo do Termo</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 h-64 font-mono text-sm"
                    placeholder="Digite o conteúdo do termo aqui... (Suporta HTML)"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setEditingTerm(null); }}
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600"
                  >
                    <Save className="w-4 h-4" />
                    <span>Salvar</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Aceites */}
        {showAcceptances && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1b4c51] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Aceites do Termo</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{showAcceptances.title} (v{showAcceptances.version})</p>
                </div>
                <button
                  onClick={() => { setShowAcceptances(null); setAcceptances([]); }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg"
                >
                  <XCircle className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {acceptances.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400">Nenhum aceite registrado</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/10">
                        <th className="text-left py-3 px-2 text-sm font-medium text-slate-600 dark:text-slate-400">Usuário</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-slate-600 dark:text-slate-400">Data/Hora</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-slate-600 dark:text-slate-400">IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acceptances.map((acc) => (
                        <tr key={acc.id} className="border-b border-slate-100 dark:border-white/5">
                          <td className="py-3 px-2">
                            <p className="font-medium text-slate-900 dark:text-white">{acc.user_name}</p>
                            <p className="text-sm text-slate-500">{acc.user_email}</p>
                          </td>
                          <td className="py-3 px-2 text-sm text-slate-600 dark:text-slate-400">
                            {new Date(acc.accepted_at).toLocaleString('pt-BR')}
                          </td>
                          <td className="py-3 px-2 text-sm text-slate-500 dark:text-slate-400">
                            {acc.ip_address || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminTerms;
