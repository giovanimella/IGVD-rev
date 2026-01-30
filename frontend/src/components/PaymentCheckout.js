import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  CreditCard,
  QrCode,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  Shield
} from 'lucide-react';
import { Button } from './ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Componente de Checkout Pro do MercadoPago
 * 
 * O pagamento é processado no ambiente seguro do MercadoPago.
 * O cliente é redirecionado para lá e volta após o pagamento.
 */
const PaymentCheckout = ({ 
  amount, 
  title,
  description, 
  purpose, // 'training_fee' ou 'sales_link'
  referenceId,
  onSuccess,
  onError,
  pixOnly = false,
  maxInstallments = 12
}) => {
  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [transactionId, setTransactionId] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const createCheckout = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/payments/checkout`, {
        amount: amount,
        title: title || description,
        description: description,
        purpose: purpose,
        reference_id: referenceId,
        max_installments: maxInstallments,
        pix_only: pixOnly
      });

      if (response.data.success) {
        setCheckoutUrl(response.data.checkout_url);
        setTransactionId(response.data.transaction_id);
        toast.success('Checkout criado! Clique para pagar.');
      } else {
        toast.error(response.data.message || 'Erro ao criar checkout');
        onError?.(response.data.message);
      }
    } catch (error) {
      console.error('Erro ao criar checkout:', error);
      const errorMsg = error.response?.data?.detail || 'Erro ao criar checkout';
      toast.error(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const openPayment = () => {
    if (checkoutUrl) {
      // Abre em nova aba para melhor experiência
      window.open(checkoutUrl, '_blank');
    }
  };

  const checkPaymentStatus = useCallback(async () => {
    if (!transactionId) return;

    setCheckingStatus(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/payments/transaction/${transactionId}/check-status`
      );
      
      const status = response.data.status;
      setPaymentStatus(status);
      
      if (status === 'approved' || status === 'paid') {
        toast.success('Pagamento confirmado!');
        onSuccess?.(response.data);
      } else if (status === 'pending') {
        toast.info('Pagamento ainda pendente. Aguarde a confirmação.');
      } else if (status === 'rejected' || status === 'declined') {
        toast.error('Pagamento não aprovado');
        onError?.('Pagamento não aprovado');
      } else {
        toast.info(`Status: ${status}`);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      toast.error('Erro ao verificar status do pagamento');
    } finally {
      setCheckingStatus(false);
    }
  }, [transactionId, onSuccess, onError]);

  // Verificar status quando voltar da página do MercadoPago
  useEffect(() => {
    const handleFocus = () => {
      if (transactionId && checkoutUrl) {
        // Pequeno delay para dar tempo do webhook processar
        setTimeout(() => {
          checkPaymentStatus();
        }, 2000);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [transactionId, checkoutUrl, checkPaymentStatus]);

  // Tela de pagamento aprovado
  if (paymentStatus === 'approved' || paymentStatus === 'paid') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Pagamento Confirmado!
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Seu pagamento foi processado com sucesso.
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-500/10 rounded-xl p-4 border border-green-200 dark:border-green-500/30">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-300">
                {formatCurrency(amount)}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                {title || description}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tela com botão para pagar (após criar checkout)
  if (checkoutUrl) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
            Checkout Pronto
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Clique abaixo para pagar no ambiente seguro do MercadoPago
          </p>
        </div>

        {/* Resumo do Valor */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">Valor:</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(amount)}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {title || description}
          </p>
        </div>

        {/* Métodos disponíveis */}
        <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-4 border border-blue-200 dark:border-blue-500/30">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
            Formas de pagamento disponíveis:
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
              <QrCode className="w-3 h-3 inline mr-1" />
              PIX
            </span>
            {!pixOnly && (
              <>
                <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                  <CreditCard className="w-3 h-3 inline mr-1" />
                  Cartão de Crédito
                </span>
                <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                  Boleto
                </span>
              </>
            )}
          </div>
          {!pixOnly && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              Parcelamento em até {maxInstallments}x no cartão
            </p>
          )}
        </div>

        {/* Botões de ação */}
        <div className="space-y-3">
          <Button
            onClick={openPayment}
            className="w-full bg-cyan-500 hover:bg-cyan-600 h-12 text-base"
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            Pagar com MercadoPago
          </Button>

          <Button
            onClick={checkPaymentStatus}
            disabled={checkingStatus}
            variant="outline"
            className="w-full"
          >
            {checkingStatus ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Verificando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Já paguei - Verificar Status
              </>
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          <Shield className="w-3 h-3 inline mr-1" />
          Pagamento 100% seguro via MercadoPago
        </p>
      </div>
    );
  }

  // Tela inicial - Criar checkout
  return (
    <div className="space-y-6">
      {/* Resumo do Valor */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">Valor Total</p>
        <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
          {formatCurrency(amount)}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          {title || description}
        </p>
      </div>

      {/* Info de segurança */}
      <div className="bg-green-50 dark:bg-green-500/10 rounded-xl p-4 border border-green-200 dark:border-green-500/30">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-800 dark:text-green-300">
            <p className="font-medium">Pagamento Seguro</p>
            <p className="text-green-600 dark:text-green-400 mt-1">
              Você será redirecionado para o ambiente seguro do MercadoPago 
              para realizar o pagamento. Seus dados estarão protegidos.
            </p>
          </div>
        </div>
      </div>

      {/* Formas de pagamento */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Formas de pagamento aceitas:
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <QrCode className="w-6 h-6 text-cyan-500 mb-1" />
            <span className="text-xs text-slate-600 dark:text-slate-400">PIX</span>
          </div>
          {!pixOnly && (
            <>
              <div className="flex flex-col items-center p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <CreditCard className="w-6 h-6 text-cyan-500 mb-1" />
                <span className="text-xs text-slate-600 dark:text-slate-400">Cartão</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <svg className="w-6 h-6 text-cyan-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs text-slate-600 dark:text-slate-400">Boleto</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Botão de pagar */}
      <Button
        onClick={createCheckout}
        disabled={loading}
        className="w-full bg-cyan-500 hover:bg-cyan-600 h-14 text-lg"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Preparando...
          </>
        ) : (
          <>
            <Shield className="w-5 h-5 mr-2" />
            Pagar {formatCurrency(amount)}
          </>
        )}
      </Button>

      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        Ao clicar, você será redirecionado para o checkout seguro do MercadoPago
      </p>
    </div>
  );
};

export default PaymentCheckout;
