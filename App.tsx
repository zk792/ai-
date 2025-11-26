
import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Search, RefreshCw, TrendingUp, AlertCircle, Database } from 'lucide-react';
import { 
  generateKLineData,
  generateChartFromHistory
} from './services/mockData';
import { fetchStockDataAndAnalyze, analyzeProvidedStockData } from './services/geminiService';
import { fetchSanhuRealtime, fetchSanhuKLine } from './services/stockApiService';
import StockChart from './components/StockChart';
import SentimentPanel from './components/SentimentPanel';
import AIReport from './components/AIReport';
import CapitalFlow from './components/CapitalFlow';
import { StockData, KLinePoint, SentimentData, CapitalFlowData, TechnicalIndicators, AIAnalysisResult } from './types';

function App() {
  const [ticker, setTicker] = useState('600519');
  const [stock, setStock] = useState<StockData | null>(null);
  const [kline, setKline] = useState<KLinePoint[]>([]);
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [capital, setCapital] = useState<CapitalFlowData | null>(null);
  const [technical, setTechnical] = useState<TechnicalIndicators | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataMode, setDataMode] = useState<'sanhu' | 'search' | 'mock'>('search');

  const fetchData = useCallback(async (symbol: string) => {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setStock(null);
    setKline([]);
    setTechnical(null); // Reset technicals to avoid stale data issues
    
    try {
      // 1. Try Fetching from Sanhu Lianghua API (Primary for Quant)
      let apiRealtime = null;
      let apiKLine: KLinePoint[] = [];
      let apiSuccess = false;

      try {
        // Parallel fetch: Sanhu Realtime + Sanhu KLine
        const [realtime, klineData] = await Promise.all([
           fetchSanhuRealtime(symbol),
           fetchSanhuKLine(symbol)
        ]);
        
        if (realtime && realtime.price > 0) {
          apiRealtime = realtime;
          apiSuccess = true;
          setDataMode('sanhu');
        }
        
        if (klineData && klineData.length > 0) {
          apiKLine = klineData;
        }
      } catch (e) {
        console.warn("API Fetch Failed, falling back to Search", e);
      }

      if (apiSuccess && apiRealtime) {
        // --- API PATH ---
        setStock(apiRealtime);
        setKline(apiKLine);
        
        // Pass the REAL data to Gemini for analysis
        // Note: analyzeProvidedStockData now handles its own errors and returns a fallback if AI fails
        const aiResult = await analyzeProvidedStockData(apiRealtime, apiKLine);
        
        setSentiment(aiResult.sentiment);
        setCapital(aiResult.capital);
        setTechnical(aiResult.technical);
        setAnalysis(aiResult.analysis);

      } else {
        // --- FALLBACK: GEMINI SEARCH PATH ---
        setDataMode('search');
        const data = await fetchStockDataAndAnalyze(symbol);

        setStock(data.stock);
        setSentiment(data.sentiment);
        setCapital(data.capital);
        setTechnical(data.technical);
        setAnalysis(data.analysis);

        // Chart Generation
        if (data.history && data.history.length >= 5) {
          const historyChart = generateChartFromHistory(data.history, data.stock.price);
          setKline(historyChart);
        } else {
          const trend = data.sentiment.trend || 'neutral';
          const simulatedChart = generateKLineData(60, data.stock.price, trend);
          setKline(simulatedChart);
        }
      }

    } catch (err) {
      console.error(err);
      setError("无法获取数据，请检查股票代码是否正确，或检查网络连接（HTTP接口可能被阻止）。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(ticker);
  }, []); // Initial load

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim()) return;
    fetchData(ticker);
  };

  return (
    <div className="min-h-screen bg-darkBg text-slate-200 p-4 lg:p-8 font-sans">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Activity className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
              QuantFlow AI
            </h1>
            <p className="text-xs text-slate-500 tracking-wider">实时量化 · 散户量化API + Gemini 2.5</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="输入代码 (如 002423)"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white placeholder-slate-500"
          />
          <button 
            type="submit"
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </form>
      </header>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6 text-center text-sm">
          {error}
        </div>
      )}

      {loading && !stock && (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-4">
           <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
           <p className="animate-pulse">正在连接散户量化接口获取实时行情...</p>
        </div>
      )}

      {!loading && stock && (
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Top Row: Price Info & Chart */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Price Header */}
            <div className="flex flex-wrap items-end gap-4">
              <h2 className="text-3xl font-bold text-white">{stock.name} <span className="text-lg text-slate-500 font-normal">({stock.symbol})</span></h2>
              <div className={`text-3xl font-mono font-bold ${stock.change >= 0 ? 'text-marketRed' : 'text-marketGreen'}`}>
                {stock.price.toFixed(2)}
              </div>
              <div className={`flex gap-2 mb-1 ${stock.change >= 0 ? 'text-marketRed' : 'text-marketGreen'}`}>
                <span className="font-bold">{stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}</span>
                <span>({stock.changePercent.toFixed(2)}%)</span>
              </div>
              <div className="ml-auto flex gap-4 text-xs text-slate-400 mb-1">
                 <span>成交量: {stock.volume > 1000000 ? (stock.volume / 1000000).toFixed(2) + 'M' : stock.volume}</span>
                 <span>市盈率: {stock.pe}</span>
                 <span>市值: {stock.marketCap > 100000000 ? (stock.marketCap / 100000000).toFixed(2) + '亿' : stock.marketCap}</span>
              </div>
            </div>

            {/* Main Chart */}
            <StockChart data={kline} />
            
            <div className="text-xs text-slate-500 text-right -mt-4 italic flex justify-end gap-2 items-center">
              {dataMode === 'sanhu' ? (
                 <span className="text-green-500 flex items-center gap-1">
                   <Database className="w-3 h-3" /> 数据源: 散户量化API (Realtime + KLine)
                 </span>
              ) : (
                 <span className="text-yellow-500 flex items-center gap-1">
                   <AlertCircle className="w-3 h-3" /> API连接失败，降级为 Gemini 搜索模式
                 </span>
              )}
            </div>
            
            {/* Bottom Row Left: Sentiment & Capital */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
               {sentiment && <SentimentPanel data={sentiment} />}
               {capital && <CapitalFlow data={capital} />}
            </div>
          </div>

          {/* Right Column: AI Analysis */}
          <div className="lg:col-span-4 flex flex-col gap-6">
             <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 rounded-xl p-4 flex items-center justify-between">
                <div>
                   <div className="text-xs text-indigo-300 mb-1">实时技术指标</div>
                   <div className="flex gap-3 text-sm font-mono">
                      <span>RSI: <b className="text-white">{technical?.rsi || '-'}</b></span>
                      <span>KDJ: <b className="text-white">{technical?.kdj?.j || '-'}</b></span>
                   </div>
                </div>
                <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center">
                   <TrendingUp className="w-5 h-5 text-indigo-400" />
                </div>
             </div>

             <div className="flex-grow">
               <AIReport analysis={analysis} loading={loading} />
             </div>
          </div>
        </main>
      )}
    </div>
  );
}

export default App;
