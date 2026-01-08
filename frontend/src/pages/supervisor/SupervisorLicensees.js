import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Search, CheckCircle, XCircle, Award, BookOpen, Mail, Phone, Link as LinkIcon, Copy } from 'lucide-react';
import { toast } from 'sonner';

const SupervisorLicensees = () => {
  const { user } = useAuth();
  const [licensees, setLicensees] = useState([]);
  const [filteredLicensees, setFilteredLicensees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [registrationLink, setRegistrationLink] = useState('');

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchLicensees();
    fetchRegistrationLink();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = licensees.filter(
        (l) =>
          l.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredLicensees(filtered);
    } else {
      setFilteredLicensees(licensees);
    }
  }, [searchTerm, licensees]);

  const fetchLicensees = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users`);
      const licenseesData = response.data.filter((u) => u.role === 'licenciado');
      setLicensees(licenseesData);
      setFilteredLicensees(licenseesData);
    } catch (error) {
      console.error('Erro ao buscar licenciados:', error);
      toast.error('Erro ao carregar licenciados');
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrationLink = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/onboarding/supervisor-links/my`);
      const link = `${window.location.origin}/register/${response.data.token}`;
      setRegistrationLink(link);
    } catch (error) {
      console.error('Erro ao buscar link:', error);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(registrationLink);
    toast.success('Link copiado!');
  };

  const getStageLabel = (stage) => {
    const stages = {
      registro: 'Registro',
      documentos: 'Documentos',
      pagamento: 'Pagamento',
      acolhimento: 'Acolhimento',
      treinamento: 'Treinamento',
      vendas: 'Vendas em Campo',
      completo: 'Completo'
    };
    return stages[stage] || stage;
  };

  const getStageColor = (stage) => {
    const colors = {
      registro: 'bg-gray-100 text-gray-800',
      documentos: 'bg-blue-100 text-blue-800',
      pagamento: 'bg-yellow-100 text-yellow-800',
      acolhimento: 'bg-purple-100 text-purple-800',
      treinamento: 'bg-indigo-100 text-indigo-800',
      vendas: 'bg-orange-100 text-orange-800',
      completo: 'bg-green-100 text-green-800'
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
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
        <div>
          <h1 className="text-3xl font-outfit font-bold text-slate-900">Meus Licenciados</h1>
          <p className="text-slate-600 mt-2">Gerencie os licenciados vinculados a você</p>
        </div>

        {/* Link de Registro */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-3">
                <LinkIcon className="w-6 h-6" />
                <h3 className="text-xl font-outfit font-semibold">Link de Cadastro</h3>
              </div>
              <p className="text-cyan-50 mb-4">
                Compartilhe este link para que novos licenciados se cadastrem vinculados a você
              </p>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 flex items-center justify-between">
                <code className="text-sm text-white font-mono truncate flex-1 mr-3">
                  {registrationLink}
                </code>
                <button
                  onClick={copyLink}
                  className="bg-white text-cyan-600 hover:bg-cyan-50 px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copiar</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Busca */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm mb-1">Total de Licenciados</p>
                <p className="text-3xl font-outfit font-bold text-slate-900">{licensees.length}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm mb-1">Completos</p>
                <p className="text-3xl font-outfit font-bold text-slate-900">
                  {licensees.filter((l) => l.current_stage === 'completo').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm mb-1">Em Treinamento</p>
                <p className="text-3xl font-outfit font-bold text-slate-900">
                  {licensees.filter((l) => l.current_stage !== 'completo').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Licenciados */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Licenciado</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Contato</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Etapa</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Pontos</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Nível</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLicensees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">
                        {searchTerm ? 'Nenhum licenciado encontrado' : 'Nenhum licenciado cadastrado ainda'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredLicensees.map((licensee) => (
                    <tr key={licensee.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-slate-900">{licensee.full_name}</p>
                          <p className="text-sm text-slate-500">{licensee.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-1">
                          {licensee.email && (
                            <div className="flex items-center text-sm text-slate-600">
                              <Mail className="w-4 h-4 mr-2" />
                              {licensee.email}
                            </div>
                          )}
                          {licensee.phone && (
                            <div className="flex items-center text-sm text-slate-600">
                              <Phone className="w-4 h-4 mr-2" />
                              {licensee.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStageColor(
                            licensee.current_stage || 'registro'
                          )}`}
                        >
                          {getStageLabel(licensee.current_stage || 'registro')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Award className="w-5 h-5 text-amber-500" />
                          <span className="font-semibold text-slate-900">{licensee.points || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-900 font-medium">{licensee.level_title || 'Iniciante'}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SupervisorLicensees;
