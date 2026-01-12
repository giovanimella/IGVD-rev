import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import { Award, Download, BookOpen, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const MyCertificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/certificates/my`);
      setCertificates(response.data);
    } catch (error) {
      console.error('Erro ao buscar certificados:', error);
      toast.error('Erro ao carregar certificados');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (certId, moduleTitle) => {
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
      
      toast.success('Download iniciado!');
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
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-outfit font-bold">Meus Certificados</h1>
              <p className="text-white/90">Seus certificados de conclusão de módulos</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-white/80">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>{certificates.length} certificado(s) conquistado(s)</span>
            </div>
          </div>
        </div>

        {/* Lista de Certificados */}
        {certificates.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Award className="w-20 h-20 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhum certificado ainda</h3>
            <p className="text-slate-600 mb-6">
              Complete módulos com certificado disponível e passe nas avaliações para receber seu certificado!
            </p>
            <Link to="/modules">
              <Button>
                <BookOpen className="w-4 h-4 mr-2" />
                Ver Módulos
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Header do Card */}
                <div className="h-32 bg-gradient-to-br from-amber-500 to-orange-600 relative flex items-center justify-center">
                  <Award className="w-16 h-16 text-white/80" />
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-1 bg-white/20 text-white rounded text-xs font-medium">
                      Certificado
                    </span>
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="p-6">
                  <h3 className="text-lg font-outfit font-semibold text-slate-900 mb-2">
                    {cert.module_title}
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Concluído em {new Date(cert.completion_date).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>

                  <Button
                    className="w-full"
                    onClick={() => handleDownload(cert.id, cert.module_title)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Certificado
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-6">
          <h3 className="font-semibold text-cyan-900 mb-2">Como obter certificados?</h3>
          <ul className="text-sm text-cyan-800 space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Complete todos os capítulos do módulo</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Passe na avaliação (se houver)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>O módulo precisa ter certificado habilitado</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Gere seu certificado na página do módulo</span>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default MyCertificates;
