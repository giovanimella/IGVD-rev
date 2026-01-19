import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import {
  ShoppingCart,
  DollarSign,
  Users,
  Factory,
  TrendingUp,
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Save,
  Percent,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';

const AdminSales = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [sales, setSales] = useState([]);
  const [licenseeStats, setLicenseeStats] = useState([]);
  const [commissionTypes, setCommissionTypes] = useState([]);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [editingCommission, setEditingCommission] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [commissionForm, setCommissionForm] = useState({
    description: '',
    percentage: '',
    active: true
  });

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, salesRes, commissionRes] = await Promise.all([
        axios.get(`${API_URL}/api/sales/report/summary`),
        axios.get(`${API_URL}/api/sales/report/all`),
        axios.get(`${API_URL}/api/sales/commission-types`)
      ]);
      
      setSummary(summaryRes.data);
      setSales(salesRes.data.sales);
      setLicenseeStats(salesRes.data.licensee_stats);
      setCommissionTypes(commissionRes.data);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const openNewCommissionModal = () => {
    setEditingCommission(null);
    setCommissionForm({
      description: '',
      percentage: '',
      active: true
    });
    setShowCommissionModal(true);
  };

  const openEditCommissionModal = (commission) => {
    setEditingCommission(commission);
    setCommissionForm({
      description: commission.description,
      percentage: commission.percentage,
      active: commission.active
    });
    setShowCommissionModal(true);
  };

  const handleCommissionSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const payload = {
        ...commissionForm,
        percentage: parseFloat(commissionForm.percentage)
      };
      
      if (editingCommission) {
        await axios.put(`${API_URL}/api/sales/commission-types/${editingCommission.id}`, payload);
        toast.success('Comissão atualizada!');
      } else {
        await axios.post(`${API_URL}/api/sales/commission-types`, payload);
        toast.success('Comissão criada!');
      }
      
      setShowCommissionModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar comissão');
    }
  };

  const handleDeleteCommission = async (commissionId) => {
    if (!window.confirm('Tem certeza que deseja excluir este tipo de comissão?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/sales/commission-types/${commissionId}`);
      toast.success('Comissão excluída!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao excluir comissão');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const filteredSales = statusFilter === 'all' 
    ? sales 
    : sales.filter(s => s.payment_status === statusFilter);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/system')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-outfit font-bold text-slate-900">
                Relatório de Vendas
              </h1>
              <p className="text-slate-600 mt-1">
                Gerencie vendas e comissões
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total de Vendas</p>
                <p className="text-xl font-bold text-slate-900">{summary?.total_sales || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Vendas Pagas</p>
                <p className="text-xl font-bold text-green-600">{summary?.paid_sales || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Aguardando Pgto</p>
                <p className="text-xl font-bold text-amber-600">{summary?.pending_sales || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Valor Total</p>
                <p className="text-xl font-bold text-purple-600">
                  {formatCurrency(summary?.total_value || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Origem dos Aparelhos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-cyan-500" />
              <h3 className="font-semibold text-slate-900">Estoque do Líder</h3>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">
                {summary?.by_device_source?.leader_stock?.count || 0} vendas
              </span>
              <span className="text-lg font-bold text-slate-900">
                {formatCurrency(summary?.by_device_source?.leader_stock?.value || 0)}
              </span>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Factory className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-slate-900">Enviado da Fábrica</h3>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">
                {summary?.by_device_source?.factory?.count || 0} vendas
              </span>
              <span className="text-lg font-bold text-slate-900">
                {formatCurrency(summary?.by_device_source?.factory?.value || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="sales" className="w-full">
          <TabsList>
            <TabsTrigger value="sales">Vendas</TabsTrigger>
            <TabsTrigger value="licensees">Por Licenciado</TabsTrigger>
            <TabsTrigger value="commissions">Comissões</TabsTrigger>
          </TabsList>

          {/* Tab: Vendas */}
          <TabsContent value="sales" className="mt-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Todas as Vendas</h3>
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="all">Todos</option>
                    <option value="paid">Pagos</option>
                    <option value="pending">Pendentes</option>
                  </select>
                </div>
              </div>
              
              {filteredSales.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  Nenhuma venda encontrada
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">#</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Licenciado</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Cliente</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Aparelho</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Valor</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-slate-50">
                          <td className="px-6 py-3 text-sm text-slate-900">
                            {sale.sale_number}
                          </td>
                          <td className="px-6 py-3">
                            <p className="text-sm font-medium text-slate-900">{sale.licensee_name}</p>
                            <p className="text-xs text-slate-500">Líder: {sale.leader_name || '-'}</p>
                          </td>
                          <td className="px-6 py-3">
                            <p className="text-sm text-slate-900">{sale.customer_name}</p>
                            <p className="text-xs text-slate-500">{sale.customer_cpf}</p>
                          </td>
                          <td className="px-6 py-3">
                            <p className="text-sm text-slate-900">{sale.device_serial}</p>
                            <p className="text-xs text-slate-500">
                              {sale.device_source === 'leader_stock' ? 'Estoque Líder' : 'Fábrica'}
                            </p>
                          </td>
                          <td className="px-6 py-3 text-sm font-medium text-slate-900">
                            {formatCurrency(sale.sale_value)}
                          </td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              sale.payment_status === 'paid'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {sale.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab: Por Licenciado */}
          <TabsContent value="licensees" className="mt-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900">Vendas por Licenciado</h3>
              </div>
              
              {licenseeStats.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  Nenhuma venda encontrada
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Licenciado</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Líder</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Vendas</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Pagas</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {licenseeStats.map((stat, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-6 py-3">
                            <p className="text-sm font-medium text-slate-900">{stat.licensee_name}</p>
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-600">
                            {stat.leader_name || '-'}
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-900">
                            {stat.total_sales}
                          </td>
                          <td className="px-6 py-3">
                            <span className={`text-sm font-medium ${
                              stat.paid_sales >= 10 ? 'text-green-600' : 'text-slate-900'
                            }`}>
                              {stat.paid_sales}/10
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sm font-medium text-slate-900">
                            {formatCurrency(stat.total_value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab: Comissões */}
          <TabsContent value="commissions" className="mt-4 space-y-4">
            {/* Tipos de Comissão */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Tipos de Comissão</h3>
                <Button
                  onClick={openNewCommissionModal}
                  size="sm"
                  data-testid="new-commission-btn"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Novo Tipo
                </Button>
              </div>
              
              {commissionTypes.length === 0 ? (
                <div className="p-8 text-center">
                  <Percent className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 mb-4">Nenhum tipo de comissão cadastrado</p>
                  <Button onClick={openNewCommissionModal} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Criar Primeiro Tipo
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {commissionTypes.map((ct) => (
                    <div key={ct.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          ct.active ? 'bg-green-100' : 'bg-slate-100'
                        }`}>
                          <Percent className={`w-5 h-5 ${
                            ct.active ? 'text-green-600' : 'text-slate-400'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{ct.description}</p>
                          <p className="text-sm text-slate-500">
                            {ct.percentage}% sobre vendas
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          ct.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {ct.active ? 'Ativo' : 'Inativo'}
                        </span>
                        <button
                          onClick={() => openEditCommissionModal(ct)}
                          className="p-2 hover:bg-slate-100 rounded-lg"
                        >
                          <Edit className="w-4 h-4 text-slate-500" />
                        </button>
                        <button
                          onClick={() => handleDeleteCommission(ct.id)}
                          className="p-2 hover:bg-red-100 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cálculo de Comissões */}
            {summary?.commissions?.length > 0 && (
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-6 text-white">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Comissões Calculadas
                </h3>
                <p className="text-green-100 text-sm mb-4">
                  Baseado no valor total de vendas pagas: {formatCurrency(summary.total_value)}
                </p>
                <div className="space-y-3">
                  {summary.commissions.map((c) => (
                    <div key={c.id} className="flex justify-between items-center bg-white/20 rounded-lg p-3">
                      <div>
                        <p className="font-medium">{c.description}</p>
                        <p className="text-sm text-green-100">{c.percentage}%</p>
                      </div>
                      <p className="text-xl font-bold">
                        {formatCurrency(c.calculated_value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Comissão */}
      <Dialog open={showCommissionModal} onOpenChange={setShowCommissionModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editingCommission ? 'Editar Tipo de Comissão' : 'Novo Tipo de Comissão'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCommissionSubmit} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Descrição *
              </label>
              <input
                type="text"
                value={commissionForm.description}
                onChange={(e) => setCommissionForm({...commissionForm, description: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                placeholder="Ex: Comissão do Licenciado"
                required
                data-testid="commission-description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Porcentagem (%) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={commissionForm.percentage}
                onChange={(e) => setCommissionForm({...commissionForm, percentage: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                placeholder="Ex: 10"
                required
                data-testid="commission-percentage"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="commission-active"
                checked={commissionForm.active}
                onChange={(e) => setCommissionForm({...commissionForm, active: e.target.checked})}
                className="rounded border-slate-300 text-cyan-500 focus:ring-cyan-500"
              />
              <label htmlFor="commission-active" className="text-sm text-slate-700">
                Comissão ativa
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCommissionModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-cyan-500 hover:bg-cyan-600">
                <Save className="w-4 h-4 mr-2" />
                {editingCommission ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AdminSales;
