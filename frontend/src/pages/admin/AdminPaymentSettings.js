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
  ExternalLink
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminPaymentSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState({});
  
  // Form state - Apenas campos que o PagBank disponibiliza
  const [formData, setFormData] = useState({
    environment: 'sandbox',
    pix_enabled: true,
    credit_card_enabled: true,
    split_payment_enabled: true,
    max_installments: 12,
    min_installment_value: 5.0,
    // Sandbox credentials - PagSeguro (apenas email e token)
    sandbox_pagseguro_email: '',
    sandbox_pagseguro_token: '',
    // Production credentials - PagSeguro (apenas email e token)
    production_pagseguro_email: '',
    production_pagseguro_token: '',
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
        environment: response.data.environment || 'sandbox',
        pix_enabled: response.data.pix_enabled ?? true,
        credit_card_enabled: response.data.credit_card_enabled ?? true,
        split_payment_enabled: response.data.split_payment_enabled ?? true,
        max_installments: response.data.max_installments || 12,
        min_installment_value: response.data.min_installment_value || 5.0,
        // Sandbox - PagSeguro
        sandbox_pagseguro_email: response.data.sandbox_credentials?.pagseguro_email || '',
        sandbox_pagseguro_token: response.data.sandbox_credentials?.pagseguro_token || '',
        // Production - PagSeguro
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

  const toggleSecret = (field) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
                <p className="text-sm text-slate-500 dark:text-slate-400">PIX, Cartão de Crédito, Débito e Boleto</p>
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
              <span className="text-slate-700 dark:text-slate-300">Pagamento Dividido</span>
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
                max="18"
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
              {window.location.origin.replace('localhost:3000', 'seudominio.com')}/api/payments/webhooks/pagseguro
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
    </Layout>
  );
};

export default AdminPaymentSettings;
