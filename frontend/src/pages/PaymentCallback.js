import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, XCircle, Clock, Loader2, Home, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Página de callback do MercadoPago
 * Exibe o status do pagamento após o redirecionamento
 */
const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState(null);

  // Parâmetros que o MercadoPago envia
  const transactionId = searchParams.get('transaction_id') || searchParams.get('external_reference');
  const collectionId = searchParams.get('collection_id');
  const collectionStatus = searchParams.get('collection_status') || searchParams.get('status');
  const paymentId = searchParams.get('payment_id');
  const paymentType = searchParams.get('payment_type');

  useEffect(() => {
    const processCallback = async () => {
      if (!transactionId) {
        setError('ID da transação não encontrado');
        setLoading(false);
        return;
      }

      try {
        // Notificar o backend sobre o callback
        const response = await axios.get(`${API_URL}/api/payments/callback/success`, {
          params: {
            transaction_id: transactionId,
            collection_id: collectionId,
            collection_status: collectionStatus,
            payment_id: paymentId,
            payment_type: paymentType
          }
        });

        setPaymentData({
          ...response.data,
          status: collectionStatus || response.data.status
        });
      } catch (err) {
        console.error('Erro ao processar callback:', err);
        // Mesmo com erro, mostrar o status baseado nos params
        setPaymentData({
          transaction_id: transactionId,
          status: collectionStatus || 'pending'
        });
      } finally {
        setLoading(false);
      }
    };

    processCallback();
  }, [transactionId, collectionId, collectionStatus, paymentId, paymentType]);

  const getStatusDisplay = () => {
    const status = paymentData?.status?.toLowerCase();

    if (status === 'approved' || status === 'paid') {
      return {
        icon: <CheckCircle className="w-16 h-16 text-green-500" />,
        title: 'Pagamento Aprovado!',
        message: 'Seu pagamento foi processado com sucesso.',
        bgColor: 'bg-green-50 dark:bg-green-500/10',
        borderColor: 'border-green-200 dark:border-green-500/30',
        textColor: 'text-green-800 dark:text-green-300'
      };
    }

    if (status === 'pending' || status === 'in_process') {
      return {
        icon: <Clock className="w-16 h-16 text-amber-500" />,
        title: 'Pagamento Pendente',
        message: 'Seu pagamento está sendo processado. Você receberá uma notificação quando for confirmado.',
        bgColor: 'bg-amber-50 dark:bg-amber-500/10',
        borderColor: 'border-amber-200 dark:border-amber-500/30',
        textColor: 'text-amber-800 dark:text-amber-300'
      };
    }

    if (status === 'rejected' || status === 'declined' || status === 'cancelled') {
      return {
        icon: <XCircle className="w-16 h-16 text-red-500" />,
        title: 'Pagamento Não Aprovado',
        message: 'Infelizmente seu pagamento não foi aprovado. Por favor, tente novamente ou use outra forma de pagamento.',
        bgColor: 'bg-red-50 dark:bg-red-500/10',
        borderColor: 'border-red-200 dark:border-red-500/30',
        textColor: 'text-red-800 dark:text-red-300'
      };
    }

    return {
      icon: <Clock className="w-16 h-16 text-slate-500" />,
      title: 'Verificando Pagamento',
      message: 'Estamos verificando o status do seu pagamento.',
      bgColor: 'bg-slate-50 dark:bg-slate-800',
      borderColor: 'border-slate-200 dark:border-slate-700',
      textColor: 'text-slate-800 dark:text-slate-300'
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-[#0B0F19] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-500 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Processando pagamento...</p>
        </div>
      </div>
    );
  }

  if (error && !paymentData) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-[#0B0F19] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-[#151B28] rounded-2xl shadow-xl p-8 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Erro
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
          <Button onClick={() => navigate('/')} className="w-full">
            <Home className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay();

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0B0F19] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-[#151B28] rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            {statusDisplay.icon}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {statusDisplay.title}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {statusDisplay.message}
          </p>
        </div>

        <div className={`${statusDisplay.bgColor} ${statusDisplay.borderColor} border rounded-xl p-4 mb-6`}>
          <div className={`text-sm ${statusDisplay.textColor} space-y-2`}>
            {transactionId && (
              <div className="flex justify-between">
                <span>ID da Transação:</span>
                <span className="font-mono text-xs">{transactionId.substring(0, 8)}...</span>
              </div>
            )}
            {paymentType && (
              <div className="flex justify-between">
                <span>Forma de Pagamento:</span>
                <span className="capitalize">{paymentType}</span>
              </div>
            )}
            {collectionStatus && (
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="capitalize">{collectionStatus}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={() => navigate('/training')} 
            className="w-full bg-cyan-500 hover:bg-cyan-600"
          >
            Voltar ao Treinamento
          </Button>
          
          <Button 
            onClick={() => navigate('/')} 
            variant="outline"
            className="w-full"
          >
            <Home className="w-4 h-4 mr-2" />
            Ir para o Início
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentCallback;
