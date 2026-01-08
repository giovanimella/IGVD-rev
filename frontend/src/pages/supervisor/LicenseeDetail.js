import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  User,
  Mail,
  Phone,
  Award,
  BookOpen,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  TrendingUp,
  ArrowLeft,
  Gift
} from 'lucide-react';
import { toast } from 'sonner';

const LicenseeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [licensee, setLicensee] = useState(null);
  const [modules, setModules] = useState([]);
  const [progress, setProgress] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchLicenseeDetails();
  }, [id]);

  const fetchLicenseeDetails = async () => {
    try {
      const [userRes, modulesRes, redemptionsRes] = await Promise.all([
        axios.get(`${API_URL}/api/users/${id}`),
        axios.get(`${API_URL}/api/modules/`),
        axios.get(`${API_URL}/api/rewards/redemptions/`)
      ]);

      setLicensee(userRes.data);
      setModules(modulesRes.data);
      
      // Filtrar resgates deste usuário
      const userRedemptions = redemptionsRes.data.filter(r => r.user_id === id);
      setRedemptions(userRedemptions);

    } catch (error) {
      console.error('Erro ao buscar detalhes:', error);
      toast.error('Erro ao carregar dados do licenciado');
    } finally {
      setLoading(false);
    }
  };

  const getStageLabel = (stage) => {
    const stages = {
      registro: 'Registro',
      documentos: 'Documentos',
      pagamento: 'Pagamento',
      acolhimento: 'Acolhimento',
      treinamento: 'Treinamento',
      vendas: 'Vendas em Campo',
      completo: 'Completo'
    };
    return stages[stage] || stage;
  };

  const getStageColor = (stage) => {
    const colors = {
      registro: 'bg-gray-100 text-gray-800',
      documentos: 'bg-blue-100 text-blue-800',
      pagamento: 'bg-yellow-100 text-yellow-800',
      acolhimento: 'bg-purple-100 text-purple-800',
      treinamento: 'bg-indigo-100 text-indigo-800',
      vendas: 'bg-orange-100 text-orange-800',
      completo: 'bg-green-100 text-green-800'
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

  const downloadDocument = (docUrl) => {
    window.open(`${API_URL}${docUrl}`, '_blank');
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

  if (!licensee) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-600">Licenciado não encontrado</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/supervisor/licensees')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-outfit font-bold text-slate-900">{licensee.full_name}</h1>
              <p className="text-slate-600 mt-1">Detalhes do Licenciado</p>
            </div>
          </div>
          <span
            className={`px-4 py-2 rounded-full text-sm font-medium ${getStageColor(
              licensee.current_stage || 'registro'
            )}`}
          >
            {getStageLabel(licensee.current_stage || 'registro')}
          </span>
        </div>

        {/* Informações Básicas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-slate-600 text-sm mb-1">Informações de Contato</p>
            <div className="space-y-2 mt-3">
              <div className="flex items-center text-sm text-slate-700">
                <Mail className="w-4 h-4 mr-2 text-slate-400" />
                {licensee.email}
              </div>
              {licensee.phone && (
                <div className="flex items-center text-sm text-slate-700">
                  <Phone className="w-4 h-4 mr-2 text-slate-400" />
                  {licensee.phone}
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-amber-700 text-sm mb-1">Pontos e Nível</p>
            <p className="text-3xl font-outfit font-bold text-amber-900">{licensee.points || 0}</p>
            <p className="text-amber-700 text-sm mt-1">{licensee.level_title || 'Iniciante'}</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-slate-600 text-sm mb-1">Vendas em Campo</p>
            <p className="text-3xl font-outfit font-bold text-slate-900">{licensee.field_sales_count || 0}/10</p>
          </div>
        </div>

        {/* Documentos */}
        {licensee.documents_uploaded && licensee.documents_uploaded.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-outfit font-semibold text-slate-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-cyan-600" />
              Documentos Enviados
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {licensee.documents_uploaded.map((doc, index) => (
                <button
                  key={index}
                  onClick={() => downloadDocument(doc)}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-cyan-200 hover:bg-cyan-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-700">Documento {index + 1}</span>
                  </div>
                  <Download className="w-5 h-5 text-cyan-600" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recompensas Pendentes */}
        {redemptions.filter(r => r.status === 'pending').length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-outfit font-semibold text-slate-900 mb-4 flex items-center">
              <Gift className="w-5 h-5 mr-2 text-amber-600" />
              Recompensas Pendentes
            </h3>
            <div className="space-y-3">
              {redemptions
                .filter(r => r.status === 'pending')
                .map((redemption) => (
                  <div
                    key={redemption.id}
                    className="flex items-center justify-between p-4 border border-amber-200 bg-amber-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-slate-900">Recompensa Solicitada</p>
                      <p className="text-sm text-slate-600">
                        {new Date(redemption.requested_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                      Pendente
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Progresso nos Módulos */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-outfit font-semibold text-slate-900 mb-4 flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-purple-600" />
            Progresso nos Módulos
          </h3>
          <div className="space-y-3">
            {modules.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Nenhum módulo disponível</p>
            ) : (
              modules.map((module) => (
                <div key={module.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-slate-900">{module.title}</h4>
                    {module.is_acolhimento && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                        Acolhimento
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-cyan-500 h-2 rounded-full transition-all"
                      style={{ width: `${module.progress || 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{module.progress || 0}% concluído</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Histórico de Atividades */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-outfit font-semibold text-slate-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-slate-600" />
            Informações Adicionais
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="text-sm text-slate-600 mb-1">Status de Pagamento</p>
              <p className="font-semibold text-slate-900">
                {licensee.payment_status === 'paid' ? (
                  <span className="text-green-600 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1" /> Pago
                  </span>
                ) : (
                  <span className="text-yellow-600 flex items-center">
                    <Clock className="w-4 h-4 mr-1" /> Pendente
                  </span>
                )}
              </p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <p className="text-sm text-slate-600 mb-1">Treinamento Presencial</p>
              <p className="font-semibold text-slate-900">
                {licensee.training_attended ? (
                  <span className="text-green-600 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1" /> Concluído
                  </span>
                ) : (
                  <span className="text-gray-600 flex items-center">
                    <XCircle className="w-4 h-4 mr-1" /> Não realizado
                  </span>
                )}
              </p>
            </div>
            <div className="border-l-4 border-amber-500 pl-4">
              <p className="text-sm text-slate-600 mb-1">Data de Cadastro</p>
              <p className="font-semibold text-slate-900">
                {new Date(licensee.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <p className="text-sm text-slate-600 mb-1">Última Atualização</p>
              <p className="font-semibold text-slate-900">
                {new Date(licensee.updated_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LicenseeDetail;
