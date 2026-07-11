import React, { useState } from 'react';
import { Play, Navigation, Loader2, AlertCircle, CheckCircle, MapPin, Layers, Zap } from 'lucide-react';

/* =====================================================================
   PATHFINDING ENGINE (unchanged logic)
===================================================================== */
class PriorityQueue {
  constructor() { this.values = []; }
  enqueue(val, priority) { this.values.push({ val, priority }); this.sort(); }
  dequeue() { return this.values.shift(); }
  sort() { this.values.sort((a, b) => a.priority - b.priority); }
  isEmpty() { return this.values.length === 0; }
}

class AgenticRoutingEngine {
  constructor() { this.adjacencyList = {}; }
  addVertex(vertex) { if (!this.adjacencyList[vertex]) this.adjacencyList[vertex] = []; }
  addEdge(vertex1, vertex2, weight) {
    this.adjacencyList[vertex1].push({ node: vertex2, weight });
    this.adjacencyList[vertex2].push({ node: vertex1, weight });
  }
  findPath(start, finish) {
    const nodes = new PriorityQueue();
    const distances = {};
    const previous = {};
    let path = [];
    let smallest;

    for (let vertex in this.adjacencyList) {
      if (vertex === start) { distances[vertex] = 0; nodes.enqueue(vertex, 0); }
      else { distances[vertex] = Infinity; nodes.enqueue(vertex, Infinity); }
      previous[vertex] = null;
    }

    while (!nodes.isEmpty()) {
      smallest = nodes.dequeue().val;
      if (smallest === finish) {
        while (previous[smallest]) { path.push(smallest); smallest = previous[smallest]; }
        break;
      }
      if (smallest || distances[smallest] !== Infinity) {
        for (let neighbor in this.adjacencyList[smallest]) {
          let nextNode = this.adjacencyList[smallest][neighbor];
          let candidate = distances[smallest] + nextNode.weight;
          let neighborValue = nextNode.node;
          if (candidate < distances[neighborValue]) {
            distances[neighborValue] = candidate;
            previous[neighborValue] = smallest;
            nodes.enqueue(neighborValue, candidate);
          }
        }
      }
    }
    return { path: path.concat(smallest).reverse(), totalDistance: distances[finish] };
  }
}

