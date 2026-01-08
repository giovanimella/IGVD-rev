import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';
import { MessageCircle, Send, Users, Clock, CheckCheck } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AdminChat = () => {
  const { user } = useAuth();
  const { socket, connected, sendMessage, sendTyping } = useChat();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchConversations();
  }, []);

  // Configurar listeners do Socket.IO
  useEffect(() => {
    if (socket && connected) {
      socket.on('new_message', (message) => {
        console.log('Nova mensagem recebida no admin:', message);
        
        // Atualizar mensagens se for da conversa selecionada
        if (selectedConversation && message.conversation_id === selectedConversation.id) {
          setMessages((prev) => [...prev, message]);
          markAsRead(selectedConversation.id);
        }
        
        // Atualizar lista de conversas
        fetchConversations();
      });

      socket.on('user_typing', (data) => {
        if (selectedConversation && data.conversation_id === selectedConversation.id) {
          setIsTyping(data.is_typing);
        }
      });

      return () => {
        socket.off('new_message');
        socket.off('user_typing');
      };
    }
  }, [socket, connected, selectedConversation]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/chat/conversations`);
      setConversations(response.data);
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversation) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/chat/conversations/${conversation.id}/messages`
      );
      setMessages(response.data);
      setSelectedConversation(conversation);
      
      // Marcar como lida
      markAsRead(conversation.id);
      
      // Focar no input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const markAsRead = (conversationId) => {
    if (socket && connected) {
      socket.emit('mark_as_read', { conversation_id: conversationId });
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!messageText.trim() || !selectedConversation) return;

    if (socket && connected) {
      socket.emit('send_message', {
        conversation_id: selectedConversation.id,
        message: messageText
      });
    }

    setMessageText('');
    sendTyping(false);
  };

  const handleTyping = (e) => {
    setMessageText(e.target.value);

    if (!selectedConversation || !socket || !connected) return;

    socket.emit('typing', {
      conversation_id: selectedConversation.id,
      is_typing: true
    });

    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    const timeout = setTimeout(() => {
      socket.emit('typing', {
        conversation_id: selectedConversation.id,
        is_typing: false
      });
    }, 2000);

    setTypingTimeout(timeout);
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
      <div className="h-[calc(100vh-120px)]">
        <div className="mb-6">
          <h1 className="text-3xl font-outfit font-bold text-slate-900">Chat de Suporte</h1>
          <p className="text-slate-600 mt-2">Gerencie conversas com os licenciados</p>
        </div>

        <div className="grid grid-cols-12 gap-6 h-[calc(100%-100px)]">
          {/* Lista de Conversas */}
          <div className="col-span-4 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-outfit font-semibold text-slate-900 flex items-center">
                <Users className="w-5 h-5 mr-2 text-cyan-500" />
                Conversas Ativas
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <MessageCircle className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-slate-500 text-sm">Nenhuma conversa ainda</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => loadMessages(conv)}
                    className={`w-full p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors text-left ${
                      selectedConversation?.id === conv.id ? 'bg-cyan-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-slate-900">{conv.user_name}</h4>
                      {conv.unread_count > 0 && (
                        <span className="bg-cyan-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    {conv.last_message && (
                      <p className="text-sm text-slate-600 truncate mb-1">
                        {conv.last_message}
                      </p>
                    )}
                    {conv.last_message_at && (
                      <p className="text-xs text-slate-400 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDistanceToNow(new Date(conv.last_message_at), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Área de Chat */}
          <div className="col-span-8 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
            {selectedConversation ? (
              <>
                {/* Header da Conversa */}
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <h3 className="font-outfit font-semibold text-slate-900">
                    {selectedConversation.user_name}
                  </h3>
                  <p className="text-sm text-slate-600">
                    Licenciado • {connected ? 'Conectado' : 'Desconectado'}
                  </p>
                </div>

                {/* Mensagens */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                  {messages.map((message) => {
                    const isOwn = message.sender_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                            isOwn
                              ? 'bg-cyan-500 text-white rounded-br-sm'
                              : 'bg-white text-slate-900 rounded-bl-sm border border-slate-200'
                          }`}
                        >
                          {!isOwn && (
                            <p className="text-xs font-semibold mb-1 text-cyan-600">
                              {message.sender_name}
                            </p>
                          )}
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.message}
                          </p>
                          <div className="flex items-center justify-end mt-1 space-x-1">
                            <p
                              className={`text-xs ${
                                isOwn ? 'text-cyan-100' : 'text-slate-500'
                              }`}
                            >
                              {format(new Date(message.created_at), 'HH:mm', { locale: ptBR })}
                            </p>
                            {isOwn && message.read && (
                              <CheckCheck className="w-4 h-4 text-cyan-100" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 border border-slate-200">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white">
                  <div className="flex items-center space-x-3">
                    <input
                      ref={inputRef}
                      type="text"
                      value={messageText}
                      onChange={handleTyping}
                      placeholder="Digite sua resposta..."
                      className="flex-1 px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                    <button
                      type="submit"
                      disabled={!messageText.trim()}
                      className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 transition-colors font-medium flex items-center"
                    >
                      <Send className="w-5 h-5 mr-2" />
                      Enviar
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="w-20 h-20 bg-cyan-100 rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="w-10 h-10 text-cyan-500" />
                </div>
                <h3 className="font-outfit font-semibold text-slate-900 text-lg mb-2">
                  Selecione uma conversa
                </h3>
                <p className="text-slate-600 max-w-md">
                  Escolha uma conversa na lista ao lado para começar a responder
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminChat;
