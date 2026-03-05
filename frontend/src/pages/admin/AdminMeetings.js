import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { Save, Users, Trophy, Settings as SettingsIcon, TrendingUp, Loader } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

const AdminMeetings = () => {
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, statsRes, meetingsRes] = await Promise.all([
        axios.get(`${API_URL}/api/meetings/settings`),
        axios.get(`${API_URL}/api/meetings/all/stats`),
        axios.get(`${API_URL}/api/meetings/all`)
      ]);

      setSettings(settingsRes.data);
      setStats(statsRes.data);
      setMeetings(meetingsRes.data);
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
      await axios.put(`${API_URL}/api/meetings/settings`, settings);
      toast.success('Configurações salvas com sucesso!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
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
        <div>
          <h1 className="text-3xl font-outfit font-bold text-slate-900">Sistema de Reuniões</h1>
          <p className="text-slate-600 mt-1">Configure o sistema de reuniões e pontuação</p>
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
                  <p className="text-3xl font-bold text-green-600 mt-1">{stats.total_closed_meetings}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Participantes</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{stats.total_participants}</p>
                </div>
                <Users className="w-10 h-10 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Pontos Distribuídos</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.total_points_distributed}</p>
                </div>
                <Trophy className="w-10 h-10 text-yellow-500" />
              </div>
            </div>
          </div>
        )}

        {/* Configurações */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <h2 className="text-xl font-outfit font-semibold text-slate-900">Configurações</h2>
            <Button
              onClick={handleSave}
              className="bg-cyan-500 hover:bg-cyan-600"
              disabled={saving}
            >
              {saving ? <Loader className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nova Regra de Pontuação */}
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-4 rounded-lg border border-cyan-200">
              <label className="block text-sm font-medium text-cyan-800 mb-2">
                <Trophy className="w-4 h-4 inline mr-1" />
                Pontos por Reunião
              </label>
              <input
                type="number"
                value={settings?.points_per_meeting || ''}
                onChange={(e) => setSettings({...settings, points_per_meeting: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-2 border border-cyan-300 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white"
              />
              <p className="text-xs text-cyan-700 mt-1">
                Pontos que o licenciado ganha ao fechar uma reunião qualificada
              </p>
            </div>

            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-4 rounded-lg border border-cyan-200">
              <label className="block text-sm font-medium text-cyan-800 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Mínimo de Cadastros para Pontuação
              </label>
              <input
                type="number"
                value={settings?.min_participants_for_points || ''}
                onChange={(e) => setSettings({...settings, min_participants_for_points: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-2 border border-cyan-300 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white"
              />
              <p className="text-xs text-cyan-700 mt-1">
                Número mínimo de participantes para ganhar os pontos da reunião
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Mínimo para Fechar Lista
              </label>
              <input
                type="number"
                value={settings?.min_participants || ''}
                onChange={(e) => setSettings({...settings, min_participants: parseInt(e.target.value)})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Mínimo de participantes para poder fechar a lista
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Máximo por Reunião
              </label>
              <input
                type="number"
                value={settings?.max_participants_per_meeting || ''}
                onChange={(e) => setSettings({...settings, max_participants_per_meeting: parseInt(e.target.value)})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Número máximo de participantes por reunião
              </p>
            </div>
          </div>

          {/* Explicação da regra */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">ℹ️ Como funciona a pontuação:</h4>
            <p className="text-sm text-blue-700">
              O licenciado ganha <strong>{settings?.points_per_meeting || 10} pontos</strong> ao fechar uma reunião 
              com <strong>{settings?.min_participants_for_points || 20} ou mais</strong> participantes cadastrados.
              <br />
              Se não atingir o mínimo, a reunião é fechada mas nenhum ponto é creditado.
            </p>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-200">
            <h3 className="text-lg font-outfit font-semibold text-slate-900">Validações</h3>
            
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings?.require_email || false}
                onChange={(e) => setSettings({...settings, require_email: e.target.checked})}
                className="w-5 h-5 text-cyan-600 rounded"
              />
              <span className="text-slate-700">Email obrigatório</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings?.require_phone || false}
                onChange={(e) => setSettings({...settings, require_phone: e.target.checked})}
                className="w-5 h-5 text-cyan-600 rounded"
              />
              <span className="text-slate-700">Telefone obrigatório</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings?.allow_duplicate_participants || false}
                onChange={(e) => setSettings({...settings, allow_duplicate_participants: e.target.checked})}
                className="w-5 h-5 text-cyan-600 rounded"
              />
              <span className="text-slate-700">Permitir mesmo CPF em reuniões diferentes</span>
            </label>
          </div>
        </div>

        {/* Lista de Reuniões */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-outfit font-semibold text-slate-900">
              Todas as Reuniões ({meetings.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Título</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Licenciado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Local</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Participantes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Pontos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {meetings.map((meeting) => (
                  <tr key={meeting.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{meeting.title}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {meeting.user_name}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(meeting.meeting_date).toLocaleDateString('pt-BR')} às {meeting.meeting_time}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {meeting.location}
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-slate-900">
                      {meeting.participants_count}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        meeting.status === 'closed' ? 'bg-green-100 text-green-700' :
                        meeting.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {meeting.status === 'closed' ? 'Fechada' :
                         meeting.status === 'draft' ? 'Em Andamento' : meeting.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {meeting.status === 'closed' ? (
                        meeting.qualified_for_points ? (
                          <span className="text-green-600 font-medium">+{meeting.points_awarded} ✓</span>
                        ) : (
                          <span className="text-slate-400">0 (não qualificou)</span>
                        )
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {meetings.length === 0 && (
              <div className="p-12 text-center">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">Nenhuma reunião cadastrada ainda</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminMeetings;
