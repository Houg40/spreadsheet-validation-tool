import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, TrendingDown, Layers, Calendar, Hash, ArrowUpRight } from 'lucide-react';

export default function TrustScorecard({ scorecard, findings = [], onSelectCategory }) {
  if (!scorecard) return null;

  const {
    overall_score = 100,
    verdict = 'High Confidence',
    verdict_color = 'emerald',
    pillars = {},
    critical_issues = 0,
    high_issues = 0,
    executive_summary = ''
  } = scorecard;

  const colorStyles = {
    emerald: {
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      bar: 'bg-emerald-500',
      icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />
    },
    amber: {
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      bar: 'bg-amber-500',
      icon: <AlertTriangle className="w-6 h-6 text-amber-400" />
    },
    rose: {
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      bar: 'bg-rose-500',
      icon: <ShieldAlert className="w-6 h-6 text-rose-400" />
    }
  };

  const style = colorStyles[verdict_color] || colorStyles.amber;

  // Find top critical impact
  const topCritical = findings.find(
    f => f.severity === 'critical' || f.impact?.impact_level === 'critical'
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl mb-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
        
        {/* Score and Verdict */}
        <div className="flex items-center gap-5">
          <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner">
            <span className="text-3xl font-extrabold text-white tracking-tight">{overall_score}</span>
            <span className="text-xs text-slate-500 absolute bottom-2">/ 100</span>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${style.badge}`}>
                {style.icon}
                {verdict}
              </span>
              <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">Audit Protocol 2.4</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">Report Reliability & Integrity Audit</h2>
            <p className="text-sm text-slate-400 mt-0.5">{executive_summary}</p>
          </div>
        </div>

        {/* Quick Issue Stats */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-center">
            <div className="text-xl font-black text-rose-400">{critical_issues}</div>
            <div className="text-xs text-rose-300/80 font-medium">Critical Risks</div>
          </div>
          <div className="px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
            <div className="text-xl font-black text-amber-400">{high_issues}</div>
            <div className="text-xs text-amber-300/80 font-medium">High Risks</div>
          </div>
        </div>
      </div>

      {/* Pillars Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <PillarCard
          icon={<Layers className="w-4 h-4 text-indigo-400" />}
          label="Formula Uniformity"
          score={pillars.formula_uniformity ?? 100}
          subtitle="R1C1 pattern breaks & overrides"
          onClick={() => onSelectCategory && onSelectCategory('formula_integrity')}
        />
        <PillarCard
          icon={<TrendingDown className="w-4 h-4 text-emerald-400" />}
          label="Range Coverage"
          score={pillars.range_coverage ?? 100}
          subtitle="Trailing data omission in SUM/AVG"
          onClick={() => onSelectCategory && onSelectCategory('range_slippage')}
        />
        <PillarCard
          icon={<Hash className="w-4 h-4 text-cyan-400" />}
          label="Grain Purity"
          score={pillars.grain_purity ?? 100}
          subtitle="Entity unicity & duplicate keys"
          onClick={() => onSelectCategory && onSelectCategory('grain_integrity')}
        />
        <PillarCard
          icon={<Calendar className="w-4 h-4 text-amber-400" />}
          label="Temporal Logic"
          score={pillars.temporal_consistency ?? 100}
          subtitle="Date sequencing & conventions"
          onClick={() => onSelectCategory && onSelectCategory('temporal_logic')}
        />
      </div>

      {/* Top Consequence Banner */}
      {topCritical?.impact?.executive_statement && (
        <div className="mt-5 p-3.5 bg-rose-950/40 border border-rose-800/40 rounded-lg flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="text-rose-200">
              <strong className="text-white font-semibold">Decisional Impact: </strong>
              {topCritical.impact.executive_statement}
            </span>
          </div>
          <span className="px-2.5 py-1 bg-rose-500/20 text-rose-300 font-mono text-xs rounded font-bold shrink-0">
            {topCritical.cell}
          </span>
        </div>
      )}
    </div>
  );
}

function PillarCard({ icon, label, score, subtitle, onClick }) {
  const getPillarColor = (s) => {
    if (s >= 80) return 'text-emerald-400 bg-emerald-500';
    if (s >= 50) return 'text-amber-400 bg-amber-500';
    return 'text-rose-400 bg-rose-500';
  };

  const color = getPillarColor(score);

  return (
    <div 
      onClick={onClick}
      className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-semibold text-slate-300">{label}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-sm font-bold ${color.split(' ')[0]}`}>{score}%</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition" />
        </div>
      </div>

      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mb-1.5">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${color.split(' ')[1]}`} 
          style={{ width: `${Math.max(score, 8)}%` }}
        />
      </div>
      <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>
    </div>
  );
}
