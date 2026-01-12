import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { FileText, Upload, Trash2, Download, FolderPlus, Folder, Edit2, X, ChevronDown, ChevronRight, MoveRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';

const FOLDER_ICONS = ['📁', '📂', '🗂️', '📚', '📖', '🎨', '📷', '🎬', '📊', '📈', '💼', '🏷️', '⭐', '🔥', '💡'];
const FOLDER_COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#ef4444', '#f97316'];

const AdminFiles = () => {
  const [data, setData] = useState({ folders: [], uncategorized: [] });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState({});
  
  // Upload dialog
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('other');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Folder dialog
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [folderForm, setFolderForm] = useState({
    name: '',
    description: '',
    icon: '📁',
    color: '#06b6d4',
    order: 0
  });
  
  // Move file dialog
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [movingFile, setMovingFile] = useState(null);
  const [targetFolderId, setTargetFolderId] = useState('');

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [filesRes, categoriesRes] = await Promise.all([
        axios.get(`${API_URL}/api/files/by-folder`),
        axios.get(`${API_URL}/api/files/categories`)
      ]);
      setData(filesRes.data);
      setCategories(categoriesRes.data);
      
      // Expandir todas as pastas por padrão
      const expanded = {};
      filesRes.data.folders.forEach(f => expanded[f.id] = true);
      setExpandedFolders(expanded);
    } catch (error) {
      console.error('Erro ao buscar arquivos:', error);
      toast.error('Erro ao carregar arquivos');
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // ===== UPLOAD =====
  const handleUploadFile = async () => {
    if (!selectedFile) {
      toast.error('Selecione um arquivo');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('category', selectedCategory);
    if (selectedFolderId) {
      formData.append('folder_id', selectedFolderId);
    }

    try {
      await axios.post(`${API_URL}/api/files/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Arquivo enviado com sucesso');
      setShowUploadDialog(false);
      setSelectedFile(null);
      setSelectedCategory('other');
      setSelectedFolderId('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  // ===== PASTAS =====
  const resetFolderForm = () => {
    setFolderForm({ name: '', description: '', icon: '📁', color: '#06b6d4', order: 0 });
    setEditingFolder(null);
  };

  const handleSaveFolder = async () => {
    if (!folderForm.name.trim()) {
      toast.error('Digite o nome da pasta');
      return;
    }

    try {
      if (editingFolder) {
        await axios.put(`${API_URL}/api/files/folders/${editingFolder.id}`, folderForm);
        toast.success('Pasta atualizada!');
      } else {
        await axios.post(`${API_URL}/api/files/folders`, folderForm);
        toast.success('Pasta criada!');
      }
      setShowFolderDialog(false);
      resetFolderForm();
      fetchData();
    } catch (error) {
      toast.error('Erro ao salvar pasta');
    }
  };

  const handleEditFolder = (folder) => {
    setEditingFolder(folder);
    setFolderForm({
      name: folder.name,
      description: folder.description || '',
      icon: folder.icon,
      color: folder.color,
      order: folder.order
    });
    setShowFolderDialog(true);
  };

  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm('Tem certeza? Os arquivos serão movidos para "Sem pasta".')) return;
    
    try {
      await axios.delete(`${API_URL}/api/files/folders/${folderId}`);
      toast.success('Pasta deletada');
      fetchData();
    } catch (error) {
      toast.error('Erro ao deletar pasta');
    }
  };

  // ===== ARQUIVOS =====
  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Tem certeza que deseja deletar este arquivo?')) return;

    try {
      await axios.delete(`${API_URL}/api/files/${fileId}`);
      toast.success('Arquivo deletado com sucesso');
      fetchData();
    } catch (error) {
      toast.error('Erro ao deletar arquivo');
    }
  };

  const handleMoveFile = async () => {
    if (!movingFile) return;
    
    try {
      await axios.put(`${API_URL}/api/files/${movingFile.id}`, {
        folder_id: targetFolderId || null
      });
      toast.success('Arquivo movido!');
      setShowMoveDialog(false);
      setMovingFile(null);
      setTargetFolderId('');
      fetchData();
    } catch (error) {
      toast.error('Erro ao mover arquivo');
    }
  };

  const openMoveDialog = (file) => {
    setMovingFile(file);
    setTargetFolderId(file.folder_id || '');
    setShowMoveDialog(true);
  };

  const renderFileCard = (file) => (
    <div key={file.id} className="bg-slate-50 rounded-lg p-4 flex items-center justify-between group">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-cyan-600" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-slate-900 truncate">{file.original_filename}</p>
          <p className="text-xs text-slate-500">
            {(file.file_size / 1024 / 1024).toFixed(2)} MB • {file.file_type.toUpperCase()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => openMoveDialog(file)}
          className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg"
          title="Mover para pasta"
        >
          <MoveRight className="w-4 h-4" />
        </button>
        <a href={`${API_URL}${file.file_url}`} download target="_blank" rel="noopener noreferrer">
          <button className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg">
            <Download className="w-4 h-4" />
          </button>
        </a>
        <button
          onClick={() => handleDeleteFile(file.id)}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

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
            <h1 className="text-3xl font-outfit font-bold text-slate-900">Gerenciar Arquivos</h1>
            <p className="text-slate-600 mt-1">Organize os materiais em pastas</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => { resetFolderForm(); setShowFolderDialog(true); }}
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Nova Pasta
            </Button>
            <Button
              className="bg-cyan-500 hover:bg-cyan-600"
              onClick={() => setShowUploadDialog(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Enviar Arquivo
            </Button>
          </div>
        </div>

        {/* Pastas */}
        <div className="space-y-4">
          {data.folders.map((folder) => (
            <div key={folder.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Folder Header */}
              <div
                className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                onClick={() => toggleFolder(folder.id)}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${folder.color}20` }}
                  >
                    {folder.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{folder.name}</h3>
                    <p className="text-sm text-slate-500">{folder.file_count} arquivo(s)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditFolder(folder); }}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {expandedFolders[folder.id] ? (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>
              
              {/* Folder Content */}
              {expandedFolders[folder.id] && (
                <div className="px-6 pb-4 space-y-2 border-t border-slate-100 pt-4">
                  {folder.files.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">Nenhum arquivo nesta pasta</p>
                  ) : (
                    folder.files.map(file => renderFileCard(file))
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Arquivos sem pasta */}
          {data.uncategorized.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <Folder className="w-6 h-6 text-slate-400" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Sem Pasta</h3>
                    <p className="text-sm text-slate-500">{data.uncategorized.length} arquivo(s)</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 space-y-2">
                {data.uncategorized.map(file => renderFileCard(file))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {data.folders.length === 0 && data.uncategorized.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhum arquivo cadastrado</h3>
              <p className="text-slate-600 mb-4">Crie pastas e faça upload de arquivos</p>
            </div>
          )}
        </div>

        {/* Upload Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Novo Arquivo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="file-upload">Arquivo</Label>
                <Input
                  id="file-upload"
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Pasta</Label>
                <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione uma pasta (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem pasta</SelectItem>
                    {data.folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.icon} {folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleUploadFile} disabled={uploading} className="w-full">
                {uploading ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Folder Dialog */}
        <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingFolder ? 'Editar Pasta' : 'Nova Pasta'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Nome da Pasta</Label>
                <Input
                  value={folderForm.name}
                  onChange={(e) => setFolderForm({ ...folderForm, name: e.target.value })}
                  placeholder="Ex: Materiais de Marketing"
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Input
                  value={folderForm.description}
                  onChange={(e) => setFolderForm({ ...folderForm, description: e.target.value })}
                  placeholder="Breve descrição"
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Ícone</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {FOLDER_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFolderForm({ ...folderForm, icon })}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center border-2 transition-all ${
                        folderForm.icon === icon ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {FOLDER_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFolderForm({ ...folderForm, color })}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        folderForm.color === color ? 'border-slate-900 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={folderForm.order}
                  onChange={(e) => setFolderForm({ ...folderForm, order: parseInt(e.target.value) || 0 })}
                  className="mt-2"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowFolderDialog(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleSaveFolder} className="flex-1">
                  {editingFolder ? 'Salvar' : 'Criar Pasta'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Move File Dialog */}
        <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mover Arquivo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {movingFile && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="font-medium text-slate-900">{movingFile.original_filename}</p>
                  <p className="text-sm text-slate-500">{(movingFile.file_size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              )}
              <div>
                <Label>Mover para</Label>
                <Select value={targetFolderId} onValueChange={setTargetFolderId}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione a pasta de destino" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem pasta</SelectItem>
                    {data.folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.icon} {folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowMoveDialog(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleMoveFile} className="flex-1">
                  Mover
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default AdminFiles;
