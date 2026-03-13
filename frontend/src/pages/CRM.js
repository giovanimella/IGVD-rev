import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail,
  DollarSign,
  Calendar,
  Search,
  Filter,
  MoreVertical,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  TrendingUp,
  Loader2,
  X,
  MapPin,
  FileText,
  MessageSquare,
  ChevronDown,
  BarChart3,
  PieChart
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Configuração dos estágios do pipeline em português
const PIPELINE_STAGES = [
  { id: 'novo', label: 'Novo Lead', color: 'bg-blue-500', textColor: 'text-blue-600', bgLight: 'bg-blue-50' },
  { id: 'contato', label: 'Contato Inicial', color: 'bg-yellow-500', textColor: 'text-yellow-600', bgLight: 'bg-yellow-50' },
  { id: 'negociacao', label: 'Negociação', color: 'bg-purple-500', textColor: 'text-purple-600', bgLight: 'bg-purple-50' },
  { id: 'ganho', label: 'Fechado (Ganho)', color: 'bg-green-500', textColor: 'text-green-600', bgLight: 'bg-green-50' },
  { id: 'perdido', label: 'Fechado (Perdido)', color: 'bg-red-500', textColor: 'text-red-600', bgLight: 'bg-red-50' },
];

const ORIGINS = [
  { value: 'indicacao', label: 'Indicação' },
  { value: 'evento', label: 'Evento' },
  { value: 'redes_sociais', label: 'Redes Sociais' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'site', label: 'Site' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'outro', label: 'Outro' },
];

const PRIORITIES = [
  { value: 'baixa', label: 'Baixa', color: 'bg-gray-200 text-gray-700' },
  { value: 'media', label: 'Média', color: 'bg-blue-200 text-blue-700' },
  { value: 'alta', label: 'Alta', color: 'bg-orange-200 text-orange-700' },
  { value: 'urgente', label: 'Urgente', color: 'bg-red-200 text-red-700' },
];

