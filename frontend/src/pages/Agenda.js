import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Users,
  Briefcase,
  GraduationCap,
  Bell,
  MoreHorizontal,
  X,
  Edit,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const Agenda = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    category: 'outro',
    description: '',
    duration: ''
  });

  const categories = [
    { key: 'visita_cliente', label: 'Visita a Cliente', icon: Users, color: 'bg-blue-500' },
    { key: 'reuniao', label: 'Reunião', icon: Briefcase, color: 'bg-purple-500' },
    { key: 'treinamento', label: 'Treinamento', icon: GraduationCap, color: 'bg-green-500' },
    { key: 'lembrete', label: 'Lembrete', icon: Bell, color: 'bg-amber-500' },
    { key: 'outro', label: 'Outro', icon: MoreHorizontal, color: 'bg-slate-500' }
  ];

  useEffect(() => {
    fetchAppointments();
  }, [currentDate]);

  const fetchAppointments = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const response = await axios.get(`${API_URL}/api/appointments/month/${year}/${month}`);
      setAppointments(response.data);
    } catch (error) {
      console.error('Erro ao buscar compromissos:', error);
      toast.error('Erro ao carregar compromissos');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    
    // Dias do mês anterior
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthLastDay - i)
      });
    }

    // Dias do mês atual
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      });
    }

    // Dias do próximo mês
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      });
    }

    return days;
  };

  const formatDateToISO = (date) => {
    return date.toISOString().split('T')[0];
  };

  const getAppointmentsForDate = (date) => {
    const dateStr = formatDateToISO(date);
    return appointments.filter(apt => apt.date === dateStr);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (dayInfo) => {
    setSelectedDate(dayInfo.date);
  };

  const openNewAppointmentModal = (date = null) => {
    setEditingAppointment(null);
    setFormData({
      title: '',
      date: date ? formatDateToISO(date) : formatDateToISO(new Date()),
      time: '09:00',
      category: 'outro',
      description: '',
      duration: ''
    });
    setShowModal(true);
  };

  const openEditAppointmentModal = (appointment) => {
    setEditingAppointment(appointment);
    setFormData({
      title: appointment.title,
      date: appointment.date,
      time: appointment.time,
      category: appointment.category,
      description: appointment.description || '',
      duration: appointment.duration || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingAppointment) {
        await axios.put(`${API_URL}/api/appointments/${editingAppointment.id}`, formData);
        toast.success('Compromisso atualizado!');
      } else {
        await axios.post(`${API_URL}/api/appointments/`, formData);
        toast.success('Compromisso criado!');
      }
      setShowModal(false);
      fetchAppointments();
    } catch (error) {
      console.error('Erro ao salvar compromisso:', error);
      toast.error('Erro ao salvar compromisso');
    }
  };

  const handleDelete = async (appointmentId) => {
    if (!window.confirm('Tem certeza que deseja excluir este compromisso?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/appointments/${appointmentId}`);
      toast.success('Compromisso excluído!');
      fetchAppointments();
    } catch (error) {
      console.error('Erro ao excluir compromisso:', error);
      toast.error('Erro ao excluir compromisso');
    }
  };

  const getCategoryInfo = (categoryKey) => {
    return categories.find(c => c.key === categoryKey) || categories[4];
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const days = getDaysInMonth(currentDate);
  const selectedDateAppointments = selectedDate ? getAppointmentsForDate(selectedDate) : [];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-outfit font-bold text-slate-900 dark:text-white">Minha Agenda</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Gerencie seus compromissos e atividades</p>
          </div>
          <Button
            onClick={() => openNewAppointmentModal()}
            className="bg-cyan-500 hover:bg-cyan-600"
            data-testid="new-appointment-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Compromisso
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendário */}
          <div className="lg:col-span-2 bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/10 p-6">
            {/* Navegação do mês */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                data-testid="prev-month-btn"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
              <h2 className="text-xl font-outfit font-semibold text-slate-900 dark:text-white">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                data-testid="next-month-btn"
              >
                <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            {/* Dias da semana */}
            <div className="grid grid-cols-7 mb-2">
              {weekDays.map(day => (
                <div key={day} className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Dias do mês */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((dayInfo, index) => {
                const dayAppointments = getAppointmentsForDate(dayInfo.date);
                const isSelected = selectedDate && formatDateToISO(selectedDate) === formatDateToISO(dayInfo.date);
                
                return (
                  <div
                    key={index}
                    onClick={() => handleDateClick(dayInfo)}
                    className={`
                      min-h-[80px] p-2 rounded-lg cursor-pointer transition-all border
                      ${dayInfo.isCurrentMonth ? 'bg-white dark:bg-[#151B28]' : 'bg-slate-50 dark:bg-white/5'}
                      ${isSelected ? 'border-cyan-500 ring-2 ring-cyan-200 dark:ring-cyan-500/30' : 'border-transparent hover:border-slate-200 dark:hover:border-white/20'}
                      ${isToday(dayInfo.date) ? 'bg-cyan-50 dark:bg-cyan-900/30' : ''}
                    `}
                    data-testid={`calendar-day-${dayInfo.day}`}
                  >
                    <span className={`
                      text-sm font-medium
                      ${dayInfo.isCurrentMonth ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}
                      ${isToday(dayInfo.date) ? 'bg-cyan-500 text-white w-7 h-7 rounded-full flex items-center justify-center' : ''}
                    `}>
                      {dayInfo.day}
                    </span>
                    
                    {/* Indicadores de compromissos */}
                    <div className="mt-1 space-y-1">
                      {dayAppointments.slice(0, 2).map((apt, i) => {
                        const catInfo = getCategoryInfo(apt.category);
                        return (
                          <div
                            key={i}
                            className={`text-xs truncate px-1 py-0.5 rounded ${catInfo.color} text-white`}
                          >
                            {apt.time.slice(0, 5)}
                          </div>
                        );
                      })}
                      {dayAppointments.length > 2 && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
                          +{dayAppointments.length - 2}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lista de compromissos do dia */}
          <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-outfit font-semibold text-slate-900 dark:text-white">
                {selectedDate ? (
                  <>
                    {selectedDate.getDate()} de {monthNames[selectedDate.getMonth()]}
                  </>
                ) : (
                  'Selecione um dia'
                )}
              </h3>
              {selectedDate && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openNewAppointmentModal(selectedDate)}
                  data-testid="add-appointment-day-btn"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>

            {selectedDate ? (
              selectedDateAppointments.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateAppointments.map((apt) => {
                    const catInfo = getCategoryInfo(apt.category);
                    const Icon = catInfo.icon;
                    return (
                      <div
                        key={apt.id}
                        className="p-4 rounded-lg border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-colors"
                        data-testid={`appointment-${apt.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-lg ${catInfo.color} flex items-center justify-center flex-shrink-0`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">{apt.title}</p>
                              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
                                <Clock className="w-4 h-4" />
                                <span>{apt.time}</span>
                                {apt.duration && (
                                  <span className="text-slate-400 dark:text-slate-500">• {apt.duration}</span>
                                )}
                              </div>
                              {apt.description && (
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{apt.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditAppointmentModal(apt)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                              data-testid={`edit-${apt.id}`}
                            >
                              <Edit className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            </button>
                            <button
                              onClick={() => handleDelete(apt.id)}
                              className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              data-testid={`delete-${apt.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">Nenhum compromisso neste dia</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => openNewAppointmentModal(selectedDate)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              )
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400">Clique em um dia para ver os compromissos</p>
              </div>
            )}

            {/* Legenda de categorias */}
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">Categorias</p>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(cat => (
                  <div key={cat.key} className="flex items-center gap-2 text-xs">
                    <div className={`w-3 h-3 rounded ${cat.color}`} />
                    <span className="text-slate-600 dark:text-slate-400">{cat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Compromisso */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingAppointment ? 'Editar Compromisso' : 'Novo Compromisso'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Título *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-[#0B0F18] text-slate-900 dark:text-white"
                placeholder="Ex: Reunião com cliente"
                required
                data-testid="appointment-title-input"
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
                  className="w-full px-3 py-2 border border-slate-300 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-[#0B0F18] text-slate-900 dark:text-white"
                  required
                  data-testid="appointment-date-input"
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
                  className="w-full px-3 py-2 border border-slate-300 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-[#0B0F18] text-slate-900 dark:text-white"
                  required
                  data-testid="appointment-time-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Categoria
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-[#0B0F18] text-slate-900 dark:text-white"
                  data-testid="appointment-category-select"
                >
                  {categories.map(cat => (
                    <option key={cat.key} value={cat.key}>{cat.label}</option>
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
                  className="w-full px-3 py-2 border border-slate-300 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-[#0B0F18] text-slate-900 dark:text-white"
                  placeholder="Ex: 1 hora"
                  data-testid="appointment-duration-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Observações
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-[#0B0F18] text-slate-900 dark:text-white"
                rows={3}
                placeholder="Detalhes do compromisso..."
                data-testid="appointment-description-input"
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
                data-testid="save-appointment-btn"
              >
                {editingAppointment ? 'Salvar Alterações' : 'Criar Compromisso'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Agenda;
