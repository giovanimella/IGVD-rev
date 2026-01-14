import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { FileText, Download, Image, FileIcon, Folder, ChevronDown, ChevronRight, Video, File } from 'lucide-react';
import { Button } from '../components/ui/button';

const FileRepository = () => {
  const [data, setData] = useState({ folders: [], uncategorized: [] });
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState({});

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/files/by-folder`);
      setData(response.data);
      
      // Expandir todas as pastas por padrão
      const expanded = {};
      response.data.folders.forEach(f => expanded[f.id] = true);
      setExpandedFolders(expanded);
    } catch (error) {
      console.error('Erro ao buscar arquivos:', error);
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

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'image':
        return <Image className="w-5 h-5" />;
      case 'pdf':
        return <FileText className="w-5 h-5" />;
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'document':
        return <File className="w-5 h-5" />;
      default:
        return <FileIcon className="w-5 h-5" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const renderFileCard = (file) => (
    <div
      key={file.id}
      className="bg-white rounded-xl border border-slate-100 p-5 hover:shadow-lg hover:border-cyan-200 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-12 h-12 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl flex items-center justify-center text-cyan-600">
          {getFileIcon(file.file_type)}
        </div>
        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium uppercase">
          {file.file_type}
        </span>
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1 truncate" title={file.original_filename}>
        {file.original_filename}
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        {formatFileSize(file.file_size)}
      </p>
      <a href={`${API_URL}${file.file_url}`} download target="_blank" rel="noopener noreferrer">
        <Button className="w-full bg-cyan-500 hover:bg-cyan-600 group-hover:shadow-md transition-all">
          <Download className="w-4 h-4 mr-2" />
          Baixar
        </Button>
      </a>
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

  const totalFiles = data.folders.reduce((acc, f) => acc + f.files.length, 0) + data.uncategorized.length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-outfit font-bold">Banco de Arquivos</h1>
              <p className="text-white/90">Materiais, artes e recursos para sua franquia</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-white/80">
            <span>{data.folders.length} pasta(s)</span>
            <span>•</span>
            <span>{totalFiles} arquivo(s) disponíveis</span>
          </div>
        </div>

        {/* Pastas */}
        {data.folders.length > 0 && (
          <div className="space-y-4">
            {data.folders.map((folder) => (
              <div key={folder.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Folder Header */}
                <button
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  onClick={() => toggleFolder(folder.id)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                      style={{ backgroundColor: `${folder.color}15` }}
                    >
                      {folder.icon}
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-outfit font-semibold text-slate-900">{folder.name}</h3>
                      {folder.description && (
                        <p className="text-sm text-slate-500">{folder.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">{folder.file_count} arquivo(s)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${folder.color}20` }}
                    >
                      {expandedFolders[folder.id] ? (
                        <ChevronDown className="w-5 h-5" style={{ color: folder.color }} />
                      ) : (
                        <ChevronRight className="w-5 h-5" style={{ color: folder.color }} />
                      )}
                    </div>
                  </div>
                </button>

                {/* Folder Content */}
                {expandedFolders[folder.id] && folder.files.length > 0 && (
                  <div className="px-6 pb-6 pt-2 border-t border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {folder.files.map(file => renderFileCard(file))}
                    </div>
                  </div>
                )}

                {/* Empty Folder */}
                {expandedFolders[folder.id] && folder.files.length === 0 && (
                  <div className="px-6 pb-6 pt-2 border-t border-slate-100">
                    <p className="text-center text-slate-500 py-8">Esta pasta está vazia</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Arquivos sem pasta */}
        {data.uncategorized.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Folder className="w-6 h-6 text-slate-500" />
                </div>
                <div>
                  <h3 className="text-lg font-outfit font-semibold text-slate-900">Outros Arquivos</h3>
                  <p className="text-sm text-slate-500">{data.uncategorized.length} arquivo(s)</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {data.uncategorized.map(file => renderFileCard(file))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {data.folders.length === 0 && data.uncategorized.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <FileText className="w-20 h-20 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-outfit font-semibold text-slate-900 mb-2">Nenhum arquivo disponível</h3>
            <p className="text-slate-600">Os arquivos estarão disponíveis em breve.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default FileRepository;
