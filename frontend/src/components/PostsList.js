import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PostsList = () => {
  const [posts, setPosts] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const [initialRes, allRes] = await Promise.all([
        axios.get(`${API_URL}/api/posts/?limit=3`),
        axios.get(`${API_URL}/api/posts/all`)
      ]);
      setPosts(initialRes.data);
      setAllPosts(allRes.data);
    } catch (error) {
      console.error('Erro ao buscar posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const displayedPosts = showAll ? allPosts : posts;

  if (loading) {
    return null;
  }

  if (posts.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-2xl font-outfit font-bold text-slate-900 mb-4">
          Novidades e Comunicados
        </h2>
        
        <div className="space-y-4">
          {displayedPosts.map((post) => (
            <button
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className="w-full text-left p-4 border border-slate-200 rounded-lg hover:border-cyan-200 hover:bg-cyan-50 transition-all"
            >
              <h3 className="font-semibold text-slate-900 mb-1">{post.title}</h3>
              <p className="text-sm text-slate-600 mb-2 line-clamp-2">{post.description}</p>
              <div className="flex items-center text-xs text-slate-500">
                <Calendar className="w-4 h-4 mr-1" />
                {format(new Date(post.created_at), 'dd/MM/yyyy', { locale: ptBR })}
              </div>
            </button>
          ))}
        </div>

        {!showAll && allPosts.length > 3 && (
          <button
            onClick={() => setShowAll(true)}
            className="mt-4 text-cyan-600 hover:text-cyan-700 font-medium text-sm"
          >
            Ver mais...
          </button>
        )}

        {showAll && (
          <button
            onClick={() => setShowAll(false)}
            className="mt-4 text-cyan-600 hover:text-cyan-700 font-medium text-sm"
          >
            Ver menos
          </button>
        )}
      </div>

      {/* Modal do Post */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-outfit font-bold text-slate-900 mb-2">
                  {selectedPost.title}
                </h2>
                <div className="flex items-center text-sm text-slate-500">
                  <Calendar className="w-4 h-4 mr-1" />
                  {format(new Date(selectedPost.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  <span className="mx-2">•</span>
                  <span>Por {selectedPost.author_name}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                {selectedPost.content}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PostsList;