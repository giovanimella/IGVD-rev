import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from 'axios';
import { ArrowLeft, Play, CheckCircle, Clock, FileText, ExternalLink, Heart } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';

const ChapterView = () => {
  const { moduleId, chapterId } = useParams();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState(null);
  const [module, setModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watchedPercentage, setWatchedPercentage] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [canComplete, setCanComplete] = useState(false);
  const videoRef = useRef(null);
  const contentRef = useRef(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [readTime, setReadTime] = useState(0);

  const API_URL = process.env.REACT_APP_BACKEND_URL;
  const MIN_PERCENTAGE = 90;

  useEffect(() => {
    fetchChapter();
    fetchProgress();
    fetchFavoriteStatus();
  }, [moduleId, chapterId]);

  // Para documentos/texto ou quando não há tipo definido: rastrear tempo de leitura
  useEffect(() => {
    if (chapter && (chapter?.content_type === 'document' || chapter?.content_type === 'text' || !chapter?.content_type)) {
      const minReadTime = (chapter.duration_minutes || 1) * 60; // segundos (mínimo 1 minuto)
      const interval = setInterval(() => {
        setReadTime(prev => {
          const newTime = prev + 1;
          const percentage = Math.min((newTime / minReadTime) * 100, 100);
          setWatchedPercentage(percentage);
          
          if (percentage >= MIN_PERCENTAGE && !canComplete) {
            setCanComplete(true);
            toast.success('Você pode marcar este capítulo como completo!');
          }
          
          // Salvar progresso a cada 10 segundos
          if (newTime % 10 === 0) {
            saveProgress(percentage, false);
          }
          
          return newTime;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [chapter, canComplete]);

  const fetchChapter = async () => {
    try {
      const [moduleRes, chaptersRes] = await Promise.all([
        axios.get(`${API_URL}/api/modules/${moduleId}`),
        axios.get(`${API_URL}/api/chapters/module/${moduleId}`)
      ]);
      
      setModule(moduleRes.data);
      const chapterData = chaptersRes.data.find(c => c.id === chapterId);
      setChapter(chapterData);
    } catch (error) {
      console.error('Erro ao buscar capítulo:', error);
      toast.error('Erro ao carregar capítulo');
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/progress/my-progress`);
      const chapterProgress = response.data.find(p => p.chapter_id === chapterId);
      if (chapterProgress) {
        setWatchedPercentage(chapterProgress.watched_percentage || 0);
        setIsCompleted(chapterProgress.completed || false);
        setCanComplete(chapterProgress.watched_percentage >= MIN_PERCENTAGE);
      }
    } catch (error) {
      console.error('Erro ao buscar progresso:', error);
    }
  };

  const fetchFavoriteStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/favorites/`);
      const isFav = response.data.some(f => f.chapter_id === chapterId);
      setIsFavorite(isFav);
    } catch (error) {
      console.error('Erro ao buscar favoritos:', error);
    }
  };

  const saveProgress = async (percentage, completed) => {
    try {
      await axios.post(`${API_URL}/api/progress/update`, {
        chapter_id: chapterId,
        module_id: moduleId,
        completed: completed,
        watched_percentage: Math.round(percentage)
      });
    } catch (error) {
      console.error('Erro ao salvar progresso:', error.response?.data);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const percentage = (video.currentTime / video.duration) * 100;
      setVideoProgress(percentage);
      setWatchedPercentage(percentage);
      
      if (percentage >= MIN_PERCENTAGE && !canComplete) {
        setCanComplete(true);
        toast.success('Você pode marcar este capítulo como completo!');
      }
    }
  };

  const handleVideoEnded = () => {
    setWatchedPercentage(100);
    setCanComplete(true);
    saveProgress(100, false);
    toast.success('Vídeo concluído! Marque como completo para continuar.');
  };

  const handleMarkComplete = async () => {
    if (!canComplete && !isCompleted) {
      toast.error(`Você precisa consumir pelo menos ${MIN_PERCENTAGE}% do conteúdo antes de marcar como completo.`);
      return;
    }

    try {
      await axios.post(`${API_URL}/api/progress/update`, {
        chapter_id: chapterId,
        module_id: moduleId,
        completed: true,
        watched_percentage: Math.round(Math.max(watchedPercentage, MIN_PERCENTAGE))
      });
      setIsCompleted(true);
      toast.success('Capítulo marcado como completo!');
    } catch (error) {
      console.error('Erro ao marcar como completo:', error.response?.data);
      const errorData = error.response?.data;
      let errorMessage = 'Erro ao marcar como completo';
      
      if (typeof errorData?.detail === 'string') {
        errorMessage = errorData.detail;
      } else if (Array.isArray(errorData?.detail)) {
        errorMessage = errorData.detail.map(e => e.msg || e.message || String(e)).join(', ');
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const toggleFavorite = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/favorites/toggle/${chapterId}`);
      setIsFavorite(response.data.is_favorite);
      toast.success(response.data.message);
    } catch (error) {
      toast.error('Erro ao atualizar favorito');
    }
  };

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return videoId ? `https://www.youtube.com/embed/${videoId[1]}?enablejsapi=1` : null;
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

  if (!chapter) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-outfit font-bold text-slate-900">Capítulo não encontrado</h2>
          <Button onClick={() => navigate(`/module/${moduleId}`)} className="mt-4">
            Voltar para o Módulo
          </Button>
        </div>
      </Layout>
    );
  }

  const embedUrl = getYouTubeEmbedUrl(chapter.video_url);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/module/${moduleId}`)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          </button>
          <div className="flex-1">
            <p className="text-sm text-cyan-600 dark:text-cyan-400 font-medium">{module?.title}</p>
            <h1 className="text-2xl font-outfit font-bold text-slate-900 dark:text-white">{chapter.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFavorite}
              className={`p-2 rounded-lg transition-colors ${
                isFavorite
                  ? 'text-rose-500 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50'
                  : 'text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
            >
              <Heart className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Progresso do Capítulo</span>
            <span className={`text-sm font-medium ${watchedPercentage >= MIN_PERCENTAGE ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {Math.round(watchedPercentage)}%
            </span>
          </div>
          <Progress 
            value={watchedPercentage} 
            className={`h-3 ${watchedPercentage >= MIN_PERCENTAGE ? 'bg-green-100 dark:bg-green-900/30' : ''}`}
          />
          {!isCompleted && watchedPercentage < MIN_PERCENTAGE && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Assista pelo menos {MIN_PERCENTAGE}% do conteúdo para marcar como completo
            </p>
          )}
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden" ref={contentRef}>
          {chapter.content_type === 'video' && embedUrl && (
            <div className="aspect-video bg-black">
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={chapter.title}
              />
            </div>
          )}

          {chapter.content_type === 'video' && chapter.video_url && !embedUrl && (
            <div className="aspect-video bg-black">
              <video
                ref={videoRef}
                src={chapter.video_url}
                className="w-full h-full"
                controls
                onTimeUpdate={handleVideoTimeUpdate}
                onEnded={handleVideoEnded}
              />
            </div>
          )}

          {chapter.content_type === 'document' && (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700/50">
                <FileText className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                <div className="flex-1">
                  <p className="font-medium text-amber-800 dark:text-amber-300">Documento para Leitura</p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Tempo estimado: {chapter.duration_minutes || 5} minutos
                  </p>
                </div>
                {chapter.document_url && (
                  <a
                    href={chapter.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir Documento
                  </a>
                )}
              </div>
              
              {chapter.content && (
                <div className="prose dark:prose-invert max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: chapter.content }} />
                </div>
              )}
              
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700/50">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Tempo de leitura: {Math.floor(readTime / 60)}:{String(readTime % 60).padStart(2, '0')} / {chapter.duration_minutes || 2}:00
                </p>
              </div>
            </div>
          )}

          {/* Conteúdo genérico quando não há tipo definido */}
          {!chapter.content_type && !chapter.video_url && (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4 p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-700/50">
                <FileText className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                <div className="flex-1">
                  <p className="font-medium text-cyan-800 dark:text-cyan-300">Conteúdo do Capítulo</p>
                  <p className="text-sm text-cyan-600 dark:text-cyan-400">
                    Permaneça nesta página para registrar seu progresso
                  </p>
                </div>
              </div>
              
              {chapter.description && (
                <div className="prose dark:prose-invert max-w-none mb-4">
                  <p className="text-slate-700 dark:text-slate-300">{chapter.description}</p>
                </div>
              )}
              
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700/50">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Tempo na página: {Math.floor(readTime / 60)}:{String(readTime % 60).padStart(2, '0')} / {chapter.duration_minutes || 1}:00 min
                </p>
                <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                  Aguarde atingir 90% para marcar como completo
                </p>
              </div>
            </div>
          )}

          {chapter.description && chapter.content_type && (
            <div className="p-6 border-t border-slate-200 dark:border-white/10">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Sobre este capítulo</h3>
              <p className="text-slate-600 dark:text-slate-400">{chapter.description}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <div className="flex items-center gap-3">
            {isCompleted ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="w-6 h-6" />
                <span className="font-medium">Capítulo Concluído!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Clock className="w-5 h-5" />
                <span>{chapter.duration_minutes || 5} minutos</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(`/module/${moduleId}`)}
            >
              Voltar ao Módulo
            </Button>
            
            {!isCompleted && (
              <Button
                onClick={handleMarkComplete}
                disabled={!canComplete}
                className={canComplete ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-300'}
                data-testid="complete-chapter-btn"
              >
                {canComplete ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Marcar como Completo
                  </>
                ) : (
                  <>Assista {MIN_PERCENTAGE}% para completar</>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Note about YouTube */}
        {chapter.content_type === 'video' && embedUrl && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>Nota:</strong> Para vídeos do YouTube, assista o conteúdo completamente e depois clique em "Marcar como Completo" 
              quando estiver satisfeito com seu aprendizado. O sistema confia em sua honestidade.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ChapterView;
