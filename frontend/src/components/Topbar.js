import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Award, User as UserIcon, LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import LanguageSelector from './LanguageSelector';
import ThemeToggle from './ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Topbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProfile = () => {
    navigate('/profile');
  };

  return (
    <header className="bg-white dark:bg-[#0D1117] border-b border-slate-200 dark:border-white/10 px-4 lg:px-6 py-3 lg:py-4 sticky top-0 z-30">
      <div className="flex items-center justify-between">
        {/* Espaço para o botão do menu mobile */}
        <div className="lg:hidden w-12"></div>
        
        {/* Saudação - Escondida em mobile pequeno */}
        <div className="hidden sm:block">
          <h2 className="text-lg lg:text-2xl font-outfit font-semibold text-slate-900 dark:text-white">
            Bem-vindo, {user?.full_name?.split(' ')[0]}
          </h2>
          <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-500 capitalize">{user?.role}</p>
        </div>

        {/* Mobile: Nome curto */}
        <div className="sm:hidden flex-1 text-center">
          <h2 className="text-base font-outfit font-semibold text-slate-900 dark:text-white truncate px-2">
            Olá, {user?.full_name?.split(' ')[0]}
          </h2>
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          <ThemeToggle />
          <LanguageSelector />
          <NotificationBell />
          
          {user?.role === 'licenciado' && (
            <>
              {/* Pontos - Compacto em mobile */}
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/30 px-2 lg:px-4 py-1.5 lg:py-2 rounded-lg border border-amber-200 dark:border-amber-700">
                <Award className="w-4 h-4 lg:w-5 lg:h-5 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-[10px] lg:text-xs text-amber-600 dark:text-amber-400 font-medium hidden lg:block">Pontos</p>
                  <p className="text-sm lg:text-lg font-outfit font-bold text-amber-700 dark:text-amber-300" data-testid="user-points">
                    {user?.points || 0}
                  </p>
                </div>
              </div>

              {/* Nível - Escondido em mobile */}
              <div className="hidden md:flex items-center gap-2 bg-cyan-50 px-4 py-2 rounded-lg border border-cyan-200">
                {user?.profile_picture ? (
                  <img 
                    src={`${API_URL}${user.profile_picture}`} 
                    alt="" 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white font-outfit font-bold">
                    {user?.full_name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-xs text-cyan-600 font-medium">Nível</p>
                  <p className="text-sm font-outfit font-semibold text-cyan-700" data-testid="user-level">
                    {user?.level_title}
                  </p>
                </div>
              </div>

              {/* Menu do usuário */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 focus:outline-none hover:opacity-80 transition-opacity">
                    {user?.profile_picture ? (
                      <img 
                        src={`${API_URL}${user.profile_picture}`} 
                        alt="Perfil" 
                        className="w-8 h-8 lg:w-10 lg:h-10 rounded-full object-cover ring-2 ring-cyan-200 dark:ring-cyan-700 hover:ring-cyan-300 dark:hover:ring-cyan-600 transition-all cursor-pointer"
                      />
                    ) : (
                      <div className="w-8 h-8 lg:w-10 lg:h-10 bg-cyan-500 rounded-full flex items-center justify-center text-white font-outfit font-bold text-sm lg:text-lg ring-2 ring-cyan-200 dark:ring-cyan-700 hover:ring-cyan-300 dark:hover:ring-cyan-600 transition-all cursor-pointer">
                        {user?.full_name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-[#1b4c51] border-slate-200 dark:border-white/10">
                  <DropdownMenuLabel className="text-slate-900 dark:text-white">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold">{user?.full_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-200 dark:bg-white/10" />
                  <DropdownMenuItem 
                    onClick={handleProfile}
                    className="cursor-pointer text-slate-700 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-white/10 focus:text-slate-900 dark:focus:text-white"
                  >
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Meu Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-200 dark:bg-white/10" />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="cursor-pointer text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20 focus:text-red-700 dark:focus:text-red-300"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {user?.role !== 'licenciado' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 focus:outline-none hover:opacity-80 transition-opacity">
                  {user?.profile_picture ? (
                    <img 
                      src={`${API_URL}${user.profile_picture}`} 
                      alt="Perfil" 
                      className="w-8 h-8 lg:w-10 lg:h-10 rounded-full object-cover ring-2 ring-cyan-200 dark:ring-cyan-700 hover:ring-cyan-300 dark:hover:ring-cyan-600 transition-all cursor-pointer"
                    />
                  ) : (
                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-cyan-500 rounded-full flex items-center justify-center text-white font-outfit font-bold text-sm lg:text-lg ring-2 ring-cyan-200 dark:ring-cyan-700 hover:ring-cyan-300 dark:hover:ring-cyan-600 transition-all cursor-pointer">
                      {user?.full_name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-[#1b4c51] border-slate-200 dark:border-white/10">
                <DropdownMenuLabel className="text-slate-900 dark:text-white">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold">{user?.full_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-200 dark:bg-white/10" />
                <DropdownMenuItem 
                  onClick={handleProfile}
                  className="cursor-pointer text-slate-700 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-white/10 focus:text-slate-900 dark:focus:text-white"
                >
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Meu Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-200 dark:bg-white/10" />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20 focus:text-red-700 dark:focus:text-red-300"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
