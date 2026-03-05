import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CreditCard, Calendar, DollarSign, CheckCircle, AlertCircle, 
  XCircle, Clock, Download, RefreshCw, X, Shield, TrendingUp,
  AlertTriangle, Info, ExternalLink
} from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

const FinancialPanel = () => {
  const [subscription, setSubscription] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showUpdateCard, setShowUpdateCard] = useState(false);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      const [subRes, paymentsRes] = await Promise.all([
        axios.get(`${API_URL}/api/subscriptions/my-subscription`),
        axios.get(`${API_URL}/api/subscriptions/my-payments`).catch(() => ({ data: [] }))
      ]);

      setSubscription(subRes.data);
      setPayments(paymentsRes.data || []);
      
      // Se não tem assinatura local, tentar sincronizar do PagBank automaticamente
      if (!subRes.data?.has_active_subscription && !subRes.data?.subscription) {
        await syncFromPagBank(false); // false = não mostrar toast de erro
      }
    } catch (error) {
      console.error('Erro ao buscar dados financeiros:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncFromPagBank = async (showError = true) => {
    setSyncing(true);
    try {
      const response = await axios.post(`${API_URL}/api/subscriptions/sync-from-pagbank`);
      if (response.data.success) {
        toast.success('Assinatura sincronizada com sucesso!');
        // Recarregar dados
        const subRes = await axios.get(`${API_URL}/api/subscriptions/my-subscription`);
        setSubscription(subRes.data);
      } else if (showError) {
        toast.info(response.data.message || 'Nenhuma assinatura encontrada no PagBank');
      }
    } catch (error) {
      if (showError) {
        console.error('Erro ao sincronizar:', error);
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const response = await axios.post(`${API_URL}/api/subscriptions/my-subscription/cancel`);
      if (response.data.success) {
        toast.success('Assinatura cancelada com sucesso');
        setShowCancelConfirm(false);
        // Recarregar dados
        fetchFinancialData();
      } else {
        toast.error(response.data.message || 'Erro ao cancelar assinatura');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao cancelar assinatura';
      toast.error(errorMsg);
      console.error('Erro ao cancelar:', error);
    } finally {
      setCancelling(false);
    }
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      active: {
        label: 'Ativa',
        color: 'green',
        icon: CheckCircle,
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-200'
      },
      pending: {
        label: 'Pendente',
        color: 'blue',
        icon: Clock,
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200'
      },
      overdue: {
        label: 'Em Atraso',
        color: 'yellow',
        icon: AlertCircle,
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700',
        borderColor: 'border-yellow-200'
      },
      suspended: {
        label: 'Suspensa',
        color: 'red',
        icon: XCircle,
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200'
      },
      cancelled: {
        label: 'Cancelada',
        color: 'gray',
        icon: XCircle,
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-700',
        borderColor: 'border-gray-200'
      }
    };

    return statusMap[status] || statusMap.pending;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  // Se não tem assinatura ainda
  if (!subscription?.has_active_subscription && !subscription?.subscription) {
    return (
      <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl border border-cyan-200 p-8">
        <div className="text-center">
          <CreditCard className="w-16 h-16 text-cyan-500 mx-auto mb-4" />
          <h3 className="text-xl font-outfit font-semibold text-slate-900 mb-2">
            Nenhuma Assinatura Ativa
          </h3>
          <p className="text-slate-600 mb-6">
            Você ainda não possui uma assinatura ativa. Complete o processo de onboarding para ativar sua conta.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => window.location.href = '/onboarding/subscription'}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              Assinar Agora
            </Button>
            <Button
              variant="outline"
              onClick={() => syncFromPagBank(true)}
              disabled={syncing}
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Já tenho assinatura
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Se você já realizou a assinatura, clique em "Já tenho assinatura" para sincronizar.
          </p>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(subscription?.status);
  const StatusIcon = statusInfo.icon;
  const subData = subscription?.subscription || {};

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {subscription?.status === 'overdue' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-yellow-900 mb-1">Pagamento em Atraso</h4>
            <p className="text-sm text-yellow-800">
              Seu pagamento está atrasado há {subscription.overdue_months} mês(es). 
              Atualize seu método de pagamento para continuar com acesso total à plataforma.
            </p>
          </div>
        </div>
      )}

      {subscription?.status === 'suspended' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-red-900 mb-1">Conta Suspensa</h4>
            <p className="text-sm text-red-800 mb-3">
              Sua conta foi suspensa devido a inadimplência. Entre em contato conosco para regularizar.
            </p>
            <div className="flex flex-wrap gap-2 text-sm">
              <a href="mailto:contato@ozoxx.com.br" className="text-red-700 underline">
                contato@ozoxx.com.br
              </a>
              <span className="text-red-600">•</span>
              <span className="text-red-800">(00) 0000-0000</span>
            </div>
          </div>
        </div>
      )}

      {/* Status da Assinatura */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-outfit font-bold mb-1">Minha Assinatura</h3>
              <p className="text-cyan-100">Mensalidade UniOzoxx</p>
            </div>
            <div className={`px-4 py-2 rounded-full ${statusInfo.bgColor} ${statusInfo.textColor} flex items-center gap-2`}>
              <StatusIcon className="w-4 h-4" />
              <span className="font-medium">{statusInfo.label}</span>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Valor Mensal */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-600">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm font-medium">Valor Mensal</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {formatCurrency(subscription?.monthly_amount || 0)}
            </p>
          </div>

          {/* Próxima Cobrança */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">Próxima Cobrança</span>
            </div>
            <p className="text-2xl font-semibold text-slate-900">
              {formatDate(subscription?.next_billing_date)}
            </p>
          </div>

          {/* Assinante Desde */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Assinante Desde</span>
            </div>
            <p className="text-2xl font-semibold text-slate-900">
              {formatDate(subData.started_at)}
            </p>
          </div>
        </div>

        {/* Método de Pagamento */}
        {subData.card_last_digits && (
          <div className="px-6 pb-6">
            <div className="border-t border-slate-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-outfit font-semibold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-cyan-500" />
                  Método de Pagamento
                </h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowUpdateCard(true)}
                  disabled={subscription?.status === 'suspended'}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar Cartão
                </Button>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {subData.card_brand || 'Cartão'} •••• {subData.card_last_digits}
                    </p>
                    <p className="text-sm text-slate-600">Cartão de Crédito</p>
                  </div>
                </div>
                <Shield className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </div>
        )}

        {/* Ações da Assinatura */}
        {subscription?.status !== 'cancelled' && (
          <div className="px-6 pb-6">
            <div className="border-t border-slate-200 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-outfit font-semibold text-slate-900">Gerenciar Assinatura</h4>
                  <p className="text-sm text-slate-600">Cancele sua assinatura a qualquer momento</p>
                </div>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setShowCancelConfirm(true)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancelar Assinatura
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Cancelamento */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Cancelar Assinatura</h3>
                <p className="text-sm text-slate-600">Esta ação não pode ser desfeita</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">
                <strong>Atenção:</strong> Ao cancelar sua assinatura, você perderá acesso a todos os benefícios da plataforma:
              </p>
              <ul className="text-sm text-red-700 mt-2 space-y-1 list-disc list-inside">
                <li>Acesso aos treinamentos</li>
                <li>Participação em reuniões</li>
                <li>Suporte exclusivo</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCancelConfirm(false)}
                disabled={cancelling}
              >
                Manter Assinatura
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={handleCancelSubscription}
                disabled={cancelling}
              >
                {cancelling ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  'Confirmar Cancelamento'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Histórico de Pagamentos */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-xl font-outfit font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-500" />
            Histórico de Pagamentos
          </h3>
        </div>

        {payments.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">Nenhum histórico de pagamento disponível</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Descrição</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-900">
                      {formatDate(payment.billing_date)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      Mensalidade UniOzoxx
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4">
                      {payment.status === 'paid' && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          Pago
                        </span>
                      )}
                      {payment.status === 'pending' && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          Pendente
                        </span>
                      )}
                      {payment.status === 'failed' && (
                        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                          Falhou
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {payment.status === 'paid' && (
                        <Button size="sm" variant="ghost">
                          <Download className="w-4 h-4 mr-1" />
                          Recibo
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Informações Adicionais */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm">
            <p className="text-blue-900 font-medium">Informações Importantes</p>
            <ul className="space-y-1 text-blue-800">
              <li>• A cobrança é realizada automaticamente todo mês no mesmo dia</li>
              <li>• Você receberá um email de confirmação após cada pagamento</li>
              <li>• Em caso de falha, você tem 5 dias de carência para regularizar</li>
              <li>• Após 2 meses de inadimplência, a conta será suspensa</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Cancelar Assinatura */}
      {subscription?.status !== 'cancelled' && subscription?.status !== 'suspended' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h4 className="font-outfit font-semibold text-slate-900 mb-2">Cancelar Assinatura</h4>
          <p className="text-slate-600 text-sm mb-4">
            Ao cancelar sua assinatura, você perderá acesso a todos os recursos da plataforma.
            Esta ação é irreversível.
          </p>
          <Button
            variant="outline"
            className="text-red-600 border-red-600 hover:bg-red-50"
            onClick={() => {
              if (window.confirm('Tem certeza que deseja cancelar sua assinatura? Esta ação é irreversível.')) {
                toast.info('Entre em contato com o suporte para cancelar: contato@ozoxx.com.br');
              }
            }}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Cancelar Assinatura
          </Button>
        </div>
      )}

      {/* Modal Atualizar Cartão */}
      {showUpdateCard && (
        <UpdateCardModal
          onClose={() => setShowUpdateCard(false)}
          onSuccess={() => {
            setShowUpdateCard(false);
            fetchFinancialData();
          }}
        />
      )}
    </div>
  );
};

// Modal para atualizar cartão
const UpdateCardModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    card_number: '',
    card_holder_name: '',
    card_holder_cpf: '',
    card_holder_birth_date: '',
    card_expiry: '',
    card_cvv: ''
  });
  const [updating, setUpdating] = useState(false);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  const formatCPF = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatCardNumber = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{4})(?=\d)/g, '$1 ')
      .trim();
  };

  const formatExpiry = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\/\d{2})\d+?$/, '$1');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);

    try {
      // Em produção, usar PagBank SDK para gerar token
      const cardToken = 'TOKEN_SIMULADO_' + Date.now();

      await axios.put(`${API_URL}/api/subscriptions/my-subscription/payment-method`, {
        card_token: cardToken,
        card_holder_name: formData.card_holder_name,
        card_holder_cpf: formData.card_holder_cpf.replace(/\D/g, ''),
        card_holder_birth_date: formData.card_holder_birth_date
      });

      toast.success('Cartão atualizado com sucesso!');
      onSuccess();
    } catch (error) {
      toast.error('Erro ao atualizar cartão');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-xl font-outfit font-semibold text-slate-900">Atualizar Cartão</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Número do Cartão *
            </label>
            <input
              type="text"
              value={formData.card_number}
              onChange={(e) => setFormData({...formData, card_number: formatCardNumber(e.target.value)})}
              placeholder="0000 0000 0000 0000"
              maxLength={19}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nome no Cartão *
            </label>
            <input
              type="text"
              value={formData.card_holder_name}
              onChange={(e) => setFormData({...formData, card_holder_name: e.target.value.toUpperCase()})}
              placeholder="NOME COMO ESTÁ NO CARTÃO"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">CPF do Titular *</label>
              <input
                type="text"
                value={formData.card_holder_cpf}
                onChange={(e) => setFormData({...formData, card_holder_cpf: formatCPF(e.target.value)})}
                placeholder="000.000.000-00"
                maxLength={14}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Data de Nascimento *</label>
              <input
                type="date"
                value={formData.card_holder_birth_date}
                onChange={(e) => setFormData({...formData, card_holder_birth_date: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Validade *</label>
              <input
                type="text"
                value={formData.card_expiry}
                onChange={(e) => setFormData({...formData, card_expiry: formatExpiry(e.target.value)})}
                placeholder="MM/AA"
                maxLength={5}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">CVV *</label>
              <input
                type="text"
                value={formData.card_cvv}
                onChange={(e) => setFormData({...formData, card_cvv: e.target.value.replace(/\D/g, '')})}
                placeholder="000"
                maxLength={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-cyan-500 hover:bg-cyan-600"
              disabled={updating}
            >
              {updating ? 'Atualizando...' : 'Atualizar Cartão'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FinancialPanel;
