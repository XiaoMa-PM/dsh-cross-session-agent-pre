// INPUT: Public profileContext, private registry files and OS process identity.
// OUTPUT: Stable profile identities and validated local instance addresses.
// POS: Shared DSH instance discovery boundary for the Claude bridge.
import { createHash, randomUUID } from 'node:crypto';
import { realpathSync, writeFileSync, renameSync, readdirSync, lstatSync, openSync, readFileSync, closeSync, unlinkSync, constants } from 'node:fs';
import { join } from 'node:path';
import { ensurePrivateDirectory, processInfo } from './local.mjs';

export const validInstanceId = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export function bridgeError(code, message) {
  return Object.assign(new Error(message), { code });
}

export function instanceIdentity(profile) {
  if (!profile || typeof profile.name !== 'string' || !profile.name || typeof profile.dir !== 'string') {
    throw bridgeError('INVALID_PROFILE', 'Public profile identity unavailable');
  }
  const canonical = JSON.stringify([realpathSync(profile.dir), profile.name]);
  return { instanceId: createHash('sha256').update(canonical).digest('hex'), profileName: profile.name };
}

export function instancePaths(dir, id) {
  if (!validInstanceId(id)) throw bridgeError('INVALID_INSTANCE', 'Invalid instanceId');
  return { socket: join(dir, `${id}.sock`), registry: join(dir, `${id}.instance.json`) };
}

export function saveInstance(dir, instance) {
  ensurePrivateDirectory(dir);
  const paths = instancePaths(dir, instance.instanceId);
  const temporary = join(dir, `${randomUUID()}.tmp`);
  const { instanceId, profileName, ownerPid, ownerStart } = instance;
  writeFileSync(temporary, JSON.stringify({ instanceId, profileName, ownerPid, ownerStart, socket: paths.socket }), { flag: 'wx', mode: 0o600 });
  renameSync(temporary, paths.registry);
}

function readInstance(dir, name) {
  const file = join(dir, name);
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0 || stat.size > 4096) return null;
  const fd = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  let entry;
  try { entry = JSON.parse(readFileSync(fd, 'utf8')); }
  finally { closeSync(fd); }
  const paths = instancePaths(dir, entry.instanceId);
  if (paths.registry !== file || paths.socket !== entry.socket || typeof entry.profileName !== 'string' || !entry.profileName || !Number.isInteger(entry.ownerPid) || entry.ownerPid < 2 || typeof entry.ownerStart !== 'string') return null;
  const owner = processInfo(entry.ownerPid);
  return { instanceId: entry.instanceId, profileName: entry.profileName, socket: paths.socket, ownerPid: entry.ownerPid, ownerStart: entry.ownerStart, online: !!owner && owner.start === entry.ownerStart };
}

export function readInstances(dir) {
  ensurePrivateDirectory(dir);
  return readdirSync(dir).filter(name => /^[a-f0-9]{64}\.instance\.json$/.test(name)).flatMap(name => {
    try {
      const entry = readInstance(dir, name);
      return entry ? [entry] : [];
    } catch { return []; }
  });
}

export function removeInstance(dir, instance) {
  const paths = instancePaths(dir, instance.instanceId);
  const current = readInstances(dir).find(entry => entry.instanceId === instance.instanceId);
  if (current && current.ownerPid === instance.ownerPid && current.ownerStart === instance.ownerStart) unlinkSync(paths.registry);
}
