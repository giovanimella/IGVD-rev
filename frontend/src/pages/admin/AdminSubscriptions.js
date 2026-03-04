import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { Save, CreditCard, Shield, DollarSign, Calendar, Bell, Loader } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

const AdminSubscriptions = () => {
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, statsRes, subsRes] = await Promise.all([
        axios.get(`${API_URL}/api/subscriptions/settings`),
        axios.get(`${API_URL}/api/subscriptions/stats`),
        axios.get(`${API_URL}/api/subscriptions/all`)
      ]);

      setSettings(settingsRes.data);
      setStats(statsRes.data);
      setSubscriptions(subsRes.data);
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

          {/* Credenciais PagBank */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-lg font-outfit font-semibold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-cyan-500" />
              Credenciais PagBank API de Assinaturas
            </h3>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Token de Acesso
                </label>
                <input
                  type="password"
                  value={settings?.pagbank_subscription_token || ''}
                  onChange={(e) => setSettings({...settings, pagbank_subscription_token: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
                  placeholder="Cole aqui o token da API de Assinaturas"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Token específico para API de Assinaturas (diferente do checkout)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email da Conta (Referência)
                </label>
                <input
                  type="email"
                  value={settings?.pagbank_subscription_email || ''}
                  onChange={(e) => setSettings({...settings, pagbank_subscription_email: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  placeholder="Email da conta PagBank"
                />
              </div>
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
