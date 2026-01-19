import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [platformName, setPlatformName] = useState('UniOzoxx');
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSystemConfig();
  }, []);

  const fetchSystemConfig = async () => {
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
      console.error('Erro ao buscar configurações:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B0F18] p-4">
      <div className="w-full max-w-md">
        {/* Logo centralizada */}
        <div className="flex flex-col items-center mb-8">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={platformName}
              className="max-w-[200px] max-h-24 object-contain mb-4"
              data-testid="login-logo"
            />
          ) : (
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <span className="text-4xl font-outfit font-bold text-white">{platformName.charAt(0)}</span>
            </div>
          )}
          <h1 className="text-2xl font-outfit font-bold text-slate-900 dark:text-white">{platformName}</h1>
        </div>

        {/* Card de Login */}
        <div className="bg-white dark:bg-[#151B28] rounded-2xl shadow-lg border border-slate-200 dark:border-white/10 p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-outfit font-bold text-slate-900 dark:text-white mb-2">Bem-vindo de volta</h2>
            <p className="text-slate-600 dark:text-slate-400">Entre com suas credenciais para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="email" className="dark:text-slate-300">Email</Label>
              <Input
                id="email"
                type="email"
                data-testid="login-email-input"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 dark:bg-[#0B0F18] dark:border-white/10 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="dark:text-slate-300">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  data-testid="login-password-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pr-10 dark:bg-[#0B0F18] dark:border-white/10 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link to="/request-reset" className="text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium">
                Esqueceu a senha?
              </Link>
            </div>

            <Button
              type="submit"
              data-testid="login-submit-button"
              disabled={loading}
              className="w-full h-12 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
