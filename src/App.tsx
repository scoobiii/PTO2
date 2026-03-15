/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Globe, 
  Layers,
  MessageSquare,
  Send,
  Loader2,
  ExternalLink,
  User,
  Bot,
  ChevronDown,
  ChevronUp,
  Settings,
  Shield,
  Cpu,
  Globe2,
  Key,
  Map as MapIcon,
  Zap,
  Wifi,
  Droplets,
  ShieldAlert,
  Target
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { GoogleGenAI } from "@google/genai";

// Fix for default marker icons in Leaflet with React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- Gemini Setup ---
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// --- Types ---
interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: { uri: string; title: string }[];
}

interface OpenCLConfig {
  provider: 'claude' | 'deepseek' | 'qwen' | 'gpt' | 'singularity';
  apiKey: string;
  baseUrl: string;
  modelName: string;
}

interface Dimension {
  name: string;
  us: number;
  iran: number;
}

interface ForecastScenario {
  horizon: string;
  title: string;
  body: string;
  prob: number;
  oil: string;
  status: 'bull' | 'bear' | 'neutral';
  tags: string[];
}

// --- Constants ---
const DIMENSIONS: Dimension[] = [
  { name: 'Superioridade Aérea', us: 95, iran: 10 },
  { name: 'Capacidade Nuclear', us: 75, iran: 30 },
  { name: 'Baixas (invs.)', us: 85, iran: 15 },
  { name: 'Controle Estreito', us: 20, iran: 80 },
  { name: 'Receita de Petróleo', us: 60, iran: 25 },
  { name: 'Apoio Regional', us: 70, iran: 35 },
  { name: 'Opinião Pública', us: 44, iran: 55 },
  { name: 'Momentum Proxies', us: 65, iran: 30 },
  { name: 'Cibernético/EW', us: 80, iran: 45 },
  { name: 'Diplomacia', us: 40, iran: 50 },
  { name: 'Coesão Interna', us: 50, iran: 35 },
  { name: 'Economia/Sanções', us: 75, iran: 20 },
];

const SCENARIOS: ForecastScenario[] = [
  {
    horizon: '⏱ D+15 → D+30 · IMEDIATO',
    title: 'ESCALADA CONTROLADA',
    body: 'Trump mantém pressão dentro do prazo de 4 semanas. Irã fecha Hormuz parcialmente. EUA destroem infraestrutura IRGC remanescente.',
    prob: 55,
    oil: '$110–130',
    status: 'neutral',
    tags: ['Oil: High', 'Ceasefire: 20%']
  },
  {
    horizon: '📅 D+30 → D+90 · CURTO PRAZO',
    title: 'ACORDO NUCLEAR',
    body: 'Novo líder Mojtaba negocia via Qatar. US aceita direitos nucleares limitados. Hormuz reabre gradualmente. Trump declara vitória.',
    prob: 35,
    oil: '$80–95',
    status: 'bull',
    tags: ['Oil: Stable', 'Ceasefire: 70%']
  },
  {
    horizon: '🔥 D+30 → D+90 · CURTO PRAZO',
    title: 'ESCALADA REGIONAL',
    body: 'Houthis retomam ataques. Hezbollah ativa sul do Líbano. Iraque expulsa tropas US. China aplica sanções à SWIFT asiática.',
    prob: 10,
    oil: '$150+',
    status: 'bear',
    tags: ['RISCO SISTÊMICO', 'Oil: Extreme']
  }
];

// --- Components ---

