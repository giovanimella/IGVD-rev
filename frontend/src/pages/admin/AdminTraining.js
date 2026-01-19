import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import {
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Save,
  Users,
  Calendar,
  MapPin,
  Hotel,
  Clock,
  Settings,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  RefreshCw,
  UserCheck,
  UserX
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';

const AdminTraining = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [config, setConfig] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  
  const [classForm, setClassForm] = useState({
    date: '',
    time: '08:00',
    capacity: 20,
    location: '',
    hotel_info: ''
  });
  
  const [configForm, setConfigForm] = useState({
    days_before_closing: 7,
    terms_and_conditions: '',
    training_instructions: '',
    solo_price: 3500,
    couple_price: 6000
  });

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [classesRes, configRes] = await Promise.all([
        axios.get(`${API_URL}/api/training/classes`),
        axios.get(`${API_URL}/api/training/config`)
      ]);
      
      setClasses(classesRes.data);
      setConfig(configRes.data);
      setConfigForm({
        days_before_closing: configRes.data.days_before_closing || 7,
        terms_and_conditions: configRes.data.terms_and_conditions || '',
        training_instructions: configRes.data.training_instructions || '',
        solo_price: configRes.data.solo_price || 3500,
        couple_price: configRes.data.couple_price || 6000
      });
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const openNewClassModal = () => {
    setEditingClass(null);
    setClassForm({
      date: '',
      time: '08:00',
      capacity: 20,
      location: config?.default_location || '',
      hotel_info: config?.default_hotel_info || ''
    });
    setShowClassModal(true);
  };

  const openEditClassModal = (cls) => {
    setEditingClass(cls);
    setClassForm({
      date: cls.date,
      time: cls.time || '08:00',
      capacity: cls.capacity,
      location: cls.location || '',
      hotel_info: cls.hotel_info || ''
    });
    setShowClassModal(true);
  };

  const handleClassSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingClass) {
        await axios.put(`${API_URL}/api/training/classes/${editingClass.id}`, classForm);
        toast.success('Turma atualizada!');
      } else {
        await axios.post(`${API_URL}/api/training/classes`, classForm);
        toast.success('Turma criada!');
      }
      
      setShowClassModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar turma');
    }
  };

  const handleDeleteClass = async (classId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta turma?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/training/classes/${classId}`);
      toast.success('Turma excluída!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao excluir turma');
    }
  };

  const handleConfigSave = async () => {
    try {
      await axios.put(`${API_URL}/api/training/config`, configForm);
      toast.success('Configurações salvas!');
      setShowConfigModal(false);
      fetchData();
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
  };

  const openClassDetail = async (classId) => {
    try {
      const response = await axios.get(`${API_URL}/api/training/classes/${classId}`);
      setSelectedClass(response.data);
      setShowDetailModal(true);
    } catch (error) {
      toast.error('Erro ao carregar detalhes');
    }
  };

  const handleMarkAttendance = async (registrationId, present) => {
    try {
      await axios.put(`${API_URL}/api/training/registrations/${registrationId}/attendance?present=${present}`);
      toast.success(present ? 'Marcado como presente!' : 'Marcado como ausente');
      
      // Atualizar dados
      const response = await axios.get(`${API_URL}/api/training/classes/${selectedClass.id}`);
      setSelectedClass(response.data);
    } catch (error) {
      toast.error('Erro ao marcar presença');
    }
  };

  const downloadAttendancePDF = async (classId) => {
    try {
      const response = await axios.get(`${API_URL}/api/training/classes/${classId}/attendance-pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lista_presenca.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('PDF baixado!');
    } catch (error) {
      toast.error('Erro ao gerar PDF');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: 'bg-green-100 text-green-700',
      closed: 'bg-amber-100 text-amber-700',
      completed: 'bg-slate-100 text-slate-700',
      attendance_open: 'bg-purple-100 text-purple-700'
    };
    const labels = {
      open: 'Aberta',
      closed: 'Fechada',
      completed: 'Concluída',
      attendance_open: 'Presença Aberta'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.open}`}>
        {labels[status] || status}
      </span>
    );
  };

  const handleOpenAttendance = async (classId) => {
    if (!window.confirm('Marcar que o treinamento já ocorreu e abrir página de presença?')) return;
    
    try {
      await axios.put(`${API_URL}/api/training/classes/${classId}/open-attendance`);
      toast.success('Treinamento marcado como realizado! Página de presença aberta.');
      fetchData();
      // Abrir automaticamente o modal de detalhes
      openClassDetail(classId);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao abrir presença');
    }
  };

  const handleCloseAttendance = async (classId) => {
    try {
      await axios.put(`${API_URL}/api/training/classes/${classId}/close-attendance`);
      toast.success('Marcação de presença finalizada!');
      fetchData();
      setShowDetailModal(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao finalizar presença');
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/system')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-outfit font-bold text-slate-900">
                Treinamentos Presenciais
              </h1>
              <p className="text-slate-600 mt-1">
                Gerencie turmas e inscrições
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowConfigModal(true)}
              variant="outline"
              data-testid="config-btn"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </Button>
            <Button
              onClick={openNewClassModal}
              className="bg-cyan-500 hover:bg-cyan-600"
              data-testid="new-class-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Turma
            </Button>
          </div>
        </div>

        {/* Resumo de Configuração */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Fechamento</p>
            <p className="text-xl font-bold text-slate-900">{config?.days_before_closing || 7} dias antes</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Valor Individual</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(config?.solo_price || 3500)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Valor com Cônjuge</p>
            <p className="text-xl font-bold text-pink-600">{formatCurrency(config?.couple_price || 6000)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Total de Turmas</p>
            <p className="text-xl font-bold text-slate-900">{classes.length}</p>
          </div>
        </div>

        {/* Lista de Turmas */}
        {classes.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Nenhuma turma cadastrada
            </h3>
            <p className="text-slate-600 mb-4">
              Crie turmas para os licenciados se inscreverem no treinamento presencial
            </p>
            <Button onClick={openNewClassModal}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Turma
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Data</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Horário</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Vagas</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Fechamento</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Status</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {classes.map((cls) => (
                    <tr key={cls.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-cyan-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{formatDate(cls.date)}</p>
                            <p className="text-sm text-slate-500">{cls.location || 'Local não definido'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-900">{cls.time || '08:00'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span className={`font-medium ${cls.available_spots <= 0 ? 'text-red-600' : 'text-slate-900'}`}>
                            {cls.enrolled_count}/{cls.capacity}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-600">{formatDate(cls.closing_date)}</span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(cls.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openClassDetail(cls.id)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4 text-slate-500" />
                          </button>
                          <button
                            onClick={() => downloadAttendancePDF(cls.id)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Baixar lista de presença"
                          >
                            <Download className="w-4 h-4 text-slate-500" />
                          </button>
                          <button
                            onClick={() => openEditClassModal(cls)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4 text-slate-500" />
                          </button>
                          <button
                            onClick={() => handleDeleteClass(cls.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Turma */}
      <Dialog open={showClassModal} onOpenChange={setShowClassModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingClass ? 'Editar Turma' : 'Nova Turma'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleClassSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Data do Treinamento *
                </label>
                <input
                  type="date"
                  value={classForm.date}
                  onChange={(e) => setClassForm({...classForm, date: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  required
                  data-testid="class-date"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Horário
                </label>
                <input
                  type="time"
                  value={classForm.time}
                  onChange={(e) => setClassForm({...classForm, time: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  data-testid="class-time"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Capacidade Máxima *
              </label>
              <input
                type="number"
                value={classForm.capacity}
                onChange={(e) => setClassForm({...classForm, capacity: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                min="1"
                required
                data-testid="class-capacity"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Local do Treinamento
              </label>
              <input
                type="text"
                value={classForm.location}
                onChange={(e) => setClassForm({...classForm, location: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                placeholder="Endereço do local"
                data-testid="class-location"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Informações do Hotel
              </label>
              <textarea
                value={classForm.hotel_info}
                onChange={(e) => setClassForm({...classForm, hotel_info: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                rows={3}
                placeholder="Nome e endereço do hotel"
                data-testid="class-hotel"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowClassModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-cyan-500 hover:bg-cyan-600">
                <Save className="w-4 h-4 mr-2" />
                {editingClass ? 'Salvar' : 'Criar Turma'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Configurações */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurações do Treinamento</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Dias para Fechamento
                </label>
                <input
                  type="number"
                  value={configForm.days_before_closing}
                  onChange={(e) => setConfigForm({...configForm, days_before_closing: parseInt(e.target.value) || 7})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  min="1"
                  data-testid="config-days"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Dias antes do treinamento para fechar inscrições
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Valor Individual
                </label>
                <input
                  type="number"
                  value={configForm.solo_price}
                  onChange={(e) => setConfigForm({...configForm, solo_price: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  min="0"
                  step="0.01"
                  data-testid="config-solo-price"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Valor com Cônjuge
              </label>
              <input
                type="number"
                value={configForm.couple_price}
                onChange={(e) => setConfigForm({...configForm, couple_price: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                min="0"
                step="0.01"
                data-testid="config-couple-price"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Termos e Condições
              </label>
              <textarea
                value={configForm.terms_and_conditions}
                onChange={(e) => setConfigForm({...configForm, terms_and_conditions: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                rows={6}
                placeholder="Digite os termos e condições do treinamento..."
                data-testid="config-terms"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Instruções do Treinamento
              </label>
              <textarea
                value={configForm.training_instructions}
                onChange={(e) => setConfigForm({...configForm, training_instructions: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                rows={6}
                placeholder="Digite as instruções para os participantes..."
                data-testid="config-instructions"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowConfigModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfigSave} className="bg-cyan-500 hover:bg-cyan-600">
                <Save className="w-4 h-4 mr-2" />
                Salvar Configurações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes da Turma */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-cyan-500" />
              Turma - {selectedClass && formatDate(selectedClass.date)}
            </DialogTitle>
          </DialogHeader>

          {selectedClass && (
            <div className="space-y-6 mt-4">
              {/* Info da Turma */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Horário</p>
                  <p className="font-semibold">{selectedClass.time || '08:00'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Capacidade</p>
                  <p className="font-semibold">{selectedClass.enrolled_count}/{selectedClass.capacity}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Fechamento</p>
                  <p className="font-semibold">{formatDate(selectedClass.closing_date)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Status</p>
                  {getStatusBadge(selectedClass.status)}
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-2">
                <Button
                  onClick={() => downloadAttendancePDF(selectedClass.id)}
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Lista de Presença (PDF)
                </Button>
              </div>

              {/* Lista de Inscritos */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">
                  Inscritos ({selectedClass.registrations?.length || 0})
                </h3>
                
                {selectedClass.registrations?.length === 0 ? (
                  <div className="bg-slate-50 rounded-lg p-6 text-center text-slate-500">
                    Nenhum inscrito nesta turma
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedClass.registrations?.map((reg) => (
                      <div key={reg.id} className="bg-white border border-slate-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-900">
                                {reg.personal_data?.full_name || reg.user_full_name}
                              </p>
                              {reg.payment_status === 'paid' && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                  Pago
                                </span>
                              )}
                              {reg.has_spouse && (
                                <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-xs rounded-full">
                                  + Cônjuge
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500">{reg.user_email}</p>
                            <p className="text-sm text-slate-500">
                              CPF: {reg.personal_data?.cpf} | Tel: {reg.personal_data?.phone}
                            </p>
                            {reg.supervisor_name && (
                              <p className="text-xs text-slate-400 mt-1">
                                Supervisor: {reg.supervisor_name}
                              </p>
                            )}
                            {reg.has_spouse && reg.spouse_data && (
                              <div className="mt-2 pl-4 border-l-2 border-pink-200">
                                <p className="text-sm text-pink-700">Cônjuge: {reg.spouse_data.full_name}</p>
                                <p className="text-xs text-slate-500">CPF: {reg.spouse_data.cpf}</p>
                              </div>
                            )}
                          </div>
                          
                          {/* Controle de Presença */}
                          <div className="flex items-center gap-2">
                            {reg.attendance_status === 'present' ? (
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" />
                                Presente
                              </span>
                            ) : reg.attendance_status === 'absent' ? (
                              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm flex items-center gap-1">
                                <XCircle className="w-4 h-4" />
                                Ausente
                              </span>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-green-300 text-green-700 hover:bg-green-50"
                                  onClick={() => handleMarkAttendance(reg.id, true)}
                                >
                                  <UserCheck className="w-4 h-4 mr-1" />
                                  Presente
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-300 text-red-700 hover:bg-red-50"
                                  onClick={() => handleMarkAttendance(reg.id, false)}
                                >
                                  <UserX className="w-4 h-4 mr-1" />
                                  Ausente
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AdminTraining;