export default function App() {
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [shortestPath, setShortestPath] = useState([]);
  const [totalDistance, setTotalDistance] = useState(null);

  const generateNodePositions = (segments) => {
    const uniqueCities = Array.from(new Set(segments.flatMap(s => [s.from, s.to])));
    return uniqueCities.map((city, idx) => {
      const angle = (idx / uniqueCities.length) * 2 * Math.PI - Math.PI / 2;
      const radius = 225;
      const centerX = 460;
      const centerY = 315;
      return { id: city, name: city, x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) };
    });
  };

  const handleAgenticRouting = async () => {
    if (!source.trim() || !destination.trim()) {
      setError('Source aur destination dono ka naam likho.');
      return;
    }

    setLoading(true);
    setError(null);
    setShortestPath([]);
    setTotalDistance(null);

    try {
      // App.jsx me line number 62-63 ke paas yeh live link hai:
const response = await fetch("https://aman-dev-ai33-ai-route-backend.hf.space/api/fetch-route-matrix", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: source.trim(), destination: destination.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Server cluster validation execution failed.' }));
        throw new Error(errorData.detail || 'Backend production pipeline processing error.');
      }

      const data = await response.json();
      const segments = data.segments;

      if (!segments || segments.length === 0) {
        throw new Error('AI agent ko is route ka graph nahi mila.');
      }

      const computedNodes = generateNodePositions(segments);
      setNodes(computedNodes);

      const computedEdges = segments.map(seg => {
        const fromNode = computedNodes.find(n => n.id === seg.from);
        const toNode = computedNodes.find(n => n.id === seg.to);
        return {
          from: seg.from, to: seg.to, weight: seg.weight,
          fromX: fromNode.x, fromY: fromNode.y,
          toX: toNode.x, toY: toNode.y,
        };
      });
      setEdges(computedEdges);

      const engine = new AgenticRoutingEngine();
      computedNodes.forEach(n => engine.addVertex(n.id));
      segments.forEach(s => engine.addEdge(s.from, s.to, s.weight));

      const srcTerm = source.trim().toLowerCase();
      const destTerm = destination.trim().toLowerCase();

      const startKey = computedNodes.find(n => n.id.toLowerCase().includes(srcTerm) || srcTerm.includes(n.id.toLowerCase()))?.id || computedNodes[0]?.id;
      const endKey = computedNodes.find(n => n.id.toLowerCase().includes(destTerm) || destTerm.includes(n.id.toLowerCase()))?.id || computedNodes[computedNodes.length - 1]?.id;

      if (startKey && endKey) {
        const result = engine.findPath(startKey, endKey);
        setShortestPath(result.path);
        setTotalDistance(result.totalDistance);
      } else {
        throw new Error('Topology alignment validation failed inside graph matrix engine.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isEdgeInShortestPath = (edge) => {
    if (shortestPath.length < 2) return false;
    for (let i = 0; i < shortestPath.length - 1; i++) {
      const u = shortestPath[i]; const v = shortestPath[i + 1];
      if ((edge.from === u && edge.to === v) || (edge.from === v && edge.to === u)) return true;
    }
    return false;
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 overflow-hidden select-none" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Inter', sans-serif; letter-spacing: -0.01em; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }

        @keyframes dash { to { stroke-dashoffset: -40; } }
        .animate-march { stroke-dasharray: 8, 4; animation: dash 1s linear infinite; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }

        @keyframes softPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .animate-softPulse { animation: softPulse 2s ease-in-out infinite; }

        .grid-mesh {
          background-size: 42px 42px;
          background-image: linear-gradient(to right, rgba(99, 102, 241, 0.06) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(99, 102, 241, 0.06) 1px, transparent 1px);
        }

        .glow-orb {
          background: radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%);
        }

        .input-field {
          background: rgba(2, 6, 23, 0.7);
          border: 1px solid rgba(51, 65, 85, 0.8);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .input-field:focus {
          outline: none;
          border-color: rgba(129, 140, 248, 0.7);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
        }

        .cta-btn {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%);
          box-shadow: 0 8px 24px -6px rgba(99, 102, 241, 0.45);
        }
        .cta-btn:hover:not(:disabled) { box-shadow: 0 10px 30px -6px rgba(99, 102, 241, 0.6); transform: translateY(-1px); }
        .cta-btn:active:not(:disabled) { transform: translateY(0) scale(0.98); }
        .cta-btn:disabled { opacity: 0.4; box-shadow: none; }

        .scrollbar-thin::-webkit-scrollbar { width: 5px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(71, 85, 105, 0.6); border-radius: 4px; }
      `}</style>

      {/* ============= HEADER ============= */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 z-20 shrink-0" style={{ boxShadow: '0 4px 30px rgba(0,0,0,0.4)' }}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef)', boxShadow: '0 0 20px rgba(139,92,246,0.35)' }}>
            <Navigation size={20} />
          </div>
          <div>
            <h1 className="font-display text-sm font-extrabold tracking-wide bg-gradient-to-r from-slate-50 via-slate-200 to-slate-400 bg-clip-text text-transparent">
              AI AGENTIC ROUTE OPTIMIZER
            </h1>
            <p className="font-mono text-[10px] text-indigo-400/90 tracking-wide">
              Tavily Search + Mistral Large LLM + Dijkstra Graph Solver
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-[10px] bg-slate-950/70 px-3 py-1.5 rounded-lg text-slate-400 border border-slate-800 font-mono">
            <span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-amber-400 animate-softPulse' : 'bg-emerald-400'}`} />
            {loading ? 'Computing' : 'Live Cloud'}
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">

        {/* ============= LEFT SIDEBAR ============= */}
        <aside className="w-80 shrink-0 bg-slate-900/50 backdrop-blur-xl p-5 border-r border-slate-800/70 flex flex-col justify-between z-10 overflow-y-auto scrollbar-thin" style={{ boxShadow: '4px 0 24px rgba(0,0,0,0.25)' }}>
          <div className="space-y-5">
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-indigo-500/15 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
              <Zap size={14} className="text-indigo-400 shrink-0 mt-0.5" />
              <span>Source aur destination daalte hi AI live web data se route graph banayega aur shortest path evaluate karega.</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Source</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. Siwan, Bihar"
                    className="input-field w-full rounded-lg pl-3 pr-10 py-2.5 text-xs text-slate-200"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-indigo-400/70 font-mono font-bold">SRC</div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Destination</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. Gopalganj, Bihar"
                    className="input-field w-full rounded-lg pl-3 pr-10 py-2.5 text-xs text-slate-200"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-fuchsia-400/70 font-mono font-bold">DST</div>
                </div>
              </div>
            </div>

            <button
              onClick={handleAgenticRouting}
              disabled={loading}
              className="cta-btn w-full text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all duration-200"
            >
              {loading ? (<><Loader2 size={13} className="animate-spin" /> Resolving Route&hellip;</>) : (<><Play size={13} fill="currentColor" /> Optimize Path</>)}
            </button>

            {error && (
              <div className="animate-fadeIn p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-400" />
                <div className="space-y-0.5">
                  <p className="font-bold uppercase tracking-wider text-[9px] text-red-400 font-mono">Exception</p>
                  <p className="text-slate-300 text-[11px] leading-snug">{error}</p>
                </div>
              </div>
            )}

            {totalDistance !== null && totalDistance !== Infinity && (
              <div className="animate-fadeIn p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px] tracking-wider uppercase font-mono">
                  <CheckCircle size={13} /><span>Path Converged</span>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-500">Resolved route:</p>
                  <div className="text-emerald-400 font-bold font-mono bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 text-[10px] tracking-wide break-words leading-relaxed max-h-24 overflow-y-auto scrollbar-thin">
                    {shortestPath.join(' \u2192 ')}
                  </div>
                  <div className="pt-2 flex items-center justify-between border-t border-slate-800/60">
                    <span className="text-slate-400 text-[10px]">Total distance</span>
                    <span className="text-emerald-400 font-extrabold text-base font-mono">{totalDistance} <span className="text-[10px] text-slate-500">KM</span></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="text-[9px] text-center font-mono text-slate-600 border-t border-slate-800/80 pt-3 flex items-center justify-center gap-1.5">
            <Layers size={10} /> Live Workspace Dashboard v1.1
          </div>
        </aside>

        {/* ============= MAIN CANVAS ============= */}
        <main className="flex-1 bg-slate-950 relative overflow-hidden grid-mesh">
          <div className="absolute inset-0 glow-orb pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/10 to-slate-950 pointer-events-none" />

          {nodes.length === 0 && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-6 z-10 animate-fadeIn">
              <div className="p-5 bg-slate-900/40 rounded-2xl border border-slate-800/50">
                <MapPin className="text-indigo-500/50 mx-auto mb-2" size={30} />
                <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1 font-display">Canvas Idle</h3>
                <p className="text-[10px] text-slate-500 max-w-xs mx-auto">Source aur destination fill karke route plot karo.</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-sm z-30">
              <div className="p-5 bg-slate-900/70 border border-slate-800 rounded-2xl flex flex-col items-center max-w-xs">
                <Loader2 size={22} className="text-indigo-400 animate-spin mb-3" />
                <p className="text-indigo-400 font-bold tracking-wider font-mono text-[11px] uppercase animate-softPulse">Pipeline processing</p>
                <p className="text-[10px] text-slate-500 text-center mt-1 font-mono">Route matrix calculate ho raha hai&hellip;</p>
              </div>
            </div>
          )}

          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            {edges.map((edge, idx) => {
              const isHighlighted = isEdgeInShortestPath(edge);
              const midX = (edge.fromX + edge.toX) / 2;
              const midY = (edge.fromY + edge.toY) / 2;

              return (
                <g key={idx}>
                  <line
                    x1={edge.fromX} y1={edge.fromY} x2={edge.toX} y2={edge.toY}
                    stroke={isHighlighted ? '#10b981' : '#334155'}
                    strokeWidth={isHighlighted ? '3' : '1.3'}
                    opacity={isHighlighted ? '1' : '0.45'}
                  />
                  {isHighlighted && (
                    <line x1={edge.fromX} y1={edge.fromY} x2={edge.toX} y2={edge.toY} stroke="#34d399" strokeWidth="3" className="animate-march" />
                  )}
                  <g transform={`translate(${midX - 25}, ${midY - 10})`}>
                    <rect
                      width="50" height="20" rx="6" fill="#0b1220"
                      stroke={isHighlighted ? '#10b981' : '#334155'}
                      strokeWidth={isHighlighted ? '1.5' : '1'}
                      opacity={isHighlighted ? '1' : '0.75'}
                    />
                    <text x="25" y="13" fill={isHighlighted ? '#34d399' : '#94a3b8'} fontSize="9.5" fontFamily="'JetBrains Mono', monospace" fontWeight="700" textAnchor="middle">
                      {edge.weight} km
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {nodes.map((node) => {
            const isPartOfPath = shortestPath.includes(node.id);
            const srcTerm = source.trim().toLowerCase();
            const destTerm = destination.trim().toLowerCase();
            const isSrcNode = srcTerm && (node.id.toLowerCase().includes(srcTerm) || srcTerm.includes(node.id.toLowerCase()));
            const isDestNode = destTerm && (node.id.toLowerCase().includes(destTerm) || destTerm.includes(node.id.toLowerCase()));

            return (
              <div
                key={node.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 text-center transition-all duration-300"
                style={{ left: node.x, top: node.y }}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono border-2 transition-all duration-300 ${
                  isSrcNode ? 'bg-indigo-500 text-white border-indigo-300 scale-110 font-black' :
                  isDestNode ? 'bg-fuchsia-500 text-white border-fuchsia-300 scale-110 font-black' :
                  isPartOfPath ? 'bg-emerald-500 text-slate-950 border-emerald-200 font-black scale-105' :
                  'bg-slate-900 border-slate-700 text-slate-400'
                }`}
                  style={
                    isSrcNode ? { boxShadow: '0 0 0 5px rgba(99,102,241,0.18), 0 4px 14px rgba(99,102,241,0.4)' } :
                    isDestNode ? { boxShadow: '0 0 0 5px rgba(217,70,239,0.18), 0 4px 14px rgba(217,70,239,0.4)' } :
                    isPartOfPath ? { boxShadow: '0 0 14px rgba(16,185,129,0.4)' } : {}
                  }
                >
                  {isSrcNode ? 'S' : isDestNode ? 'D' : '\u2022'}
                </div>

                <span className={`mt-1.5 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap tracking-wide ${
                  isSrcNode ? 'bg-indigo-950/90 text-indigo-300 border-indigo-700/70' :
                  isDestNode ? 'bg-fuchsia-950/90 text-fuchsia-300 border-fuchsia-700/70' :
                  isPartOfPath ? 'bg-slate-900/90 text-emerald-400 border-emerald-600/70' :
                  'bg-slate-900/80 text-slate-400 border-slate-800/80'
                }`}>
                  {node.name}
                </span>
              </div>
            );
          })}
        </main>
      </div>
    </div>
  );
}