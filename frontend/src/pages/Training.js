import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import {
  GraduationCap,
  Calendar,
  MapPin,
  Hotel,
  Clock,
  User,
  Users,
  Phone,
  Mail,
  Home,
  FileText,
  CheckCircle,
  CreditCard,
  AlertCircle,
  Loader2,
  ChevronRight,
  Heart,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';

const Training = () => {
  const [loading, setLoading] = useState(true);
  const [registrationData, setRegistrationData] = useState(null);
  const [config, setConfig] = useState(null);
  const [step, setStep] = useState('loading'); // loading, terms, form, payment, confirmed
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [hasSpouse, setHasSpouse] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    cpf: '',
    rg: '',
    birth_date: ''
  });
  
  const [spouseData, setSpouseData] = useState({
    full_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    cpf: '',
    rg: '',
    birth_date: ''
  });

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/training/my-registration`);
      const { registration, config } = response.data;
      
      setConfig(config);
      setRegistrationData(registration);
      
      if (registration) {
        if (registration.payment_status === 'paid') {
          setStep('confirmed');
        } else {
          setStep('payment');
        }
      } else {
        setStep('terms');
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar informações do treinamento');
    } finally {
      setLoading(false);
    }
  };

  const handleTermsAccept = () => {
    if (!termsAccepted) {
      toast.error('Você deve aceitar os termos e condições');
      return;
    }
    setStep('form');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    // Validar campos obrigatórios
    const requiredFields = ['full_name', 'phone', 'email', 'address', 'city', 'state', 'zip_code', 'cpf', 'rg', 'birth_date'];
    for (const field of requiredFields) {
      if (!formData[field]) {
        toast.error(`Preencha todos os campos obrigatórios`);
        return;
      }
    }
    
    if (hasSpouse) {
      for (const field of requiredFields) {
        if (!spouseData[field]) {
          toast.error(`Preencha todos os campos do cônjuge`);
          return;
        }
      }
    }
    
    setSubmitting(true);
    
    try {
      const payload = {
        ...formData,
        has_spouse: hasSpouse,
        spouse_data: hasSpouse ? spouseData : null,
        terms_accepted: true
      };
      
      const response = await axios.post(`${API_URL}/api/training/register`, payload);
      setRegistrationData(response.data.registration);
      toast.success('Inscrição realizada com sucesso!');
      setStep('payment');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao realizar inscrição');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProceedToPayment = async () => {
    setSubmitting(true);
    try {
      // Criar checkout no PagBank
      const response = await axios.post(`${API_URL}/api/payments/training/checkout`);
      
      if (response.data.success && response.data.checkout_url) {
        // Redirecionar para o PagBank
        toast.success('Redirecionando para o PagBank...');
        window.location.href = response.data.checkout_url;
      } else {
        toast.error(response.data.error || 'Erro ao criar checkout');
      }
    } catch (error) {
      console.error('Erro ao criar checkout:', error);
      toast.error(error.response?.data?.detail || 'Erro ao processar pagamento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckPayment = async () => {
    if (!registrationData?.checkout_reference_id) {
      toast.info('Nenhum checkout pendente');
      return;
    }
    
    setCheckingPayment(true);
    try {
      const response = await axios.get(`${API_URL}/api/payments/status/${registrationData.checkout_reference_id}`);
      
      if (response.data.status === 'paid') {
        toast.success('Pagamento confirmado!');
        await fetchData(); // Recarregar dados
      } else {
        toast.info('Pagamento ainda pendente');
      }
    } catch (error) {
      toast.error('Erro ao verificar status');
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!registrationData?.checkout_reference_id) {
      toast.error('Nenhum checkout pendente');
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/payments/simulate-payment/${registrationData.checkout_reference_id}`);
      toast.success('Pagamento simulado com sucesso!');
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao simular pagamento');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      </Layout>
    );
  }

  // Tela de Termos e Condições
  if (step === 'terms') {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-cyan-100 dark:bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-10 h-10 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">
              Treinamento Presencial
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Parabéns por completar o treinamento de acolhimento! Agora é hora de se preparar para o treinamento presencial.
            </p>
          </div>

          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-500" />
              Termos e Condições
            </h2>
            
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 max-h-96 overflow-y-auto text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {config?.terms_and_conditions || 'Carregando termos...'}
            </div>
            
            <div className="mt-6 flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={setTermsAccepted}
                data-testid="terms-checkbox"
              />
              <label htmlFor="terms" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                Li e aceito os termos e condições do treinamento presencial
              </label>
            </div>
            
            <Button
              onClick={handleTermsAccept}
              className="w-full mt-6 bg-cyan-500 hover:bg-cyan-600"
              data-testid="accept-terms-btn"
            >
              Continuar para Inscrição
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Formulário de Inscrição
  if (step === 'form') {
    const price = hasSpouse ? (config?.couple_price || 6000) : (config?.solo_price || 3500);
    
    return (
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-outfit font-bold text-slate-900 dark:text-white">
              Dados para Inscrição
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Preencha os dados necessários para reserva de hospedagem
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* Dados Pessoais */}
            <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-cyan-500" />
                Seus Dados
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                    data-testid="input-full_name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">CPF *</label>
                  <input
                    type="text"
                    value={formData.cpf}
                    onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="000.000.000-00"
                    required
                    data-testid="input-cpf"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">RG *</label>
                  <input
                    type="text"
                    value={formData.rg}
                    onChange={(e) => setFormData({...formData, rg: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                    data-testid="input-rg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data de Nascimento *</label>
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                    data-testid="input-birth_date"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telefone *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="(00) 00000-0000"
                    required
                    data-testid="input-phone"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">E-mail *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                    data-testid="input-email"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Endereço Completo *</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="Rua, número, complemento"
                    required
                    data-testid="input-address"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cidade *</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                    data-testid="input-city"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estado *</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    maxLength={2}
                    placeholder="UF"
                    required
                    data-testid="input-state"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">CEP *</label>
                  <input
                    type="text"
                    value={formData.zip_code}
                    onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="00000-000"
                    required
                    data-testid="input-zip_code"
                  />
                </div>
              </div>
            </div>

            {/* Opção de Cônjuge */}
            <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-6">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="has-spouse"
                  checked={hasSpouse}
                  onCheckedChange={setHasSpouse}
                  data-testid="spouse-checkbox"
                />
                <div>
                  <label htmlFor="has-spouse" className="text-lg font-semibold text-slate-900 dark:text-white cursor-pointer flex items-center gap-2">
                    <Heart className="w-5 h-5 text-pink-500" />
                    Vou levar meu cônjuge
                  </label>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Valor com cônjuge: {formatCurrency(config?.couple_price || 6000)}
                  </p>
                </div>
              </div>
              
              {hasSpouse && (
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="text-md font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-pink-500" />
                    Dados do Cônjuge
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome Completo *</label>
                      <input
                        type="text"
                        value={spouseData.full_name}
                        onChange={(e) => setSpouseData({...spouseData, full_name: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        data-testid="spouse-input-full_name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">CPF *</label>
                      <input
                        type="text"
                        value={spouseData.cpf}
                        onChange={(e) => setSpouseData({...spouseData, cpf: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        placeholder="000.000.000-00"
                        data-testid="spouse-input-cpf"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">RG *</label>
                      <input
                        type="text"
                        value={spouseData.rg}
                        onChange={(e) => setSpouseData({...spouseData, rg: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        data-testid="spouse-input-rg"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data de Nascimento *</label>
                      <input
                        type="date"
                        value={spouseData.birth_date}
                        onChange={(e) => setSpouseData({...spouseData, birth_date: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        data-testid="spouse-input-birth_date"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telefone *</label>
                      <input
                        type="tel"
                        value={spouseData.phone}
                        onChange={(e) => setSpouseData({...spouseData, phone: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        placeholder="(00) 00000-0000"
                        data-testid="spouse-input-phone"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">E-mail *</label>
                      <input
                        type="email"
                        value={spouseData.email}
                        onChange={(e) => setSpouseData({...spouseData, email: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        data-testid="spouse-input-email"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Endereço Completo *</label>
                      <input
                        type="text"
                        value={spouseData.address}
                        onChange={(e) => setSpouseData({...spouseData, address: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        placeholder="Rua, número, complemento"
                        data-testid="spouse-input-address"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cidade *</label>
                      <input
                        type="text"
                        value={spouseData.city}
                        onChange={(e) => setSpouseData({...spouseData, city: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        data-testid="spouse-input-city"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estado *</label>
                      <input
                        type="text"
                        value={spouseData.state}
                        onChange={(e) => setSpouseData({...spouseData, state: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        maxLength={2}
                        placeholder="UF"
                        data-testid="spouse-input-state"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">CEP *</label>
                      <input
                        type="text"
                        value={spouseData.zip_code}
                        onChange={(e) => setSpouseData({...spouseData, zip_code: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        placeholder="00000-000"
                        data-testid="spouse-input-zip_code"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Resumo */}
            <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-xl border border-cyan-200 dark:border-cyan-500/30 p-6">
              <h3 className="text-lg font-semibold text-cyan-900 dark:text-cyan-100 mb-2">Resumo</h3>
              <div className="flex justify-between items-center">
                <span className="text-cyan-700 dark:text-cyan-300">
                  Treinamento Presencial {hasSpouse ? '(com cônjuge)' : '(individual)'}
                </span>
                <span className="text-2xl font-bold text-cyan-900 dark:text-cyan-100">
                  {formatCurrency(price)}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-cyan-500 hover:bg-cyan-600 h-12 text-lg"
              data-testid="submit-registration-btn"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  Continuar para Pagamento
                  <ChevronRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>
        </div>
      </Layout>
    );
  }

  // Tela de Pagamento - Redireciona para PagBank
  if (step === 'payment') {
    const price = registrationData?.price || (registrationData?.has_spouse ? (config?.couple_price || 6000) : (config?.solo_price || 3500));

    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-10 h-10 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">
              Pagamento do Treinamento
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Complete o pagamento para confirmar sua inscrição
            </p>
          </div>

          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-6 space-y-6">
            {registrationData?.has_spouse && (
              <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400 pb-4 border-b border-slate-200 dark:border-slate-700">
                <Heart className="w-4 h-4" />
                <span className="text-sm">Inclui cônjuge</span>
              </div>
            )}

            {/* Resumo do Valor */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">Valor Total</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(price)}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Treinamento Presencial {registrationData?.has_spouse ? '(Casal)' : '(Individual)'}
              </p>
            </div>

            {/* Botão de Pagamento */}
            <div className="space-y-3">
              <Button
                onClick={handleProceedToPayment}
                disabled={submitting}
                className="w-full bg-green-500 hover:bg-green-600 h-12 text-lg"
                data-testid="proceed-payment-btn"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Criando checkout...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-5 h-5 mr-2" />
                    Pagar no PagBank
                  </>
                )}
              </Button>
              
              <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                Você será redirecionado para o ambiente seguro do PagBank
              </p>
            </div>

            {/* Se já tem checkout criado */}
            {registrationData?.checkout_url && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                  Já tem um checkout pendente?
                </p>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => window.open(registrationData.checkout_url, '_blank')}
                    variant="outline"
                    className="flex-1"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir Checkout
                  </Button>
                  
                  <Button
                    onClick={handleCheckPayment}
                    variant="outline"
                    disabled={checkingPayment}
                  >
                    {checkingPayment ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Modo Teste - Simular Pagamento */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  Modo Teste (Sandbox)
                </p>
                <Button
                  onClick={handleSimulatePayment}
                  variant="outline"
                  size="sm"
                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-100"
                  disabled={submitting || !registrationData?.checkout_reference_id}
                >
                  Simular Pagamento Confirmado
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Tela de Confirmação
  if (step === 'confirmed') {
    const trainingClass = registrationData?.training_class;
    
    return (
      <Layout>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">
              Inscrição Confirmada!
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Você está inscrito no treinamento presencial
            </p>
          </div>

          {trainingClass && (
            <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-6 space-y-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-cyan-500" />
                Informações do Treinamento
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Data</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{formatDate(trainingClass.date)}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Duração: 3 dias</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Horário</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{trainingClass.time || '08:00'}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Local do Treinamento</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{trainingClass.location || 'A definir'}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Hotel className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Hospedagem</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{trainingClass.hotel_info || 'A definir'}</p>
                  </div>
                </div>
              </div>
              
              {config?.training_instructions && (
                <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Instruções Importantes</h3>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {config.training_instructions}
                  </div>
                </div>
              )}
            </div>
          )}

          {registrationData?.has_spouse && (
            <div className="bg-pink-50 dark:bg-pink-900/20 rounded-xl border border-pink-200 dark:border-pink-500/30 p-4">
              <div className="flex items-center gap-3">
                <Heart className="w-5 h-5 text-pink-500" />
                <div>
                  <p className="font-semibold text-pink-900 dark:text-pink-100">Cônjuge inscrito</p>
                  <p className="text-sm text-pink-700 dark:text-pink-300">
                    {registrationData.spouse_data?.full_name}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-500/30 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">Pagamento Confirmado</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Transação: {registrationData?.payment_transaction_id || 'Confirmado'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return null;
};

export default Training;
