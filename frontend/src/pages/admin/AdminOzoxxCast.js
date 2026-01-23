import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import {
  Radio,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Upload,
  Film,
  Clock,
  Loader2,
  GripVertical
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

const AdminOzoxxCast = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    file: null
  });
  
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    active: true,
    order: 1
  });

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ozoxx-cast/videos`);
      setVideos(response.data);
    } catch (error) {
      console.error('Erro ao buscar vídeos:', error);
      toast.error('Erro ao carregar vídeos');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tipo
      const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Tipo de arquivo não permitido. Use MP4, WebM, MOV ou AVI.');
        return;
      }
      
      // Validar tamanho (max 500MB)
      const maxSize = 500 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('Arquivo muito grande. Tamanho máximo: 500MB');
        return;
      }
      
      setUploadForm({...uploadForm, file, title: uploadForm.title || file.name.replace(/\.[^/.]+$/, '')});
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!uploadForm.file) {
      toast.error('Selecione um arquivo de vídeo');
      return;
    }
    
    if (!uploadForm.title) {
      toast.error('Digite um título para o vídeo');
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description || '');
      formData.append('video', uploadForm.file);
      
      await axios.post(`${API_URL}/api/ozoxx-cast/videos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });
      
      toast.success('Vídeo enviado com sucesso!');
      setShowUploadModal(false);
      setUploadForm({ title: '', description: '', file: null });
      fetchVideos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao enviar vídeo');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const openEditModal = (video) => {
    setEditingVideo(video);
    setEditForm({
      title: video.title,
      description: video.description || '',
      active: video.active,
      order: video.order
    });
    setShowEditModal(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    
    try {
      await axios.put(`${API_URL}/api/ozoxx-cast/videos/${editingVideo.id}`, editForm);
      toast.success('Vídeo atualizado!');
      setShowEditModal(false);
      fetchVideos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao atualizar vídeo');
    }
  };

  const handleDelete = async (videoId) => {
    if (!window.confirm('Tem certeza que deseja excluir este vídeo?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/ozoxx-cast/videos/${videoId}`);
      toast.success('Vídeo excluído!');
      fetchVideos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao excluir vídeo');
    }
  };

  const toggleActive = async (video) => {
    try {
      await axios.put(`${API_URL}/api/ozoxx-cast/videos/${video.id}`, {
        active: !video.active
      });
      toast.success(video.active ? 'Vídeo ocultado' : 'Vídeo publicado');
      fetchVideos();
    } catch (error) {
      toast.error('Erro ao atualizar status');
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
              className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-outfit font-bold text-slate-900 dark:text-white">
                IGVD Cast
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Gerencie as gravações de lives
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowUploadModal(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            data-testid="upload-video-btn"
          >
            <Upload className="w-4 h-4 mr-2" />
            Enviar Vídeo
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Film className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total de Vídeos</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{videos.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Publicados</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {videos.filter(v => v.active).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Visualizações</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {videos.reduce((acc, v) => acc + (v.views || 0), 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Videos List */}
        {videos.length === 0 ? (
          <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/5 p-12 text-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Radio className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Nenhum vídeo cadastrado
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Envie o primeiro vídeo para começar
            </p>
            <Button onClick={() => setShowUploadModal(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Enviar Vídeo
            </Button>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Vídeo</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Tamanho</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Visualizações</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Status</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {videos.map((video) => (
                    <tr key={video.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                            <Film className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{video.title}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs">
                              {video.description || 'Sem descrição'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-600 dark:text-slate-400">{video.file_size_formatted}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-900 dark:text-white font-medium">{video.views || 0}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          video.active 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}>
                          {video.active ? 'Publicado' : 'Oculto'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleActive(video)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                            title={video.active ? 'Ocultar' : 'Publicar'}
                          >
                            {video.active ? (
                              <EyeOff className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            ) : (
                              <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            )}
                          </button>
                          <button
                            onClick={() => openEditModal(video)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          </button>
                          <button
                            onClick={() => handleDelete(video.id)}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Excluir"
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
      </div>

      {/* Modal de Upload */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-purple-500" />
              Enviar Novo Vídeo
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpload} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Arquivo de Vídeo *
              </label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                  uploadForm.file 
                    ? 'border-purple-300 bg-purple-50' 
                    : 'border-slate-300 hover:border-purple-400 hover:bg-purple-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                  onChange={handleFileChange}
                  className="hidden"
                  data-testid="video-file-input"
                />
                {uploadForm.file ? (
                  <div>
                    <Film className="w-10 h-10 text-purple-500 mx-auto mb-2" />
                    <p className="font-medium text-slate-900">{uploadForm.file.name}</p>
                    <p className="text-sm text-slate-500">
                      {(uploadForm.file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-600">Clique para selecionar um vídeo</p>
                    <p className="text-sm text-slate-400">MP4, WebM, MOV ou AVI (máx 500MB)</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Título *
              </label>
              <input
                type="text"
                value={uploadForm.title}
                onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Ex: Live de Lançamento - Janeiro 2025"
                required
                data-testid="video-title-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Descrição (opcional)
              </label>
              <textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                rows={3}
                placeholder="Descreva o conteúdo do vídeo..."
                data-testid="video-description-input"
              />
            </div>

            {uploading && (
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-purple-700">Enviando...</span>
                  <span className="text-sm font-medium text-purple-700">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                className="bg-gradient-to-r from-purple-500 to-pink-500"
                disabled={uploading || !uploadForm.file}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Enviar Vídeo
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Vídeo</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEdit} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Título *
              </label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Descrição
              </label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ordem
              </label>
              <input
                type="number"
                value={editForm.order}
                onChange={(e) => setEditForm({...editForm, order: parseInt(e.target.value) || 1})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                min="1"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-cyan-500 hover:bg-cyan-600">
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AdminOzoxxCast;
