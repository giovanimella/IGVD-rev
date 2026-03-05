import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { Video, Save, Power, Gift, Users, Link, Loader, CheckCircle, Clock, Calendar, Download, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

const AdminLive = () => {
  const [settings, setSettings] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, sessionsRes] = await Promise.all([
        axios.get(`${API_URL}/api/live/admin/settings`),
        axios.get(`${API_URL}/api/live/admin/sessions`)
      ]);
      setSettings(settingsRes.data);
      setSessions(sessionsRes.data);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/live/admin/settings`, {
        title: settings.title,
        description: settings.description,
        meeting_link: settings.meeting_link,
        points_reward: settings.points_reward
      });
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleStartLive = async () => {
    if (!settings?.meeting_link) {
      toast.error('Configure o link do Google Meet primeiro!');
      return;
    }
    
    setStarting(true);
    try {
      const response = await axios.post(`${API_URL}/api/live/admin/start`);
      if (response.data.success) {
        toast.success(response.data.message);
        fetchData();
      }
    } catch (error) {
      const msg = error.response?.data?.detail || 'Erro ao iniciar live';
      toast.error(msg);
    } finally {
      setStarting(false);
    }
  };

  const handleEndLive = async () => {
    if (!window.confirm('Tem certeza que deseja encerrar a live?')) return;
    
    setEnding(true);
    try {
      const response = await axios.post(`${API_URL}/api/live/admin/end`);
      if (response.data.success) {
        toast.success(response.data.message);
        fetchData();
      }
    } catch (error) {
      toast.error('Erro ao encerrar live');
    } finally {
      setEnding(false);
    }
  };

  const loadSessionDetails = async (sessionId) => {
    if (selectedSession === sessionId) {
      setSelectedSession(null);
      setSessionDetails(null);
      return;
    }
    
    setSelectedSession(sessionId);
    setLoadingDetails(true);
    
    try {
      const response = await axios.get(`${API_URL}/api/live/admin/sessions/${sessionId}`);
      setSessionDetails(response.data);
    } catch (error) {
      toast.error('Erro ao carregar detalhes');
    } finally {
      setLoadingDetails(false);
    }
  };

  const exportSession = async (sessionId) => {
    try {
      const response = await axios.get(`${API_URL}/api/live/admin/sessions/${sessionId}/export`);
      
      // Criar e baixar arquivo CSV
      const blob = new Blob([response.data.csv_content], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `lista_presenca_${sessionId}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Lista exportada com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar lista');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Loader className="animate-spin h-12 w-12 text-cyan-500" />
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
            <h1 className="text-3xl font-outfit font-bold text-slate-900">Gerenciar Live</h1>
            <p className="text-slate-600 mt-1">Configure e gerencie as lives semanais</p>
          </div>
          
          {/* Botões de Controle */}
          <div className="flex gap-3">
            {settings?.is_active ? (
              <Button
                onClick={handleEndLive}
                disabled={ending}
                className="bg-red-500 hover:bg-red-600"
              >
                {ending ? (
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Power className="w-4 h-4 mr-2" />
                )}
                Encerrar Live
              </Button>
            ) : (
              <Button
                onClick={handleStartLive}
                disabled={starting}
                className="bg-green-500 hover:bg-green-600"
              >
                {starting ? (
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Video className="w-4 h-4 mr-2" />
                )}
                Iniciar Nova Live
              </Button>
            )}
          </div>
        </div>

        {/* Status Card */}
        <div className={`rounded-xl p-6 ${
          settings?.is_active 
            ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white' 
            : 'bg-slate-100 text-slate-700'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
              settings?.is_active ? 'bg-white/20' : 'bg-slate-200'
            }`}>
              <Video className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">{settings?.title || 'Live Semanal'}</h2>
                {settings?.is_active && (
                  <span className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full text-sm">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    AO VIVO
                  </span>
                )}
              </div>
              <p className={settings?.is_active ? 'text-white/80' : 'text-slate-500'}>
                {settings?.is_active 
                  ? `${settings?.current_session_participations || 0} participantes nesta sessão`
                  : 'Live desativada - Clique em "Iniciar Nova Live" para começar'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Configurações */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <h2 className="text-xl font-outfit font-semibold text-slate-900 flex items-center gap-2">
            <Video className="w-5 h-5 text-cyan-500" />
            Configurações da Live
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Título da Live
              </label>
              <input
                type="text"
                value={settings?.title || ''}
                onChange={(e) => setSettings({...settings, title: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                placeholder="Ex: Live Semanal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Gift className="w-4 h-4 inline mr-1" />
                Pontos por Participação
              </label>
              <input
                type="number"
                value={settings?.points_reward || 10}
                onChange={(e) => setSettings({...settings, points_reward: parseInt(e.target.value)})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Descrição (opcional)
            </label>
            <input
              type="text"
              value={settings?.description || ''}
              onChange={(e) => setSettings({...settings, description: e.target.value})}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
              placeholder="Ex: Toda terça-feira às 20h"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Link className="w-4 h-4 inline mr-1" />
              Link do Google Meet
            </label>
            <input
              type="url"
              value={settings?.meeting_link || ''}
              onChange={(e) => setSettings({...settings, meeting_link: e.target.value})}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="bg-cyan-500 hover:bg-cyan-600">
              {saving ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configurações
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Histórico de Sessões */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-outfit font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-500" />
              Histórico de Lives ({sessions.length})
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Clique em uma sessão para ver a lista de presença
            </p>
          </div>

          {sessions.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Nenhuma live realizada ainda</p>
              <p className="text-sm text-slate-500 mt-1">Clique em "Iniciar Nova Live" para começar</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {sessions.map((session) => (
                <div key={session.id}>
                  {/* Cabeçalho da Sessão */}
                  <div 
                    className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                    onClick={() => loadSessionDetails(session.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        session.is_active ? 'bg-red-100' : 'bg-slate-100'
                      }`}>
                        <Video className={`w-5 h-5 ${session.is_active ? 'text-red-500' : 'text-slate-500'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-slate-900">{session.title}</h3>
                          {session.is_active && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                              Em andamento
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">
                          {formatDateShort(session.started_at)} • {session.participants_count || 0} participantes
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          exportSession(session.id);
                        }}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Exportar
                      </Button>
                      {selectedSession === session.id ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Detalhes da Sessão (Lista de Presença) */}
                  {selectedSession === session.id && (
                    <div className="bg-slate-50 border-t border-slate-200 p-4">
                      {loadingDetails ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader className="w-6 h-6 animate-spin text-cyan-500" />
                        </div>
                      ) : sessionDetails ? (
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-slate-900">
                              Lista de Presença ({sessionDetails.total_participants} participantes)
                            </h4>
                            <span className="text-sm text-green-600">
                              <Gift className="w-4 h-4 inline mr-1" />
                              {sessionDetails.total_points_distributed} pontos distribuídos
                            </span>
                          </div>

                          {sessionDetails.participants.length === 0 ? (
                            <p className="text-slate-500 text-center py-4">
                              Nenhum participante registrado
                            </p>
                          ) : (
                            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                              <table className="w-full">
                                <thead className="bg-slate-100">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">#</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Nome</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Email</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Pontos</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Horário</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {sessionDetails.participants.map((p, index) => (
                                    <tr key={p.id} className="hover:bg-slate-50">
                                      <td className="px-4 py-2 text-sm text-slate-500">{index + 1}</td>
                                      <td className="px-4 py-2 text-sm font-medium text-slate-900">{p.user_name}</td>
                                      <td className="px-4 py-2 text-sm text-slate-600">{p.user_email}</td>
                                      <td className="px-4 py-2 text-sm text-green-600">+{p.points_earned}</td>
                                      <td className="px-4 py-2 text-sm text-slate-500">
                                        {new Date(p.participated_at).toLocaleTimeString('pt-BR')}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminLive;
