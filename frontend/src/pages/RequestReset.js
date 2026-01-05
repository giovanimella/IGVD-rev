import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const RequestReset = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API_URL}/api/auth/request-reset`, { email });
      setSent(true);
      toast.success('Email de redefinição enviado com sucesso!');
    } catch (error) {
      toast.error('Erro ao enviar email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-outfit font-bold text-slate-900 mb-4">Verifique seu email</h2>
          <p className="text-slate-600 mb-8">Se o email existir em nosso sistema, você receberá um link para redefinir sua senha.</p>
          <Link to="/login">
            <Button className="w-full">Voltar para Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-outfit font-bold text-slate-900 mb-2">Esqueceu a senha?</h2>
            <p className="text-slate-600">Digite seu email para receber o link de redefinição</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                data-testid="reset-email-input"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <Button
              type="submit"
              data-testid="reset-submit-button"
              disabled={loading}
              className="w-full h-12"
            >
              {loading ? 'Enviando...' : 'Enviar link de redefinição'}
            </Button>

            <div className="text-center">
              <Link to="/login" className="text-sm text-cyan-600 hover:text-cyan-700 font-medium">
                Voltar para login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RequestReset;