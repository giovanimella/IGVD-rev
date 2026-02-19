import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
// Language context removed - translations now done in real-time
import axios from 'axios';
import {
  Home,
  BookOpen,
  Award,
  FileText,
  Users,
  Settings,
  Trophy,
  LogOut,
  Menu,
  X,
  Image,
  Megaphone,
  Target,
  Heart,
  BarChart3,
  Calendar,
  Radio,
  ShoppingCart,
  DollarSign,
  MessageCircle,
  FileCheck,
  Smartphone,
  MessagesSquare,
  LayoutDashboard,
  ShieldAlert,
  Globe,
  Tag
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [platformName, setPlatformName] = useState('IGVD');
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchBranding = async () => {
    try {
      const [logoRes, configRes] = await Promise.all([
        axios.get(`${API_URL}/api/system/logo`),
        axios.get(`${API_URL}/api/system/config`)
      ]);
      if (logoRes.data.logo_url) {
        setLogoUrl(`${API_URL}${logoRes.data.logo_url}`);
      }
      if (configRes.data.platform_name) {
        setPlatformName(configRes.data.platform_name);
      }
    } catch (error) {
      console.error('Erro ao buscar branding:', error);
    }
  };

  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const response = await axios.get(`${API_URL}/api/chat/unread-count`);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Erro ao buscar mensagens não lidas:', error);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  // Buscar contagem de mensagens não lidas periodicamente
  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'supervisor') {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000); // A cada 30 segundos
      return () => clearInterval(interval);
    }
  }, [user]);

  // Fechar menu ao mudar de rota
  useEffect(() => {
    setIsMobileOpen(false);
    // Atualizar contagem quando mudar de rota
    if (user?.role === 'admin' || user?.role === 'supervisor') {
      fetchUnreadCount();
    }
  }, [location.pathname]);

  // Prevenir scroll do body quando menu mobile está aberto
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const adminLinks = [
    { path: '/dashboard', icon: Home, label: 'Início' },
    { path: '/admin/system', icon: Settings, label: 'Painel Sistema' },
    { path: '/admin/modules', icon: BookOpen, label: 'Módulos' },
    { path: '/admin/users', icon: Users, label: 'Usuários' },
    { path: '/admin/categories', icon: Tag, label: 'Categorias' },
    { path: '/admin/campaigns', icon: Trophy, label: 'Campanhas' },
    { path: '/admin/chat', icon: MessageCircle, label: 'Atendimento' },
    { path: '/admin/company-events', icon: Calendar, label: 'Eventos Empresa' },
    { path: '/admin/rewards', icon: Award, label: 'Recompensas' },
    { path: '/admin/badges', icon: Trophy, label: 'Conquistas' },
    { path: '/admin/challenges', icon: Target, label: 'Desafios' },
    { path: '/admin/certificates', icon: Award, label: 'Certificados' },
    { path: '/admin/files', icon: FileText, label: 'Arquivos' },
    { path: '/timeline', icon: MessagesSquare, label: 'Comunidade' },
    { path: '/profile', icon: Settings, label: 'Perfil' },
  ];

  const supervisorLinks = [
    { path: '/dashboard', icon: Home, label: 'Início' },
    { path: '/supervisor/advanced', icon: LayoutDashboard, label: 'Painel Avançado' },
    { path: '/supervisor/licensees', icon: Users, label: 'Licenciados' },
    { path: '/supervisor/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/admin/chat', icon: MessageCircle, label: 'Atendimento' },
    { path: '/timeline', icon: MessagesSquare, label: 'Comunidade' },
    { path: '/modules', icon: BookOpen, label: 'Módulos' },
    { path: '/leaderboard', icon: Trophy, label: 'Ranking' },
    { path: '/profile', icon: Settings, label: 'Perfil' },
  ];

  const licenseeLinks = [
    { path: '/dashboard', icon: Home, label: 'Início' },
    { path: '/modules', icon: BookOpen, label: 'Meus Módulos' },
    { path: '/presentations', icon: Target, label: 'Apresentações' },
    { path: '/timeline', icon: MessagesSquare, label: 'Comunidade' },
    { path: '/training', icon: Users, label: 'Treinamento' },
    { path: '/sales', icon: ShoppingCart, label: 'Minhas Vendas' },
    { path: '/sales-links', icon: DollarSign, label: 'Links de Pagamento' },
    { path: '/igvd-cast', icon: Radio, label: 'IGVD Cast' },
    { path: '/agenda', icon: Calendar, label: 'Agenda' },
    { path: '/certificates', icon: Award, label: 'Certificados' },
    { path: '/rewards', icon: Award, label: 'Recompensas' },
    { path: '/favorites', icon: Heart, label: 'Favoritos' },
    { path: '/file-repository', icon: FileText, label: 'Arquivos' },
    { path: '/leaderboard', icon: Trophy, label: 'Ranking' },
    { path: '/profile', icon: Settings, label: 'Perfil' },
  ];

  const links = user?.role === 'admin' ? adminLinks : user?.role === 'supervisor' ? supervisorLinks : licenseeLinks;

  const SidebarContent = () => (
    <div className="flex flex-col h-full text-white" style={{ background: 'linear-gradient(to bottom, #3a919b, #1b4c51)' }}>
      {/* Header/Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/20 flex-shrink-0">
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt={platformName}
            className="max-h-10 max-w-[140px] object-contain brightness-0 invert"
            data-testid="sidebar-logo"
          />
        ) : (
          <>
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-outfit font-bold text-xl">{platformName.charAt(0)}</span>
            </div>
            <div>
              <h1 className="text-xl font-outfit font-bold text-white">{platformName}</h1>
            </div>
          </>
        )}
      </div>

      {/* Navigation - Scrollable */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            const showBadge = link.path === '/admin/chat' && unreadCount > 0;
            return (
              <Link
                key={link.path}
                to={link.path}
                data-testid={`sidebar-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-white/20 text-white font-medium border border-white/30'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className="truncate flex-1">{link.label}</span>
                {showBadge && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Info & Logout - Fixed at bottom */}
      <div className="px-3 py-4 border-t border-white/20 flex-shrink-0">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          {user?.profile_picture ? (
            <img 
              src={`${API_URL}${user.profile_picture}`} 
              alt="" 
              className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-white/30"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-medium">{user?.full_name?.charAt(0)}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
            <p className="text-xs text-white/60 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          data-testid="sidebar-logout-button"
          className="flex items-center gap-3 px-4 py-3 w-full text-white/80 hover:bg-red-500/30 hover:text-white rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg shadow-lg border border-white/20 text-white"
        style={{ background: '#3a919b' }}
        data-testid="mobile-menu-button"
        aria-label="Menu"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile sidebar overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-40 w-72 transform transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ maxHeight: '100vh', height: '100%', background: 'linear-gradient(to bottom, #3a919b, #1b4c51)' }}
      >
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 h-screen sticky top-0" style={{ background: 'linear-gradient(to bottom, #3a919b, #1b4c51)' }}>
        <SidebarContent />
      </aside>
    </>
  );
};

export default Sidebar;
