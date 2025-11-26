
import { GoogleGenAI, Type } from "@google/genai";
import { RealTimeDataResult, WebSource, StockData, KLinePoint, TechnicalIndicators } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY not found in environment");
  return new GoogleGenAI({ apiKey });
};

// Helper: Generate a fallback result when AI fails (e.g. 429 Quota Exceeded)
const getFallbackResult = (stock: StockData, errorMsg: string, calculatedTechnical?: TechnicalIndicators): RealTimeDataResult => {
  return {
    stock: stock,
    history: [],
    sentiment: {
      score: 50,
      trend: 'neutral',
      hotTopics: ['暂无数据'],
      sources: [],
      recentComments: []
    },
    capital: {
      mainInflow: 0,
      northInflow: 0,
      retailInflow: 0,
      sectorRank: 0
    },
    technical: calculatedTechnical || {
      rsi: 50,
      macd: { dif: 0, dea: 0, macd: 0 },
      kdj: { k: 50, d: 50, j: 50 }
    },
    analysis: {
      action: 'HOLD',
      confidence: 0,
      targetPriceHigh: stock.price,
      targetPriceLow: stock.price,
      reasoning: `[系统提示] ${errorMsg}`,
      riskFactors: ["无法连接AI模型", "请参考左侧实时行情数据"]
    }
  };
};

// Step 1: Search for real-time information (Fallback Method)
async function searchRealTimeData(ticker: string, ai: GoogleGenAI) {
  const prompt = `
    请搜索股票 "${ticker}" 的最新实时数据及近期历史数据。
    
    我需要以下具体信息：
    1. 核心数据: 股票名称, 代码, 当前价格, 涨跌幅, 涨跌额, 今开, 最高, 最低, 成交量, 市盈率(PE), 市值。
    2. **关键历史数据**: 请列出该股票**最近 10 到 15 个交易日**的每日收盘价（日期和价格）。这非常重要，用于绘制真实的走势图。
    3. 舆情信息: 搜索雪球、东方财富股吧或主流财经新闻，总结当前的市场情绪（看多/看空）、热门讨论话题。
    4. 资金流向: 如果是A股，搜索北向资金流向和主力资金净流入情况。
    5. 技术指标: 搜索当前的RSI, MACD, KDJ数值。
    
    如果找不到该股票，请明确说明。
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  return {
    text: response.text,
    groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
}

// Step 2: Convert unstructured search text into our App's JSON format
async function parseSearchDataToJSON(ticker: string, searchText: string, ai: GoogleGenAI): Promise<RealTimeDataResult> {
  const prompt = `
    Based on the following search results about stock "${ticker}", populate the JSON schema.
    
    SEARCH RESULTS:
    ${searchText}
    
    INSTRUCTIONS:
    - You MUST return valid JSON. Do not include markdown formatting like \`\`\`json.
    - **HISTORY**: Extract the list of recent daily closing prices from the text into the 'history' array. If explicit dates aren't found, estimate dates working backwards from today.
    - If specific numbers (like RSI/MACD/Capital Flow) are not in the text, estimate them based on the described trend or set to 0.
    - If the stock is NOT FOUND, return a JSON with "name": "Unknown", "price": 0.
    - Translate sentiment into the SentimentData structure.
    - reasoning MUST be in Chinese.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: getSchema()
    }
  });

  return parseResponse(response.text, ticker);
}

// NEW: Analyze SPECIFIC data provided by API (High Accuracy Mode)
export async function analyzeProvidedStockData(stock: StockData, kline: KLinePoint[]): Promise<RealTimeDataResult> {
  // Extract calculated technicals from the last K-Line point
  let calculatedKDJ = null;
  let calculatedRSI = null;
  let calculatedTechnical: TechnicalIndicators | undefined = undefined;

  if (kline.length > 0) {
    const lastPoint = kline[kline.length - 1];
    if (typeof lastPoint.k === 'number' && typeof lastPoint.d === 'number' && typeof lastPoint.j === 'number') {
       calculatedKDJ = { k: lastPoint.k, d: lastPoint.d, j: lastPoint.j };
    }
    if (typeof lastPoint.rsi === 'number') {
       calculatedRSI = lastPoint.rsi;
    }
    
    // Construct the definitive technical object to use in fallback or override
    calculatedTechnical = {
       rsi: lastPoint.rsi || 50,
       kdj: { k: lastPoint.k || 50, d: lastPoint.d || 50, j: lastPoint.j || 50 },
       macd: { dif: 0, dea: 0, macd: 0 } // MACD not calculated locally yet
    };
  }

  try {
    const ai = getClient();
    
    // Calculate basic indicators for the prompt
    const last5Days = kline.slice(-5).map(k => k.close);
    
    const prompt = `
      你是一名专业的量化交易分析师。我将提供真实且精确的股票交易数据，请基于这些数据生成一份深度的量化分析报告。

      **股票数据**:
      - 名称: ${stock.name} (${stock.symbol})
      - 当前价格: ${stock.price}
      - 涨跌幅: ${stock.changePercent}%
      - 换手率: ${stock.turnoverRate}%
      - 市盈率: ${stock.pe}
      - 近期走势 (5日): ${JSON.stringify(last5Days)}
      
      **真实计算的技术指标** (请务必基于这些数值分析):
      - KDJ (9,3,3): K=${calculatedKDJ?.k}, D=${calculatedKDJ?.d}, J=${calculatedKDJ?.j}
      - RSI (14): ${calculatedRSI}
      
      **任务**:
      1. **技术分析**: 结合上述真实的KDJ和RSI数值，分析当前是超买还是超卖，是否有金叉/死叉信号。
      2. **量化建议**: 给出明确的 BUY (买入), SELL (卖出), 或 HOLD (观望) 建议。
      3. **目标点位**: 预测短期的上方压力位 (Target High) 和 下方支撑位 (Target Low)。
      4. **风险提示**: 列出3点关键风险。
      5. **资金/情绪估算**: 请根据股票近期的涨跌幅和换手率，估算（生成）合理的市场情绪分数（0-100）、主力资金流向。
      
      请严格按照JSON格式输出，不要包含Markdown代码块。输出的technical字段必须包含上述提供的真实KDJ和RSI数值。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: getSchema()
      }
    });

    const result = parseResponse(response.text, stock.symbol);
    
    // Override with REAL data to ensure accuracy
    result.stock = stock;
    if (calculatedTechnical) {
      result.technical.kdj = calculatedTechnical.kdj;
      result.technical.rsi = calculatedTechnical.rsi;
      // Keep AI's MACD guess or set to 0 if we don't calculate it
    }
    
    return result;

  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    
    let errorMsg = "AI 分析服务暂时不可用。";
    if (error.status === 429 || (error.message && error.message.includes('429')) || (error.message && error.message.includes('quota'))) {
      errorMsg = "AI 配额已耗尽 (Quota Exceeded)。无法生成深度分析，但您可以继续查看实时行情。";
    }

    // Return the safe fallback so the app doesn't crash
    return getFallbackResult(stock, errorMsg, calculatedTechnical);
  }
}

