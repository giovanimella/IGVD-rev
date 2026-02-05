import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { FileText, CheckCircle, Download, X } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TermsAcceptanceModal = ({ onAccepted }) => {
  const { user, token, updateUser } = useAuth();
  const [term, setTerm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [needsAcceptance, setNeedsAcceptance] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    // Só verificar termos se o usuário estiver logado E ainda não verificou nesta sessão
    if (user && token && !checkedRef.current) {
      // Se o usuário já aceitou os termos (pelo campo do user), não precisa verificar
      if (user.terms_accepted) {
        setLoading(false);
        setNeedsAcceptance(false);
        return;
      }
      checkTerms();
    } else if (!user || !token) {
      setLoading(false);
    }
  }, [user, token]);

  const checkTerms = async () => {
    // Marcar que já verificamos para não verificar novamente nesta sessão
    checkedRef.current = true;
    
    try {
      const response = await axios.get(`${API_URL}/api/terms/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.needs_acceptance && response.data.term) {
        setTerm(response.data.term);
        setNeedsAcceptance(true);
      } else {
        setNeedsAcceptance(false);
        if (onAccepted) onAccepted();
      }
    } catch (error) {
      console.error('Erro ao verificar termos:', error);
      setNeedsAcceptance(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!accepted) {
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/terms/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Atualizar o contexto do usuário para refletir que já aceitou
      updateUser({ terms_accepted: true, terms_accepted_at: new Date().toISOString() });
      setNeedsAcceptance(false);
      if (onAccepted) onAccepted();
    } catch (error) {
      console.error('Erro ao aceitar termo:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Não mostrar se estiver carregando, não precisar de aceite, ou usuário não logado
  if (loading || !needsAcceptance || !term || !user) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-[#1b4c51] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{term.title}</h2>
              <p className="text-cyan-100 text-sm">Versão {term.version}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[50vh] overflow-y-auto">
          <div 
            className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300"
            dangerouslySetInnerHTML={{ __html: term.content }}
          />
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-white/10 px-6 py-4 bg-slate-50 dark:bg-white/5">
          <label className="flex items-start space-x-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="w-5 h-5 mt-0.5 text-cyan-500 rounded border-slate-300 focus:ring-cyan-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Eu declaro que li e aceito os termos acima descritos.
            </span>
          </label>

          <button
            onClick={handleAccept}
            disabled={!accepted || submitting}
            className={`w-full flex items-center justify-center space-x-2 py-3 rounded-xl font-medium transition-all ${
              accepted && !submitting
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600'
                : 'bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Eu declaro que li e aceito os termos</span>
              </>
            )}
          </button>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-3">
            Ao aceitar, você concorda com todos os termos e condições descritos acima.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsAcceptanceModal;
