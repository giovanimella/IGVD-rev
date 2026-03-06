import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { CreditCard, CheckCircle, AlertCircle, Loader, Lock, Shield, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const SubscriptionOnboarding = () => {
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [settings, setSettings] = useState(null);
  const [publicKey, setPublicKey] = useState(null); // Chave pública para criptografia

  // Form data
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_cpf: '',
    customer_phone: '',
    billing_address: {
      street: '',
      number: '',
      complement: '',
      district: '',
      city: '',
      state: '',
      zipcode: ''
    },
    card_number: '',
    card_holder_name: '',
    card_expiry: '',
    card_cvv: ''
  });

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statusRes, publicKeyRes] = await Promise.all([
        axios.get(`${API_URL}/api/subscriptions/my-subscription`),
        axios.get(`${API_URL}/api/subscriptions/public-key`) // Endpoint público
      ]);

      setSubscriptionStatus(statusRes.data);
      
      // Obter chave pública e valor da mensalidade
      setPublicKey(publicKeyRes.data.public_key);
      setSettings({ monthly_fee: publicKeyRes.data.monthly_fee });
      
      // Pré-preencher com dados do usuário
      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        setFormData(prev => ({
          ...prev,
          customer_name: user.full_name || '',
          customer_email: user.email || '',
          customer_phone: user.phone || ''
        }));
      }

    } catch (error) {
      console.error('Erro ao buscar informações:', error);
      toast.error('Erro ao carregar informações');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address_')) {
      const field = name.replace('address_', '');
      setFormData(prev => ({
        ...prev,
        billing_address: {
          ...prev.billing_address,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const formatCPF = (value) => {
    if (!value) return '';
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value) => {
    if (!value) return '';
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const formatCardNumber = (value) => {
    if (!value) return '';
    return value
      .replace(/\D/g, '')
      .replace(/(\d{4})(?=\d)/g, '$1 ')
      .trim();
  };

  const formatExpiry = (value) => {
    if (!value) return '';
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\/\d{2})\d+?$/, '$1');
  };

  const formatCEP = (value) => {
    if (!value) return '';
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{3})\d+?$/, '$1');
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setSubscribing(true);

    try {
      // Validações básicas
      if (!formData.customer_name || !formData.customer_email || !formData.customer_cpf) {
        toast.error('Preencha todos os campos obrigatórios');
        setSubscribing(false);
        return;
      }

      if (!formData.card_number || !formData.card_holder_name || !formData.card_expiry || !formData.card_cvv) {
        toast.error('Preencha todos os dados do cartão');
        setSubscribing(false);
        return;
      }

      // Verificar se a chave pública está disponível
      if (!publicKey) {
        toast.error('Chave pública não configurada. Entre em contato com o suporte.');
        setSubscribing(false);
        return;
      }

      // Verificar se o SDK do PagBank está carregado
      if (typeof window.PagSeguro === 'undefined') {
        toast.error('SDK do PagBank não carregado. Recarregue a página e tente novamente.');
        setSubscribing(false);
        return;
      }

      toast.info('Criptografando dados do cartão...');

      // Extrair mês e ano da validade
      const [expMonth, expYear] = formData.card_expiry.split('/');
      const fullYear = '20' + expYear; // Converter AA para AAAA

      // Criptografar cartão usando SDK do PagBank
      const cardEncryption = window.PagSeguro.encryptCard({
        publicKey: publicKey,
        holder: formData.card_holder_name,
        number: formData.card_number.replace(/\s/g, ''), // Remover espaços
        expMonth: expMonth,
        expYear: fullYear,
        securityCode: formData.card_cvv
      });

      // Verificar se houve erro na criptografia
      if (cardEncryption.hasErrors) {
        const errorMessages = cardEncryption.errors.map(err => err.message).join(', ');
        toast.error(`Erro ao validar cartão: ${errorMessages}`);
        setSubscribing(false);
        return;
      }

      const encryptedCard = cardEncryption.encryptedCard;

      if (!encryptedCard) {
        toast.error('Erro ao criptografar cartão. Tente novamente.');
        setSubscribing(false);
        return;
      }

      toast.info('Processando assinatura...');

      // Preparar dados para enviar ao backend
      // ESTRUTURA CORRETA PAGBANK:
      // - encrypted_card: cartão criptografado pelo SDK (contém número, validade, nome)
      // - security_code: CVV vai SEPARADO (não dentro do encrypted)
      const subscriptionData = {
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_cpf: formData.customer_cpf.replace(/\D/g, ''),
        customer_phone: formData.customer_phone.replace(/\D/g, ''),
        billing_address: {
          street: formData.billing_address.street,
          number: formData.billing_address.number,
          complement: formData.billing_address.complement || '',
          district: formData.billing_address.district,
          city: formData.billing_address.city,
          state: formData.billing_address.state,
          zipcode: formData.billing_address.zipcode.replace(/\D/g, '')
        },
        encrypted_card: encryptedCard,      // Cartão criptografado
        security_code: formData.card_cvv    // CVV vai separado!
      };

      const response = await axios.post(`${API_URL}/api/subscriptions/subscribe`, subscriptionData);

      if (response.data.success) {
        toast.success('Assinatura criada com sucesso! Redirecionando...');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      }

    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      
      // Extrair mensagem de erro corretamente
      let errorMsg = 'Erro ao processar assinatura';
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        
        // Se detail é um objeto (erro de validação do Pydantic)
        if (typeof detail === 'object' && !Array.isArray(detail)) {
          if (detail.message) {
            errorMsg = detail.message;
          } else if (Array.isArray(detail)) {
            // Array de erros de validação
            errorMsg = detail.map(err => err.msg || err.message).join(', ');
          } else {
            errorMsg = JSON.stringify(detail);
          }
        } 
        // Se detail é um array
        else if (Array.isArray(detail)) {
          errorMsg = detail.map(err => {
            if (typeof err === 'string') return err;
            return err.msg || err.message || JSON.stringify(err);
          }).join(', ');
        }
        // Se detail é uma string
        else if (typeof detail === 'string') {
          errorMsg = detail;
        }
      }
      
      toast.error(errorMsg);
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Loader className="animate-spin h-12 w-12 text-cyan-500" />
        </div>
      </Layout>
    );
  }

  // Se já tem assinatura ativa
  if (subscriptionStatus?.has_active_subscription) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-green-200 bg-green-50 p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-outfit font-semibold text-slate-900 mb-2">
              Assinatura Ativa!
            </h3>
            <p className="text-slate-600 mb-4">Sua mensalidade está em dia.</p>
            <Button onClick={() => window.location.href = '/dashboard'} className="bg-green-500 hover:bg-green-600">
              Continuar para Dashboard
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const monthlyFee = settings?.monthly_fee || 49.90;

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">

        <div>
          <h1 className="text-3xl font-outfit font-bold text-slate-900">Assinatura Mensal</h1>
          <p className="text-slate-600 mt-2">
            Assine agora para ter acesso completo à plataforma de treinamento
          </p>
        </div>

        {/* Informações da Assinatura */}
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl p-8 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-outfit font-bold mb-2">Mensalidade UniOzoxx</h3>
              <p className="text-cyan-100 mb-6">Acesso total aos treinamentos e recursos</p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Acesso a todos os módulos de treinamento</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Certificados digitais</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Sistema de pontuação e recompensas</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Suporte via chat</span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-5xl font-bold">R$ {monthlyFee.toFixed(2)}</div>
              <div className="text-cyan-100 mt-1">por mês</div>
              <div className="mt-4 bg-white/20 rounded-lg px-4 py-2 inline-flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Cobrança recorrente</span>
              </div>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubscribe} className="bg-white rounded-xl border border-slate-200 p-8 space-y-8">
          
          {/* Dados Pessoais */}
          <div>
            <h3 className="text-lg font-outfit font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-500" />
              Dados Pessoais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="customer_email"
                  value={formData.customer_email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  CPF *
                </label>
                <input
                  type="text"
                  name="customer_cpf"
                  value={formData.customer_cpf}
                  onChange={(e) => setFormData({...formData, customer_cpf: formatCPF(e.target.value)})}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Telefone *
                </label>
                <input
                  type="text"
                  name="customer_phone"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({...formData, customer_phone: formatPhone(e.target.value)})}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          {/* Endereço de Cobrança */}
          <div>
            <h3 className="text-lg font-outfit font-semibold text-slate-900 mb-4">
              Endereço de Cobrança
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">CEP *</label>
                <input
                  type="text"
                  name="address_zipcode"
                  value={formData.billing_address.zipcode}
                  onChange={(e) => setFormData({
                    ...formData,
                    billing_address: {...formData.billing_address, zipcode: formatCEP(e.target.value)}
                  })}
                  placeholder="00000-000"
                  maxLength={9}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Rua *</label>
                <input
                  type="text"
                  name="address_street"
                  value={formData.billing_address.street}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Número *</label>
                <input
                  type="text"
                  name="address_number"
                  value={formData.billing_address.number}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Complemento</label>
                <input
                  type="text"
                  name="address_complement"
                  value={formData.billing_address.complement}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Bairro *</label>
                <input
                  type="text"
                  name="address_district"
                  value={formData.billing_address.district}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Cidade *</label>
                <input
                  type="text"
                  name="address_city"
                  value={formData.billing_address.city}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Estado *</label>
                <input
                  type="text"
                  name="address_state"
                  value={formData.billing_address.state}
                  onChange={handleInputChange}
                  placeholder="SP"
                  maxLength={2}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          {/* Dados do Cartão */}
          <div>
            <h3 className="text-lg font-outfit font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-cyan-500" />
              Dados do Cartão de Crédito
            </h3>
            
            {/* Aviso se não tiver chave pública */}
            {!publicKey && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-900 font-semibold">⚠️ Chave pública não configurada</p>
                <p className="text-sm text-red-800 mt-1">
                  O administrador precisa configurar a chave pública do PagBank nas configurações do sistema.
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Número do Cartão *
                </label>
                <input
                  type="text"
                  name="card_number"
                  value={formData.card_number}
                  onChange={(e) => setFormData({...formData, card_number: formatCardNumber(e.target.value)})}
                  placeholder="0000 0000 0000 0000"
                  maxLength={19}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nome no Cartão *
                </label>
                <input
                  type="text"
                  name="card_holder_name"
                  value={formData.card_holder_name}
                  onChange={handleInputChange}
                  placeholder="Como está impresso no cartão"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Validade *
                </label>
                <input
                  type="text"
                  name="card_expiry"
                  value={formData.card_expiry}
                  onChange={(e) => setFormData({...formData, card_expiry: formatExpiry(e.target.value)})}
                  placeholder="MM/AA"
                  maxLength={5}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  CVV *
                </label>
                <input
                  type="text"
                  name="card_cvv"
                  value={formData.card_cvv}
                  onChange={handleInputChange}
                  placeholder="000"
                  maxLength={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          {/* Aviso de Segurança */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Seus dados estão seguros</p>
              <p className="text-blue-700">
                Utilizamos criptografia de ponta e seguimos as normas PCI DSS para proteger suas informações de pagamento.
              </p>
            </div>
          </div>

          {/* Botão de Submissão */}
          <div className="flex items-center justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
              disabled={subscribing}
            >
              Voltar
            </Button>
            
            <Button
              type="submit"
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
              disabled={subscribing}
            >
              {subscribing ? (
                <>
                  <Loader className="animate-spin w-4 h-4 mr-2" />
                  Processando...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Confirmar Assinatura
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default SubscriptionOnboarding;
