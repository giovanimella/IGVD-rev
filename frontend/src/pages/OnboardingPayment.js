import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import StageProgressBar from '../components/StageProgressBar';
import axios from 'axios';
import { CreditCard, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const OnboardingPayment = () => {
  const [stageInfo, setStageInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchStageInfo();
  }, []);

  const fetchStageInfo = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/onboarding/my-stage`);
      setStageInfo(response.data);
    } catch (error) {
      console.error('Erro ao buscar informações:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPayment = async () => {
    setCreating(true);
    try {
      const response = await axios.post(`${API_URL}/api/payments/create-payment`);
      setPaymentInfo(response.data);
      toast.success('Pagamento criado! Em produção, você seria redirecionado para o PagSeguro.');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar pagamento');
    } finally {
      setCreating(false);
    }
  };

  const simulatePayment = async () => {
    if (!paymentInfo) return;
    
    setCheckingStatus(true);
    try {
      await axios.post(`${API_URL}/api/payments/simulate-payment/${paymentInfo.reference_id}`);
      toast.success('Pagamento simulado com sucesso!');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (error) {
      toast.error('Erro ao simular pagamento');
    } finally {
      setCheckingStatus(false);
    }
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

  if (stageInfo?.payment_status === 'paid') {
    return (
      <Layout>
        <div className="space-y-6">
          <StageProgressBar currentStage={stageInfo?.current_stage} />
          <div className="bg-white rounded-xl border border-green-200 bg-green-50 p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-outfit font-semibold text-slate-900 mb-2">
              Pagamento Aprovado!
            </h3>
            <p className="text-slate-600 mb-4">Seu pagamento foi confirmado com sucesso.</p>
            <Button onClick={() => window.location.href = '/dashboard'} className="bg-green-500 hover:bg-green-600">
              Continuar para Dashboard
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <StageProgressBar currentStage={stageInfo?.current_stage} />

        <div>
          <h1 className="text-3xl font-outfit font-bold text-slate-900">Pagamento da Taxa de Licença</h1>
          <p className="text-slate-600 mt-2">Realize o pagamento para liberar o acesso aos treinamentos de acolhimento</p>
        </div>

        {!paymentInfo ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-20 h-20 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CreditCard className="w-10 h-10 text-cyan-600" />
              </div>
              
              <h2 className="text-2xl font-outfit font-bold text-slate-900 mb-4">
                Taxa de Licença Ozoxx
              </h2>
              
              <div className="bg-slate-50 rounded-lg p-6 mb-6">
                <p className="text-sm text-slate-600 mb-2">Valor da Taxa</p>
                <p className="text-4xl font-outfit font-bold text-slate-900">R$ 500,00</p>
              </div>

              <div className="bg-cyan-50 rounded-lg p-4 mb-6 border border-cyan-200">
                <p className="text-sm text-cyan-700">
                  <strong>Inclui:</strong> Acesso aos treinamentos de acolhimento, materiais didáticos e suporte inicial
                </p>
              </div>

              <Button
                onClick={createPayment}
                disabled={creating}
                data-testid="create-payment-button"
                className="w-full h-12 bg-cyan-500 hover:bg-cyan-600"
              >
                {creating ? (
                  <>
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5 mr-2" />
                    Prosseguir para Pagamento
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-outfit font-semibold text-slate-900 mb-2">
                  Pagamento Criado!
                </h3>
                <p className="text-slate-600">ID da Transação: <code className="bg-slate-100 px-2 py-1 rounded">{paymentInfo.reference_id}</code></p>
              </div>

              <div className="bg-amber-50 rounded-lg p-6 border border-amber-200 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900 mb-2">Modo Sandbox (Teste)</p>
                    <p className="text-sm text-amber-700">
                      Este é um ambiente de testes. Em produção, você seria redirecionado para o PagSeguro para completar o pagamento.
                      Use o botão abaixo para simular a aprovação do pagamento.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={simulatePayment}
                disabled={checkingStatus}
                data-testid="simulate-payment-button"
                className="w-full h-12 bg-green-500 hover:bg-green-600"
              >
                {checkingStatus ? 'Processando...' : 'Simular Pagamento Aprovado'}
              </Button>
            </div>
          </div>
        )}

        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
          <h4 className="font-semibold text-slate-900 mb-2">Métodos de Pagamento Aceitos:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-white rounded-lg p-4 text-center border border-slate-200">
              <CreditCard className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-900">Cartão</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center border border-slate-200">
              <div className="text-2xl mb-2">🎲</div>
              <p className="text-sm font-medium text-slate-900">PIX</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center border border-slate-200">
              <div className="text-2xl mb-2">💵</div>
              <p className="text-sm font-medium text-slate-900">Boleto</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center border border-slate-200">
              <div className="text-2xl mb-2">💳</div>
              <p className="text-sm font-medium text-slate-900">Débito</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default OnboardingPayment;