const OpenCLAgent = () => {
  const [config, setConfig] = useState<OpenCLConfig>(() => {
    const saved = localStorage.getItem('opencl_config');
    return saved ? JSON.parse(saved) : {
      provider: 'claude',
      apiKey: '',
      baseUrl: 'https://api.anthropic.com/v1/messages',
      modelName: 'claude-3-5-sonnet-20240620'
    };
  });

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Agente OpenCL Ativo. Configure seu provedor (Claude, GPT, DeepSeek, Qwen, Singularity) e endpoint (Local, GCloud, Web API) para iniciar.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('opencl_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const callLLM = async (prompt: string) => {
    const { provider, apiKey, baseUrl, modelName } = config;
    
    if (!apiKey && provider !== 'singularity') {
      throw new Error('Web API Key necessária para este provedor.');
    }

    let url = baseUrl;
    let headers: any = {
      'Content-Type': 'application/json',
    };
    let body: any = {};

    if (provider === 'claude') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      headers['dangerously-allow-browser'] = 'true';
      body = {
        model: modelName,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      };
    } else if (provider === 'gpt' || provider === 'deepseek' || provider === 'qwen') {
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = {
        model: modelName,
        messages: [{ role: 'user', content: prompt }]
      };
    } else if (provider === 'singularity') {
      // Custom implementation for Singularity/Local/GColab/GCOLB
      body = { prompt, model: modelName };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Erro HTTP: ${response.status}`);
    }

    const data = await response.json();
    
    if (provider === 'claude') return data.content[0].text;
    if (provider === 'gpt' || provider === 'deepseek' || provider === 'qwen') return data.choices[0].message.content;
    return data.response || data.text || data.output || JSON.stringify(data);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await callLLM(input);
      const assistantMessage: Message = {
        role: 'assistant',
        content: responseText
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('OpenCL Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Erro: ${error.message || 'Falha na comunicação com o provedor.'}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#080d1a] border border-[#12203a] flex flex-col mb-4">
      <div 
        className="px-4 py-3 border-b border-[#12203a] flex justify-between items-center cursor-pointer bg-[#12203a]/20"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="font-orbitron text-[10px] font-bold text-[#00cfff] tracking-[3px] uppercase flex items-center gap-2">
          <Shield size={14} /> OPENCL AGENT
        </h2>
        <div className="flex items-center gap-3">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }}
            className="text-[#3a5070] hover:text-[#00cfff] transition-colors"
          >
            <Settings size={14} />
          </button>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-4 border-b border-[#12203a] bg-[#04060d] space-y-3"
          >
            <div className="space-y-1">
              <label className="text-[8px] font-mono text-[#3a5070] uppercase">Provedor LLM</label>
              <select 
                value={config.provider}
                onChange={(e) => setConfig({ ...config, provider: e.target.value as any })}
                className="w-full bg-[#080d1a] border border-[#12203a] px-2 py-1 text-[10px] text-[#e8f2ff] focus:outline-none"
              >
                <option value="claude">Anthropic Claude (Padrão)</option>
                <option value="gpt">OpenAI GPT</option>
                <option value="deepseek">DeepSeek</option>
                <option value="qwen">Alibaba Qwen</option>
                <option value="singularity">Singularity / Local / GCOLB</option>
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-[8px] font-mono text-[#3a5070] uppercase">Web API Key</label>
              <div className="relative">
                <input 
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full bg-[#080d1a] border border-[#12203a] pl-7 pr-2 py-1 text-[10px] text-[#e8f2ff] focus:outline-none"
                />
                <Key size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#3a5070]" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-mono text-[#3a5070] uppercase">GCloud GCOLB / Local URL</label>
              <div className="relative">
                <input 
                  type="text"
                  value={config.baseUrl}
                  onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                  placeholder="https://... or http://localhost:..."
                  className="w-full bg-[#080d1a] border border-[#12203a] pl-7 pr-2 py-1 text-[10px] text-[#e8f2ff] focus:outline-none"
                />
                <Globe2 size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#3a5070]" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-mono text-[#3a5070] uppercase">Model ID</label>
              <div className="relative">
                <input 
                  type="text"
                  value={config.modelName}
                  onChange={(e) => setConfig({ ...config, modelName: e.target.value })}
                  placeholder="claude-3-..."
                  className="w-full bg-[#080d1a] border border-[#12203a] pl-7 pr-2 py-1 text-[10px] text-[#e8f2ff] focus:outline-none"
                />
                <Cpu size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#3a5070]" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-col h-[350px]"
          >
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-[#12203a]"
            >
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 border ${
                    msg.role === 'user' 
                      ? 'bg-[#1a3a6e]/20 border-[#2979ff]/30 text-[#e8f2ff]' 
                      : 'bg-[#04060d] border-[#12203a] text-[#b8cce0]'
                  }`}>
                    <div className="flex items-center gap-2 mb-1 opacity-50">
                      {msg.role === 'user' ? <User size={10} /> : <Shield size={10} />}
                      <span className="text-[8px] font-mono tracking-widest uppercase">
                        {msg.role === 'user' ? 'Analista' : `OpenCL (${config.provider})`}
                      </span>
                    </div>
                    <div className="text-[11px] leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#04060d] border border-[#12203a] p-3 flex items-center gap-3">
                    <Loader2 size={14} className="animate-spin text-[#00cfff]" />
                    <span className="text-[10px] font-mono text-[#3a5070] animate-pulse uppercase">Processando via {config.provider}...</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-3 border-t border-[#12203a] bg-[#04060d]">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Comando OpenCL..."
                  className="flex-1 bg-[#080d1a] border border-[#12203a] px-3 py-2 text-[11px] text-[#e8f2ff] focus:outline-none focus:border-[#00cfff] transition-colors"
                />
                <button 
                  onClick={handleSend}
                  disabled={isLoading}
                  className="bg-[#0a2a4a] hover:bg-[#00cfff] text-white p-2 transition-colors disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TutorAgent = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Olá! Sou seu Agente Tutor de Inteligência. Posso buscar dados em tempo real sobre o conflito, geopolítica e mercados. O que você gostaria de saber?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await genAI.models.generateContent({ 
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: input }] }],
        config: {
          systemInstruction: "Você é um Agente Tutor de Inteligência especializado em geopolítica, conflitos militares e mercados globais. Sua função é fornecer análises precisas e dados em tempo real usando a ferramenta de busca do Google. Seja conciso, profissional e use um tom de relatório de inteligência.",
          tools: [{ googleSearch: {} }]
        }
      });

      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => ({
        uri: chunk.web?.uri || '',
        title: chunk.web?.title || 'Fonte'
      })).filter(s => s.uri) || [];

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.text || 'Desculpe, não consegui processar sua solicitação.',
        sources
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Gemini Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Erro ao conectar com o servidor de inteligência. Verifique sua conexão ou tente novamente mais tarde.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#080d1a] border border-[#12203a] flex flex-col">
      <div 
        className="px-4 py-3 border-b border-[#12203a] flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="font-orbitron text-[10px] font-bold text-[#aa44ff] tracking-[3px] uppercase flex items-center gap-2">
          <Bot size={14} /> AGENTE TUTOR REAL-TIME
        </h2>
        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-col h-[400px]"
          >
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-[#12203a]"
            >
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 border ${
                    msg.role === 'user' 
                      ? 'bg-[#1a3a6e]/20 border-[#2979ff]/30 text-[#e8f2ff]' 
                      : 'bg-[#04060d] border-[#12203a] text-[#b8cce0]'
                  }`}>
                    <div className="flex items-center gap-2 mb-1 opacity-50">
                      {msg.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                      <span className="text-[8px] font-mono tracking-widest uppercase">
                        {msg.role === 'user' ? 'Analista' : 'Prophet Agent'}
                      </span>
                    </div>
                    <div className="text-[11px] leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                    
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-[#12203a] space-y-1">
                        <div className="text-[8px] font-mono text-[#3a5070] uppercase">Fontes Grounding:</div>
                        {msg.sources.slice(0, 3).map((source, si) => (
                          <a 
                            key={si} 
                            href={source.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[9px] text-[#2979ff] hover:underline truncate"
                          >
                            <ExternalLink size={8} /> {source.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#04060d] border border-[#12203a] p-3 flex items-center gap-3">
                    <Loader2 size={14} className="animate-spin text-[#aa44ff]" />
                    <span className="text-[10px] font-mono text-[#3a5070] animate-pulse">BUSCANDO DADOS EM TEMPO REAL...</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-3 border-t border-[#12203a] bg-[#04060d]">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Consultar inteligência..."
                  className="flex-1 bg-[#080d1a] border border-[#12203a] px-3 py-2 text-[11px] text-[#e8f2ff] focus:outline-none focus:border-[#2979ff] transition-colors"
                />
                <button 
                  onClick={handleSend}
                  disabled={isLoading}
                  className="bg-[#1a3a6e] hover:bg-[#2979ff] text-white p-2 transition-colors disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ScoreBar = ({ us, iran }: { us: number, iran: number }) => {
  const total = us + iran;
  const usPct = (us / total) * 100;
  const iranPct = (iran / total) * 100;

  return (
    <div className="relative h-8 bg-[#0a0f1e] border border-[#12203a] overflow-hidden flex">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${usPct}%` }}
        transition={{ duration: 1.5, ease: "circOut" }}
        className="h-full bg-gradient-to-r from-[#1a3a6e] to-[#2979ff] flex items-center justify-end pr-3"
      >
        <span className="text-[9px] font-mono text-white/70 uppercase tracking-wider">Coalizão</span>
      </motion.div>
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${iranPct}%` }}
        transition={{ duration: 1.5, ease: "circOut" }}
        className="h-full bg-gradient-to-l from-[#5a0a14] to-[#ff2233] flex items-center pl-3"
      >
        <span className="text-[9px] font-mono text-white/70 uppercase tracking-wider">Irão</span>
      </motion.div>
      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20 z-10" />
    </div>
  );
};

const DimensionRow: React.FC<{ dim: Dimension }> = ({ dim }) => (
  <div className="grid grid-cols-[140px_40px_1fr_1fr_40px] gap-2 py-1.5 border-b border-[#12203a]/40 items-center">
    <div className="text-[10px] font-mono text-[#3a5070] truncate">{dim.name}</div>
    <div className="text-[11px] font-mono text-[#2979ff] text-right">{dim.us}</div>
    <div className="h-1.5 bg-[#12203a]/80 rounded-sm overflow-hidden flex justify-end">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${dim.us}%` }}
        className="h-full bg-gradient-to-r from-[#1a3a6e] to-[#2979ff]"
      />
    </div>
    <div className="h-1.5 bg-[#12203a]/80 rounded-sm overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${dim.iran}%` }}
        className="h-full bg-gradient-to-l from-[#5a0a14] to-[#ff2233]"
      />
    </div>
    <div className="text-[11px] font-mono text-[#ff2233]">{dim.iran}</div>
  </div>
);

