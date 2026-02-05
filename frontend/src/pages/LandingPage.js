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
  ArrowRight,
  X,
  Eye,
  EyeOff,
  Loader2,
  BookOpen,
  Star,
  Zap,
  CheckCircle
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
      setConfig({
        hero_title_line1: 'PLATAFORMA',
        hero_title_line2: 'IGVD',
        hero_subtitle: 'SEU CAMINHO PARA O SUCESSO',
        hero_description: 'Transforme sua carreira com nossa plataforma completa de treinamento.',
        hero_button_text: 'COMEÇAR AGORA',
        background_color: '#ffffff',
        primary_color: '#06b6d4',
        secondary_color: '#3b82f6',
        accent_color: '#f97316',
        text_color: '#1e293b',
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  const primaryColor = config?.primary_color || '#06b6d4';
  const secondaryColor = config?.secondary_color || '#3b82f6';
  const accentColor = config?.accent_color || '#f97316';
  const backgroundColor = config?.background_color || '#ffffff';
  const textColor = config?.text_color || '#1e293b';

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              {config?.logo_url ? (
                <img 
                  src={`${API_URL}${config.logo_url}`} 
                  alt={config?.logo_alt || 'IGVD'} 
                  className="h-12 w-auto"
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
                  >
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold" style={{ color: textColor }}>IGVD</span>
                </div>
              )}
            </div>

            {/* Login Button */}
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-8 py-3 rounded-full font-semibold text-white transition-all hover:opacity-90 hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
            >
              Entrar
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text Content - Left Side */}
            <div className="text-left">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-4">
                <span style={{ color: textColor }}>{config?.hero_title_line1 || 'PLATAFORMA'}</span>
                <br />
                <span style={{ color: primaryColor }}>
                  {config?.hero_title_line2 || 'IGVD'}
                </span>
              </h1>

              {config?.hero_subtitle && (
                <p className="text-xl font-semibold mb-6" style={{ color: textColor }}>
                  {config.hero_subtitle}
                </p>
              )}

              <p className="text-lg mb-8 max-w-lg" style={{ color: '#64748b' }}>
                {config?.hero_description || 'Transforme sua carreira com nossa plataforma completa de treinamento.'}
              </p>

              <button
                onClick={() => setShowLoginModal(true)}
                className="group inline-flex items-center space-x-2 px-8 py-4 rounded-full font-bold text-white transition-all transform hover:scale-105 shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  boxShadow: `0 10px 40px ${primaryColor}40`
                }}
              >
                <span>{config?.hero_button_text || 'COMEÇAR AGORA'}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Image/Shapes - Right Side */}
            <div className="relative hidden lg:block h-[600px]">
              {/* Decorative Shapes */}
              <div 
                className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full"
                style={{ 
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  transform: 'translate(20%, -10%)'
                }}
              />
              <div 
                className="absolute bottom-20 right-20 w-32 h-32 rounded-full opacity-80"
                style={{ backgroundColor: primaryColor }}
              />
              <div 
                className="absolute top-40 right-0 w-20 h-20 rounded-full opacity-60"
                style={{ backgroundColor: secondaryColor }}
              />
              <div 
                className="absolute bottom-10 right-60 w-16 h-16 rounded-full border-4"
                style={{ borderColor: primaryColor }}
              />

              {/* Hero Image */}
              {config?.hero_image_url ? (
                <img
                  src={`${API_URL}${config.hero_image_url}`}
                  alt="Hero"
                  className="absolute bottom-0 right-10 z-10 max-h-[550px] w-auto object-contain"
                  style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.15))' }}
                />
              ) : (
                <div className="absolute bottom-0 right-20 z-10 w-80 h-96 rounded-2xl flex flex-col items-center justify-center text-center p-6"
                  style={{ 
                    background: 'rgba(255,255,255,0.9)',
                    border: `2px dashed ${primaryColor}40`
                  }}
                >
                  <GraduationCap className="w-20 h-20 mb-4" style={{ color: primaryColor }} />
                  <p className="font-medium" style={{ color: textColor }}>Imagem Principal</p>
                  <p className="text-sm text-slate-400 mt-1">Configure no painel admin</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      {config?.show_features && (
        <section className="py-20" style={{ backgroundColor }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: textColor }}>
                {config?.features_title || 'Por que escolher a IGVD?'}
              </h2>
              <p style={{ color: '#64748b' }} className="max-w-2xl mx-auto">
                Nossa plataforma oferece tudo que você precisa para alcançar o sucesso
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {(config?.features || []).map((feature, index) => {
                const IconComponent = iconMap[feature.icon] || GraduationCap;
                return (
                  <div
                    key={index}
                    className="group p-6 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 transition-all hover:-translate-y-1 shadow-sm hover:shadow-lg"
                  >
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${primaryColor}15` }}
                    >
                      <IconComponent className="w-7 h-7" style={{ color: primaryColor }} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: textColor }}>{feature.title}</h3>
                    <p className="text-sm" style={{ color: '#64748b' }}>{feature.description}</p>
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
            style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
          >
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
                Pronto para começar?
              </h2>
              <p className="text-white/80 mb-8 max-w-xl mx-auto">
                Junte-se a centenas de profissionais que já transformaram suas carreiras.
              </p>
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-8 py-4 bg-white rounded-full font-bold transition-all transform hover:scale-105"
                style={{ color: primaryColor }}
              >
                Acessar Plataforma
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-200" style={{ backgroundColor }}>
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
                <span className="font-semibold" style={{ color: '#94a3b8' }}>IGVD</span>
              )}
            </div>
            <p className="text-sm text-center" style={{ color: '#94a3b8' }}>
              {config?.footer_text || '© 2024 IGVD. Todos os direitos reservados.'}
            </p>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
                >
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: textColor }}>Entrar</h2>
                  <p className="text-sm text-slate-500">Acesse sua conta</p>
                </div>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleLogin} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">E-mail</label>
                <input
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': primaryColor }}
                  placeholder="seu@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent pr-12"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 focus:ring-2"
                    style={{ accentColor: primaryColor }}
                  />
                  <span className="text-slate-500">Lembrar de mim</span>
                </label>
                <a href="/request-reset" className="hover:underline" style={{ color: primaryColor }}>
                  Esqueceu a senha?
                </a>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center space-x-2"
                style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
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