// Shared Schema
function getSchema() {
  return {
    type: Type.OBJECT,
    properties: {
      stock: {
        type: Type.OBJECT,
        properties: {
          symbol: { type: Type.STRING },
          name: { type: Type.STRING },
          price: { type: Type.NUMBER },
          change: { type: Type.NUMBER },
          changePercent: { type: Type.NUMBER },
          open: { type: Type.NUMBER },
          high: { type: Type.NUMBER },
          low: { type: Type.NUMBER },
          volume: { type: Type.NUMBER },
          turnoverRate: { type: Type.NUMBER },
          pe: { type: Type.NUMBER },
          marketCap: { type: Type.NUMBER }
        },
        required: ["symbol", "name", "price", "change", "changePercent"]
      },
      history: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING },
            close: { type: Type.NUMBER }
          }
        }
      },
      sentiment: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          trend: { type: Type.STRING, enum: ["bullish", "bearish", "neutral"] },
          hotTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
          sources: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: { name: { type: Type.STRING }, heat: { type: Type.NUMBER } }
            } 
          },
          recentComments: {
             type: Type.ARRAY,
             items: {
               type: Type.OBJECT,
               properties: {
                 user: { type: Type.STRING },
                 text: { type: Type.STRING },
                 sentiment: { type: Type.STRING, enum: ["positive", "negative", "neutral"] },
                 time: { type: Type.STRING }
               }
             }
          }
        }
      },
      capital: {
         type: Type.OBJECT,
         properties: {
           mainInflow: { type: Type.NUMBER },
           northInflow: { type: Type.NUMBER },
           retailInflow: { type: Type.NUMBER },
           sectorRank: { type: Type.NUMBER }
         }
      },
      technical: {
         type: Type.OBJECT,
         properties: {
           rsi: { type: Type.NUMBER },
           macd: { 
             type: Type.OBJECT, 
             properties: { dif: { type: Type.NUMBER }, dea: { type: Type.NUMBER }, macd: { type: Type.NUMBER } } 
           },
           kdj: {
             type: Type.OBJECT,
             properties: { k: { type: Type.NUMBER }, d: { type: Type.NUMBER }, j: { type: Type.NUMBER } }
           }
         }
      },
      analysis: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, enum: ['BUY', 'SELL', 'HOLD'] },
          confidence: { type: Type.NUMBER },
          targetPriceHigh: { type: Type.NUMBER },
          targetPriceLow: { type: Type.NUMBER },
          reasoning: { type: Type.STRING },
          riskFactors: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  };
}

