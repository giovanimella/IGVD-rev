import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import { Award, Upload, Settings, Download, Eye, FileText, Users, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminCertificates = () => {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [stats, setStats] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const fileInputRef = useRef(null);

  const [configForm, setConfigForm] = useState({
    certificate_name_y_position: 400,
    certificate_date_y_position: 320
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [configRes, certsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/system/config`),
        axios.get(`${API_URL}/api/certificates/all`),
        axios.get(`${API_URL}/api/certificates/stats`)
      ]);
      
      setConfig(configRes.data);
      setConfigForm({
        certificate_name_y_position: configRes.data.certificate_name_y_position || 400,
        certificate_date_y_position: configRes.data.certificate_date_y_position || 320
      });
      setCertificates(certsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadTemplate = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Apenas arquivos PDF são aceitos');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${API_URL}/api/certificates/template/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Template enviado com sucesso!');
      fetchData();
    } catch (error) {
      console.error('Erro ao enviar template:', error);
      toast.error('Erro ao enviar template');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await axios.put(`${API_URL}/api/certificates/template/config`, configForm);
      toast.success('Configurações salvas!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestCertificate = async () => {
    setTesting(true);
    try {
      const response = await axios.post(`${API_URL}/api/certificates/template/test`, {}, {
        responseType: 'blob'
      });
      
      // Criar URL para download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'certificado_teste.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Certificado de teste gerado!');
    } catch (error) {
      console.error('Erro ao gerar teste:', error);
      toast.error('Erro ao gerar certificado de teste. Verifique se o template foi enviado.');
    } finally {
      setTesting(false);
    }
  };

  const handleDownloadCertificate = async (certId, moduleTitle) => {
    try {
      const response = await axios.get(`${API_URL}/api/certificates/download/${certId}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificado_${moduleTitle.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar certificado:', error);
      toast.error('Erro ao baixar certificado');
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
        {/* Header */}
        <div>
          <h1 className="text-3xl font-outfit font-bold text-slate-900">Certificados</h1>
          <p className="text-slate-600 mt-2">Configure o template e gerencie os certificados emitidos</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-cyan-600" />
              </div>
              <div>
                <p className="text-slate-600 text-sm">Total Emitidos</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.total_certificates || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-slate-600 text-sm">Template</p>
                <p className="text-lg font-bold text-slate-900">
                  {config?.certificate_template_path ? 'Configurado ✓' : 'Não configurado'}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-slate-600 text-sm">Módulos com Certificado</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.by_module?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Configuração do Template */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Configuração do Template</h2>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Template do Certificado (PDF A4 Horizontal)
              </label>
              <p className="text-sm text-slate-500 mb-3">
                Faça upload de um PDF em formato A4 horizontal. O sistema irá adicionar o nome do licenciado 
                e a data de conclusão sobre o template.
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleUploadTemplate}
                  accept=".pdf"
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  variant="outline"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Enviando...' : 'Enviar Template'}
                </Button>
                {config?.certificate_template_path && (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    Template configurado
                  </span>
                )}
              </div>
            </div>

            {/* Posições */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Posição Y do Nome (pixels do rodapé)
                </label>
                <input
                  type="number"
                  value={configForm.certificate_name_y_position}
                  onChange={(e) => setConfigForm({ ...configForm, certificate_name_y_position: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Distância em pixels do rodapé. Valores maiores = mais acima
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Posição Y da Data (pixels do rodapé)
                </label>
                <input
                  type="number"
                  value={configForm.certificate_date_y_position}
                  onChange={(e) => setConfigForm({ ...configForm, certificate_date_y_position: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Distância em pixels do rodapé. Geralmente menor que a do nome
                </p>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
              <Button onClick={handleSaveConfig} disabled={savingConfig}>
                {savingConfig ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
              <Button
                variant="outline"
                onClick={handleTestCertificate}
                disabled={testing || !config?.certificate_template_path}
              >
                <Eye className="w-4 h-4 mr-2" />
                {testing ? 'Gerando...' : 'Gerar Certificado Teste'}
              </Button>
            </div>
          </div>
        </div>

        {/* Certificados Emitidos */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Certificados Emitidos</h2>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>

          {certificates.length === 0 ? (
            <div className="p-12 text-center">
              <Award className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhum certificado emitido</h3>
              <p className="text-slate-600">Os certificados aparecerão aqui quando forem gerados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Licenciado</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Módulo</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Data de Conclusão</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-slate-600">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {certificates.map((cert) => (
                    <tr key={cert.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{cert.user_name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-600">{cert.module_title}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-600">
                          {new Date(cert.completion_date).toLocaleDateString('pt-BR')}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadCertificate(cert.id, cert.module_title)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Baixar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Estatísticas por Módulo */}
        {stats?.by_module?.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Certificados por Módulo</h3>
            <div className="space-y-3">
              {stats.by_module.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-slate-600">{item.module}</span>
                  <span className="font-medium text-slate-900">{item.count} certificados</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminCertificates;
