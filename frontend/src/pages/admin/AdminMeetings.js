import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { Save, Users, Trophy, Settings as SettingsIcon, TrendingUp, Loader, Download, FileSpreadsheet, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

const AdminMeetings = () => {
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportingMeeting, setExportingMeeting] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportData, setExportData] = useState(null);

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

  const handleExportParticipants = async (meetingId) => {
    setExportingMeeting(meetingId);
    try {
      const response = await axios.get(`${API_URL}/api/meetings/${meetingId}/participants/export`);
      setExportData(response.data);
      setShowExportModal(true);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar participantes');
    } finally {
      setExportingMeeting(null);
    }
  };

  const downloadCSV = () => {
    if (!exportData) return;

    const { meeting, participants } = exportData;
    
    // Criar cabeçalho
    const headers = ['Nome', 'Telefone', 'Email', 'CPF'];
    
    // Criar linhas
    const rows = participants.map(p => [
      p.name || '',
      p.phone || '',
      p.email || '',
      p.cpf || ''
    ]);
    
    // Juntar tudo
    const csvContent = [
      `Reunião: ${meeting.title}`,
      `Licenciado: ${meeting.user_name}`,
      `Local: ${meeting.location}`,
      `Data: ${new Date(meeting.meeting_date).toLocaleDateString('pt-BR')} às ${meeting.meeting_time}`,
      `Total de Participantes: ${meeting.participants_count}`,
      '',
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');
    
    // Criar blob e download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `participantes_${meeting.title.replace(/\s+/g, '_')}_${meeting.meeting_date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Arquivo CSV baixado com sucesso!');
  };

  const printParticipants = () => {
    if (!exportData) return;

    const { meeting, participants } = exportData;
    
    const printContent = `
      <html>
        <head>
          <title>Lista de Participantes - ${meeting.title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { font-size: 18px; margin-bottom: 5px; }
            .info { font-size: 12px; color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            tr:nth-child(even) { background-color: #fafafa; }
            .footer { margin-top: 20px; font-size: 10px; color: #999; }
          </style>
        </head>
        <body>
          <h1>📋 Lista de Participantes</h1>
          <div class="info">
            <strong>Reunião:</strong> ${meeting.title}<br>
            <strong>Licenciado:</strong> ${meeting.user_name}<br>
            <strong>Local:</strong> ${meeting.location}<br>
            <strong>Data:</strong> ${new Date(meeting.meeting_date).toLocaleDateString('pt-BR')} às ${meeting.meeting_time}<br>
            <strong>Total:</strong> ${meeting.participants_count} participantes
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              ${participants.map((p, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${p.name || '-'}</td>
                  <td>${p.phone || '-'}</td>
                  <td>${p.email || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            Exportado em: ${new Date().toLocaleString('pt-BR')}
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
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
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase">Ações</th>
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
                    <td className="px-6 py-4 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportParticipants(meeting.id)}
                        disabled={exportingMeeting === meeting.id || meeting.participants_count === 0}
                        title={meeting.participants_count === 0 ? 'Sem participantes' : 'Exportar lista de participantes'}
                      >
                        {exportingMeeting === meeting.id ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </Button>
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

        {/* Modal de Exportação */}
        {showExportModal && exportData && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
              {/* Header */}
              <div style={{ background: 'linear-gradient(to right, rgb(58, 145, 155), rgb(27, 76, 81))' }} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{exportData.meeting.title}</h2>
                      <p className="text-white/80 text-sm">
                        {exportData.meeting.user_name} • {exportData.meeting.participants_count} participantes
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Info da Reunião */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Local:</span>
                    <span className="ml-2 font-medium text-slate-700 dark:text-slate-200">{exportData.meeting.location}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Data:</span>
                    <span className="ml-2 font-medium text-slate-700 dark:text-slate-200">
                      {new Date(exportData.meeting.meeting_date).toLocaleDateString('pt-BR')} às {exportData.meeting.meeting_time}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Status:</span>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                      exportData.meeting.status === 'closed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {exportData.meeting.status === 'closed' ? 'Fechada' : 'Em Andamento'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lista de Participantes */}
              <div className="p-6 max-h-[50vh] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-slate-100 dark:bg-slate-700 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase">#</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase">Nome</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase">Telefone</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                    {exportData.participants.map((participant, index) => (
                      <tr key={participant.id || index} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">{participant.name}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{participant.phone || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{participant.email || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {exportData.participants.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">Nenhum participante cadastrado</p>
                  </div>
                )}
              </div>

              {/* Footer com botões */}
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {exportData.participants.length} participantes na lista
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={printParticipants}
                      disabled={exportData.participants.length === 0}
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Imprimir
                    </Button>
                    <Button
                      onClick={downloadCSV}
                      disabled={exportData.participants.length === 0}
                      style={{ background: 'linear-gradient(to right, rgb(58, 145, 155), rgb(27, 76, 81))' }}
                      className="text-white hover:opacity-90"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Baixar CSV
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminMeetings;
