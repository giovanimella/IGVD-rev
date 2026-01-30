import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const API_URL = process.env.REACT_APP_BACKEND_URL;
  const SOCKET_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  // Conectar ao Socket.IO
  useEffect(() => {
    if (user && token) {
      console.log('Conectando ao Socket.IO...', SOCKET_URL);
      
      const newSocket = io(SOCKET_URL, {
        path: '/api/socket.io',
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      newSocket.on('connect', () => {
        console.log('Conectado ao Socket.IO!');
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Desconectado do Socket.IO');
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Erro de conexão Socket.IO:', error);
      });

      newSocket.on('new_message', (message) => {
        console.log('Nova mensagem recebida:', message);
        setMessages((prev) => [...prev, message]);
        
        // Atualizar contador de não lidas se o chat não estiver aberto
        if (!isChatOpen && message.sender_id !== user?.id) {
          setUnreadCount((prev) => prev + 1);
        }
      });

      newSocket.on('user_typing', (data) => {
        if (data.user_id !== user?.id) {
          setIsTyping(data.is_typing);
        }
      });

      newSocket.on('messages_read', () => {
        setUnreadCount(0);
      });

      newSocket.on('error', (error) => {
        console.error('Erro do Socket.IO:', error);
      });

      setSocket(newSocket);

      return () => {
        console.log('Desconectando Socket.IO...');
        newSocket.close();
      };
    }
  }, [user, token, SOCKET_URL, isChatOpen]);

  // Buscar ou criar conversa
  const getOrCreateConversation = useCallback(async () => {
    if (!user) return;

    try {
      const response = await axios.get(`${API_URL}/api/chat/conversations/my`);
      setConversation(response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar conversa:', error);
    }
  }, [API_URL, user]);

  // Carregar mensagens
  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId) return;

    try {
      const response = await axios.get(
        `${API_URL}/api/chat/conversations/${conversationId}/messages`
      );
      setMessages(response.data);
      setUnreadCount(0);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  }, [API_URL]);

  // Enviar mensagem
  const sendMessage = useCallback((message) => {
    if (!socket || !connected || !conversation) {
      console.error('Socket não conectado ou conversa não encontrada');
      return;
    }

    socket.emit('send_message', {
      conversation_id: conversation.id,
      message: message
    });
  }, [socket, connected, conversation]);

  // Enviar evento de digitação
  const sendTyping = useCallback((isTyping) => {
    if (!socket || !connected || !conversation) return;

    socket.emit('typing', {
      conversation_id: conversation.id,
      is_typing: isTyping
    });
  }, [socket, connected, conversation]);

  // Marcar mensagens como lidas
  const markAsRead = useCallback(() => {
    if (!socket || !connected || !conversation) return;

    socket.emit('mark_as_read', {
      conversation_id: conversation.id
    });
    
    setUnreadCount(0);
  }, [socket, connected, conversation]);

  // Buscar contador de não lidas
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/chat/unread-count`);
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      console.error('Erro ao buscar contador de não lidas:', error);
    }
  }, [API_URL]);

  // Abrir chat
  const openChat = useCallback(async () => {
    setIsChatOpen(true);
    
    if (!conversation) {
      const conv = await getOrCreateConversation();
      if (conv) {
        await loadMessages(conv.id);
      }
    } else {
      await loadMessages(conversation.id);
    }
    
    markAsRead();
  }, [conversation, getOrCreateConversation, loadMessages, markAsRead]);

  // Fechar chat
  const closeChat = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  // Buscar contador ao montar
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    }
  }, [user, fetchUnreadCount]);

  const value = {
    socket,
    connected,
    messages,
    conversation,
    unreadCount,
    isTyping,
    isChatOpen,
    sendMessage,
    sendTyping,
    markAsRead,
    openChat,
    closeChat,
    getOrCreateConversation,
    loadMessages,
    fetchUnreadCount
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
