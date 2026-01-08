import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { Users, Upload, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users/`);
      setUsers(response.data);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleImportCSV = async () => {
    if (!csvFile) {
      toast.error('Selecione um arquivo CSV');
      return;
    }

    setImporting(true);
    const formData = new FormData();
    formData.append('file', csvFile);

    try {
      const response = await axios.post(`${API_URL}/api/users/import-csv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(response.data.message);
      if (response.data.errors && response.data.errors.length > 0) {
        console.log('Erros de importação:', response.data.errors);
      }
      setShowImportDialog(false);
      setCsvFile(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao importar usuários');
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Tem certeza que deseja deletar este usuário?')) return;

    try {
      await axios.delete(`${API_URL}/api/users/${userId}`);
      toast.success('Usuário deletado com sucesso');
      fetchUsers();
    } catch (error) {
      toast.error('Erro ao deletar usuário');
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
              <Users className="w-8 h-8 text-cyan-500" />
              Gerenciar Usuários
            </h1>
            <p className="text-slate-600 mt-2">Administre os usuários da plataforma</p>
          </div>

          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogTrigger asChild>
              <Button className="bg-cyan-500 hover:bg-cyan-600" data-testid="import-csv-button">
                <Upload className="w-4 h-4 mr-2" />
                Importar CSV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar Usuários via CSV</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Formato do CSV</Label>
                  <div className="bg-slate-50 p-3 rounded-lg mt-2 text-sm">
                    <code>email,full_name</code>
                    <br />
                    <code>joao@exemplo.com,João Silva</code>
                  </div>
                </div>
                <div>
                  <Label htmlFor="csv-file">Arquivo CSV</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files[0])}
                    className="mt-2"
                  />
                </div>
                <Button
                  onClick={handleImportCSV}
                  disabled={importing}
                  className="w-full"
                  data-testid="confirm-import-button"
                >
                  {importing ? 'Importando...' : 'Importar'}
                </Button>
                <p className="text-xs text-slate-500">
                  Os usuários receberão um email automático para definir a senha.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="users-table">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Nome</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Email</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Função</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">Pontos</th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors" data-testid={`user-row-${user.id}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
                          <span className="text-cyan-600 font-semibold text-sm">
                            {user.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{user.full_name}</p>
                          <p className="text-sm text-slate-500">{user.level_title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'supervisor' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : user.role === 'supervisor' ? 'Supervisor' : 'Licenciado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-700 font-medium">
                        {user.points}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          data-testid={`delete-user-${user.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {users.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-outfit font-semibold text-slate-900 mb-2">Nenhum usuário cadastrado</h3>
            <p className="text-slate-600">Importe usuários via CSV para começar.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminUsers;