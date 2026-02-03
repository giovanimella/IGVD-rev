import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { BookOpen, Play, CheckCircle, Clock, Video, Lock } from 'lucide-react';
import { Progress } from '../components/ui/progress';

const Modules = () => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/modules/`);
      setModules(response.data);
    } catch (error) {
      console.error('Erro ao buscar módulos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getModuleLink = (module) => {
    if (module.locked) return null;
    if (module.module_type === 'live_class') {
      return `/module/${module.id}/live`;
    }
    return `/module/${module.id}`;
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
      <div className="space-y-4 lg:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl lg:text-3xl font-outfit font-bold text-slate-900 dark:text-white">Módulos de Treinamento</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm lg:text-base">Aprenda e evolua com nossos conteúdos</p>
          </div>
        </div>

        {modules.length === 0 ? (
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-8 lg:p-12 text-center">
            <BookOpen className="w-12 lg:w-16 h-12 lg:h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg lg:text-xl font-outfit font-semibold text-slate-900 dark:text-white mb-2">Nenhum módulo disponível</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm lg:text-base">Os módulos estarão disponíveis em breve.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {modules.map((module) => {
              const moduleLink = getModuleLink(module);
              const isLiveClass = module.module_type === 'live_class';
              const ModuleWrapper = moduleLink ? Link : 'div';
              
              return (
                <ModuleWrapper
                  key={module.id}
                  to={moduleLink}
                  data-testid={`module-card-${module.id}`}
                  className={`group bg-white dark:bg-[#1b4c51] rounded-xl overflow-hidden border border-slate-100 dark:border-white/5 transition-all duration-300 ${
                    moduleLink 
                      ? 'hover:shadow-lg dark:hover:border-cyan-500/30 cursor-pointer' 
                      : 'opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className={`h-36 lg:h-48 relative overflow-hidden ${
                    isLiveClass 
                      ? 'bg-gradient-to-br from-red-500 to-rose-600' 
                      : 'bg-gradient-to-br from-cyan-500 to-blue-600'
                  }`}>
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                    
                    {/* Locked Overlay */}
                    {module.locked && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                        <Lock className="w-8 h-8 mb-2" />
                        <p className="text-sm font-medium">Disponível em {module.months_until_available} {module.months_until_available === 1 ? 'mês' : 'meses'}</p>
                      </div>
                    )}
                    
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex items-center gap-2 text-white/90 text-sm mb-2">
                        {isLiveClass ? (
                          <>
                            <Video className="w-4 h-4" />
                            <span>Aula ao Vivo</span>
                          </>
                        ) : (
                          <>
                            <BookOpen className="w-4 h-4" />
                            <span>{module.chapters_count || 0} capítulos</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Live Badge */}
                    {isLiveClass && (
                      <div className="absolute top-3 right-3">
                        <span className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium flex items-center gap-1 animate-pulse">
                          <span className="w-2 h-2 bg-white rounded-full"></span>
                          AO VIVO
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 lg:p-6">
                    <h3 className="text-lg lg:text-xl font-outfit font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      {module.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-2">{module.description}</p>

                    {!isLiveClass && module.progress !== undefined && (
                      <div className="space-y-2">
                        <Progress value={module.progress} className="h-2" />
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">{Math.round(module.progress)}% completo</span>
                          {module.points_reward > 0 && (
                            <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              {module.points_reward} pts
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {module.has_certificate && (
                      <div className="mt-4 flex items-center gap-2 text-sm text-cyan-600 dark:text-cyan-400">
                        <CheckCircle className="w-4 h-4" />
                        <span>Certificado disponível</span>
                      </div>
                    )}
                    
                    {isLiveClass && module.live_stream_scheduled && (
                      <div className="mt-4 flex items-center gap-2 text-sm text-red-500">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(module.live_stream_scheduled).toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                  </div>
                </ModuleWrapper>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Modules;