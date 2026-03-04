import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { 
  Users, Plus, Calendar, MapPin, Clock, UserPlus, X, 
  CheckCircle, Trash2, Edit, Eye, Trophy, TrendingUp
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const Meetings = () => {
  const [meetings, setMeetings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [participants, setParticipants] = useState([]);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [meetingsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/meetings/my`),
        axios.get(`${API_URL}/api/meetings/my/stats`)
      ]);
      setMeetings(meetingsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      if (error.response?.status === 403 || error.response?.status === 402) {
        toast.error('Acesso bloqueado. Regularize sua mensalidade.');
      } else {
        toast.error('Erro ao carregar reuniões');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async (formData) => {
    try {
      await axios.post(`${API_URL}/api/meetings/`, formData);
      toast.success('Reunião criada com sucesso!');
      setShowCreateModal(false);
      fetchData();
    } catch (error) {
      const errorMsg = error.response?.data?.detail?.message || error.response?.data?.detail || 'Erro ao criar reunião';
      toast.error(errorMsg);
    }
  };

  const handleViewParticipants = async (meeting) => {
    try {
      const response = await axios.get(`${API_URL}/api/meetings/${meeting.id}`);
      setSelectedMeeting(response.data.meeting);
      setParticipants(response.data.participants || []);
      setShowParticipantsModal(true);
    } catch (error) {
      toast.error('Erro ao carregar participantes');
    }
  };

  const handleAddParticipant = async (participantData) => {
    try {
      await axios.post(`${API_URL}/api/meetings/${selectedMeeting.id}/participants`, participantData);
      toast.success('Participante adicionado!');
      // Recarregar participantes
      handleViewParticipants(selectedMeeting);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao adicionar participante';
      toast.error(errorMsg);
    }
  };

  const handleCloseMeeting = async (meetingId) => {
    if (!window.confirm('Tem certeza que deseja fechar esta lista? Após fechar não será possível adicionar mais participantes.')) {
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/meetings/${meetingId}/close`);
      toast.success(response.data.message);
      setShowParticipantsModal(false);
      fetchData();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao fechar reunião';
      toast.error(errorMsg);
    }
  };

  const handleDeleteMeeting = async (meetingId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta reunião?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/meetings/${meetingId}`);
      toast.success('Reunião excluída!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao excluir reunião');
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-outfit font-bold text-slate-900">Reuniões</h1>
            <p className="text-slate-600 mt-1">Cadastre suas reuniões e ganhe pontos por participante</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-cyan-500 to-blue-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Reunião
          </Button>
        </div>

        {/* Estatísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total de Reuniões</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total_meetings}</p>
                </div>
                <Users className="w-10 h-10 text-cyan-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Reuniões Fechadas</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total_closed_meetings}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total de Participantes</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total_participants}</p>
                </div>
                <UserPlus className="w-10 h-10 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Pontos Ganhos</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total_points_earned}</p>
                </div>
                <Trophy className="w-10 h-10 text-yellow-500" />
              </div>
            </div>
          </div>
        )}

        {/* Lista de Reuniões */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-outfit font-semibold text-slate-900">Minhas Reuniões</h2>
          </div>

          <div className="divide-y divide-slate-200">
            {meetings.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">Você ainda não cadastrou nenhuma reunião</p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 bg-cyan-500 hover:bg-cyan-600"
                >
                  Cadastrar Primeira Reunião
                </Button>
              </div>
            ) : (
              meetings.map((meeting) => (
                <div key={meeting.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-outfit font-semibold text-slate-900">
                          {meeting.title}
                        </h3>
                        {meeting.status === 'closed' && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            Fechada
                          </span>
                        )}
                        {meeting.status === 'draft' && (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                            Em Andamento
                          </span>
                        )}
                      </div>

                      {meeting.description && (
                        <p className="text-slate-600 text-sm mb-3">{meeting.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(meeting.meeting_date).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{meeting.meeting_time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{meeting.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{meeting.participants_count} participantes</span>
                        </div>
                        {meeting.status === 'closed' && (
                          <div className="flex items-center gap-2 text-green-600 font-medium">
                            <Trophy className="w-4 h-4" />
                            <span>+{meeting.points_awarded} pontos</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewParticipants(meeting)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>

                      {meeting.status === 'draft' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteMeeting(meeting.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Criar Reunião */}
      {showCreateModal && (
        <CreateMeetingModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateMeeting}
        />
      )}

      {/* Modal Participantes */}
      {showParticipantsModal && selectedMeeting && (
        <ParticipantsModal
          meeting={selectedMeeting}
          participants={participants}
          onClose={() => {
            setShowParticipantsModal(false);
            setSelectedMeeting(null);
            setParticipants([]);
          }}
          onAddParticipant={handleAddParticipant}
          onCloseMeeting={handleCloseMeeting}
          onRefresh={() => handleViewParticipants(selectedMeeting)}
        />
      )}
    </Layout>
  );
};

// Modal para criar reunião
const CreateMeetingModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    meeting_date: '',
    meeting_time: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-xl font-outfit font-semibold text-slate-900">Nova Reunião</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Título da Reunião *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="Ex: Reunião de Vendas - Centro"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              rows="3"
              placeholder="Descrição da reunião (opcional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Local *
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="Ex: Escritório Central"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Data *
              </label>
              <input
                type="date"
                value={formData.meeting_date}
                onChange={(e) => setFormData({...formData, meeting_date: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Horário *
              </label>
              <input
                type="time"
                value={formData.meeting_time}
                onChange={(e) => setFormData({...formData, meeting_time: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-cyan-500 hover:bg-cyan-600">
              Criar Reunião
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal de participantes
const ParticipantsModal = ({ meeting, participants, onClose, onAddParticipant, onCloseMeeting, onRefresh }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    notes: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onAddParticipant(formData);
    setFormData({ name: '', email: '', phone: '', cpf: '', notes: '' });
    setShowAddForm(false);
    onRefresh();
  };

  const isDraft = meeting.status === 'draft';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-outfit font-semibold text-slate-900">{meeting.title}</h3>
            <p className="text-sm text-slate-600 mt-1">
              {participants.length} participante{participants.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Botão adicionar participante */}
          {isDraft && !showAddForm && (
            <Button
              onClick={() => setShowAddForm(true)}
              className="w-full bg-cyan-500 hover:bg-cyan-600"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Adicionar Participante
            </Button>
          )}

          {/* Formulário adicionar participante */}
          {showAddForm && (
            <form onSubmit={handleSubmit} className="bg-slate-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Nome completo *"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  required
                />
                <input
                  type="email"
                  placeholder="Email *"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  required
                />
                <input
                  type="text"
                  placeholder="Telefone *"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  required
                />
                <input
                  type="text"
                  placeholder="CPF (opcional)"
                  value={formData.cpf}
                  onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" className="bg-cyan-500">
                  Adicionar
                </Button>
              </div>
            </form>
          )}

          {/* Lista de participantes */}
          {participants.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Nenhum participante cadastrado ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {participants.map((participant, index) => (
                <div key={participant.id} className="bg-slate-50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
                      <span className="text-cyan-700 font-semibold">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{participant.name}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                        <span>{participant.email}</span>
                        <span>{participant.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer com ação */}
        {isDraft && participants.length > 0 && (
          <div className="p-6 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">
                  Ao fechar a lista, você ganhará <span className="font-bold text-green-600">{participants.length} ponto{participants.length !== 1 ? 's' : ''}</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Após fechar, não será possível adicionar mais participantes
                </p>
              </div>
              <Button
                onClick={() => onCloseMeeting(meeting.id)}
                className="bg-green-500 hover:bg-green-600"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Fechar Lista
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Meetings;
