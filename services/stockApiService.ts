
import { StockData, KLinePoint } from '../types';

const SANHU_TOKEN = 'ecee261e1f54aaeee1142a5491a71807';

// Fix: Avoid accessing 'process' directly as it causes ReferenceError in browser environments without bundlers.
// Use window.location to detect environment.
const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// If deployed (not local), request /api/proxy/v1/... -> Nginx will forward to http://www.sanhulianghua.com:2008/v1/...
// If local, use direct URL (requires browser to allow mixed content or CORS extension if API doesn't support CORS)
const BASE_URL = isLocal 
  ? 'http://www.sanhulianghua.com:2008' 
  : '/api/proxy';

const SANHU_BASE_URL_REALTIME = `${BASE_URL}/v1/hsa_fenshi`;
const SANHU_BASE_URL_KLINE = `${BASE_URL}/v1/hsa_rixian`;

// Helper: Ensure value is a valid number, default to 0 if NaN/Null/Undefined
function safeFloat(val: any): number {
  const num = parseFloat(val);
  return isFinite(num) ? num : 0;
}

// Helper to calculate moving averages
function calculateMAs(data: KLinePoint[]) {
  for (let i = 0; i < data.length; i++) {
    if (i >= 4) data[i].ma5 = data.slice(i - 4, i + 1).reduce((sum, item) => sum + item.close, 0) / 5;
    if (i >= 9) data[i].ma10 = data.slice(i - 9, i + 1).reduce((sum, item) => sum + item.close, 0) / 10;
    if (i >= 19) data[i].ma20 = data.slice(i - 19, i + 1).reduce((sum, item) => sum + item.close, 0) / 20;
  }
  return data;
}

// Calculate KDJ (9, 3, 3)
function calculateKDJ(data: KLinePoint[]) {
  let k = 50;
  let d = 50;

  for (let i = 0; i < data.length; i++) {
    const period = 9;
    const start = Math.max(0, i - period + 1);
    const window = data.slice(start, i + 1);
    
    let low9 = window[0].low;
    let high9 = window[0].high;
    
    window.forEach(p => {
      if (p.low < low9) low9 = p.low;
      if (p.high > high9) high9 = p.high;
    });

    const close = data[i].close;
    let rsv = 50;
    
    if (high9 !== low9) {
      rsv = ((close - low9) / (high9 - low9)) * 100;
    }

    // Standard parameters: 2/3 previous + 1/3 current
    k = (2/3) * k + (1/3) * rsv;
    d = (2/3) * d + (1/3) * k;
    const j = 3 * k - 2 * d;

    data[i].k = Number(k.toFixed(2));
    data[i].d = Number(d.toFixed(2));
    data[i].j = Number(j.toFixed(2));
  }
  return data;
}

// Calculate RSI (14)
function calculateRSI(data: KLinePoint[]) {
  const period = 14;
  if (data.length < period) return data;

  let gains = 0;
  let losses = 0;

  // Initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // First RSI
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  data[period].rsi = Number((100 - (100 / (1 + rs))).toFixed(2));

  // Smoothed RSI for rest
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    data[i].rsi = Number((100 - (100 / (1 + rs))).toFixed(2));
  }

  return data;
}

// 1. Real-Time Data (Minute Level Snapshot)
export async function fetchSanhuRealtime(ticker: string): Promise<StockData | null> {
  try {
    const url = `${SANHU_BASE_URL_REALTIME}?token=${SANHU_TOKEN}&code=${ticker}&all=1&simple=1`;
    console.log("Fetching Realtime:", url);
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Sanhu Realtime API response not ok');
    
    const json = await response.json();
    
    if (json.ret !== 200) {
       console.warn("Sanhu API returned error:", json);
       return null;
    }

    let snapshot: any = null;

    if (Array.isArray(json.data) && json.data.length > 0) {
      snapshot = json.data[json.data.length - 1];
    } else if (typeof json.data === 'object' && json.data !== null) {
      snapshot = json.data;
    } else {
      return null;
    }
    
    if (!snapshot) return null;

    // Use safeFloat to prevent NaNs
    const price = safeFloat(snapshot.JiaGe) * 0.001;
    const changePercent = safeFloat(snapshot.ZhangFu) * 0.001;
    const changeAmount = price * (changePercent / 100); 
    const open = safeFloat(snapshot.KaiPan) * 0.001;
    const high = safeFloat(snapshot.ZuiGao) * 0.001;
    const low = safeFloat(snapshot.ZuiDi) * 0.001;
    const volume = safeFloat(snapshot.ZongLiang);
    const turnoverRate = safeFloat(snapshot.HuanShou) * 0.001;
    const pe = safeFloat(snapshot.ShiYingLv) * 0.001;
    const marketCap = safeFloat(snapshot.ShiZhi) * 10000;
    
    const name = json.stock_name || ticker;

    return {
      symbol: ticker,
      name: name,
      price: Number(price.toFixed(2)),
      change: Number(changeAmount.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      volume: volume,
      turnoverRate: Number(turnoverRate.toFixed(2)),
      pe: Number(pe.toFixed(2)),
      marketCap: marketCap
    };

  } catch (error) {
    console.warn("Sanhu Realtime API failed:", error);
    return null;
  }
}

// 2. Historical Daily K-Line Data
export async function fetchSanhuKLine(ticker: string): Promise<KLinePoint[]> {
  try {
    const url = `${SANHU_BASE_URL_KLINE}?token=${SANHU_TOKEN}&code=${ticker}&all=0`;
    console.log("Fetching KLine:", url);
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Sanhu KLine API response not ok');
    
    const json = await response.json();
    
    if (json.ret !== 200 || !json.data || !Array.isArray(json.data)) {
        console.warn("Sanhu KLine API returned invalid data", json);
        return [];
    }

    const klineData: KLinePoint[] = json.data.map((item: any) => ({
      date: item.RiQi,
      open: Number((safeFloat(item.KaiPan) * 0.001).toFixed(2)),
      high: Number((safeFloat(item.ZuiGao) * 0.001).toFixed(2)),
      low: Number((safeFloat(item.ZuiDi) * 0.001).toFixed(2)),
      close: Number((safeFloat(item.ShouPan) * 0.001).toFixed(2)),
      volume: safeFloat(item.ZongLiang),
      ma5: 0,
      ma10: 0,
      ma20: 0
    }));

    klineData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    calculateMAs(klineData);
    calculateKDJ(klineData);
    calculateRSI(klineData);

    return klineData;

  } catch (error) {
    console.warn("Sanhu KLine API failed:", error);
    return [];
  }
}

export async function fetchMairuiKLine(ticker: string): Promise<KLinePoint[]> {
    return [];
}
