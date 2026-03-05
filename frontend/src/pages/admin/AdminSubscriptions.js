import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { Save, CreditCard, Shield, DollarSign, Calendar, Bell, Loader, Plus, Package, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

const AdminSubscriptions = () => {
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [pagbankPlans, setPagbankPlans] = useState([]); // Planos diretamente do PagBank
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [syncingPlans, setSyncingPlans] = useState(false);
  const [loadingPagbankPlans, setLoadingPagbankPlans] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: 'Mensalidade UniOzoxx',
    description: 'Acesso mensal à plataforma de treinamento',
    amount: 49.90
  });

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, statsRes, subsRes, plansRes] = await Promise.all([
        axios.get(`${API_URL}/api/subscriptions/settings`),
        axios.get(`${API_URL}/api/subscriptions/stats`),
        axios.get(`${API_URL}/api/subscriptions/all`),
        axios.get(`${API_URL}/api/subscriptions/plans`)
      ]);

      setSettings(settingsRes.data);
      setStats(statsRes.data);
      setSubscriptions(subsRes.data);
      setPlans(plansRes.data);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/subscriptions/settings`, settings);
      toast.success('Configurações salvas com sucesso!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const response = await axios.post(`${API_URL}/api/subscriptions/test-connection`);
      if (response.data.success) {
        toast.success('Conexão com PagBank estabelecida com sucesso!');
      } else {
        toast.error(response.data.error || 'Falha na conexão');
      }
    } catch (error) {
      toast.error('Erro ao testar conexão');
    } finally {
      setTesting(false);
    }
  };

  const handleGeneratePublicKey = async () => {
    if (!settings?.pagbank_token) {
      toast.error('Configure o Token Bearer primeiro');
      return;
    }

    setGeneratingKey(true);
    try {
      const response = await axios.post(`${API_URL}/api/subscriptions/generate-public-key`);
      if (response.data.success) {
        toast.success('Chave pública gerada com sucesso!');
        fetchData(); // Recarregar dados
      } else {
        toast.error(response.data.error || 'Erro ao gerar chave pública');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao gerar chave pública';
      toast.error(errorMsg);
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!settings?.pagbank_token || !settings?.pagbank_public_key) {
      toast.error('Configure o Token e gere a Chave Pública primeiro');
      return;
    }

    if (!newPlan.name || !newPlan.amount) {
      toast.error('Preencha o nome e o valor do plano');
      return;
    }

    setCreatingPlan(true);
    try {
      const response = await axios.post(`${API_URL}/api/subscriptions/plans`, newPlan);
      toast.success('Plano criado com sucesso no PagBank!');
      setShowPlanForm(false);
      setNewPlan({
        name: 'Mensalidade UniOzoxx',
        description: 'Acesso mensal à plataforma de treinamento',
        amount: 49.90
      });
      fetchData(); // Recarregar dados
      // Também atualizar planos do PagBank
      fetchPagbankPlans();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao criar plano';
      toast.error(errorMsg);
      console.error('Erro ao criar plano:', error);
    } finally {
      setCreatingPlan(false);
    }
  };

  const fetchPagbankPlans = async () => {
    if (!settings?.pagbank_token) return;
    
    setLoadingPagbankPlans(true);
    try {
      const response = await axios.get(`${API_URL}/api/subscriptions/pagbank-plans`);
      if (response.data.success) {
        setPagbankPlans(response.data.plans || []);
      }
    } catch (error) {
      console.error('Erro ao buscar planos do PagBank:', error);
      // Não mostrar erro se for 400 (token não configurado)
      if (error.response?.status !== 400) {
        toast.error('Erro ao buscar planos do PagBank');
      }
    } finally {
      setLoadingPagbankPlans(false);
    }
  };

  const handleSyncPlans = async () => {
    if (!settings?.pagbank_token) {
      toast.error('Configure o Token Bearer primeiro');
      return;
    }

    setSyncingPlans(true);
    try {
      const response = await axios.post(`${API_URL}/api/subscriptions/sync-plans`);
      if (response.data.success) {
        toast.success(`${response.data.synced_count} plano(s) sincronizado(s) com sucesso!`);
        fetchData(); // Recarregar dados locais
        fetchPagbankPlans(); // Atualizar lista do PagBank
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao sincronizar planos';
      toast.error(errorMsg);
    } finally {
      setSyncingPlans(false);
    }
  };

  // Buscar planos do PagBank quando settings estiver carregado
  useEffect(() => {
    if (settings?.pagbank_token) {
      fetchPagbankPlans();
    }
  }, [settings?.pagbank_token]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Loader className="animate-spin h-12 w-12 text-cyan-500" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-outfit font-bold text-slate-900">Assinaturas e Mensalidade</h1>
          <p className="text-slate-600 mt-1">Configure o sistema de cobrança recorrente</p>
        </div>

        {/* Estatísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Assinaturas Ativas</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{stats.active_subscriptions}</p>
                </div>
                <Shield className="w-10 h-10 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Inadimplentes</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.overdue_subscriptions}</p>
                </div>
                <Bell className="w-10 h-10 text-yellow-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Suspensas</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">{stats.suspended_subscriptions}</p>
                </div>
                <Shield className="w-10 h-10 text-red-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Receita Mensal</p>
                  <p className="text-2xl font-bold text-cyan-600 mt-1">
                    R$ {stats.estimated_monthly_revenue?.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-10 h-10 text-cyan-500" />
              </div>
            </div>
          </div>
        )}

        {/* Configurações */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <h2 className="text-xl font-outfit font-semibold text-slate-900">Configurações</h2>
            <div className="flex gap-2">
              <Button
                onClick={handleTestConnection}
                variant="outline"
                disabled={testing}
              >
                {testing ? <Loader className="animate-spin w-4 h-4 mr-2" /> : null}
                Testar Conexão PagBank
              </Button>
              <Button
                onClick={handleSave}
                className="bg-cyan-500 hover:bg-cyan-600"
                disabled={saving}
              >
                {saving ? <Loader className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar
              </Button>
            </div>
          </div>

          {/* Valor da Mensalidade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Valor da Mensalidade (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={settings?.monthly_fee || ''}
                onChange={(e) => setSettings({...settings, monthly_fee: parseFloat(e.target.value)})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
              />
              <p className="text-xs text-slate-500 mt-1">Valor cobrado mensalmente dos usuários</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Período de Carência (dias)
              </label>
              <input
                type="number"
                value={settings?.grace_period_days || ''}
                onChange={(e) => setSettings({...settings, grace_period_days: parseInt(e.target.value)})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
              />
              <p className="text-xs text-slate-500 mt-1">Dias de tolerância após vencimento</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Meses até Suspensão
              </label>
              <input
                type="number"
                value={settings?.suspend_after_months || ''}
                onChange={(e) => setSettings({...settings, suspend_after_months: parseInt(e.target.value)})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
              />
              <p className="text-xs text-slate-500 mt-1">Meses de inadimplência até suspender conta</p>
            </div>
          </div>

          {/* Credenciais PagBank */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-lg font-outfit font-semibold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-cyan-500" />
              Credenciais PagBank API (Unificado)
            </h3>
            <p className="text-sm text-slate-600">
              Estas credenciais são usadas para <strong>ambos os tipos de pagamento</strong>: 
              checkout (taxa/vendas) e assinaturas recorrentes (mensalidade).
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-900 font-semibold mb-2">
                📝 Configuração em 3 Passos:
              </p>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li><strong>Passo 1:</strong> Informe o Email da conta PagBank</li>
                <li><strong>Passo 2:</strong> Cole o Token Bearer e clique em "Salvar"</li>
                <li><strong>Passo 3:</strong> Clique em "Gerar Chave Pública" para criar a chave de criptografia</li>
              </ol>
              <p className="text-xs text-blue-700 mt-3">
                💡 <strong>Nota:</strong> Email + Token são usados para pagamentos únicos (checkout). Token + Chave Pública são usados para assinaturas recorrentes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email da Conta PagBank
                </label>
                <input
                  type="email"
                  value={settings?.pagbank_email || ''}
                  onChange={(e) => setSettings({...settings, pagbank_email: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  placeholder="seu@email.com"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Email cadastrado na conta PagBank
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ambiente PagBank
                </label>
                <select
                  value={settings?.pagbank_environment || 'sandbox'}
                  onChange={(e) => setSettings({...settings, pagbank_environment: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="sandbox">Sandbox (Teste)</option>
                  <option value="production">Produção</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">Use Sandbox para testes</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Token Bearer (Obrigatório)
              </label>
              <input
                type="password"
                value={settings?.pagbank_token || ''}
                onChange={(e) => setSettings({...settings, pagbank_token: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
                placeholder="Cole aqui o Token Bearer"
              />
              <p className="text-xs text-slate-500 mt-1">
                Token de autenticação para fazer requisições à API do PagBank
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  Chave Pública (Gerada automaticamente)
                </label>
                <Button
                  size="sm"
                  onClick={handleGeneratePublicKey}
                  disabled={generatingKey || !settings?.pagbank_token}
                  className="bg-green-500 hover:bg-green-600"
                >
                  {generatingKey ? (
                    <>
                      <Loader className="animate-spin w-4 h-4 mr-2" />
                      Gerando...
                    </>
                  ) : (
                    'Gerar Chave Pública'
                  )}
                </Button>
              </div>
              <input
                type="text"
                value={settings?.pagbank_public_key || 'Clique em "Gerar Chave Pública"'}
                readOnly
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 font-mono text-xs"
              />
              <p className="text-xs text-slate-500 mt-1">
                Chave pública gerada via API para criptografar cartões no frontend
              </p>
            </div>
          </div>

          {/* Notificações */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-lg font-outfit font-semibold text-slate-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-cyan-500" />
              Notificações por Email
            </h3>

            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings?.send_payment_failed_email || false}
                  onChange={(e) => setSettings({...settings, send_payment_failed_email: e.target.checked})}
                  className="w-5 h-5 text-cyan-600 rounded"
                />
                <span className="text-slate-700">Enviar email quando pagamento falhar</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings?.send_suspension_email || false}
                  onChange={(e) => setSettings({...settings, send_suspension_email: e.target.checked})}
                  className="w-5 h-5 text-cyan-600 rounded"
                />
                <span className="text-slate-700">Enviar email ao suspender conta</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings?.send_reactivation_email || false}
                  onChange={(e) => setSettings({...settings, send_reactivation_email: e.target.checked})}
                  className="w-5 h-5 text-cyan-600 rounded"
                />
                <span className="text-slate-700">Enviar email ao reativar assinatura</span>
              </label>
            </div>
          </div>
        </div>

        {/* Gerenciamento de Planos */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-outfit font-semibold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-cyan-500" />
                Planos de Assinatura
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Gerencie os planos de cobrança recorrente no PagBank
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSyncPlans}
                variant="outline"
                disabled={syncingPlans || !settings?.pagbank_token}
                title="Sincronizar planos do PagBank com o banco local"
              >
                {syncingPlans ? (
                  <Loader className="animate-spin w-4 h-4 mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Sincronizar
              </Button>
              <Button
                onClick={() => setShowPlanForm(!showPlanForm)}
                className="bg-cyan-500 hover:bg-cyan-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Plano
              </Button>
            </div>
          </div>

          {/* Formulário de Criação de Plano */}
          {showPlanForm && (
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 space-y-4">
              <h3 className="font-semibold text-slate-900 mb-4">Criar Novo Plano no PagBank</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nome do Plano
                  </label>
                  <input
                    type="text"
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                    placeholder="Ex: Mensalidade UniOzoxx"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Valor Mensal (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPlan.amount}
                    onChange={(e) => setNewPlan({...newPlan, amount: parseFloat(e.target.value)})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                    placeholder="49.90"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Descrição
                </label>
                <textarea
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({...newPlan, description: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  rows="2"
                  placeholder="Descrição do plano"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>📋 Resumo:</strong> Será criado um plano de <strong>R$ {newPlan.amount?.toFixed(2)}</strong> com cobrança <strong>MENSAL</strong> automática no ambiente <strong>{settings?.pagbank_environment === 'sandbox' ? 'SANDBOX (Teste)' : 'PRODUÇÃO'}</strong>
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowPlanForm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreatePlan}
                  disabled={creatingPlan}
                  className="bg-green-500 hover:bg-green-600"
                >
                  {creatingPlan ? (
                    <>
                      <Loader className="animate-spin w-4 h-4 mr-2" />
                      Criando no PagBank...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Plano
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Planos do PagBank (API) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-slate-900 flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-blue-500" />
                Planos no PagBank ({pagbankPlans.length})
              </h4>
              {loadingPagbankPlans && <Loader className="animate-spin w-4 h-4 text-cyan-500" />}
            </div>
            
            {pagbankPlans.length > 0 ? (
              <div className="space-y-2">
                {pagbankPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between p-4 border border-blue-200 bg-blue-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-blue-500" />
                        <div>
                          <h4 className="font-semibold text-slate-900">{plan.name}</h4>
                          <p className="text-sm text-slate-600">{plan.description}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm flex-wrap">
                        <span className="text-slate-600">
                          <strong className="text-lg text-blue-600">
                            R$ {(plan.amount?.value / 100)?.toFixed(2)}
                          </strong>/{plan.interval?.unit === 'MONTH' ? 'mês' : plan.interval?.unit}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          plan.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {plan.status === 'ACTIVE' ? 'Ativo' : plan.status}
                        </span>
                        <span className="text-xs text-slate-500 font-mono bg-white px-2 py-1 rounded">
                          ID: {plan.id}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                {settings?.pagbank_token ? (
                  loadingPagbankPlans ? (
                    <p>Carregando planos...</p>
                  ) : (
                    <>
                      <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p>Nenhum plano encontrado no PagBank</p>
                      <p className="text-sm mt-1">Crie um plano acima para começar</p>
                    </>
                  )
                ) : (
                  <>
                    <CreditCard className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p>Configure o Token Bearer para ver os planos</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <hr className="border-slate-200" />

          {/* Lista de Planos Locais (Sincronizados) */}
          <div className="space-y-3">
            <h4 className="font-medium text-slate-900">Planos Sincronizados ({plans.length})</h4>
            
            {plans.length > 0 ? (
              plans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-cyan-300 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-cyan-500" />
                      <div>
                        <h4 className="font-semibold text-slate-900">{plan.name}</h4>
                        <p className="text-sm text-slate-600">{plan.description}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm flex-wrap">
                      <span className="text-slate-600">
                        <strong className="text-lg text-cyan-600">R$ {plan.amount?.toFixed(2)}</strong>/mês
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        plan.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {plan.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                      {plan.pagbank_plan_id && (
                        <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded">
                          PagBank: {plan.pagbank_plan_id}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {/* Aqui você pode adicionar botões de ação futuramente */}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-600">
                <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="font-medium">Nenhum plano sincronizado</p>
                <p className="text-sm mt-1">Crie um plano no PagBank e clique em "Sincronizar"</p>
              </div>
            )}
          </div>

          {plans.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-900">
                <strong>✅ Pronto para uso:</strong> Você tem <strong>{plans.filter(p => p.is_active).length} plano(s) ativo(s)</strong> disponíveis para assinaturas. O plano ativo mais recente será usado automaticamente no onboarding.
              </p>
            </div>
          )}
        </div>

        {/* Lista de Assinaturas */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-outfit font-semibold text-slate-900">
              Todas as Assinaturas ({subscriptions.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Usuário</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Próxima Cobrança</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Meses Atrasado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{sub.user_name}</p>
                        <p className="text-sm text-slate-500">{sub.user_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        sub.status === 'active' ? 'bg-green-100 text-green-700' :
                        sub.status === 'overdue' ? 'bg-yellow-100 text-yellow-700' :
                        sub.status === 'suspended' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {sub.status === 'active' ? 'Ativa' :
                         sub.status === 'overdue' ? 'Atrasada' :
                         sub.status === 'suspended' ? 'Suspensa' :
                         sub.status === 'pending' ? 'Pendente' : sub.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-900 font-medium">
                      R$ {sub.monthly_amount?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {sub.next_billing_date ? new Date(sub.next_billing_date).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {sub.overdue_months > 0 ? (
                        <span className="text-red-600 font-medium">{sub.overdue_months} meses</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {subscriptions.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-slate-600">Nenhuma assinatura cadastrada ainda</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminSubscriptions;
