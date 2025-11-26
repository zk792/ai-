
import React from 'react';
import { AIAnalysisResult } from '../types';
import { Bot, AlertTriangle, Target, BrainCircuit, ExternalLink, TriangleAlert } from 'lucide-react';

interface AIReportProps {
  analysis: AIAnalysisResult | null;
  loading: boolean;
}

const actionMap = {
  'BUY': '买入',
  'SELL': '卖出',
  'HOLD': '持有'
};

const AIReport: React.FC<AIReportProps> = ({ analysis, loading }) => {
  if (loading) {
    return (
      <div className="bg-cardBg rounded-xl p-6 border border-slate-700 shadow-lg h-full flex flex-col items-center justify-center animate-pulse">
        <Bot className="w-12 h-12 text-slate-500 mb-4 animate-bounce" />
        <h3 className="text-slate-400">Gemini 正在全网搜集数据...</h3>
        <p className="text-xs text-slate-600 mt-2">正在分析雪球、股吧及财经新闻</p>
      </div>
    );
  }

  if (!analysis) return null;

  // Check if reasoning implies an error
  const isError = analysis.reasoning.includes("Quota Exceeded") || analysis.reasoning.includes("[系统提示]");
  
  const actionColor = analysis.action === 'BUY' ? 'text-marketRed' : analysis.action === 'SELL' ? 'text-marketGreen' : 'text-yellow-400';
  const actionBg = analysis.action === 'BUY' ? 'bg-red-500/10 border-red-500/30' : analysis.action === 'SELL' ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30';

  return (
    <div className={`bg-cardBg rounded-xl p-6 border border-slate-700 shadow-lg h-full flex flex-col`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-500/20 rounded-lg">
           <BrainCircuit className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
           <h3 className="text-lg font-bold text-white">AI 量化决策</h3>
           <p className="text-xs text-slate-500">模型核心: Gemini 2.5 Flash (Live)</p>
        </div>
      </div>

      <div className={`flex items-center justify-between p-4 rounded-xl border mb-6 ${actionBg}`}>
        <div>
          <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">建议操作</span>
          <div className={`text-4xl font-black ${actionColor}`}>{actionMap[analysis.action]}</div>
        </div>
        <div className="text-right">
           <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">置信度</span>
           <div className="text-2xl font-bold text-white">{analysis.confidence}%</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
         <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
               <Target className="w-4 h-4 text-slate-400" />
               <span className="text-xs text-slate-400">压力位 (High)</span>
            </div>
            <div className="text-lg font-mono text-white">¥{analysis.targetPriceHigh.toFixed(2)}</div>
         </div>
         <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
               <Target className="w-4 h-4 text-slate-400" />
               <span className="text-xs text-slate-400">支撑位 (Low)</span>
            </div>
            <div className="text-lg font-mono text-white">¥{analysis.targetPriceLow.toFixed(2)}</div>
         </div>
      </div>

      <div className="mb-6 flex-grow">
         <h4 className="text-sm font-semibold text-slate-300 mb-2">逻辑推演</h4>
         {isError ? (
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-lg flex gap-2 items-start text-yellow-200 text-sm">
                <TriangleAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>{analysis.reasoning}</p>
            </div>
         ) : (
            <p className="text-sm text-slate-400 leading-relaxed text-justify">
                {analysis.reasoning}
            </p>
         )}
      </div>

      <div className="mb-6">
         <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> 风险提示
         </h4>
         <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
            {analysis.riskFactors.map((risk, i) => (
               <li key={i}>{risk}</li>
            ))}
         </ul>
      </div>

      {analysis.sources && analysis.sources.length > 0 && (
        <div className="pt-4 border-t border-slate-700">
           <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">数据来源 (Google Search)</h4>
           <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
             {analysis.sources.map((source, i) => (
               <a 
                 key={i} 
                 href={source.uri} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 truncate"
               >
                 <ExternalLink className="w-3 h-3 flex-shrink-0" />
                 <span className="truncate">{source.title}</span>
               </a>
             ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default AIReport;
