const fs = require('node:fs/promises');
const path = require('node:path');
const https = require('node:https');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const exec = promisify(execFile);
function parseLockfile(text) {
  const parts = String(text).trim().split(':');
  const port = Number(parts[2]);
  if (
    parts.length !== 5 ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    parts[4] !== 'https' ||
    !parts[3]
  )
    return null;
  return { port, password: parts[3] };
}
function parseCommandLine(text) {
  const port = Number(String(text ?? '').match(/--app-port[= ](\d+)/)?.[1]);
  const password = String(text ?? '').match(/--remoting-auth-token[= ]([^\s"]+)/)?.[1];
  return Number.isInteger(port) && port > 0 && port <= 65535 && password
    ? { port, password }
    : null;
}
const lcuRoutes = new Set([
  '/lol-gameflow/v1/gameflow-phase',
  '/lol-gameflow/v1/session',
  '/lol-champ-select/v1/session',
]);
const liveRoutes = new Set([
  '/liveclientdata/activeplayer',
  '/liveclientdata/activeplayername',
  '/liveclientdata/playerlist',
  '/liveclientdata/gamestats',
]);
function getLocalJson(port, route, auth) {
  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !(auth ? lcuRoutes : liveRoutes).has(route)
  )
    return Promise.reject(new Error('Unsupported local read'));
  return new Promise((resolve, reject) => {
    const request = https.get(
      {
        hostname: '127.0.0.1',
        port,
        path: route,
        method: 'GET',
        rejectUnauthorized: false,
        headers: auth
          ? { Authorization: 'Basic ' + Buffer.from('riot:' + auth).toString('base64') }
          : {},
      },
      (response) => {
        let size = 0;
        const chunks = [];
        response.on('data', (b) => {
          size += b.length;
          if (size > 2 * 1024 * 1024) request.destroy(new Error('Local response too large'));
          else chunks.push(b);
        });
        response.on('end', () => {
          try {
            resolve({
              status: response.statusCode,
              data: JSON.parse(Buffer.concat(chunks).toString('utf8')),
            });
          } catch {
            reject(new Error('Invalid local response'));
          }
        });
      },
    );
    request.setTimeout(1800, () => request.destroy(new Error('Local read timeout')));
    request.on('error', () => reject(new Error('Local client unavailable')));
  });
}
async function discoverClient(directory) {
  const roots = directory ? [directory, path.join(directory, 'LeagueClient')] : [];
  for (const root of roots) {
    try {
      const parsed = parseLockfile(await fs.readFile(path.join(root, 'lockfile'), 'utf8'));
      if (parsed) return { ...parsed, origin: 'lockfile' };
    } catch {}
  }
  if (process.platform !== 'win32') return { error: '客户端接口仅在 Windows 启用。' };
  try {
    const { stdout } = await exec(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Get-CimInstance Win32_Process -Filter "Name='LeagueClientUx.exe'" | Select-Object CommandLine,ExecutablePath | ConvertTo-Json -Compress`,
      ],
      { windowsHide: true, timeout: 3500, maxBuffer: 512 * 1024 },
    );
    if (!stdout.trim()) return { error: '未找到英雄联盟客户端。' };
    const parsed = JSON.parse(stdout);
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    for (const row of rows) {
      const credentials = parseCommandLine(row?.CommandLine);
      if (credentials) return { ...credentials, origin: 'client-process' };
    }
    return {
      error:
        '客户端正在运行，但无法读取连接信息。可选择安装目录中的有效 lockfile，并检查助手与客户端的权限是否一致。',
    };
  } catch {
    return { error: '无法读取客户端连接信息，可手动选择安装目录。' };
  }
}
async function pollLcu(credentials, get = getLocalJson) {
  const phase = await get(
    credentials.port,
    '/lol-gameflow/v1/gameflow-phase',
    credentials.password,
  );
  if (phase.status !== 200) throw new Error('Client authentication expired');
  const game = await get(credentials.port, '/lol-gameflow/v1/session', credentials.password);
  const state = {
    phase: typeof phase.data === 'string' ? phase.data : 'Unknown',
    queueId: game.data?.gameData?.queue?.id,
    matchId: game.data?.gameData?.gameId ? String(game.data.gameData.gameId) : undefined,
  };
  if (state.phase === 'ChampSelect') {
    const selection = await get(
      credentials.port,
      '/lol-champ-select/v1/session',
      credentials.password,
    );
    const local = selection.data?.myTeam?.find(
      (p) => p.cellId === selection.data.localPlayerCellId,
    );
    if (Number.isInteger(local?.championId) && local.championId > 0)
      state.championGameId = local.championId;
  }
  return state;
}
async function pollLive(get = getLocalJson) {
  const active = await get(2999, '/liveclientdata/activeplayer');
  if (active.status !== 200) return null;
  const [me, players, stats] = await Promise.all([
    get(2999, '/liveclientdata/activeplayername'),
    get(2999, '/liveclientdata/playerlist'),
    get(2999, '/liveclientdata/gamestats'),
  ]);
  const local = Array.isArray(players.data)
    ? players.data.find(
        (p) =>
          p.riotId === me.data ||
          p.summonerName === me.data ||
          `${p.riotIdGameName}#${p.riotIdTagLine}` === me.data,
      )
    : null;
  return {
    level: Number(active.data?.level ?? local?.level) || undefined,
    championName: local?.rawChampionName ?? local?.championName,
    itemIds: local?.items?.map((i) => i.itemID).filter(Number.isInteger),
    gameTime: typeof stats.data?.gameTime === 'number' ? stats.data.gameTime : undefined,
    liveConnected: true,
  };
}
module.exports = {
  parseLockfile,
  parseCommandLine,
  getLocalJson,
  discoverClient,
  pollLcu,
  pollLive,
};
