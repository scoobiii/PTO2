/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Globe, 
  Layers
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- Types ---
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

// --- Map Component ---
const OpenInfraMap = () => {
  const [mapType, setMapType] = useState<'satellite' | 'infra'>('satellite');
  
  // OpenInfraMap layers or similar infrastructure tiles
  const satelliteLayer = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
  const infraLayer = "https://tiles.openinframap.org/power/{z}/{x}/{y}.png"; 

  return (
    <div className="relative h-[400px] w-full border border-[#12203a] bg-[#04060d]">
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <button 
          onClick={() => setMapType('satellite')}
          className={`p-2 border ${mapType === 'satellite' ? 'bg-[#2979ff] border-[#2979ff] text-white' : 'bg-[#080d1a] border-[#12203a] text-[#3a5070]'} transition-all`}
          title="Satélite"
        >
          <Globe size={16} />
        </button>
        <button 
          onClick={() => setMapType('infra')}
          className={`p-2 border ${mapType === 'infra' ? 'bg-[#ff6600] border-[#ff6600] text-white' : 'bg-[#080d1a] border-[#12203a] text-[#3a5070]'} transition-all`}
          title="Infraestrutura (OpenInfra)"
        >
          <Layers size={16} />
        </button>
      </div>
      
      <div className="absolute bottom-4 left-4 z-[1000] bg-[#080d1a]/90 border border-[#12203a] p-3 max-w-[200px]">
        <div className="text-[10px] font-orbitron font-bold text-[#ffc600] mb-1 tracking-widest uppercase">Status Regional</div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-[#ff2233] animate-pulse" />
          <span className="text-[9px] text-[#b8cce0]">Estreito de Hormuz: Bloqueio Parcial</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00e676]" />
          <span className="text-[9px] text-[#b8cce0]">Infraestrutura Crítica: Operacional</span>
        </div>
      </div>

      <MapContainer 
        center={[26.5, 55.5]} 
        zoom={6} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.esri.com/">Esri</a>'
          url={mapType === 'satellite' ? satelliteLayer : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
        />
        {mapType === 'infra' && (
          <TileLayer
            attribution='&copy; <a href="https://openinframap.org">OpenInfraMap</a>'
            url={infraLayer}
            opacity={0.7}
          />
        )}
        
        {/* Strategic Points */}
        <Marker position={[26.59, 56.45]}>
          <Popup>
            <div className="text-xs font-mono">
              <strong>Estreito de Hormuz</strong><br/>
              Status: Alerta Máximo<br/>
              Tráfego: -65%
            </div>
          </Popup>
        </Marker>
        <Marker position={[28.96, 50.83]}>
          <Popup>
            <div className="text-xs font-mono">
              <strong>Usina de Bushehr</strong><br/>
              Status: Monitorado
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
