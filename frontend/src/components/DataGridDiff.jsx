import React, { useState, useEffect } from 'react';
import { Lock, AlertCircle, Check, X, ShieldCheck, Zap } from 'lucide-react';

export default function DataGridDiff({ 
  columns = [], 
  data = [], 
  findings = [], 
  semantics = {}, 
  acceptedIds = [], 
  highlightCell = null,
  onToggleAccept 
}) {
  const [activeCellTooltip, setActiveCellTooltip] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Map cell coordinates (e.g. "G9", "D15") to findings
  const cellFindingMap = {};
  findings.forEach(f => {
    if (f.cell) {
      cellFindingMap[f.cell.toUpperCase()] = f;
    }
    // Also map by column + row if finding has row number
    if (f.column && f.row) {
      const coord = `${f.column}${f.row}`.toUpperCase();
      cellFindingMap[coord] = f;
    }
  });

  const getColLetter = (index) => {
    return String.fromCharCode(65 + index);
  };

  const colProfiles = semantics.columns || {};

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Grid Controls */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400">
            {data.length} rows • {columns.length} columns
          </span>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 text-slate-400">
              <span className="w-2.5 h-2.5 rounded bg-rose-500/20 border border-rose-500"></span> Disruption / Bug
            </span>
            <span className="inline-flex items-center gap-1 text-slate-400">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500"></span> Staged Fix
            </span>
            <span className="inline-flex items-center gap-1 text-slate-400">
              <Lock className="w-3 h-3 text-cyan-400" /> Leading Zero Protected
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search rows or cells (e.g. G9)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-64"
          />
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="overflow-x-auto max-h-[600px] relative">
        <table className="w-full border-collapse text-left text-xs font-mono">
          <thead className="sticky top-0 bg-slate-950 z-10 border-b border-slate-800 text-slate-400">
            <tr>
              <th className="w-12 px-3 py-2.5 text-center bg-slate-950/90 border-r border-slate-800 text-[10px] text-slate-500 select-none">
                #
              </th>
              {columns.map((col, idx) => {
                const letter = getColLetter(idx);
                const prof = colProfiles[col] || {};
                const isId = prof.preserve_leading_zeros || prof.is_identifier;

                return (
                  <th key={col} className="px-3 py-2.5 border-r border-slate-800 whitespace-nowrap min-w-[140px]">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-bold text-slate-200 truncate">{col}</span>
                      {isId && (
                        <span title="Leading Zeros Protected as String Identifier">
                          <Lock className="w-3 h-3 text-cyan-400 shrink-0" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                      <span>{letter}</span>
                      <span className="capitalize text-slate-400">{prof.inferred_type || 'text'}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
            {data.map((row, rIdx) => {
              const rowNum = rIdx + 2; // Excel row index (header is 1)

              // Optional search filter
              if (searchTerm) {
                const rowStr = Object.values(row).join(' ').toLowerCase();
                if (!rowStr.includes(searchTerm.toLowerCase())) return null;
              }

              return (
                <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-3 py-2 text-center text-slate-500 bg-slate-950/50 border-r border-slate-800 select-none font-semibold text-[11px]">
                    {rowNum}
                  </td>

                  {columns.map((col, cIdx) => {
                    const colLetter = getColLetter(cIdx);
                    const coord = `${colLetter}${rowNum}`;
                    const rawVal = row[col];
                    const finding = cellFindingMap[coord];
                    const isAccepted = finding && acceptedIds.includes(finding.id);
                    const isTargetHighlight = highlightCell && highlightCell.toUpperCase() === coord;

                    let cellStyle = "border-r border-slate-800/60 px-3 py-2 truncate relative ";
                    if (isTargetHighlight) {
                      cellStyle += " ring-2 ring-indigo-400 bg-indigo-950/50 ";
                    } else if (isAccepted) {
                      cellStyle += " bg-emerald-950/40 text-emerald-200 border-emerald-800/40 ";
                    } else if (finding) {
                      cellStyle += " bg-rose-950/30 text-rose-200 border-rose-900/40 font-semibold ";
                    }

                    const displayValue = isAccepted && finding?.proposed_value !== undefined 
                      ? finding.proposed_value 
                      : (rawVal !== null && rawVal !== undefined ? String(rawVal) : '');

                    return (
                      <td
                        key={coord}
                        className={cellStyle}
                        onMouseEnter={() => finding && setActiveCellTooltip({ coord, finding })}
                        onMouseLeave={() => setActiveCellTooltip(null)}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">{displayValue}</span>
                          {finding && !isAccepted && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 animate-pulse" />
                          )}
                          {isAccepted && (
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                          )}
                        </div>

                        {/* Interactive Tooltip Popover on Hover */}
                        {activeCellTooltip?.coord === coord && (
                          <div className="absolute left-2 bottom-full mb-2 z-50 w-72 p-3 bg-slate-950 border border-slate-700 rounded-lg shadow-2xl text-left pointer-events-auto">
                            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
                              <span className="font-bold text-slate-100 flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                                Cell {coord}
                              </span>
                              <span className="text-[10px] uppercase font-bold text-indigo-400">
                                {finding.category.replace('_', ' ')}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-300 mb-2 leading-relaxed">
                              {finding.message}
                            </p>

                            {finding.proposed_value !== undefined && (
                              <div className="text-[11px] space-y-1 mb-2 bg-slate-900 p-2 rounded border border-slate-800">
                                <div className="text-rose-400 truncate">
                                  <span className="font-bold">Original:</span> {String(finding.current_value)}
                                </div>
                                <div className="text-emerald-400 truncate">
                                  <span className="font-bold">Fix:</span> {String(finding.proposed_value)}
                                </div>
                              </div>
                            )}

                            {finding.can_autofix && (
                              <button
                                onClick={() => onToggleAccept(finding.id)}
                                className={`w-full py-1 text-xs font-semibold rounded transition flex items-center justify-center gap-1.5 ${
                                  isAccepted
                                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                                {isAccepted ? 'Revert to Original' : 'Apply Proposed Fix'}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
