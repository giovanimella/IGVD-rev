import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Shield,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Upload,
  TestTube,
  Settings
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminBannedWords = () => {
  const [words, setWords] = useState([]);
  const [config, setConfig] = useState({
    enabled: true,
    block_post: true,
    replacement: '***'
  });
  const [loading, setLoading] = useState(true);
  const [newWord, setNewWord] = useState('');
  const [bulkWords, setBulkWords] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [testText, setTestText] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchWords();
  }, []);

  const fetchWords = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/timeline/admin/banned-words`);
      setWords(response.data.words);
      setConfig(response.data.config);
    } catch (error) {
      toast.error('Erro ao carregar palavras');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWord = async (e) => {
    e.preventDefault();
    if (!newWord.trim()) return;

    try {
      await axios.post(`${API_URL}/api/timeline/admin/banned-words`, {
        word: newWord.trim()
      });
      setNewWord('');
      fetchWords();
      toast.success('Palavra adicionada');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao adicionar');
    }
  };

  const handleAddBulk = async () => {
    const wordList = bulkWords
      .split('\n')
      .map(w => w.trim())
      .filter(w => w.length > 0);

    if (wordList.length === 0) {
      toast.error('Nenhuma palavra válida');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/timeline/admin/banned-words/bulk`, wordList);
      setBulkWords('');
      setShowBulk(false);
      fetchWords();
      toast.success(response.data.message);
    } catch (error) {
      toast.error('Erro ao adicionar palavras');
    }
  };

  const handleDeleteWord = async (wordId) => {
    try {
      await axios.delete(`${API_URL}/api/timeline/admin/banned-words/${wordId}`);
      fetchWords();
      toast.success('Palavra removida');
    } catch (error) {
      toast.error('Erro ao remover');
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/timeline/admin/banned-words/config`, config);
      toast.success('Configurações salvas');
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleTestFilter = async () => {
    if (!testText.trim()) {
      toast.error('Digite um texto para testar');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/timeline/admin/banned-words/test?text=${encodeURIComponent(testText)}`);
      setTestResult(response.data);
    } catch (error) {
      toast.error('Erro ao testar');
    }
  };

  const filteredWords = words.filter(w => 
    w.word.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">Filtro de Palavras</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Gerencie palavras proibidas na comunidade
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              config.enabled 
                ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
            }`}>
              {config.enabled ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              <span>{config.enabled ? 'Filtro Ativo' : 'Filtro Inativo'}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal - Lista de Palavras */}
          <div className="lg:col-span-2 space-y-4">
            {/* Adicionar Palavra */}
            <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-4">
              <form onSubmit={handleAddWord} className="flex items-center space-x-3">
                <div className="relative flex-1">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    placeholder="Digite uma palavra para bloquear..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulk(!showBulk)}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-white/20"
                >
                  <Upload className="w-4 h-4" />
                  <span>Em Massa</span>
                </button>
              </form>

              {/* Adicionar em Massa */}
              {showBulk && (
                <div className="mt-4 p-4 bg-slate-50 dark:bg-white/5 rounded-lg">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Cole uma palavra por linha:
                  </p>
                  <textarea
                    value={bulkWords}
                    onChange={(e) => setBulkWords(e.target.value)}
                    placeholder="palavra1&#10;palavra2&#10;palavra3"
                    className="w-full p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white h-32 font-mono text-sm"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleAddBulk}
                      className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
                    >
                      Adicionar Todas
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar palavra..."
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#1b4c51] border border-slate-200 dark:border-white/5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
              />
            </div>

            {/* Lista de Palavras */}
            <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Palavras Bloqueadas ({filteredWords.length})
                </h3>
              </div>
              
              {filteredWords.length === 0 ? (
                <div className="p-12 text-center">
                  <Shield className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">
                    {searchTerm ? 'Nenhuma palavra encontrada' : 'Nenhuma palavra cadastrada'}
                  </p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-4">
                    {filteredWords.map((word) => (
                      <div
                        key={word.id}
                        className="flex items-center justify-between px-3 py-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg group"
                      >
                        <span className="text-red-700 dark:text-red-400 font-medium truncate">
                          {word.word}
                        </span>
                        <button
                          onClick={() => handleDeleteWord(word.id)}
                          className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Coluna Lateral - Configurações e Teste */}
          <div className="space-y-4">
            {/* Configurações */}
            <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-4">
              <div className="flex items-center space-x-2 mb-4">
                <Settings className="w-5 h-5 text-cyan-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white">Configurações</h3>
              </div>

              <div className="space-y-4">
                {/* Ativar/Desativar */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Filtro Ativo</p>
                    <p className="text-xs text-slate-500">Ativar verificação de palavras</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>

                {/* Modo de Bloqueio */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Bloquear Post</p>
                    <p className="text-xs text-slate-500">Se desativado, apenas censura</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.block_post}
                      onChange={(e) => setConfig({ ...config, block_post: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>

                {/* Texto de Substituição */}
                {!config.block_post && (
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white mb-1">Substituir por</p>
                    <input
                      type="text"
                      value={config.replacement}
                      onChange={(e) => setConfig({ ...config, replacement: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                <button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Salvando...' : 'Salvar Configurações'}</span>
                </button>
              </div>
            </div>

            {/* Testar Filtro */}
            <div className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/5 p-4">
              <div className="flex items-center space-x-2 mb-4">
                <TestTube className="w-5 h-5 text-cyan-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white">Testar Filtro</h3>
              </div>

              <textarea
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Digite um texto para testar o filtro..."
                className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white h-24 mb-3"
              />

              <button
                onClick={handleTestFilter}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100"
              >
                <TestTube className="w-4 h-4" />
                <span>Testar</span>
              </button>

              {testResult && (
                <div className="mt-4 p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    {testResult.has_banned_words ? (
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    <span className={`font-medium ${testResult.has_banned_words ? 'text-amber-600' : 'text-green-600'}`}>
                      {testResult.has_banned_words ? 'Palavras encontradas!' : 'Texto limpo'}
                    </span>
                  </div>

                  {testResult.has_banned_words && (
                    <>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                        Palavras: <span className="text-red-500 font-medium">{testResult.found_words.join(', ')}</span>
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                        Ação: <span className="font-medium">{testResult.would_block ? 'Bloquearia' : 'Censuraria'}</span>
                      </p>
                      {!testResult.would_block && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Resultado: <span className="font-mono bg-slate-200 dark:bg-white/10 px-1 rounded">{testResult.filtered}</span>
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Dicas */}
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800 dark:text-amber-300">Dicas</h4>
                  <ul className="text-sm text-amber-700 dark:text-amber-400 mt-1 space-y-1">
                    <li>• Palavras são verificadas ignorando maiúsculas/minúsculas</li>
                    <li>• O filtro também detecta variações dentro de palavras</li>
                    <li>• Use "Bloquear Post" para impedir publicação</li>
                    <li>• Desative para apenas censurar as palavras</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminBannedWords;
