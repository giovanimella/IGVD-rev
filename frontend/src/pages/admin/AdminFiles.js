import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { FileText, Upload, Trash2, Download } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';

const AdminFiles = () => {
  const [files, setFiles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('other');
  const [uploading, setUploading] = useState(false);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [filesRes, categoriesRes] = await Promise.all([
        axios.get(`${API_URL}/api/files/`),
        axios.get(`${API_URL}/api/files/categories`)
      ]);
      setFiles(filesRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Erro ao buscar arquivos:', error);
      toast.error('Erro ao carregar arquivos');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFile = async () => {
    if (!selectedFile) {
      toast.error('Selecione um arquivo');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('category', selectedCategory);

    try {
      await axios.post(`${API_URL}/api/files/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Arquivo enviado com sucesso');
      setShowUploadDialog(false);
      setSelectedFile(null);
      setSelectedCategory('other');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      </Layout>
    );
  }

  const categoryGroups = categories.reduce((acc, cat) => {
    const categoryFiles = files.filter(f => f.category === cat.value);
    if (categoryFiles.length > 0) {
      acc[cat.value] = { label: cat.label, files: categoryFiles };
    }
    return acc;
  }, {});

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-outfit font-bold text-slate-900 flex items-center gap-3">
              <FileText className="w-8 h-8 text-cyan-500" />
              Gerenciar Arquivos
            </h1>
            <p className="text-slate-600 mt-2">Faça upload de materiais para os franqueados</p>
          </div>

          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button className="bg-cyan-500 hover:bg-cyan-600" data-testid="upload-file-button">
                <Upload className="w-4 h-4 mr-2" />
                Enviar Arquivo
              </Button>
            </DialogTrigger>
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
                  <Label htmlFor="category">Categoria</Label>
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
                <Button
                  onClick={handleUploadFile}
                  disabled={uploading}
                  className="w-full"
                  data-testid="confirm-upload-button"
                >
                  {uploading ? 'Enviando...' : 'Enviar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {Object.keys(categoryGroups).length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-outfit font-semibold text-slate-900 mb-2">Nenhum arquivo cadastrado</h3>
            <p className="text-slate-600">Faça upload de arquivos para disponibilizar aos franqueados.</p>
          </div>
        ) : (
          Object.entries(categoryGroups).map(([key, group]) => (
            <div key={key}>
              <h2 className="text-xl font-outfit font-semibold text-slate-900 mb-4">{group.label}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.files.map((file) => (
                  <div key={file.id} className="bg-white rounded-xl border border-slate-100 p-6" data-testid={`file-item-${file.id}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-cyan-600" />
                      </div>
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2 truncate" title={file.original_filename}>
                      {file.original_filename}
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">
                      {(file.file_size / 1024 / 1024).toFixed(2)} MB • {file.file_type.toUpperCase()}
                    </p>
                    <a href={`${API_URL}${file.file_url}`} download target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="w-full">
                        <Download className="w-4 h-4 mr-2" />
                        Baixar
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </Layout>
  );
};

export default AdminFiles;