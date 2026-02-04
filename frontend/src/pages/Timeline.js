import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import {
  MessageCircle,
  Heart,
  Send,
  Image as ImageIcon,
  MoreVertical,
  Trash2,
  Pin,
  X,
  ThumbsUp,
  Sparkles,
  Award,
  Lightbulb,
  Loader2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Curtir' },
  { type: 'love', emoji: '❤️', label: 'Amei' },
  { type: 'celebrate', emoji: '🎉', label: 'Celebrar' },
  { type: 'support', emoji: '🤝', label: 'Apoiar' },
  { type: 'insightful', emoji: '💡', label: 'Interessante' }
];

const Timeline = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [comment, setComment] = useState('');
  const [showReactions, setShowReactions] = useState(null);

  const fetchPosts = useCallback(async (pageNum = 1, append = false) => {
    try {
      const response = await axios.get(`${API_URL}/api/timeline/posts?page=${pageNum}&limit=20`);
      if (append) {
        setPosts(prev => [...prev, ...response.data.posts]);
      } else {
        setPosts(response.data.posts);
      }
      setHasMore(response.data.page < response.data.pages);
    } catch (error) {
      console.error('Erro ao carregar posts:', error);
      toast.error('Erro ao carregar posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo: 5MB');
      return;
    }

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/api/timeline/posts/upload-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPostImage(response.data.image_url);
      toast.success('Imagem carregada!');
    } catch (error) {
      toast.error('Erro ao carregar imagem');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmitPost = async (e) => {
    e.preventDefault();
    if (!newPost.trim() && !postImage) {
      toast.error('Escreva algo ou adicione uma imagem');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/timeline/posts`, {
        content: newPost,
        image_url: postImage
      });
      setNewPost('');
      setPostImage(null);
      fetchPosts();
      toast.success('Post publicado!');
    } catch (error) {
      toast.error('Erro ao publicar post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReact = async (postId, reactionType) => {
    try {
      const response = await axios.post(`${API_URL}/api/timeline/posts/${postId}/react?reaction_type=${reactionType}`);
      // Atualizar estado local
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          const wasReacted = post.user_reacted;
          const oldType = post.user_reaction_type;
          
          let newReactions = { ...post.reactions };
          
          if (response.data.reacted) {
            if (oldType && oldType !== reactionType) {
              newReactions[oldType] = Math.max((newReactions[oldType] || 1) - 1, 0);
            }
            newReactions[reactionType] = (newReactions[reactionType] || 0) + (wasReacted && oldType === reactionType ? 0 : 1);
          } else {
            newReactions[reactionType] = Math.max((newReactions[reactionType] || 1) - 1, 0);
          }
          
          return {
            ...post,
            user_reacted: response.data.reacted,
            user_reaction_type: response.data.reacted ? reactionType : null,
            reactions: newReactions,
            likes_count: Object.values(newReactions).reduce((a, b) => a + b, 0)
          };
        }
        return post;
      }));
      setShowReactions(null);
    } catch (error) {
      toast.error('Erro ao reagir');
    }
  };

  const handleComment = async (postId) => {
    if (!comment.trim()) return;

    try {
      await axios.post(`${API_URL}/api/timeline/posts/${postId}/comments`, {
        post_id: postId,
        content: comment
      });
      setComment('');
      // Atualizar post
      const response = await axios.get(`${API_URL}/api/timeline/posts/${postId}`);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: response.data.comments, comments_count: response.data.comments?.length || 0 } : p));
      toast.success('Comentário adicionado!');
    } catch (error) {
      toast.error('Erro ao comentar');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Tem certeza que deseja excluir este post?')) return;

    try {
      await axios.delete(`${API_URL}/api/timeline/posts/${postId}`);
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Post excluído');
    } catch (error) {
      toast.error('Erro ao excluir post');
    }
  };

  const handlePinPost = async (postId) => {
    try {
      const response = await axios.put(`${API_URL}/api/timeline/posts/${postId}/pin`);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_pinned: response.data.is_pinned } : p));
      toast.success(response.data.message);
    } catch (error) {
      toast.error('Erro ao fixar post');
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, true);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}min`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('pt-BR');
  };

  const canModerate = user?.role === 'admin' || user?.role === 'supervisor';

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
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">Comunidade</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Compartilhe experiências, dúvidas e dicas com outros licenciados
          </p>
        </div>

        {/* Criar Post */}
        <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-4">
          <form onSubmit={handleSubmitPost}>
            <div className="flex items-start space-x-3">
              {user?.profile_picture ? (
                <img
                  src={`${API_URL}${user.profile_picture}`}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-medium flex-shrink-0">
                  {user?.full_name?.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="O que você está pensando?"
                  className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white placeholder-slate-400"
                  rows={3}
                />
                {postImage && (
                  <div className="relative mt-3">
                    <img
                      src={`${API_URL}${postImage}`}
                      alt="Preview"
                      className="rounded-lg max-h-48 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPostImage(null)}
                      className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  <label className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-cyan-500 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                    {uploadingImage ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <ImageIcon className="w-5 h-5" />
                    )}
                    <span className="text-sm">Foto</span>
                  </label>
                  <button
                    type="submit"
                    disabled={submitting || (!newPost.trim() && !postImage)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>Publicar</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Lista de Posts */}
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-12 text-center">
              <MessageCircle className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Nenhum post ainda</h3>
              <p className="text-slate-600 dark:text-slate-400">Seja o primeiro a compartilhar algo!</p>
            </div>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                className={`bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden ${post.is_pinned ? 'ring-2 ring-amber-500' : ''}`}
              >
                {post.is_pinned && (
                  <div className="bg-amber-50 dark:bg-amber-500/10 px-4 py-2 flex items-center space-x-2 border-b border-amber-200 dark:border-amber-500/20">
                    <Pin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">Post fixado</span>
                  </div>
                )}
                <div className="p-4">
                  {/* Header do Post */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {post.author_avatar ? (
                        <img
                          src={`${API_URL}${post.author_avatar}`}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-medium">
                          {post.author_name?.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{post.author_name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{formatDate(post.created_at)}</p>
                      </div>
                    </div>
                    {(post.author_id === user?.id || canModerate) && (
                      <div className="relative">
                        <button
                          onClick={() => setSelectedPost(selectedPost === post.id ? null : post.id)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg"
                        >
                          <MoreVertical className="w-5 h-5 text-slate-500" />
                        </button>
                        {selectedPost === post.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-10 min-w-[150px]">
                            {canModerate && (
                              <button
                                onClick={() => { handlePinPost(post.id); setSelectedPost(null); }}
                                className="flex items-center space-x-2 w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                              >
                                <Pin className="w-4 h-4" />
                                <span>{post.is_pinned ? 'Desfixar' : 'Fixar'}</span>
                              </button>
                            )}
                            <button
                              onClick={() => { handleDeletePost(post.id); setSelectedPost(null); }}
                              className="flex items-center space-x-2 w-full px-4 py-2 text-left hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Conteúdo */}
                  <p className="mt-3 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{post.content}</p>

                  {post.image_url && (
                    <img
                      src={`${API_URL}${post.image_url}`}
                      alt=""
                      className="mt-3 rounded-lg max-h-96 w-full object-cover"
                    />
                  )}

                  {/* Reações */}
                  <div className="mt-4 flex items-center space-x-4 pt-3 border-t border-slate-200 dark:border-white/10">
                    <div className="relative">
                      <button
                        onClick={() => setShowReactions(showReactions === post.id ? null : post.id)}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors ${
                          post.user_reacted
                            ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'
                            : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {post.user_reacted ? (
                          <span className="text-lg">
                            {REACTIONS.find(r => r.type === post.user_reaction_type)?.emoji || '👍'}
                          </span>
                        ) : (
                          <ThumbsUp className="w-5 h-5" />
                        )}
                        <span className="text-sm font-medium">
                          {post.likes_count || 0}
                        </span>
                      </button>
                      {showReactions === post.id && (
                        <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 px-2 py-1 flex items-center space-x-1 z-10">
                          {REACTIONS.map((reaction) => (
                            <button
                              key={reaction.type}
                              onClick={() => handleReact(post.id, reaction.type)}
                              className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-transform hover:scale-125 ${
                                post.user_reaction_type === reaction.type ? 'bg-cyan-100 dark:bg-cyan-500/20' : ''
                              }`}
                              title={reaction.label}
                            >
                              <span className="text-xl">{reaction.emoji}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedPost(selectedPost === `comments-${post.id}` ? null : `comments-${post.id}`)}
                      className="flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">{post.comments_count || 0}</span>
                    </button>
                  </div>

                  {/* Reações detalhadas */}
                  {post.reactions && Object.keys(post.reactions).length > 0 && (
                    <div className="mt-2 flex items-center space-x-1">
                      {Object.entries(post.reactions)
                        .filter(([_, count]) => count > 0)
                        .map(([type, count]) => (
                          <span key={type} className="text-sm">
                            {REACTIONS.find(r => r.type === type)?.emoji}
                          </span>
                        ))}
                    </div>
                  )}

                  {/* Comentários */}
                  {selectedPost === `comments-${post.id}` && (
                    <div className="mt-4 space-y-3">
                      {post.comments?.map((c) => (
                        <div key={c.id} className="flex items-start space-x-2 pl-4 border-l-2 border-slate-200 dark:border-white/10">
                          {c.author_avatar ? (
                            <img
                              src={`${API_URL}${c.author_avatar}`}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-xs font-medium">
                              {c.author_name?.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="bg-slate-100 dark:bg-white/5 rounded-lg px-3 py-2">
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{c.author_name}</p>
                              <p className="text-sm text-slate-700 dark:text-slate-300">{c.content}</p>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{formatDate(c.created_at)}</p>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-start space-x-2 mt-3">
                        <input
                          type="text"
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleComment(post.id)}
                          placeholder="Escreva um comentário..."
                          className="flex-1 px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white text-sm"
                        />
                        <button
                          onClick={() => handleComment(post.id)}
                          className="p-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Load More */}
          {hasMore && posts.length > 0 && (
            <button
              onClick={loadMore}
              className="w-full py-3 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 rounded-xl font-medium transition-colors"
            >
              Carregar mais posts
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Timeline;
