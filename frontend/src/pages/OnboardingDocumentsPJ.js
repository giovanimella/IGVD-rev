import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import StageProgressBar from '../components/StageProgressBar';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Upload, FileText, CheckCircle, AlertCircle, Building2, FolderOpen, PartyPopper } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const OnboardingDocumentsPJ = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stageInfo, setStageInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [documentsPJ, setDocumentsPJ] = useState({});
  const [completed, setCompleted] = useState(false);

  const documents = [
    { key: 'cartao_cnpj', label: 'Cartão CNPJ', description: 'Comprovante de inscrição e situação cadastral' },
    { key: 'contrato_social', label: 'Contrato Social', description: 'Ou documento equivalente da empresa' }
  ];

  useEffect(() => {
    fetchStageInfo();
  }, []);

  const fetchStageInfo = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/onboarding/my-stage`);
      setStageInfo(response.data);
      setDocumentsPJ(response.data.documents_pj || {});
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
        `${API_URL}/api/onboarding/documents/pj/${documentType}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      toast.success(response.data.message);
      
      // Atualizar estado local
      setDocumentsPJ(prev => ({
        ...prev,
        [documentType]: {
          url: response.data.url,
          filename: file.name,
          uploaded_at: new Date().toISOString()
        }
      }));

      if (response.data.all_documents_uploaded) {
        setCompleted(true);
        toast.success('🎉 Parabéns! Onboarding concluído!');
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
    return documentsPJ[docKey] !== undefined;
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

  // Tela de conclusão
  if (completed || stageInfo?.current_stage === 'completo') {
    return (
      <Layout>
        <div className="space-y-6">
          <StageProgressBar currentStage="completo" />
          
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-8 lg:p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <PartyPopper className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-outfit font-bold text-green-800 mb-4">
              Onboarding Concluído!
            </h2>
            <p className="text-green-700 mb-6 max-w-md mx-auto">
              Parabéns! Você completou todas as etapas e agora tem acesso total à plataforma UniOzoxx.
            </p>
            <Button 
              onClick={() => navigate('/dashboard')}
              className="bg-green-600 hover:bg-green-700"
            >
              Ir para o Dashboard
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (stageInfo?.current_stage !== 'documentos_pj') {
    return (
      <Layout>
        <div className="space-y-6">
          <StageProgressBar currentStage={stageInfo?.current_stage} />
          <div className="bg-white rounded-xl border border-slate-200 p-8 lg:p-12 text-center">
            <AlertCircle className="w-12 lg:w-16 h-12 lg:h-16 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg lg:text-xl font-outfit font-semibold text-slate-900 mb-2">
              Etapa não disponível
            </h3>
            <p className="text-slate-600 mb-4">
              Você precisa completar as etapas anteriores antes de enviar os documentos PJ.
            </p>
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const uploadedCount = Object.keys(documentsPJ).length;
  const totalRequired = documents.length;

  return (
    <Layout>
      <div className="space-y-4 lg:space-y-6">
        <StageProgressBar currentStage={stageInfo?.current_stage} />

        <div>
          <h1 className="text-2xl lg:text-3xl font-outfit font-bold text-slate-900">
            Documentos Pessoa Jurídica
          </h1>
          <p className="text-slate-600 mt-1 lg:mt-2 text-sm lg:text-base">
            Última etapa! Envie os documentos da empresa para concluir.
          </p>
        </div>

        {/* Card da Pasta */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-4 lg:p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 lg:w-14 lg:h-14 bg-purple-500 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
            </div>
            <div>
              <h2 className="text-lg lg:text-xl font-outfit font-semibold text-slate-900">
                Pasta de Documentos PJ
              </h2>
              <p className="text-sm text-slate-600">
                {uploadedCount} de {totalRequired} documentos enviados
              </p>
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="w-full bg-white rounded-full h-2 mb-6">
            <div 
              className="bg-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(uploadedCount / totalRequired) * 100}%` }}
            />
          </div>

          {/* Lista de Documentos */}
          <div className="space-y-3">
            {documents.map((doc) => {
              const uploaded = isDocumentUploaded(doc.key);
              const isUploading = uploadingDoc === doc.key;
              const docInfo = documentsPJ[doc.key];

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
                        className={`cursor-pointer ${uploaded ? 'border-green-300 text-green-700 hover:bg-green-50' : 'bg-purple-600 hover:bg-purple-700'}`}
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
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4 lg:p-6">
          <h4 className="font-semibold text-purple-900 mb-2">Quase lá!</h4>
          <ul className="text-sm text-purple-700 space-y-1">
            <li>• Envie o Cartão CNPJ emitido pela Receita Federal</li>
            <li>• O Contrato Social deve estar registrado na Junta Comercial</li>
            <li>• Formatos aceitos: JPG, PNG ou PDF (máx. 10MB)</li>
            <li>• Após enviar todos os documentos, você terá acesso total à plataforma!</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default OnboardingDocumentsPJ;
