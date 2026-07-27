import React, { useState } from 'react';
import { 
  Shield, 
  Plus, 
  Bug, 
  Map, 
  BookOpen, 
  CheckSquare, 
  XCircle, 
  AlertTriangle,
  Copy,
  Check,
  ArrowRight,
  Layers,
  Database,
  Cpu,
  FileCode
} from 'lucide-react';

type Tab = 'rules' | 'feature' | 'bugfix' | 'map' | 'ref';

const RULES = [
  {
    id: 1,
    title: 'The Rule of 250',
    text: 'If a .tsx file exceeds 250 lines, it must be split. This is a proxy for "doing more than one thing."',
    icon: <Layers size={16} />,
    color: 'text-[#D99026]',
    bg: 'bg-[#D99026]/10',
    border: 'border-[#D99026]/30'
  },
  {
    id: 2,
    title: 'Repository Firewall',
    text: 'Only files in repositories/ may import Firebase. If a component imports Firestore, the architecture is breached.',
    icon: <Shield size={16} />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30'
  },
  {
    id: 3,
    title: 'Factory First',
    text: 'Every new Photo must be born through createPhoto(). Never hand-craft objects. This prevents undefined crashes.',
    icon: <Database size={16} />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30'
  },
  {
    id: 4,
    title: 'Store First',
    text: 'New state belongs in useAppStore, never in App.tsx. Props should only flow one level deep.',
    icon: <Cpu size={16} />,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30'
  },
  {
    id: 5,
    title: 'Forbidden: God Components',
    text: 'Never add views, layout, auth logic, or state to App.tsx. It is a 70-line shell. If you touch it for a feature, your feature design is wrong.',
    icon: <XCircle size={16} />,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30'
  }
];

const FEATURE_STEPS = [
  { text: 'Define the data shape in types.ts', sub: 'If it extends Photo, update the factory defaults.' },
  { text: 'Extend the Store', sub: 'Add state + actions to stores/useAppStore.ts. Never use useState in a component for shared data.' },
  { text: 'Create Repository', sub: 'If it touches Firestore, create repositories/yourFeatureRepository.ts. Only file that imports Firebase.' },
  { text: 'Build the Feature', sub: 'Create features/yourFeature/components/*.tsx. Keep each file under 250 lines.' },
  { text: 'Wire Navigation', sub: 'Add the view to ViewRouter.tsx and the nav item to AppLayout.tsx.' },
  { text: 'Firewall Check', sub: 'Run the grep command. Confirm zero Firebase imports outside repositories.' },
];

const BUG_TREE = [
  {
    q: 'Is the data wrong, missing, or undefined?',
    a: 'Check factories/photoFactory.ts. Is the field in defaults? Is the component reading from the store selector correctly?'
  },
  {
    q: 'Does it work offline but break online (or vice versa)?',
    a: 'Check stores/useAppStore.ts action logic. Then check the relevant repositories/*.ts file.'
  },
  {
    q: 'Does it crash only on mobile/desktop or specific theme?',
    a: 'Check the component in features/. Look for unguarded window/navigator access or missing theme classes.'
  },
  {
    q: 'Does it break when another user/tab acts simultaneously?',
    a: 'Check Firestore subscription in the repository. Check for race conditions in optimistic update vs. remote sync.'
  },
  {
    q: 'Does it persist after refresh but wrong after re-login?',
    a: 'Check legacyStorage adapter in Zustand persist config. Check localStorage key collisions.'
  }
];

const QUICK_REF = [
  { want: 'Add a new view/screen', touch: 'ViewRouter.tsx\nAppLayout.tsx', never: 'App.tsx' },
  { want: 'Change how photos sync', touch: 'repositories/photoRepository.ts', never: 'GalleryView.tsx' },
  { want: 'Add a field to a lead', touch: 'types.ts\nfactories/photoFactory.ts\nReviewEditor sections', never: 'App.tsx' },
  { want: 'Change login logic', touch: 'features/auth/LoginScreen.tsx\nstores/useAppStore (auth slice)', never: 'App.tsx' },
  { want: 'Change offline behavior', touch: 'stores/useAppStore.ts\nrepositories/*.ts', never: 'UploadView.tsx' },
  { want: 'Add GPS tracking feature', touch: 'system/useGpsEngine.ts', never: 'App.tsx' },
  { want: 'Fix CSV export format', touch: 'utils/exportUtils.ts', never: 'AdminPanelView.tsx' },
  { want: 'Change theme colors', touch: 'index.css\nsystem/useThemeManager.ts', never: 'individual components' },
];

