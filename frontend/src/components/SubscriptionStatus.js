import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CreditCard, Calendar, CheckCircle, AlertCircle, RefreshCw, Loader } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

const SubscriptionStatus = () => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/subscriptions/my-subscription/check`);
      setSubscription(response.data);
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncStatus = async () => {
    setSyncing(true);
    try {
      const response = await axios.post(`${API_URL}/api/subscriptions/my-subscription/sync-status`);
      if (response.data.success) {
        setSubscription({
          has_subscription: true,
          is_active: response.data.status === 'active' || response.data.status === 'trial',
          status: response.data.status,
          subscription: response.data.subscription
        });
        toast.success('Status atualizado com sucesso!');
      } else {
        toast.error(response.data.message || 'Erro ao sincronizar');
      }
    } catch (error) {
      toast.error('Erro ao sincronizar status');
      console.error('Erro:', error);
    } finally {
      setSyncing(false);
    }
  };

  const reactivateSubscription = async () => {
    if (!window.confirm('Deseja realmente reativar sua assinatura?')) return;
    
    setReactivating(true);
    try {
      const response = await axios.post(`${API_URL}/api/subscriptions/my-subscription/reactivate`);
      toast.success(response.data.message);
      checkSubscription(); // Atualizar status
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao reativar assinatura');
      console.error('Erro:', error);
    } finally {
      setReactivating(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (value) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusConfig = (status) => {
    const configs = {
      active: { label: 'Ativa', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      trial: { label: 'Período de Teste', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
      pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
      suspended: { label: 'Suspensa', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
      overdue: { label: 'Em Atraso', color: 'bg-red-100 text-red-700', icon: AlertCircle },
      cancelled: { label: 'Cancelada', color: 'bg-slate-100 text-slate-700', icon: AlertCircle }
    };
    return configs[status] || configs.pending;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 animate-spin text-cyan-500" />
          <span className="ml-2 text-slate-600">Verificando assinatura...</span>
        </div>
      </div>
    );
  }

  if (!subscription?.has_subscription) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="text-center py-6">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-900">Nenhuma Assinatura Ativa</h3>
          <p className="text-sm text-slate-600 mt-1">
            Você ainda não possui uma assinatura ativa.
          </p>
        </div>
      </div>
    );
  }

  const sub = subscription.subscription;
  const statusConfig = getStatusConfig(subscription.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-cyan-500" />
          Minha Assinatura
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={syncStatus}
          disabled={syncing}
        >
          {syncing ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span className="ml-1 hidden sm:inline">Atualizar</span>
        </Button>
      </div>

      <div className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${statusConfig.color}`}>
            <StatusIcon className="w-4 h-4" />
            {statusConfig.label}
          </span>
          {sub?.pagbank_status && sub.pagbank_status !== subscription.status?.toUpperCase() && (
            <span className="text-xs text-slate-500">
              (PagBank: {sub.pagbank_status})
            </span>
          )}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase">Valor Mensal</p>
            <p className="font-semibold text-slate-900">{formatCurrency(sub?.monthly_amount)}</p>
          </div>
          
          <div>
            <p className="text-xs text-slate-500 uppercase">Próxima Cobrança</p>
            <p className="font-semibold text-slate-900 flex items-center gap-1">
              <Calendar className="w-4 h-4 text-slate-400" />
              {formatDate(sub?.next_billing_date)}
            </p>
          </div>
          
          {sub?.card_last_digits && (
            <div>
              <p className="text-xs text-slate-500 uppercase">Cartão</p>
              <p className="font-medium text-slate-700">
                {sub.card_brand ? `${sub.card_brand} ` : ''}
                •••• {sub.card_last_digits}
              </p>
            </div>
          )}
          
          <div>
            <p className="text-xs text-slate-500 uppercase">Desde</p>
            <p className="font-medium text-slate-700">{formatDate(sub?.started_at)}</p>
          </div>
        </div>

        {/* Sync Info */}
        {sub?.synced_at && (
          <p className="text-xs text-slate-400 text-right">
            Última atualização: {formatDate(sub.synced_at)}
          </p>
        )}

        {/* Alerts based on status */}
        {subscription.status === 'overdue' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">
              ⚠️ Sua assinatura está com pagamento em atraso. Regularize para continuar acessando.
            </p>
          </div>
        )}

        {subscription.status === 'suspended' && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-sm text-orange-700">
              ⚠️ Sua assinatura está suspensa. Entre em contato com o suporte.
            </p>
          </div>
        )}

        {subscription.status === 'cancelled' && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <p className="text-sm text-slate-700">
              Sua assinatura foi cancelada. Você pode reativá-la a qualquer momento.
            </p>
            <Button
              onClick={reactivateSubscription}
              disabled={reactivating}
              className="w-full bg-emerald-500 hover:bg-emerald-600"
            >
              {reactivating ? 'Reativando...' : 'Reativar Assinatura'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionStatus;
