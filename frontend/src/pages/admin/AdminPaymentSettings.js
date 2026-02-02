import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import Layout from '../../components/Layout';
import {
  CreditCard,
  Wallet,
  Settings,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Zap,
  Shield
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminPaymentSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState({});
  
  // Form state
  const [formData, setFormData] = useState({
    active_gateway: 'mercadopago',
    environment: 'sandbox',
    pix_enabled: true,
    credit_card_enabled: true,
    split_payment_enabled: true,
    max_installments: 12,
    min_installment_value: 5.0,
    // Sandbox credentials
    sandbox_mercadopago_public_key: '',
    sandbox_mercadopago_access_token: '',
    sandbox_mercadopago_client_id: '',
    sandbox_mercadopago_client_secret: '',
    sandbox_pagseguro_email: '',
    sandbox_pagseguro_token: '',
    sandbox_pagseguro_app_id: '',
    sandbox_pagseguro_app_key: '',
    // Production credentials
    production_mercadopago_public_key: '',
    production_mercadopago_access_token: '',
    production_mercadopago_client_id: '',
    production_mercadopago_client_secret: '',
    production_pagseguro_email: '',
    production_pagseguro_token: '',
    production_pagseguro_app_id: '',
    production_pagseguro_app_key: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/payments/settings`);
      setSettings(response.data);
      
      // Preencher form com dados existentes
      setFormData(prev => ({
        ...prev,
        active_gateway: response.data.active_gateway || 'mercadopago',
        environment: response.data.environment || 'sandbox',
        pix_enabled: response.data.pix_enabled ?? true,
        credit_card_enabled: response.data.credit_card_enabled ?? true,
        split_payment_enabled: response.data.split_payment_enabled ?? true,
        max_installments: response.data.max_installments || 12,
        min_installment_value: response.data.min_installment_value || 5.0,
        // Sandbox
        sandbox_mercadopago_public_key: response.data.sandbox_credentials?.mercadopago_public_key || '',
        sandbox_mercadopago_access_token: response.data.sandbox_credentials?.mercadopago_access_token || '',
        sandbox_mercadopago_client_id: response.data.sandbox_credentials?.mercadopago_client_id || '',
        sandbox_mercadopago_client_secret: response.data.sandbox_credentials?.mercadopago_client_secret || '',
        sandbox_pagseguro_email: response.data.sandbox_credentials?.pagseguro_email || '',
        sandbox_pagseguro_token: response.data.sandbox_credentials?.pagseguro_token || '',
        sandbox_pagseguro_app_id: response.data.sandbox_credentials?.pagseguro_app_id || '',
        sandbox_pagseguro_app_key: response.data.sandbox_credentials?.pagseguro_app_key || '',
        // Production
        production_mercadopago_public_key: response.data.production_credentials?.mercadopago_public_key || '',
        production_mercadopago_access_token: response.data.production_credentials?.mercadopago_access_token || '',
        production_mercadopago_client_id: response.data.production_credentials?.mercadopago_client_id || '',
        production_mercadopago_client_secret: response.data.production_credentials?.mercadopago_client_secret || '',
        production_pagseguro_email: response.data.production_credentials?.pagseguro_email || '',
        production_pagseguro_token: response.data.production_credentials?.pagseguro_token || '',
        production_pagseguro_app_id: response.data.production_credentials?.pagseguro_app_id || '',
        production_pagseguro_app_key: response.data.production_credentials?.pagseguro_app_key || '',
      }));
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      toast.error('Erro ao carregar configurações de pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        active_gateway: formData.active_gateway,
        environment: formData.environment,
        pix_enabled: formData.pix_enabled,
        credit_card_enabled: formData.credit_card_enabled,
        split_payment_enabled: formData.split_payment_enabled,
        max_installments: parseInt(formData.max_installments),
        min_installment_value: parseFloat(formData.min_installment_value),
        sandbox_credentials: {
          mercadopago_public_key: formData.sandbox_mercadopago_public_key || null,
          mercadopago_access_token: formData.sandbox_mercadopago_access_token || null,
          mercadopago_client_id: formData.sandbox_mercadopago_client_id || null,
          mercadopago_client_secret: formData.sandbox_mercadopago_client_secret || null,
          pagseguro_email: formData.sandbox_pagseguro_email || null,
          pagseguro_token: formData.sandbox_pagseguro_token || null,
          pagseguro_app_id: formData.sandbox_pagseguro_app_id || null,
          pagseguro_app_key: formData.sandbox_pagseguro_app_key || null,
        },
        production_credentials: {
          mercadopago_public_key: formData.production_mercadopago_public_key || null,
          mercadopago_access_token: formData.production_mercadopago_access_token || null,
          mercadopago_client_id: formData.production_mercadopago_client_id || null,
          mercadopago_client_secret: formData.production_mercadopago_client_secret || null,
          pagseguro_email: formData.production_pagseguro_email || null,
          pagseguro_token: formData.production_pagseguro_token || null,
          pagseguro_app_id: formData.production_pagseguro_app_id || null,
          pagseguro_app_key: formData.production_pagseguro_app_key || null,
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

  const toggleSecret = (field) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const CredentialInput = ({ label, field, placeholder, isSecret = false }) => (
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
            <p className="text-slate-600 dark:text-slate-400 mt-2">Gerencie os gateways de pagamento e credenciais</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50"
            data-testid="save-settings-btn"
          >
            {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Salvar Configurações
          </button>
        </div>

        {/* Gateway Selection */}
        <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-100 dark:border-white/5 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-cyan-500" />
            Gateway Ativo
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleChange('active_gateway', 'mercadopago')}
              className={`p-4 rounded-xl border-2 transition-all ${
                formData.active_gateway === 'mercadopago'
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-cyan-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  formData.active_gateway === 'mercadopago' ? 'bg-cyan-500' : 'bg-slate-200 dark:bg-slate-700'
                }`}>
                  <CreditCard className={`w-6 h-6 ${
                    formData.active_gateway === 'mercadopago' ? 'text-white' : 'text-slate-500'
                  }`} />
                </div>
                <div className="text-left">
                  <p className={`font-semibold ${
                    formData.active_gateway === 'mercadopago' ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-900 dark:text-white'
                  }`}>MercadoPago</p>
                  <p className="text-sm text-slate-500">Líder em pagamentos no Brasil</p>
                </div>
                {formData.active_gateway === 'mercadopago' && (
                  <CheckCircle className="w-6 h-6 text-cyan-500 ml-auto" />
                )}
              </div>
            </button>

            <button
              onClick={() => handleChange('active_gateway', 'pagseguro')}
              className={`p-4 rounded-xl border-2 transition-all ${
                formData.active_gateway === 'pagseguro'
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-cyan-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  formData.active_gateway === 'pagseguro' ? 'bg-cyan-500' : 'bg-slate-200 dark:bg-slate-700'
                }`}>
                  <Shield className={`w-6 h-6 ${
                    formData.active_gateway === 'pagseguro' ? 'text-white' : 'text-slate-500'
                  }`} />
                </div>
                <div className="text-left">
                  <p className={`font-semibold ${
                    formData.active_gateway === 'pagseguro' ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-900 dark:text-white'
                  }`}>PagSeguro</p>
                  <p className="text-sm text-slate-500">Soluções completas de pagamento</p>
                </div>
                {formData.active_gateway === 'pagseguro' && (
                  <CheckCircle className="w-6 h-6 text-cyan-500 ml-auto" />
                )}
              </div>
            </button>
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

        {/* Payment Methods */}
        <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-100 dark:border-white/5 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Métodos de Pagamento</h2>
          
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.pix_enabled}
                onChange={(e) => handleChange('pix_enabled', e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-cyan-500 focus:ring-cyan-500"
              />
              <span className="text-slate-700 dark:text-slate-300">PIX</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.credit_card_enabled}
                onChange={(e) => handleChange('credit_card_enabled', e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-cyan-500 focus:ring-cyan-500"
              />
              <span className="text-slate-700 dark:text-slate-300">Cartão de Crédito</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.split_payment_enabled}
                onChange={(e) => handleChange('split_payment_enabled', e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-cyan-500 focus:ring-cyan-500"
              />
              <span className="text-slate-700 dark:text-slate-300">Pagamento Dividido (PIX + Cartão ou múltiplos cartões)</span>
            </label>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Máximo de Parcelas
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={formData.max_installments}
                onChange={(e) => handleChange('max_installments', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Valor Mínimo da Parcela (R$)
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={formData.min_installment_value}
                onChange={(e) => handleChange('min_installment_value', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Sandbox Credentials */}
        <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-100 dark:border-white/5 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Credenciais Sandbox (Teste)
          </h2>

          {/* MercadoPago Sandbox */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-slate-700 dark:text-slate-300 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">
              MercadoPago
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CredentialInput label="Public Key" field="sandbox_mercadopago_public_key" placeholder="TEST-..." />
              <CredentialInput label="Access Token" field="sandbox_mercadopago_access_token" placeholder="TEST-..." isSecret />
              <CredentialInput label="Client ID" field="sandbox_mercadopago_client_id" placeholder="123456789" />
              <CredentialInput label="Client Secret" field="sandbox_mercadopago_client_secret" placeholder="..." isSecret />
            </div>
          </div>

          {/* PagSeguro Sandbox */}
          <div>
            <h3 className="text-md font-medium text-slate-700 dark:text-slate-300 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">
              PagSeguro
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CredentialInput label="Email" field="sandbox_pagseguro_email" placeholder="email@sandbox.pagseguro.com.br" />
              <CredentialInput label="Token" field="sandbox_pagseguro_token" placeholder="..." isSecret />
              <CredentialInput label="App ID" field="sandbox_pagseguro_app_id" placeholder="app123456" />
              <CredentialInput label="App Key" field="sandbox_pagseguro_app_key" placeholder="..." isSecret />
            </div>
          </div>
        </div>

        {/* Production Credentials */}
        <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-100 dark:border-white/5 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-green-500" />
            Credenciais Produção
          </h2>

          {/* MercadoPago Production */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-slate-700 dark:text-slate-300 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">
              MercadoPago
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CredentialInput label="Public Key" field="production_mercadopago_public_key" placeholder="APP_USR-..." />
              <CredentialInput label="Access Token" field="production_mercadopago_access_token" placeholder="APP_USR-..." isSecret />
              <CredentialInput label="Client ID" field="production_mercadopago_client_id" placeholder="123456789" />
              <CredentialInput label="Client Secret" field="production_mercadopago_client_secret" placeholder="..." isSecret />
            </div>
          </div>

          {/* PagSeguro Production */}
          <div>
            <h3 className="text-md font-medium text-slate-700 dark:text-slate-300 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">
              PagSeguro
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CredentialInput label="Email" field="production_pagseguro_email" placeholder="email@seudominio.com.br" />
              <CredentialInput label="Token" field="production_pagseguro_token" placeholder="..." isSecret />
              <CredentialInput label="App ID" field="production_pagseguro_app_id" placeholder="app123456" />
              <CredentialInput label="App Key" field="production_pagseguro_app_key" placeholder="..." isSecret />
            </div>
          </div>
        </div>

        {/* Webhook URLs */}
        <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-100 dark:border-white/5 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">URLs de Webhook</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Configure estas URLs nos painéis dos gateways para receber notificações de pagamento:
          </p>
          
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">MercadoPago:</p>
              <code className="text-sm text-cyan-600 dark:text-cyan-400 break-all">
                {window.location.origin.replace('localhost:3000', 'igvd.org')}/api/payments/webhooks/mercadopago
              </code>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">PagSeguro:</p>
              <code className="text-sm text-cyan-600 dark:text-cyan-400 break-all">
                {window.location.origin.replace('localhost:3000', 'igvd.org')}/api/payments/webhooks/pagseguro
              </code>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminPaymentSettings;
