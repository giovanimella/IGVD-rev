import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
  MessageCircle,
  Image,
  Megaphone,
  Target,
  Heart,
  BarChart3
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    fetchLogo();
  }, []);

  const fetchLogo = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/system/logo`);
      if (response.data.logo_url) {
        setLogoUrl(`${API_URL}${response.data.logo_url}`);
      }
    } catch (error) {
      console.error('Erro ao buscar logo:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const adminLinks = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/admin/system', icon: Settings, label: 'Painel Sistema' },
    { path: '/admin/modules', icon: BookOpen, label: 'Módulos' },
    { path: '/admin/users', icon: Users, label: 'Usuários' },
    { path: '/admin/rewards', icon: Award, label: 'Recompensas' },
    { path: '/admin/badges', icon: Trophy, label: 'Badges' },
    { path: '/admin/challenges', icon: Target, label: 'Desafios' },
    { path: '/admin/certificates', icon: Award, label: 'Certificados' },
    { path: '/admin/files', icon: FileText, label: 'Arquivos' },
    { path: '/admin/banners', icon: Image, label: 'Banners' },
    { path: '/admin/posts', icon: Megaphone, label: 'Comunicados' },
    { path: '/profile', icon: Settings, label: 'Perfil' },
  ];

  const supervisorLinks = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/supervisor/licensees', icon: Users, label: 'Licenciados' },
    { path: '/supervisor/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/modules', icon: BookOpen, label: 'Módulos' },
    { path: '/leaderboard', icon: Trophy, label: 'Ranking' },
    { path: '/profile', icon: Settings, label: 'Perfil' },
  ];

  const licenseeLinks = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/modules', icon: BookOpen, label: 'Meus Módulos' },
    { path: '/certificates', icon: Award, label: 'Certificados' },
    { path: '/rewards', icon: Award, label: 'Recompensas' },
    { path: '/favorites', icon: Heart, label: 'Favoritos' },
    { path: '/file-repository', icon: FileText, label: 'Arquivos' },
    { path: '/leaderboard', icon: Trophy, label: 'Ranking' },
    { path: '/profile', icon: Settings, label: 'Perfil' },
  ];

  const links = user?.role === 'admin' ? adminLinks : user?.role === 'supervisor' ? supervisorLinks : licenseeLinks;

  const NavLinks = () => (
    <>
      <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-200">
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt="UniOzoxx" 
            className="max-h-10 max-w-[140px] object-contain"
            data-testid="sidebar-logo"
          />
        ) : (
          <>
            <div className="w-10 h-10 rounded-lg bg-cyan-500 flex items-center justify-center">
              <span className="text-white font-outfit font-bold text-xl">U</span>
            </div>
            <div>
              <h1 className="text-xl font-outfit font-bold text-slate-900">UniOzoxx</h1>
            </div>
          </>
        )}
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              data-testid={`sidebar-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
                isActive
                  ? 'bg-cyan-50 text-cyan-600 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-slate-200">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          {user?.profile_picture ? (
            <img 
              src={`${API_URL}${user.profile_picture}`} 
              alt="" 
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <span className="text-white font-medium">{user?.full_name?.charAt(0)}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{user?.full_name}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          data-testid="sidebar-logout-button"
          className="flex items-center gap-3 px-4 py-3 w-full text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg border border-slate-200"
        data-testid="mobile-menu-button"
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

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 lg:transform-none ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <NavLinks />
      </aside>
    </>
  );
};

export default Sidebar;
