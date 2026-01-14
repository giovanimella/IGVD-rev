import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ChatWidget = () => {
  const { user } = useAuth();
  const {
    messages,
    unreadCount,
    isTyping,
    isChatOpen,
    sendMessage,
    sendTyping,
    openChat,
    closeChat
  } = useChat();

  const [messageText, setMessageText] = useState('');
  const [typingTimeout, setTypingTimeout] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto scroll para última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Foco no input quando abrir
  useEffect(() => {
    if (isChatOpen) {
      inputRef.current?.focus();
    }
  }, [isChatOpen]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!messageText.trim()) return;

    sendMessage(messageText);
    setMessageText('');
    sendTyping(false);
  };

  const handleTyping = (e) => {
    setMessageText(e.target.value);

    // Enviar evento de digitação
    sendTyping(true);

    // Limpar timeout anterior
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Parar de digitar após 2 segundos
    const timeout = setTimeout(() => {
      sendTyping(false);
    }, 2000);

    setTypingTimeout(timeout);
  };

  // Não mostrar para admins/supervisors (eles tem página dedicada)
  if (!user || user.role === 'admin' || user.role === 'supervisor') {
    return null;
  }

  return (
    <>
      {/* Botão Flutuante */}
      {!isChatOpen && (
        <button
          onClick={openChat}
          className="fixed bottom-6 right-6 bg-cyan-500 hover:bg-cyan-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 z-50 group"
          data-testid="chat-button"
        >
          <MessageCircle className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
          <span className="absolute bottom-full right-0 mb-2 bg-slate-900 text-white text-sm py-1 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Precisa de ajuda?
          </span>
        </button>
      )}

      {/* Janela de Chat */}
      {isChatOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-slate-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-outfit font-semibold">Suporte UniOzoxx</h3>
                <p className="text-xs text-cyan-100">Sempre prontos para ajudar</p>
              </div>
            </div>
            <button
              onClick={closeChat}
              className="hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8 text-cyan-500" />
                </div>
                <h4 className="font-outfit font-semibold text-slate-900 mb-2">
                  Olá, {user?.full_name}!
                </h4>
                <p className="text-slate-600 text-sm max-w-xs">
                  Como podemos ajudar você hoje? Envie sua mensagem e nossa equipe responderá em breve.
                </p>
              </div>
            ) : (
              <>
                {messages.map((message) => {
                  const isOwn = message.sender_id === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
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
                        <p className="text-sm leading-relaxed">{message.message}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isOwn ? 'text-cyan-100' : 'text-slate-500'
                          }`}
                        >
                          {format(new Date(message.created_at), 'HH:mm', { locale: ptBR })}
                        </p>
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
              </>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white rounded-b-2xl">
            <div className="flex items-center space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={messageText}
                onChange={handleTyping}
                placeholder="Digite sua mensagem..."
                className="flex-1 px-4 py-2 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
              />
              <button
                type="submit"
                disabled={!messageText.trim()}
                className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-full p-2 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
