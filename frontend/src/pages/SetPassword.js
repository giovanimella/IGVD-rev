import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [platformName, setPlatformName] = useState('IGVD');

  useEffect(() => {
    if (!token) {
      toast.error('Token inválido');
      navigate('/login');
    }
    fetchBranding();
  }, [token, navigate]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API_URL}/api/auth/set-password`, {
        token,
        new_password: password
      });
      
      setSuccess(true);
      toast.success('Senha definida com sucesso!');
      
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao definir senha');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-outfit font-bold text-slate-900 mb-2">Senha Definida!</h2>
          <p className="text-slate-600 mb-6">
            Sua senha foi configurada com sucesso. Você será redirecionado para a página de login.
          </p>
          <Button 
            onClick={() => navigate('/login')}
            className="w-full bg-cyan-500 hover:bg-cyan-600"
          >
            Ir para Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt={platformName} className="max-h-16 object-contain" />
          ) : (
            <h1 className="text-3xl font-outfit font-bold text-cyan-600">{platformName}</h1>
          )}
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-cyan-600" />
          </div>
          <h2 className="text-2xl font-outfit font-bold text-slate-900 mb-2">Defina sua Senha</h2>
          <p className="text-slate-600">
            Crie uma senha segura para acessar a plataforma
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" data-testid="set-password-form">
          <div className="space-y-2">
            <Label htmlFor="password">Nova Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 pr-10"
                data-testid="new-password-input"
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Digite a senha novamente"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="h-12"
              data-testid="confirm-password-input"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-cyan-500 hover:bg-cyan-600"
            data-testid="set-password-submit"
          >
            {loading ? 'Definindo...' : 'Definir Senha'}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Já tem uma conta?{' '}
          <a href="/login" className="text-cyan-600 hover:text-cyan-700 font-medium">
            Fazer login
          </a>
        </p>
      </div>
    </div>
  );
};

export default SetPassword;
