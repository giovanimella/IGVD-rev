import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import {
  ShoppingCart,
  Plus,
  Edit,
  Trash2,
  User,
  Phone,
  Mail,
  CreditCard,
  Package,
  Factory,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Copy,
  ExternalLink,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const Sales = () => {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_cpf: '',
    device_serial: '',
    device_source: 'leader_stock',
    sale_value: '',
    sale_number: 1
  });

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/sales/my-sales`);
      setSalesData(response.data);
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
      toast.error('Erro ao carregar vendas');
    } finally {
      setLoading(false);
    }
  };

  const getNextAvailableSaleNumber = () => {
    if (!salesData?.sales) return 1;
    const usedNumbers = salesData.sales.map(s => s.sale_number);
    for (let i = 1; i <= 10; i++) {
      if (!usedNumbers.includes(i)) return i;
    }
    return 1;
  };

  const openNewSaleModal = () => {
    setEditingSale(null);
    const nextNumber = getNextAvailableSaleNumber();
    setFormData({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      customer_cpf: '',
      device_serial: '',
      device_source: 'leader_stock',
      sale_value: '',
      sale_number: nextNumber
    });
    setShowModal(true);
  };

  const openEditSaleModal = (sale) => {
    setEditingSale(sale);
    setFormData({
      customer_name: sale.customer_name,
      customer_phone: sale.customer_phone,
      customer_email: sale.customer_email,
      customer_cpf: sale.customer_cpf,
      device_serial: sale.device_serial,
      device_source: sale.device_source,
      sale_value: sale.sale_value,
      sale_number: sale.sale_number
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      if (editingSale) {
        await axios.put(`${API_URL}/api/sales/${editingSale.id}`, {
          ...formData,
          sale_value: parseFloat(formData.sale_value)
        });
        toast.success('Venda atualizada!');
      } else {
        await axios.post(`${API_URL}/api/sales/register`, {
          ...formData,
          sale_value: parseFloat(formData.sale_value)
        });
        toast.success('Venda registrada!');
      }
      
      setShowModal(false);
      fetchSales();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar venda');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (saleId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta venda?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/sales/${saleId}`);
      toast.success('Venda excluída!');
      fetchSales();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao excluir venda');
    }
  };

  const handleSimulatePayment = async (saleId) => {
    try {
      const response = await axios.post(`${API_URL}/api/sales/${saleId}/simulate-payment`);
      
      if (response.data.advanced_to_next_stage) {
        toast.success('Parabéns! Você completou as 10 vendas!', {
          duration: 5000
        });
        // Redirecionar após um delay
        setTimeout(() => window.location.href = '/onboarding/documents-pj', 2000);
      } else {
        toast.success(`Pagamento confirmado! ${response.data.remaining_sales} vendas restantes.`);
      }
      
      fetchSales();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao simular pagamento');
    }
  };

  const copyPaymentLink = (link) => {
    navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatCPF = (value) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
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

  const completedSales = salesData?.completed_sales || 0;
  const progressPercentage = (completedSales / 10) * 100;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-outfit font-bold text-slate-900 dark:text-white">
              Vendas em Campo
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Registre suas 10 vendas para avançar no onboarding
            </p>
          </div>
          <Button
            onClick={openNewSaleModal}
            className="bg-cyan-500 hover:bg-cyan-600"
            disabled={salesData?.total_sales >= 10}
            data-testid="new-sale-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Venda
          </Button>
        </div>

        {/* Progress Card */}
        <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-cyan-100 text-sm">Progresso das Vendas</p>
              <p className="text-3xl font-bold">{completedSales}/10 concluídas</p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-8 h-8" />
            </div>
          </div>
          <div className="w-full bg-white/30 rounded-full h-3">
            <div 
              className="bg-white rounded-full h-3 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="text-sm text-cyan-100 mt-2">
            {salesData?.remaining_sales || 10} vendas restantes para completar esta etapa
          </p>
        </div>

        {/* Sales Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((saleNum) => {
            const sale = salesData?.sales?.find(s => s.sale_number === saleNum);
            const isPaid = sale?.payment_status === 'paid';
            const isPending = sale?.payment_status === 'pending';
            
            return (
              <div
                key={saleNum}
                className={`rounded-xl border-2 p-4 transition-all ${
                  isPaid 
                    ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700' 
                    : isPending 
                      ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 cursor-pointer hover:shadow-md' 
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 border-dashed cursor-pointer hover:border-cyan-300 dark:hover:border-cyan-500/50 hover:bg-cyan-50 dark:hover:bg-cyan-900/20'
                }`}
                onClick={() => {
                  if (!sale) openNewSaleModal();
                  else if (!isPaid) openEditSaleModal(sale);
                }}
                data-testid={`sale-card-${saleNum}`}
              >
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
                    isPaid ? 'bg-green-500 text-white' :
                    isPending ? 'bg-amber-500 text-white' :
                    'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                  }`}>
                    {isPaid ? <CheckCircle className="w-6 h-6" /> :
                     isPending ? <Clock className="w-6 h-6" /> :
                     <span className="font-bold">{saleNum}</span>}
                  </div>
                  <p className={`text-sm font-medium ${
                    isPaid ? 'text-green-700 dark:text-green-400' :
                    isPending ? 'text-amber-700 dark:text-amber-400' :
                    'text-slate-500 dark:text-slate-400'
                  }`}>
                    Venda {saleNum}
                  </p>
                  {sale && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 truncate">
                      {sale.customer_name}
                    </p>
                  )}
                  {isPending && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Aguardando pgto
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sales List */}
        {salesData?.sales?.length > 0 && (
          <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Detalhes das Vendas</h2>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-white/5">
              {salesData.sales.map((sale) => (
                <div key={sale.id} className="p-4 hover:bg-slate-50 dark:hover:bg-white/5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            sale.payment_status === 'paid' 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                          }`}>
                            Venda #{sale.sale_number}
                          </span>
                        </div>
                        <p className="font-medium text-slate-900 dark:text-white">{sale.customer_name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{sale.customer_cpf}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {formatPhone(sale.customer_phone)}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {sale.customer_email}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {sale.device_serial}
                        </p>
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          {sale.device_source === 'leader_stock' ? (
                            <><Users className="w-3 h-3" /> Estoque do Líder</>
                          ) : (
                            <><Factory className="w-3 h-3" /> Fábrica</>
                          )}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900">
                          {formatCurrency(sale.sale_value)}
                        </p>
                        <p className={`text-sm ${
                          sale.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'
                        }`}>
                          {sale.payment_status === 'paid' ? 'Pago' : 'Aguardando'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      {sale.payment_status === 'pending' && (
                        <>
                          <button
                            onClick={() => copyPaymentLink(sale.payment_link)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Copiar link de pagamento"
                          >
                            <Copy className="w-4 h-4 text-slate-500" />
                          </button>
                          <button
                            onClick={() => handleSimulatePayment(sale.id)}
                            className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                            title="Simular pagamento"
                          >
                            <CreditCard className="w-4 h-4 text-green-600" />
                          </button>
                          <button
                            onClick={() => openEditSaleModal(sale)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4 text-slate-500" />
                          </button>
                          <button
                            onClick={() => handleDelete(sale.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </>
                      )}
                      {sale.payment_status === 'paid' && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Venda */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingSale ? `Editar Venda #${editingSale.sale_number}` : 'Nova Venda'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {!editingSale && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Número da Venda *
                </label>
                <Select
                  value={String(formData.sale_number)}
                  onValueChange={(v) => setFormData({...formData, sale_number: parseInt(v)})}
                >
                  <SelectTrigger data-testid="sale-number-select">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => i + 1)
                      .filter(n => !salesData?.sales?.find(s => s.sale_number === n))
                      .map((n) => (
                        <SelectItem key={n} value={String(n)}>Venda {n}</SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nome Completo do Cliente *
                </label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  required
                  data-testid="input-customer-name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Telefone *
                </label>
                <input
                  type="tel"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  placeholder="(00) 00000-0000"
                  required
                  data-testid="input-customer-phone"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  E-mail *
                </label>
                <input
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData({...formData, customer_email: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  required
                  data-testid="input-customer-email"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  CPF *
                </label>
                <input
                  type="text"
                  value={formData.customer_cpf}
                  onChange={(e) => setFormData({...formData, customer_cpf: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  placeholder="000.000.000-00"
                  required
                  data-testid="input-customer-cpf"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nº de Série do Aparelho *
                </label>
                <input
                  type="text"
                  value={formData.device_serial}
                  onChange={(e) => setFormData({...formData, device_serial: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  required
                  data-testid="input-device-serial"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Origem do Aparelho *
                </label>
                <Select
                  value={formData.device_source}
                  onValueChange={(v) => setFormData({...formData, device_source: v})}
                >
                  <SelectTrigger data-testid="device-source-select">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leader_stock">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Estoque do Líder
                      </div>
                    </SelectItem>
                    <SelectItem value="factory">
                      <div className="flex items-center gap-2">
                        <Factory className="w-4 h-4" />
                        Enviado da Fábrica
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Valor da Venda (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.sale_value}
                  onChange={(e) => setFormData({...formData, sale_value: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  required
                  data-testid="input-sale-value"
                />
              </div>
            </div>

            <div className="bg-amber-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Link de Pagamento</p>
                  <p>Após salvar, um link de pagamento será gerado para você enviar ao cliente. O link será integrado ao gateway de pagamento em breve.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-cyan-500 hover:bg-cyan-600"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  editingSale ? 'Salvar Alterações' : 'Registrar Venda'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Sales;
