import React from 'react';
import { CheckCircle, Circle, Lock, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const StageProgressBar = ({ currentStage }) => {
  const navigate = useNavigate();
  
  const stages = [
    { key: 'registro', label: 'Registro', description: 'Definir senha', link: null },
    { key: 'documentos_pf', label: 'Docs PF', description: 'Pessoa Física', link: '/onboarding/documents' },
    { key: 'acolhimento', label: 'Acolhimento', description: 'Primeiros treinamentos', link: '/modules' },
    { key: 'treinamento_presencial', label: 'Treinamento', description: 'Presencial na empresa', link: '/training' },
    { key: 'vendas_campo', label: 'Vendas', description: '10 vendas em campo', link: '/sales' },
    { key: 'documentos_pj', label: 'Docs PJ', description: 'Pessoa Jurídica', link: '/onboarding/documents-pj' },
    { key: 'completo', label: 'Completo', description: 'Acesso total', link: '/modules' }
  ];

  const currentIndex = stages.findIndex(s => s.key === currentStage);

  const getStageStatus = (index) => {
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'current';
    return 'locked';
  };

  const handleStageClick = () => {
    const currentStageData = stages[currentIndex];
    
    // Se estiver na etapa de registro, mostrar mensagem sobre o email
    if (currentStage === 'registro') {
      toast.info('Verifique seu email para definir sua senha e avançar para a próxima etapa.', {
        duration: 5000,
        icon: <Mail className="w-5 h-5" />
      });
      return;
    }
    
    // Para outras etapas, navegar normalmente
    if (currentStageData?.link) {
      navigate(currentStageData.link);
    }
  };

  return (
    <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/10 p-6" data-testid="stage-progress-bar">
      <h3 className="text-xl font-outfit font-semibold text-slate-900 dark:text-white mb-6">Seu Progresso no Onboarding</h3>
      
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-8 left-0 right-0 h-1 bg-slate-200 dark:bg-white/10">
          <div 
            className="h-full bg-cyan-500 transition-all duration-500"
            style={{ width: `${(currentIndex / (stages.length - 1)) * 100}%` }}
          />
        </div>

        {/* Stages */}
        <div className="relative grid grid-cols-4 md:grid-cols-7 gap-4">
          {stages.map((stage, index) => {
            const status = getStageStatus(index);
            return (
              <div key={stage.key} className="flex flex-col items-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 transition-all ${
                  status === 'completed' ? 'bg-green-500 text-white scale-110' :
                  status === 'current' ? 'bg-cyan-500 text-white scale-125 shadow-lg' :
                  'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                }`}>
                  {status === 'completed' && <CheckCircle className="w-8 h-8" />}
                  {status === 'current' && (stage.key === 'registro' ? <Mail className="w-8 h-8" /> : <Circle className="w-8 h-8 animate-pulse" />)}
                  {status === 'locked' && <Lock className="w-6 h-6" />}
                </div>
                <p className={`text-xs font-medium text-center ${
                  status === 'completed' ? 'text-green-600 dark:text-green-400' :
                  status === 'current' ? 'text-cyan-600 dark:text-cyan-400' :
                  'text-slate-400 dark:text-slate-500'
                }`}>
                  {stage.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1 hidden md:block">
                  {stage.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Stage Info */}
      <div 
        onClick={handleStageClick}
        className="mt-8 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-4 border border-cyan-100 dark:border-cyan-700/50 cursor-pointer hover:bg-cyan-100 dark:hover:bg-cyan-900/30 transition-all duration-200 hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center">
              {currentStage === 'registro' ? <Mail className="w-6 h-6 text-white" /> : <Circle className="w-6 h-6 text-white" />}
            </div>
            <div>
              {currentStage === 'registro' ? (
                <>
                  <p className="text-sm text-cyan-700 dark:text-cyan-400 font-medium">Verifique seu email</p>
                  <p className="text-lg font-outfit font-bold text-cyan-900 dark:text-cyan-300">
                    Clique no link enviado para definir sua senha
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-cyan-700 dark:text-cyan-400 font-medium">Etapa Atual - Clique para acessar</p>
                  <p className="text-lg font-outfit font-bold text-cyan-900 dark:text-cyan-300">
                    {stages[currentIndex]?.label || 'Completo'}
                  </p>
                </>
              )}
            </div>
          </div>
          {currentStage !== 'registro' && (
            <svg className="w-6 h-6 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};

export default StageProgressBar;