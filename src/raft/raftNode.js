import logger from '../logger.js';
import { applyEntryToStateMachine } from './stateMachine.js';
import { saveRaftState, loadRaftState } from './raftPersistence.js';

export class RaftNode {
  constructor(config) {
    this.nodeId = config.nodeId;
    this.httpPort = config.httpPort;
    this.peers = config.peers; // Array de { id, url, httpPort }
    
    // Estado persistente en todos los servidores (Hito 6B)
    const savedState = loadRaftState(this.nodeId);
    this.currentTerm = savedState ? (savedState.currentTerm || 0) : 0;
    this.votedFor = savedState ? (savedState.votedFor || null) : null;
    this.log = savedState && Array.isArray(savedState.log) ? savedState.log : [];

    // Estado volátil del protocolo Raft
    this.role = 'FOLLOWER'; // 'FOLLOWER' | 'CANDIDATE' | 'LEADER'
    this.leaderId = null;

    // Estado volátil en todos los servidores
    this.commitIndex = 0;
    this.lastApplied = 0;

    // Estado volátil en el Leader
    this.nextIndex = {};
    this.matchIndex = {};

    // Timers
    this.electionTimer = null;
    this.heartbeatTimer = null;
    this.heartbeatIntervalMs = 300; // Heartbeats cada 300ms

    logger.info(`[Raft] [${this.nodeId}] Inicializado en puerto ${this.httpPort}. Term: ${this.currentTerm}, LogSize: ${this.log.length}`);

    // Iniciar temporizador de elección
    this.resetElectionTimer();
  }

  // Guardar estado persistente en disco (Hito 6B)
  persist() {
    saveRaftState(this.nodeId, {
      currentTerm: this.currentTerm,
      votedFor: this.votedFor,
      log: this.log
    });
  }

  // Timeout de elección aleatorizado entre 1500ms y 3000ms
  getRandomElectionTimeout() {
    return Math.floor(1500 + Math.random() * 1500);
  }

  resetElectionTimer() {
    this.stopElectionTimer();
    const timeout = this.getRandomElectionTimeout();

    this.electionTimer = setTimeout(() => {
      this.startElection();
    }, timeout);
  }

  stopElectionTimer() {
    if (this.electionTimer) {
      clearTimeout(this.electionTimer);
      this.electionTimer = null;
    }
  }

  startHeartbeatTimer() {
    this.stopHeartbeatTimer();
    this.heartbeatTimer = setInterval(() => {
      if (this.role === 'LEADER') {
        this.sendHeartbeats();
      } else {
        this.stopHeartbeatTimer();
      }
    }, this.heartbeatIntervalMs);
  }

  stopHeartbeatTimer() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  stepDown(newTerm) {
    logger.info(`[Raft] [${this.nodeId}] Transición a FOLLOWER. Término anterior: ${this.currentTerm} -> Nuevo: ${newTerm}`);
    this.role = 'FOLLOWER';
    this.currentTerm = newTerm;
    this.votedFor = null;
    this.leaderId = null;
    this.persist();
    this.stopHeartbeatTimer();
    this.resetElectionTimer();
  }

