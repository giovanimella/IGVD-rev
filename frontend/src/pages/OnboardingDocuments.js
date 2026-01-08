import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import StageProgressBar from '../components/StageProgressBar';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const OnboardingDocuments = () => {
  const { user } = useAuth();
  const [stageInfo, setStageInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingDoc, setUploadingDoc] = useState(null);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  const documents = [
    { key: 'cpf', label: 'CPF', icon: FileText },
    { key: 'rg', label: 'RG', icon: FileText },
    { key: 'comprovante_endereco', label: 'Comprovante de Endereço', icon: FileText }
  ];

  useEffect(() => {
    fetchStageInfo();
  }, []);

  const fetchStageInfo = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/onboarding/my-stage`);
      setStageInfo(response.data);
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

    setUploadingDoc(documentType);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(
        `${API_URL}/api/onboarding/upload-document/${documentType}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      toast.success(response.data.message);
      fetchStageInfo();

      if (response.data.all_documents_uploaded) {
        toast.success('Todos os documentos enviados! Redirecionando para pagamento...');
        setTimeout(() => {
          window.location.href = '/onboarding/payment';
        }, 2000);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao enviar documento');
    } finally {
      setUploadingDoc(null);
    }
  };

  const isDocumentUploaded = (docKey) => {
    return stageInfo?.documents_uploaded?.some(doc => doc.startsWith(docKey));
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

  if (stageInfo?.current_stage !== 'documentos') {
    return (
      <Layout>
        <div className="space-y-6">
          <StageProgressBar currentStage={stageInfo?.current_stage} />
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h3 className="text-xl font-outfit font-semibold text-slate-900 mb-2">
              Etapa de Documentos já Concluída
            </h3>
            <p className="text-slate-600">Você já enviou todos os documentos necessários.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <StageProgressBar currentStage={stageInfo?.current_stage} />

        <div>
          <h1 className="text-3xl font-outfit font-bold text-slate-900">Envio de Documentos</h1>
          <p className="text-slate-600 mt-2">Envie os documentos necessários para continuar com seu cadastro</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {documents.map((doc) => {
            const Icon = doc.icon;
            const uploaded = isDocumentUploaded(doc.key);
            const isUploading = uploadingDoc === doc.key;

            return (
              <div
                key={doc.key}
                data-testid={`document-card-${doc.key}`}
                className={`bg-white rounded-xl border p-6 transition-all ${
                  uploaded ? 'border-green-200 bg-green-50' : 'border-slate-200 hover:shadow-lg'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    uploaded ? 'bg-green-500' : 'bg-cyan-100'
                  }`}>
                    {uploaded ? (
                      <CheckCircle className="w-6 h-6 text-white" />
                    ) : (
                      <Icon className="w-6 h-6 text-cyan-600" />
                    )}
                  </div>
                  {uploaded && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      Enviado
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-outfit font-semibold text-slate-900 mb-4">{doc.label}</h3>

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
                    disabled={isUploading}
                    className={`w-full cursor-pointer ${
                      uploaded ? 'bg-green-500 hover:bg-green-600' : ''
                    }`}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? 'Enviando...' : uploaded ? 'Reenviar' : 'Enviar'}
                  </Button>
                </label>

                <p className="text-xs text-slate-500 mt-2 text-center">
                  JPG, PNG ou PDF (máx. 10MB)
                </p>
              </div>
            );
          })}
        </div>

        <div className="bg-cyan-50 rounded-xl border border-cyan-200 p-6">
          <h4 className="font-semibold text-cyan-900 mb-2">Informações Importantes:</h4>
          <ul className="text-sm text-cyan-700 space-y-1">
            <li>• Certifique-se de que os documentos estejam legíveis</li>
            <li>• Formatos aceitos: JPG, PNG ou PDF</li>
            <li>• Após enviar todos os documentos, você será direcionado para o pagamento</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default OnboardingDocuments;