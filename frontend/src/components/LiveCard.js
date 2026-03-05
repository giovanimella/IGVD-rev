import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Video, Gift, ExternalLink, Loader, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

const LiveCard = () => {
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    checkLive();
  }, []);

  const checkLive = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/live/current`);
      setLiveData(response.data);
    } catch (error) {
      console.error('Erro ao verificar live:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLive = async () => {
    setJoining(true);
    try {
      const response = await axios.post(`${API_URL}/api/live/join`);
      
      if (response.data.success) {
        // Mostrar mensagem de pontos
        if (response.data.points_earned > 0) {
          toast.success(`🎉 ${response.data.message}`);
        } else {
          toast.info(response.data.message);
        }
        
        // Abrir o link em nova aba
        if (response.data.meeting_link) {
          window.open(response.data.meeting_link, '_blank');
        }
        
        // Atualizar estado
        setLiveData(prev => ({
          ...prev,
          already_participated: true
        }));
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao entrar na live';
      toast.error(errorMsg);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return null; // Não mostrar nada enquanto carrega
  }

  // Se não há live ativa, não mostrar o card
  if (!liveData?.has_active_live) {
    return null;
  }

  const { live, already_participated } = liveData;

  return (
    <div className="bg-gradient-to-r from-red-500 to-pink-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
      {/* Badge AO VIVO */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
        <span className="text-sm font-semibold">AO VIVO</span>
      </div>

      <div className="flex items-start gap-4">
        <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <Video className="w-7 h-7" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-xl font-outfit font-bold mb-1">
            {live?.title || 'Live Semanal'}
          </h3>
          {live?.description && (
            <p className="text-white/80 text-sm mb-3">
              {live.description}
            </p>
          )}
          
          {/* Pontos */}
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-4 h-4" />
            <span className="text-sm">
              {already_participated ? (
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Você já participou hoje!
                </span>
              ) : (
                <>Ganhe <strong>{live?.points_reward || 10} pontos</strong> ao participar!</>
              )}
            </span>
          </div>

          {/* Botão */}
          <Button
            onClick={handleJoinLive}
            disabled={joining}
            className={`${
              already_participated 
                ? 'bg-white/20 hover:bg-white/30' 
                : 'bg-white text-red-600 hover:bg-white/90'
            } font-semibold`}
          >
            {joining ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                {already_participated ? 'Entrar Novamente' : 'Entrar na Live'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Decoração */}
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full"></div>
      <div className="absolute -bottom-5 -right-20 w-32 h-32 bg-white/5 rounded-full"></div>
    </div>
  );
};

export default LiveCard;
