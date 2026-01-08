import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
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
  MessageCircle
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useChat();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const adminLinks = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/admin/modules', icon: BookOpen, label: 'Módulos' },
    { path: '/admin/users', icon: Users, label: 'Usuários' },
    { path: '/admin/rewards', icon: Award, label: 'Recompensas' },
    { path: '/admin/files', icon: FileText, label: 'Arquivos' },
    { path: '/admin/chat', icon: MessageCircle, label: 'Chat Suporte' },
    { path: '/profile', icon: Settings, label: 'Perfil' },
  ];

  const supervisorLinks = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/supervisor/licensees', icon: Users, label: 'Licenciados' },
    { path: '/modules', icon: BookOpen, label: 'Módulos' },
    { path: '/leaderboard', icon: Trophy, label: 'Ranking' },
    { path: '/admin/chat', icon: MessageCircle, label: 'Chat Suporte' },
    { path: '/profile', icon: Settings, label: 'Perfil' },
  ];

  const licenseeLinks = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/modules', icon: BookOpen, label: 'Meus Módulos' },
    { path: '/rewards', icon: Award, label: 'Recompensas' },
    { path: '/file-repository', icon: FileText, label: 'Arquivos' },
    { path: '/leaderboard', icon: Trophy, label: 'Ranking' },
    { path: '/profile', icon: Settings, label: 'Perfil' },
  ];

  const links = user?.role === 'admin' ? adminLinks : user?.role === 'supervisor' ? supervisorLinks : licenseeLinks;

  const NavLinks = () => (
    <>
      <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-200">
        <div className="w-10 h-10 rounded-lg bg-cyan-500 flex items-center justify-center">
          <span className="text-white font-outfit font-bold text-xl">O</span>
        </div>
        <div>
          <h1 className="text-xl font-outfit font-bold text-slate-900">Ozoxx</h1>
          <p className="text-xs text-slate-500">Plataforma de Treinamento</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          const isChat = link.path === '/admin/chat';
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
              {isChat && unreadCount > 0 && (
                <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-6">
        <button
          onClick={handleLogout}
          data-testid="logout-button"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
        data-testid="mobile-menu-toggle"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-slate-200 h-screen sticky top-0">
        <NavLinks />
      </aside>

      {isMobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-white z-50 flex flex-col shadow-xl">
            <NavLinks />
          </aside>
        </>
      )}
    </>
  );
};

export default Sidebar;