const ForecastCard: React.FC<{ scenario: ForecastScenario }> = ({ scenario }) => (
  <div className={`bg-[#04060d]/80 border border-[#12203a] p-4 relative overflow-hidden group hover:border-[#2979ff]/50 transition-colors`}>
    <div className={`absolute top-0 left-0 right-0 h-0.5 ${
      scenario.status === 'bull' ? 'bg-[#00e676]' : 
      scenario.status === 'bear' ? 'bg-[#ff2233]' : 'bg-[#ffc600]'
    }`} />
    <div className="text-[9px] font-mono text-[#3a5070] uppercase tracking-widest mb-1.5">{scenario.horizon}</div>
    <div className="text-[12px] font-orbitron font-bold text-[#e8f2ff] mb-2 tracking-wider">{scenario.title}</div>
    <p className="text-[10px] leading-relaxed text-[#b8cce0] mb-3">{scenario.body}</p>
    <div className="flex flex-wrap gap-1.5">
      <span className={`text-[9px] font-mono px-1.5 py-0.5 border ${
        scenario.status === 'bull' ? 'border-[#00e676] text-[#00e676]' : 
        scenario.status === 'bear' ? 'border-[#ff2233] text-[#ff2233]' : 'border-[#ffc600] text-[#ffc600]'
      }`}>
        Prob: {scenario.prob}%
      </span>
      {scenario.tags.map(tag => (
        <span key={tag} className="text-[9px] font-mono px-1.5 py-0.5 border border-[#3a5070] text-[#3a5070]">
          {tag}
        </span>
      ))}
    </div>
  </div>
);

