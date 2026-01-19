import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { Plus, Edit, Trash2, X, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AdminPosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    active: true
  });

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/posts/manage`);
      setPosts(response.data);
    } catch (error) {
      console.error('Erro ao buscar posts:', error);
      toast.error('Erro ao carregar posts');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingPost(null);
    setFormData({ title: '', description: '', content: '', active: true });
    setShowModal(true);
  };

  const openEditModal = (post) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      description: post.description,
      content: post.content,
      active: post.active
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.content) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (editingPost) {
        await axios.put(`${API_URL}/api/posts/${editingPost.id}`, formData);
        toast.success('Post atualizado com sucesso!');
      } else {
        await axios.post(`${API_URL}/api/posts/`, formData);
        toast.success('Post criado com sucesso!');
      }
      setShowModal(false);
      fetchPosts();
    } catch (error) {
      console.error('Erro ao salvar post:', error);
      toast.error('Erro ao salvar post');
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Tem certeza que deseja deletar este post?')) return;

    try {
      await axios.delete(`${API_URL}/api/posts/${postId}`);
      toast.success('Post deletado com sucesso!');
      fetchPosts();
    } catch (error) {
      console.error('Erro ao deletar post:', error);
      toast.error('Erro ao deletar post');
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">Gerenciar Comunicados</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Posts de novidades e avisos para licenciados</p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Post</span>
          </button>
        </div>

        <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">Nenhum post cadastrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Título</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Descrição</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Autor</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Data</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Status</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900 dark:text-white">{post.title}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2">{post.description}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">{post.author_name}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">
                        {format(new Date(post.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          post.active ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400'
                        }`}>
                          {post.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => openEditModal(post)}
                            className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 rounded-lg transition-colors"
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
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-outfit font-bold text-slate-900">
                {editingPost ? 'Editar Post' : 'Novo Post'}
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
                <label className="block text-sm font-medium text-slate-700 mb-2">Título *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Ex: Novidades de Janeiro 2026"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Descrição Breve *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  rows="2"
                  placeholder="Breve resumo que aparecerá na lista"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Conteúdo Completo *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  rows="10"
                  placeholder="Texto completo do comunicado que aparecerá no popup"
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                />
                <label htmlFor="active" className="ml-2 text-sm text-slate-700">
                  Post ativo (visível para licenciados)
                </label>
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
                  {editingPost ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdminPosts;