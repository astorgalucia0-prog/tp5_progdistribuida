import { Router } from 'express';
import logger from '../logger.js';

export function createRaftRouter(raftNode) {
  const router = Router();

  // GET /raft/status — Diagnóstico de estado del nodo (Hito 1)
  router.get('/status', (req, res) => {
    const status = raftNode.getStatus();
    res.json(status);
  });

  // POST /raft/request-vote — RPC Solicitud de Voto (Hito 2)
  router.post('/request-vote', (req, res) => {
    try {
      const response = raftNode.handleRequestVote(req.body);
      res.json(response);
    } catch (err) {
      logger.error(`[Raft Router] Error en RequestVote: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /raft/append-entries — RPC Heartbeat / Replicación de Entradas (Hito 3 y 4)
  router.post('/append-entries', (req, res) => {
    try {
      const response = raftNode.handleAppendEntries(req.body);
      res.json(response);
    } catch (err) {
      logger.error(`[Raft Router] Error en AppendEntries: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
