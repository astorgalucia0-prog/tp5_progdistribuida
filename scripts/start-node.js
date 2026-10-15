// Runner multiplataforma para iniciar nodos de Raft sin problemas de variables de entorno en Windows/Linux/macOS
const nodeId = process.argv[2] || 'node1';
process.env.NODE_ID = nodeId;

console.log(`[Cluster Runner] Iniciando ${nodeId}...`);
import('../src/service.js');