function parseResponse(text: string, ticker: string): RealTimeDataResult {
  let resultText = text || "{}";
  resultText = resultText.replace(/```json/g, "").replace(/```/g, "").trim();

  try {
    const parsedData = JSON.parse(resultText) as RealTimeDataResult;
    
    if (!parsedData.stock) parsedData.stock = { symbol: ticker, name: ticker, price: 0, change: 0, changePercent: 0, open: 0, high: 0, low: 0, volume: 0, turnoverRate: 0, pe: 0, marketCap: 0 };
    
    // Safety Fallbacks for Sentiment
    if (!parsedData.sentiment) {
        parsedData.sentiment = { 
            score: 50, 
            trend: 'neutral', 
            hotTopics: [], 
            sources: [
                { name: '雪球', heat: 50 },
                { name: '东方财富', heat: 50 },
                { name: '微博', heat: 50 }
            ], 
            recentComments: [] 
        };
    } else if (!parsedData.sentiment.sources || !Array.isArray(parsedData.sentiment.sources) || parsedData.sentiment.sources.length === 0) {
        parsedData.sentiment.sources = [
            { name: '雪球', heat: 50 },
            { name: '东方财富', heat: 50 },
            { name: '微博', heat: 50 }
        ];
    }

    if (!parsedData.history) parsedData.history = [];
    
    // Safety Fallbacks for Capital Flow
    if (!parsedData.capital) {
        parsedData.capital = {
           mainInflow: 0, 
           northInflow: 0, 
           retailInflow: 0, 
           sectorRank: 0
        };
    }

    // Safety Fallbacks for Technical
    if (!parsedData.technical) {
        parsedData.technical = {
            rsi: 50,
            macd: { dif: 0, dea: 0, macd: 0 },
            kdj: { k: 50, d: 50, j: 50 }
        };
    }
    
    // Deep check for Technical sub-properties
    if (!parsedData.technical.kdj) {
         parsedData.technical.kdj = { k: 50, d: 50, j: 50 };
    }
    if (!parsedData.technical.macd) {
         parsedData.technical.macd = { dif: 0, dea: 0, macd: 0 };
    }
    if (typeof parsedData.technical.rsi !== 'number') {
        parsedData.technical.rsi = 50;
    }

    return parsedData;
  } catch (e) {
    console.error("JSON Parse Error:", e, resultText);
    return getFallbackResult({ symbol: ticker, name: ticker, price: 0, change: 0, changePercent: 0, open: 0, high: 0, low: 0, volume: 0, turnoverRate: 0, pe: 0, marketCap: 0 } as StockData, "JSON 解析错误");
  }
}

// Main entry point for Search-based flow
export const fetchStockDataAndAnalyze = async (ticker: string): Promise<RealTimeDataResult> => {
  const ai = getClient();
  try {
    const searchResult = await searchRealTimeData(ticker, ai);
    const structuredData = await parseSearchDataToJSON(ticker, searchResult.text, ai);
    
    const sources: WebSource[] = [];
    if (searchResult.groundingChunks) {
      searchResult.groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({ title: chunk.web.title, uri: chunk.web.uri });
        }
      });
    }
    
    structuredData.analysis.sources = sources;
    return structuredData;
  } catch (error: any) {
    console.error("Stock Analysis Search Error:", error);
    let errorMsg = "Search API 错误";
    if (error.status === 429 || (error.message && error.message.includes('429'))) {
        errorMsg = "AI 配额已耗尽。";
    }
    // Return a minimal valid structure to prevent crash
    return getFallbackResult({ symbol: ticker, name: ticker, price: 0, change: 0, changePercent: 0, open: 0, high: 0, low: 0, volume: 0, turnoverRate: 0, pe: 0, marketCap: 0 } as StockData, errorMsg);
  }
};
