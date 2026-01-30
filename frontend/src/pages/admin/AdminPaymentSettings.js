import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import Layout from '../../components/Layout';
import {
  CreditCard,
  Settings,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
  ExternalLink,
  Wallet
} from 'lucide-react';
import { Button } from '../../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminPaymentSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState({});
  const [testingConnection, setTestingConnection] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    active_gateway: 'mercadopago',
    environment: 'sandbox',
    // MercadoPago Sandbox
    mp_sandbox_public_key: '',
    mp_sandbox_access_token: '',
    // MercadoPago Produção
    mp_production_public_key: '',
    mp_production_access_token: '',
    mp_production_client_id: '',
    mp_production_client_secret: '',
    // PagSeguro/PagBank Sandbox
    ps_sandbox_email: '',
    ps_sandbox_token: '',
    // PagSeguro/PagBank Produção
    ps_production_email: '',
    ps_production_token: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/payments/settings`);
      const data = response.data;
      
      setFormData({
        active_gateway: data.active_gateway || 'mercadopago',
        environment: data.environment || 'sandbox',
        // MercadoPago Sandbox
        mp_sandbox_public_key: data.sandbox_credentials?.mercadopago_public_key || '',
        mp_sandbox_access_token: data.sandbox_credentials?.mercadopago_access_token || '',
        // MercadoPago Produção
        mp_production_public_key: data.production_credentials?.mercadopago_public_key || '',
        mp_production_access_token: data.production_credentials?.mercadopago_access_token || '',
        mp_production_client_id: data.production_credentials?.mercadopago_client_id || '',
        mp_production_client_secret: data.production_credentials?.mercadopago_client_secret || '',
        // PagSeguro Sandbox
        ps_sandbox_email: data.sandbox_credentials?.pagseguro_email || '',
        ps_sandbox_token: data.sandbox_credentials?.pagseguro_token || '',
        // PagSeguro Produção
        ps_production_email: data.production_credentials?.pagseguro_email || '',
        ps_production_token: data.production_credentials?.pagseguro_token || '',
      });
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
        sandbox_credentials: {
          mercadopago_public_key: formData.mp_sandbox_public_key,
          mercadopago_access_token: formData.mp_sandbox_access_token,
          pagseguro_email: formData.ps_sandbox_email,
          pagseguro_token: formData.ps_sandbox_token,
        },
        production_credentials: {
          mercadopago_public_key: formData.mp_production_public_key,
          mercadopago_access_token: formData.mp_production_access_token,
          mercadopago_client_id: formData.mp_production_client_id,
          mercadopago_client_secret: formData.mp_production_client_secret,
          pagseguro_email: formData.ps_production_email,
          pagseguro_token: formData.ps_production_token,
        }
      };

      await axios.put(`${API_URL}/api/payments/settings`, payload);
      toast.success('Configurações salvas com sucesso!');
      fetchSettings();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      const response = await axios.get(`${API_URL}/api/payments/settings/public-key`);
      if (response.data.public_key || response.data.configured) {
        toast.success(`Conexão com ${formData.active_gateway === 'mercadopago' ? 'MercadoPago' : 'PagSeguro'} OK!`);
      } else {
        toast.warning('Credenciais não configuradas');
      }
    } catch (error) {
      toast.error('Erro ao testar conexão');
    } finally {
      setTestingConnection(false);
    }
  };

  const toggleSecret = (field) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const SecretInput = ({ label, field, placeholder, value, onChange }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type={showSecrets[field] ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 pr-12 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm"
        />
        <button
          type="button"
          onClick={() => toggleSecret(field)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {showSecrets[field] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-outfit font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <CreditCard className="w-7 h-7 text-cyan-500" />
            Configurações de Pagamento
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Configure os gateways de pagamento (MercadoPago e PagSeguro)
          </p>
        </div>

        {/* Gateway Selection */}
        <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/5 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-cyan-500" />
            Gateway Ativo
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            {/* MercadoPago */}
            <button
              onClick={() => setFormData(prev => ({ ...prev, active_gateway: 'mercadopago' }))}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                formData.active_gateway === 'mercadopago'
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-cyan-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  formData.active_gateway === 'mercadopago' ? 'bg-cyan-500' : 'bg-slate-200 dark:bg-slate-700'
                }`}>
                  <span className={`text-xl font-bold ${
                    formData.active_gateway === 'mercadopago' ? 'text-white' : 'text-slate-500'
                  }`}>MP</span>
                </div>
                <div>
                  <p className={`font-semibold ${
                    formData.active_gateway === 'mercadopago' ? 'text-cyan-800 dark:text-cyan-300' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    MercadoPago
                  </p>
                  <p className="text-xs text-slate-500">Checkout Pro</p>
                </div>
                {formData.active_gateway === 'mercadopago' && (
                  <CheckCircle className="w-5 h-5 text-cyan-500 ml-auto" />
                )}
              </div>
            </button>

            {/* PagSeguro */}
            <button
              onClick={() => setFormData(prev => ({ ...prev, active_gateway: 'pagseguro' }))}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                formData.active_gateway === 'pagseguro'
                  ? 'border-green-500 bg-green-50 dark:bg-green-500/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-green-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  formData.active_gateway === 'pagseguro' ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'
                }`}>
                  <span className={`text-xl font-bold ${
                    formData.active_gateway === 'pagseguro' ? 'text-white' : 'text-slate-500'
                  }`}>PS</span>
                </div>
                <div>
                  <p className={`font-semibold ${
                    formData.active_gateway === 'pagseguro' ? 'text-green-800 dark:text-green-300' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    PagBank / PagSeguro
                  </p>
                  <p className="text-xs text-slate-500">Checkout PagSeguro</p>
                </div>
                {formData.active_gateway === 'pagseguro' && (
                  <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Environment Selection */}
        <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/5 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Ambiente
          </h3>
          
          <div className="flex gap-3">
            <button
              onClick={() => setFormData(prev => ({ ...prev, environment: 'sandbox' }))}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                formData.environment === 'sandbox'
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className={`w-5 h-5 ${
                  formData.environment === 'sandbox' ? 'text-amber-600' : 'text-slate-400'
                }`} />
                <div className="text-left">
                  <p className={`font-medium ${
                    formData.environment === 'sandbox' ? 'text-amber-800 dark:text-amber-300' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    Sandbox (Teste)
                  </p>
                  <p className="text-xs text-slate-500">Para desenvolvimento e testes</p>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => setFormData(prev => ({ ...prev, environment: 'production' }))}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                formData.environment === 'production'
                  ? 'border-green-500 bg-green-50 dark:bg-green-500/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-green-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className={`w-5 h-5 ${
                  formData.environment === 'production' ? 'text-green-600' : 'text-slate-400'
                }`} />
                <div className="text-left">
                  <p className={`font-medium ${
                    formData.environment === 'production' ? 'text-green-800 dark:text-green-300' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    Produção
                  </p>
                  <p className="text-xs text-slate-500">Pagamentos reais</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* MercadoPago Credentials */}
        {formData.active_gateway === 'mercadopago' && (
          <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/5 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-cyan-500" />
                Credenciais MercadoPago
              </h3>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                formData.environment === 'sandbox' 
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' 
                  : 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
              }`}>
                {formData.environment === 'sandbox' ? 'SANDBOX' : 'PRODUÇÃO'}
              </span>
            </div>

            {/* Info */}
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <Shield className="w-4 h-4 inline mr-1" />
                Checkout Pro: Os clientes são redirecionados para o MercadoPago para pagar com segurança.
              </p>
            </div>
            
            {formData.environment === 'sandbox' ? (
              // Sandbox - apenas Public Key e Access Token
              <div className="space-y-4">
                <SecretInput
                  label="Public Key"
                  field="mp_sandbox_public_key"
                  placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={formData.mp_sandbox_public_key}
                  onChange={(val) => setFormData(prev => ({ ...prev, mp_sandbox_public_key: val }))}
                />
                <SecretInput
                  label="Access Token"
                  field="mp_sandbox_access_token"
                  placeholder="APP_USR-0000000000000000-000000-xxxxxxxx-000000000"
                  value={formData.mp_sandbox_access_token}
                  onChange={(val) => setFormData(prev => ({ ...prev, mp_sandbox_access_token: val }))}
                />
              </div>
            ) : (
              // Produção - todos os campos
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <SecretInput
                    label="Public Key"
                    field="mp_production_public_key"
                    placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={formData.mp_production_public_key}
                    onChange={(val) => setFormData(prev => ({ ...prev, mp_production_public_key: val }))}
                  />
                  <SecretInput
                    label="Access Token"
                    field="mp_production_access_token"
                    placeholder="APP_USR-0000000000000000-000000-xxxxxxxx-000000000"
                    value={formData.mp_production_access_token}
                    onChange={(val) => setFormData(prev => ({ ...prev, mp_production_access_token: val }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <SecretInput
                    label="Client ID"
                    field="mp_production_client_id"
                    placeholder="0000000000000000"
                    value={formData.mp_production_client_id}
                    onChange={(val) => setFormData(prev => ({ ...prev, mp_production_client_id: val }))}
                  />
                  <SecretInput
                    label="Client Secret"
                    field="mp_production_client_secret"
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={formData.mp_production_client_secret}
                    onChange={(val) => setFormData(prev => ({ ...prev, mp_production_client_secret: val }))}
                  />
                </div>
              </div>
            )}

            {/* Link para obter credenciais */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                Onde obter as credenciais?
              </p>
              <a
                href="https://www.mercadopago.com.br/developers/panel/app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-cyan-600 dark:text-cyan-400 hover:underline text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Painel de Desenvolvedores do MercadoPago
              </a>
            </div>
          </div>
        )}

        {/* PagSeguro Credentials */}
        {formData.active_gateway === 'pagseguro' && (
          <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/5 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-green-500" />
                Credenciais PagBank / PagSeguro
              </h3>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                formData.environment === 'sandbox' 
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' 
                  : 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
              }`}>
                {formData.environment === 'sandbox' ? 'SANDBOX' : 'PRODUÇÃO'}
              </span>
            </div>

            {/* Info */}
            <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg p-3">
              <p className="text-sm text-green-800 dark:text-green-300">
                <Shield className="w-4 h-4 inline mr-1" />
                Checkout PagSeguro: Os clientes são redirecionados para o PagSeguro para pagar com segurança.
              </p>
            </div>
            
            <div className="space-y-4">
              {formData.environment === 'sandbox' ? (
                <>
                  <SecretInput
                    label="Email da Conta"
                    field="ps_sandbox_email"
                    placeholder="seu-email@exemplo.com"
                    value={formData.ps_sandbox_email}
                    onChange={(val) => setFormData(prev => ({ ...prev, ps_sandbox_email: val }))}
                  />
                  <SecretInput
                    label="Token"
                    field="ps_sandbox_token"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxxxxxxxxxx"
                    value={formData.ps_sandbox_token}
                    onChange={(val) => setFormData(prev => ({ ...prev, ps_sandbox_token: val }))}
                  />
                </>
              ) : (
                <>
                  <SecretInput
                    label="Email da Conta"
                    field="ps_production_email"
                    placeholder="seu-email@exemplo.com"
                    value={formData.ps_production_email}
                    onChange={(val) => setFormData(prev => ({ ...prev, ps_production_email: val }))}
                  />
                  <SecretInput
                    label="Token"
                    field="ps_production_token"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxxxxxxxxxx"
                    value={formData.ps_production_token}
                    onChange={(val) => setFormData(prev => ({ ...prev, ps_production_token: val }))}
                  />
                </>
              )}
            </div>

            {/* Link para obter credenciais */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                Onde obter as credenciais?
              </p>
              <a
                href="https://dev.pagbank.uol.com.br/reference/credenciais"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-green-600 dark:text-green-400 hover:underline text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Portal de Desenvolvedores PagBank
              </a>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/5 p-6">
          <div className="flex gap-3">
            <Button
              onClick={testConnection}
              disabled={testingConnection}
              variant="outline"
              className="flex-1"
            >
              {testingConnection ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Testando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Testar Conexão
                </>
              )}
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-cyan-500 hover:bg-cyan-600"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configurações
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/5 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Status da Integração
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <span className="text-slate-700 dark:text-slate-300">Gateway Ativo</span>
              <span className={`font-medium ${
                formData.active_gateway === 'mercadopago' ? 'text-cyan-600' : 'text-green-600'
              }`}>
                {formData.active_gateway === 'mercadopago' ? 'MercadoPago' : 'PagBank/PagSeguro'}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <span className="text-slate-700 dark:text-slate-300">Ambiente</span>
              <span className={`font-medium ${
                formData.environment === 'sandbox' 
                  ? 'text-amber-600 dark:text-amber-400' 
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {formData.environment === 'sandbox' ? 'Sandbox (Teste)' : 'Produção'}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <span className="text-slate-700 dark:text-slate-300">Credenciais Configuradas</span>
              {(formData.active_gateway === 'mercadopago' 
                ? (formData.environment === 'sandbox' ? formData.mp_sandbox_access_token : formData.mp_production_access_token)
                : (formData.environment === 'sandbox' ? formData.ps_sandbox_token : formData.ps_production_token)
              ) ? (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  Sim
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                  <XCircle className="w-4 h-4" />
                  Não
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminPaymentSettings;
