// ==========================================
// 1. PRIORITY QUEUE (Dijkstra's Helper)
// ==========================================
class PriorityQueue {
    constructor() {
        this.values = [];
    }
    enqueue(val, priority) {
        this.values.push({ val, priority });
        this.sort();
    }
    dequeue() {
        return this.values.shift();
    }
    sort() {
        this.values.sort((a, b) => a.priority - b.priority);
    }
    isEmpty() {
        return this.values.length === 0;
    }
}

// ==========================================
// 2. MAIN GRAPH CLASS WITH DIJKSTRA ALGORITHM
// ==========================================
class Graph {
    constructor() {
        this.adjacencyList = {};
    }

    // Node (Shehar) jodhna
    addVertex(vertex) {
        if (!this.adjacencyList[vertex]) {
            this.adjacencyList[vertex] = [];
        }
    }

    // Edge (Raasta aur Doori) jodhna
    addEdge(vertex1, vertex2, weight) {
        this.adjacencyList[vertex1].push({ node: vertex2, weight: weight });
        this.adjacencyList[vertex2].push({ node: vertex1, weight: weight });
    }

    // DIJKSTRA'S ALGORITHM (Shortest Path Logic)
    findShortestPath(start, finish) {
        const nodes = new PriorityQueue();
        const distances = {};
        const previous = {};
        let path = []; // Final raasta store karne ke liye
        let smallest;

        // Initial state set karna
        for (let vertex in this.adjacencyList) {
            if (vertex === start) {
                distances[vertex] = 0;
                nodes.enqueue(vertex, 0);
            } else {
                distances[vertex] = Infinity;
                nodes.enqueue(vertex, Infinity);
            }
            previous[vertex] = null;
        }

        // Jab tak queue me shehar bache hain
        while (!nodes.isEmpty()) {
            smallest = nodes.dequeue().val;

            if (smallest === finish) {
                // End point mil gaya! Ab raasta piche se aage trace karenge
                while (previous[smallest]) {
                    path.push(smallest);
                    smallest = previous[smallest];
                }
                break;
            }

            if (smallest || distances[smallest] !== Infinity) {
                for (let neighbor in this.adjacencyList[smallest]) {
                    // Padosi shehar dhoondhna
                    let nextNode = this.adjacencyList[smallest][neighbor];
                    
                    // Naye raaste ka total distance calculate karna
                    let candidate = distances[smallest] + nextNode.weight;
                    let neighborValue = nextNode.node;

                    if (candidate < distances[neighborValue]) {
                        // Agar naya raasta pichle raaste se chota hai, toh update karo
                        distances[neighborValue] = candidate;
                        previous[neighborValue] = smallest;
                        
                        // Queue me naye distance ke saath daalo
                        nodes.enqueue(neighborValue, candidate);
                    }
                }
            }
        }
        
        // Path ko seedha karke return karna (saath me total distance bhi)
        return {
            path: path.concat(smallest).reverse(),
            totalDistance: distances[finish]
        };
    }
}

// ==========================================
// 3. TESTING THE WHOLE LOGIC (Step 5)
// ==========================================
const map = new Graph();

// Saare shehar add kiye
map.addVertex("A");
map.addVertex("B");
map.addVertex("C");
map.addVertex("D");
map.addVertex("E");

// Raste aur unki doori add ki (Jaise real map me hota hai)
map.addEdge("A", "B", 4);
map.addEdge("A", "C", 2);
map.addEdge("B", "E", 3);
map.addEdge("C", "D", 2);
map.addEdge("D", "E", 3);
map.addEdge("C", "B", 1); // C se B ka raasta bhi hai

// TEST: Hame 'A' se 'E' jaane ka sabse chota raasta dhoondhna hai
const result = map.findShortestPath("A", "E");

console.log("--- 🚀 GRAPH ROUTING CORE ENGINE TEST ---");
console.log("Shortest Path (Sabse chota raasta):", result.path.join(" -> "));
console.log("Total Distance (Kul doori):", result.totalDistance + " KM");