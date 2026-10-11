import React from 'react';
import { useEditorStore } from '../store/editorContext.jsx';
import {
  AlertTriangle,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight,
  Eye,
  Maximize2,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';

export default function WarningsPanel({ onClose }) {
  const { warnings, jumpToWarning, activeBreakpoint } = useEditorStore();

  const getWarningBadge = (type) => {
    switch (type) {
      case 'broken_page_link':
        return { label: 'Broken Link', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
      case 'invalid_external_url':
        return { label: 'Invalid URL', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
      case 'missing_asset':
        return { label: 'Missing Asset', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'missing_alt_text':
        return { label: 'Accessibility', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'overflow_risk':
        return { label: 'Overflow Risk', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'low_contrast':
        return { label: 'Contrast', color: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30' };
      default:
        return { label: 'Notice', color: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30' };
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-h-[500px] flex flex-col rounded-2xl bg-[#141418]/95 border border-white/15 backdrop-blur-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200 select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-[#18181c]/90">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold text-white">Project Health Warnings</h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25">
            {warnings.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Warnings List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {warnings.length === 0 ? (
          <div className="py-10 text-center text-zinc-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-xs font-semibold text-emerald-300">All Checks Passed</p>
            <p className="text-[11px] text-zinc-500">
              No broken links, missing assets, overflow risks, or contrast warnings detected at{' '}
              <span className="capitalize font-mono text-zinc-400">{activeBreakpoint}</span> breakpoint.
            </p>
          </div>
        ) : (
          warnings.map((w, idx) => {
            const badge = getWarningBadge(w.type);
            return (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-black/40 border border-white/5 hover:border-white/15 transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${badge.color}`}
                  >
                    {badge.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => jumpToWarning(w)}
                    className="flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    <span>Jump to element</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <p className="text-xs text-zinc-200 leading-snug">{w.message}</p>

                <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 pt-1">
                  <span>Page: {w.pageName}</span>
                  {w.nodeName && (
                    <>
                      <span>&bull;</span>
                      <span>Target: {w.nodeName}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 bg-[#111114] border-t border-white/10 flex items-center justify-between text-[10px] text-zinc-500">
        <span>Evaluated against {activeBreakpoint} viewport</span>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-400 hover:text-white cursor-pointer font-medium"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
