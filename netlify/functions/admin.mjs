// =====================================================================
//  Espace bénévoles — fonction serveur (Netlify Function)
//
//  - Vérifie l'identifiant et le mot de passe (jamais écrits dans le code :
//    ils sont lus dans les variables d'environnement de Netlify).
//  - Lit et publie le contenu du site dans le dépôt GitHub, en UN SEUL
//    commit par publication (donc un seul déploiement Netlify).
//
//  Variables d'environnement à créer dans Netlify
//  (Project configuration → Environment variables) :
//    ADMIN_USERNAME   identifiant des bénévoles
//    ADMIN_PASSWORD   mot de passe des bénévoles
//    GITHUB_TOKEN     jeton GitHub (droits « Contents : Read and write »)
//    GITHUB_REPO      dépôt, ex : QuentinMorvan37/SanquerSite
//    GITHUB_BRANCH    (facultatif) branche, « main » par défaut
//    SITE_DIR         (facultatif) sous-dossier du site dans le dépôt
//    SESSION_SECRET   (facultatif) clé de signature des sessions
// =====================================================================

import crypto from 'node:crypto';

export const config = { path: '/api/admin' };

const DATA_FILES = ['accueil', 'photos', 'presse', 'partenaires'];
const UPLOAD_PATH = /^assets\/images\/uploads\/[a-z0-9][a-z0-9-]{0,80}\.(jpg|jpeg|png|webp|gif)$/;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;   // après redimensionnement côté navigateur
const MAX_IMAGES_PER_PUBLISH = 60;
const SESSION_HOURS = 12;

const env = name => (process.env[name] || '').trim();

// ---------------------------------------------------------------------
// Réponses
// ---------------------------------------------------------------------
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// ---------------------------------------------------------------------
// Sessions signées (pas de base de données nécessaire)
// ---------------------------------------------------------------------
function sessionKey() {
  return env('SESSION_SECRET') ||
    crypto.createHash('sha256').update('sanquer|' + env('ADMIN_PASSWORD') + '|' + env('GITHUB_TOKEN')).digest('hex');
}
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', sessionKey()).update(body).digest('base64url');
  return body + '.' + mac;
}
function verify(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const expected = crypto.createHmac('sha256', sessionKey()).update(body).digest('base64url');
  if (!safeEqual(mac, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    return payload.exp > Date.now() ? payload : null;
  } catch { return null; }
}
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}
const pause = ms => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------------
// GitHub
// ---------------------------------------------------------------------
const GITHUB_API = process.env.GITHUB_API_URL || 'https://api.github.com';

function repoPath(p) {
  const dir = env('SITE_DIR').replace(/^\/+|\/+$/g, '');
  return dir ? dir + '/' + p : p;
}

