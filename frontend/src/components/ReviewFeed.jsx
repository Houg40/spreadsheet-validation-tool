import React, { useState } from 'react';
import { 
  CheckCircle2, XCircle, AlertOctagon, TrendingDown, 
  GitPullRequest, ArrowRight, CornerDownRight, Check, X, Eye
} from 'lucide-react';

export default function ReviewFeed({ 
  findings = [], 
  acceptedIds = [], 
  rejectedIds = [], 
  onToggleAccept, 
  onToggleReject,
  onInspectCell 
}) {
  const [filter, setFilter] = useState('all');

  const categories = [
    { id: 'all', label: 'All Findings', count: findings.length },
    { id: 'formula_integrity', label: 'Formula Breaks', count: findings.filter(f => f.category === 'formula_integrity').length },
    { id: 'range_slippage', label: 'Range Slippage', count: findings.filter(f => f.category === 'range_slippage').length },
    { id: 'grain_integrity', label: 'Duplicates & Grain', count: findings.filter(f => f.category === 'grain_integrity').length },
    { id: 'temporal_logic', label: 'Date & Time Traps', count: findings.filter(f => f.category === 'temporal_logic').length },
  ];

  const filteredFindings = findings.filter(f => {
    if (filter === 'all') return true;
    return f.category === filter;
  });

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 ${
                filter === cat.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                filter === cat.id ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-400 font-mono">
          <span className="text-emerald-400 font-bold">{acceptedIds.length} accepted</span> •{' '}
          <span className="text-rose-400 font-bold">{rejectedIds.length} rejected</span> •{' '}
          <span>{findings.length - acceptedIds.length - rejectedIds.length} pending review</span>
        </div>
      </div>

      {/* Review Cards Feed */}
      {filteredFindings.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-xl">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-slate-200 font-semibold">No issues found in this category</h3>
          <p className="text-slate-500 text-sm mt-1">Spreadsheet formulas and structure adhere to code review standards.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredFindings.map(finding => {
            const isAccepted = acceptedIds.includes(finding.id);
            const isRejected = rejectedIds.includes(finding.id);

            return (
              <div 
                key={finding.id}
                className={`p-4 rounded-xl border transition-all ${
                  isAccepted
                    ? 'bg-emerald-950/20 border-emerald-800/40 shadow-emerald-950/20'
                    : isRejected
                    ? 'bg-slate-950/40 border-slate-800 opacity-60'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-md'
                }`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 font-mono text-xs font-bold border border-slate-700">
                      {finding.cell}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                      {finding.column_name || finding.column}
                    </span>
                    <SeverityBadge severity={finding.severity || finding.impact?.impact_level} />
                  </div>

                  {/* Accept / Reject Action Bar */}
                  <div className="flex items-center gap-2 self-end md:self-auto">
                    {finding.cell && (
                      <button
                        onClick={() => onInspectCell && onInspectCell(finding.cell)}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition"
                        title="Jump to cell in grid"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Locate</span>
                      </button>
                    )}

                    <button
                      onClick={() => onToggleReject(finding.id)}
                      className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
                        isRejected
                          ? 'bg-slate-700 text-slate-300'
                          : 'bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 border border-slate-700'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{isRejected ? 'Rejected' : 'Reject'}</span>
                    </button>

                    <button
                      onClick={() => onToggleAccept(finding.id)}
                      className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
                        isAccepted
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isAccepted ? 'Accepted' : 'Accept Fix'}</span>
                    </button>
                  </div>
                </div>

                {/* Finding Description */}
                <p className="text-sm text-slate-200 mb-3">{finding.message}</p>

                {/* Side-by-Side Diff Block */}
                {(finding.current_value !== undefined && finding.proposed_value !== undefined) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3 bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 font-mono text-xs">
                    <div className="flex items-center gap-2 overflow-x-auto text-rose-300">
                      <span className="text-rose-500 font-bold shrink-0">- CURRENT:</span>
                      <span className="truncate bg-rose-950/30 px-1.5 py-0.5 rounded">{String(finding.current_value)}</span>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto text-emerald-300">
                      <span className="text-emerald-500 font-bold shrink-0">+ PROPOSED:</span>
                      <span className="truncate bg-emerald-950/30 px-1.5 py-0.5 rounded">{String(finding.proposed_value)}</span>
                    </div>
                  </div>
                )}

                {/* Counterfactual Impact Statement */}
                {finding.impact && (
                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60 text-xs">
                    <TrendingDown className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-300">Analytical Consequence: </span>
                      <span className="text-slate-400">{finding.impact.executive_statement}</span>
                      {finding.impact.delta_value !== 0 && (
                        <span className="ml-2 font-mono font-bold text-amber-300">
                          (Delta: {finding.impact.delta_value > 0 ? '+' : ''}{Number(finding.impact.delta_value).toLocaleString()})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SeverityBadge({ severity = 'medium' }) {
  const styles = {
    critical: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    high: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    low: 'bg-slate-500/10 text-slate-400 border-slate-500/30'
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[severity] || styles.medium}`}>
      {severity}
    </span>
  );
}
