import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { User, Mail, Phone, Lock, Save } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: ''
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.put(`${API_URL}/api/users/${user.id}`, {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone
      });
      
      updateUser({
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone
      });
      
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (passwordData.new_password.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      await axios.put(`${API_URL}/api/users/${user.id}/password`, {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });
      
      toast.success('Senha alterada com sucesso!');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-slate-900">Meu Perfil</h1>
          <p className="text-slate-600 mt-2">Gerencie suas informações pessoais e configurações</p>
        </div>

        {/* Profile Info Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-200">
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-3xl font-outfit font-bold text-white">
                {user?.full_name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-outfit font-bold text-slate-900">{user?.full_name}</h2>
              <p className="text-slate-600 capitalize">{user?.role}</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-6" data-testid="profile-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="full_name">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-slate-600" />
                    Nome Completo
                  </div>
                </Label>
                <Input
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  data-testid="profile-name-input"
                  required
                  className="h-12"
                />
              </div>

              <div>
                <Label htmlFor="email">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-slate-600" />
                    Email
                  </div>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  data-testid="profile-email-input"
                  required
                  className="h-12"
                />
              </div>

              <div>
                <Label htmlFor="phone">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="w-4 h-4 text-slate-600" />
                    Telefone
                  </div>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  data-testid="profile-phone-input"
                  placeholder="(11) 99999-9999"
                  className="h-12"
                />
              </div>

              {user?.role === 'licenciado' && (
                <div>
                  <Label>Pontos</Label>
                  <div className="h-12 flex items-center px-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="text-amber-700 font-semibold">{user?.points || 0} pontos</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={loading}
                data-testid="save-profile-button"
                className="bg-cyan-500 hover:bg-cyan-600"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-6 pb-6 border-b border-slate-200">
            <Lock className="w-5 h-5 text-slate-700" />
            <h3 className="text-xl font-outfit font-semibold text-slate-900">Alterar Senha</h3>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-6" data-testid="password-form">
            <div className="space-y-4">
              <div>
                <Label htmlFor="current_password">Senha Atual</Label>
                <Input
                  id="current_password"
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                  data-testid="current-password-input"
                  required
                  className="h-12"
                />
              </div>

              <div>
                <Label htmlFor="new_password">Nova Senha</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                  data-testid="new-password-input"
                  required
                  className="h-12"
                />
              </div>

              <div>
                <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                  data-testid="confirm-password-input"
                  required
                  className="h-12"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={loading}
                data-testid="save-password-button"
                variant="outline"
              >
                <Lock className="w-4 h-4 mr-2" />
                {loading ? 'Salvando...' : 'Alterar Senha'}
              </Button>
            </div>
          </form>
        </div>

        {user?.role === 'licenciado' && (
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl border border-cyan-200 p-6">
            <h3 className="text-lg font-outfit font-semibold text-slate-900 mb-4">Informações da Conta</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-slate-600 mb-1">Nível Atual</p>
                <p className="text-lg font-semibold text-slate-900">{user?.level_title}</p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-slate-600 mb-1">Membro desde</p>
                <p className="text-lg font-semibold text-slate-900">
                  {new Date(user?.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Profile;