interface ImpactPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'military' | 'infra' | 'civilian';
  damage: {
    material: string;
    structural: string;
    financial: string;
    human: string;
  };
  intensity: number; // 0-1 for heatmap
  timestamp: string;
}

interface MapPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'power' | 'telecom' | 'water' | 'conflict' | 'military';
  status: 'operational' | 'damaged' | 'critical' | 'active';
  description: string;
}

const MAP_POINTS: MapPoint[] = [
  // Power
  { id: 'p1', name: 'Usina Nuclear de Bushehr', lat: 28.96, lng: 50.83, type: 'power', status: 'operational', description: 'Capacidade: 1000MW. Monitoramento AIEA ativo.' },
  { id: 'p2', name: 'Barragem de Karun-3', lat: 31.81, lng: 50.15, type: 'power', status: 'operational', description: 'Hidroelétrica crítica. Nível do reservatório: 78%.' },
  // Telecom
  { id: 't1', name: 'Hub de Fibra de Teerã', lat: 35.68, lng: 51.38, type: 'telecom', status: 'critical', description: 'Ponto central de tráfego internacional. Latência elevada detectada.' },
  { id: 't2', name: 'Estação Terrena de Jask', lat: 25.64, lng: 57.77, type: 'telecom', status: 'operational', description: 'Cabo submarino tático. Conexão com Omã.' },
  // Water
  { id: 'w1', name: 'Dessalinizadora de Bandar Abbas', lat: 27.18, lng: 56.26, type: 'water', status: 'damaged', description: 'Suprimento regional reduzido em 40% após impacto cinético.' },
  // Conflict
  { id: 'c1', name: 'Zona de Engajamento Hormuz', lat: 26.59, lng: 56.45, type: 'conflict', status: 'active', description: 'Troca de fogo entre lanchas rápidas e escoltas navais.' },
  { id: 'c2', name: 'Fronteira Sistan-Baluchestan', lat: 29.49, lng: 60.86, type: 'conflict', status: 'active', description: 'Atividade insurgente intensificada. Bloqueio de estradas.' }
];

const IMPACT_POINTS: ImpactPoint[] = [
  {
    id: '1',
    name: 'Base Aérea de Isfahan',
    lat: 32.75,
    lng: 51.85,
    type: 'military',
    damage: {
      material: '3x Hangares destruídos, 2x Radares EW',
      structural: 'Pista 08R inoperante',
      financial: '$450M est.',
      human: '12 KIA, 45 WIA'
    },
    intensity: 0.9,
    timestamp: '2026-03-14T04:20:00Z'
  },
  {
    id: '2',
    name: 'Refinaria de Abadan',
    lat: 30.34,
    lng: 48.26,
    type: 'infra',
    damage: {
      material: 'Unidade de Craqueamento Catalítico',
      structural: 'Colapso de 4 tanques de armazenamento',
      financial: '$1.2B est.',
      human: '4 KIA, 18 WIA'
    },
    intensity: 0.85,
    timestamp: '2026-03-14T06:15:00Z'
  },
  {
    id: '3',
    name: 'Porto de Bandar Abbas',
    lat: 27.18,
    lng: 56.26,
    type: 'infra',
    damage: {
      material: '2x Guindastes de pórtico, 1x Fragata classe Alvand',
      structural: 'Pier 4 severamente danificado',
      financial: '$890M est.',
      human: '22 KIA, 60 WIA'
    },
    intensity: 0.75,
    timestamp: '2026-03-14T05:45:00Z'
  },
  {
    id: '4',
    name: 'Instalação de Natanz',
    lat: 33.72,
    lng: 51.72,
    type: 'military',
    damage: {
      material: 'Sistemas de ventilação, Centrifugadoras IR-6',
      structural: 'Danos superficiais em bunkers',
      financial: '$2.1B est. (atraso programa)',
      human: '0 KIA (evacuado)'
    },
    intensity: 0.95,
    timestamp: '2026-03-14T03:10:00Z'
  }
];

// --- Components ---

