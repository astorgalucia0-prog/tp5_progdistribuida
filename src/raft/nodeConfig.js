import 'dotenv/config';

export function getClusterConfig() {
  const nodeId = process.env.NODE_ID || 'node1';

  // Configuración de los 3 nodos del cluster por defecto con puertos HTTP y HTTPS independientes
  const defaultNodes = {
    node1: { id: 'node1', httpPort: 3001, httpsPort: 3443, url: 'http://127.0.0.1:3001', dbName: 'tp3_db_node1' },
    node2: { id: 'node2', httpPort: 3002, httpsPort: 3444, url: 'http://127.0.0.1:3002', dbName: 'tp3_db_node2' },
    node3: { id: 'node3', httpPort: 3003, httpsPort: 3445, url: 'http://127.0.0.1:3003', dbName: 'tp3_db_node3' }
  };

  const selfInfo = defaultNodes[nodeId] || {
    id: nodeId,
    httpPort: 3001,
    httpsPort: 3443,
    url: 'http://127.0.0.1:3001',
    dbName: `tp3_db_${nodeId}`
  };

  // Si HTTP_PORT fue configurado explícitamente y no es el valor legacy 3000, se usa. De lo contrario, se usa el puerto del nodo.
  const envHttpPort = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT, 10) : null;
  const httpPort = (envHttpPort && envHttpPort !== 3000) ? envHttpPort : selfInfo.httpPort;

  // Si HTTPS_PORT fue configurado explícitamente y no es el valor legacy 3443, se usa. De lo contrario, se usa el puerto HTTPS del nodo.
  const envHttpsPort = process.env.HTTPS_PORT ? parseInt(process.env.HTTPS_PORT, 10) : null;
  const httpsPort = (envHttpsPort && envHttpsPort !== 3443) ? envHttpsPort : selfInfo.httpsPort;

  // Si MONGODB_URI fue configurado explícitamente y no es la base genérica tp3_distribuida, se usa. De lo contrario, se usa la base del nodo.
  const envMongoURI = process.env.MONGODB_URI;
  const isGenericDb = envMongoURI && envMongoURI.includes('/tp3_distribuida');
  const mongoURI = (envMongoURI && !isGenericDb) ? envMongoURI : `mongodb://127.0.0.1:27017/${selfInfo.dbName}`;

  // Peers son los demás nodos excluyéndose a sí mismo
  const peers = Object.values(defaultNodes).filter(p => p.id !== nodeId);

  return {
    nodeId,
    httpPort,
    httpsPort,
    mongoURI,
    peers,
    allNodes: defaultNodes
  };
}
