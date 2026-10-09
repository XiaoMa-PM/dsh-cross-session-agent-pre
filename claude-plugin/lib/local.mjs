// INPUT: Local hook metadata, OS process identity and Unix sockets.
// OUTPUT: Private routes, structured peer envelopes and bounded local transport.
// POS: Shared boundary of the experimental Claude/DSH bridge.
import { mkdirSync, lstatSync, writeFileSync, renameSync, openSync, readFileSync, closeSync, readdirSync, constants } from 'node:fs';
import { join, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import net from 'node:net';
import { randomUUID } from 'node:crypto';

export const validId = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const bridgeDirectory = () => process.env.DSH_CLAUDE_BRIDGE_DIR || `/tmp/dsh-claude-${process.getuid()}`;

export function ensurePrivateDirectory(dir) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const stat = lstatSync(dir);
  if (!stat.isDirectory() || stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0) throw new Error('Unsafe bridge directory');
}

export function saveRoute(dir, input) {
  ensurePrivateDirectory(dir);
  if (!validId(input.sessionId) || typeof input.socket !== 'string' || !input.socket.startsWith('/') || !Number.isInteger(input.ownerPid) || input.ownerPid < 2 || typeof input.ownerStart !== 'string') throw new Error('Invalid route');
  const route = { sessionId: input.sessionId, socket: input.socket, ownerPid: input.ownerPid, ownerStart: input.ownerStart };
  const temporary = join(dir, `${randomUUID()}.tmp`);
  writeFileSync(temporary, JSON.stringify(route), { mode: 0o600, flag: 'wx' });
  renameSync(temporary, join(dir, `${input.sessionId}.json`));
  return route;
}

export function readRoutes(dir) {
  ensurePrivateDirectory(dir);
  return readdirSync(dir).filter(name => validId(name.replace(/\.json$/, '')) && name.endsWith('.json')).flatMap(name => {
    const file = join(dir, name);
    const stat = lstatSync(file);
    if (!stat.isFile() || stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0 || stat.size > 2048) return [];
    const fd = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const route = JSON.parse(readFileSync(fd, 'utf8'));
      return validId(route.sessionId) && name === `${route.sessionId}.json` ? [route] : [];
    } finally { closeSync(fd); }
  });
}

export function routesForOwner(dir, owner) {
  return readRoutes(dir).filter(route => route.ownerPid === owner.pid && route.ownerStart === owner.start);
}

export function processInfo(pid) {
  try {
    const line = execFileSync('/bin/ps', ['-p', String(pid), '-o', 'ppid=,comm='], { encoding: 'utf8' }).trim();
    const match = line.match(/^(\d+)\s+(.+)$/);
    if (!match) return null;
    const start = execFileSync('/bin/ps', ['-p', String(pid), '-o', 'lstart='], { encoding: 'utf8' }).trim();
    return { pid, parent: Number(match[1]), command: match[2], start };
  } catch { return null; }
}

export function claudeOwner() {
  let pid = process.ppid;
  for (let depth = 0; depth < 8 && pid > 1; depth += 1) {
    const info = processInfo(pid);
    if (!info) break;
    if (['claude', '2.1.294'].includes(basename(info.command))) return info;
    pid = info.parent;
  }
  throw new Error('Not running under a validated Claude process');
}

export function routeIsOnline(route) {
  const owner = processInfo(route.ownerPid);
  if (!owner || owner.start !== route.ownerStart) return false;
  try {
    const stat = lstatSync(route.socket);
    return stat.isSocket() && stat.uid === process.getuid();
  } catch { return false; }
}

export function validateMessage(args) {
  const targetValid = args && (validId(args.to) || (typeof args.to === 'string' && args.to.startsWith('session-') && validId(args.to.slice(8))));
  if (!targetValid || typeof args.content !== 'string' || !args.content.trim() || Buffer.byteLength(args.content) > 16384) throw new Error('Invalid target or message (max 16 KiB)');
  return { to: args.to, content: args.content };
}

export function peerContent(content, from, platform, tool) {
  const header = { senderPlatform: platform, senderSessionId: from, reply: { tool, to: from }, userApproval: false };
  return `<dsh-cross-session-agent>${JSON.stringify(header)}</dsh-cross-session-agent>\n\n${content}`;
}

export function localRequest(dir, payload) {
  ensurePrivateDirectory(dir);
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(join(dir, 'bridge.sock'));
    socket.setEncoding('utf8');
    let buffer = '';
    socket.setTimeout(5000, () => socket.destroy(new Error('Bridge request timed out')));
    socket.on('connect', () => socket.write(JSON.stringify(payload) + '\n'));
    socket.on('data', chunk => {
      buffer += chunk;
      if (buffer.length > 65536) socket.destroy(new Error('Invalid bridge response'));
      if (!buffer.includes('\n')) return;
      try { const result = JSON.parse(buffer.split('\n')[0]); socket.end(); result.ok ? resolve(result.value) : reject(new Error(result.error)); }
      catch { socket.destroy(new Error('Invalid bridge response')); }
    });
    socket.on('error', reject);
    socket.on('end', () => { if (!buffer.includes('\n')) reject(new Error('Bridge closed without response')); });
  });
}

export function writeClaudeInbox(route, content, from) {
  if (!routeIsOnline(route)) throw new Error('Claude session is offline');
  return new Promise((resolve, reject) => {
    const messageId = randomUUID();
    const socket = net.createConnection(route.socket);
    socket.setTimeout(5000, () => socket.destroy(new Error('Claude inbox timed out')));
    socket.on('connect', () => socket.end(JSON.stringify({ type: 'user', message: { role: 'user', content }, from: `dsh-session:${from}`, from_plugin: 'dsh-cross-session-agent-pre', msg_id: messageId, priority: 'next' }) + '\n'));
    socket.on('error', reject);
    socket.on('close', hadError => { if (!hadError) resolve({ messageId, state: 'written', text: 'Written to native Inbox; delivery remains subject to Claude inbound controls.' }); });
  });
}
