import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { 
  BarChart3, Users, BookOpen, Trophy, Award, TrendingUp, 
  Download, Calendar, Clock, Target, ChevronDown, ChevronUp,
  Flame, Medal
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SupervisorAnalytics = () => {
  const [overview, setOverview] = useState(null);
  const [licensees, setLicensees] = useState([]);
  const [moduleEngagement, setModuleEngagement] = useState([]);
  const [dailyActivity, setDailyActivity] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedLicensee, setExpandedLicensee] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [overviewRes, licenseesRes, moduleRes, activityRes, heatmapRes] = await Promise.all([
        axios.get(`${API_URL}/api/analytics/supervisor/overview`),
        axios.get(`${API_URL}/api/analytics/supervisor/licensees-progress`),
        axios.get(`${API_URL}/api/analytics/supervisor/module-engagement`),
        axios.get(`${API_URL}/api/analytics/supervisor/daily-activity?days=14`),
        axios.get(`${API_URL}/api/analytics/supervisor/study-heatmap?days=30`)
      ]);
      
      setOverview(overviewRes.data);
      setLicensees(licenseesRes.data);
      setModuleEngagement(moduleRes.data);
      setDailyActivity(activityRes.data);
      setHeatmap(heatmapRes.data);
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/analytics/export/csv?report_type=licensees`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Relatório exportado!');
    } catch (error) {
      toast.error('Erro ao exportar relatório');
    }
  };

  const getMaxHeatmapValue = () => {
    if (!heatmap.length) return 1;
    return Math.max(...heatmap.map(h => h.count), 1);
  };

  const getHeatmapColor = (count) => {
    const max = getMaxHeatmapValue();
    const intensity = count / max;
    if (intensity === 0) return 'bg-slate-100';
    if (intensity < 0.25) return 'bg-cyan-100';
    if (intensity < 0.5) return 'bg-cyan-300';
    if (intensity < 0.75) return 'bg-cyan-500';
    return 'bg-cyan-700';
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">Analytics</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Acompanhe o progresso dos seus licenciados</p>
          </div>
          <Button onClick={exportCSV} variant="outline" data-testid="export-csv-btn">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
          {[
            { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
            { id: 'licensees', label: 'Licenciados', icon: Users },
            { id: 'modules', label: 'Módulos', icon: BookOpen },
            { id: 'activity', label: 'Atividade', icon: Calendar }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && overview && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="dark:bg-[#151B28] dark:border-white/10">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Total Licenciados</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white">{overview.total_licensees}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{overview.active_licensees} ativos</p>
                    </div>
                    <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-500/20 rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="dark:bg-[#151B28] dark:border-white/10">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Capítulos Completos</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white">{overview.total_completions}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{overview.total_modules} módulos</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="dark:bg-[#151B28] dark:border-white/10">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Certificados</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white">{overview.certificates_issued}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">emitidos</p>
                    </div>
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/20 rounded-xl flex items-center justify-center">
                      <Award className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="dark:bg-[#151B28] dark:border-white/10">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Avaliações</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white">{overview.assessments.passed}/{overview.assessments.total}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Média: {overview.assessments.average_score}%</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-500/20 rounded-xl flex items-center justify-center">
                      <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Licensees */}
            <Card className="dark:bg-[#151B28] dark:border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Top Licenciados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {licensees.slice(0, 5).map((licensee, index) => (
                    <div key={licensee.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-slate-400' : index === 2 ? 'bg-amber-700' : 'bg-slate-300'
                        }`}>
                          {index + 1}
                        </div>
                        {licensee.profile_picture ? (
                          <img src={`${API_URL}${licensee.profile_picture}`} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center">
                            <span className="text-cyan-600 dark:text-cyan-400 font-medium">{licensee.full_name?.charAt(0)}</span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{licensee.full_name}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{licensee.level_title}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-cyan-600 dark:text-cyan-400">{licensee.points} pts</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{licensee.completed_modules}/{licensee.total_modules} módulos</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Licensees Tab */}
        {activeTab === 'licensees' && (
          <div className="space-y-4">
            {licensees.map((licensee) => (
              <Card key={licensee.id} className="overflow-hidden dark:bg-[#151B28] dark:border-white/10">
                <div
                  className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  onClick={() => setExpandedLicensee(expandedLicensee === licensee.id ? null : licensee.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {licensee.profile_picture ? (
                        <img src={`${API_URL}${licensee.profile_picture}`} alt="" className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">{licensee.full_name?.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{licensee.full_name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{licensee.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-lg font-bold text-cyan-600 dark:text-cyan-400">{licensee.points}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Pontos</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">{licensee.completed_modules}/{licensee.total_modules}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Módulos</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{licensee.certificates}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Certificados</p>
                      </div>
                      {expandedLicensee === licensee.id ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>
                
                {expandedLicensee === licensee.id && (
                  <div className="px-4 pb-4 border-t border-slate-100 dark:border-white/10 pt-4 bg-slate-50 dark:bg-white/5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white dark:bg-[#151B28] p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-1">
                          <BookOpen className="w-4 h-4" />
                          <span className="text-sm">Capítulos</span>
                        </div>
                        <p className="text-xl font-bold dark:text-white">{licensee.completed_chapters}</p>
                      </div>
                      <div className="bg-white dark:bg-[#151B28] p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-1">
                          <Flame className="w-4 h-4" />
                          <span className="text-sm">Streak</span>
                        </div>
                        <p className="text-xl font-bold dark:text-white">{licensee.current_streak} dias</p>
                      </div>
                      <div className="bg-white dark:bg-[#151B28] p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-1">
                          <Medal className="w-4 h-4" />
                          <span className="text-sm">Nível</span>
                        </div>
                        <p className="text-xl font-bold dark:text-white">{licensee.level_title}</p>
                      </div>
                      <div className="bg-white dark:bg-[#151B28] p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-1">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">Último Acesso</span>
                        </div>
                        <p className="text-sm font-medium dark:text-white">
                          {licensee.last_access 
                            ? new Date(licensee.last_access).toLocaleDateString('pt-BR')
                            : 'Nunca'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            ))}
            
            {licensees.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-[#151B28] rounded-xl border border-slate-200 dark:border-white/10">
                <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">Nenhum licenciado encontrado</p>
              </div>
            )}
          </div>
        )}

        {/* Modules Tab */}
        {activeTab === 'modules' && (
          <div className="space-y-4">
            {moduleEngagement.map((module) => (
              <Card key={module.id} className="dark:bg-[#151B28] dark:border-white/10">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{module.title}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{module.total_chapters} capítulos</p>
                    </div>
                    <div className="flex gap-2">
                      {module.has_assessment && (
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded-full">Avaliação</span>
                      )}
                      {module.has_certificate && (
                        <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded-full">Certificado</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 dark:text-slate-400">Taxa de Conclusão</span>
                      <span className="font-medium dark:text-white">{module.completion_rate}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                        style={{ width: `${module.completion_rate}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{module.users_started}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Iniciaram</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{module.users_completed}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Completaram</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {module.assessment.total > 0 ? `${module.assessment.avg_score}%` : '-'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Média Avaliação</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{module.certificates_issued}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Certificados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            {/* Daily Activity Chart */}
            <Card className="dark:bg-[#151B28] dark:border-white/10">
              <CardHeader>
                <CardTitle className="dark:text-white">Atividade Diária (últimos 14 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-end gap-1">
                  {dailyActivity.map((day, index) => {
                    const maxUsers = Math.max(...dailyActivity.map(d => d.active_users), 1);
                    const height = (day.active_users / maxUsers) * 100;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-gradient-to-t from-cyan-500 to-cyan-300 rounded-t transition-all hover:from-cyan-600 hover:to-cyan-400"
                          style={{ height: `${Math.max(height, 5)}%` }}
                          title={`${day.active_users} usuários ativos`}
                        />
                        <span className="text-xs text-slate-500 dark:text-slate-400 rotate-45 origin-left">
                          {new Date(day.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Study Heatmap */}
            <Card className="dark:bg-[#151B28] dark:border-white/10">
              <CardHeader>
                <CardTitle className="dark:text-white">Horários de Estudo (último mês)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="min-w-[600px]">
                    {/* Hours header */}
                    <div className="flex gap-1 mb-1 ml-20">
                      {Array.from({ length: 24 }, (_, i) => (
                        <div key={i} className="w-5 text-xs text-slate-400 text-center">
                          {i}
                        </div>
                      ))}
                    </div>
                    
                    {/* Days */}
                    {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((day, dayIndex) => (
                      <div key={day} className="flex items-center gap-1 mb-1">
                        <span className="w-20 text-xs text-slate-600 dark:text-slate-400 text-right pr-2">{day}</span>
                        {Array.from({ length: 24 }, (_, hour) => {
                          const data = heatmap.find(h => h.day === dayIndex && h.hour === hour);
                          return (
                            <div
                              key={hour}
                              className={`w-5 h-5 rounded ${getHeatmapColor(data?.count || 0)}`}
                              title={`${day} ${hour}h: ${data?.count || 0} acessos`}
                            />
                          );
                        })}
                      </div>
                    ))}
                    
                    {/* Legend */}
                    <div className="flex items-center gap-2 mt-4 ml-20">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Menos</span>
                      <div className="w-4 h-4 bg-slate-100 dark:bg-slate-700 rounded" />
                      <div className="w-4 h-4 bg-cyan-100 rounded" />
                      <div className="w-4 h-4 bg-cyan-300 rounded" />
                      <div className="w-4 h-4 bg-cyan-500 rounded" />
                      <div className="w-4 h-4 bg-cyan-700 rounded" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">Mais</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SupervisorAnalytics;
