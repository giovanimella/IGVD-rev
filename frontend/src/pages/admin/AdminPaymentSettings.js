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
  ExternalLink
} from 'lucide-react';
import { Button } from '../../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminPaymentSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState({});
  const [testingConnection, setTestingConnection] = useState(false);
  
  // Form state simplificado
  const [formData, setFormData] = useState({
    environment: 'sandbox',
    // Credenciais MercadoPago
    mercadopago_public_key: '',
    mercadopago_access_token: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/payments/settings`);
      setSettings(response.data);
      
      // Preencher form com dados existentes
      const env = response.data.environment || 'sandbox';
      const credentials = env === 'sandbox' 
        ? response.data.sandbox_credentials 
        : response.data.production_credentials;
      
      setFormData({
        environment: env,
        mercadopago_public_key: credentials?.mercadopago_public_key || '',
        mercadopago_access_token: credentials?.mercadopago_access_token || '',
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
      const credentialsKey = formData.environment === 'sandbox' 
        ? 'sandbox_credentials' 
        : 'production_credentials';
      
      const payload = {
        environment: formData.environment,
        active_gateway: 'mercadopago',
        [credentialsKey]: {
          mercadopago_public_key: formData.mercadopago_public_key,
          mercadopago_access_token: formData.mercadopago_access_token,
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
      // Tenta obter a public key como teste de conexão
      const response = await axios.get(`${API_URL}/api/payments/settings/public-key`);
      if (response.data.public_key) {
        toast.success('Conexão com MercadoPago OK!');
      } else {
        toast.warning('Public Key não configurada');
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

  const maskValue = (value) => {
    if (!value || value.length < 10) return value;
    return value.substring(0, 8) + '•'.repeat(value.length - 16) + value.substring(value.length - 8);
  };

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
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-outfit font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <CreditCard className="w-7 h-7 text-cyan-500" />
              Configurações de Pagamento
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Configure as credenciais do MercadoPago Checkout Pro
            </p>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-medium">Checkout Pro</p>
              <p className="text-blue-600 dark:text-blue-400 mt-1">
                Os clientes serão redirecionados para o ambiente seguro do MercadoPago para realizar o pagamento.
                Suporta PIX, Cartão de Crédito, Boleto e mais.
              </p>
            </div>
          </div>
        </div>

        {/* Main Settings Card */}
        <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/5 p-6 space-y-6">
          
          {/* Ambiente */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Ambiente
            </label>
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
                    <p className="text-xs text-slate-500">Para desenvolvimento</p>
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

          {/* Credenciais */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-cyan-500" />
              Credenciais MercadoPago
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                formData.environment === 'sandbox' 
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' 
                  : 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
              }`}>
                {formData.environment === 'sandbox' ? 'SANDBOX' : 'PRODUÇÃO'}
              </span>
            </h3>
            
            {/* Public Key */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Public Key
              </label>
              <div className="relative">
                <input
                  type={showSecrets.public_key ? 'text' : 'password'}
                  value={formData.mercadopago_public_key}
                  onChange={(e) => setFormData(prev => ({ ...prev, mercadopago_public_key: e.target.value }))}
                  placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full px-4 py-3 pr-12 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => toggleSecret('public_key')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showSecrets.public_key ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Access Token */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Access Token
              </label>
              <div className="relative">
                <input
                  type={showSecrets.access_token ? 'text' : 'password'}
                  value={formData.mercadopago_access_token}
                  onChange={(e) => setFormData(prev => ({ ...prev, mercadopago_access_token: e.target.value }))}
                  placeholder="APP_USR-0000000000000000-000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-000000000"
                  className="w-full px-4 py-3 pr-12 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => toggleSecret('access_token')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showSecrets.access_token ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Nunca compartilhe seu Access Token. Ele dá acesso completo à sua conta.
              </p>
            </div>
          </div>

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

          {/* Botões de ação */}
          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
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
              <span className="font-medium text-cyan-600 dark:text-cyan-400">MercadoPago</span>
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
              <span className="text-slate-700 dark:text-slate-300">Public Key</span>
              {formData.mercadopago_public_key ? (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  Configurada
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                  <XCircle className="w-4 h-4" />
                  Não configurada
                </span>
              )}
            </div>
            
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <span className="text-slate-700 dark:text-slate-300">Access Token</span>
              {formData.mercadopago_access_token ? (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  Configurado
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                  <XCircle className="w-4 h-4" />
                  Não configurado
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
