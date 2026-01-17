import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import StageProgressBar from '../components/StageProgressBar';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Upload, FileText, CheckCircle, AlertCircle, User, FolderOpen } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const OnboardingDocuments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stageInfo, setStageInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [documentsPF, setDocumentsPF] = useState({});

  const documents = [
    { key: 'rg', label: 'RG (Identidade)', description: 'Frente e verso do documento' },
    { key: 'cpf', label: 'CPF', description: 'Cadastro de Pessoa Física' },
    { key: 'comprovante_residencia', label: 'Comprovante de Residência', description: 'Últimos 3 meses' }
  ];

  useEffect(() => {
    fetchStageInfo();
  }, []);

  const fetchStageInfo = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/onboarding/my-stage`);
      setStageInfo(response.data);
      setDocumentsPF(response.data.documents_pf || {});
    } catch (error) {
      console.error('Erro ao buscar informações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (documentType, file) => {
    if (!file) return;

    const validExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      toast.error('Formato inválido. Use JPG, PNG ou PDF');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB');
      return;
    }

    setUploadingDoc(documentType);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(
        `${API_URL}/api/onboarding/documents/pf/${documentType}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      toast.success(response.data.message);
      
      // Atualizar estado local
      setDocumentsPF(prev => ({
        ...prev,
        [documentType]: {
          url: response.data.url,
          filename: file.name,
          uploaded_at: new Date().toISOString()
        }
      }));

      if (response.data.all_documents_uploaded) {
        toast.success('Todos os documentos enviados! Redirecionando...');
        setTimeout(() => {
          navigate('/onboarding/payment');
        }, 2000);
      } else {
        fetchStageInfo();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao enviar documento');
    } finally {
      setUploadingDoc(null);
    }
  };

  const isDocumentUploaded = (docKey) => {
    return documentsPF[docKey] !== undefined;
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

  // Compatibilidade com estágio antigo
  const currentStage = stageInfo?.current_stage === 'documentos' ? 'documentos_pf' : stageInfo?.current_stage;

  if (currentStage !== 'documentos_pf') {
    return (
      <Layout>
        <div className="space-y-6">
          <StageProgressBar currentStage={currentStage} />
          <div className="bg-white rounded-xl border border-slate-200 p-8 lg:p-12 text-center">
            <AlertCircle className="w-12 lg:w-16 h-12 lg:h-16 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg lg:text-xl font-outfit font-semibold text-slate-900 mb-2">
              Etapa de Documentos PF já Concluída
            </h3>
            <p className="text-slate-600">Você já enviou todos os documentos de Pessoa Física.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const uploadedCount = Object.keys(documentsPF).length;
  const totalRequired = documents.length;

  return (
    <Layout>
      <div className="space-y-4 lg:space-y-6">
        <StageProgressBar currentStage={currentStage} />

        <div>
          <h1 className="text-2xl lg:text-3xl font-outfit font-bold text-slate-900">
            Documentos Pessoa Física
          </h1>
          <p className="text-slate-600 mt-1 lg:mt-2 text-sm lg:text-base">
            Envie os documentos pessoais para continuar
          </p>
        </div>

        {/* Card da Pasta */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-cyan-200 p-4 lg:p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 lg:w-14 lg:h-14 bg-cyan-500 rounded-xl flex items-center justify-center">
              <FolderOpen className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
            </div>
            <div>
              <h2 className="text-lg lg:text-xl font-outfit font-semibold text-slate-900">
                Pasta de Documentos PF
              </h2>
              <p className="text-sm text-slate-600">
                {uploadedCount} de {totalRequired} documentos enviados
              </p>
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="w-full bg-white rounded-full h-2 mb-6">
            <div 
              className="bg-cyan-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(uploadedCount / totalRequired) * 100}%` }}
            />
          </div>

          {/* Lista de Documentos */}
          <div className="space-y-3">
            {documents.map((doc) => {
              const uploaded = isDocumentUploaded(doc.key);
              const isUploading = uploadingDoc === doc.key;
              const docInfo = documentsPF[doc.key];

              return (
                <div
                  key={doc.key}
                  data-testid={`document-card-${doc.key}`}
                  className={`bg-white rounded-lg border p-4 transition-all ${
                    uploaded ? 'border-green-300' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        uploaded ? 'bg-green-100' : 'bg-slate-100'
                      }`}>
                        {uploaded ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <FileText className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900">{doc.label}</h3>
                        <p className="text-xs text-slate-500">{doc.description}</p>
                        {docInfo && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ {docInfo.filename}
                          </p>
                        )}
                      </div>
                    </div>

                    <label className="block">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => handleFileUpload(doc.key, e.target.files[0])}
                        className="hidden"
                        data-testid={`upload-${doc.key}`}
                      />
                      <Button
                        as="span"
                        size="sm"
                        disabled={isUploading}
                        variant={uploaded ? "outline" : "default"}
                        className={`cursor-pointer ${uploaded ? 'border-green-300 text-green-700 hover:bg-green-50' : ''}`}
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        {isUploading ? 'Enviando...' : uploaded ? 'Alterar' : 'Enviar'}
                      </Button>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Informações */}
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 lg:p-6">
          <h4 className="font-semibold text-amber-900 mb-2">Informações Importantes:</h4>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>• Certifique-se de que os documentos estejam legíveis</li>
            <li>• Formatos aceitos: JPG, PNG ou PDF (máx. 10MB)</li>
            <li>• Esses documentos ficarão armazenados para consulta</li>
            <li>• Após enviar todos os documentos, você será direcionado para o pagamento</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default OnboardingDocuments;
