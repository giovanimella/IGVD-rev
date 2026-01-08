import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { Plus, Edit, Trash2, X, Upload, Image as ImageIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

const AdminBanners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    image_url: '',
    title: '',
    link: '',
    order: 0,
    active: true
  });

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/banners/all`);
      setBanners(response.data);
    } catch (error) {
      console.error('Erro ao buscar banners:', error);
      toast.error('Erro ao carregar banners');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande! Máximo 5MB');
      return;
    }

    setUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/api/banners/upload`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData({ ...formData, image_url: response.data.url });
      toast.success('Imagem enviada com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploading(false);
    }
  };

  const openCreateModal = () => {
    setEditingBanner(null);
    setFormData({ image_url: '', title: '', link: '', order: banners.length, active: true });
    setShowModal(true);
  };

  const openEditModal = (banner) => {
    setEditingBanner(banner);
    setFormData({
      image_url: banner.image_url,
      title: banner.title || '',
      link: banner.link || '',
      order: banner.order,
      active: banner.active
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.image_url) {
      toast.error('Por favor, faça upload de uma imagem');
      return;
    }

    try {
      if (editingBanner) {
        await axios.put(`${API_URL}/api/banners/${editingBanner.id}`, formData);
        toast.success('Banner atualizado com sucesso!');
      } else {
        await axios.post(`${API_URL}/api/banners/`, formData);
        toast.success('Banner criado com sucesso!');
      }
      setShowModal(false);
      fetchBanners();
    } catch (error) {
      console.error('Erro ao salvar banner:', error);
      toast.error('Erro ao salvar banner');
    }
  };

  const handleDelete = async (bannerId) => {
    if (!window.confirm('Tem certeza que deseja deletar este banner?')) return;

    try {
      await axios.delete(`${API_URL}/api/banners/${bannerId}`);
      toast.success('Banner deletado com sucesso!');
      fetchBanners();
    } catch (error) {
      console.error('Erro ao deletar banner:', error);
      toast.error('Erro ao deletar banner');
    }
  };

  const moveUp = async (banner, index) => {
    if (index === 0) return;
    const newOrder = banners[index - 1].order;
    try {
      await axios.put(`${API_URL}/api/banners/${banner.id}`, { order: newOrder });
      await axios.put(`${API_URL}/api/banners/${banners[index - 1].id}`, { order: banner.order });
      fetchBanners();
    } catch (error) {
      toast.error('Erro ao reordenar');
    }
  };

  const moveDown = async (banner, index) => {
    if (index === banners.length - 1) return;
    const newOrder = banners[index + 1].order;
    try {
      await axios.put(`${API_URL}/api/banners/${banner.id}`, { order: newOrder });
      await axios.put(`${API_URL}/api/banners/${banners[index + 1].id}`, { order: banner.order });
      fetchBanners();
    } catch (error) {
      toast.error('Erro ao reordenar');
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
            <h1 className="text-3xl font-outfit font-bold text-slate-900">Gerenciar Banners</h1>
            <p className="text-slate-600 mt-2">Banners rotativos da página inicial</p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Banner</span>
          </button>
        </div>

        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <ImageIcon className="w-5 h-5 text-cyan-600 mt-0.5" />
            <div>
              <p className="font-semibold text-cyan-900 mb-1">Resolução Recomendada</p>
              <p className="text-sm text-cyan-700">Desktop: 800x400px | Mobile: 800x600px</p>
              <p className="text-xs text-cyan-600 mt-1">Tamanho máximo: 5MB | Formatos: JPG, PNG, WebP</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {banners.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nenhum banner cadastrado</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {banners.map((banner, index) => (
                <div key={banner.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <img
                      src={`${API_URL}${banner.image_url}`}
                      alt={banner.title || 'Banner'}
                      className="w-32 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">
                        {banner.title || 'Sem título'}
                      </h3>
                      <p className="text-sm text-slate-600">Ordem: {banner.order}</p>
                      <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${
                        banner.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {banner.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => moveUp(banner, index)}
                        disabled={index === 0}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors disabled:opacity-30"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveDown(banner, index)}
                        disabled={index === banners.length - 1}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors disabled:opacity-30"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(banner)}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(banner.id)}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-outfit font-bold text-slate-900">
                {editingBanner ? 'Editar Banner' : 'Novo Banner'}
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
                <label className="block text-sm font-medium text-slate-700 mb-2">Imagem do Banner *</label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                  {formData.image_url ? (
                    <div>
                      <img
                        src={`${API_URL}${formData.image_url}`}
                        alt="Preview"
                        className="max-h-40 mx-auto rounded-lg mb-3"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image_url: '' })}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remover imagem
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-600 mb-1">Clique para fazer upload</p>
                      <p className="text-xs text-slate-500">800x400px (Desktop) ou 800x600px (Mobile)</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  )}
                  {uploading && <p className="text-sm text-cyan-600 mt-2">Enviando...</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Título (opcional)</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Ex: Novidades da Ozoxx"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Link (opcional)</label>
                <input
                  type="text"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Ex: /modules"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Ordem</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  min="0"
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
                  Banner ativo
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
                  disabled={!formData.image_url}
                  className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  {editingBanner ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdminBanners;