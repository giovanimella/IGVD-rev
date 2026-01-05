import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { FileText, Download, Image, FileIcon } from 'lucide-react';
import { Button } from '../components/ui/button';

const FileRepository = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/files/`);
      setFiles(response.data);
    } catch (error) {
      console.error('Erro ao buscar arquivos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'image':
        return <Image className="w-6 h-6" />;
      case 'pdf':
        return <FileText className="w-6 h-6" />;
      default:
        return <FileIcon className="w-6 h-6" />;
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      social_media: 'Redes Sociais',
      presentation: 'Apresentações',
      folder: 'Folders',
      banner: 'Banners',
      other: 'Outros'
    };
    return labels[category] || category;
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

  const categories = [...new Set(files.map(f => f.category))];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-slate-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-cyan-500" />
            Banco de Arquivos
          </h1>
          <p className="text-slate-600 mt-2">Materiais, artes e recursos para sua franquia</p>
        </div>

        {categories.map((category) => {
          const categoryFiles = files.filter(f => f.category === category);
          return (
            <div key={category}>
              <h2 className="text-xl font-outfit font-semibold text-slate-900 mb-4">{getCategoryLabel(category)}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryFiles.map((file) => (
                  <div key={file.id} className="bg-white rounded-xl border border-slate-100 p-6 hover:shadow-lg transition-all" data-testid={`file-card-${file.id}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center text-cyan-600">
                        {getFileIcon(file.file_type)}
                      </div>
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium uppercase">
                        {file.file_type}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2 truncate">{file.original_filename}</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      {(file.file_size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <a href={`${API_URL}${file.file_url}`} download target="_blank" rel="noopener noreferrer">
                      <Button className="w-full" data-testid={`download-button-${file.id}`}>
                        <Download className="w-4 h-4 mr-2" />
                        Baixar
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {files.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-outfit font-semibold text-slate-900 mb-2">Nenhum arquivo disponível</h3>
            <p className="text-slate-600">Os arquivos estarão disponíveis em breve.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default FileRepository;