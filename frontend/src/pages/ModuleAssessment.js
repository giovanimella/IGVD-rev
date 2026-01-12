import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, Circle, Clock, Award, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ModuleAssessment = () => {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const [module, setModule] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [previousResult, setPreviousResult] = useState(null);

  useEffect(() => {
    fetchData();
  }, [moduleId]);

  const fetchData = async () => {
    try {
      // Buscar módulo
      const moduleRes = await axios.get(`${API_URL}/api/modules/${moduleId}`);
      setModule(moduleRes.data);
      
      // Buscar avaliação
      const assessmentRes = await axios.get(`${API_URL}/api/assessments/module/${moduleId}`);
      if (assessmentRes.data) {
        setAssessment(assessmentRes.data);
        
        // Verificar se já tem resultado anterior
        const resultRes = await axios.get(`${API_URL}/api/assessments/results/module/${moduleId}`);
        if (resultRes.data && resultRes.data.passed) {
          setPreviousResult(resultRes.data);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar avaliação');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (questionId, option, questionType) => {
    if (questionType === 'single_choice') {
      setAnswers({
        ...answers,
        [questionId]: [option]
      });
    } else {
      // Multiple choice - toggle selection
      const current = answers[questionId] || [];
      if (current.includes(option)) {
        setAnswers({
          ...answers,
          [questionId]: current.filter(a => a !== option)
        });
      } else {
        setAnswers({
          ...answers,
          [questionId]: [...current, option]
        });
      }
    }
  };

  const handleSubmit = async () => {
    // Validar se todas as perguntas foram respondidas
    const unanswered = assessment.questions.filter(q => !answers[q.id] || answers[q.id].length === 0);
    if (unanswered.length > 0) {
      toast.error(`Responda todas as perguntas. Faltam ${unanswered.length} pergunta(s).`);
      return;
    }

    setSubmitting(true);
    try {
      const submission = {
        assessment_id: assessment.id,
        answers: assessment.questions.map(q => ({
          question_id: q.id,
          answers: answers[q.id] || []
        }))
      };

      const response = await axios.post(`${API_URL}/api/assessments/submit`, submission);
      setResult(response.data);
      
      if (response.data.passed) {
        toast.success('Parabéns! Você foi aprovado!');
      } else {
        toast.error('Você não atingiu a nota mínima. Tente novamente!');
      }
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error);
      toast.error('Erro ao enviar avaliação');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setAnswers({});
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

  if (!assessment) {
    return (
      <Layout>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-outfit font-bold text-slate-900 mb-2">Avaliação não disponível</h2>
          <p className="text-slate-600 mb-6">Este módulo ainda não possui avaliação configurada.</p>
          <Button onClick={() => navigate(`/modules/${moduleId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Módulo
          </Button>
        </div>
      </Layout>
    );
  }

  // Se já passou anteriormente
  if (previousResult && !result) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-8 text-center">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-outfit font-bold text-green-800 mb-2">Você já foi aprovado!</h2>
            <p className="text-green-700 mb-6">
              Você completou esta avaliação em {new Date(previousResult.completed_at).toLocaleDateString('pt-BR')}
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => navigate(`/modules/${moduleId}`)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Módulo
              </Button>
              <Button onClick={() => navigate('/modules')}>
                Ver outros Módulos
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Mostrar resultado
  if (result) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Resultado Header */}
          <div className={`rounded-2xl p-8 text-center ${
            result.passed 
              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200' 
              : 'bg-gradient-to-br from-red-50 to-orange-50 border border-red-200'
          }`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
              result.passed ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {result.passed ? (
                <CheckCircle className="w-10 h-10 text-white" />
              ) : (
                <AlertCircle className="w-10 h-10 text-white" />
              )}
            </div>
            
            <h2 className={`text-3xl font-outfit font-bold mb-2 ${
              result.passed ? 'text-green-800' : 'text-red-800'
            }`}>
              {result.passed ? 'Parabéns! Você passou!' : 'Não foi dessa vez...'}
            </h2>
            
            <p className={`text-lg mb-6 ${result.passed ? 'text-green-700' : 'text-red-700'}`}>
              {result.passed 
                ? 'Você concluiu a avaliação com sucesso!' 
                : 'Revise o conteúdo e tente novamente.'}
            </p>

            <div className="flex justify-center gap-8 mb-6">
              <div className="text-center">
                <p className="text-sm text-slate-600">Sua Nota</p>
                <p className={`text-4xl font-bold ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                  {result.percentage}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-600">Nota Mínima</p>
                <p className="text-4xl font-bold text-slate-600">
                  {result.minimum_passing_score}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-600">Pontos</p>
                <p className="text-4xl font-bold text-slate-600">
                  {result.score}/{result.total_points}
                </p>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              {result.passed ? (
                <>
                  <Button variant="outline" onClick={() => navigate(`/modules/${moduleId}`)}>
                    Voltar ao Módulo
                  </Button>
                  <Button onClick={() => navigate('/modules')}>
                    Continuar Estudando
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => navigate(`/modules/${moduleId}`)}>
                    Revisar Conteúdo
                  </Button>
                  <Button onClick={handleRetry}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Tentar Novamente
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Detalhes das Respostas */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">Detalhes das Respostas</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {result.answers.map((answer, index) => (
                <div key={index} className={`p-6 ${answer.is_correct ? 'bg-green-50/50' : 'bg-red-50/50'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      answer.is_correct ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {answer.is_correct ? (
                        <CheckCircle className="w-5 h-5 text-white" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 mb-2">{answer.question_text}</p>
                      <div className="space-y-1 text-sm">
                        <p className="text-slate-600">
                          <span className="font-medium">Sua resposta:</span>{' '}
                          <span className={answer.is_correct ? 'text-green-700' : 'text-red-700'}>
                            {answer.user_answers?.join(', ') || 'Não respondida'}
                          </span>
                        </p>
                        {!answer.is_correct && (
                          <p className="text-green-700">
                            <span className="font-medium">Resposta correta:</span>{' '}
                            {answer.correct_answers?.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-medium ${answer.is_correct ? 'text-green-600' : 'text-red-600'}`}>
                        {answer.points}/{answer.max_points} pts
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Formulário de avaliação
  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`/modules/${moduleId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-8 text-white">
          <h1 className="text-3xl font-outfit font-bold mb-2">Avaliação: {module?.title}</h1>
          <p className="text-white/90 mb-4">{assessment.description}</p>
          <div className="flex items-center gap-6 text-white/80">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>{assessment.questions?.length || 0} perguntas</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              <span>{assessment.total_points} pontos totais</span>
            </div>
          </div>
        </div>

        {/* Aviso */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-800">
              <strong>Importante:</strong> Responda todas as perguntas antes de enviar. 
              Você precisa atingir a nota mínima para ser aprovado e receber o certificado.
            </p>
          </div>
        </div>

        {/* Perguntas */}
        <div className="space-y-6">
          {assessment.questions?.map((question, qIndex) => (
            <div key={question.id} className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-cyan-600 font-semibold">{qIndex + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900 text-lg">{question.question_text}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      question.question_type === 'single_choice' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {question.question_type === 'single_choice' ? 'Única escolha' : 'Múltipla escolha'}
                    </span>
                    <span className="text-xs text-slate-500">{question.points} pts</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 ml-14">
                {question.options?.map((option, oIndex) => {
                  const isSelected = answers[question.id]?.includes(option);
                  return (
                    <button
                      key={oIndex}
                      onClick={() => handleSelectAnswer(question.id, option, question.question_type)}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                        isSelected 
                          ? 'border-cyan-500 bg-cyan-50' 
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected 
                          ? 'border-cyan-500 bg-cyan-500' 
                          : 'border-slate-300'
                      }`}>
                        {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                      </div>
                      <span className={isSelected ? 'text-cyan-900 font-medium' : 'text-slate-700'}>
                        {option}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between">
          <div>
            <p className="text-slate-900 font-medium">Pronto para enviar?</p>
            <p className="text-sm text-slate-500">
              {Object.keys(answers).length}/{assessment.questions?.length || 0} perguntas respondidas
            </p>
          </div>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="px-8"
          >
            {submitting ? 'Enviando...' : 'Enviar Avaliação'}
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default ModuleAssessment;
