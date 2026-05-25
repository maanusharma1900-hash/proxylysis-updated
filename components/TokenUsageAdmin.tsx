import React, { useState, useEffect, useMemo } from 'react';
import { tokenUsageService, TokenUsageSummary } from '../services/tokenUsageService';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, Users, Zap, DollarSign, Activity, AlertCircle } from 'lucide-react';

interface TokenUsageAdminProps {
  startDate?: string;
  endDate?: string;
}

const TokenUsageAdmin: React.FC<TokenUsageAdminProps> = ({ startDate, endDate }) => {
  const [summary, setSummary] = useState<TokenUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'associates' | 'casestudies'>('overview');

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;
        const data = await tokenUsageService.getTokenUsageSummary(start, end);
        setSummary(data);
      } catch (err: any) {
        console.error("Failed to fetch token usage summary:", err);
        setError(err.message || "Failed to load token usage data");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [startDate, endDate]);

  const associateChartData = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary.byAssociate)
      .map(([email, data]) => ({
        name: email.split('@')[0],
        tokens: data.tokens,
        cost: data.cost,
        caseCount: data.count
      }))
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 10);
  }, [summary]);

  const analysisTypeData = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary.byAnalysisType)
      .map(([type, data]) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        value: data.tokens,
        count: data.count
      }))
      .sort((a, b) => b.value - a.value);
  }, [summary]);

  const caseStudyData = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary.byCaseStudy)
      .map(([id, data]) => ({
        id,
        tokens: data.tokens,
        cost: data.cost,
        associate: data.associate
      }))
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 15);
  }, [summary]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-5">
        <div className="w-12 h-12 border-4 border-slate-900 border-t-indigo-500 rounded-full animate-spin"></div>
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Token Analytics...</span>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle className="w-5 h-5 text-rose-600" />
          <h3 className="font-black text-rose-700 text-sm uppercase tracking-widest">Error Loading Token Analytics</h3>
        </div>
        <p className="text-[10px] text-rose-600">{error || "No data available"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Tokens</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{(summary.totalTokens / 1000).toFixed(1)}K</div>
          <p className="text-[9px] text-slate-500 mt-2">{summary.totalRecords} analyses</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Cost</span>
          </div>
          <div className="text-3xl font-black text-slate-900">${summary.totalCost.toFixed(3)}</div>
          <p className="text-[9px] text-slate-500 mt-2">Gemini API spend</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Associates</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{Object.keys(summary.byAssociate).length}</div>
          <p className="text-[9px] text-slate-500 mt-2">Contributors</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Cost/Case</span>
          </div>
          <div className="text-3xl font-black text-slate-900">${summary.totalRecords > 0 ? (summary.totalCost / summary.totalRecords).toFixed(3) : '0.000'}</div>
          <p className="text-[9px] text-slate-500 mt-2">Per analysis</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-200/50 p-1.5 rounded-xl w-fit gap-1.5">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'associates', label: 'Associates' },
          { id: 'casestudies', label: 'Case Studies' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Analysis Type Distribution */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Token Usage by Analysis Type</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analysisTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `${(value / 1000).toFixed(1)}K tokens`} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top Associates */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Top Associates by Token Usage</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={associateChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                  formatter={(value: any) => `${(value / 1000).toFixed(1)}K`}
                />
                <Bar dataKey="tokens" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'associates' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Associate Token Consumption Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left font-black text-slate-600 uppercase tracking-widest">Associate</th>
                  <th className="px-6 py-4 text-right font-black text-slate-600 uppercase tracking-widest">Tokens Used</th>
                  <th className="px-6 py-4 text-right font-black text-slate-600 uppercase tracking-widest">Cost ($)</th>
                  <th className="px-6 py-4 text-right font-black text-slate-600 uppercase tracking-widest">Cases</th>
                  <th className="px-6 py-4 text-right font-black text-slate-600 uppercase tracking-widest">Avg/Case</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(summary.byAssociate)
                  .sort((a, b) => b[1].tokens - a[1].tokens)
                  .map(([email, data]) => (
                    <tr key={email} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-700">{email}</td>
                      <td className="px-6 py-4 text-right text-slate-600 font-bold">{(data.tokens / 1000).toFixed(1)}K</td>
                      <td className="px-6 py-4 text-right text-emerald-600 font-bold">${data.cost.toFixed(3)}</td>
                      <td className="px-6 py-4 text-right text-indigo-600 font-bold">{data.count}</td>
                      <td className="px-6 py-4 text-right text-slate-600 font-bold">{(data.tokens / data.count).toFixed(0)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'casestudies' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Top 15 Case Studies by Token Consumption</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left font-black text-slate-600 uppercase tracking-widest">Case Study ID</th>
                  <th className="px-6 py-4 text-left font-black text-slate-600 uppercase tracking-widest">Associate</th>
                  <th className="px-6 py-4 text-right font-black text-slate-600 uppercase tracking-widest">Tokens</th>
                  <th className="px-6 py-4 text-right font-black text-slate-600 uppercase tracking-widest">Cost ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {caseStudyData.map((cs) => (
                  <tr key={cs.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-600 truncate">{cs.id.substring(0, 40)}...</td>
                    <td className="px-6 py-4 text-slate-700 font-bold">{cs.associate}</td>
                    <td className="px-6 py-4 text-right text-indigo-600 font-bold">{(cs.tokens / 1000).toFixed(1)}K</td>
                    <td className="px-6 py-4 text-right text-emerald-600 font-bold">${cs.cost.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenUsageAdmin;
