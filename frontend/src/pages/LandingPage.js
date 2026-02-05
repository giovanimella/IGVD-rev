import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import {
  GraduationCap,
  Trophy,
  Users,
  Award,
  Play,
  ArrowRight,
  X,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  BookOpen,
  Star,
  Zap
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Mapeamento de ícones
const iconMap = {
  'graduation-cap': GraduationCap,
  'trophy': Trophy,
  'users': Users,
  'certificate': Award,
  'award': Award,
  'book': BookOpen,
  'star': Star,
  'zap': Zap,
  'play': Play,
  'check': CheckCircle
};

const LandingPage = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Se usuário já logado, redirecionar
    if (user) {
      navigate('/dashboard');
      return;
    }
    fetchConfig();
  }, [user, navigate]);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/landing/config`);
      setConfig(response.data);
    } catch (error) {
      console.error('Erro ao carregar landing:', error);
      // Usar config padrão
      setConfig({
        hero_title_line1: 'PLATAFORMA',
        hero_title_line2: 'IGVD',
        hero_subtitle: 'SEU CAMINHO PARA O SUCESSO',
        hero_description: 'Transforme sua carreira com nossa plataforma completa de treinamento.',
        hero_button_text: 'COMEÇAR AGORA',
        primary_color: '#06b6d4',
        secondary_color: '#3b82f6',
        show_features: true,
        features_title: 'Por que escolher a IGVD?',
        features: [
          { icon: 'graduation-cap', title: 'Treinamento Completo', description: 'Módulos completos para sua formação' },
          { icon: 'trophy', title: 'Gamificação', description: 'Ganhe pontos, badges e recompensas' },
          { icon: 'users', title: 'Comunidade', description: 'Conecte-se com outros licenciados' },
          { icon: 'certificate', title: 'Certificados', description: 'Certificados reconhecidos no mercado' }
        ],
        footer_text: '© 2024 IGVD. Todos os direitos reservados.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      await login(loginData.email, loginData.password);
      setShowLoginModal(false);
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Credenciais inválidas');
    } finally {
      setLoginLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  const gradientStyle = {
    background: `linear-gradient(135deg, ${config?.primary_color || '#06b6d4'} 0%, ${config?.secondary_color || '#3b82f6'} 100%)`
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              {config?.logo_url ? (
                <img 
                  src={`${API_URL}${config.logo_url}`} 
                  alt={config?.logo_alt || 'IGVD'} 
                  className="h-10 w-auto"
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={gradientStyle}
                  >
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xl font-bold">IGVD</span>
                </div>
              )}
            </div>

            {/* Login Button */}
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-6 py-2 rounded-lg font-semibold text-white transition-all hover:opacity-90"
              style={gradientStyle}
            >
              Entrar
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-16">
        {/* Background Gradient */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(ellipse at 70% 50%, ${config?.primary_color || '#06b6d4'}40 0%, transparent 60%)`
          }}
        />
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(${config?.primary_color || '#06b6d4'} 1px, transparent 1px), linear-gradient(90deg, ${config?.primary_color || '#06b6d4'} 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="text-center lg:text-left">
              {config?.hero_subtitle && (
                <div 
                  className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold mb-6"
                  style={{ 
                    background: `${config?.primary_color || '#06b6d4'}20`,
                    color: config?.primary_color || '#06b6d4'
                  }}
                >
                  <Star className="w-4 h-4 mr-2" />
                  {config.hero_subtitle}
                </div>
              )}

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                <span className="text-white">{config?.hero_title_line1 || 'PLATAFORMA'}</span>
                <br />
                <span 
                  className="bg-clip-text text-transparent"
                  style={gradientStyle}
                >
                  {config?.hero_title_line2 || 'IGVD'}
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-400 mb-8 max-w-xl mx-auto lg:mx-0">
                {config?.hero_description || 'Transforme sua carreira com nossa plataforma completa de treinamento.'}
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="group flex items-center space-x-2 px-8 py-4 rounded-xl font-bold text-white transition-all transform hover:scale-105 shadow-lg"
                  style={{
                    ...gradientStyle,
                    boxShadow: `0 10px 40px ${config?.primary_color || '#06b6d4'}40`
                  }}
                >
                  <span>{config?.hero_button_text || 'COMEÇAR AGORA'}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                <button className="flex items-center space-x-2 px-6 py-4 rounded-xl font-semibold text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-all">
                  <Play className="w-5 h-5" />
                  <span>Ver vídeo</span>
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 mt-12 pt-12 border-t border-slate-800">
                <div className="text-center lg:text-left">
                  <div className="text-3xl font-bold" style={{ color: config?.primary_color }}>500+</div>
                  <div className="text-sm text-slate-500">Licenciados</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-3xl font-bold" style={{ color: config?.primary_color }}>50+</div>
                  <div className="text-sm text-slate-500">Módulos</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-3xl font-bold" style={{ color: config?.primary_color }}>98%</div>
                  <div className="text-sm text-slate-500">Satisfação</div>
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative hidden lg:block">
              <div 
                className="absolute -inset-4 rounded-3xl opacity-30 blur-3xl"
                style={gradientStyle}
              />
              {config?.hero_image_url ? (
                <img
                  src={`${API_URL}${config.hero_image_url}`}
                  alt="Hero"
                  className="relative rounded-3xl shadow-2xl w-full h-auto object-cover"
                />
              ) : (
                <div 
                  className="relative rounded-3xl p-12 text-center"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(6,182,212,0.1) 0%, rgba(59,130,246,0.1) 100%)',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  <GraduationCap className="w-32 h-32 mx-auto mb-6" style={{ color: config?.primary_color }} />
                  <p className="text-slate-400">Imagem principal</p>
                  <p className="text-sm text-slate-500">Configure no painel admin</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-slate-600 flex items-start justify-center p-2">
            <div 
              className="w-1.5 h-3 rounded-full"
              style={{ background: config?.primary_color }}
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      {config?.show_features && (
        <section className="py-20 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                {config?.features_title || 'Por que escolher a IGVD?'}
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Nossa plataforma oferece tudo que você precisa para alcançar o sucesso
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {(config?.features || []).map((feature, index) => {
                const IconComponent = iconMap[feature.icon] || GraduationCap;
                return (
                  <div
                    key={index}
                    className="group p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-all hover:-translate-y-1"
                  >
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                      style={{ 
                        background: `${config?.primary_color || '#06b6d4'}20`
                      }}
                    >
                      <IconComponent 
                        className="w-7 h-7" 
                        style={{ color: config?.primary_color || '#06b6d4' }}
                      />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-slate-400 text-sm">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            className="rounded-3xl p-12 text-center relative overflow-hidden"
            style={gradientStyle}
          >
            <div className="absolute inset-0 opacity-10">
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
                }}
              />
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Pronto para começar?
              </h2>
              <p className="text-white/80 mb-8 max-w-xl mx-auto">
                Junte-se a centenas de profissionais que já transformaram suas carreiras com a IGVD.
              </p>
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-8 py-4 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition-all transform hover:scale-105"
              >
                Acessar Plataforma
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              {config?.logo_url ? (
                <img 
                  src={`${API_URL}${config.logo_url}`} 
                  alt={config?.logo_alt || 'IGVD'} 
                  className="h-8 w-auto opacity-60"
                />
              ) : (
                <span className="text-slate-500 font-semibold">IGVD</span>
              )}
            </div>
            <p className="text-slate-500 text-sm text-center">
              {config?.footer_text || '© 2024 IGVD. Todos os direitos reservados.'}
            </p>
            <div className="flex items-center space-x-4">
              {(config?.footer_links || []).map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  className="text-slate-500 hover:text-white text-sm transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={gradientStyle}
                >
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Entrar</h2>
                  <p className="text-sm text-slate-500">Acesse sua conta</p>
                </div>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleLogin} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">E-mail</label>
                <input
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="seu@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent pr-12"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500" />
                  <span className="text-slate-400">Lembrar de mim</span>
                </label>
                <a href="/request-reset" className="text-cyan-500 hover:text-cyan-400">
                  Esqueceu a senha?
                </a>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center space-x-2"
                style={gradientStyle}
              >
                {loginLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Entrar</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
