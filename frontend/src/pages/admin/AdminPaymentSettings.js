import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import Layout from '../../components/Layout';
import {
  Wallet,
  Settings,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Zap,
  Shield,
  ExternalLink,
  TestTube,
  FileText,
  Trash2,
  Clock,
  X,
  Check
} from 'lucide-react';
import { Button } from '../../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminPaymentSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState({});
  const [activeTab, setActiveTab] = useState('config'); // config, test, logs
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testingCheckout, setTestingCheckout] = useState(false);
  const [testResult, setTestResult] = useState(null);
  
  // Form state - Apenas campos que o PagBank disponibiliza
  const [formData, setFormData] = useState({
    environment: 'sandbox',
    pix_enabled: true,
    credit_card_enabled: true,
    split_payment_enabled: true,
    max_installments: 12,
    min_installment_value: 5.0,
    // Sandbox credentials - PagBank (apenas email e token)
    sandbox_pagseguro_email: '',
    sandbox_pagseguro_token: '',
    // Production credentials - PagBank (apenas email e token)
    production_pagseguro_email: '',
    production_pagseguro_token: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    } else if (activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [activeTab]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/payments/settings`);
      setSettings(response.data);
      
      // Preencher form com dados existentes
      setFormData(prev => ({
        ...prev,
        environment: response.data.environment || 'sandbox',
        pix_enabled: response.data.pix_enabled ?? true,
        credit_card_enabled: response.data.credit_card_enabled ?? true,
        split_payment_enabled: response.data.split_payment_enabled ?? true,
        max_installments: response.data.max_installments || 12,
        min_installment_value: response.data.min_installment_value || 5.0,
        // Sandbox - PagBank
        sandbox_pagseguro_email: response.data.sandbox_credentials?.pagseguro_email || '',
        sandbox_pagseguro_token: response.data.sandbox_credentials?.pagseguro_token || '',
        // Production - PagBank
        production_pagseguro_email: response.data.production_credentials?.pagseguro_email || '',
        production_pagseguro_token: response.data.production_credentials?.pagseguro_token || '',
      }));
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      toast.error('Erro ao carregar configurações de pagamento');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const response = await axios.get(`${API_URL}/api/payments/logs?limit=100`);
      setLogs(response.data);
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchTransactions = async () => {
    setLoadingLogs(true);
    try {
      const response = await axios.get(`${API_URL}/api/payments/transactions?limit=100`);
      setTransactions(response.data);
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        active_gateway: 'pagseguro',
        environment: formData.environment,
        pix_enabled: formData.pix_enabled,
        credit_card_enabled: formData.credit_card_enabled,
        split_payment_enabled: formData.split_payment_enabled,
        max_installments: parseInt(formData.max_installments),
        min_installment_value: parseFloat(formData.min_installment_value),
        sandbox_credentials: {
          pagseguro_email: formData.sandbox_pagseguro_email || null,
          pagseguro_token: formData.sandbox_pagseguro_token || null,
        },
        production_credentials: {
          pagseguro_email: formData.production_pagseguro_email || null,
          pagseguro_token: formData.production_pagseguro_token || null,
        }
      };

      await axios.put(`${API_URL}/api/payments/settings`, payload);
      toast.success('Configurações salvas com sucesso!');
      fetchSettings();
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const response = await axios.post(`${API_URL}/api/payments/test-connection`);
      setTestResult(response.data);
      
      if (response.data.success) {
        toast.success('Conexão estabelecida com sucesso!');
      } else {
        toast.error(response.data.error || 'Erro na conexão');
      }
    } catch (error) {
      toast.error('Erro ao testar conexão');
      setTestResult({ success: false, error: error.message });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleTestCheckout = async () => {
    setTestingCheckout(true);
    setTestResult(null);
    try {
      const response = await axios.post(`${API_URL}/api/payments/test-checkout`);
      setTestResult(response.data);
      
      if (response.data.success) {
        toast.success('Checkout de teste criado!');
      } else {
        toast.error(response.data.error || 'Erro ao criar checkout');
      }
    } catch (error) {
      toast.error('Erro ao criar checkout de teste');
      setTestResult({ success: false, error: error.message });
    } finally {
      setTestingCheckout(false);
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm('Tem certeza que deseja limpar todos os logs?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/payments/logs`);
      toast.success('Logs removidos');
      fetchLogs();
    } catch (error) {
      toast.error('Erro ao limpar logs');
    }
  };

  const toggleSecret = (field) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  const CredentialInput = ({ label, field, placeholder, isSecret = false, helpText = null }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type={isSecret && !showSecrets[field] ? 'password' : 'text'}
          value={formData[field] || ''}
          onChange={(e) => handleChange(field, e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent pr-10"
        />
        {isSecret && (
          <button
            type="button"
            onClick={() => toggleSecret(field)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            {showSecrets[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {helpText && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{helpText}</p>
      )}
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6" data-testid="payment-settings-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">Configurações de Pagamento</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Configure as credenciais do PagBank</p>
          </div>
          {activeTab === 'config' && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-cyan-500 hover:bg-cyan-600"
              data-testid="save-settings-btn"
            >
              {saving ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
              Salvar Configurações
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('config')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'config'
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Configurações
            </button>
            <button
              onClick={() => setActiveTab('test')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'test'
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <TestTube className="w-4 h-4 inline mr-2" />
              Testar Integração
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'logs'
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Logs
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'transactions'
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Wallet className="w-4 h-4 inline mr-2" />
              Transações
            </button>
          </nav>
        </div>

        {/* Tab: Configurações */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            {/* Gateway Info */}
            <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-100 dark:border-white/5 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-cyan-500" />
                Gateway de Pagamento
              </h2>
              
              <div className="p-4 rounded-xl border-2 border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-cyan-500">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-cyan-600 dark:text-cyan-400">PagBank (PagSeguro)</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Checkout externo - PIX, Cartão, Débito e Boleto</p>
                  </div>
                  <CheckCircle className="w-6 h-6 text-cyan-500" />
                </div>
              </div>
            </div>

            {/* Environment Selection */}
            <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-100 dark:border-white/5 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-cyan-500" />
                Ambiente
              </h2>
              
              <div className="flex gap-4">
                <button
                  onClick={() => handleChange('environment', 'sandbox')}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    formData.environment === 'sandbox'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10'
                      : 'border-slate-200 dark:border-slate-700 hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <AlertCircle className={`w-5 h-5 ${
                      formData.environment === 'sandbox' ? 'text-amber-500' : 'text-slate-400'
                    }`} />
                    <span className={`font-medium ${
                      formData.environment === 'sandbox' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'
                    }`}>Sandbox (Teste)</span>
                  </div>
                </button>

                <button
                  onClick={() => handleChange('environment', 'production')}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    formData.environment === 'production'
                      ? 'border-green-500 bg-green-50 dark:bg-green-500/10'
                      : 'border-slate-200 dark:border-slate-700 hover:border-green-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Zap className={`w-5 h-5 ${
                      formData.environment === 'production' ? 'text-green-500' : 'text-slate-400'
                    }`} />
                    <span className={`font-medium ${
                      formData.environment === 'production' ? 'text-green-600 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'
                    }`}>Produção</span>
                  </div>
                </button>
              </div>

              {formData.environment === 'production' && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Atenção: Você está no modo de produção. Transações reais serão processadas.
                  </p>
                </div>
              )}
            </div>

            {/* Sandbox Credentials */}
            <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-100 dark:border-white/5 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Credenciais Sandbox (Teste)
              </h2>
              
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Obtenha suas credenciais de teste no{' '}
                <a 
                  href="https://portaldev.pagbank.com.br/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-cyan-600 hover:text-cyan-700 underline inline-flex items-center gap-1"
                >
                  Portal de Desenvolvedores PagBank
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CredentialInput 
                  label="Email da Conta" 
                  field="sandbox_pagseguro_email" 
                  placeholder="email@exemplo.com"
                  helpText="Email cadastrado no PagBank"
                />
                <CredentialInput 
                  label="Token de Autenticação" 
                  field="sandbox_pagseguro_token" 
                  placeholder="Seu token de sandbox..." 
                  isSecret
                  helpText="Encontre em: Portal Dev → Tokens"
                />
              </div>
            </div>

            {/* Production Credentials */}
            <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-100 dark:border-white/5 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-500" />
                Credenciais Produção
              </h2>

              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Obtenha suas credenciais de produção no{' '}
                <a 
                  href="https://acesso.pagseguro.uol.com.br/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-cyan-600 hover:text-cyan-700 underline inline-flex items-center gap-1"
                >
                  PagBank
                  <ExternalLink className="w-3 h-3" />
                </a>
                {' '}→ Vender online → Integrações → Gerar Token
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CredentialInput 
                  label="Email da Conta" 
                  field="production_pagseguro_email" 
                  placeholder="email@seudominio.com.br"
                  helpText="Email cadastrado no PagBank"
                />
                <CredentialInput 
                  label="Token de Autenticação" 
                  field="production_pagseguro_token" 
                  placeholder="Seu token de produção..." 
                  isSecret
                  helpText="Menu: Vender online → Integrações"
                />
              </div>
            </div>

            {/* Webhook URL */}
            <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-100 dark:border-white/5 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">URL de Webhook (Notificações)</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Configure esta URL no painel do PagBank para receber notificações automáticas de pagamento:
              </p>
              
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <code className="text-sm text-cyan-600 dark:text-cyan-400 break-all">
                  {window.location.origin.replace('localhost:3000', 'seudominio.com')}/api/payments/webhooks/pagbank
                </code>
              </div>
            </div>

            {/* Help Section */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-500/30 p-6">
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-3">Como obter suas credenciais?</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">Ambiente Sandbox (Teste):</h4>
                  <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
                    <li>Acesse o <a href="https://portaldev.pagbank.com.br/" target="_blank" rel="noopener noreferrer" className="underline">Portal de Desenvolvedores</a></li>
                    <li>Faça login com sua conta PagBank</li>
                    <li>Clique na aba "Tokens"</li>
                    <li>Copie o token de sandbox</li>
                  </ol>
                </div>
                
                <div>
                  <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">Ambiente Produção:</h4>
                  <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
                    <li>Acesse sua conta no <a href="https://acesso.pagseguro.uol.com.br/" target="_blank" rel="noopener noreferrer" className="underline">PagBank</a></li>
                    <li>No menu lateral, clique em "Vender online"</li>
                    <li>Selecione "Integrações"</li>
                    <li>Clique em "Gerar Token" ou copie o existente</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Testar Integração */}
        {activeTab === 'test' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-100 dark:border-white/5 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <TestTube className="w-5 h-5 text-cyan-500" />
                Testar Integração com PagBank
              </h2>
              
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Use estas opções para verificar se a integração está funcionando corretamente.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Test Connection */}
                <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <h3 className="font-medium text-slate-900 dark:text-white mb-2">Testar Conexão</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Verifica se o token está válido e a API está acessível.
                  </p>
                  <Button
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    variant="outline"
                    className="w-full"
                  >
                    {testingConnection ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Testando...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Testar Conexão
                      </>
                    )}
                  </Button>
                </div>

                {/* Test Checkout */}
                <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <h3 className="font-medium text-slate-900 dark:text-white mb-2">Criar Checkout de Teste</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Cria um checkout de R$ 1,00 para testar o fluxo completo.
                  </p>
                  <Button
                    onClick={handleTestCheckout}
                    disabled={testingCheckout}
                    className="w-full bg-cyan-500 hover:bg-cyan-600"
                  >
                    {testingCheckout ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Criar Checkout de Teste
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Test Result */}
              {testResult && (
                <div className={`mt-6 p-4 rounded-lg ${
                  testResult.success 
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30' 
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30'
                }`}>
                  <div className="flex items-start gap-3">
                    {testResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium ${testResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        {testResult.success ? 'Sucesso!' : 'Erro'}
                      </p>
                      {testResult.message && (
                        <p className="text-sm mt-1 text-slate-600 dark:text-slate-400">{testResult.message}</p>
                      )}
                      {testResult.error && (
                        <p className="text-sm mt-1 text-red-600 dark:text-red-400">{testResult.error}</p>
                      )}
                      {testResult.environment && (
                        <p className="text-sm mt-1 text-slate-500 dark:text-slate-400">
                          Ambiente: {testResult.environment === 'sandbox' ? 'Sandbox (Teste)' : 'Produção'}
                        </p>
                      )}
                      {testResult.checkout_url && (
                        <a 
                          href={testResult.checkout_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-sm text-cyan-600 hover:text-cyan-700 underline"
                        >
                          Abrir Checkout de Teste
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Info sobre ambiente */}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-500/30 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-300">
                    Ambiente atual: {formData.environment === 'sandbox' ? 'Sandbox (Teste)' : 'Produção'}
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                    {formData.environment === 'sandbox' 
                      ? 'Os testes serão feitos no ambiente de testes do PagBank.'
                      : 'ATENÇÃO: Os testes serão feitos em ambiente de produção. Transações reais podem ser criadas.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Logs */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Logs de Integração</h2>
              <div className="flex gap-2">
                <Button onClick={fetchLogs} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar
                </Button>
                <Button onClick={handleClearLogs} variant="outline" size="sm" className="text-red-500 hover:text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              </div>
            </div>

            {loadingLogs ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
              </div>
            ) : logs.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-8 text-center">
                <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-500 dark:text-slate-400">Nenhum log registrado</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-100 dark:border-white/5 overflow-hidden">
                <div className="max-h-[600px] overflow-y-auto">
                  {logs.map((log) => (
                    <div 
                      key={log.id} 
                      className="p-4 border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              log.type === 'webhook_received' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                              log.type === 'checkout_created' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                              log.type === 'connection_test' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                              log.type === 'webhook_error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                              'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            }`}>
                              {log.type}
                            </span>
                            {log.reference_id && (
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                ref: {log.reference_id}
                              </span>
                            )}
                          </div>
                          {log.result && (
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {log.result.success ? '✓ Sucesso' : `✗ ${log.result.error || 'Erro'}`}
                            </p>
                          )}
                          {log.error && (
                            <p className="text-sm text-red-600 dark:text-red-400">{log.error}</p>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Transações */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Histórico de Transações</h2>
              <Button onClick={fetchTransactions} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>

            {loadingLogs ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-8 text-center">
                <Wallet className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-500 dark:text-slate-400">Nenhuma transação registrada</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-100 dark:border-white/5 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Referência</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Descrição</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Usuário</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Valor</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          {formatDate(tx.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-600 dark:text-slate-400">
                          {tx.reference_id?.substring(0, 20)}...
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                          {tx.item_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          {tx.user_name || tx.customer_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900 dark:text-white text-right font-medium">
                          R$ {tx.amount?.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            tx.status === 'paid' 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                          }`}>
                            {tx.status === 'paid' ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {tx.status === 'paid' ? 'Pago' : 'Pendente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminPaymentSettings;
