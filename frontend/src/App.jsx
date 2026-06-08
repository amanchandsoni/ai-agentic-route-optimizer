import React, { useState } from 'react';
import { Play, Navigation, Loader2, AlertCircle, CheckCircle, MapPin } from 'lucide-react';

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
      // Increased radius for better text spreading and layout breathing space
      const radius = 220;
      const centerX = 440;
      const centerY = 300;
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
      const response = await fetch("http://127.0.0.1:8000/api/fetch-route-matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: source.trim(), destination: destination.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Server response crashed." }));
        throw new Error(errorData.detail || "Backend pipeline broken.");
      }
      
      const data = await response.json();
      const segments = data.segments;

      if (!segments || segments.length === 0) {
        throw new Error("AI ko is route ka mapping matrix nahi mila.");
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
        throw new Error("Graph computation validation failed.");
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
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      <style>{`
        @keyframes dash { to { stroke-dashoffset: -40; } }
        .animate-march { stroke-dasharray: 8, 4; animation: dash 1s linear infinite; }
      `}</style>

      {/* Top Navbar */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shadow-2xl z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg">
            <Navigation size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wider bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">AI AGENTIC ROUTE OPTIMIZER</h1>
            <p className="text-[11px] text-indigo-400 font-mono tracking-tight">Tavily Engine + Mistral Large LLM + Custom Dijkstra Graph Solver</p>
          </div>
        </div>
        <span className="text-xs bg-slate-950 px-3 py-1.5 rounded-full text-slate-400 border border-slate-800 font-mono">
          Agent Status: <span className="text-emerald-400 font-bold animate-pulse">● Online</span>
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar Controls Panel */}
        <aside className="w-80 bg-slate-900 p-5 border-r border-slate-800 flex flex-col justify-between z-10 shadow-2xl">
          <div className="space-y-5">
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/60 text-[11px] text-slate-400 leading-relaxed">
              🌍 <span className="text-slate-200 font-semibold">Dynamic Routing Framework:</span> Location targets inject karke optimized vector paths render karein.
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">📍 Source Terminal</label>
                <input 
                  type="text" 
                  placeholder="e.g., Siwan(Bihar)" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:border-indigo-500 transition outline-none shadow-inner"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">🎯 Destination Terminal</label>
                <input 
                  type="text" 
                  placeholder="e.g., Gopalganj(Bihar)" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:border-indigo-500 transition outline-none shadow-inner"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>
            </div>

            <button 
              onClick={handleAgenticRouting}
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/20"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Resolving Cluster Topology...
                </>
              ) : (
                <>
                  <Play size={14} /> Optimize Vector Path
                </>
              )}
            </button>

            {error && (
              <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-start gap-2 text-red-400 text-[11px] font-mono leading-tight">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold uppercase tracking-wide text-[10px] text-red-500 mb-0.5">System Exception Catch:</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {totalDistance !== null && totalDistance !== Infinity && (
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-2 animate-fadeIn">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle size={14} /><span>CONVERGED VIA DIJKSTRA</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 space-y-1">
                  <p>Resolved Shortest Matrix Sequence:</p>
                  <p className="text-emerald-400 font-bold bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] tracking-wide break-words leading-relaxed">
                    {shortestPath.join(' ➔ ')}
                  </p>
                  <p className="pt-2 text-slate-300 font-semibold">Net System Weight: <span className="text-emerald-400 font-extrabold text-sm">{totalDistance} KM</span></p>
                </div>
              </div>
            )}
          </div>

          <div className="text-[10px] text-center font-mono text-slate-600 border-t border-slate-800 pt-3">
            Portfolio Agent Engine Alpha v6
          </div>
        </aside>

        {/* Live Vector Spatial Canvas Area */}
        <main className="flex-1 bg-slate-950 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1.5px,transparent_1.5px),linear-gradient(to_bottom,#0f172a_1.5px,transparent_1.5px)] bg-[size:3rem_3rem] opacity-60 pointer-events-none"></div>

          {nodes.length === 0 && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center space-y-2 pointer-events-none p-6">
              <MapPin className="text-indigo-500/30 animate-pulse" size={28} />
              <h3 className="text-xs font-semibold text-slate-500 tracking-wider uppercase">Spatial Simulation Canvas Idle</h3>
              <p className="text-[11px] text-slate-600 max-w-xs">Inputs enter karke topology load karein bahi.</p>
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-40 space-y-3">
              <Loader2 size={28} className="text-indigo-500 animate-spin" />
              <div className="text-center font-mono text-xs text-slate-400 space-y-1">
                <p className="text-indigo-400 font-bold animate-pulse">🛠️ SYSTEM PIPELINE RUNNING</p>
                <p className="text-[10px] text-slate-600">Scraping and mapping layout graphs inside viewports...</p>
              </div>
            </div>
          )}

          {/* Lines & Weight Tags SVG Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            {edges.map((edge, idx) => {
              const isHighlighted = isEdgeInShortestPath(edge);
              const midX = (edge.fromX + edge.toX) / 2;
              const midY = (edge.fromY + edge.toY) / 2;

              return (
                <g key={idx}>
                  <line x1={edge.fromX} y1={edge.fromY} x2={edge.toX} y2={edge.toY} stroke={isHighlighted ? "#10b981" : "#1e293b"} strokeWidth={isHighlighted ? "5" : "2"} />
                  {isHighlighted && <line x1={edge.fromX} y1={edge.fromY} x2={edge.toX} y2={edge.toY} stroke="#34d399" strokeWidth="5" className="animate-march" />}
                  
                  {/* Highly Readable Distance Container Badge */}
                  <g transform={`translate(${midX - 25}, ${midY - 11})`}>
                    <rect width="50" height="22" rx="6" fill="#020617" stroke={isHighlighted ? "#10b981" : "#475569"} strokeWidth={isHighlighted ? "1.5" : "1"} shadow="lg" />
                    <text x="25" y="14" fill={isHighlighted ? "#34d399" : "#94a3b8"} fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                      {edge.weight} KM
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Connected Hub Nodes */}
          {nodes.map((node) => {
            const isPartOfPath = shortestPath.includes(node.id);
            const isSrcNode = node.id.toLowerCase().includes(source.trim().toLowerCase()) || source.trim().toLowerCase().includes(node.id.toLowerCase());
            const isDestNode = node.id.toLowerCase().includes(destination.trim().toLowerCase()) || destination.trim().toLowerCase().includes(node.id.toLowerCase());

            return (
              <div key={node.id} className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 text-center" style={{ left: node.x, top: node.y }}>
                {/* Node Core Pointer */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono border transition-all duration-500 shadow-2xl ${
                  isSrcNode ? 'bg-indigo-600 text-white border-indigo-400 ring-4 ring-indigo-500/30 scale-110' :
                  isDestNode ? 'bg-purple-600 text-white border-purple-400 ring-4 ring-purple-500/30 scale-110' :
                  isPartOfPath ? 'bg-emerald-500 text-slate-950 border-emerald-300 font-extrabold scale-105' : 'bg-slate-900 border-slate-700 text-slate-300'
                }`}>
                  📍
                </div>
                
                {/* UPGRADED CLEAR BOLD TEXT LABEL */}
                <div className="mt-2 relative">
                  <span className={`block font-mono text-[11px] font-bold px-2.5 py-1 rounded-md shadow-xl border whitespace-nowrap tracking-wide ${
                    isSrcNode ? 'bg-indigo-950 text-indigo-300 border-indigo-800' :
                    isDestNode ? 'bg-purple-950 text-purple-300 border-purple-800' :
                    isPartOfPath ? 'bg-slate-900 text-emerald-400 border-emerald-600' : 'bg-slate-900/95 text-slate-200 border-slate-700'
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