import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from 'axios';
import { ArrowLeft, BookOpen, Play, CheckCircle, Clock, Award, ClipboardCheck, Download, Heart } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';

const ModuleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [certificateEligibility, setCertificateEligibility] = useState(null);
  const [generatingCertificate, setGeneratingCertificate] = useState(false);
  const [module, setModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState({});

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchModule();
    fetchAssessmentResult();
    fetchCertificateEligibility();
    fetchFavorites();
  }, [id]);

  const fetchFavorites = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/favorites/`);
      const favMap = {};
      response.data.forEach(f => {
        favMap[f.chapter_id] = true;
      });
      setFavorites(favMap);
    } catch (error) {
      console.error('Erro ao buscar favoritos:', error);
    }
  };

  const toggleFavorite = async (chapterId) => {
    try {
      const response = await axios.post(`${API_URL}/api/favorites/toggle/${chapterId}`);
      setFavorites(prev => ({
        ...prev,
        [chapterId]: response.data.is_favorite
      }));
      toast.success(response.data.message);
    } catch (error) {
      toast.error('Erro ao atualizar favorito');
    }
  };

  const fetchModule = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/modules/${id}`);
      setModule(response.data);
    } catch (error) {
      console.error('Erro ao buscar módulo:', error);
      toast.error('Erro ao carregar módulo');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssessmentResult = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/assessments/results/module/${id}`);
      setAssessmentResult(response.data);
    } catch (error) {
      console.error('Erro ao buscar resultado da avaliação:', error);
    }
  };

  const fetchCertificateEligibility = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/certificates/check/${id}`);
      setCertificateEligibility(response.data);
    } catch (error) {
      console.error('Erro ao verificar elegibilidade de certificado:', error);
    }
  };

  const handleGenerateCertificate = async () => {
    setGeneratingCertificate(true);
    try {
      const response = await axios.post(`${API_URL}/api/certificates/generate/${id}`);
      toast.success('Certificado gerado com sucesso!');
      
      // Baixar automaticamente
      const certId = response.data.certificate.id;
      const downloadResponse = await axios.get(`${API_URL}/api/certificates/download/${certId}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([downloadResponse.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificado_${module.title.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      // Atualizar elegibilidade
      fetchCertificateEligibility();
    } catch (error) {
      console.error('Erro ao gerar certificado:', error);
      toast.error(error.response?.data?.detail || 'Erro ao gerar certificado');
    } finally {
      setGeneratingCertificate(false);
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

  if (!module) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-outfit font-bold text-slate-900">Módulo não encontrado</h2>
          <Button onClick={() => navigate('/modules')} className="mt-4">
            Voltar para Módulos
          </Button>
        </div>
      </Layout>
    );
  }

  const completedChapters = module.chapters?.filter(ch => ch.user_progress?.completed).length || 0;
  const totalChapters = module.chapters?.length || 0;
  const progress = totalChapters > 0 ? (completedChapters / totalChapters * 100) : 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate('/modules')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-8 text-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-4xl font-outfit font-bold mb-4">{module.title}</h1>
                <p className="text-white/90 text-lg mb-6">{module.description}</p>
                
                <div className="flex items-center gap-6 text-white/90">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    <span>{totalChapters} capítulos</span>
                  </div>
                  {module.has_certificate && (
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5" />
                      <span>Certificado disponível</span>
                    </div>
                  )}
                  {module.points_reward > 0 && (
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span>{module.points_reward} pontos</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {progress > 0 && (
              <div className="mt-6 bg-white/20 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Seu Progresso</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-white/30" />
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-outfit font-bold text-slate-900 mb-6">Capítulos</h2>
          <div className="space-y-4">
            {module.chapters && module.chapters.length > 0 ? (
              module.chapters.map((chapter, index) => {
                const isCompleted = chapter.user_progress?.completed;
                return (
                  <div
                    key={chapter.id}
                    data-testid={`chapter-item-${chapter.id}`}
                    className={`bg-white rounded-xl border p-6 transition-all ${
                      isCompleted ? 'border-green-200 bg-green-50/50' : 'border-slate-200 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isCompleted ? 'bg-green-500' : 'bg-cyan-100'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="w-6 h-6 text-white" />
                          ) : (
                            <span className="text-cyan-600 font-semibold text-lg">{index + 1}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-outfit font-semibold text-slate-900 mb-2">
                            {chapter.title}
                          </h3>
                          <p className="text-slate-600 text-sm mb-3">{chapter.description}</p>
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <div className="flex items-center gap-1">
                              {chapter.content_type === 'video' && <Play className="w-4 h-4" />}
                              {chapter.content_type === 'document' && <BookOpen className="w-4 h-4" />}
                              <span className="capitalize">{chapter.content_type}</span>
                            </div>
                            {chapter.duration_minutes > 0 && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{chapter.duration_minutes} min</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleFavorite(chapter.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            favorites[chapter.id]
                              ? 'text-rose-500 bg-rose-50 hover:bg-rose-100'
                              : 'text-slate-400 hover:text-rose-500 hover:bg-slate-100'
                          }`}
                          data-testid={`favorite-chapter-${chapter.id}`}
                          title={favorites[chapter.id] ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                        >
                          <Heart className={`w-5 h-5 ${favorites[chapter.id] ? 'fill-current' : ''}`} />
                        </button>
                        {!isCompleted ? (
                          <Button
                            onClick={() => navigate(`/module/${id}/chapter/${chapter.id}`)}
                            size="sm"
                            data-testid={`view-chapter-${chapter.id}`}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            {chapter.content_type === 'video' ? 'Assistir' : 'Ver Conteúdo'}
                          </Button>
                        ) : (
                          <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                            <CheckCircle className="w-4 h-4" />
                            Concluído
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-outfit font-semibold text-slate-900 mb-2">Nenhum capítulo disponível</h3>
                <p className="text-slate-600">Os capítulos estarão disponíveis em breve.</p>
              </div>
            )}
          </div>
        </div>

        {/* Card de Avaliação */}
        {module.has_assessment && (
          <div className={`rounded-xl border p-6 ${
            assessmentResult?.passed 
              ? 'bg-green-50 border-green-200' 
              : progress === 100 
                ? 'bg-amber-50 border-amber-200' 
                : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                  assessmentResult?.passed 
                    ? 'bg-green-500' 
                    : progress === 100 
                      ? 'bg-amber-500' 
                      : 'bg-slate-300'
                }`}>
                  <ClipboardCheck className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-outfit font-semibold text-slate-900">
                    {assessmentResult?.passed ? 'Avaliação Concluída!' : 'Avaliação do Módulo'}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {assessmentResult?.passed 
                      ? `Aprovado em ${new Date(assessmentResult.completed_at).toLocaleDateString('pt-BR')}`
                      : progress === 100 
                        ? 'Complete a avaliação para finalizar o módulo'
                        : 'Complete todos os capítulos para liberar a avaliação'
                    }
                  </p>
                </div>
              </div>
              {progress === 100 && (
                <Button 
                  onClick={() => navigate(`/module/${id}/assessment`)}
                  className={assessmentResult?.passed ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  {assessmentResult?.passed ? 'Ver Resultado' : 'Fazer Avaliação'}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Card de Certificado */}
        {module.has_certificate && (
          <div className={`rounded-xl border p-6 ${
            certificateEligibility?.certificate_id 
              ? 'bg-amber-50 border-amber-200' 
              : certificateEligibility?.eligible 
                ? 'bg-green-50 border-green-200' 
                : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                  certificateEligibility?.certificate_id 
                    ? 'bg-amber-500' 
                    : certificateEligibility?.eligible 
                      ? 'bg-green-500' 
                      : 'bg-slate-300'
                }`}>
                  <Award className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-outfit font-semibold text-slate-900">
                    {certificateEligibility?.certificate_id 
                      ? 'Certificado Disponível!' 
                      : 'Certificado do Módulo'}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {certificateEligibility?.certificate_id 
                      ? 'Você já gerou seu certificado. Acesse na página de Certificados.'
                      : certificateEligibility?.eligible 
                        ? 'Parabéns! Você pode gerar seu certificado agora!' 
                        : certificateEligibility?.reason || 'Complete o módulo para gerar o certificado'
                    }
                  </p>
                </div>
              </div>
              {certificateEligibility?.eligible && !certificateEligibility?.certificate_id && (
                <Button 
                  onClick={handleGenerateCertificate}
                  disabled={generatingCertificate}
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {generatingCertificate ? 'Gerando...' : 'Gerar Certificado'}
                </Button>
              )}
              {certificateEligibility?.certificate_id && (
                <Button 
                  onClick={() => navigate('/certificates')}
                  variant="outline"
                >
                  Ver Meus Certificados
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ModuleDetail;