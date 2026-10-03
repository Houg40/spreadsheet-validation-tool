import React, { useState } from 'react';
import { Terminal, Send, CheckCircle2, AlertOctagon, HelpCircle, ArrowRight } from 'lucide-react';

export default function RuleConsole({ sessionId, columns = [], onInspectRow }) {
  const [ruleInput, setRuleInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);

  const sampleRules = [
    "Order_Date must be unique",
    "Ship_Date must be after Order_Date",
    "Discharge_Date must be after Admission_Date",
    "Unit_Price must be >= 0",
    "Discount_Pct must not exceed 0.25",
  ];

  const handleRunRule = async (textToRun) => {
    const text = textToRun || ruleInput;
    if (!text.trim() || !sessionId) return;

    setLoading(true);
    try {
      const res = await fetch('/api/evaluate-rule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, rule_text: text })
      });
      const data = await res.json();
      setEvaluationResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <Terminal className="w-5 h-5 text-indigo-400" />
          <h3 className="font-bold text-base text-slate-100">Natural Language Rule Compiler</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Type custom analytical or business rules in plain English. The compiler translates your sentence into deterministic validation logic and runs it across all rows without black-box hallucination.
        </p>

        {/* Input Bar */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleRunRule(); }}
          className="flex items-center gap-2 mb-4"
        >
          <input
            type="text"
            placeholder="e.g. 'Shipping date must be after order date' or 'Margin cannot be negative'..."
            value={ruleInput}
            onChange={(e) => setRuleInput(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
          />
          <button
            type="submit"
            disabled={loading || !ruleInput.trim()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? 'Compiling...' : 'Run Linter Rule'}</span>
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-mono text-[11px]">Try templates:</span>
          {sampleRules.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setRuleInput(r); handleRunRule(r); }}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] transition"
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Compiler Evaluation Results */}
      {evaluationResult && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Deterministic Translation</div>
              <div className="font-mono text-sm font-bold text-indigo-300 mt-0.5">
                {evaluationResult.interpreted_as}
              </div>
            </div>

            <div>
              {evaluationResult.passed ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4" />
                  0 Violations (Passed)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                  <AlertOctagon className="w-4 h-4" />
                  {evaluationResult.violations_count} Failing Rows Detected
                </span>
              )}
            </div>
          </div>

          {/* Failing Row Details */}
          {evaluationResult.details && evaluationResult.details.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-xs font-semibold text-slate-300">Flagged Offending Rows:</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {evaluationResult.details.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs font-mono flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                      Row {item.row}
                    </span>
                    <span className="text-rose-400 truncate flex-1">{item.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
