import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { User, Mail, Phone, Lock, Save, Camera, Trash2, Upload } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);
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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    // Validar tipo
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      toast.error('Formato inválido. Use JPG, PNG, GIF ou WebP');
      return;
    }

    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/api/profile/picture`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      updateUser({ profile_picture: response.data.profile_picture });
      toast.success('Foto atualizada com sucesso!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao enviar foto');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm('Remover sua foto de perfil?')) return;

    try {
      await axios.delete(`${API_URL}/api/profile/picture`);
      updateUser({ profile_picture: null });
      toast.success('Foto removida');
    } catch (error) {
      toast.error('Erro ao remover foto');
    }
  };

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
          <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">Meu Perfil</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Gerencie suas informações pessoais e configurações</p>
        </div>

        {/* Profile Info Card */}
        <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-6">
          <div className="flex items-center gap-6 mb-6 pb-6 border-b border-slate-200 dark:border-white/10">
            {/* Profile Picture */}
            <div className="relative group">
              {user?.profile_picture ? (
                <img
                  src={`${API_URL}${user.profile_picture}`}
                  alt="Foto de perfil"
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                  data-testid="profile-picture"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                  <span className="text-4xl font-outfit font-bold text-white">
                    {user?.full_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              
              {/* Upload Overlay */}
              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="p-2 bg-white rounded-full hover:bg-slate-100 transition-colors"
                  data-testid="upload-photo-button"
                >
                  {uploadingPhoto ? (
                    <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-slate-700" />
                  )}
                </button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handlePhotoUpload}
                className="hidden"
                data-testid="photo-input"
              />
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-outfit font-bold text-slate-900 dark:text-white">{user?.full_name}</h2>
              <p className="text-slate-600 dark:text-slate-400 capitalize">{user?.role}</p>
              
              {/* Photo Actions */}
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  data-testid="change-photo-btn"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {user?.profile_picture ? 'Alterar Foto' : 'Adicionar Foto'}
                </Button>
                
                {user?.profile_picture && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRemovePhoto}
                    className="text-red-600 hover:bg-red-50 hover:border-red-200"
                    data-testid="remove-photo-btn"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remover
                  </Button>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-6" data-testid="profile-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="full_name">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <span className="text-slate-900 dark:text-white">Nome Completo</span>
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
                    <Mail className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <span className="text-slate-900 dark:text-white">Email</span>
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
                    <Phone className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <span className="text-slate-900 dark:text-white">Telefone</span>
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
                  <div className="h-12 flex items-center px-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg">
                    <span className="text-amber-700 dark:text-amber-400 font-semibold">{user?.points || 0} pontos</span>
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
        <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-6">
          <div className="flex items-center gap-2 mb-6 pb-6 border-b border-slate-200 dark:border-white/10">
            <Lock className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            <h3 className="text-xl font-outfit font-semibold text-slate-900 dark:text-white">Alterar Senha</h3>
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
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl border border-cyan-200 dark:border-cyan-700/30 p-6">
            <h3 className="text-lg font-outfit font-semibold text-slate-900 dark:text-white mb-4">Informações da Conta</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-[#1b4c51] rounded-lg p-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Nível Atual</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{user?.level_title}</p>
              </div>
              <div className="bg-white dark:bg-[#1b4c51] rounded-lg p-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Membro desde</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
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
