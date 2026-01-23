import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import {
  Play,
  Clock,
  Eye,
  Radio,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const OzoxxCast = () => {
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ozoxx-cast/videos`);
      setVideos(response.data);
      if (response.data.length > 0 && !selectedVideo) {
        setSelectedVideo(response.data[0]);
      }
    } catch (error) {
      console.error('Erro ao buscar vídeos:', error);
      toast.error('Erro ao carregar vídeos');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoSelect = async (video) => {
    try {
      // Registrar visualização
      await axios.get(`${API_URL}/api/ozoxx-cast/videos/${video.id}`);
      setSelectedVideo(video);
    } catch (error) {
      console.error('Erro ao selecionar vídeo:', error);
    }
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

  if (videos.length === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <Radio className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            Nenhum vídeo disponível
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Em breve teremos novos conteúdos para você
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-outfit font-bold text-slate-900 dark:text-white">
                IGVD Cast
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Gravações das lives da fábrica
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player Principal */}
          <div className="lg:col-span-2">
            {selectedVideo && (
              <div className="bg-black rounded-xl overflow-hidden">
                <video
                  key={selectedVideo.id}
                  controls
                  className="w-full aspect-video"
                  src={`${API_URL}${selectedVideo.video_url}`}
                  data-testid="video-player"
                >
                  Seu navegador não suporta o elemento de vídeo.
                </video>
              </div>
            )}
            
            {selectedVideo && (
              <div className="mt-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  {selectedVideo.title}
                </h2>
                {selectedVideo.description && (
                  <p className="text-slate-600 dark:text-slate-400 mt-2">
                    {selectedVideo.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-3 text-sm text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {selectedVideo.views || 0} visualizações
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {selectedVideo.file_size_formatted}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Lista de Vídeos */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Todos os Vídeos ({videos.length})
                </h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[600px] overflow-y-auto">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => handleVideoSelect(video)}
                    className={`p-3 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-white/5 ${
                      selectedVideo?.id === video.id ? 'bg-cyan-50 dark:bg-cyan-500/20 border-l-4 border-cyan-500' : ''
                    }`}
                    data-testid={`video-item-${video.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-24 h-14 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                        <Play className="w-6 h-6 text-slate-400" />
                        {selectedVideo?.id === video.id && (
                          <div className="absolute inset-0 bg-cyan-500/20 flex items-center justify-center">
                            <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm truncate ${
                          selectedVideo?.id === video.id ? 'text-cyan-700 dark:text-cyan-400' : 'text-slate-900 dark:text-white'
                        }`}>
                          {video.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {video.views || 0}
                          </span>
                          <span>{video.file_size_formatted}</span>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 ${
                        selectedVideo?.id === video.id ? 'text-cyan-500' : 'text-slate-300 dark:text-slate-600'
                      }`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default OzoxxCast;
