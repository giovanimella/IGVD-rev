import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { Award, Gift, Star, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const Rewards = () => {
  const { user } = useAuth();
  const [rewards, setRewards] = useState([]);
  const [myRedemptions, setMyRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rewardsRes, redemptionsRes] = await Promise.all([
        axios.get(`${API_URL}/api/rewards/`),
        axios.get(`${API_URL}/api/rewards/my-redemptions`)
      ]);
      setRewards(rewardsRes.data);
      setMyRedemptions(redemptionsRes.data);
    } catch (error) {
      console.error('Erro ao buscar recompensas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (rewardId) => {
    try {
      await axios.post(`${API_URL}/api/rewards/redeem/${rewardId}`);
      toast.success('Resgate solicitado com sucesso!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao solicitar resgate');
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
        <div>
          <h1 className="text-3xl font-outfit font-bold text-slate-900 flex items-center gap-3">
            <Gift className="w-8 h-8 text-amber-500" />
            Recompensas
          </h1>
          <p className="text-slate-600 mt-2">Troque seus pontos por recompensas incríveis</p>
          <div className="mt-4 inline-flex items-center gap-3 bg-amber-50 px-6 py-3 rounded-lg border border-amber-200">
            <Star className="w-6 h-6 text-amber-600" />
            <div>
              <p className="text-sm text-amber-700 font-medium">Seus Pontos</p>
              <p className="text-2xl font-outfit font-bold text-amber-900">{user?.points || 0}</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-outfit font-semibold text-slate-900 mb-4">Recompensas Disponíveis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rewards.map((reward) => (
              <div key={reward.id} className="bg-white rounded-xl border border-slate-100 p-6 hover:shadow-lg transition-all" data-testid={`reward-card-${reward.id}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Award className="w-6 h-6 text-amber-600" />
                  </div>
                  <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">
                    {reward.required_points} pts
                  </span>
                </div>
                <h3 className="text-lg font-outfit font-semibold text-slate-900 mb-2">{reward.title}</h3>
                <p className="text-slate-600 text-sm mb-4">{reward.description}</p>
                <Button
                  onClick={() => handleRedeem(reward.id)}
                  disabled={user?.points < reward.required_points}
                  data-testid={`redeem-button-${reward.id}`}
                  className="w-full"
                >
                  {user?.points < reward.required_points ? 'Pontos Insuficientes' : 'Resgatar'}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {myRedemptions.length > 0 && (
          <div>
            <h2 className="text-xl font-outfit font-semibold text-slate-900 mb-4">Meus Resgates</h2>
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <div className="divide-y divide-slate-100">
                {myRedemptions.map((redemption) => (
                  <div key={redemption.id} className="p-6 flex items-center justify-between" data-testid={`redemption-item-${redemption.id}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                        <Award className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{redemption.reward?.title}</h4>
                        <p className="text-sm text-slate-600">Solicitado em {new Date(redemption.requested_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div>
                      {redemption.status === 'pending' && (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Pendente
                        </span>
                      )}
                      {redemption.status === 'approved' && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          Aprovado
                        </span>
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
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Rewards;