import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { BookOpen, Play, CheckCircle, Clock } from 'lucide-react';
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-outfit font-bold text-slate-900">Módulos de Treinamento</h1>
            <p className="text-slate-600 mt-2">Aprenda e evolua com nossos conteúdos</p>
          </div>
        </div>

        {modules.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-outfit font-semibold text-slate-900 mb-2">Nenhum módulo disponível</h3>
            <p className="text-slate-600">Os módulos estarão disponíveis em breve.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => (
              <Link
                key={module.id}
                to={`/module/${module.id}`}
                data-testid={`module-card-${module.id}`}
                className="group bg-white rounded-xl overflow-hidden border border-slate-100 hover:shadow-lg transition-all duration-300"
              >
                <div className="h-48 bg-gradient-to-br from-cyan-500 to-blue-600 relative overflow-hidden">
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-2 text-white/90 text-sm mb-2">
                      <BookOpen className="w-4 h-4" />
                      <span>{module.chapters_count || 0} capítulos</span>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-outfit font-semibold text-slate-900 mb-2 group-hover:text-cyan-600 transition-colors">
                    {module.title}
                  </h3>
                  <p className="text-slate-600 text-sm mb-4 line-clamp-2">{module.description}</p>

                  {module.progress !== undefined && (
                    <div className="space-y-2">
                      <Progress value={module.progress} className="h-2" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{Math.round(module.progress)}% completo</span>
                        {module.points_reward > 0 && (
                          <span className="text-amber-600 font-medium flex items-center gap-1">
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
                    <div className="mt-4 flex items-center gap-2 text-sm text-cyan-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>Certificado disponível</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Modules;