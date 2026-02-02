import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  Video,
  Users,
  Megaphone,
  Target,
  MoreHorizontal,
  Clock,
  MapPin,
  Link as LinkIcon,
  Search,
  Filter,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

const AdminCompanyEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    event_type: 'live',
    description: '',
    duration: '',
    link: '',
    location: ''
  });

  const eventTypes = [
    { key: 'live', label: 'Live', icon: Video, color: 'bg-red-500' },
    { key: 'evento', label: 'Evento', icon: Calendar, color: 'bg-purple-500' },
    { key: 'reuniao', label: 'Reunião', icon: Users, color: 'bg-blue-500' },
    { key: 'campanha', label: 'Campanha', icon: Megaphone, color: 'bg-orange-500' },
    { key: 'outro', label: 'Outro', icon: MoreHorizontal, color: 'bg-slate-500' }
  ];

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/appointments/company-events`);
      setEvents(response.data);
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      toast.error('Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  };

  const openNewEventModal = () => {
    setEditingEvent(null);
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      title: '',
      date: today,
      time: '19:00',
      event_type: 'live',
      description: '',
      duration: '1 hora',
      link: '',
      location: ''
    });
    setShowModal(true);
  };

  const openEditEventModal = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      date: event.date,
      time: event.time,
      event_type: event.event_type,
      description: event.description || '',
      duration: event.duration || '',
      link: event.link || '',
      location: event.location || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingEvent) {
        await axios.put(`${API_URL}/api/appointments/company-events/${editingEvent.id}`, formData);
        toast.success('Evento atualizado!');
      } else {
        await axios.post(`${API_URL}/api/appointments/company-events`, formData);
        toast.success('Evento criado!');
      }
      setShowModal(false);
      fetchEvents();
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
      toast.error('Erro ao salvar evento');
    }
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('Tem certeza que deseja excluir este evento?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/appointments/company-events/${eventId}`);
      toast.success('Evento excluído!');
      fetchEvents();
    } catch (error) {
      console.error('Erro ao excluir evento:', error);
      toast.error('Erro ao excluir evento');
    }
  };

  const toggleEventStatus = async (event) => {
    try {
      await axios.put(`${API_URL}/api/appointments/company-events/${event.id}`, {
        active: !event.active
      });
      toast.success(event.active ? 'Evento desativado' : 'Evento ativado');
      fetchEvents();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const getEventTypeInfo = (typeKey) => {
    return eventTypes.find(t => t.key === typeKey) || eventTypes[4];
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'short', 
      day: '2-digit', 
      month: 'short',
      year: 'numeric'
    });
  };

  const isUpcoming = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(dateStr + 'T00:00:00');
    return eventDate >= today;
  };

  // Filtrar eventos
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || event.event_type === filterType;
    return matchesSearch && matchesType;
  });

  // Separar eventos futuros e passados
  const upcomingEvents = filteredEvents.filter(e => isUpcoming(e.date));
  const pastEvents = filteredEvents.filter(e => !isUpcoming(e.date));

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
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
          <div>
            <h1 className="text-2xl lg:text-3xl font-outfit font-bold text-slate-900 dark:text-white">
              Eventos da Empresa
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Gerencie lives, eventos, reuniões e campanhas que aparecem na agenda de todos os licenciados
            </p>
          </div>
          <Button
            onClick={openNewEventModal}
            className="bg-cyan-500 hover:bg-cyan-600"
            data-testid="new-event-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Evento
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar eventos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
              data-testid="search-events"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
            data-testid="filter-type"
          >
            <option value="all">Todos os tipos</option>
            {eventTypes.map(type => (
              <option key={type.key} value={type.key}>{type.label}</option>
            ))}
          </select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#1b4c51] p-4 rounded-xl border border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{events.length}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#1b4c51] p-4 rounded-xl border border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {events.filter(e => e.active && isUpcoming(e.date)).length}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Próximos</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#1b4c51] p-4 rounded-xl border border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Video className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {events.filter(e => e.event_type === 'live').length}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Lives</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#1b4c51] p-4 rounded-xl border border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {events.filter(e => e.event_type === 'campanha').length}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Campanhas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Eventos Futuros */}
        {upcomingEvents.length > 0 && (
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-white/10">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-500" />
                Próximos Eventos ({upcomingEvents.length})
              </h2>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-white/10">
              {upcomingEvents.map(event => {
                const typeInfo = getEventTypeInfo(event.event_type);
                const Icon = typeInfo.icon;
                return (
                  <div 
                    key={event.id} 
                    className={`p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${!event.active ? 'opacity-50' : ''}`}
                    data-testid={`event-${event.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl ${typeInfo.color} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900 dark:text-white">{event.title}</h3>
                            {!event.active && (
                              <span className="px-2 py-0.5 text-xs bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400 rounded-full">
                                Desativado
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(event.date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {event.time}
                              {event.duration && ` (${event.duration})`}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {event.location}
                              </span>
                            )}
                            {event.link && (
                              <a 
                                href={event.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-cyan-500 hover:text-cyan-600"
                              >
                                <LinkIcon className="w-4 h-4" />
                                Link
                              </a>
                            )}
                          </div>
                          {event.description && (
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{event.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => toggleEventStatus(event)}
                          className={`p-2 rounded-lg transition-colors ${
                            event.active 
                              ? 'hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500' 
                              : 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-500'
                          }`}
                          title={event.active ? 'Desativar' : 'Ativar'}
                        >
                          {event.active ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => openEditEventModal(event)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                          data-testid={`edit-event-${event.id}`}
                        >
                          <Edit className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          data-testid={`delete-event-${event.id}`}
                        >
                          <Trash2 className="w-5 h-5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Lista de Eventos Passados */}
        {pastEvents.length > 0 && (
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-white/10">
              <h2 className="text-lg font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Eventos Passados ({pastEvents.length})
              </h2>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-white/10 opacity-60">
              {pastEvents.slice(0, 5).map(event => {
                const typeInfo = getEventTypeInfo(event.event_type);
                const Icon = typeInfo.icon;
                return (
                  <div key={event.id} className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg ${typeInfo.color} flex items-center justify-center opacity-50`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-700 dark:text-slate-300">{event.title}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-500">
                            {formatDate(event.date)} às {event.time}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {pastEvents.length > 5 && (
                <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                  E mais {pastEvents.length - 5} eventos passados...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredEvents.length === 0 && (
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/10 p-12 text-center">
            <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Nenhum evento encontrado
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              {searchTerm || filterType !== 'all' 
                ? 'Tente ajustar os filtros de busca'
                : 'Crie eventos que aparecerão na agenda de todos os licenciados'}
            </p>
            <Button onClick={openNewEventModal} className="bg-cyan-500 hover:bg-cyan-600">
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Evento
            </Button>
          </div>
        )}
      </div>

      {/* Modal de Evento */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? 'Editar Evento' : 'Novo Evento da Empresa'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Título do Evento *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
                placeholder="Ex: Live de Lançamento do Produto"
                required
                data-testid="event-title-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Data *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
                  required
                  data-testid="event-date-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Horário *
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
                  required
                  data-testid="event-time-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tipo de Evento *
                </label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
                  data-testid="event-type-select"
                >
                  {eventTypes.map(type => (
                    <option key={type.key} value={type.key}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Duração
                </label>
                <input
                  type="text"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
                  placeholder="Ex: 1 hora"
                  data-testid="event-duration-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Link (YouTube, Zoom, etc.)
              </label>
              <input
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
                placeholder="https://youtube.com/live/..."
                data-testid="event-link-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Local (se presencial)
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
                placeholder="Ex: Sede da empresa, São Paulo"
                data-testid="event-location-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Descrição
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
                rows={3}
                placeholder="Detalhes do evento que os licenciados verão..."
                data-testid="event-description-input"
              />
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
                className="bg-cyan-500 hover:bg-cyan-600"
                data-testid="save-event-btn"
              >
                {editingEvent ? 'Salvar Alterações' : 'Criar Evento'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AdminCompanyEvents;
