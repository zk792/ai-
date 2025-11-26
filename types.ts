
export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  turnoverRate: number; // 换手率
  pe: number; // 市盈率
  marketCap: number; // 市值
}

export interface KLinePoint {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  ma5: number;
  ma10: number;
  ma20: number;
  k?: number;
  d?: number;
  j?: number;
  rsi?: number;
}

export interface SentimentData {
  score: number; // 0-100
  trend: 'bullish' | 'bearish' | 'neutral';
  hotTopics: string[];
  sources: {
    name: string;
    heat: number; // 0-100
  }[];
  recentComments: {
    user: string;
    text: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    time: string;
  }[];
}

export interface CapitalFlowData {
  mainInflow: number; // 主力净流入 (Wait)
  northInflow: number; // 北向资金
  retailInflow: number; // 散户净流入
  sectorRank: number; // 板块排名
}

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    dif: number;
    dea: number;
    macd: number;
  };
  kdj: {
    k: number;
    d: number;
    j: number;
  };
}

export interface WebSource {
  title: string;
  uri: string;
}

export interface AIAnalysisResult {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100
  targetPriceHigh: number;
  targetPriceLow: number;
  reasoning: string;
  riskFactors: string[];
  sources?: WebSource[]; // Sources from Google Search
}

export interface HistoricalPrice {
  date: string;
  close: number;
}

export interface RealTimeDataResult {
  stock: StockData;
  sentiment: SentimentData;
  capital: CapitalFlowData;
  technical: TechnicalIndicators;
  analysis: AIAnalysisResult;
  history?: HistoricalPrice[]; // New field for real trend data
}