const GREP_CMD = `grep -r "from.*firebase" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules"`;

export default function DevPlaybook() {
  const [activeTab, setActiveTab] = useState<Tab>('rules');
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  const toggleStep = (idx: number) => {
    const next = new Set(checkedSteps);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setCheckedSteps(next);
  };

  const copyGrep = () => {
    navigator.clipboard.writeText(GREP_CMD);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'rules', label: 'The Rules', icon: Shield },
    { id: 'feature', label: 'Add Feature', icon: Plus },
    { id: 'bugfix', label: 'Fix Bug', icon: Bug },
    { id: 'map', label: 'Arch Map', icon: Map },
    { id: 'ref', label: 'Quick Ref', icon: BookOpen },
  ];

  return (
    <div className="bg-[#1A1515] min-h-screen text-white pb-24 rounded-2xl">
      {/* Header */}
      <div className="p-6 border-b border-[#3A2E2E] flex items-center justify-between sticky top-0 bg-[#1A1515] z-10 rounded-t-2xl">
        <div>
          <h2 className="text-xl font-bold text-[#D99026] flex items-center gap-2">
            <FileCode size={22} /> Architecture Playbook
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Read this before you code. Break these rules only if the architecture is wrong.</p>
        </div>
        <span className="text-[10px] font-mono bg-[#2D2424] border border-[#3A2E2E] px-2 py-1 rounded text-gray-400">
          Phase 5 Locked
        </span>
      </div>

      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  isActive
                    ? 'bg-[#D99026] text-black border-[#D99026]'
                    : 'bg-[#2D2424] text-gray-400 border-[#3A2E2E] hover:border-gray-500'
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* RULES TAB */}
        {activeTab === 'rules' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {RULES.map((rule) => (
              <div
                key={rule.id}
                className={`bg-[#2D2424] border ${rule.border} rounded-xl p-4 hover:opacity-90 transition-opacity`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-lg ${rule.bg} ${rule.color} flex items-center justify-center`}>
                    {rule.icon}
                  </div>
                  <h3 className="font-bold text-sm text-white">{rule.title}</h3>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{rule.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* FEATURE TAB */}
        {activeTab === 'feature' && (
          <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-[#D99026] text-sm uppercase tracking-wider">New Feature Workflow</h3>
            <p className="text-xs text-gray-400">Follow this exact order. Do not skip steps.</p>
            <div className="space-y-3">
              {FEATURE_STEPS.map((step, idx) => {
                const isChecked = checkedSteps.has(idx);
                return (
                  <label
                    key={idx}
                    onClick={() => toggleStep(idx)}
                    className="flex items-start gap-3 cursor-pointer group p-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                      isChecked ? 'bg-[#D99026] border-[#D99026]' : 'border-gray-600 bg-[#1A1515]'
                    }`}>
                      {isChecked && <Check size={12} className="text-black" />}
                    </div>
                    <div>
                      <span className={`text-sm font-bold block transition-colors ${isChecked ? 'text-gray-500 line-through' : 'text-white group-hover:text-[#D99026]'}`}>
                        {idx + 1}. {step.text}
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">{step.sub}</p>
                    </div>
                  </label>
                );
              })}
            </div>
            {checkedSteps.size === FEATURE_STEPS.length && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-lg text-xs font-bold text-center">
                ✅ All steps checked. You may proceed.
              </div>
            )}
          </div>
        )}

        {/* BUGFIX TAB */}
        {activeTab === 'bugfix' && (
          <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-[#D99026] text-sm uppercase tracking-wider">Bug Fix Decision Tree</h3>
            <div className="space-y-3">
              {BUG_TREE.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#1A1515] border border-[#3A2E2E] text-gray-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    Q{idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{item.q}</p>
                    <div className="flex items-start gap-1.5 mt-1">
                      <ArrowRight size={12} className="text-[#D99026] mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-400">{item.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MAP TAB */}
        {activeTab === 'map' && (
          <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-5 space-y-5">
            <h3 className="font-bold text-[#D99026] text-sm uppercase tracking-wider">Data Flow Architecture</h3>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-xs font-bold text-center">
              {[
                { label: 'Component', sub: 'features/*/components', color: 'border-gray-600' },
                { label: 'useAppStore', sub: 'stores/useAppStore.ts', color: 'border-[#D99026]/50 text-[#D99026]' },
                { label: 'Repository', sub: 'repositories/*.ts', color: 'border-blue-500/50 text-blue-400' },
                { label: 'Firebase', sub: 'services/firebase.ts', color: 'border-green-500/50 text-green-400' },
              ].map((box, i) => (
                <React.Fragment key={i}>
                  <div className={`flex-1 bg-[#1A1515] border ${box.color} rounded-lg p-3`}>
                    <div className="text-white mb-1">{box.label}</div>
                    <div className="text-gray-500 text-[10px]">{box.sub}</div>
                  </div>
                  {i < 3 && <div className="text-gray-600 hidden md:block">→</div>}
                </React.Fragment>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-[#1A1515] border border-[#3A2E2E] rounded-lg p-3">
                <span className="text-[#D99026] font-bold block mb-1">Factories</span>
                <span className="text-gray-500">Enforce defaults before data enters the system.</span>
              </div>
              <div className="bg-[#1A1515] border border-[#3A2E2E] rounded-lg p-3">
                <span className="text-[#D99026] font-bold block mb-1">System Hooks</span>
                <span className="text-gray-500">GPS, themes, timers. No business logic.</span>
              </div>
              <div className="bg-[#1A1515] border border-[#3A2E2E] rounded-lg p-3">
                <span className="text-[#D99026] font-bold block mb-1">Error Boundaries</span>
                <span className="text-gray-500">Contain crashes so one view cannot brick the app.</span>
              </div>
            </div>
          </div>
        )}

        {/* REF TAB */}
        {activeTab === 'ref' && (
          <div className="space-y-4">
            <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-5 overflow-x-auto">
              <h3 className="font-bold text-[#D99026] text-sm uppercase tracking-wider mb-4">File Touch Reference</h3>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#3A2E2E] text-gray-500">
                    <th className="py-2 pr-4 font-bold">I want to...</th>
                    <th className="py-2 pr-4 font-bold">Touch this file</th>
                    <th className="py-2 font-bold text-red-400">Never touch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3A2E2E]/50">
                  {QUICK_REF.map((row, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 pr-4 text-gray-300 align-top">{row.want}</td>
                      <td className="py-2.5 pr-4 text-[#D99026] font-mono align-top whitespace-pre-line">{row.touch}</td>
                      <td className="py-2.5 text-red-400 align-top">{row.never}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-[#2D2424] border border-[#3A2E2E] rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <AlertTriangle size={14} className="text-[#D99026]" /> Firewall Grep Command
                </span>
                <button
                  onClick={copyGrep}
                  className="text-[10px] bg-[#D99026] text-black px-3 py-1.5 rounded-lg font-bold hover:bg-[#b57b17] transition-colors flex items-center gap-1"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <code className="block text-[10px] font-mono text-emerald-400 bg-[#1A1515] p-3 rounded-lg border border-[#3A2E2E]">
                {GREP_CMD}
              </code>
              <p className="text-[10px] text-gray-500 mt-2">
                Run this before every commit. If it returns anything outside <span className="text-[#D99026]">repositories/</span> or <span className="text-[#D99026]">services/firebase.ts</span>, the firewall is breached.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-[10px] text-gray-600 pt-4 border-t border-[#3A2E2E]">
          FieldTrack Architecture v5.0 — If you need to break these rules, the architecture is wrong, not the rule.
        </div>
      </div>
    </div>
  );
}