const CRM = () => {
  const [loading, setLoading] = useState(true);
  const [pipeline, setPipeline] = useState({});
  const [stats, setStats] = useState({});
  const [dashboard, setDashboard] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeView, setActiveView] = useState('kanban'); // kanban ou lista
  const [draggedLead, setDraggedLead] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    city: '',
    state: '',
    origin: '',
    priority: 'media',
    product_interest: '',
    estimated_value: '',
    contact_date: '',
    next_contact_date: '',
    notes: ''
  });

  const [moveData, setMoveData] = useState({
    new_status: '',
    sale_value: '',
    lost_reason: ''
  });

  const fetchPipeline = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/crm/leads/pipeline`);
      setPipeline(response.data.pipeline);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Erro ao buscar pipeline:', error);
      toast.error('Erro ao carregar pipeline');
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/crm/dashboard`);
      setDashboard(response.data);
    } catch (error) {
      console.error('Erro ao buscar dashboard:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchPipeline(), fetchDashboard()]);
      setLoading(false);
    };
    loadData();
  }, [fetchPipeline, fetchDashboard]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      cpf: '',
      city: '',
      state: '',
      origin: '',
      priority: 'media',
      product_interest: '',
      estimated_value: '',
      contact_date: '',
      next_contact_date: '',
      notes: ''
    });
    setEditingLead(null);
  };

  const openNewLeadModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (lead) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      cpf: lead.cpf || '',
      city: lead.city || '',
      state: lead.state || '',
      origin: lead.origin || '',
      priority: lead.priority || 'media',
      product_interest: lead.product_interest || '',
      estimated_value: lead.estimated_value || '',
      contact_date: lead.contact_date?.split('T')[0] || '',
      next_contact_date: lead.next_contact_date?.split('T')[0] || '',
      notes: lead.notes || ''
    });
    setShowModal(true);
  };

  const openDetailModal = async (lead) => {
    try {
      const response = await axios.get(`${API_URL}/api/crm/leads/${lead.id}`);
      setSelectedLead(response.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Erro ao buscar detalhes:', error);
      toast.error('Erro ao carregar detalhes do lead');
    }
  };

  const openMoveModal = (lead, targetStatus) => {
    setSelectedLead(lead);
    setMoveData({
      new_status: targetStatus,
      sale_value: lead.estimated_value || '',
      lost_reason: ''
    });
    setShowMoveModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setSubmitting(true);
    
    try {
      // Convert empty strings to null for optional fields
      const payload = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        cpf: formData.cpf || null,
        city: formData.city || null,
        state: formData.state || null,
        origin: formData.origin || null,
        priority: formData.priority || 'media',
        product_interest: formData.product_interest || null,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
        contact_date: formData.contact_date || null,
        next_contact_date: formData.next_contact_date || null,
        notes: formData.notes || null
      };

      if (editingLead) {
        await axios.put(`${API_URL}/api/crm/leads/${editingLead.id}`, payload);
        toast.success('Lead atualizado com sucesso!');
      } else {
        await axios.post(`${API_URL}/api/crm/leads`, payload);
        toast.success('Lead criado com sucesso!');
      }
      
      setShowModal(false);
      resetForm();
      fetchPipeline();
      fetchDashboard();
    } catch (error) {
      console.error('Erro ao salvar lead:', error);
      const detail = error.response?.data?.detail;
      // Handle both string and array/object validation errors
      if (typeof detail === 'string') {
        toast.error(detail);
      } else if (Array.isArray(detail)) {
        toast.error(detail[0]?.msg || 'Erro ao salvar lead');
      } else {
        toast.error('Erro ao salvar lead');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveLead = async () => {
    if (!selectedLead || !moveData.new_status) return;

    // Se for para "ganho" e não tiver valor de venda
    if (moveData.new_status === 'ganho' && !moveData.sale_value) {
      toast.error('Informe o valor da venda');
      return;
    }

    // Se for para "perdido" e não tiver motivo
    if (moveData.new_status === 'perdido' && !moveData.lost_reason) {
      toast.error('Informe o motivo da perda');
      return;
    }

    setSubmitting(true);
    
    try {
      await axios.put(`${API_URL}/api/crm/leads/${selectedLead.id}/move`, {
        new_status: moveData.new_status,
        sale_value: moveData.sale_value ? parseFloat(moveData.sale_value) : null,
        lost_reason: moveData.lost_reason || null
      });
      
      toast.success('Lead movido com sucesso!');
      setShowMoveModal(false);
      fetchPipeline();
      fetchDashboard();
    } catch (error) {
      console.error('Erro ao mover lead:', error);
      toast.error('Erro ao mover lead');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLead = async (lead) => {
    if (!window.confirm(`Tem certeza que deseja excluir o lead "${lead.name}"?`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/crm/leads/${lead.id}`);
      toast.success('Lead excluído com sucesso!');
      fetchPipeline();
      fetchDashboard();
    } catch (error) {
      console.error('Erro ao excluir lead:', error);
      toast.error('Erro ao excluir lead');
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e, lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetStageId) => {
    e.preventDefault();
    
    if (!draggedLead || draggedLead.status === targetStageId) {
      setDraggedLead(null);
      return;
    }

    // Se for para ganho ou perdido, abrir modal
    if (targetStageId === 'ganho' || targetStageId === 'perdido') {
      openMoveModal(draggedLead, targetStageId);
      setDraggedLead(null);
      return;
    }

    // Mover diretamente
    try {
      await axios.put(`${API_URL}/api/crm/leads/${draggedLead.id}/move`, {
        new_status: targetStageId
      });
      toast.success('Lead movido!');
      fetchPipeline();
      fetchDashboard();
    } catch (error) {
      console.error('Erro ao mover lead:', error);
      toast.error('Erro ao mover lead');
    }
    
    setDraggedLead(null);
  };

  const formatCurrency = (value) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStageConfig = (stageId) => {
    return PIPELINE_STAGES.find(s => s.id === stageId) || PIPELINE_STAGES[0];
  };

  const getPriorityConfig = (priority) => {
    return PRIORITIES.find(p => p.value === priority) || PRIORITIES[1];
  };

  const getOriginLabel = (origin) => {
    return ORIGINS.find(o => o.value === origin)?.label || origin || 'Não informada';
  };

  // Filtrar leads por busca
  const filterLeads = (leads) => {
    if (!searchTerm) return leads;
    const term = searchTerm.toLowerCase();
    return leads.filter(lead => 
      lead.name?.toLowerCase().includes(term) ||
      lead.email?.toLowerCase().includes(term) ||
      lead.phone?.includes(term)
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6" data-testid="crm-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CRM de Prospects</h1>
            <p className="text-gray-500 dark:text-gray-400">Gerencie seus leads e oportunidades de venda</p>
          </div>
          
          <Button 
            onClick={openNewLeadModal}
            className="bg-teal-600 hover:bg-teal-700"
            data-testid="btn-novo-lead"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Lead
          </Button>
        </div>

        {/* Dashboard Cards */}
        {dashboard && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total de Leads</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{dashboard.total_leads}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Taxa de Conversão</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{dashboard.conversion_rate}%</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Valor do Mês</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(dashboard.value_this_month)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Target className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Conversões do Mês</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{dashboard.conversions_this_month}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and View Toggle */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
              data-testid="search-leads"
            />
          </div>
          
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setActiveView('kanban')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === 'kanban' 
                  ? 'bg-white dark:bg-gray-600 text-teal-600 dark:text-teal-400 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
              data-testid="btn-view-kanban"
            >
              Kanban
            </button>
            <button
              onClick={() => setActiveView('lista')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === 'lista' 
                  ? 'bg-white dark:bg-gray-600 text-teal-600 dark:text-teal-400 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
              data-testid="btn-view-lista"
            >
              Lista
            </button>
          </div>
        </div>

        {/* Kanban View */}
        {activeView === 'kanban' && (
          <div className="flex gap-4 overflow-x-auto pb-4" data-testid="kanban-board">
            {PIPELINE_STAGES.map(stage => (
              <div
                key={stage.id}
                className="flex-shrink-0 w-72 md:w-80"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
                data-testid={`stage-${stage.id}`}
              >
                {/* Stage Header */}
                <div className={`${stage.bgLight} dark:bg-gray-800 rounded-t-xl p-4 border-b-2 ${stage.color}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                      <h3 className={`font-semibold ${stage.textColor} dark:text-gray-200`}>{stage.label}</h3>
                    </div>
                    <span className="bg-white dark:bg-gray-700 px-2 py-1 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300">
                      {stats[stage.id]?.count || 0}
                    </span>
                  </div>
                  {stats[stage.id]?.value > 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {formatCurrency(stats[stage.id].value)}
                    </p>
                  )}
                </div>
                
                {/* Stage Cards */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-b-xl p-3 min-h-[400px] space-y-3">
                  {filterLeads(pipeline[stage.id] || []).map(lead => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead)}
                      className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-700 cursor-grab hover:shadow-md transition-shadow"
                      data-testid={`lead-card-${lead.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate flex-1">{lead.name}</h4>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                              <MoreVertical className="w-4 h-4 text-gray-400" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDetailModal(lead)}>
                              <FileText className="w-4 h-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditModal(lead)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteLead(lead)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      {lead.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                          <Phone className="w-3 h-3" />
                          <span>{lead.phone}</span>
                        </div>
                      )}
                      
                      {lead.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        {(lead.estimated_value || lead.sale_value) && (
                          <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(lead.sale_value || lead.estimated_value)}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full ${getPriorityConfig(lead.priority).color}`}>
                          {getPriorityConfig(lead.priority).label}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {filterLeads(pipeline[stage.id] || []).length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum lead nesta etapa</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lista View */}
        {activeView === 'lista' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="leads-table">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Contato</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Valor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Prioridade</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Origem</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {PIPELINE_STAGES.flatMap(stage => 
                    filterLeads(pipeline[stage.id] || []).map(lead => (
                      <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900 dark:text-white">{lead.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {lead.phone && <div>{lead.phone}</div>}
                            {lead.email && <div className="truncate max-w-[200px]">{lead.email}</div>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStageConfig(lead.status).bgLight} ${getStageConfig(lead.status).textColor}`}>
                            <span className={`w-2 h-2 rounded-full ${getStageConfig(lead.status).color}`} />
                            {getStageConfig(lead.status).label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {formatCurrency(lead.sale_value || lead.estimated_value)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${getPriorityConfig(lead.priority).color}`}>
                            {getPriorityConfig(lead.priority).label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {getOriginLabel(lead.origin)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openDetailModal(lead)}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-gray-600"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(lead)}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-gray-600"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteLead(lead)}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              
              {Object.values(pipeline).flat().length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 dark:text-gray-400">Nenhum lead cadastrado</p>
                  <Button onClick={openNewLeadModal} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar primeiro lead
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Criar/Editar Lead */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLead ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                  data-testid="input-name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  data-testid="input-phone"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  data-testid="input-email"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Origem
                </label>
                <Select
                  value={formData.origin}
                  onValueChange={(value) => setFormData({...formData, origin: value})}
                >
                  <SelectTrigger data-testid="select-origin">
                    <SelectValue placeholder="Selecione a origem" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORIGINS.map(origin => (
                      <SelectItem key={origin.value} value={origin.value}>
                        {origin.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Prioridade
                </label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({...formData, priority: value})}
                >
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(priority => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Valor Estimado (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.estimated_value}
                  onChange={(e) => setFormData({...formData, estimated_value: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  data-testid="input-value"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  data-testid="input-city"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estado
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  maxLength={2}
                  data-testid="input-state"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  data-testid="input-notes"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-teal-600 hover:bg-teal-700"
                data-testid="btn-submit-lead"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  editingLead ? 'Atualizar' : 'Criar Lead'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Mover Lead (para Ganho ou Perdido) */}
      <Dialog open={showMoveModal} onOpenChange={setShowMoveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {moveData.new_status === 'ganho' ? 'Fechar como Ganho' : 'Fechar como Perdido'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {moveData.new_status === 'ganho' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Valor da Venda (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={moveData.sale_value}
                  onChange={(e) => setMoveData({...moveData, sale_value: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                  data-testid="input-sale-value"
                />
              </div>
            )}
            
            {moveData.new_status === 'perdido' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Motivo da Perda *
                </label>
                <textarea
                  value={moveData.lost_reason}
                  onChange={(e) => setMoveData({...moveData, lost_reason: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Descreva o motivo..."
                  required
                  data-testid="input-lost-reason"
                />
              </div>
            )}
            
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowMoveModal(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleMoveLead}
                disabled={submitting}
                className={moveData.new_status === 'ganho' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                data-testid="btn-confirm-move"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {moveData.new_status === 'ganho' ? (
                      <><CheckCircle className="w-4 h-4 mr-2" /> Confirmar Ganho</>
                    ) : (
                      <><XCircle className="w-4 h-4 mr-2" /> Confirmar Perda</>
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes do Lead */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Lead</DialogTitle>
          </DialogHeader>
          
          {selectedLead && (
            <div className="space-y-6">
              {/* Info Principal */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-3">
                  {selectedLead.lead.name}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedLead.lead.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">{selectedLead.lead.phone}</span>
                    </div>
                  )}
                  {selectedLead.lead.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">{selectedLead.lead.email}</span>
                    </div>
                  )}
                  {(selectedLead.lead.city || selectedLead.lead.state) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">
                        {[selectedLead.lead.city, selectedLead.lead.state].filter(Boolean).join(' - ')}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300">
                      {formatCurrency(selectedLead.lead.sale_value || selectedLead.lead.estimated_value)}
                    </span>
                  </div>
                </div>
                
                {selectedLead.lead.notes && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Observações</h4>
                    <p className="text-gray-600 dark:text-gray-300">{selectedLead.lead.notes}</p>
                  </div>
                )}
              </div>
              
              {/* Histórico de Atividades */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Histórico</h4>
                {selectedLead.activities.length > 0 ? (
                  <div className="space-y-3">
                    {selectedLead.activities.map(activity => (
                      <div key={activity.id} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 mt-2 rounded-full bg-teal-500" />
                        <div>
                          <p className="text-gray-600 dark:text-gray-300">{activity.description}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(activity.created_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">Nenhuma atividade registrada</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default CRM;
