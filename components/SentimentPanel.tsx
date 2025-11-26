
import React from 'react';
import { SentimentData } from '../types';
import { MessageSquare } from 'lucide-react';

interface SentimentPanelProps {
  data: SentimentData;
}

const SentimentPanel: React.FC<SentimentPanelProps> = ({ data }) => {
  // Safety checks: Ensure sources array exists and has elements before accessing properties
  const sources = data.sources || [];
  const s1 = sources[0] || { name: '雪球', heat: 0 };
  const s2 = sources[1] || { name: '东方财富', heat: 0 };
  const s3 = sources[2] || { name: '微博财经', heat: 0 };

  return (
    <div className="bg-cardBg rounded-xl p-4 border border-slate-700 shadow-lg h-full">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">论坛情绪指数</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800/50 p-4 rounded-lg flex flex-col items-center justify-center">
          <span className="text-sm text-slate-400 mb-1">情绪总分</span>
          <span className={`text-3xl font-bold ${data.score > 50 ? 'text-marketRed' : 'text-marketGreen'}`}>
            {data.score}
          </span>
          <span className="text-xs text-slate-500 mt-1">{data.trend === 'bullish' ? '看多' : '看空'}趋势</span>
        </div>
        <div className="space-y-2">
           <div className="flex justify-between items-center text-xs text-slate-300">
             <span>{s1.name || '雪球'}</span>
             <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
               <div className="h-full bg-orange-500" style={{ width: `${s1.heat || 0}%` }}></div>
             </div>
           </div>
           <div className="flex justify-between items-center text-xs text-slate-300">
             <span>{s2.name || '东方财富'}</span>
             <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
               <div className="h-full bg-orange-500" style={{ width: `${s2.heat || 0}%` }}></div>
             </div>
           </div>
           <div className="flex justify-between items-center text-xs text-slate-300">
             <span>{s3.name || '微博'}</span>
             <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
               <div className="h-full bg-blue-500" style={{ width: `${s3.heat || 0}%` }}></div>
             </div>
           </div>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">热门话题</h4>
        <div className="flex flex-wrap gap-2">
          {data.hotTopics && data.hotTopics.length > 0 ? (
            data.hotTopics.map((topic, i) => (
              <span key={i} className="px-2 py-1 bg-slate-700 text-slate-200 text-xs rounded-md">
                #{topic}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-500">暂无热门话题</span>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">最新评论</h4>
        <div className="space-y-3 max-h-[150px] overflow-y-auto pr-1">
          {data.recentComments && data.recentComments.length > 0 ? (
            data.recentComments.map((comment, i) => (
              <div key={i} className="bg-slate-800/30 p-2 rounded border-l-2 border-slate-600">
                 <div className="flex justify-between text-xs mb-1">
                   <span className="font-medium text-slate-300">{comment.user}</span>
                   <span className="text-slate-500">{comment.time}</span>
                 </div>
                 <p className="text-xs text-slate-400 truncate">{comment.text}</p>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-500 text-center py-2">暂无评论数据</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SentimentPanel;
