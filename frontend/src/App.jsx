import React, { useState, useEffect, useRef } from 'react';
import { 
  FileSpreadsheet, Upload, Download, CheckCircle, RefreshCw, 
  GitPullRequest, Table, Database, Terminal, Shield, Sparkles, ChevronDown 
} from 'lucide-react';

import TrustScorecard from './components/TrustScorecard';
import ReviewFeed from './components/ReviewFeed';
import DataGridDiff from './components/DataGridDiff';
import SemanticInspector from './components/SemanticInspector';
import RuleConsole from './components/RuleConsole';

export default function App() {
  const [samples, setSamples] = useState([]);
  const [selectedSample, setSelectedSample] = useState('saas_forecast');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('review'); // 'review' | 'grid' | 'semantics' | 'rules'
  const [acceptedIds, setAcceptedIds] = useState([]);
  const [rejectedIds, setRejectedIds] = useState([]);
  const [highlightCell, setHighlightCell] = useState(null);
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef(null);

  // Load samples list and default sample on mount
  useEffect(() => {
    fetchSamples();
  }, []);

  const fetchSamples = async () => {
    try {
      const res = await fetch('/api/samples');
      const data = await res.json();
      setSamples(data);
      if (data.length > 0) {
        loadSampleData(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load samples:", err);
    }
  };

  const loadSampleData = async (sampleId) => {
    setLoading(true);
    setSelectedSample(sampleId);
    setAcceptedIds([]);
    setRejectedIds([]);
    setHighlightCell(null);
    try {
      const res = await fetch(`/api/load-sample/${sampleId}`, { method: 'POST' });
      const data = await res.json();
      setSession(data);
    } catch (err) {
      console.error("Failed to load sample data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setAcceptedIds([]);
    setRejectedIds([]);
    setHighlightCell(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setSession(data);
      setSelectedSample('');
    } catch (err) {
      console.error("Failed to upload file:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAccept = (id) => {
    setRejectedIds(prev => prev.filter(x => x !== id));
    setAcceptedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleReject = (id) => {
    setAcceptedIds(prev => prev.filter(x => x !== id));
    setRejectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleInspectCell = (cell) => {
    setHighlightCell(cell);
    setActiveTab('grid');
  };

  const handleExport = async (mode = 'annotated') => {
    if (!session?.session_id) return;
    setExporting(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.session_id,
          accepted_patch_ids: acceptedIds,
          mode: mode
        })
      });
      const data = await res.json();
      if (data.download_url) {
        window.location.href = data.download_url;
      }
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadManifest = () => {
    if (!session) return;
    const manifest = {
      file: session.filename,
      audit_date: new Date().toISOString(),
      trust_score: session.trust_scorecard,
      accepted_patches: session.findings.filter(f => acceptedIds.includes(f.id)),
      rejected_findings: session.findings.filter(f => rejectedIds.includes(f.id)),
      schema: session.semantics
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Audit_Manifest_${session.filename}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-6 py-3.5 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">SheetGuard</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                CODE REVIEWER
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Spreadsheet Quality Inspector & Analytical Linter</p>
          </div>
        </div>

        {/* Action Controls & Sample Switcher */}
        <div className="flex items-center gap-3">
          
          {/* Sample Switcher */}
          <div className="relative hidden md:block">
            <select
              value={selectedSample}
              onChange={(e) => loadSampleData(e.target.value)}
              className="appearance-none bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 px-3 py-2 pr-8 rounded-lg font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="" disabled>Choose Preset Scenario...</option>
              {samples.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Upload Custom Spreadsheet */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 flex items-center gap-2 transition"
          >
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>Upload File</span>
          </button>

          {/* Export Dropdown / Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleExport('annotated')}
              disabled={exporting || !session}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition"
              title="Exports Excel file with cell comments and _Audit_Changelog tab"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? 'Exporting...' : 'Export Audited XLSX'}</span>
            </button>
            <button
              onClick={handleDownloadManifest}
              disabled={!session}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
              title="Download JSON Audit Manifest"
            >
              <Shield className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {loading ? (
          <div className="py-32 text-center">
            <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-4" />
            <h3 className="text-slate-200 font-bold text-lg">Inspecting Workbook Semantics & Formulas...</h3>
            <p className="text-slate-500 text-sm mt-1">Analyzing R1C1 pattern continuity, range boundaries, and counterfactual KPI deltas.</p>
          </div>
        ) : session ? (
          <div>
            {/* Executive Trust Scorecard ("Can I Trust This Report?") */}
            <TrustScorecard 
              scorecard={session.trust_scorecard} 
              findings={session.findings}
              onSelectCategory={(cat) => {
                setActiveTab('review');
              }}
            />

            {/* Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 mb-6">
              <div className="flex items-center gap-1">
                <TabButton
                  active={activeTab === 'review'}
                  onClick={() => setActiveTab('review')}
                  icon={<GitPullRequest className="w-4 h-4" />}
                  label="PR-Style Code Review"
                  badge={session.findings.length}
                />
                <TabButton
                  active={activeTab === 'grid'}
                  onClick={() => setActiveTab('grid')}
                  icon={<Table className="w-4 h-4" />}
                  label="Interactive Staging Grid"
                />
                <TabButton
                  active={activeTab === 'semantics'}
                  onClick={() => setActiveTab('semantics')}
                  icon={<Database className="w-4 h-4" />}
                  label="Data Semantics & Grain"
                />
                <TabButton
                  active={activeTab === 'rules'}
                  onClick={() => setActiveTab('rules')}
                  icon={<Terminal className="w-4 h-4" />}
                  label="Plain-English Linter Rules"
                />
              </div>

              <div className="text-xs font-mono text-slate-500 pb-2">
                Active file: <span className="text-slate-300 font-semibold">{session.filename}</span>
              </div>
            </div>

            {/* Active Tab Panel */}
            {activeTab === 'review' && (
              <ReviewFeed
                findings={session.findings}
                acceptedIds={acceptedIds}
                rejectedIds={rejectedIds}
                onToggleAccept={toggleAccept}
                onToggleReject={toggleReject}
                onInspectCell={handleInspectCell}
              />
            )}

            {activeTab === 'grid' && (
              <DataGridDiff
                columns={session.columns}
                data={session.data_preview}
                findings={session.findings}
                semantics={session.semantics}
                acceptedIds={acceptedIds}
                highlightCell={highlightCell}
                onToggleAccept={toggleAccept}
              />
            )}

            {activeTab === 'semantics' && (
              <SemanticInspector semantics={session.semantics} />
            )}

            {activeTab === 'rules' && (
              <RuleConsole 
                sessionId={session.session_id} 
                columns={session.columns}
              />
            )}
          </div>
        ) : (
          <div className="py-24 text-center">
            <FileSpreadsheet className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-slate-300 font-bold text-lg">No Workbook Loaded</h3>
            <p className="text-slate-500 text-sm mt-1">Upload an Excel or CSV file to inspect data quality and formula integrity.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-4 text-center text-xs text-slate-600 font-mono">
        SheetGuard Code Reviewer • Semantic Profiling, Formula AST Integrity, & Counterfactual Impact Simulation
      </footer>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, badge }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 font-semibold text-xs transition border-b-2 flex items-center gap-2 ${
        active
          ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
          : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge !== undefined && (
        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
          active ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}
