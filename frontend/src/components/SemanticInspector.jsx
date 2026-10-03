import React from 'react';
import { Database, Lock, AlertTriangle, CheckCircle, Tag, Hash, Calendar, DollarSign, Percent } from 'lucide-react';

export default function SemanticInspector({ semantics = {} }) {
  const {
    grain = 'Unknown Grain',
    columns = {},
    suggested_rules = [],
    date_ambiguities = [],
    candidate_keys = []
  } = semantics;

  const typeIcons = {
    identifier: <Lock className="w-3.5 h-3.5 text-cyan-400" />,
    currency: <DollarSign className="w-3.5 h-3.5 text-emerald-400" />,
    percentage: <Percent className="w-3.5 h-3.5 text-indigo-400" />,
    date: <Calendar className="w-3.5 h-3.5 text-amber-400" />,
    numeric_metric: <Hash className="w-3.5 h-3.5 text-blue-400" />,
    category: <Tag className="w-3.5 h-3.5 text-purple-400" />
  };

  return (
    <div className="space-y-6">
      {/* Grain & Entity Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Inferred Row Structure & Grain</div>
            <h3 className="text-lg font-bold text-slate-100 mt-0.5">{grain}</h3>
            <p className="text-xs text-slate-400 mt-1">
              The quality inspector evaluated entity cardinalities and functional dependencies to determine what each row uniquely represents.
            </p>
          </div>
        </div>
      </div>

      {/* Date Ambiguities Alert */}
      {date_ambiguities.length > 0 && (
        <div className="p-4 bg-amber-950/30 border border-amber-800/40 rounded-xl text-amber-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Date Convention Ambiguity Warning</span>
          </div>
          {date_ambiguities.map((amb, i) => (
            <div key={i} className="pl-6 text-slate-300 leading-relaxed">
              {amb.message}
            </div>
          ))}
        </div>
      )}

      {/* Columns Semantic Schema Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <h4 className="font-bold text-sm text-slate-200">Semantic Schema & Type Registry</h4>
          <span className="text-xs font-mono text-slate-400">{Object.keys(columns).length} registered columns</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono">
              <tr>
                <th className="px-4 py-3">Column</th>
                <th className="px-4 py-3">Inferred Semantics</th>
                <th className="px-4 py-3">Zero Preservation</th>
                <th className="px-4 py-3">Cardinality</th>
                <th className="px-4 py-3">Null %</th>
                <th className="px-4 py-3">Sample Values</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {Object.entries(columns).map(([colName, prof]) => {
                const icon = typeIcons[prof.inferred_type] || <Tag className="w-3.5 h-3.5 text-slate-400" />;

                return (
                  <tr key={colName} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 font-bold text-slate-200">{colName}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                        {icon}
                        <span>{prof.inferred_type?.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {prof.preserve_leading_zeros ? (
                        <span className="inline-flex items-center gap-1 text-cyan-400 font-semibold text-[11px]">
                          <Lock className="w-3 h-3" /> Locked (String)
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Standard Numeric</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{prof.cardinality} unique</td>
                    <td className="px-4 py-3">
                      <span className={prof.null_pct > 0 ? "text-amber-400 font-bold" : "text-slate-500"}>
                        {prof.null_pct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                      {prof.sample_values?.join(', ') || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suggested Validation Rules */}
      {suggested_rules.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h4 className="font-bold text-sm text-slate-200 mb-3">Proposed Business Rules (Derived from Schema)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggested_rules.map((rule, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">{rule.rule}</div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5 uppercase tracking-wider">{rule.type}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
