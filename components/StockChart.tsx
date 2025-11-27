
import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { KLinePoint } from '../types';

interface StockChartProps {
  data: KLinePoint[];
}

const StockChart: React.FC<StockChartProps> = ({ data }) => {
  // Safe filter: Remove any points with NaN or Infinity values that crash Recharts
  const validData = (data || []).filter(item => 
    isFinite(item.open) && 
    isFinite(item.close) && 
    isFinite(item.high) && 
    isFinite(item.low) && 
    item.open > 0
  );

  if (validData.length === 0) {
    return (
      <div className="h-[400px] w-full bg-cardBg rounded-xl p-4 border border-slate-700 shadow-lg flex items-center justify-center text-slate-500">
        暂无有效走势数据 (数据源为空或无效)
      </div>
    );
  }

  return (
    <div className="h-[400px] w-full bg-cardBg rounded-xl p-4 border border-slate-700 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">价格走势 & 均线</h3>
        <div className="flex gap-4 text-xs">
          <span className="text-yellow-400">MA5 (5日线)</span>
          <span className="text-blue-400">MA10 (10日线)</span>
          <span className="text-purple-400">MA20 (20日线)</span>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart data={validData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="date" 
            tick={{ fill: '#94a3b8', fontSize: 10 }} 
            tickLine={false}
            axisLine={{ stroke: '#475569' }}
          />
          <YAxis 
            domain={['auto', 'auto']} 
            tick={{ fill: '#94a3b8', fontSize: 10 }} 
            tickLine={false}
            axisLine={false}
            orientation="right"
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
            itemStyle={{ fontSize: 12 }}
            labelStyle={{ color: '#cbd5e1', marginBottom: 4 }}
          />
          
          {/* Moving Averages */}
          <Line type="monotone" dataKey="ma5" name="MA5" stroke="#facc15" dot={false} strokeWidth={1} isAnimationActive={false} />
          <Line type="monotone" dataKey="ma10" name="MA10" stroke="#60a5fa" dot={false} strokeWidth={1} isAnimationActive={false} />
          <Line type="monotone" dataKey="ma20" name="MA20" stroke="#c084fc" dot={false} strokeWidth={1} isAnimationActive={false} />

          {/* Candlestick Simulation */}
           <Bar dataKey="close" name="收盘价" barSize={8} isAnimationActive={false}>
            {
              validData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.close > entry.open ? '#ef4444' : '#10b981'} />
              ))
            }
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart;
