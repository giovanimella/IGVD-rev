import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { BookOpen, Plus, Edit, Trash2, GraduationCap, Award } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const AdminModules = () => {
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    order: 1,
    has_certificate: false,
    points_reward: 0,
    is_acolhimento: false,
    has_assessment: false
  });

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/modules/`);
      setModules(response.data);
    } catch (error) {
      console.error('Erro ao buscar módulos:', error);
      toast.error('Erro ao carregar módulos');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      order: modules.length + 1,
      has_certificate: false,
      points_reward: 0,
      is_acolhimento: false,
      has_assessment: false
    });
  };

  const handleCreateModule = async () => {
    try {
      await axios.post(`${API_URL}/api/modules/`, formData);
      toast.success('Módulo criado com sucesso');
      setShowCreateDialog(false);
      resetForm();
      fetchModules();
    } catch (error) {
      toast.error('Erro ao criar módulo');
    }
  };

  const handleEditClick = (module) => {
    setEditingModule(module);
    setFormData({
      title: module.title,
      description: module.description,
      order: module.order,
      has_certificate: module.has_certificate,
      points_reward: module.points_reward,
      is_acolhimento: module.is_acolhimento,
      has_assessment: module.has_assessment
    });
    setShowEditDialog(true);
  };

  const handleUpdateModule = async () => {
    try {
      await axios.put(`${API_URL}/api/modules/${editingModule.id}`, formData);
      toast.success('Módulo atualizado com sucesso');
      setShowEditDialog(false);
      setEditingModule(null);
      resetForm();
      fetchModules();
    } catch (error) {
      toast.error('Erro ao atualizar módulo');
    }
  };

  const handleDeleteModule = async (moduleId) => {
    if (!window.confirm('Tem certeza que deseja deletar este módulo? Todos os capítulos serão removidos.')) return;

    try {
      await axios.delete(`${API_URL}/api/modules/${moduleId}`);
      toast.success('Módulo deletado com sucesso');
      fetchModules();
    } catch (error) {
      toast.error('Erro ao deletar módulo');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-outfit font-bold text-slate-900 flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-cyan-500" />
              Gerenciar Módulos
            </h1>
            <p className="text-slate-600 mt-2">Crie e gerencie os módulos de treinamento</p>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-cyan-500 hover:bg-cyan-600" data-testid="create-module-button" onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Módulo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Novo Módulo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="title">Título do Módulo</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Ex: Introdução aos Geradores de Ozônio"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Descreva o conteúdo do módulo..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="order">Ordem</Label>
                  <Input
                    id="order"
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="points">Pontos de Recompensa</Label>
                  <Input
                    id="points"
                    type="number"
                    value={formData.points_reward}
                    onChange={(e) => setFormData({...formData, points_reward: parseInt(e.target.value)})}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <Label htmlFor="certificate">Possui Certificado</Label>
                    <p className="text-sm text-slate-500">Gerar certificado ao completar</p>
                  </div>
                  <Switch
                    id="certificate"
                    checked={formData.has_certificate}
                    onCheckedChange={(checked) => setFormData({...formData, has_certificate: checked})}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                  <div>
                    <Label htmlFor="acolhimento">Módulo de Acolhimento</Label>
                    <p className="text-sm text-cyan-600">Liberado após pagamento inicial</p>
                  </div>
                  <Switch
                    id="acolhimento"
                    checked={formData.is_acolhimento}
                    onCheckedChange={(checked) => setFormData({...formData, is_acolhimento: checked})}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div>
                    <Label htmlFor="assessment">Possui Avaliação</Label>
                    <p className="text-sm text-amber-600">Criar avaliação para este módulo</p>
                  </div>
                  <Switch
                    id="assessment"
                    checked={formData.has_assessment}
                    onCheckedChange={(checked) => setFormData({...formData, has_assessment: checked})}
                  />
                </div>
                <Button onClick={handleCreateModule} className="w-full" data-testid="submit-module-button">
                  Criar Módulo
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <div key={module.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-lg transition-all" data-testid={`module-item-${module.id}`}>
              <div className="h-32 bg-gradient-to-br from-cyan-500 to-blue-600 relative">
                <div className="absolute top-3 right-3 flex gap-2">
                  {module.is_acolhimento && (
                    <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded text-xs font-medium">
                      Acolhimento
                    </span>
                  )}
                  {module.has_certificate && (
                    <span className="px-2 py-1 bg-white/90 text-slate-700 rounded text-xs font-medium flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      Certificado
                    </span>
                  )}
                </div>
                <div className="absolute bottom-3 left-3 text-white">
                  <p className="text-sm opacity-90">Ordem: {module.order}</p>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-lg font-outfit font-semibold text-slate-900 mb-2">{module.title}</h3>
                <p className="text-slate-600 text-sm mb-4 line-clamp-2">{module.description}</p>
                
                <div className="flex items-center justify-between text-sm mb-4">
                  <span className="text-slate-600">{module.chapters_count || 0} capítulos</span>
                  {module.points_reward > 0 && (
                    <span className="flex items-center gap-1 text-amber-600 font-medium">
                      <Award className="w-4 h-4" />
                      {module.points_reward} pts
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/admin/module/${module.id}/chapters`)}
                    className="flex-1"
                  >
                    Capítulos
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditClick(module)}
                    data-testid={`edit-module-${module.id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteModule(module.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Módulo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="edit-title">Título do Módulo</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Descrição</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="edit-order">Ordem</Label>
                <Input
                  id="edit-order"
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label htmlFor="edit-points">Pontos de Recompensa</Label>
                <Input
                  id="edit-points"
                  type="number"
                  value={formData.points_reward}
                  onChange={(e) => setFormData({...formData, points_reward: parseInt(e.target.value)})}
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <Label>Possui Certificado</Label>
                  <p className="text-sm text-slate-500">Gerar certificado ao completar</p>
                </div>
                <Switch
                  checked={formData.has_certificate}
                  onCheckedChange={(checked) => setFormData({...formData, has_certificate: checked})}
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                <div>
                  <Label>Módulo de Acolhimento</Label>
                  <p className="text-sm text-cyan-600">Liberado após pagamento inicial</p>
                </div>
                <Switch
                  checked={formData.is_acolhimento}
                  onCheckedChange={(checked) => setFormData({...formData, is_acolhimento: checked})}
                />
              </div>
              <Button onClick={handleUpdateModule} className="w-full">
                Salvar Alterações
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {modules.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-outfit font-semibold text-slate-900 mb-2">Nenhum módulo cadastrado</h3>
            <p className="text-slate-600 mb-6">Crie seu primeiro módulo para começar.</p>
            <Button onClick={() => setShowCreateDialog(true)} className="bg-cyan-500 hover:bg-cyan-600">
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Módulo
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminModules;