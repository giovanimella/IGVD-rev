import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { Video, Save, Power, Gift, Users, Link, Loader, CheckCircle, Clock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

const AdminLive = () => {
  const [settings, setSettings] = useState(null);
  const [participations, setParticipations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, participationsRes] = await Promise.all([
        axios.get(`${API_URL}/api/live/admin/settings`),
        axios.get(`${API_URL}/api/live/admin/participations`)
      ]);
      setSettings(settingsRes.data);
      setParticipations(participationsRes.data);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/live/admin/settings`, {
        title: settings.title,
        description: settings.description,
        meeting_link: settings.meeting_link,
        points_reward: settings.points_reward
      });
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      const response = await axios.post(`${API_URL}/api/live/admin/toggle`);
      setSettings(prev => ({ ...prev, is_active: response.data.is_active }));
      toast.success(response.data.message);
    } catch (error) {
      toast.error('Erro ao alterar status da live');
    } finally {
      setToggling(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Loader className="animate-spin h-12 w-12 text-cyan-500" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-outfit font-bold text-slate-900">Gerenciar Live</h1>
            <p className="text-slate-600 mt-1">Configure as lives semanais e acompanhe as participações</p>
          </div>
          
          {/* Botão Ativar/Desativar */}
          <Button
            onClick={handleToggle}
            disabled={toggling}
            className={settings?.is_active 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-green-500 hover:bg-green-600'
            }
          >
            {toggling ? (
              <Loader className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Power className="w-4 h-4 mr-2" />
            )}
            {settings?.is_active ? 'Desativar Live' : 'Ativar Live'}
          </Button>
        </div>

        {/* Status Card */}
        <div className={`rounded-xl p-6 ${
          settings?.is_active 
            ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white' 
            : 'bg-slate-100 text-slate-700'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
              settings?.is_active ? 'bg-white/20' : 'bg-slate-200'
            }`}>
              <Video className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">{settings?.title || 'Live Semanal'}</h2>
                {settings?.is_active && (
                  <span className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full text-sm">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    AO VIVO
                  </span>
                )}
              </div>
              <p className={settings?.is_active ? 'text-white/80' : 'text-slate-500'}>
                {settings?.is_active 
                  ? `${settings?.today_participations || 0} participações hoje`
                  : 'Live desativada'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Configurações */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <h2 className="text-xl font-outfit font-semibold text-slate-900 flex items-center gap-2">
            <Video className="w-5 h-5 text-cyan-500" />
            Configurações da Live
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Título da Live
              </label>
              <input
                type="text"
                value={settings?.title || ''}
                onChange={(e) => setSettings({...settings, title: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                placeholder="Ex: Live Semanal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Gift className="w-4 h-4 inline mr-1" />
                Pontos por Participação
              </label>
              <input
                type="number"
                value={settings?.points_reward || 10}
                onChange={(e) => setSettings({...settings, points_reward: parseInt(e.target.value)})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Descrição (opcional)
            </label>
            <input
              type="text"
              value={settings?.description || ''}
              onChange={(e) => setSettings({...settings, description: e.target.value})}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
              placeholder="Ex: Toda terça-feira às 20h"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Link className="w-4 h-4 inline mr-1" />
              Link do Google Meet
            </label>
            <input
              type="url"
              value={settings?.meeting_link || ''}
              onChange={(e) => setSettings({...settings, meeting_link: e.target.value})}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
            />
            <p className="text-xs text-slate-500 mt-1">
              Cole aqui o link da sua reunião do Google Meet
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="bg-cyan-500 hover:bg-cyan-600">
              {saving ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configurações
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Participações Recentes */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-outfit font-semibold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-500" />
              Participações Recentes ({participations.length})
            </h2>
          </div>

          {participations.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Nenhuma participação registrada ainda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Usuário</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Pontos</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Data/Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {participations.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900">{p.user_name}</p>
                          <p className="text-sm text-slate-500">{p.user_email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1 text-green-600 font-medium">
                          <Gift className="w-4 h-4" />
                          +{p.points_earned}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {formatDate(p.participated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminLive;
