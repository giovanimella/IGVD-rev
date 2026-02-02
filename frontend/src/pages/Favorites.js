import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from 'axios';
import { Heart, BookOpen, Play, FileText, Clock, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/favorites/`);
      setFavorites(response.data);
    } catch (error) {
      console.error('Erro ao buscar favoritos:', error);
      toast.error('Erro ao carregar favoritos');
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (chapterId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await axios.delete(`${API_URL}/api/favorites/${chapterId}`);
      setFavorites(favorites.filter(f => f.chapter_id !== chapterId));
      toast.success('Removido dos favoritos');
    } catch (error) {
      toast.error('Erro ao remover favorito');
    }
  };

  const getContentIcon = (contentType) => {
    switch (contentType) {
      case 'video':
        return <Play className="w-5 h-5" />;
      case 'document':
      case 'pdf':
        return <FileText className="w-5 h-5" />;
      default:
        return <BookOpen className="w-5 h-5" />;
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
        {/* Header */}
        <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              <Heart className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-outfit font-bold">Meus Favoritos</h1>
              <p className="text-white/90">Acesse rapidamente seus capítulos salvos</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-white/80">
            <span>{favorites.length} capítulo(s) salvo(s)</span>
          </div>
        </div>

        {/* Favorites List */}
        {favorites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((fav) => (
              <Link
                key={fav.id}
                to={`/module/${fav.module_id}`}
                className="group"
                data-testid={`favorite-card-${fav.chapter_id}`}
              >
                <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/10 p-5 hover:shadow-lg hover:border-rose-200 dark:hover:border-rose-500/30 transition-all h-full">
                  {/* Module Tag */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 text-xs font-medium rounded-full">
                      {fav.module.title}
                    </span>
                    <button
                      onClick={(e) => removeFavorite(fav.chapter_id, e)}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                      data-testid={`remove-favorite-${fav.chapter_id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Content Type Icon */}
                  <div className="w-12 h-12 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/30 dark:to-pink-900/30 rounded-xl flex items-center justify-center text-rose-500 dark:text-rose-400 mb-4">
                    {getContentIcon(fav.chapter.content_type)}
                  </div>

                  {/* Chapter Info */}
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors line-clamp-2">
                    {fav.chapter.title}
                  </h3>
                  
                  {fav.chapter.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                      {fav.chapter.description}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-sm text-slate-400 dark:text-slate-500 mt-auto pt-4 border-t border-slate-100 dark:border-white/10">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{fav.chapter.duration_minutes || 5} min</span>
                    </div>
                    <span className="text-xs">
                      Salvo em {new Date(fav.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/10 p-12 text-center">
            <Heart className="w-20 h-20 text-slate-200 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-outfit font-semibold text-slate-900 dark:text-white mb-2">
              Nenhum favorito ainda
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Clique no ícone de coração nos capítulos para salvá-los aqui
            </p>
            <Link to="/modules">
              <Button className="bg-cyan-500 hover:bg-cyan-600">
                <BookOpen className="w-4 h-4 mr-2" />
                Explorar Módulos
              </Button>
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Favorites;
