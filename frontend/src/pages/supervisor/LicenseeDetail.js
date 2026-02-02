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
  ArrowLeft,
  Gift,
  FolderOpen,
  Building2,
  Eye,
  ExternalLink,
  Users,
  Hash,
  Calendar,
  Briefcase,
  GraduationCap,
  Bell,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';

const LicenseeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [licensee, setLicensee] = useState(null);
  const [modules, setModules] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [documents, setDocuments] = useState({ documents_pf: {}, documents_pj: {} });
  const [appointments, setAppointments] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchLicenseeDetails();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'agenda') {
      fetchAppointments();
    }
  }, [activeTab, currentMonth]);

  const fetchLicenseeDetails = async () => {
    try {
      const [userRes, modulesRes, redemptionsRes, docsRes] = await Promise.all([
        axios.get(`${API_URL}/api/users/${id}`),
        axios.get(`${API_URL}/api/modules/`),
        axios.get(`${API_URL}/api/rewards/redemptions`),
        axios.get(`${API_URL}/api/onboarding/supervisor/licensee/${id}/documents`)
      ]);

      setLicensee(userRes.data);
      setModules(modulesRes.data);
      setDocuments(docsRes.data);
      
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
      documentos_pf: 'Documentos PF',
      documentos: 'Documentos',
      pagamento: 'Pagamento',
      acolhimento: 'Acolhimento',
      agendamento: 'Agendamento',
      treinamento_presencial: 'Treinamento',
      vendas_campo: 'Vendas em Campo',
      documentos_pj: 'Documentos PJ',
      completo: 'Completo'
    };
    return stages[stage] || stage;
  };

  const getStageColor = (stage) => {
    const colors = {
      registro: 'bg-gray-100 text-gray-800',
      documentos_pf: 'bg-blue-100 text-blue-800',
      documentos: 'bg-blue-100 text-blue-800',
      pagamento: 'bg-yellow-100 text-yellow-800',
      acolhimento: 'bg-purple-100 text-purple-800',
      agendamento: 'bg-indigo-100 text-indigo-800',
      treinamento_presencial: 'bg-indigo-100 text-indigo-800',
      vendas_campo: 'bg-orange-100 text-orange-800',
      documentos_pj: 'bg-violet-100 text-violet-800',
      completo: 'bg-green-100 text-green-800'
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

  const openDocument = (docUrl) => {
    window.open(`${API_URL}${docUrl}`, '_blank');
  };

  const fetchAppointments = async () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const response = await axios.get(`${API_URL}/api/appointments/supervisor/licensee/${id}/month/${year}/${month}`);
      setAppointments(response.data);
    } catch (error) {
      console.error('Erro ao buscar agenda:', error);
    }
  };

  const categories = {
    visita_cliente: { label: 'Visita a Cliente', icon: Users, color: 'bg-blue-500' },
    reuniao: { label: 'Reunião', icon: Briefcase, color: 'bg-purple-500' },
    treinamento: { label: 'Treinamento', icon: GraduationCap, color: 'bg-green-500' },
    lembrete: { label: 'Lembrete', icon: Bell, color: 'bg-amber-500' },
    outro: { label: 'Outro', icon: MoreHorizontal, color: 'bg-slate-500' }
  };

  const getCategoryInfo = (categoryKey) => {
    return categories[categoryKey] || categories.outro;
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const tabs = [
    { key: 'info', label: 'Informações', icon: User },
    { key: 'documents', label: 'Documentos', icon: FolderOpen },
    { key: 'agenda', label: 'Agenda', icon: Calendar },
    { key: 'progress', label: 'Progresso', icon: BookOpen }
  ];

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

  const renderDocumentCard = (docKey, docInfo, type) => {
    const docLabels = {
      rg: 'RG (Identidade)',
      cpf: 'CPF',
      comprovante_residencia: 'Comprovante de Residência',
      cartao_cnpj: 'Cartão CNPJ',
      contrato_social: 'Contrato Social'
    };

    return (
      <div
        key={docKey}
        className="flex items-center justify-between p-4 bg-white dark:bg-[#1b4c51] border border-slate-200 dark:border-white/10 rounded-lg hover:border-cyan-300 dark:hover:border-cyan-500/30 transition-colors"
        data-testid={`doc-${type}-${docKey}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{docLabels[docKey] || docKey}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{docInfo.filename}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Enviado em {new Date(docInfo.uploaded_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => openDocument(docInfo.url)}
          className="flex items-center gap-2"
        >
          <Eye className="w-4 h-4" />
          Visualizar
        </Button>
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/supervisor/licensees')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              data-testid="back-button"
            >
              <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-outfit font-bold text-slate-900 dark:text-white">{licensee.full_name}</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm lg:text-base">Detalhes do Licenciado</p>
            </div>
          </div>
          <span
            className={`px-4 py-2 rounded-full text-sm font-medium self-start sm:self-auto ${getStageColor(
              licensee.current_stage || 'registro'
            )}`}
          >
            {getStageLabel(licensee.current_stage || 'registro')}
          </span>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-white/10">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  data-testid={`tab-${tab.key}`}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content: Informações */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            {/* Informações Básicas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Informações de Contato</p>
                <div className="space-y-2 mt-3">
                  <div className="flex items-center text-sm text-slate-700 dark:text-slate-300">
                    <Mail className="w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" />
                    {licensee.email}
                  </div>
                  {licensee.phone && (
                    <div className="flex items-center text-sm text-slate-700 dark:text-slate-300">
                      <Phone className="w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" />
                      {licensee.phone}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 rounded-xl border border-amber-200 dark:border-amber-700/50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-amber-700 dark:text-amber-400 text-sm mb-1">Pontos e Nível</p>
                <p className="text-3xl font-outfit font-bold text-amber-900 dark:text-amber-300">{licensee.points || 0}</p>
                <p className="text-amber-700 dark:text-amber-400 text-sm mt-1">{licensee.level_title || 'Iniciante'}</p>
              </div>

              <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Vendas em Campo</p>
                <p className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">{licensee.field_sales_count || 0}/10</p>
              </div>
            </div>

            {/* Recompensas Pendentes */}
            {redemptions.filter(r => r.status === 'pending').length > 0 && (
              <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/10 p-6">
                <h3 className="text-lg font-outfit font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                  <Gift className="w-5 h-5 mr-2 text-amber-600" />
                  Recompensas Pendentes
                </h3>
                <div className="space-y-3">
                  {redemptions
                    .filter(r => r.status === 'pending')
                    .map((redemption) => (
                      <div
                        key={redemption.id}
                        className="flex items-center justify-between p-4 border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">Recompensa Solicitada</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {new Date(redemption.requested_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full text-xs font-medium">
                          Pendente
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Informações do Líder */}
            {(licensee.leader_id || licensee.leader_name) && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-200 dark:border-indigo-700/50 p-6">
                <h3 className="text-lg font-outfit font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                  Líder Responsável
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {licensee.leader_name && (
                    <div className="flex items-center gap-3 bg-white dark:bg-[#1b4c51] rounded-lg p-4 border border-indigo-100 dark:border-indigo-800/50">
                      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg flex items-center justify-center">
                        <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Nome do Líder</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{licensee.leader_name}</p>
                      </div>
                    </div>
                  )}
                  {licensee.leader_id && (
                    <div className="flex items-center gap-3 bg-white dark:bg-[#1b4c51] rounded-lg p-4 border border-indigo-100 dark:border-indigo-800/50">
                      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg flex items-center justify-center">
                        <Hash className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">ID do Líder</p>
                        <p className="font-semibold text-slate-900 dark:text-white font-mono text-sm">{licensee.leader_id}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Informações Adicionais */}
            <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/10 p-6">
              <h3 className="text-lg font-outfit font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-slate-600 dark:text-slate-400" />
                Informações Adicionais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Status de Pagamento</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {licensee.payment_status === 'paid' ? (
                      <span className="text-green-600 dark:text-green-400 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" /> Pago
                      </span>
                    ) : (
                      <span className="text-yellow-600 dark:text-yellow-400 flex items-center">
                        <Clock className="w-4 h-4 mr-1" /> Pendente
                      </span>
                    )}
                  </p>
                </div>
                <div className="border-l-4 border-purple-500 pl-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Treinamento Presencial</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {licensee.training_attended ? (
                      <span className="text-green-600 dark:text-green-400 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" /> Concluído
                      </span>
                    ) : (
                      <span className="text-gray-600 dark:text-gray-400 flex items-center">
                        <XCircle className="w-4 h-4 mr-1" /> Não realizado
                      </span>
                    )}
                  </p>
                </div>
                <div className="border-l-4 border-amber-500 pl-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Data de Cadastro</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {new Date(licensee.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="border-l-4 border-green-500 pl-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Última Atualização</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {new Date(licensee.updated_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Documentos */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            {/* Documentos Pessoa Física */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-cyan-200 dark:border-cyan-700/50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-cyan-500 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-outfit font-semibold text-slate-900 dark:text-white">
                    Documentos Pessoa Física
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    RG, CPF e Comprovante de Residência
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {Object.keys(documents.documents_pf || {}).length > 0 ? (
                  Object.entries(documents.documents_pf).map(([key, value]) =>
                    renderDocumentCard(key, value, 'pf')
                  )
                ) : (
                  <div className="text-center py-8 bg-white dark:bg-[#1b4c51] rounded-lg border border-slate-200 dark:border-white/10">
                    <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400">Nenhum documento PF enviado ainda</p>
                  </div>
                )}
              </div>
            </div>

            {/* Documentos Pessoa Jurídica */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-700/50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-outfit font-semibold text-slate-900 dark:text-white">
                    Documentos Pessoa Jurídica
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Cartão CNPJ e Contrato Social
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {Object.keys(documents.documents_pj || {}).length > 0 ? (
                  Object.entries(documents.documents_pj).map(([key, value]) =>
                    renderDocumentCard(key, value, 'pj')
                  )
                ) : (
                  <div className="text-center py-8 bg-white dark:bg-[#1b4c51] rounded-lg border border-slate-200 dark:border-white/10">
                    <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400">Nenhum documento PJ enviado ainda</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Agenda */}
        {activeTab === 'agenda' && (
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-outfit font-semibold text-slate-900 dark:text-white flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-cyan-600 dark:text-cyan-400" />
                Agenda do Licenciado
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[140px] text-center">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
              </div>
            </div>

            {appointments.length > 0 ? (
              <div className="space-y-3">
                {appointments.map((apt) => {
                  const catInfo = getCategoryInfo(apt.category);
                  const Icon = catInfo.icon;
                  const aptDate = new Date(apt.date + 'T00:00:00');
                  return (
                    <div
                      key={apt.id}
                      className="flex items-start gap-4 p-4 rounded-lg border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-colors"
                    >
                      <div className={`w-12 h-12 rounded-lg ${catInfo.color} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{apt.title}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{catInfo.label}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {aptDate.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-end">
                              <Clock className="w-3 h-3 mr-1" />
                              {apt.time}
                              {apt.duration && <span className="ml-2 text-slate-400 dark:text-slate-500">• {apt.duration}</span>}
                            </p>
                          </div>
                        </div>
                        {apt.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-white/5 rounded p-2">{apt.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">Nenhum compromisso neste mês</p>
              </div>
            )}

            {/* Legenda de categorias */}
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">Categorias</p>
              <div className="flex flex-wrap gap-4">
                {Object.entries(categories).map(([key, cat]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <div className={`w-3 h-3 rounded ${cat.color}`} />
                    <span className="text-slate-600 dark:text-slate-400">{cat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Progresso */}
        {activeTab === 'progress' && (
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/10 p-6">
            <h3 className="text-lg font-outfit font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
              Progresso nos Módulos
            </h3>
            <div className="space-y-3">
              {modules.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 text-center py-8">Nenhum módulo disponível</p>
              ) : (
                modules.map((module) => (
                  <div key={module.id} className="border border-slate-200 dark:border-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-slate-900 dark:text-white">{module.title}</h4>
                      {module.is_acolhimento && (
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs font-medium">
                          Acolhimento
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-2">
                      <div
                        className="bg-cyan-500 h-2 rounded-full transition-all"
                        style={{ width: `${module.progress || 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{module.progress || 0}% concluído</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LicenseeDetail;
