import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from 'axios';
import { ArrowLeft, Video, Send, Users, Calendar, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const LiveClassView = () => {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [module, setModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatRef = useRef(null);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    fetchModule();
    fetchMessages();
    
    // Polling para novas mensagens a cada 3 segundos
    pollIntervalRef.current = setInterval(fetchMessages, 3000);
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [moduleId]);

  useEffect(() => {
    // Auto-scroll para novas mensagens
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchModule = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/modules/${moduleId}`);
      setModule(response.data);
    } catch (error) {
      console.error('Erro ao buscar módulo:', error);
      toast.error('Erro ao carregar aula');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/live-class/${moduleId}/chat`);
      setMessages(response.data);
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      await axios.post(`${API_URL}/api/live-class/${moduleId}/chat`, {
        module_id: moduleId,
        message: newMessage.trim()
      });
      setNewMessage('');
      fetchMessages();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await axios.delete(`${API_URL}/api/live-class/${moduleId}/chat/${messageId}`);
      fetchMessages();
      toast.success('Mensagem deletada');
    } catch (error) {
      toast.error('Erro ao deletar mensagem');
    }
  };

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    // Suporta diversos formatos de URL do YouTube
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
      /youtube\.com\/live\/([^"&?\/\s]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
      }
    }
    return null;
  };

  const getTwitchEmbedUrl = (url) => {
    if (!url) return null;
    // Extrai o canal do Twitch
    const match = url.match(/twitch\.tv\/([^\/\?]+)/);
    if (match) {
      const channel = match[1];
      return `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}`;
    }
    return null;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
        </div>
      </Layout>
    );
  }

  if (!module) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-outfit font-bold text-slate-900 dark:text-white">Aula não encontrada</h2>
          <Button onClick={() => navigate('/modules')} className="mt-4">
            Voltar para Módulos
          </Button>
        </div>
      </Layout>
    );
  }

  const embedUrl = module.live_stream_platform === 'twitch' 
    ? getTwitchEmbedUrl(module.live_stream_url)
    : getYouTubeEmbedUrl(module.live_stream_url);

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/modules')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5 text-red-500" />
              <span className="text-sm text-red-500 font-medium">AULA AO VIVO</span>
            </div>
            <h1 className="text-2xl font-outfit font-bold text-slate-900 dark:text-white">{module.title}</h1>
          </div>
          {module.live_stream_scheduled && (
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">
                {new Date(module.live_stream_scheduled).toLocaleString('pt-BR')}
              </span>
            </div>
          )}
        </div>

        {/* Main Content - Video + Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Video Player */}
          <div className="lg:col-span-3">
            <div className="bg-black rounded-xl overflow-hidden aspect-video">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  title={module.title}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white">
                  <Video className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg">Transmissão não configurada</p>
                  <p className="text-sm opacity-60 mt-2">
                    O administrador precisa configurar o link da transmissão
                  </p>
                </div>
              )}
            </div>

            {/* Descrição */}
            {module.description && (
              <div className="mt-4 bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/10 p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Sobre esta aula</h3>
                <p className="text-slate-600 dark:text-slate-400">{module.description}</p>
              </div>
            )}
          </div>

          {/* Chat */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/10 h-[500px] lg:h-[calc(56.25vw*0.75)] lg:max-h-[600px] flex flex-col">
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-500" />
                <span className="font-semibold text-slate-900 dark:text-white">Chat da Aula</span>
                <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                  {messages.length} mensagens
                </span>
              </div>

              {/* Messages */}
              <div 
                ref={chatRef}
                className="flex-1 overflow-y-auto p-3 space-y-3"
              >
                {messages.length === 0 ? (
                  <div className="text-center text-slate-400 dark:text-slate-500 py-8">
                    <p className="text-sm">Nenhuma mensagem ainda.</p>
                    <p className="text-xs mt-1">Seja o primeiro a comentar!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`group p-2 rounded-lg ${
                        msg.user_id === user?.id 
                          ? 'bg-cyan-50 dark:bg-cyan-900/30' 
                          : 'bg-slate-50 dark:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                          {msg.user_name}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {formatTime(msg.created_at)}
                          </span>
                          {(msg.user_id === user?.id || user?.role === 'admin') && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500 transition-opacity"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 break-words">
                        {msg.message}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 dark:border-white/10">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 text-sm"
                    maxLength={500}
                    disabled={sendingMessage}
                  />
                  <Button 
                    type="submit" 
                    size="sm"
                    disabled={!newMessage.trim() || sendingMessage}
                    className="bg-cyan-500 hover:bg-cyan-600"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LiveClassView;
