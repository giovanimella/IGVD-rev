import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Calendar, TrendingUp, CheckCircle, X, Upload, Phone, Mail, User, FileText, Image as ImageIcon, Edit2, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Presentations = () => {
  const [presentations, setPresentations] = useState([]);
  const [todayStats, setTodayStats] = useState(null);
  const [frequency, setFrequency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingPresentation, setEditingPresentation] = useState(null);

  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    sold: false,
    notes: '',
    photo: null
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [presRes, todayRes, freqRes] = await Promise.all([
        axios.get(`${API_URL}/api/presentations/my`, { headers }),
        axios.get(`${API_URL}/api/presentations/my/today`, { headers }),
        axios.get(`${API_URL}/api/presentations/my/frequency`, { headers })
      ]);

      setPresentations(presRes.data);
      setTodayStats(todayRes.data);
      setFrequency(freqRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar apresentações');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      
      if (editingPresentation) {
        // Atualizar apresentação existente
        await axios.put(`${API_URL}/api/presentations/${editingPresentation.id}`, {
          client_name: formData.client_name,
          client_email: formData.client_email || null,
          client_phone: formData.client_phone || null,
          sold: formData.sold,
          notes: formData.notes || null
        }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        toast.success('✅ Apresentação atualizada!');
      } else {
        // Criar nova apresentação
        const formDataToSend = new FormData();
        
        formDataToSend.append('client_name', formData.client_name);
        formDataToSend.append('sold', formData.sold);
        
        if (formData.client_email) formDataToSend.append('client_email', formData.client_email);
        if (formData.client_phone) formDataToSend.append('client_phone', formData.client_phone);
        if (formData.notes) formDataToSend.append('notes', formData.notes);
        if (formData.photo) formDataToSend.append('photo', formData.photo);

        await axios.post(`${API_URL}/api/presentations/`, formDataToSend, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });

        toast.success(
          formData.sold 
            ? '🎉 Venda registrada! Compromissos de follow-up criados na sua agenda.'
            : '✅ Apresentação registrada! Lembrete criado para enviar material.'
        );
      }
      
      setShowModal(false);
      setEditingPresentation(null);
      setFormData({
        client_name: '',
        client_email: '',
        client_phone: '',
        sold: false,
        notes: '',
        photo: null
      });
      
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error(editingPresentation ? 'Erro ao atualizar apresentação' : 'Erro ao registrar apresentação');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (presentation) => {
    setEditingPresentation(presentation);
    setFormData({
      client_name: presentation.client_name,
      client_email: presentation.client_email || '',
      client_phone: presentation.client_phone || '',
      sold: presentation.sold,
      notes: presentation.notes || '',
      photo: null
    });
    setShowModal(true);
  };

  const handleDelete = async (presentationId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta apresentação?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/presentations/${presentationId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      toast.success('Apresentação excluída');
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir apresentação');
    }
  };

  const openNewModal = () => {
    setEditingPresentation(null);
    setFormData({
      client_name: '',
      client_email: '',
      client_phone: '',
      sold: false,
      notes: '',
      photo: null
    });
    setShowModal(true);
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

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const currentMonth = monthNames[frequency?.month - 1] || '';

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">Minhas Apresentações</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Registre suas apresentações diárias e acompanhe sua frequência</p>
          </div>
          <Button 
            onClick={openNewModal}
            className="bg-cyan-500 hover:bg-cyan-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Apresentação
          </Button>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card: Apresentações Hoje */}
          <div className={`bg-white dark:bg-[#1b4c51] rounded-xl border-2 p-6 ${
            todayStats?.completed 
              ? 'border-green-500 dark:border-green-400' 
              : 'border-orange-500 dark:border-orange-400'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                todayStats?.completed 
                  ? 'bg-green-100 dark:bg-green-500/20' 
                  : 'bg-orange-100 dark:bg-orange-500/20'
              }`}>
                <Calendar className={`w-6 h-6 ${
                  todayStats?.completed 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-orange-600 dark:text-orange-400'
                }`} />
              </div>
              {todayStats?.completed && (
                <CheckCircle className="w-6 h-6 text-green-500" />
              )}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Hoje</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {todayStats?.count || 0} / {todayStats?.target || 2}
            </p>
            <p className={`text-sm font-medium ${
              todayStats?.completed 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-orange-600 dark:text-orange-400'
            }`}>
              {todayStats?.completed 
                ? '✅ Meta diária cumprida!' 
                : `Faltam ${(todayStats?.target || 2) - (todayStats?.count || 0)} apresentação(ões)`}
            </p>
          </div>

          {/* Card: Frequência do Mês */}
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Frequência em {currentMonth}</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {frequency?.frequency_percentage?.toFixed(1) || 100}%
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {frequency?.days_with_presentations || 0} de {frequency?.working_days_in_month || 0} dias úteis
            </p>
          </div>

          {/* Card: Total do Mês */}
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-500/20 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total em {currentMonth}</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {frequency?.total_presentations || 0}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              apresentações registradas
            </p>
          </div>
        </div>

        {/* Lista de Apresentações */}
        <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Histórico de Apresentações</h2>
          </div>
          
          <div className="divide-y divide-slate-200 dark:divide-white/10">
            {presentations.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                Nenhuma apresentação registrada ainda
              </div>
            ) : (
              presentations.map((pres) => (
                <div key={pres.id} className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {pres.client_name}
                        </h3>
                        {pres.sold && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-xs font-medium rounded">
                            Vendido
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                        {pres.client_phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {pres.client_phone}
                          </div>
                        )}
                        {pres.client_email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {pres.client_email}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(pres.presentation_date).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      
                      {pres.notes && (
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                          {pres.notes}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      {pres.photo_url && (
                        <img 
                          src={`${API_URL}${pres.photo_url}`} 
                          alt="Apresentação"
                          className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-white/10"
                        />
                      )}
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleEdit(pres)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(pres.id)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Nova Apresentação */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Nova Apresentação</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Nome do Cliente *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.client_name}
                    onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
                    placeholder="Nome completo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      value={formData.client_email}
                      onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Telefone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="tel"
                      value={formData.client_phone}
                      onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Observações
                </label>
                <textarea
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
                  placeholder="Detalhes da apresentação, interesse do cliente, etc..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Foto da Apresentação
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-white/20 rounded-lg p-4 text-center hover:border-cyan-500 dark:hover:border-cyan-400 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({...formData, photo: e.target.files[0]})}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <ImageIcon className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {formData.photo ? formData.photo.name : 'Clique para selecionar uma foto'}
                    </p>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-white/5 rounded-lg">
                <input
                  type="checkbox"
                  id="sold"
                  checked={formData.sold}
                  onChange={(e) => setFormData({...formData, sold: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-300 text-cyan-500 focus:ring-cyan-500"
                />
                <label htmlFor="sold" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  Resultou em venda?
                </label>
              </div>

              {formData.sold && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/30 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-300">
                    <strong>Parabéns pela venda! 🎉</strong><br />
                    Vamos criar automaticamente 3 compromissos na sua agenda:
                  </p>
                  <ul className="text-xs text-green-700 dark:text-green-400 mt-2 space-y-1 ml-4 list-disc">
                    <li>Daqui 3 dias: Verificar se está tudo OK</li>
                    <li>Daqui 2 semanas: Pedir feedback sobre o produto</li>
                    <li>Daqui 1 mês: Avaliar satisfação e pedir indicação</li>
                  </ul>
                </div>
              )}

              {!formData.sold && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    Vamos criar um lembrete na sua agenda para daqui 1 semana enviar material para nutrir este lead.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => setShowModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600"
                >
                  {submitting ? 'Salvando...' : 'Registrar Apresentação'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Presentations;
