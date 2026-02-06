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
  Loader2,
  FileText,
  Download,
  Calendar,
  ChevronDown
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

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
  
  // Monthly report state
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  
  const [commissionForm, setCommissionForm] = useState({
    description: '',
    percentage: '',
    active: true
  });

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchMonthlyReport();
  }, [selectedYear, selectedMonth]);

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

  const fetchMonthlyReport = async () => {
    setLoadingMonthly(true);
    try {
      const response = await axios.get(`${API_URL}/api/sales/report/by-month`, {
        params: { year: selectedYear, month: selectedMonth }
      });
      setMonthlyReport(response.data);
    } catch (error) {
      console.error('Erro ao buscar relatório mensal:', error);
    } finally {
      setLoadingMonthly(false);
    }
  };

  const downloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const response = await axios.get(`${API_URL}/api/sales/report/pdf`, {
        params: { year: selectedYear, month: selectedMonth },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio_vendas_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setDownloadingPdf(false);
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
      fetchMonthlyReport();
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
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            </button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-outfit font-bold text-slate-900 dark:text-white">
                Relatório de Vendas
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Gerencie vendas e comissões
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total de Vendas</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{summary?.total_sales || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Vendas Pagas</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{summary?.paid_sales || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Aguardando Pgto</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{summary?.pending_sales || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Valor Total</p>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(summary?.total_value || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="monthly" className="w-full">
          <TabsList className="dark:bg-slate-800">
            <TabsTrigger value="monthly">Relatório Mensal</TabsTrigger>
            <TabsTrigger value="sales">Todas as Vendas</TabsTrigger>
            <TabsTrigger value="licensees">Por Licenciado</TabsTrigger>
            <TabsTrigger value="commissions">Comissões</TabsTrigger>
          </TabsList>

          {/* Tab: Relatório Mensal */}
          <TabsContent value="monthly" className="mt-4 space-y-4">
            {/* Filtros */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Calendar className="w-5 h-5 text-slate-500" />
                  <div className="flex items-center gap-2">
                    <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Mês" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((m) => (
                          <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Ano" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  onClick={downloadPdf}
                  disabled={downloadingPdf || !monthlyReport?.total_sales}
                  className="bg-cyan-500 hover:bg-cyan-600"
                  data-testid="download-pdf-btn"
                >
                  {downloadingPdf ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Exportar PDF
                </Button>
              </div>
            </div>

            {loadingMonthly ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
              </div>
            ) : monthlyReport ? (
              <>
                {/* Resumo do Mês */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-xl p-6 text-white">
                    <h3 className="text-lg font-semibold mb-2">
                      {monthlyReport.month_name} de {monthlyReport.year}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-cyan-100 text-sm">Vendas</p>
                        <p className="text-2xl font-bold">{monthlyReport.total_sales}</p>
                      </div>
                      <div>
                        <p className="text-cyan-100 text-sm">Valor Total</p>
                        <p className="text-2xl font-bold">{formatCurrency(monthlyReport.total_value)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Comissões Calculadas */}
                  {monthlyReport.commissions?.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Percent className="w-5 h-5 text-green-500" />
                        Comissões do Período
                      </h3>
                      <div className="space-y-3">
                        {monthlyReport.commissions.map((c) => (
                          <div key={c.id} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">{c.description}</p>
                              <p className="text-sm text-slate-500">{c.percentage}%</p>
                            </div>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(c.calculated_value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Lista de Vendas do Mês */}
                {monthlyReport.sales?.length > 0 ? (
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        Vendas de {monthlyReport.month_name} ({monthlyReport.sales.length})
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                          <tr>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">#</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Licenciado</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Cliente</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Aparelho</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Valor</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Data</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                          {monthlyReport.sales.map((sale) => (
                            <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                              <td className="px-6 py-3 text-sm text-slate-900 dark:text-white">
                                {sale.sale_number}
                              </td>
                              <td className="px-6 py-3">
                                <p className="text-sm font-medium text-slate-900 dark:text-white">{sale.licensee_name}</p>
                              </td>
                              <td className="px-6 py-3">
                                <p className="text-sm text-slate-900 dark:text-white">{sale.customer_name}</p>
                              </td>
                              <td className="px-6 py-3">
                                <p className="text-sm text-slate-900 dark:text-white">{sale.device_serial}</p>
                                <p className="text-xs text-slate-500">
                                  {sale.device_source === 'leader_stock' ? 'Estoque Líder' : 'Fábrica'}
                                </p>
                              </td>
                              <td className="px-6 py-3 text-sm font-medium text-slate-900 dark:text-white">
                                {formatCurrency(sale.sale_value)}
                              </td>
                              <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-400">
                                {sale.paid_at?.slice(0, 10)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 dark:text-slate-400">Nenhuma venda registrada neste período</p>
                  </div>
                )}
              </>
            ) : null}
          </TabsContent>

          {/* Tab: Todas as Vendas */}
          <TabsContent value="sales" className="mt-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 dark:text-white">Todas as Vendas</h3>
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="all">Todos</option>
                    <option value="paid">Pagos</option>
                    <option value="pending">Pendentes</option>
                  </select>
                </div>
              </div>
              
              {filteredSales.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  Nenhuma venda encontrada
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                      <tr>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">#</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Licenciado</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Cliente</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Aparelho</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Valor</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {filteredSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                          <td className="px-6 py-3 text-sm text-slate-900 dark:text-white">
                            {sale.sale_number}
                          </td>
                          <td className="px-6 py-3">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{sale.licensee_name}</p>
                            <p className="text-xs text-slate-500">Líder: {sale.leader_name || '-'}</p>
                          </td>
                          <td className="px-6 py-3">
                            <p className="text-sm text-slate-900 dark:text-white">{sale.customer_name}</p>
                            <p className="text-xs text-slate-500">{sale.customer_cpf}</p>
                          </td>
                          <td className="px-6 py-3">
                            <p className="text-sm text-slate-900 dark:text-white">{sale.device_serial}</p>
                            <p className="text-xs text-slate-500">
                              {sale.device_source === 'leader_stock' ? 'Estoque Líder' : 'Fábrica'}
                            </p>
                          </td>
                          <td className="px-6 py-3 text-sm font-medium text-slate-900 dark:text-white">
                            {formatCurrency(sale.sale_value)}
                          </td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              sale.payment_status === 'paid'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
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
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-white">Vendas por Licenciado</h3>
              </div>
              
              {licenseeStats.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  Nenhuma venda encontrada
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                      <tr>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Licenciado</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Líder</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Vendas</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Pagas</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {licenseeStats.map((stat, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                          <td className="px-6 py-3">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{stat.licensee_name}</p>
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-400">
                            {stat.leader_name || '-'}
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-900 dark:text-white">
                            {stat.total_sales}
                          </td>
                          <td className="px-6 py-3">
                            <span className={`text-sm font-medium ${
                              stat.paid_sales >= 10 ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-white'
                            }`}>
                              {stat.paid_sales}/10
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sm font-medium text-slate-900 dark:text-white">
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
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 dark:text-white">{t.admin?.commissionTypes || 'Tipos de Comissão'}</h3>
                <Button
                  onClick={openNewCommissionModal}
                  size="sm"
                  data-testid="new-commission-btn"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {t.admin?.newCommission || 'Novo Tipo'}
                </Button>
              </div>
              
              {commissionTypes.length === 0 ? (
                <div className="p-8 text-center">
                  <Percent className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 dark:text-slate-400 mb-4">Nenhum tipo de comissão cadastrado</p>
                  <Button onClick={openNewCommissionModal} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Criar Primeiro Tipo
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {commissionTypes.map((ct) => (
                    <div key={ct.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          ct.active ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-100 dark:bg-slate-700'
                        }`}>
                          <Percent className={`w-5 h-5 ${
                            ct.active ? 'text-green-600 dark:text-green-400' : 'text-slate-400'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{ct.description}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {ct.percentage}% sobre vendas
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          ct.active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}>
                          {ct.active ? (t.admin?.active || 'Ativo') : (t.admin?.inactive || 'Inativo')}
                        </span>
                        <button
                          onClick={() => openEditCommissionModal(ct)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                        >
                          <Edit className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteCommission(ct.id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cálculo de Comissões Geral */}
            {summary?.commissions?.length > 0 && (
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-6 text-white">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Comissões Totais (Todas as Vendas)
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Descrição *
              </label>
              <input
                type="text"
                value={commissionForm.description}
                onChange={(e) => setCommissionForm({...commissionForm, description: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="Ex: Comissão do Licenciado"
                required
                data-testid="commission-description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Porcentagem (%) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={commissionForm.percentage}
                onChange={(e) => setCommissionForm({...commissionForm, percentage: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
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
              <label htmlFor="commission-active" className="text-sm text-slate-700 dark:text-slate-300">
                Comissão ativa
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCommissionModal(false)}>
                {t.common?.cancel || 'Cancelar'}
              </Button>
              <Button type="submit" className="bg-cyan-500 hover:bg-cyan-600">
                <Save className="w-4 h-4 mr-2" />
                {editingCommission ? (t.common?.save || 'Salvar') : (t.common?.create || 'Criar')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AdminSales;
