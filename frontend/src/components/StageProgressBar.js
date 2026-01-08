import React from 'react';
import { CheckCircle, Circle, Lock } from 'lucide-react';

const StageProgressBar = ({ currentStage }) => {
  const stages = [
    { key: 'registro', label: 'Registro', description: 'Cadastro inicial' },
    { key: 'documentos', label: 'Documentos', description: 'Envio de documentos' },
    { key: 'pagamento', label: 'Pagamento', description: 'Taxa de licença' },
    { key: 'acolhimento', label: 'Acolhimento', description: 'Primeiros treinamentos' },
    { key: 'agendamento', label: 'Agendamento', description: 'Agendar treinamento' },
    { key: 'treinamento_presencial', label: 'Treinamento', description: 'Presencial na fábrica' },
    { key: 'vendas_campo', label: 'Vendas', description: '10 vendas em campo' },
    { key: 'completo', label: 'Completo', description: 'Acesso total' }
  ];

  const currentIndex = stages.findIndex(s => s.key === currentStage);

  const getStageStatus = (index) => {
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'current';
    return 'locked';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6" data-testid="stage-progress-bar">
      <h3 className="text-xl font-outfit font-semibold text-slate-900 mb-6">Seu Progresso no Onboarding</h3>
      
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-8 left-0 right-0 h-1 bg-slate-200">
          <div 
            className="h-full bg-cyan-500 transition-all duration-500"
            style={{ width: `${(currentIndex / (stages.length - 1)) * 100}%` }}
          />
        </div>

        {/* Stages */}
        <div className="relative grid grid-cols-4 md:grid-cols-8 gap-4">
          {stages.map((stage, index) => {
            const status = getStageStatus(index);
            return (
              <div key={stage.key} className="flex flex-col items-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 transition-all ${
                  status === 'completed' ? 'bg-green-500 text-white scale-110' :
                  status === 'current' ? 'bg-cyan-500 text-white scale-125 shadow-lg' :
                  'bg-slate-200 text-slate-400'
                }`}>
                  {status === 'completed' && <CheckCircle className="w-8 h-8" />}
                  {status === 'current' && <Circle className="w-8 h-8 animate-pulse" />}
                  {status === 'locked' && <Lock className="w-6 h-6" />}
                </div>
                <p className={`text-xs font-medium text-center ${
                  status === 'completed' ? 'text-green-600' :
                  status === 'current' ? 'text-cyan-600' :
                  'text-slate-400'
                }`}>
                  {stage.label}
                </p>
                <p className="text-xs text-slate-500 text-center mt-1 hidden md:block">
                  {stage.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Stage Info */}
      <div className="mt-8 bg-cyan-50 rounded-lg p-4 border border-cyan-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center">
            <Circle className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-cyan-700 font-medium">Etapa Atual</p>
            <p className="text-lg font-outfit font-bold text-cyan-900">
              {stages[currentIndex]?.label || 'Completo'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StageProgressBar;