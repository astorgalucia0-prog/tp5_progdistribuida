import fs from 'node:fs';
import path from 'node:path';
import logger from '../logger.js';

export function saveRaftState(nodeId, state) {
  try {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const filePath = path.join(dataDir, `raft_state_${nodeId}.json`);
    const payload = {
      currentTerm: state.currentTerm,
      votedFor: state.votedFor,
      log: state.log,
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    logger.error(`[Raft Persistence] Error al guardar estado de ${nodeId}: ${err.message}`);
  }
}

export function loadRaftState(nodeId) {
  try {
    const filePath = path.resolve(process.cwd(), 'data', `raft_state_${nodeId}.json`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      logger.info(`[Raft Persistence] Estado restaurado para ${nodeId}: Term ${parsed.currentTerm}, VotedFor: ${parsed.votedFor}, LogLength: ${parsed.log ? parsed.log.length : 0}`);
      return parsed;
    }
  } catch (err) {
    logger.error(`[Raft Persistence] Error al cargar estado de ${nodeId}: ${err.message}`);
  }
  return null;
}