  // HITO 2: Proceso de Elección de Leader
  async startElection() {
    if (this.role === 'LEADER') return;

    this.role = 'CANDIDATE';
    this.currentTerm += 1;
    this.votedFor = this.nodeId;
    this.leaderId = null;
    this.persist();

    logger.warn(`[Raft] [${this.nodeId}] Expirtó el election timeout. Iniciando ELECCIÓN para el Término ${this.currentTerm}`);
    this.resetElectionTimer();

    let votesCount = 1; // Auto-voto
    const totalClusterSize = this.peers.length + 1;
    const votesNeeded = Math.floor(totalClusterSize / 2) + 1; // Mayoría (2 de 3)

    const lastLogIndex = this.log.length > 0 ? this.log[this.log.length - 1].index : 0;
    const lastLogTerm = this.log.length > 0 ? this.log[this.log.length - 1].term : 0;

    const requestVoteBody = {
      term: this.currentTerm,
      candidateId: this.nodeId,
      lastLogIndex,
      lastLogTerm
    };

    const votePromises = this.peers.map(async (peer) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);

        const res = await fetch(`${peer.url}/raft/request-vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestVoteBody),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        logger.debug(`[Raft] [${this.nodeId}] No se pudo solicitar voto a ${peer.id}: ${err.message}`);
      }
      return null;
    });

    const results = await Promise.all(votePromises);

    if (this.role !== 'CANDIDATE') return;

    for (const result of results) {
      if (!result) continue;

      if (result.term > this.currentTerm) {
        this.stepDown(result.term);
        return;
      }

      if (result.voteGranted) {
        votesCount += 1;
      }
    }

    logger.info(`[Raft] [${this.nodeId}] Conteo de votos para Término ${this.currentTerm}: ${votesCount}/${totalClusterSize}`);

    if (votesCount >= votesNeeded && this.role === 'CANDIDATE') {
      this.becomeLeader();
    }
  }

  becomeLeader() {
    logger.info(`[Raft] [${this.nodeId}] ¡ELECTO LEADER! para Término ${this.currentTerm}. Quórum alcanzado.`);
    this.role = 'LEADER';
    this.leaderId = this.nodeId;
    this.stopElectionTimer();

    const lastLogIndex = this.log.length > 0 ? this.log[this.log.length - 1].index : 0;
    for (const peer of this.peers) {
      this.nextIndex[peer.id] = lastLogIndex + 1;
      this.matchIndex[peer.id] = 0;
    }

    this.sendHeartbeats();
    this.startHeartbeatTimer();
  }

  // HITO 2: RPC RequestVote
  handleRequestVote({ term, candidateId, lastLogIndex = 0, lastLogTerm = 0 }) {
    if (term > this.currentTerm) {
      this.stepDown(term);
    }

    let voteGranted = false;

    if (term < this.currentTerm) {
      voteGranted = false;
    } else {
      const canVote = (this.votedFor === null || this.votedFor === candidateId);

      const localLastLogIndex = this.log.length > 0 ? this.log[this.log.length - 1].index : 0;
      const localLastLogTerm = this.log.length > 0 ? this.log[this.log.length - 1].term : 0;

      const isLogUpToDate =
        (lastLogTerm > localLastLogTerm) ||
        (lastLogTerm === localLastLogTerm && lastLogIndex >= localLastLogIndex);

      if (canVote && isLogUpToDate) {
        voteGranted = true;
        this.votedFor = candidateId;
        this.persist();
        this.resetElectionTimer();
        logger.info(`[Raft] [${this.nodeId}] Voto OTORGADO a ${candidateId} (Term ${term})`);
      }
    }

    return {
      term: this.currentTerm,
      voteGranted
    };
  }

  // HITO 4, 5 y 6: Proponer una nueva operación (Solo en LEADER)
  async proposeCommand(command) {
    if (this.role !== 'LEADER') {
      return {
        success: false,
        isLeader: false,
        leaderId: this.leaderId,
        mensaje: `Petición denegada: Este nodo (${this.nodeId}) es ${this.role}. El Leader actual es: ${this.leaderId || 'Desconocido'}`
      };
    }

    const newIndex = this.log.length > 0 ? this.log[this.log.length - 1].index + 1 : 1;
    const entry = {
      index: newIndex,
      term: this.currentTerm,
      command
    };

    this.log.push(entry);
    this.persist();

    logger.info(`[Raft] [${this.nodeId}] Nueva entrada agregada al Log local. Index: ${newIndex}, Term: ${this.currentTerm}`);

    // Disparar replicación inmediata a los peers
    this.sendHeartbeats();

    // Esperar quórum de commit
    const startTime = Date.now();
    const timeoutMs = 5000;

    while (Date.now() - startTime < timeoutMs) {
      if (this.commitIndex >= newIndex) {
        // Asegurar que se haya aplicado en la State Machine local
        await this.applyCommittedEntries();
        return {
          success: true,
          isLeader: true,
          index: newIndex,
          term: this.currentTerm,
          data: entry.command.data
        };
      }
      await new Promise(r => setTimeout(r, 50));
    }

    return {
      success: false,
      isLeader: true,
      error: 'Timeout esperando confirmación por mayoría (Quórum).'
    };
  }

  // HITO 3, 4 y 6A: Enviar AppendEntries / Heartbeats a todos los followers
  async sendHeartbeats() {
    if (this.role !== 'LEADER') return;

    for (const peer of this.peers) {
      this.sendAppendEntriesToPeer(peer);
    }
  }

  async sendAppendEntriesToPeer(peer) {
    if (this.role !== 'LEADER') return;

    const nextIdx = this.nextIndex[peer.id] || 1;
    const prevLogIndex = nextIdx - 1;
    const prevLogTerm = prevLogIndex > 0 && this.log[prevLogIndex - 1] ? this.log[prevLogIndex - 1].term : 0;

    const entries = this.log.slice(prevLogIndex);

    const appendEntriesBody = {
      term: this.currentTerm,
      leaderId: this.nodeId,
      prevLogIndex,
      prevLogTerm,
      entries,
      leaderCommit: this.commitIndex
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 800);

      const res = await fetch(`${peer.url}/raft/append-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appendEntriesBody),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();

        if (data.term > this.currentTerm) {
          this.stepDown(data.term);
          return;
        }

        if (this.role !== 'LEADER') return;

        if (data.success) {
          // Replicación exitosa en el follower
          this.matchIndex[peer.id] = data.matchIndex;
          this.nextIndex[peer.id] = data.matchIndex + 1;

          // Verificar si podemos hacer avanzar el commitIndex por mayoría
          this.checkAndUpdateCommitIndex();
        } else {
          // HITO 6A: Inconsistencia detectada en follower atrasado -> Retroceder nextIndex y reintentar
          logger.warn(`[Raft] [${this.nodeId}] Replicación rechazada por follower ${peer.id}. Ajustando nextIndex (${nextIdx} -> ${Math.max(1, nextIdx - 1)})`);
          this.nextIndex[peer.id] = Math.max(1, nextIdx - 1);
          // Reintentar de inmediato la replicación desde la posición anterior
          setTimeout(() => this.sendAppendEntriesToPeer(peer), 50);
        }
      }
    } catch (err) {
      logger.debug(`[Raft] [${this.nodeId}] AppendEntries no entregado a ${peer.id}: ${err.message}`);
    }
  }

  // HITO 4: Avance de commitIndex por mayoría de quórum
  checkAndUpdateCommitIndex() {
    if (this.role !== 'LEADER') return;

    const totalClusterSize = this.peers.length + 1;
    const votesNeeded = Math.floor(totalClusterSize / 2) + 1; // 2 de 3

    for (let N = this.log.length; N > this.commitIndex; N--) {
      // Regla Raft: Solo se commitean entradas del término actual
      if (this.log[N - 1].term !== this.currentTerm) continue;

      let count = 1; // El Leader ya la tiene
      for (const peer of this.peers) {
        if ((this.matchIndex[peer.id] || 0) >= N) {
          count++;
        }
      }

      if (count >= votesNeeded) {
        logger.info(`[Raft] [${this.nodeId}] Avance de commitIndex: ${this.commitIndex} -> ${N} (Confirmado por ${count}/${totalClusterSize} nodos)`);
        this.commitIndex = N;
        this.applyCommittedEntries();
        break;
      }
    }
  }

  // HITO 4, 5 y 6A: Procesar RPC AppendEntries en los Followers
  handleAppendEntries({ term, leaderId, prevLogIndex = 0, prevLogTerm = 0, entries = [], leaderCommit = 0 }) {
    if (term < this.currentTerm) {
      return { term: this.currentTerm, success: false, matchIndex: 0 };
    }

    if (term > this.currentTerm || this.role !== 'FOLLOWER') {
      this.currentTerm = term;
      this.role = 'FOLLOWER';
      this.votedFor = null;
      this.persist();
      this.stopHeartbeatTimer();
    }

    this.leaderId = leaderId;
    this.resetElectionTimer();

    // HITO 4: Verificación de consistencia del Log antecesor
    if (prevLogIndex > 0) {
      const entryAtPrev = this.log[prevLogIndex - 1];
      if (!entryAtPrev || entryAtPrev.term !== prevLogTerm) {
        logger.warn(`[Raft] [${this.nodeId}] Inconsistencia de Log detectada en index ${prevLogIndex}. PrevTerm local: ${entryAtPrev ? entryAtPrev.term : 'N/A'}, recibido: ${prevLogTerm}`);
        return {
          term: this.currentTerm,
          success: false,
          matchIndex: this.log.length
        };
      }
    }

    // Insertar nuevas entradas sobreescribiendo cualquier conflicto
    if (entries.length > 0) {
      this.log = this.log.slice(0, prevLogIndex);
      this.log.push(...entries);
      this.persist();
      logger.info(`[Raft] [${this.nodeId}] Entradas de log replicadas correctamente. Log size actual: ${this.log.length}`);
    }

    // HITO 4: Actualizar commitIndex en el follower según lo notificado por el Leader
    if (leaderCommit > this.commitIndex) {
      this.commitIndex = Math.min(leaderCommit, this.log.length);
      this.applyCommittedEntries();
    }

    const currentMatchIndex = this.log.length;
    return {
      term: this.currentTerm,
      success: true,
      matchIndex: currentMatchIndex
    };
  }

  // HITO 5: Aplicar Entradas Committed a la State Machine local
  async applyCommittedEntries() {
    while (this.commitIndex > this.lastApplied) {
      this.lastApplied += 1;
      const entryToApply = this.log[this.lastApplied - 1];
      if (entryToApply) {
        await applyEntryToStateMachine(entryToApply, this.nodeId);
      }
    }
  }

  getStatus() {
    return {
      nodeId: this.nodeId,
      role: this.role,
      currentTerm: this.currentTerm,
      votedFor: this.votedFor,
      leaderId: this.leaderId,
      commitIndex: this.commitIndex,
      lastApplied: this.lastApplied,
      logLength: this.log.length,
      log: this.log,
      peers: this.peers.map(p => ({ id: p.id, url: p.url }))
    };
  }
}