async function gh(method, path, body) {
  const repo = env('GITHUB_REPO');
  const res = await fetch(`${GITHUB_API}/repos/${repo}${path}`, {
    method,
    headers: {
      Authorization: 'Bearer ' + env('GITHUB_TOKEN'),
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'sanquer-espace-benevoles',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const err = new Error(`GitHub ${method} ${path} → ${res.status} ${data && data.message ? data.message : ''}`);
    err.githubStatus = res.status;
    throw err;
  }
  return data;
}

function explainGithubError(err) {
  const s = err.githubStatus;
  if (s === 401) return 'Le jeton GitHub (GITHUB_TOKEN) est invalide ou expiré.';
  if (s === 403) return 'Le jeton GitHub n’a pas le droit d’écrire dans le dépôt (permission « Contents : Read and write »).';
  if (s === 404) return 'Dépôt ou fichier introuvable : vérifiez GITHUB_REPO, GITHUB_BRANCH et SITE_DIR.';
  return 'GitHub a refusé la demande : ' + err.message;
}

async function branchHead() {
  const branch = env('GITHUB_BRANCH') || 'main';
  const ref = await gh('GET', `/git/ref/heads/${encodeURIComponent(branch)}`);
  const commit = await gh('GET', `/git/commits/${ref.object.sha}`);
  return { branch, commitSha: ref.object.sha, treeSha: commit.tree.sha };
}

async function readDataFiles() {
  const branch = env('GITHUB_BRANCH') || 'main';
  const out = {};
  for (const name of DATA_FILES) {
    const path = repoPath(`data/${name}.json`);
    const file = await gh('GET', `/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`);
    const content = Buffer.from(file.content, 'base64').toString('utf8');
    out[name] = { sha: file.sha, content: JSON.parse(content) };
  }
  return out;
}

// ---------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------
async function login({ username, password }) {
  const U = env('ADMIN_USERNAME'), P = env('ADMIN_PASSWORD');
  if (!U || !P) throw new HttpError(500, 'L’identifiant et le mot de passe ne sont pas encore configurés dans Netlify (ADMIN_USERNAME / ADMIN_PASSWORD).');
  const ok = safeEqual((username || '').trim().toLowerCase(), U.toLowerCase()) & safeEqual(password || '', P);
  if (!ok) {
    await pause(1200); // ralentit les essais au hasard
    throw new HttpError(401, 'Identifiant ou mot de passe incorrect.');
  }
  const exp = Date.now() + SESSION_HOURS * 3600 * 1000;
  return { token: sign({ u: U, exp }), expires: exp };
}

function checkConfig() {
  const missing = ['GITHUB_TOKEN', 'GITHUB_REPO'].filter(n => !env(n));
  if (missing.length) throw new HttpError(500, 'Configuration incomplète dans Netlify : ' + missing.join(', ') + '.');
  if (!/^[\w.-]+\/[\w.-]+$/.test(env('GITHUB_REPO'))) throw new HttpError(500, 'GITHUB_REPO doit ressembler à « compte/depot ».');
}

async function load() {
  checkConfig();
  return { files: await readDataFiles() };
}

async function uploadBlob({ data }) {
  checkConfig();
  if (typeof data !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(data)) throw new HttpError(400, 'Image illisible.');
  const bytes = Math.floor(data.length * 3 / 4);
  if (bytes > MAX_IMAGE_BYTES) throw new HttpError(413, 'Image trop lourde, même après réduction.');
  const blob = await gh('POST', '/git/blobs', { content: data, encoding: 'base64' });
  return { sha: blob.sha };
}

async function publish({ files, images, base, message }) {
  checkConfig();
  if (!files || typeof files !== 'object') throw new HttpError(400, 'Rien à publier.');
  const names = Object.keys(files);
  if (!names.length && !(images || []).length) throw new HttpError(400, 'Rien à publier.');
  for (const n of names) {
    if (!DATA_FILES.includes(n)) throw new HttpError(400, 'Fichier non autorisé : ' + n);
    if (!files[n] || typeof files[n] !== 'object' || Array.isArray(files[n])) throw new HttpError(400, 'Contenu invalide pour ' + n);
  }
  images = Array.isArray(images) ? images : [];
  if (images.length > MAX_IMAGES_PER_PUBLISH) throw new HttpError(400, 'Trop de photos d’un coup (' + MAX_IMAGES_PER_PUBLISH + ' maximum).');
  for (const img of images) {
    if (!img || !UPLOAD_PATH.test(img.path || '') || !/^[a-f0-9]{40}$/.test(img.sha || '')) {
      throw new HttpError(400, 'Photo invalide : ' + (img && img.path));
    }
  }

  // Quelqu'un d'autre a-t-il publié entre-temps ?
  const current = await readDataFiles();
  for (const n of names) {
    if (base && base[n] && current[n].sha !== base[n]) {
      throw new HttpError(409, 'Quelqu’un d’autre a publié une modification entre-temps. Rechargez la page pour récupérer la dernière version, puis refaites vos changements.');
    }
  }

  const head = await branchHead();
  const tree = [];
  for (const n of names) {
    tree.push({ path: repoPath(`data/${n}.json`), mode: '100644', type: 'blob',
      content: JSON.stringify(files[n], null, 2) + '\n' });
  }
  for (const img of images) {
    tree.push({ path: repoPath(img.path), mode: '100644', type: 'blob', sha: img.sha });
  }
  const newTree = await gh('POST', '/git/trees', { base_tree: head.treeSha, tree });
  const label = { accueil: 'accueil', photos: 'photos', presse: 'presse', partenaires: 'partenaires' };
  const summary = names.map(n => label[n]).join(', ') + (images.length ? ` (+${images.length} image${images.length > 1 ? 's' : ''})` : '');
  const text = String(message || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  const commit = await gh('POST', '/git/commits', {
    message: `Espace bénévoles : ${text || 'mise à jour'} — ${summary}`,
    tree: newTree.sha,
    parents: [head.commitSha],
  });
  try {
    await gh('PATCH', `/git/refs/heads/${encodeURIComponent(head.branch)}`, { sha: commit.sha, force: false });
  } catch (err) {
    if (err.githubStatus === 422) throw new HttpError(409, 'Le dépôt a changé pendant la publication. Réessayez dans quelques secondes.');
    throw err;
  }
  return { commit: commit.sha, files: await readDataFiles() };
}

// ---------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------
export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Méthode non autorisée.' });
  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'Requête invalide.' }); }

  try {
    if (body.action === 'login') return json(200, await login(body));

    const auth = req.headers.get('authorization') || '';
    const session = verify(auth.replace(/^Bearer\s+/i, '') || body.token);
    if (!session) return json(401, { error: 'Session expirée : reconnectez-vous.', session: false });

    switch (body.action) {
      case 'load':    return json(200, await load());
      case 'blob':    return json(200, await uploadBlob(body));
      case 'publish': return json(200, await publish(body));
      default:        return json(400, { error: 'Action inconnue.' });
    }
  } catch (err) {
    if (err instanceof HttpError) return json(err.status, { error: err.message });
    if (err.githubStatus) return json(502, { error: explainGithubError(err) });
    console.error(err);
    return json(500, { error: 'Erreur inattendue : ' + err.message });
  }
};
