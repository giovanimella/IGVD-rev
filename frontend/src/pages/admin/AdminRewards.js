import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { Award, Plus, Edit, Trash2, Upload, Package, Truck, CheckCircle, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';

const AdminRewards = () => {
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    required_points: 0,
    required_level: '',
    active: true
  });

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rewardsRes, redemptionsRes] = await Promise.all([
        axios.get(`${API_URL}/api/rewards/`),
        axios.get(`${API_URL}/api/rewards/redemptions`)
      ]);
      setRewards(rewardsRes.data);
      setRedemptions(redemptionsRes.data);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReward = async () => {
    try {
      await axios.post(`${API_URL}/api/rewards/`, formData);
      toast.success('Recompensa criada com sucesso');
      setShowCreateDialog(false);
      setFormData({ title: '', description: '', required_points: 0, required_level: '', active: true });
      fetchData();
    } catch (error) {
      toast.error('Erro ao criar recompensa');
    }
  };

  const handleDeleteReward = async (rewardId) => {
    if (!window.confirm('Tem certeza que deseja deletar esta recompensa?')) return;

    try {
      await axios.delete(`${API_URL}/api/rewards/${rewardId}`);
      toast.success('Recompensa deletada com sucesso');
      fetchData();
    } catch (error) {
      toast.error('Erro ao deletar recompensa');
    }
  };

  const handleApproveRedemption = async (redemptionId) => {
    try {
      await axios.put(`${API_URL}/api/rewards/redemptions/${redemptionId}/approve`);
      toast.success('Resgate aprovado');
      fetchData();
    } catch (error) {
      toast.error('Erro ao aprovar resgate');
    }
  };

  const handleRejectRedemption = async (redemptionId) => {
    try {
      await axios.put(`${API_URL}/api/rewards/redemptions/${redemptionId}/reject`);
      toast.success('Resgate rejeitado');
      fetchData();
    } catch (error) {
      toast.error('Erro ao rejeitar resgate');
    }
  };

  const handleMarkDelivered = async (redemptionId) => {
    try {
      await axios.put(`${API_URL}/api/rewards/redemptions/${redemptionId}/deliver`);
      toast.success('Recompensa marcada como entregue');
      fetchData();
    } catch (error) {
      toast.error('Erro ao marcar como entregue');
    }
  };

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
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Award className="w-8 h-8 text-amber-500" />
              Gerenciar Recompensas
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Configure as recompensas e aprove resgates</p>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-cyan-500 hover:bg-cyan-600" data-testid="create-reward-button">
                <Plus className="w-4 h-4 mr-2" />
                Nova Recompensa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Recompensa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Ex: Certificado Bronze"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Descreva a recompensa..."
                  />
                </div>
                <div>
                  <Label htmlFor="points">Pontos Necessários</Label>
                  <Input
                    id="points"
                    type="number"
                    value={formData.required_points}
                    onChange={(e) => setFormData({...formData, required_points: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="level">Nível Necessário (opcional)</Label>
                  <Input
                    id="level"
                    value={formData.required_level}
                    onChange={(e) => setFormData({...formData, required_level: e.target.value})}
                    placeholder="Ex: Bronze"
                  />
                </div>
                <Button onClick={handleCreateReward} className="w-full" data-testid="submit-reward-button">
                  Criar Recompensa
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div>
          <h2 className="text-xl font-outfit font-semibold text-slate-900 dark:text-white mb-4">Recompensas Cadastradas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rewards.map((reward) => (
              <div key={reward.id} className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-100 dark:border-white/5 p-6" data-testid={`reward-item-${reward.id}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <Award className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <button
                    onClick={() => handleDeleteReward(reward.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="text-lg font-outfit font-semibold text-slate-900 dark:text-white mb-2">{reward.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{reward.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Pontos: <strong className="text-slate-900 dark:text-white">{reward.required_points}</strong></span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    reward.active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                  }`}>
                    {reward.active ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-outfit font-semibold text-slate-900 mb-4">Solicitações de Resgate</h2>
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            {redemptions.length === 0 ? (
              <div className="p-12 text-center">
                <Award className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">Nenhuma solicitação de resgate</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {redemptions.map((redemption) => (
                  <div key={redemption.id} className="p-6" data-testid={`redemption-item-${redemption.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                          <span className="text-cyan-600 font-semibold">
                            {redemption.user?.full_name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">{redemption.user?.full_name}</h4>
                          <p className="text-sm text-slate-600">{redemption.reward?.title}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Solicitado em {new Date(redemption.requested_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {redemption.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApproveRedemption(redemption.id)}
                              className="bg-green-500 hover:bg-green-600"
                            >
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectRedemption(redemption.id)}
                            >
                              Rejeitar
                            </Button>
                          </>
                        )}
                        {redemption.status === 'approved' && (
                          <Button
                            size="sm"
                            onClick={() => handleMarkDelivered(redemption.id)}
                            className="bg-blue-500 hover:bg-blue-600"
                          >
                            Marcar como Entregue
                          </Button>
                        )}
                        {redemption.status === 'delivered' && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            Entregue
                          </span>
                        )}
                        {redemption.status === 'rejected' && (
                          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                            Rejeitado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminRewards;