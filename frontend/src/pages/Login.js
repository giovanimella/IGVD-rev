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
  const { login } = useAuth();
  const navigate = useNavigate();

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
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-cyan-500 to-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 flex flex-col justify-center items-center text-white px-12">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt="UniOzoxx" 
              className="max-w-xs max-h-32 object-contain mb-8"
              data-testid="login-logo"
            />
          ) : (
            <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-6">
              <span className="text-4xl font-outfit font-bold">U</span>
            </div>
          )}
          <h1 className="text-5xl font-outfit font-bold mb-4">UniOzoxx</h1>
          <div className="mt-8 space-y-4 text-center">
            <p className="text-white/80">Aprenda, Cresça e Conquiste Recompensas</p>
          </div>
        </div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl"></div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            {/* Logo no mobile */}
            <div className="lg:hidden flex justify-center mb-6">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="UniOzoxx" 
                  className="max-w-[200px] max-h-20 object-contain"
                />
              ) : (
                <h1 className="text-2xl font-outfit font-bold text-cyan-600">UniOzoxx</h1>
              )}
            </div>
            
            <div className="text-center mb-8">
              <h2 className="text-3xl font-outfit font-bold text-slate-900 mb-2">Bem-vindo de volta</h2>
              <p className="text-slate-600">Entre com suas credenciais para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  data-testid="login-email-input"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    data-testid="login-password-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 pr-10"
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

              <div className="flex items-center justify-end">
                <Link to="/request-reset" className="text-sm text-cyan-600 hover:text-cyan-700 font-medium">
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
    </div>
  );
};

export default Login;
