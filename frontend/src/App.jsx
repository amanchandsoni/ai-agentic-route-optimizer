import React, { useState } from 'react';
import { Play, Navigation, Loader2, AlertCircle, CheckCircle, MapPin, RefreshCw, Layers } from 'lucide-react';

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
    this.adjacencyList[vertex1].push({ node: vertex2, weight: weight });
    this.adjacencyList[vertex2].push({ node: vertex1, weight: weight });
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
      const angle = (idx / uniqueCities.length) * 2 * Math.PI;
      const radius = 230; 
      const centerX = 460;
      const centerY = 320;
      return { id: city, name: city, x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) };
    });
  };

  const handleAgenticRouting = async () => {
    if (!source.trim() || !destination.trim()) {
      alert("Bhai, source aur destination dono ka naam likho!");
      return;
    }
    
    setLoading(true);
    setError(null);
    setShortestPath([]);
    setTotalDistance(null);

    try {
      // production live endpoint mapping directly via Hugging Face Cloud engine
      const response = await fetch("https://aman-dev-ai33-ai-route-backend.hf.space/api/fetch-route-matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: source.trim(), destination: destination.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Server cluster validation execution failed." }));
        throw new Error(errorData.detail || "Backend production pipeline processing error.");
      }
      
      const data = await response.json();
      const segments = data.segments;

      if (!segments || segments.length === 0) {
        throw new Error("AI Agent ko is specified layout matrix sequence ka route graph nahi mila.");
      }

      const computedNodes = generateNodePositions(segments);
      setNodes(computedNodes);

      const computedEdges = segments.map(seg => {
        const fromNode = computedNodes.find(n => n.id === seg.from);
        const toNode = computedNodes.find(n => n.id === seg.to);
        return {
          from: seg.from, to: seg.to, weight: seg.weight,
          fromX: fromNode.x, fromY: fromNode.y,
          toX: toNode.x, toY: toNode.y
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
        throw new Error("Topology alignment validation failed inside graph matrix engine.");
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
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
      <style>{`
        @keyframes dash { to { stroke-dashoffset: -40; } }
        .animate-march { stroke-dasharray: 8, 4; animation: dash 1s linear infinite; }
        .grid-mesh {
          background-size: 40px 40px;
          background-image: linear-gradient(to right, rgba(30, 41, 59, 0.5) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(30, 41, 59, 0.5) 1px, transparent 1px);
        }
      `}</style>

      {/* Modern High-Tech Header Section */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-[0_4px_30px_rgba(0,0,0,0.5)] z-20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white rounded-xl shadow-[0_0_15px_rgba(79,70,229,0.4)]">
            <Navigation size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-widest bg-gradient-to-r from-slate-50 via-slate-200 to-slate-400 bg-clip-text text-transparent">
              AI AGENTIC ROUTE OPTIMIZER
            </h1>
            <p className="text-[10px] text-indigo-400 font-mono tracking-tight uppercase">
              Tavily Engine + Mistral Large LLM + Custom Dijkstra Graph Solver
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 text-[10px] bg-slate-950/80 px-3 py-1.5 rounded-lg text-slate-400 border border-slate-800 font-mono">
            Agent Pipelines: <span className="text-emerald-400 font-bold flex items-center gap-1">● Live Cloud</span>
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left Side Control Tower Dashboard */}
        <aside className="w-80 bg-slate-900/40 backdrop-blur-md p-5 border-r border-slate-800/80 flex flex-col justify-between z-10 shadow-[4px_0_24px_rgba(0,0,0,0.3)]">
          <div className="space-y-5">
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-indigo-500/10 text-[11px] text-slate-400 leading-relaxed shadow-inner">
              <span className="text-indigo-400 font-semibold block mb-0.5">🧠 Agentic Spatial Engine:</span>
              Locations pass karte hi dynamic LLM parser matrix links create karega, aur UI par path evaluate hoga.
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">📍 Source Core</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="e.g., Siwan, Bihar" 
                    className="w-full bg-slate-950/90 border border-slate-800 focus:border-indigo-500 rounded-lg pl-3 pr-8 py-2.5 text-xs text-slate-200 transition outline-none shadow-inner"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  />
                  <div className="absolute right-2.5 top-3 text-[10px] text-slate-600 font-mono">SRC</div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">🎯 Destination Target</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="e.g., Gopalganj, Bihar" 
                    className="w-full bg-slate-950/90 border border-slate-800 focus:border-purple-500 rounded-lg pl-3 pr-8 py-2.5 text-xs text-slate-200 transition outline-none shadow-inner"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                  <div className="absolute right-2.5 top-3 text-[10px] text-slate-600 font-mono">DEST</div>
                </div>
              </div>
            </div>

            <button 
              onClick={handleAgenticRouting}
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-90 disabled:opacity-40 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="animate-spin text-white" /> Resolving Cluster Topology...
                </>
              ) : (
                <>
                  <Play size={13} fill="currentColor" /> Optimize Vector Path
                </>
              )}
            </button>

            {/* Elegant Error Diagnostics Monitor */}
            {error && (
              <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-start gap-2 text-red-400 text-[11px] font-mono leading-tight animate-fadeIn">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-500" />
                <div className="space-y-0.5">
                  <p className="font-bold uppercase tracking-wider text-[9px] text-red-500">Pipeline Exception Catch:</p>
                  <p className="text-slate-300 text-[10px]">{error}</p>
                </div>
              </div>
            )}

            {/* High-Fidelity Convergence Output Window */}
            {totalDistance !== null && totalDistance !== Infinity && (
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3 animate-fadeIn shadow-md">
                <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold text-[10px] tracking-wider uppercase">
                  <CheckCircle size={13} /><span>CONVERGED VIA DIJKSTRA</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 space-y-2">
                  <p className="text-[10px] text-slate-500">Resolved Path Matrix:</p>
                  <div className="text-emerald-400 font-bold bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-[10px] tracking-wide break-words leading-relaxed max-h-24 overflow-y-auto">
                    {shortestPath.join(' ➔ ')}
                  </div>
                  <div className="pt-1 flex items-center justify-between border-t border-slate-800/60 mt-2">
                    <span className="text-slate-400 text-[10px]">Net Vector Weight:</span>
                    <span className="text-emerald-400 font-black text-sm">{totalDistance} KM</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="text-[9px] text-center font-mono text-slate-600 border-t border-slate-800/80 pt-3 flex items-center justify-center gap-1.5">
            <Layers size={10} /> Live Workspace Dashboard v1.0
          </div>
        </aside>

        {/* Dynamic Vector Spatial Simulation Workspace Canvas Layer */}
        <main className="flex-1 bg-slate-950 relative overflow-hidden grid-mesh">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/20 to-slate-950 pointer-events-none"></div>

          {nodes.length === 0 && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center space-y-3 pointer-events-none p-6 z-10 animate-fadeIn">
              <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800/50 shadow-2xl">
                <MapPin className="text-indigo-500/40 animate-bounce mx-auto mb-2" size={32} />
                <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Spatial Canvas Blueprint Idle</h3>
                <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
                  Source aur target fields load karke real-time vectors plot karein bhai.
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-sm z-30 space-y-3">
              <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col items-center shadow-2xl max-w-xs">
                <RefreshCw size={24} className="text-indigo-400 animate-spin mb-3" />
                <p className="text-indigo-400 font-bold tracking-wider font-mono text-[11px] uppercase animate-pulse">🛠️ PIPELINE PROCESSING</p>
                <p className="text-[10px] text-slate-500 text-center mt-1 font-mono">LLM model targets link calculations matrix calculate kar raha hai...</p>
              </div>
            </div>
          )}

          {/* Lines & Weight Tags SVG Engineering Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            {edges.map((edge, idx) => {
              const isHighlighted = isEdgeInShortestPath(edge);
              const midX = (edge.fromX + edge.toX) / 2;
              const midY = (edge.fromY + edge.toY) / 2;

              return (
                <g key={idx} className="transition-all duration-500">
                  <line 
                    x1={edge.fromX} 
                    y1={edge.fromY} 
                    x2={edge.toX} 
                    y2={edge.toY} 
                    stroke={isHighlighted ? "#10b981" : "#1e293b"} 
                    strokeWidth={isHighlighted ? "4" : "1.5"} 
                    opacity={isHighlighted ? "1" : "0.4"}
                  />
                  {isHighlighted && (
                    <line 
                      x1={edge.fromX} 
                      y1={edge.fromY} 
                      x2={edge.toX} 
                      y2={edge.toY} 
                      stroke="#34d399" 
                      strokeWidth="4" 
                      className="animate-march" 
                    />
                  )}
                  
                  {/* Distance Nodes Container Badges */}
                  <g transform={`translate(${midX - 25}, ${midY - 10})`}>
                    <rect 
                      width="50" 
                      height="20" 
                      rx="5" 
                      fill="#020617" 
                      stroke={isHighlighted ? "#10b981" : "#334155"} 
                      strokeWidth={isHighlighted ? "1.5" : "1"} 
                      opacity={isHighlighted ? "1" : "0.7"}
                    />
                    <text 
                      x="25" 
                      y="13" 
                      fill={isHighlighted ? "#34d399" : "#64748b"} 
                      fontSize="9" 
                      fontFamily="monospace" 
                      fontWeight="bold" 
                      textAnchor="middle"
                    >
                      {edge.weight}K
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Connected Hub Spatial Graph Nodes Layer */}
          {nodes.map((node) => {
            const isPartOfPath = shortestPath.includes(node.id);
            const isSrcNode = node.id.toLowerCase().includes(source.trim().toLowerCase()) || source.trim().toLowerCase().includes(node.id.toLowerCase());
            const isDestNode = node.id.toLowerCase().includes(destination.trim().toLowerCase()) || destination.trim().toLowerCase().includes(node.id.toLowerCase());

            return (
              <div 
                key={node.id} 
                className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 text-center transition-all duration-500" 
                style={{ left: node.x, top: node.y }}
              >
                {/* Node Core Pointer */}
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-mono border transition-all duration-500 shadow-2xl ${
                  isSrcNode ? 'bg-indigo-600 text-white border-indigo-400 ring-4 ring-indigo-500/20 scale-110 font-black' :
                  isDestNode ? 'bg-purple-600 text-white border-purple-400 ring-4 ring-purple-500/20 scale-110 font-black' :
                  isPartOfPath ? 'bg-emerald-500 text-slate-950 border-emerald-200 font-black scale-105 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 
                  'bg-slate-900 border-slate-800 text-slate-400 opacity-80'
                }`}>
                  {isSrcNode ? 'S' : isDestNode ? 'D' : '•'}
                </div>
                
                {/* Custom Bold Typography Matrix Label */}
                <div className="mt-1.5 relative">
                  <span className={`block font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap tracking-wide shadow-2xl transition-all duration-300 ${
                    isSrcNode ? 'bg-indigo-950/95 text-indigo-300 border-indigo-700/80' :
                    isDestNode ? 'bg-purple-950/95 text-purple-300 border-purple-700/80' :
                    isPartOfPath ? 'bg-slate-900/95 text-emerald-400 border-emerald-600/80' : 
                    'bg-slate-900/90 text-slate-300 border-slate-800/80 opacity-70'
                  }`}>
                    {node.name}
                  </span>
                </div>
              </div>
            );
          })}
        </main>

      </div>
    </div>
  );
}