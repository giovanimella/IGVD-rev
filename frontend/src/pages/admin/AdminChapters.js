import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import axios from 'axios';
import { ArrowLeft, Plus, Edit, Trash2, Video, FileText, AlignLeft, Upload } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';

const AdminChapters = () => {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const [module, setModule] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingChapter, setEditingChapter] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    order: 1,
    content_type: 'video',
    video_url: '',
    document_url: '',
    text_content: '',
    duration_minutes: 0
  });

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchData();
  }, [moduleId]);

  const fetchData = async () => {
    try {
      const [moduleRes, chaptersRes] = await Promise.all([
        axios.get(`${API_URL}/api/modules/${moduleId}`),
        axios.get(`${API_URL}/api/chapters/module/${moduleId}`)
      ]);
      setModule(moduleRes.data);
      setChapters(chaptersRes.data);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar capítulos');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      order: chapters.length + 1,
      content_type: 'video',
      video_url: '',
      document_url: '',
      text_content: '',
      duration_minutes: 0
    });
    setEditingChapter(null);
  };

  const handleUploadVideo = async (file) => {
    if (!file) return;

    if (file.size > 500 * 1024 * 1024) {
      toast.error('Vídeo excede o limite de 500MB');
      return;
    }

    setUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    try {
      const response = await axios.post(
        `${API_URL}/api/upload/video`,
        uploadFormData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setFormData({ ...formData, video_url: response.data.url });
      toast.success('Vídeo enviado com sucesso!');
    } catch (error) {
      toast.error('Erro ao enviar vídeo');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadDocument = async (file) => {
    if (!file) return;

    setUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    try {
      const response = await axios.post(
        `${API_URL}/api/upload/document`,
        uploadFormData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setFormData({ ...formData, document_url: response.data.url });
      toast.success('Documento enviado com sucesso!');
    } catch (error) {
      toast.error('Erro ao enviar documento');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveChapter = async () => {
    try {
      const chapterData = {
        module_id: moduleId,
        title: formData.title,
        description: formData.description,
        order: formData.order,
        content_type: formData.content_type,
        video_url: formData.content_type === 'video' ? formData.video_url : null,
        document_url: formData.content_type === 'document' ? formData.document_url : null,
        text_content: formData.content_type === 'text' ? formData.text_content : null,
        duration_minutes: formData.duration_minutes
      };

      if (editingChapter) {
        await axios.put(`${API_URL}/api/chapters/${editingChapter.id}`, chapterData);
        toast.success('Capítulo atualizado com sucesso');
      } else {
        await axios.post(`${API_URL}/api/chapters/`, chapterData);
        toast.success('Capítulo criado com sucesso');
      }

      setShowDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Erro ao salvar capítulo');
    }
  };

  const handleEditChapter = (chapter) => {
    setEditingChapter(chapter);
    setFormData({
      title: chapter.title,
      description: chapter.description,
      order: chapter.order,
      content_type: chapter.content_type,
      video_url: chapter.video_url || '',
      document_url: chapter.document_url || '',
      text_content: chapter.text_content || '',
      duration_minutes: chapter.duration_minutes || 0
    });
    setShowDialog(true);
  };

  const handleDeleteChapter = async (chapterId) => {
    if (!window.confirm('Tem certeza que deseja deletar este capítulo?')) return;

    try {
      await axios.delete(`${API_URL}/api/chapters/${chapterId}`);
      toast.success('Capítulo deletado com sucesso');
      fetchData();
    } catch (error) {
      toast.error('Erro ao deletar capítulo');
    }
  };

  const getContentIcon = (type) => {
    switch (type) {
      case 'video': return Video;
      case 'document': return FileText;
      case 'text': return AlignLeft;
      default: return FileText;
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
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/modules')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Módulos
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-outfit font-bold text-slate-900">{module?.title}</h1>
              <p className="text-slate-600 mt-2">Gerencie os capítulos deste módulo</p>
            </div>

            <Button
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
              className="bg-cyan-500 hover:bg-cyan-600"
              data-testid="create-chapter-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Capítulo
            </Button>
          </div>
        </div>

        {chapters.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-outfit font-semibold text-slate-900 mb-2">Nenhum capítulo cadastrado</h3>
            <p className="text-slate-600 mb-6">Adicione o primeiro capítulo a este módulo.</p>
            <Button
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
              className="bg-cyan-500 hover:bg-cyan-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Capítulo
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {chapters.map((chapter, index) => {
              const Icon = getContentIcon(chapter.content_type);
              return (
                <div
                  key={chapter.id}
                  className="bg-white rounded-xl border border-slate-100 p-6 hover:shadow-md transition-all"
                  data-testid={`chapter-item-${chapter.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-cyan-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                            #{chapter.order}
                          </span>
                          <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded text-xs font-medium capitalize">
                            {chapter.content_type}
                          </span>
                          {chapter.duration_minutes > 0 && (
                            <span className="text-sm text-slate-500">
                              {chapter.duration_minutes} min
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-outfit font-semibold text-slate-900 mb-1">
                          {chapter.title}
                        </h3>
                        <p className="text-slate-600 text-sm">{chapter.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditChapter(chapter)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteChapter(chapter.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Dialog for Create/Edit */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingChapter ? 'Editar Capítulo' : 'Novo Capítulo'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="chapter-title">Título</Label>
                <Input
                  id="chapter-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Introdução ao Ozônio"
                />
              </div>

              <div>
                <Label htmlFor="chapter-description">Descrição</Label>
                <Textarea
                  id="chapter-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o conteúdo do capítulo..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="chapter-order">Ordem</Label>
                  <Input
                    id="chapter-order"
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                  />
                </div>

                <div>
                  <Label htmlFor="chapter-duration">Duração (minutos)</Label>
                  <Input
                    id="chapter-duration"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="content-type">Tipo de Conteúdo</Label>
                <Select
                  value={formData.content_type}
                  onValueChange={(value) => setFormData({ ...formData, content_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Vídeo</SelectItem>
                    <SelectItem value="document">Documento</SelectItem>
                    <SelectItem value="text">Texto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.content_type === 'video' && (
                <div className="space-y-2">
                  <Label>Upload de Vídeo (máx. 500MB)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept=".mp4,.mov,.avi,.webm"
                      onChange={(e) => handleUploadVideo(e.target.files[0])}
                      disabled={uploading}
                    />
                  </div>
                  {formData.video_url && (
                    <p className="text-sm text-green-600">✓ Vídeo carregado</p>
                  )}
                </div>
              )}

              {formData.content_type === 'document' && (
                <div className="space-y-2">
                  <Label>Upload de Documento</Label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                    onChange={(e) => handleUploadDocument(e.target.files[0])}
                    disabled={uploading}
                  />
                  {formData.document_url && (
                    <p className="text-sm text-green-600">✓ Documento carregado</p>
                  )}
                </div>
              )}

              {formData.content_type === 'text' && (
                <div>
                  <Label htmlFor="text-content">Conteúdo de Texto</Label>
                  <Textarea
                    id="text-content"
                    value={formData.text_content}
                    onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
                    placeholder="Digite o conteúdo do capítulo..."
                    rows={10}
                  />
                </div>
              )}

              <Button
                onClick={handleSaveChapter}
                disabled={uploading}
                className="w-full"
                data-testid="save-chapter-button"
              >
                {uploading ? 'Enviando arquivos...' : editingChapter ? 'Salvar Alterações' : 'Criar Capítulo'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default AdminChapters;