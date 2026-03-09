import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { AlertTriangle, CreditCard, Lock } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;

/**
 * SubscriptionGuard - Componente que verifica se o usuário tem assinatura ativa
 * 
 * Regras:
 * - Se não tiver assinatura ativa, mostra popup obrigatório
 * - Usuário só pode acessar /profile quando bloqueado
 * - Se assinatura suspensa, bloqueia na data da próxima cobrança
 * - Admin e Supervisor não são afetados
 */
const SubscriptionGuard = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  // Rotas permitidas mesmo sem assinatura
  const allowedPaths = ['/profile', '/login', '/set-password', '/reset-password', '/request-reset', '/register', '/'];
  
  // Roles que não precisam de assinatura
  const exemptRoles = ['admin', 'supervisor'];

  useEffect(() => {
    const checkSubscription = async () => {
      // Se ainda está carregando auth ou não tem usuário, aguardar
      if (authLoading || !user) {
        setLoading(false);
        return;
      }

      // Admin e Supervisor não precisam de assinatura
      if (exemptRoles.includes(user.role)) {
        setLoading(false);
        setSubscriptionStatus({ hasActiveSubscription: true });
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/subscriptions/my-subscription`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = response.data;
        
        // Usar os campos retornados pelo backend
        let hasActiveSubscription = data.has_active_subscription;
        let reason = '';
        
        const status = data.status;
        const nextBillingDate = data.next_billing_date;

        if (!hasActiveSubscription) {
          if (!data.subscription) {
            // Sem assinatura
            reason = 'Você ainda não possui uma assinatura ativa. Assine para acessar a plataforma.';
          }
          else if (['SUSPENDED', 'suspended'].includes(status)) {
            reason = 'Sua assinatura está suspensa. Reative para continuar usando a plataforma.';
          }
          else if (['OVERDUE', 'overdue'].includes(status)) {
            reason = 'Sua assinatura está com pagamento pendente. Atualize seus dados de pagamento.';
          }
          else if (['CANCELLED', 'cancelled', 'CANCELED', 'canceled'].includes(status)) {
            reason = 'Sua assinatura foi cancelada. Assine novamente para acessar a plataforma.';
          }
          else {
            reason = 'Sua assinatura está inativa. Entre em contato com o suporte.';
          }
        } else if (data.is_within_paid_period && ['SUSPENDED', 'suspended', 'OVERDUE', 'overdue'].includes(status)) {
          // Tem acesso mas está dentro do período de graça
          if (nextBillingDate) {
            const nextBilling = new Date(nextBillingDate);
            reason = `Atenção: Sua assinatura está ${status === 'SUSPENDED' || status === 'suspended' ? 'suspensa' : 'com pagamento pendente'}. Acesso até ${nextBilling.toLocaleDateString('pt-BR')}.`;
          }
        }

        setSubscriptionStatus({
          hasActiveSubscription,
          subscription: data.subscription,
          reason,
          isWithinPaidPeriod: data.is_within_paid_period
        });

        // Se não tem assinatura ativa e não está em rota permitida
        if (!hasActiveSubscription) {
          const isAllowedPath = allowedPaths.some(path => location.pathname.startsWith(path));
          
          if (!isAllowedPath) {
            setBlockReason(reason);
            setShowBlockedModal(true);
          }
        }

      } catch (error) {
        console.error('Erro ao verificar assinatura:', error);
        // Em caso de erro, verificar se é 404 (sem assinatura)
        if (error.response?.status === 404) {
          setSubscriptionStatus({
            hasActiveSubscription: false,
            subscription: null,
            reason: 'Você ainda não possui uma assinatura ativa. Assine para acessar a plataforma.'
          });
          
          const isAllowedPath = allowedPaths.some(path => location.pathname.startsWith(path));
          if (!isAllowedPath) {
            setBlockReason('Você ainda não possui uma assinatura ativa. Assine para acessar a plataforma.');
            setShowBlockedModal(true);
          }
        } else {
          // Outros erros: permitir acesso (fail-open para não bloquear indevidamente)
          setSubscriptionStatus({ hasActiveSubscription: true });
        }
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [user, authLoading, location.pathname]);

  // Redirecionar para página de assinatura
  const handleSubscribe = () => {
    navigate('/onboarding/payment');
  };

  // Redirecionar para perfil (seção financeiro)
  const handleGoToProfile = () => {
    setShowBlockedModal(false);
    navigate('/profile');
  };

  // Loading state
  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0a2a2f]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  // Modal de bloqueio - não pode ser fechado
  if (showBlockedModal) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        {/* Overlay escuro */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        
        {/* Modal */}
        <div className="relative bg-white dark:bg-[#1b4c51] rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 animate-in fade-in zoom-in duration-300">
          {/* Ícone */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <Lock className="w-10 h-10 text-amber-600 dark:text-amber-400" />
            </div>
          </div>

          {/* Título */}
          <h2 className="text-2xl font-outfit font-bold text-center text-slate-900 dark:text-white mb-4">
            Assinatura Necessária
          </h2>

          {/* Mensagem */}
          <p className="text-center text-slate-600 dark:text-slate-300 mb-6">
            {blockReason}
          </p>

          {/* Alerta */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Para ter acesso completo à plataforma IGVD, é necessário ter uma assinatura ativa.
              </p>
            </div>
          </div>

          {/* Botões */}
          <div className="space-y-3">
            <button
              onClick={handleSubscribe}
              className="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              Assinar Agora
            </button>
            
            <button
              onClick={handleGoToProfile}
              className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-colors"
            >
              Ir para Meu Perfil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default SubscriptionGuard;
