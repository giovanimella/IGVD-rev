import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, GripVertical, CheckCircle, Circle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminAssessment = () => {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const [module, setModule] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  
  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    question_type: 'single_choice',
    points: 10,
    options: ['', '', '', ''],
    correct_answers: []
  });

  useEffect(() => {
    fetchData();
  }, [moduleId]);

  const fetchData = async () => {
    try {
      // Buscar módulo
      const moduleRes = await axios.get(`${API_URL}/api/modules/${moduleId}`);
      setModule(moduleRes.data);
      
      // Buscar avaliação do módulo
      const assessmentRes = await axios.get(`${API_URL}/api/assessments/module/${moduleId}`);
      if (assessmentRes.data) {
        setAssessment(assessmentRes.data);
        setQuestions(assessmentRes.data.questions || []);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const createAssessment = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/assessments/`, {
        module_id: moduleId,
        title: `Avaliação - ${module?.title}`,
        description: 'Avaliação do módulo',
        passing_score: 70
      });
      setAssessment(response.data);
      toast.success('Avaliação criada! Agora adicione as perguntas.');
    } catch (error) {
      console.error('Erro ao criar avaliação:', error);
      toast.error('Erro ao criar avaliação');
    }
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      question_text: '',
      question_type: 'single_choice',
      points: 10,
      options: ['', '', '', ''],
      correct_answers: []
    });
    setEditingQuestion(null);
  };

  const handleAddOption = () => {
    setQuestionForm({
      ...questionForm,
      options: [...questionForm.options, '']
    });
  };

  const handleRemoveOption = (index) => {
    const newOptions = questionForm.options.filter((_, i) => i !== index);
    const newCorrectAnswers = questionForm.correct_answers.filter(a => a !== questionForm.options[index]);
    setQuestionForm({
      ...questionForm,
      options: newOptions,
      correct_answers: newCorrectAnswers
    });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...questionForm.options];
    const oldValue = newOptions[index];
    newOptions[index] = value;
    
    // Atualizar correct_answers se o valor mudou
    const newCorrectAnswers = questionForm.correct_answers.map(a => 
      a === oldValue ? value : a
    );
    
    setQuestionForm({
      ...questionForm,
      options: newOptions,
      correct_answers: newCorrectAnswers
    });
  };

  const toggleCorrectAnswer = (option) => {
    if (questionForm.question_type === 'single_choice') {
      setQuestionForm({
        ...questionForm,
        correct_answers: [option]
      });
    } else {
      const isSelected = questionForm.correct_answers.includes(option);
      if (isSelected) {
        setQuestionForm({
          ...questionForm,
          correct_answers: questionForm.correct_answers.filter(a => a !== option)
        });
      } else {
        setQuestionForm({
          ...questionForm,
          correct_answers: [...questionForm.correct_answers, option]
        });
      }
    }
  };

  const handleSaveQuestion = async () => {
    // Validações
    if (!questionForm.question_text.trim()) {
      toast.error('Digite a pergunta');
      return;
    }
    
    const validOptions = questionForm.options.filter(o => o.trim());
    if (validOptions.length < 2) {
      toast.error('Adicione pelo menos 2 opções');
      return;
    }
    
    if (questionForm.correct_answers.length === 0) {
      toast.error('Selecione pelo menos uma resposta correta');
      return;
    }

    try {
      const questionData = {
        assessment_id: assessment.id,
        question_text: questionForm.question_text,
        question_type: questionForm.question_type,
        points: questionForm.points,
        order: editingQuestion ? editingQuestion.order : questions.length + 1,
        options: validOptions,
        correct_answers: questionForm.correct_answers
      };

      if (editingQuestion) {
        await axios.put(`${API_URL}/api/assessments/questions/${editingQuestion.id}`, questionData);
        toast.success('Pergunta atualizada!');
      } else {
        await axios.post(`${API_URL}/api/assessments/questions`, questionData);
        toast.success('Pergunta adicionada!');
      }

      setShowQuestionModal(false);
      resetQuestionForm();
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar pergunta:', error);
      toast.error('Erro ao salvar pergunta');
    }
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setQuestionForm({
      question_text: question.question_text,
      question_type: question.question_type,
      points: question.points,
      options: question.options.length >= 2 ? question.options : [...question.options, '', '', '', ''].slice(0, 4),
      correct_answers: question.correct_answers || []
    });
    setShowQuestionModal(true);
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta pergunta?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/assessments/questions/${questionId}`);
      toast.success('Pergunta excluída!');
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir pergunta:', error);
      toast.error('Erro ao excluir pergunta');
    }
  };

  const handleDeleteAssessment = async () => {
    if (!window.confirm('Tem certeza que deseja excluir toda a avaliação e suas perguntas?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/assessments/${assessment.id}`);
      toast.success('Avaliação excluída!');
      setAssessment(null);
      setQuestions([]);
    } catch (error) {
      console.error('Erro ao excluir avaliação:', error);
      toast.error('Erro ao excluir avaliação');
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
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/modules')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-outfit font-bold text-slate-900">
              Avaliação: {module?.title}
            </h1>
            <p className="text-slate-600">Configure as perguntas da avaliação do módulo</p>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-cyan-500 rounded-lg flex items-center justify-center text-white text-xl">
              📝
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Sobre as Avaliações</h3>
              <p className="text-sm text-slate-600">
                As avaliações são aplicadas ao final de cada módulo. O licenciado precisa atingir a 
                <strong> nota mínima configurada no sistema</strong> para ser aprovado e receber o certificado.
                Caso não passe, poderá refazer a avaliação após revisar o conteúdo.
              </p>
            </div>
          </div>
        </div>

        {/* Criar Avaliação ou Mostrar Perguntas */}
        {!assessment ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📋</span>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhuma avaliação configurada</h3>
            <p className="text-slate-600 mb-6">Crie uma avaliação para este módulo</p>
            <button
              onClick={createAssessment}
              className="px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
            >
              Criar Avaliação
            </button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <p className="text-slate-600 text-sm">Total de Perguntas</p>
                <p className="text-3xl font-bold text-slate-900">{questions.length}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <p className="text-slate-600 text-sm">Pontuação Total</p>
                <p className="text-3xl font-bold text-slate-900">
                  {questions.reduce((acc, q) => acc + q.points, 0)} pts
                </p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm">Ações</p>
                  <p className="text-sm text-red-600 font-medium">Excluir avaliação</p>
                </div>
                <button
                  onClick={handleDeleteAssessment}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Perguntas */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Perguntas</h2>
                <button
                  onClick={() => {
                    resetQuestionForm();
                    setShowQuestionModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nova Pergunta
                </button>
              </div>

              {questions.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-slate-500">Nenhuma pergunta cadastrada</p>
                  <p className="text-sm text-slate-400">Clique em "Nova Pergunta" para começar</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {questions.map((question, index) => (
                    <div key={question.id} className="p-6 hover:bg-slate-50">
                      <div className="flex items-start gap-4">
                        <div className="flex items-center gap-2 text-slate-400">
                          <GripVertical className="w-5 h-5" />
                          <span className="font-medium">{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-medium text-slate-900">{question.question_text}</p>
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
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditQuestion(question)}
                                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteQuestion(question.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {question.options.map((option, optIndex) => {
                              const isCorrect = question.correct_answers?.includes(option);
                              return (
                                <div
                                  key={optIndex}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                                    isCorrect 
                                      ? 'bg-green-50 text-green-800 border border-green-200' 
                                      : 'bg-slate-50 text-slate-600'
                                  }`}
                                >
                                  {isCorrect ? (
                                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                  )}
                                  <span>{option}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Modal de Pergunta */}
        {showQuestionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
                <h2 className="text-xl font-semibold text-slate-900">
                  {editingQuestion ? 'Editar Pergunta' : 'Nova Pergunta'}
                </h2>
                <button
                  onClick={() => {
                    setShowQuestionModal(false);
                    resetQuestionForm();
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Pergunta */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Pergunta</label>
                  <textarea
                    value={questionForm.question_text}
                    onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    rows={3}
                    placeholder="Digite a pergunta..."
                  />
                </div>

                {/* Tipo e Pontos */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Tipo</label>
                    <select
                      value={questionForm.question_type}
                      onChange={(e) => {
                        setQuestionForm({ 
                          ...questionForm, 
                          question_type: e.target.value,
                          correct_answers: e.target.value === 'single_choice' 
                            ? questionForm.correct_answers.slice(0, 1) 
                            : questionForm.correct_answers
                        });
                      }}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    >
                      <option value="single_choice">Única escolha</option>
                      <option value="multiple_choice">Múltipla escolha</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Pontos</label>
                    <input
                      type="number"
                      value={questionForm.points}
                      onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      min="1"
                    />
                  </div>
                </div>

                {/* Opções */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Opções de Resposta
                      <span className="text-slate-400 font-normal ml-2">
                        (clique para marcar como correta)
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="text-sm text-cyan-600 hover:text-cyan-700"
                    >
                      + Adicionar opção
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {questionForm.options.map((option, index) => {
                      const isCorrect = questionForm.correct_answers.includes(option) && option.trim();
                      return (
                        <div key={index} className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => option.trim() && toggleCorrectAnswer(option)}
                            className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                              isCorrect 
                                ? 'bg-green-500 text-white' 
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            {isCorrect ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                          </button>
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => handleOptionChange(index, e.target.value)}
                            className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${
                              isCorrect ? 'border-green-300 bg-green-50' : 'border-slate-200'
                            }`}
                            placeholder={`Opção ${index + 1}`}
                          />
                          {questionForm.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(index)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuestionModal(false);
                      resetQuestionForm();
                    }}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveQuestion}
                    className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {editingQuestion ? 'Salvar Alterações' : 'Adicionar Pergunta'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminAssessment;
