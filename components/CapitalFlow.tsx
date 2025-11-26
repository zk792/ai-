import React from 'react';
import { CapitalFlowData } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { CircleDollarSign } from 'lucide-react';

interface CapitalFlowProps {
  data: CapitalFlowData;
}

const CapitalFlow: React.FC<CapitalFlowProps> = ({ data }) => {
  const chartData = [
    { name: '主力', value: data.mainInflow },
    { name: '北向', value: data.northInflow },
    { name: '散户', value: data.retailInflow },
  ];

  return (
    <div className="bg-cardBg rounded-xl p-4 border border-slate-700 shadow-lg h-full">
      <div className="flex items-center gap-2 mb-4">
        <CircleDollarSign className="w-5 h-5 text-yellow-500" />
        <h3 className="text-lg font-semibold text-white">资金流向监控</h3>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
         <div className="text-center">
            <div className="text-xs text-slate-400">主力净流入</div>
            <div className={`text-sm font-bold ${data.mainInflow > 0 ? 'text-marketRed' : 'text-marketGreen'}`}>
               {data.mainInflow > 0 ? '+' : ''}{data.mainInflow}万
            </div>
         </div>
         <div className="text-center">
            <div className="text-xs text-slate-400">北向资金</div>
             <div className={`text-sm font-bold ${data.northInflow > 0 ? 'text-marketRed' : 'text-marketGreen'}`}>
               {data.northInflow > 0 ? '+' : ''}{data.northInflow}万
            </div>
         </div>
         <div className="text-center">
            <div className="text-xs text-slate-400">板块排名</div>
            <div className="text-sm font-bold text-yellow-400">TOP {data.sectorRank}</div>
         </div>
      </div>

      <div className="h-[150px] w-full">
         <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
               <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
               <XAxis type="number" hide />
               <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 12 }} width={30} />
               <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
               />
               <Bar dataKey="value" name="净流入" barSize={20}>
                  {chartData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#ef4444' : '#10b981'} />
                  ))}
               </Bar>
            </BarChart>
         </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CapitalFlow;