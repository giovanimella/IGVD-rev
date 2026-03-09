import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import RankingSidebar from './RankingSidebar';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Sparkles, CreditCard, Star, CheckCircle, ArrowRight } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;

const Layout = ({ children, hideRankingSidebar = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  
  // Mostrar ranking sidebar apenas para licenciados e supervisores
  const showRanking = !hideRankingSidebar && (user?.role === 'licenciado' || user?.role === 'supervisor');
  
  // Rotas onde o modal não deve aparecer
  const exemptPaths = ['/profile', '/onboarding/payment', '/onboarding/subscription', '/subscription'];
  const isExemptPath = exemptPaths.some(path => location.pathname.startsWith(path));
  
  useEffect(() => {
    const checkSubscription = async () => {
      // Só verificar para licenciados
      if (!user || user.role !== 'licenciado') {
        setSubscriptionChecked(true);
        return;
      }
      
      // Não verificar em rotas isentas
      if (isExemptPath) {
        setSubscriptionChecked(true);
        return;
      }
      
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/subscriptions/my-subscription`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = response.data;
        
        if (!data.has_active_subscription) {
          // Definir mensagem baseada no status
          if (!data.subscription) {
            setModalMessage('Comece sua jornada de sucesso agora! Assine e tenha acesso completo a todos os conteúdos e ferramentas.');
          } else if (data.status === 'SUSPENDED' || data.status === 'suspended') {
            setModalMessage('Sua assinatura está suspensa. Reative agora e continue evoluindo!');
          } else if (data.status === 'OVERDUE' || data.status === 'overdue') {
            setModalMessage('Temos um pagamento pendente. Atualize seus dados e continue sua jornada!');
          } else if (data.status === 'CANCELLED' || data.status === 'cancelled') {
            setModalMessage('Sentimos sua falta! Assine novamente e volte a fazer parte da nossa comunidade.');
          } else {
            setModalMessage('Para acessar todos os recursos da plataforma, você precisa ter uma assinatura ativa.');
          }
          setShowSubscriptionModal(true);
        }
        
        setSubscriptionChecked(true);
      } catch (error) {
        console.error('Erro ao verificar assinatura:', error);
        if (error.response?.status === 404) {
          setModalMessage('Comece sua jornada de sucesso agora! Assine e tenha acesso completo a todos os conteúdos e ferramentas.');
          setShowSubscriptionModal(true);
        }
        setSubscriptionChecked(true);
      }
    };
    
    checkSubscription();
  }, [user, location.pathname, isExemptPath]);
  
  const handleSubscribe = () => {
    // Redirecionar para Profile com aba financeiro e parâmetro para abrir assinatura
    navigate('/profile?tab=financial&action=subscribe');
  };
  
  const handleGoToProfile = () => {
    setShowSubscriptionModal(false);
    navigate('/profile');
  };
  
  // Modal de Assinatura - Design amigável e incentivador
  const SubscriptionModal = () => (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Overlay com blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-[#1b4c51] rounded-3xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 p-6 text-white">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="w-8 h-8" />
            </div>
          </div>
          <h2 className="text-2xl font-outfit font-bold text-center">
            Desbloqueie Todo o Potencial!
          </h2>
          <p className="text-center text-white/90 mt-2 text-sm">
            Acesse conteúdos exclusivos e acelere seus resultados
          </p>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {/* Mensagem personalizada */}
          <p className="text-center text-slate-600 dark:text-slate-300 mb-6">
            {modalMessage}
          </p>
          
          {/* Benefícios */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              O que você terá acesso:
            </p>
            <ul className="space-y-2">
              {[
                'Todos os módulos de treinamento',
                'Certificados de conclusão',
                'Comunidade exclusiva',
                'Suporte prioritário',
                'Atualizações constantes'
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Botões */}
          <div className="space-y-3">
            <button
              onClick={handleSubscribe}
              className="w-full py-4 px-6 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
            >
              <CreditCard className="w-5 h-5" />
              Assinar Agora
              <ArrowRight className="w-5 h-5" />
            </button>
            
            <button
              onClick={handleGoToProfile}
              className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-xl transition-colors text-sm"
            >
              Ir para Meu Perfil
            </button>
          </div>
          
          {/* Garantia */}
          <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
            🔒 Pagamento seguro • Cancele quando quiser
          </p>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#142d30]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        <Topbar />
        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6 overflow-x-hidden">
          {children}
        </main>
      </div>
      {showRanking && <RankingSidebar />}
      
      {/* Modal de Assinatura */}
      {showSubscriptionModal && <SubscriptionModal />}
    </div>
  );
};

export default Layout;
