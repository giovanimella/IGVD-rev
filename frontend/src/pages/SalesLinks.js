import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Link2,
  Plus,
  Copy,
  ExternalLink,
  Trash2,
  CheckCircle,
  Clock,
  DollarSign,
  Loader2,
  Share2,
  QrCode,
  Users,
  TrendingUp
} from 'lucide-react';
import { Button } from '../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SalesLinks = () => {
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [salesProgress, setSalesProgress] = useState({ completed: 0, total: 10 });
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    max_uses: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [linksRes, progressRes] = await Promise.all([
        axios.get(`${API_URL}/api/sales/my-links`),
        axios.get(`${API_URL}/api/sales/my-progress`)
      ]);
      
      setLinks(linksRes.data || []);
      setSalesProgress(progressRes.data || { completed: 0, total: 10 });
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      // Se a API não existir ainda, usar dados vazios
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLink = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.amount) {
      toast.error('Preencha o título e o valor');
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post(`${API_URL}/api/sales/create-link`, {
        title: formData.title,
        description: formData.description,
        amount: parseFloat(formData.amount),
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null
      });

      toast.success('Link de pagamento criado!');
      setShowModal(false);
      setFormData({ title: '', description: '', amount: '', max_uses: '' });
      fetchData();
    } catch (error) {
      console.error('Erro ao criar link:', error);
      toast.error('Erro ao criar link de pagamento');
    } finally {
      setCreating(false);
    }
  };

  const copyLink = (url) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const shareLink = (link) => {
    if (navigator.share) {
      navigator.share({
        title: link.title,
        text: link.description,
        url: link.gateway_link_url || `${window.location.origin}/pay/${link.id}`
      });
    } else {
      copyLink(link.gateway_link_url || `${window.location.origin}/pay/${link.id}`);
    }
  };

  const deleteLink = async (linkId) => {
    if (!window.confirm('Tem certeza que deseja excluir este link?')) return;

    try {
      await axios.delete(`${API_URL}/api/sales/links/${linkId}`);
      toast.success('Link excluído');
      fetchData();
    } catch (error) {
      toast.error('Erro ao excluir link');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
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

  return (
    <Layout>
      <div className="space-y-6" data-testid="sales-links-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">Minhas Vendas</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Gerencie seus links de pagamento e acompanhe suas vendas</p>
          </div>
          <Button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600"
          >
            <Plus className="w-5 h-5" />
            Novo Link
          </Button>
        </div>

        {/* Progress Card */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cyan-100 text-sm">Progresso das 10 Vendas</p>
              <p className="text-4xl font-bold mt-1">{salesProgress.completed} / {salesProgress.total}</p>
              <p className="text-cyan-100 text-sm mt-2">
                {salesProgress.completed >= salesProgress.total 
                  ? '🎉 Parabéns! Você completou suas vendas!' 
                  : `Faltam ${salesProgress.total - salesProgress.completed} vendas`}
              </p>
            </div>
            <div className="w-24 h-24">
              <svg viewBox="0 0 36 36" className="w-full h-full">
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeDasharray={`${(salesProgress.completed / salesProgress.total) * 100}, 100`}
                  strokeLinecap="round"
                />
                <text x="18" y="20.35" className="text-xs font-bold" textAnchor="middle" fill="white">
                  {Math.round((salesProgress.completed / salesProgress.total) * 100)}%
                </text>
              </svg>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-100 dark:border-white/5 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <Link2 className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Links Ativos</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{links.filter(l => l.is_active).length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-100 dark:border-white/5 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Vendas Concluídas</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{salesProgress.completed}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-100 dark:border-white/5 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Total em Vendas</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(links.reduce((acc, l) => acc + (l.amount * l.uses_count), 0))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Links List */}
        <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-100 dark:border-white/5">
          <div className="p-4 border-b border-slate-100 dark:border-white/5">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Links de Pagamento</h2>
          </div>
          
          {links.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Link2 className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Nenhum link criado</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                Crie seu primeiro link de pagamento para começar a vender
              </p>
              <Button onClick={() => setShowModal(true)} className="bg-cyan-500 hover:bg-cyan-600">
                <Plus className="w-4 h-4 mr-2" />
                Criar Link
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {links.map((link) => (
                <div key={link.id} className="p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-900 dark:text-white">{link.title}</h3>
                        {link.is_active ? (
                          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 text-xs rounded-full">
                            Ativo
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 text-xs rounded-full">
                            Inativo
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{link.description}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                          {formatCurrency(link.amount)}
                        </span>
                        <span className="text-sm text-slate-500 flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {link.uses_count} uso{link.uses_count !== 1 ? 's' : ''}
                          {link.max_uses && ` / ${link.max_uses}`}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyLink(link.gateway_link_url || `${window.location.origin}/pay/${link.id}`)}
                        title="Copiar link"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => shareLink(link)}
                        title="Compartilhar"
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(link.gateway_link_url || `${window.location.origin}/pay/${link.id}`, '_blank')}
                        title="Abrir link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteLink(link.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de Criar Link */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1a2236] rounded-xl max-w-md w-full">
              <div className="p-6 border-b border-slate-100 dark:border-white/5">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Novo Link de Pagamento</h2>
              </div>
              
              <form onSubmit={handleCreateLink} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Produto XYZ"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição do produto ou serviço"
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0,00"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Limite de Usos (opcional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_uses}
                    onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                    placeholder="Ilimitado"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModal(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating}
                    className="flex-1 bg-cyan-500 hover:bg-cyan-600"
                  >
                    {creating ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Criar Link
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SalesLinks;
