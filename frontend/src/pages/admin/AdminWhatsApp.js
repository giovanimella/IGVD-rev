import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import {
  MessageCircle,
  Settings,
  Send,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Bell,
  Gift,
  BookOpen,
  Clock,
  RefreshCw,
  Loader2,
  History,
  Wifi,
  WifiOff
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminWhatsApp = () => {
  const [config, setConfig] = useState(null);
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('config');
  const [customMessage, setCustomMessage] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchMessages();
    fetchUsers();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/whatsapp/config`);
      setConfig(response.data);
    } catch (error) {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/whatsapp/messages?limit=50`);
      setMessages(response.data.messages);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users/`);
      setUsers(response.data.filter(u => u.role === 'licenciado' && u.phone));
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/whatsapp/config`, config);
      toast.success('Configurações salvas!');
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const response = await axios.post(`${API_URL}/api/whatsapp/test-connection`);
      setConnectionStatus(response.data);
      if (response.data.success) {
        toast.success('Conexão estabelecida!');
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error('Erro ao testar conexão');
      setConnectionStatus({ success: false, message: 'Erro de conexão' });
    } finally {
      setTesting(false);
    }
  };

  const handleSendCustomMessage = async () => {
    if (!customMessage.trim()) {
      toast.error('Digite uma mensagem');
      return;
    }
    if (selectedUsers.length === 0) {
      toast.error('Selecione pelo menos um usuário');
      return;
    }

    setSending(true);
    try {
      await axios.post(`${API_URL}/api/whatsapp/send-custom`, {
        user_ids: selectedUsers,
        message: customMessage
      });
      toast.success(`Enviando para ${selectedUsers.length} usuários`);
      setCustomMessage('');
      setSelectedUsers([]);
      setTimeout(fetchMessages, 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao enviar');
    } finally {
      setSending(false);
    }
  };

  const handleTriggerNotification = async (type, params = {}) => {
    try {
      let endpoint = '';
      let body = params;
      
      switch (type) {
        case 'birthday':
          endpoint = '/api/whatsapp/trigger/birthday';
          break;
        case 'reminder':
          endpoint = '/api/whatsapp/trigger/access-reminder';
          break;
        default:
          return;
      }
      
      const response = await axios.post(`${API_URL}${endpoint}`, body);
      toast.success(response.data.message);
      setTimeout(fetchMessages, 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao disparar');
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

  const tabs = [
    { id: 'config', label: 'Configurações', icon: Settings },
    { id: 'send', label: 'Enviar Mensagem', icon: Send },
    { id: 'history', label: 'Histórico', icon: History },
    { id: 'triggers', label: 'Disparos', icon: Bell }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">Notificações WhatsApp</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Configure notificações automáticas via WhatsApp (Evolution API)</p>
          </div>
          <div className="flex items-center space-x-2">
            {connectionStatus && (
              <span className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                connectionStatus.success 
                  ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
              }`}>
                {connectionStatus.success ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                <span>{connectionStatus.success ? 'Conectado' : 'Desconectado'}</span>
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total || 0}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total enviadas</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.sent || 0}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Entregues</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-500/20 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed || 0}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Falhas</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending || 0}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Pendentes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden">
          <div className="flex border-b border-slate-200 dark:border-white/10">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-4 border-b-2 transition-all ${
                    activeTab === tab.id
                      ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-6">
            {/* Tab: Configurações */}
            {activeTab === 'config' && config && (
              <div className="space-y-6">
                {/* Conexão API */}
                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Conexão Evolution API</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL da API</label>
                      <input
                        type="text"
                        value={config.api_url || ''}
                        onChange={(e) => setConfig({ ...config, api_url: e.target.value })}
                        placeholder="https://evolution-api.seu-servidor.com"
                        className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">API Key</label>
                      <input
                        type="password"
                        value={config.api_key || ''}
                        onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                        placeholder="Sua API Key"
                        className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da Instância</label>
                      <input
                        type="text"
                        value={config.instance_name || ''}
                        onChange={(e) => setConfig({ ...config, instance_name: e.target.value })}
                        placeholder="nome-instancia"
                        className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleTestConnection}
                        disabled={testing}
                        className="flex items-center space-x-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50"
                      >
                        {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        <span>Testar Conexão</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Toggle Geral */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white">Ativar Notificações WhatsApp</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Habilita o envio de mensagens automáticas</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 dark:peer-focus:ring-cyan-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-cyan-500"></div>
                  </label>
                </div>

                {/* Tipos de Notificação */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Tipos de Notificação</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: 'notify_new_modules', icon: BookOpen, label: 'Novos Módulos', desc: 'Avisar quando novos módulos forem publicados' },
                      { key: 'notify_tips', icon: AlertTriangle, label: 'Dicas', desc: 'Enviar dicas periódicas aos licenciados' },
                      { key: 'notify_access_reminder', icon: Clock, label: 'Lembrete de Acesso', desc: 'Lembrar usuários inativos' },
                      { key: 'notify_birthday', icon: Gift, label: 'Aniversário', desc: 'Enviar parabéns no aniversário' },
                      { key: 'notify_live_classes', icon: Bell, label: 'Aulas ao Vivo', desc: 'Notificar sobre aulas ao vivo' },
                      { key: 'notify_custom', icon: MessageCircle, label: 'Personalizadas', desc: 'Permitir mensagens personalizadas' }
                    ].map(({ key, icon: Icon, label, desc }) => (
                      <div key={key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg flex items-center justify-center">
                            <Icon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{label}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config[key]}
                            onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dias de Lembrete */}
                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Dias sem acesso para enviar lembrete
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={config.access_reminder_days || 7}
                    onChange={(e) => setConfig({ ...config, access_reminder_days: parseInt(e.target.value) })}
                    className="w-32 px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Salvar */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveConfig}
                    disabled={saving}
                    className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    <span>Salvar Configurações</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Enviar Mensagem */}
            {activeTab === 'send' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Mensagem</label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="w-full px-4 py-3 border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 h-32"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Destinatários</label>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedUsers(users.map(u => u.id))}
                        className="text-sm text-cyan-600 hover:text-cyan-700"
                      >
                        Selecionar todos
                      </button>
                      <span className="text-slate-400">|</span>
                      <button
                        onClick={() => setSelectedUsers([])}
                        className="text-sm text-slate-500 hover:text-slate-700"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-white/10 rounded-xl">
                    {users.map((u) => (
                      <label
                        key={u.id}
                        className="flex items-center space-x-3 p-3 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer border-b border-slate-100 dark:border-white/5 last:border-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, u.id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                            }
                          }}
                          className="w-4 h-4 text-cyan-500 rounded"
                        />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{u.full_name}</p>
                          <p className="text-sm text-slate-500">{u.phone}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="text-sm text-slate-500 mt-2">{selectedUsers.length} selecionados</p>
                </div>
                <button
                  onClick={handleSendCustomMessage}
                  disabled={sending || !customMessage.trim() || selectedUsers.length === 0}
                  className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Enviar Mensagem</span>
                </button>
              </div>
            )}

            {/* Tab: Histórico */}
            {activeTab === 'history' && (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/10">
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Destinatário</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Tipo</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Mensagem</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {messages.map((msg) => (
                        <tr key={msg.id} className="border-b border-slate-100 dark:border-white/5">
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-900 dark:text-white">{msg.user_name}</p>
                            <p className="text-sm text-slate-500">{msg.phone}</p>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 text-xs rounded-full">
                              {msg.message_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">
                            {msg.content}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`flex items-center space-x-1 text-sm ${
                              msg.status === 'sent' ? 'text-green-600' :
                              msg.status === 'failed' ? 'text-red-600' : 'text-amber-600'
                            }`}>
                              {msg.status === 'sent' ? <CheckCircle className="w-4 h-4" /> :
                               msg.status === 'failed' ? <XCircle className="w-4 h-4" /> :
                               <Clock className="w-4 h-4" />}
                              <span>{msg.status}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-500">
                            {new Date(msg.created_at).toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab: Disparos */}
            {activeTab === 'triggers' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-pink-100 dark:bg-pink-500/20 rounded-xl flex items-center justify-center">
                      <Gift className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">Aniversários do Dia</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Envia parabéns para aniversariantes</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTriggerNotification('birthday')}
                    className="w-full py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
                  >
                    Disparar Agora
                  </button>
                </div>
                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/20 rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">Lembrete de Acesso</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Lembra usuários inativos</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTriggerNotification('reminder')}
                    className="w-full py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                  >
                    Disparar Agora
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminWhatsApp;
