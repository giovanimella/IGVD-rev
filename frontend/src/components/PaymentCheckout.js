import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  CreditCard,
  QrCode,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Split,
  Plus,
  Minus
} from 'lucide-react';
import { Button } from './ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PaymentCheckout = ({ 
  amount, 
  description, 
  purpose, // 'training_fee' ou 'sales_link'
  referenceId,
  onSuccess,
  onError,
  payerData // { name, email, document_type, document_number, phone }
}) => {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState('pix');
  const [transaction, setTransaction] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  
  // Split payment state
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [pixAmount, setPixAmount] = useState(0);
  const [card1Amount, setCard1Amount] = useState(amount);
  const [card2Amount, setCard2Amount] = useState(0);
  const [useSecondCard, setUseSecondCard] = useState(false);
  
  // Card data
  const [cardData, setCardData] = useState({
    number: '',
    holder_name: '',
    expiry: '',
    cvv: '',
    installments: 1
  });
  
  const [card2Data, setCard2Data] = useState({
    number: '',
    holder_name: '',
    expiry: '',
    cvv: '',
    installments: 1
  });

  useEffect(() => {
    fetchPaymentConfig();
  }, []);

  useEffect(() => {
    // Recalcular valores quando split é ativado
    if (splitEnabled) {
      if (useSecondCard) {
        const each = Math.floor(amount / 2);
        setCard1Amount(each);
        setCard2Amount(amount - each);
        setPixAmount(0);
      } else {
        const half = Math.floor(amount / 2);
        setPixAmount(half);
        setCard1Amount(amount - half);
        setCard2Amount(0);
      }
    } else {
      setPixAmount(0);
      setCard1Amount(amount);
      setCard2Amount(0);
    }
  }, [splitEnabled, useSecondCard, amount]);

  const fetchPaymentConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/payments/settings/public-key`);
      setPaymentConfig(response.data);
    } catch (error) {
      console.error('Erro ao buscar configuração de pagamento:', error);
      toast.error('Erro ao carregar configurações de pagamento');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handlePixPayment = async () => {
    setProcessing(true);
    try {
      const response = await axios.post(`${API_URL}/api/payments/pix`, {
        amount: amount,
        description: description,
        payer: payerData,
        purpose: purpose,
        reference_id: referenceId
      });

      if (response.data.success) {
        setTransaction(response.data);
        setSelectedMethod('pix_generated');
        toast.success('QR Code PIX gerado com sucesso!');
      } else {
        toast.error(response.data.message || 'Erro ao gerar PIX');
        onError?.(response.data.message);
      }
    } catch (error) {
      console.error('Erro ao processar PIX:', error);
      toast.error('Erro ao gerar pagamento PIX');
      onError?.(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCardPayment = async () => {
    // Validação básica
    if (!cardData.number || !cardData.holder_name || !cardData.expiry || !cardData.cvv) {
      toast.error('Preencha todos os dados do cartão');
      return;
    }

    setProcessing(true);
    try {
      // Em produção, você usaria o SDK do gateway para tokenizar o cartão
      // Por enquanto, simularemos um token
      const cardToken = `tok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await axios.post(`${API_URL}/api/payments/credit-card`, {
        amount: amount,
        description: description,
        payer: payerData,
        card: {
          token: cardToken,
          payment_method_id: detectCardBrand(cardData.number),
          installments: cardData.installments
        },
        purpose: purpose,
        reference_id: referenceId
      });

      if (response.data.success) {
        setTransaction(response.data);
        
        if (response.data.status === 'approved' || response.data.status === 'paid') {
          toast.success('Pagamento aprovado!');
          onSuccess?.(response.data);
        } else if (response.data.status === 'pending') {
          toast.info('Pagamento em análise');
        } else {
          toast.error('Pagamento não aprovado');
          onError?.(response.data.message);
        }
      } else {
        toast.error(response.data.message || 'Erro ao processar cartão');
        onError?.(response.data.message);
      }
    } catch (error) {
      console.error('Erro ao processar cartão:', error);
      toast.error('Erro ao processar pagamento com cartão');
      onError?.(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleSplitPayment = async () => {
    // Validação
    const total = pixAmount + card1Amount + card2Amount;
    if (Math.abs(total - amount) > 0.01) {
      toast.error('A soma dos valores deve ser igual ao total');
      return;
    }

    if (card1Amount > 0 && (!cardData.number || !cardData.holder_name || !cardData.expiry || !cardData.cvv)) {
      toast.error('Preencha os dados do cartão 1');
      return;
    }

    if (card2Amount > 0 && (!card2Data.number || !card2Data.holder_name || !card2Data.expiry || !card2Data.cvv)) {
      toast.error('Preencha os dados do cartão 2');
      return;
    }

    setProcessing(true);
    try {
      const cardToken1 = card1Amount > 0 ? `tok_${Date.now()}_1_${Math.random().toString(36).substr(2, 9)}` : null;
      const cardToken2 = card2Amount > 0 ? `tok_${Date.now()}_2_${Math.random().toString(36).substr(2, 9)}` : null;

      const response = await axios.post(`${API_URL}/api/payments/split`, {
        total_amount: amount,
        description: description,
        payer: payerData,
        purpose: purpose,
        reference_id: referenceId,
        pix_amount: pixAmount,
        card1_amount: card1Amount,
        card1: card1Amount > 0 ? {
          token: cardToken1,
          payment_method_id: detectCardBrand(cardData.number),
          installments: cardData.installments
        } : null,
        card2_amount: card2Amount,
        card2: card2Amount > 0 ? {
          token: cardToken2,
          payment_method_id: detectCardBrand(card2Data.number),
          installments: card2Data.installments
        } : null
      });

      if (response.data.success) {
        setTransaction(response.data);
        
        if (response.data.pix_qr_code) {
          setSelectedMethod('split_generated');
          toast.success('Pagamento dividido criado! Complete o PIX.');
        } else if (response.data.status === 'approved' || response.data.status === 'paid') {
          toast.success('Pagamento aprovado!');
          onSuccess?.(response.data);
        }
      } else {
        toast.error(response.data.message || 'Erro ao processar pagamento dividido');
        onError?.(response.data.message);
      }
    } catch (error) {
      console.error('Erro ao processar pagamento dividido:', error);
      toast.error('Erro ao processar pagamento dividido');
      onError?.(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const checkPaymentStatus = useCallback(async () => {
    if (!transaction?.transaction_id) return;

    setCheckingStatus(true);
    try {
      const response = await axios.get(`${API_URL}/api/payments/transaction/${transaction.transaction_id}`);
      
      if (response.data.status === 'approved' || response.data.status === 'paid') {
        toast.success('Pagamento confirmado!');
        onSuccess?.(response.data);
      } else if (response.data.status === 'pending') {
        toast.info('Pagamento ainda pendente');
      } else {
        toast.warning(`Status: ${response.data.status}`);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    } finally {
      setCheckingStatus(false);
    }
  }, [transaction, onSuccess]);

  const copyPixCode = () => {
    if (transaction?.pix_copy_paste) {
      navigator.clipboard.writeText(transaction.pix_copy_paste);
      toast.success('Código PIX copiado!');
    }
  };

  const detectCardBrand = (number) => {
    const cleaned = number.replace(/\D/g, '');
    if (/^4/.test(cleaned)) return 'visa';
    if (/^5[1-5]/.test(cleaned)) return 'mastercard';
    if (/^3[47]/.test(cleaned)) return 'amex';
    if (/^6(?:011|5)/.test(cleaned)) return 'discover';
    if (/^(636368|438935|504175|451416|636297|5067|4576|4011)/.test(cleaned)) return 'elo';
    if (/^(606282|3841)/.test(cleaned)) return 'hipercard';
    return 'credit_card';
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\D/g, '').substr(0, 16);
    const parts = [];
    for (let i = 0; i < v.length; i += 4) {
      parts.push(v.substr(i, 4));
    }
    return parts.join(' ');
  };

  const formatExpiry = (value) => {
    const v = value.replace(/\D/g, '').substr(0, 4);
    if (v.length >= 2) {
      return v.substr(0, 2) + '/' + v.substr(2);
    }
    return v;
  };

  const CardForm = ({ data, setData, title }) => (
    <div className="space-y-4">
      {title && <h3 className="font-medium text-slate-900 dark:text-white">{title}</h3>}
      
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Número do Cartão
        </label>
        <input
          type="text"
          value={formatCardNumber(data.number)}
          onChange={(e) => setData({ ...data, number: e.target.value.replace(/\D/g, '') })}
          placeholder="0000 0000 0000 0000"
          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          maxLength={19}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Nome no Cartão
        </label>
        <input
          type="text"
          value={data.holder_name}
          onChange={(e) => setData({ ...data, holder_name: e.target.value.toUpperCase() })}
          placeholder="NOME COMO NO CARTÃO"
          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Validade
          </label>
          <input
            type="text"
            value={formatExpiry(data.expiry)}
            onChange={(e) => setData({ ...data, expiry: e.target.value.replace(/\D/g, '') })}
            placeholder="MM/AA"
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            maxLength={5}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            CVV
          </label>
          <input
            type="text"
            value={data.cvv}
            onChange={(e) => setData({ ...data, cvv: e.target.value.replace(/\D/g, '').substr(0, 4) })}
            placeholder="123"
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            maxLength={4}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Parcelas
        </label>
        <select
          value={data.installments}
          onChange={(e) => setData({ ...data, installments: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => {
            const installmentAmount = (splitEnabled ? (data === cardData ? card1Amount : card2Amount) : amount) / n;
            return (
              <option key={n} value={n}>
                {n}x de {formatCurrency(installmentAmount)} {n === 1 ? '(à vista)' : 'sem juros'}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  // Tela de QR Code PIX gerado
  if (selectedMethod === 'pix_generated' && transaction) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">PIX Gerado!</h3>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Escaneie o QR Code ou copie o código
          </p>
        </div>

        {transaction.pix_qr_code_base64 && (
          <div className="flex justify-center">
            <img 
              src={`data:image/png;base64,${transaction.pix_qr_code_base64}`} 
              alt="QR Code PIX"
              className="w-48 h-48 border border-slate-200 rounded-lg"
            />
          </div>
        )}

        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Código PIX (Copia e Cola)</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={transaction.pix_copy_paste || ''}
              readOnly
              className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white"
            />
            <Button onClick={copyPixCode} variant="outline" size="sm">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            onClick={checkPaymentStatus} 
            disabled={checkingStatus}
            className="flex-1 bg-cyan-500 hover:bg-cyan-600"
          >
            {checkingStatus ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Verificar Pagamento
          </Button>
        </div>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          O pagamento será confirmado automaticamente após a transferência
        </p>
      </div>
    );
  }

  // Tela de Split Payment gerado (PIX pendente)
  if (selectedMethod === 'split_generated' && transaction) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Split className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Pagamento Dividido</h3>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Cartão processado! Agora complete o PIX.
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-500/10 rounded-lg p-4 border border-green-200 dark:border-green-500/30">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Cartão: {formatCurrency(card1Amount + card2Amount)}</span>
            <span className="text-sm">- Aprovado</span>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-500/10 rounded-lg p-4 border border-amber-200 dark:border-amber-500/30">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-3">
            <QrCode className="w-5 h-5" />
            <span className="font-medium">PIX: {formatCurrency(pixAmount)}</span>
            <span className="text-sm">- Pendente</span>
          </div>

          {transaction.pix_qr_code_base64 && (
            <div className="flex justify-center mb-3">
              <img 
                src={`data:image/png;base64,${transaction.pix_qr_code_base64}`} 
                alt="QR Code PIX"
                className="w-32 h-32 border border-slate-200 rounded-lg"
              />
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={transaction.pix_copy_paste || ''}
              readOnly
              className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-900 dark:text-white"
            />
            <Button onClick={copyPixCode} variant="outline" size="sm">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Button 
          onClick={checkPaymentStatus} 
          disabled={checkingStatus}
          className="w-full bg-cyan-500 hover:bg-cyan-600"
        >
          {checkingStatus ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Verificar Pagamento PIX
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo do Valor */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">Valor Total</p>
        <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(amount)}</p>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{description}</p>
      </div>

      {/* Seleção de Método */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Forma de Pagamento</p>
        
        <div className="grid grid-cols-1 gap-3">
          {/* PIX */}
          <button
            onClick={() => { setSelectedMethod('pix'); setSplitEnabled(false); }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              selectedMethod === 'pix' && !splitEnabled
                ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10'
                : 'border-slate-200 dark:border-slate-700 hover:border-cyan-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                selectedMethod === 'pix' && !splitEnabled ? 'bg-cyan-500' : 'bg-slate-200 dark:bg-slate-700'
              }`}>
                <QrCode className={`w-5 h-5 ${
                  selectedMethod === 'pix' && !splitEnabled ? 'text-white' : 'text-slate-500'
                }`} />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">PIX</p>
                <p className="text-sm text-slate-500">Pagamento instantâneo</p>
              </div>
            </div>
          </button>

          {/* Cartão de Crédito */}
          <button
            onClick={() => { setSelectedMethod('card'); setSplitEnabled(false); }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              selectedMethod === 'card' && !splitEnabled
                ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10'
                : 'border-slate-200 dark:border-slate-700 hover:border-cyan-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                selectedMethod === 'card' && !splitEnabled ? 'bg-cyan-500' : 'bg-slate-200 dark:bg-slate-700'
              }`}>
                <CreditCard className={`w-5 h-5 ${
                  selectedMethod === 'card' && !splitEnabled ? 'text-white' : 'text-slate-500'
                }`} />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Cartão de Crédito</p>
                <p className="text-sm text-slate-500">Até 12x sem juros</p>
              </div>
            </div>
          </button>

          {/* Pagamento Dividido */}
          <button
            onClick={() => { setSelectedMethod('split'); setSplitEnabled(true); }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              splitEnabled
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
                : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                splitEnabled ? 'bg-purple-500' : 'bg-slate-200 dark:bg-slate-700'
              }`}>
                <Split className={`w-5 h-5 ${
                  splitEnabled ? 'text-white' : 'text-slate-500'
                }`} />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Pagamento Dividido</p>
                <p className="text-sm text-slate-500">PIX + Cartão ou 2 Cartões</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Formulário PIX */}
      {selectedMethod === 'pix' && !splitEnabled && (
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-500/10 rounded-lg p-4 border border-green-200 dark:border-green-500/30">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-800 dark:text-green-300">
                <p className="font-medium">Pagamento instantâneo</p>
                <p>O valor será confirmado assim que você realizar a transferência PIX</p>
              </div>
            </div>
          </div>

          <Button
            onClick={handlePixPayment}
            disabled={processing}
            className="w-full bg-cyan-500 hover:bg-cyan-600 h-12"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Gerando PIX...
              </>
            ) : (
              <>
                <QrCode className="w-5 h-5 mr-2" />
                Gerar QR Code PIX
              </>
            )}
          </Button>
        </div>
      )}

      {/* Formulário Cartão */}
      {selectedMethod === 'card' && !splitEnabled && (
        <div className="space-y-4">
          <CardForm data={cardData} setData={setCardData} />

          <Button
            onClick={handleCardPayment}
            disabled={processing}
            className="w-full bg-cyan-500 hover:bg-cyan-600 h-12"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Processando...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                Pagar {formatCurrency(amount)}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Formulário Split Payment */}
      {splitEnabled && (
        <div className="space-y-6">
          {/* Tipo de Split */}
          <div className="flex gap-3">
            <button
              onClick={() => setUseSecondCard(false)}
              className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                !useSecondCard
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <p className="font-medium text-sm text-slate-900 dark:text-white">PIX + Cartão</p>
            </button>
            <button
              onClick={() => setUseSecondCard(true)}
              className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                useSecondCard
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <p className="font-medium text-sm text-slate-900 dark:text-white">2 Cartões</p>
            </button>
          </div>

          {/* Divisão de Valores */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Divisão dos Valores</p>
            
            {!useSecondCard && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">PIX:</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setPixAmount(Math.max(0, pixAmount - 100))}
                      className="p-1 rounded bg-slate-200 dark:bg-slate-700"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-24 text-center font-medium">{formatCurrency(pixAmount)}</span>
                    <button 
                      onClick={() => setPixAmount(Math.min(amount, pixAmount + 100))}
                      className="p-1 rounded bg-slate-200 dark:bg-slate-700"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Cartão:</span>
                  <span className="font-medium">{formatCurrency(amount - pixAmount)}</span>
                </div>
              </div>
            )}

            {useSecondCard && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Cartão 1:</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setCard1Amount(Math.max(100, card1Amount - 100))}
                      className="p-1 rounded bg-slate-200 dark:bg-slate-700"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-24 text-center font-medium">{formatCurrency(card1Amount)}</span>
                    <button 
                      onClick={() => setCard1Amount(Math.min(amount - 100, card1Amount + 100))}
                      className="p-1 rounded bg-slate-200 dark:bg-slate-700"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Cartão 2:</span>
                  <span className="font-medium">{formatCurrency(amount - card1Amount)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Formulários dos Cartões */}
          {!useSecondCard && pixAmount < amount && (
            <CardForm data={cardData} setData={setCardData} title="Dados do Cartão" />
          )}

          {useSecondCard && (
            <>
              <CardForm data={cardData} setData={setCardData} title="Cartão 1" />
              <CardForm data={card2Data} setData={setCard2Data} title="Cartão 2" />
            </>
          )}

          <Button
            onClick={handleSplitPayment}
            disabled={processing}
            className="w-full bg-purple-500 hover:bg-purple-600 h-12"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Processando...
              </>
            ) : (
              <>
                <Split className="w-5 h-5 mr-2" />
                Pagar {formatCurrency(amount)}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PaymentCheckout;
