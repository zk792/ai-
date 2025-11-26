
import { StockData, KLinePoint, SentimentData, CapitalFlowData, TechnicalIndicators, HistoricalPrice } from '../types';

// Helper to generate random number within range
const random = (min: number, max: number) => Math.random() * (max - min) + min;

// Generate K-Line data working BACKWARDS from the current real price (Fallback)
export const generateKLineData = (days: number, endPrice: number, trend: 'bullish' | 'bearish' | 'neutral'): KLinePoint[] => {
  let currentClose = (endPrice && endPrice > 0) ? endPrice : 100;
  
  const data: KLinePoint[] = [];
  const now = new Date();

  let bias = 0;
  if (trend === 'bullish') bias = -0.002; 
  if (trend === 'bearish') bias = 0.002;

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    const volatility = currentClose * 0.025; 
    
    const change = random(-volatility, volatility) + (currentClose * bias);
    const prevClose = currentClose - change; 
    
    const open = prevClose + random(-volatility * 0.5, volatility * 0.5);
    const close = currentClose;
    const high = Math.max(open, close) + random(0, volatility * 0.8);
    const low = Math.min(open, close) - random(0, volatility * 0.8);
    const volume = Math.floor(random(50000, 1000000));

    data.unshift({
      date: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      volume,
      ma5: 0,
      ma10: 0,
      ma20: 0
    });
    
    currentClose = prevClose;
  }

  // Calculate MAs
  return calculateMAs(data);
};

// Generate K-Line data using REAL history points found by Gemini
export const generateChartFromHistory = (history: HistoricalPrice[], currentPrice: number): KLinePoint[] => {
  if (!history || history.length < 2) {
    return generateKLineData(30, currentPrice, 'neutral');
  }

  // Sort history by date ascending
  const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // If the last history point is far from current price, append current price as today
  const lastHist = sortedHistory[sortedHistory.length - 1];
  const todayStr = new Date().toISOString().split('T')[0];
  
  if (lastHist.date !== todayStr && Math.abs(lastHist.close - currentPrice) > 0.01) {
    sortedHistory.push({ date: todayStr, close: currentPrice });
  }

  const data: KLinePoint[] = sortedHistory.map((day, index) => {
    // We only have 'close'. We need to simulate Open/High/Low to make a candle.
    // We use the previous day's close as the anchor for today's open.
    const prevClose = index > 0 ? sortedHistory[index - 1].close : day.close * 0.99;
    
    const open = prevClose; // Simplification: Open = Prev Close
    const close = day.close;
    
    // Simulate high/low based on the body
    const bodyMax = Math.max(open, close);
    const bodyMin = Math.min(open, close);
    const volatility = close * 0.015; // 1.5% volatility assumption

    const high = bodyMax + random(0, volatility);
    const low = bodyMin - random(0, volatility);
    const volume = Math.floor(random(100000, 5000000));

    return {
      date: day.date,
      open: parseFloat(open.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      volume,
      ma5: 0,
      ma10: 0,
      ma20: 0
    };
  });

  return calculateMAs(data);
};

function calculateMAs(data: KLinePoint[]) {
  for (let i = 0; i < data.length; i++) {
    if (i >= 4) data[i].ma5 = data.slice(i - 4, i + 1).reduce((sum, item) => sum + item.close, 0) / 5;
    if (i >= 9) data[i].ma10 = data.slice(i - 9, i + 1).reduce((sum, item) => sum + item.close, 0) / 10;
    if (i >= 19) data[i].ma20 = data.slice(i - 19, i + 1).reduce((sum, item) => sum + item.close, 0) / 20;
  }
  return data;
}

// Fallback mock data if Search fails completely
export const getMockStockData = (symbol: string): StockData => {
  return {
    symbol,
    name: '数据获取失败',
    price: 0,
    change: 0,
    changePercent: 0,
    open: 0,
    high: 0,
    low: 0,
    volume: 0,
    turnoverRate: 0,
    pe: 0,
    marketCap: 0
  };
};