const RadarOverlay = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1001]">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/2 left-1/2 w-[200%] h-[200%] -translate-x-1/2 -translate-y-1/2 origin-center"
        style={{
          background: 'conic-gradient(from 0deg, transparent 0%, rgba(0, 207, 255, 0.15) 10%, transparent 20%)'
        }}
      />
      <div className="absolute inset-0 border-[0.5px] border-[#00cfff]/10 rounded-full scale-[0.25]" />
      <div className="absolute inset-0 border-[0.5px] border-[#00cfff]/10 rounded-full scale-[0.5]" />
      <div className="absolute inset-0 border-[0.5px] border-[#00cfff]/10 rounded-full scale-[0.75]" />
    </div>
  );
};

const ImpactTechnicalSheet = () => {
  return (
    <section className="bg-[#080d1a] border border-[#12203a] p-6 mt-6">
      <div className="flex justify-between items-center mb-6 border-b border-[#12203a] pb-4">
        <h2 className="font-orbitron text-xs font-bold text-[#ff2233] tracking-[3px] uppercase flex items-center gap-2">
          <Shield size={14} /> FICHA TÉCNICA DE DANOS E IMPACTOS
        </h2>
        <span className="text-[9px] font-mono text-[#3a5070] uppercase tracking-widest">RELATÓRIO BDA · BATTLE DAMAGE ASSESSMENT</span>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {IMPACT_POINTS.map((point) => (
          <div key={point.id} className="border border-[#12203a] bg-[#04060d]/50 p-4 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
            <div className="border-r border-[#12203a] pr-4">
              <div className="text-[10px] font-orbitron font-bold text-[#e8f2ff] mb-1">{point.name}</div>
              <div className="text-[8px] font-mono text-[#3a5070] uppercase mb-2">{point.type} · {new Date(point.timestamp).toLocaleTimeString()}</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-[#12203a]">
                  <div className="h-full bg-[#ff2233]" style={{ width: `${point.intensity * 100}%` }} />
                </div>
                <span className="text-[9px] font-mono text-[#ff2233]">{Math.round(point.intensity * 100)}%</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-[8px] font-mono text-[#3a5070] uppercase mb-1">Danos Materiais</div>
                <div className="text-[10px] text-[#b8cce0] leading-tight">{point.damage.material}</div>
              </div>
              <div>
                <div className="text-[8px] font-mono text-[#3a5070] uppercase mb-1">Estrutural</div>
                <div className="text-[10px] text-[#b8cce0] leading-tight">{point.damage.structural}</div>
              </div>
              <div>
                <div className="text-[8px] font-mono text-[#3a5070] uppercase mb-1">Financeiro</div>
                <div className="text-[10px] text-[#ffc600] font-mono">{point.damage.financial}</div>
              </div>
              <div>
                <div className="text-[8px] font-mono text-[#3a5070] uppercase mb-1">Humanos</div>
                <div className="text-[10px] text-[#ff2233] font-bold">{point.damage.human}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

// --- Map Component ---
const OpenInfraMap = () => {
  const [baseLayer, setBaseLayer] = useState<'satellite' | 'street'>('satellite');
  const [activeLayers, setActiveLayers] = useState<string[]>(['conflict', 'military', 'power']);
  
  const satelliteLayer = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
  const streetLayer = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const toggleLayer = (layer: string) => {
    setActiveLayers(prev => 
      prev.includes(layer) ? prev.filter(l => l !== layer) : [...prev, layer]
    );
  };

  const getIcon = (type: MapPoint['type'], status: MapPoint['status']) => {
    const color = status === 'operational' ? '#00e676' : status === 'critical' ? '#ffc600' : '#ff2233';
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color};"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });
  };

  return (
    <div className="relative h-[600px] w-full border border-[#12203a] bg-[#04060d]">
      <RadarOverlay />
      
      {/* Layer Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <div className="bg-[#080d1a]/90 border border-[#12203a] p-2 flex flex-col gap-1">
          <div className="text-[8px] font-mono text-[#3a5070] uppercase mb-1 px-1">Base</div>
          <button 
            onClick={() => setBaseLayer('satellite')}
            className={`p-2 border ${baseLayer === 'satellite' ? 'bg-[#2979ff] border-[#2979ff] text-white' : 'bg-[#080d1a] border-[#12203a] text-[#3a5070]'} transition-all`}
            title="Satélite"
          >
            <Globe size={14} />
          </button>
          <button 
            onClick={() => setBaseLayer('street')}
            className={`p-2 border ${baseLayer === 'street' ? 'bg-[#2979ff] border-[#2979ff] text-white' : 'bg-[#080d1a] border-[#12203a] text-[#3a5070]'} transition-all`}
            title="Ruas"
          >
            <MapIcon size={14} />
          </button>
        </div>

        <div className="bg-[#080d1a]/90 border border-[#12203a] p-2 flex flex-col gap-1">
          <div className="text-[8px] font-mono text-[#3a5070] uppercase mb-1 px-1">Camadas</div>
          <button 
            onClick={() => toggleLayer('power')}
            className={`p-2 border ${activeLayers.includes('power') ? 'bg-[#ffc600] border-[#ffc600] text-black' : 'bg-[#080d1a] border-[#12203a] text-[#3a5070]'} transition-all`}
            title="Energia"
          >
            <Zap size={14} />
          </button>
          <button 
            onClick={() => toggleLayer('telecom')}
            className={`p-2 border ${activeLayers.includes('telecom') ? 'bg-[#00cfff] border-[#00cfff] text-black' : 'bg-[#080d1a] border-[#12203a] text-[#3a5070]'} transition-all`}
            title="Telecom"
          >
            <Wifi size={14} />
          </button>
          <button 
            onClick={() => toggleLayer('water')}
            className={`p-2 border ${activeLayers.includes('water') ? 'bg-[#2979ff] border-[#2979ff] text-white' : 'bg-[#080d1a] border-[#12203a] text-[#3a5070]'} transition-all`}
            title="Água"
          >
            <Droplets size={14} />
          </button>
          <button 
            onClick={() => toggleLayer('conflict')}
            className={`p-2 border ${activeLayers.includes('conflict') ? 'bg-[#ff2233] border-[#ff2233] text-white' : 'bg-[#080d1a] border-[#12203a] text-[#3a5070]'} transition-all`}
            title="Conflitos"
          >
            <ShieldAlert size={14} />
          </button>
          <button 
            onClick={() => toggleLayer('military')}
            className={`p-2 border ${activeLayers.includes('military') ? 'bg-[#aa44ff] border-[#aa44ff] text-white' : 'bg-[#080d1a] border-[#12203a] text-[#3a5070]'} transition-all`}
            title="Impactos BDA"
          >
            <Target size={14} />
          </button>
        </div>
      </div>
      
      <div className="absolute bottom-4 left-4 z-[1000] bg-[#080d1a]/90 border border-[#12203a] p-3 max-w-[220px]">
        <div className="text-[10px] font-orbitron font-bold text-[#00cfff] mb-2 uppercase tracking-widest">Legenda de Infraestrutura</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00e676]" />
            <span className="text-[9px] font-mono text-[#b8cce0] uppercase">Operacional / Estável</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#ffc600]" />
            <span className="text-[9px] font-mono text-[#b8cce0] uppercase">Crítico / Degradado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#ff2233]" />
            <span className="text-[9px] font-mono text-[#b8cce0] uppercase">Destruído / Inativo</span>
          </div>
        </div>
      </div>

      <MapContainer 
        center={[28.5, 54.5]} 
        zoom={5} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url={baseLayer === 'satellite' ? satelliteLayer : streetLayer}
        />
        
        {/* Infrastructure & Conflict Markers */}
        {MAP_POINTS.filter(p => activeLayers.includes(p.type)).map(point => (
          <Marker 
            key={point.id} 
            position={[point.lat, point.lng]}
            icon={getIcon(point.type, point.status)}
          >
            <Popup>
              <div className="bg-[#080d1a] text-[#b8cce0] p-2 font-mono min-w-[150px]">
                <div className="text-[10px] font-bold text-[#00cfff] uppercase mb-1 border-b border-[#12203a] pb-1">{point.name}</div>
                <div className="text-[8px] text-[#3a5070] uppercase mb-2">Tipo: {point.type} | Status: {point.status}</div>
                <div className="text-[9px] leading-tight">{point.description}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Impact Points (Military BDA) */}
        {activeLayers.includes('military') && IMPACT_POINTS.map(point => (
          <Marker 
            key={`impact-${point.id}`} 
            position={[point.lat, point.lng]}
            icon={getIcon('military', 'damaged')}
          >
            <Popup>
              <div className="bg-[#080d1a] text-[#b8cce0] p-2 font-mono min-w-[200px]">
                <div className="text-[10px] font-bold text-[#ff2233] uppercase mb-1 border-b border-[#12203a] pb-1">ALVO: {point.name}</div>
                <div className="text-[8px] text-[#3a5070] uppercase mb-2">BDA REPORT · {new Date(point.timestamp).toLocaleDateString()}</div>
                <div className="space-y-1">
                  <div className="text-[9px]"><span className="text-[#3a5070]">MATERIAIS:</span> {point.damage.material}</div>
                  <div className="text-[9px]"><span className="text-[#3a5070]">ESTRUTURAL:</span> {point.damage.structural}</div>
                  <div className="text-[9px] font-bold text-[#ff2233] uppercase">BAIXAS: {point.damage.human}</div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Strategic Points */}
        <Marker position={[26.59, 56.45]} icon={getIcon('conflict', 'active')}>
          <Popup>
            <div className="text-xs font-mono">
              <strong>Estreito de Hormuz</strong><br/>
              Status: Alerta Máximo<br/>
              Tráfego: -65%
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [usScore, setUsScore] = useState(0);
  const [iranScore, setIranScore] = useState(0);

  const calculatedUsTotal = useMemo(() => 
    Math.round(DIMENSIONS.reduce((a, d) => a + d.us, 0) / DIMENSIONS.length), []
  );
  
  const calculatedIranTotal = useMemo(() => 
    Math.round(DIMENSIONS.reduce((a, d) => a + d.iran, 0) / DIMENSIONS.length), []
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setUsScore(calculatedUsTotal);
      setIranScore(calculatedIranTotal);
    }, 500);
    return () => clearTimeout(timer);
  }, [calculatedUsTotal, calculatedIranTotal]);

  const diff = usScore - iranScore;

  return (
    <div className="min-h-screen bg-[#04060d] text-[#b8cce0] font-inter selection:bg-[#2979ff]/30">
      {/* Header */}
      <header className="px-8 py-4 border-b border-[#12203a] flex items-center justify-between bg-gradient-to-r from-[#ff2233]/5 via-transparent to-[#2979ff]/5">
        <div>
          <h1 className="font-orbitron text-xl font-black text-[#e8f2ff] tracking-[3px] uppercase">
            ⚡ WAR FORECAST · PROPHET ENGINE
          </h1>
          <p className="font-mono text-[10px] text-[#3a5070] tracking-[2px] mt-1 uppercase">
            LINHA VITÓRIA/DERROTA · DECOMPOSIÇÃO TEMPORAL · SATÉLITE OPENINFRA
          </p>
        </div>
        <div className="flex gap-3">
          <div className="px-3 py-1 border border-[#aa44ff] text-[#aa44ff] bg-[#aa44ff]/10 text-[9px] font-mono tracking-widest uppercase">
            PROPHET-JS v1.0
          </div>
          <div className="px-3 py-1 border border-[#00e676] text-[#00e676] bg-[#00e676]/10 text-[9px] font-mono tracking-widest uppercase flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00e676] animate-pulse" />
            LIVE D+14 · 15 MAR 2026
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-0 min-h-[calc(100vh-70px)]">
        {/* Main Column */}
        <div className="p-6 flex flex-col gap-6 overflow-y-auto">
          
          {/* Main Score Panel */}
          <section className="bg-[#080d1a] border border-[#12203a] p-6">
            <div className="flex justify-between items-center mb-6 border-b border-[#12203a] pb-4">
              <h2 className="font-orbitron text-xs font-bold text-[#ffc600] tracking-[3px] uppercase">
                PLACAR DE GUERRA — VANTAGEM ESTRATÉGICA
              </h2>
              <span className="px-2 py-0.5 border border-[#00cfff] text-[#00cfff] text-[9px] font-mono uppercase tracking-widest">
                100 PONTOS TOTAIS · 12 DIMENSÕES
              </span>
            </div>

            <div className="flex justify-between items-end mb-6">
              <div>
                <div className="font-orbitron text-[13px] font-bold text-[#2979ff] tracking-widest mb-1 uppercase">🇺🇸 EUA + 🇮🇱 ISRAEL</div>
                <div className="font-orbitron text-4xl font-black text-[#2979ff] drop-shadow-[0_0_15px_rgba(41,121,255,0.4)]">
                  {usScore}
                </div>
                <div className="font-mono text-[9px] text-[#3a5070] mt-1 uppercase">Vantagem Militar + Nuclear</div>
              </div>
              <div className="text-center">
                <div className="font-orbitron text-sm text-[#ffc600] tracking-[4px] font-bold">VS</div>
                <div className="font-mono text-[9px] text-[#3a5070] mt-1 uppercase">Atualizado D+14</div>
              </div>
              <div className="text-right">
                <div className="font-orbitron text-[13px] font-bold text-[#ff2233] tracking-widest mb-1 uppercase">🇮🇷 IRÃO</div>
                <div className="font-orbitron text-4xl font-black text-[#ff2233] drop-shadow-[0_0_15px_rgba(255,34,51,0.4)]">
                  {iranScore}
                </div>
                <div className="font-mono text-[9px] text-[#3a5070] mt-1 uppercase">Resistência + Hormuz</div>
              </div>
            </div>

            <ScoreBar us={usScore} iran={iranScore} />

            <div className="mt-4 text-center font-mono text-[10px] tracking-widest uppercase">
              {diff > 15 ? (
                <span className="text-[#2979ff]">▲ EUA+ISRAEL DOMINANTES (+{diff} pts) — Iran militarmente degradado</span>
              ) : diff > 5 ? (
                <span className="text-[#00cfff]">▲ EUA+ISRAEL VANTAGEM (+{diff} pts) — Iran resiste via Hormuz</span>
              ) : (
                <span className="text-[#ffc600]">⚖ EQUILÍBRIO PRECÁRIO ({diff} pts) — Desfecho incerto</span>
              )}
            </div>

            {/* Dimensions Breakdown */}
            <div className="mt-8">
              <div className="font-mono text-[9px] text-[#3a5070] tracking-[2px] mb-4 border-b border-[#12203a] pb-2 uppercase">
                Breakdown por Dimensão
              </div>
              <div className="grid grid-cols-[140px_40px_1fr_1fr_40px] gap-2 mb-2">
                <div className="text-[8px] font-mono text-[#3a5070] uppercase">Dimensão</div>
                <div className="text-[8px] font-mono text-[#2979ff] text-right">US+IL</div>
                <div className="text-[8px] font-mono text-[#2979ff] text-right">←</div>
                <div className="text-[8px] font-mono text-[#ff2233]">→</div>
                <div className="text-[8px] font-mono text-[#ff2233]">IRÃO</div>
              </div>
              {DIMENSIONS.map((dim, idx) => (
                <DimensionRow key={dim.name || idx} dim={dim} />
              ))}
            </div>
          </section>

          {/* Map Section */}
          <section className="bg-[#080d1a] border border-[#12203a]">
            <div className="px-4 py-3 border-b border-[#12203a] flex justify-between items-center">
              <h2 className="font-orbitron text-xs font-bold text-[#ffc600] tracking-[3px] uppercase">
                MAPA TÁTICO · SATÉLITE OPENINFRA
              </h2>
              <div className="flex gap-2">
                <span className="px-2 py-0.5 border border-[#00e676] text-[#00e676] text-[8px] font-mono uppercase">Infra: Ativa</span>
                <span className="px-2 py-0.5 border border-[#ff2233] text-[#ff2233] text-[8px] font-mono uppercase">Hormuz: Alerta</span>
              </div>
            </div>
            <OpenInfraMap />
          </section>

          {/* Impact Technical Sheet */}
          <ImpactTechnicalSheet />

          {/* Forecast Scenarios */}
          <section className="bg-[#080d1a] border border-[#12203a] p-6">
            <div className="flex justify-between items-center mb-6 border-b border-[#12203a] pb-4">
              <h2 className="font-orbitron text-xs font-bold text-[#ffc600] tracking-[3px] uppercase">
                CENÁRIOS PROPHET — HORIZONTES TEMPORAIS
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SCENARIOS.map((s, idx) => (
                <ForecastCard key={s.title || idx} scenario={s} />
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="border-l border-[#12203a] p-6 flex flex-col gap-6 overflow-y-auto bg-[#04060d]">
          {/* OpenCL Agent Integration */}
          <OpenCLAgent />

          {/* Tutor Agent Integration */}
          <TutorAgent />

          <div>
            <div className="font-orbitron text-[9px] text-[#3a5070] tracking-[3px] border-b border-[#12203a] pb-2 mb-4 uppercase">
              Situation Actual · D+14
            </div>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Vantagem US+IL', val: '+22 pts', color: 'text-[#00e676]' },
                { label: 'Hormuz Status', val: 'RESTRITO', color: 'text-[#ff2233]' },
                { label: 'Oil Preço', val: '$106/bbl', color: 'text-[#ff2233]' },
                { label: 'Negociações', val: 'TRAVADAS', color: 'text-[#ff2233]' },
                { label: 'Trump Prazo', val: '4 SEM. → D+28', color: 'text-[#ffc600]' },
                { label: 'Regime Iraniano', val: 'VACILANTE', color: 'text-[#ff2233]' },
              ].map(m => (
                <div key={m.label} className="flex justify-between items-center py-1 border-b border-[#12203a]/50">
                  <span className="text-[10px] text-[#3a5070]">{m.label}</span>
                  <span className={`text-[11px] font-mono font-semibold ${m.color}`}>{m.val}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="font-orbitron text-[9px] text-[#3a5070] tracking-[3px] border-b border-[#12203a] pb-2 mb-4 uppercase">
              Eventos Disruptivos
            </div>
            <div className="flex flex-col gap-3">
              {[
                { prob: '8%', color: 'border-[#ff2233] text-[#ff2233] bg-[#ff2233]/5', text: 'Irã activa dispositivo nuclear tático → Resposta US' },
                { prob: '15%', color: 'border-[#ff6600] text-[#ff6600] bg-[#ff6600]/5', text: 'China bloqueia Taiwan simultaneamente → Duas frentes' },
                { prob: '30%', color: 'border-[#00cfff] text-[#00cfff] bg-[#00cfff]/5', text: 'Qatar/Omã mediam ceasefire antes D+28' },
              ].map(w => (
                <div key={w.text} className={`p-3 border-l-4 ${w.color} border border-opacity-20`}>
                  <div className="text-[9px] font-mono tracking-widest uppercase mb-1">🔴 PROB {w.prob}</div>
                  <div className="text-[10px] leading-tight">{w.text}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto p-4 border border-[#12203a] bg-[#080d1a]/50">
            <div className="font-mono text-[8px] text-[#3a5070] leading-relaxed">
              ⚙ MODELO: Prophet-JS · Decomposição Aditiva<br/>
              y(t) = trend(t) + seasonality(t) + events(t) + ε<br/>
              Trend: linear por partes com pontos de mudança<br/>
              Intervalo conf: 80% · Monte Carlo: 10k<br/>
              ⚠ Modelo analítico — não substitui inteligência real
            </div>
          </div>
        </aside>
      </main>

      {/* Noise Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[9999] opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </div>
  );
}
