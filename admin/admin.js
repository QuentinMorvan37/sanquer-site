// =====================================================================
//  Espace bénévoles — PL Sanquer Brest Basketball
//  Page d'administration sans compte Netlify : identifiant + mot de passe
//  vérifiés par la fonction /api/admin (netlify/functions/admin.mjs).
// =====================================================================
(function () {
'use strict';

// Sur Netlify : fonction /api/admin. Chez un hébergeur classique : admin/api.php.
// Le bon service est détecté automatiquement au premier appel.
const ENDPOINTS = ['/api/admin', 'api.php'];
let API = sessionStorage.getItem('sanquer-admin-api') || null;

// ---------------------------------------------------------------------
// Description des contenus modifiables
// ---------------------------------------------------------------------
const LIEN_HINT = 'Une page du site (ex : pages/infos.html#inscription) ou une adresse complète commençant par https://';

const SECTIONS = [
  {
    file: 'convocations', tab: 'Convocations',
    intro: 'Les matchs du week-end, affichés sur la page Convocations. Chaque semaine : « Nouveau week-end », puis ajoutez les matchs.',
    fields: [
      { name: 'matchs', label: 'Matchs du week-end', type: 'list', singular: 'un match',
        duplicate: true, clearAll: 'Nouveau week-end (effacer tous les matchs)',
        hint: 'Les matchs sont classés automatiquement par jour et par heure sur le site. « Dupliquer » recopie un match pour aller plus vite.',
        summary: m => {
          const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(m.date || '');
          const jour = d ? new Date(+d[1], d[2] - 1, +d[3]).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }) : '';
          return [jour, (m.heure_match || '').replace(':', 'h'), m.equipe,
            m.adversaire ? (m.lieu === 'exterieur' ? 'à ' : 'contre ') + m.adversaire : ''].filter(Boolean).join(' · ');
        },
        fields: [
          { name: 'equipe', label: 'Équipe', type: 'string', hint: 'Ex : U13 F1, Seniors G2' },
          { name: 'date', label: 'Date du match', type: 'date' },
          { name: 'heure_match', label: 'Heure du match', type: 'time' },
          { name: 'heure_rdv', label: 'Heure de rendez-vous', type: 'time' },
          { name: 'lieu', label: 'Lieu', type: 'select', options: [['domicile', 'À domicile'], ['exterieur', 'À l’extérieur']] },
          { name: 'adversaire', label: 'Adversaire', type: 'string', hint: 'Ex : Landerneau BC' },
          { name: 'salle', label: 'Salle', type: 'string',
            hint: 'À domicile, laissez vide : « Salle Georges-Vigier, Brest » s’affiche automatiquement.' },
          { name: 'adresse', label: 'Adresse de la salle', type: 'string',
            hint: 'Pour le lien « Itinéraire ». Ex : 12 rue de la Gare, Landerneau' },
          { name: 'remarque', label: 'Infos pratiques', type: 'text',
            hint: 'Covoiturage, tenue, table de marque, goûter…' },
          { name: 'joueurs', label: 'Joueurs convoqués', type: 'text',
            hint: 'Facultatif. Le site est public : pour les mineurs, mettez seulement les prénoms.' },
        ]},
      { name: 'message', label: 'Message pour toutes les équipes', type: 'text',
        hint: 'Facultatif. Ex : « En cas d’absence, prévenez votre entraîneur avant jeudi soir. »' },
      { name: 'affiche', label: 'Affiche des convocations', type: 'image', maxSide: 2000,
        hint: 'Facultatif : si vous avez déjà une affiche ou une capture des convocations, elle s’affichera sous la liste.' },
    ],
  },
  {
    file: 'accueil', tab: 'Accueil',
    intro: 'Tout ce qui s’affiche en haut de la page d’accueil.',
    fields: [
      { name: 'banniere', label: 'Grande bannière', type: 'object', fields: [
        { name: 'actif', label: 'Afficher la bannière sur l’accueil', type: 'boolean' },
        { name: 'image', label: 'Image de la bannière', type: 'image', maxSide: 2400,
          hint: 'Format très large, idéalement 2100 × 600 pixels.' },
        { name: 'alt', label: 'Description de l’image', type: 'string',
          hint: 'Lue par les personnes malvoyantes. Ex : « Affiche des inscriptions 2026-2027 ».' },
        { name: 'lien', label: 'Lien au clic', type: 'string', hint: LIEN_HINT },
      ]},
      { name: 'ticker', label: 'Bandeau d’annonces (tout en haut)', type: 'list', singular: 'une annonce',
        addToTop: true, hint: 'Trois annonces au maximum pour rester lisible.',
        summary: v => [v.date, v.titre].filter(Boolean).join(' · '),
        fields: [
          { name: 'date', label: 'Date ou étiquette', type: 'string', hint: 'Ex : JUILLET 2026' },
          { name: 'titre', label: 'Titre', type: 'string' },
          { name: 'lien', label: 'Lien', type: 'string', hint: LIEN_HINT },
        ]},
      { name: 'actualites', label: 'Diaporama « Ça se passe au club »', type: 'list', singular: 'une actualité',
        addToTop: true, summary: v => v.titre,
        fields: [
          { name: 'tag', label: 'Catégorie', type: 'string', hint: 'Ex : Événement, Stages, Résultats' },
          { name: 'titre', label: 'Titre', type: 'string' },
          { name: 'texte', label: 'Texte', type: 'text' },
          { name: 'image', label: 'Photo', type: 'image', maxSide: 2000,
            hint: 'Au format paysage : les affiches verticales seront coupées.' },
          { name: 'lien', label: 'Lien « En savoir plus »', type: 'string', hint: LIEN_HINT },
        ]},
      { name: 'panneau', label: 'Cartes « À ne pas manquer »', type: 'list', singular: 'une carte',
        summary: v => v.titre,
        fields: [
          { name: 'etiquette', label: 'Tampon rouge', type: 'string', hint: 'Ex : Convocations' },
          { name: 'titre', label: 'Titre', type: 'string' },
          { name: 'texte', label: 'Texte', type: 'text' },
          { name: 'boutons', label: 'Boutons', type: 'list', singular: 'un bouton', summary: v => v.texte,
            fields: [
              { name: 'texte', label: 'Texte du bouton', type: 'string' },
              { name: 'lien', label: 'Lien', type: 'string', hint: LIEN_HINT },
              { name: 'style', label: 'Style', type: 'select', options: [
                ['ghost', 'Bleu foncé (bouton secondaire)'], ['rouge', 'Rouge (bouton principal)'] ] },
            ]},
        ]},
    ],
  },
  {
    file: 'photos', tab: 'Photos',
    intro: 'Les albums de la page Photos. Le premier album de la liste s’affiche en premier.',
    fields: [
      { name: 'albums', label: 'Albums', type: 'list', singular: 'un album', addToTop: true, open: true,
        summary: v => [v.titre, v.date].filter(Boolean).join(' · ') + ` (${(v.photos || []).length} photo${(v.photos || []).length > 1 ? 's' : ''})`,
        fields: [
          { name: 'titre', label: 'Titre de l’album', type: 'string' },
          { name: 'date', label: 'Date', type: 'string', hint: 'Ex : Octobre 2026' },
          { name: 'description', label: 'Description', type: 'text' },
          { name: 'photos', label: 'Photos', type: 'gallery' },
        ]},
    ],
  },
  {
    file: 'presse', tab: 'Presse',
    intro: 'Les articles de la page Presse.',
    fields: [
      { name: 'articles', label: 'Articles', type: 'list', singular: 'un article', addToTop: true,
        summary: v => [v.source, v.date, v.titre].filter(Boolean).join(' · '),
        fields: [
          { name: 'source', label: 'Journal ou source', type: 'string', hint: 'Ex : Le Télégramme, Ouest-France' },
          { name: 'date', label: 'Date', type: 'string', hint: 'Ex : Mars 2026' },
          { name: 'titre', label: 'Titre', type: 'string' },
          { name: 'resume', label: 'Résumé', type: 'text' },
          { name: 'lien', label: 'Lien vers l’article', type: 'string', hint: LIEN_HINT },
          { name: 'image', label: 'Image ou coupure de presse', type: 'image', maxSide: 1600 },
        ]},
    ],
  },
  {
    file: 'partenaires', tab: 'Partenaires',
    intro: 'Les logos affichés en bas de la page d’accueil.',
    fields: [
      { name: 'partenaires', label: 'Partenaires', type: 'list', singular: 'un partenaire',
        summary: v => v.nom, thumb: v => v.logo,
        fields: [
          { name: 'nom', label: 'Nom', type: 'string' },
          { name: 'logo', label: 'Logo', type: 'image', maxSide: 800, hint: 'Fond blanc ou transparent de préférence.' },
          { name: 'lien', label: 'Site web', type: 'string', hint: 'Adresse complète commençant par https://' },
        ]},
    ],
  },
];

// ---------------------------------------------------------------------
// État
// ---------------------------------------------------------------------
const state = {
  token: sessionStorage.getItem('sanquer-admin-token') || '',
  original: {},   // { accueil: '...json string...' }
  shas: {},       // { accueil: 'sha du fichier sur GitHub' }
  data: {},       // contenu en cours d'édition
  staged: {},     // photos ajoutées mais pas encore publiées : { '/assets/images/uploads/x.jpg': {base64, url} }
  tab: 'convocations',
  busy: false,
};

const $ = id => document.getElementById(id);
const el = (tag, attrs, ...children) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'text') n.textContent = v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(c));
  return n;
};

// ---------------------------------------------------------------------
// Appels serveur
// ---------------------------------------------------------------------
async function call(url, action, payload) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(state.token ? { Authorization: 'Bearer ' + state.token } : {}) },
    // le jeton est aussi dans le corps : certains hébergeurs suppriment l'en-tête Authorization
    body: JSON.stringify({ action, ...(state.token ? { token: state.token } : {}), ...payload }),
  });
}

async function api(action, payload) {
  let res = null;
  for (const url of API ? [API] : ENDPOINTS) {
    try { res = await call(url, action, payload); } catch { res = null; continue; }
    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    if (isJson) {
      if (API !== url) { API = url; sessionStorage.setItem('sanquer-admin-api', url); }
      break;
    }
    res = null;
  }
  if (!res) {
    throw new Error('Le service d’administration est introuvable. Sur Netlify : vérifiez que le dossier netlify/functions a bien été envoyé. Chez un hébergeur : vérifiez que PHP est activé et que admin/api.php est présent.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || 'Erreur ' + res.status);
    err.status = res.status;
    err.expired = body.session === false;
    throw err;
  }
  return body;
}

// ---------------------------------------------------------------------
// Connexion
// ---------------------------------------------------------------------
let afterLogin = null;

function showLogin(message) {
  $('login').hidden = false;
  $('loginError').hidden = !message;
  $('loginError').textContent = message || '';
  setTimeout(() => ($('loginUser').value ? $('loginPass') : $('loginUser')).focus(), 50);
}

$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const username = $('loginUser').value.trim();
  const password = $('loginPass').value;
  if (!username || !password) return showLogin('Remplissez l’identifiant et le mot de passe.');
  $('loginBtn').disabled = true;
  $('loginBtn').textContent = 'Connexion…';
  try {
    const { token } = await api('login', { username, password });
    state.token = token;
    sessionStorage.setItem('sanquer-admin-token', token);
    $('loginPass').value = '';
    $('login').hidden = true;
    if (afterLogin) { const f = afterLogin; afterLogin = null; f(); }
    else start();
  } catch (err) {
    showLogin(err.message);
  } finally {
    $('loginBtn').disabled = false;
    $('loginBtn').textContent = 'Se connecter';
  }
});

$('logoutBtn').addEventListener('click', () => {
  if (dirtyFiles().length && !confirm('Des changements ne sont pas publiés. Se déconnecter quand même ?')) return;
  state.token = '';
  sessionStorage.removeItem('sanquer-admin-token');
  location.reload();
});

// Si la session expire en cours de route : on redemande le mot de passe
// sans perdre le travail en cours.
async function withSession(fn) {
  try { return await fn(); }
  catch (err) {
    if (!err.expired) throw err;
    state.token = '';
    sessionStorage.removeItem('sanquer-admin-token');
    return new Promise((resolve, reject) => {
      afterLogin = () => fn().then(resolve, reject);
      showLogin('Votre session a expiré. Reconnectez-vous : vos changements sont conservés.');
    });
  }
}

// ---------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------
async function start() {
  $('app').hidden = false;
  $('loading').hidden = false;
  $('editor').innerHTML = '';
  try {
    const { files } = await withSession(() => api('load'));
    applyFiles(files);
    $('loading').hidden = true;
    renderTabs();
    renderEditor();
  } catch (err) {
    $('loading').hidden = true;
    notice('error', err.message);
  }
}

function applyFiles(files) {
  for (const [name, f] of Object.entries(files)) {
    state.original[name] = JSON.stringify(f.content);
    state.shas[name] = f.sha;
    state.data[name] = JSON.parse(state.original[name]);
  }
}

if (state.token) start(); else showLogin();

// ---------------------------------------------------------------------
// Onglets et éditeur
// ---------------------------------------------------------------------
function renderTabs() {
  const tabs = $('tabs');
  tabs.innerHTML = '';
  for (const s of SECTIONS) {
    const dirty = dirtyFiles().includes(s.file);
    tabs.append(el('button', {
      type: 'button', role: 'tab', class: 'tab' + (state.tab === s.file ? ' active' : ''),
      'aria-selected': String(state.tab === s.file),
      onclick: () => { state.tab = s.file; renderTabs(); renderEditor(); window.scrollTo(0, 0); },
    }, s.tab, dirty ? el('span', { class: 'tab-dot', title: 'Changements non publiés' }) : null));
  }
}

function renderEditor() {
  const s = SECTIONS.find(x => x.file === state.tab);
  const root = $('editor');
  root.innerHTML = '';
  root.append(el('p', { class: 'section-intro' }, s.intro));
  const data = state.data[s.file];
  const wasClean = !dirtyFiles().includes(s.file);
  for (const f of s.fields) root.append(renderField(f, data));
  if (wasClean) state.original[s.file] = JSON.stringify(data);
}

function changed() {
  const files = dirtyFiles();
  $('publishbar').hidden = files.length === 0;
  document.body.classList.toggle('has-publishbar', files.length > 0);
  const names = SECTIONS.filter(s => files.includes(s.file)).map(s => s.tab);
  $('publishStatus').textContent = files.length
    ? 'Changements non publiés : ' + names.join(', ') + '.'
    : '';
  // mettre à jour les pastilles des onglets sans tout redessiner
  document.querySelectorAll('.tab').forEach((t, i) => {
    const dirty = files.includes(SECTIONS[i].file);
    const dot = t.querySelector('.tab-dot');
    if (dirty && !dot) t.append(el('span', { class: 'tab-dot', title: 'Changements non publiés' }));
    if (!dirty && dot) dot.remove();
  });
}

function dirtyFiles() {
  return Object.keys(state.data).filter(n => JSON.stringify(state.data[n]) !== state.original[n]);
}

window.addEventListener('beforeunload', e => {
  if (dirtyFiles().length) { e.preventDefault(); e.returnValue = ''; }
});

// ---------------------------------------------------------------------
// Champs
// ---------------------------------------------------------------------
let uid = 0;
const nextId = () => 'f' + (++uid);

function fieldWrap(f, control, id) {
  return el('div', { class: 'field' },
    el(id ? 'label' : 'span', { class: 'field-label', for: id }, f.label),
    control,
    f.hint ? el('p', { class: 'field-hint' }, f.hint) : null);
}

function renderField(f, obj) {
  const id = nextId();
  switch (f.type) {
    case 'string': {
      if (obj[f.name] == null) obj[f.name] = '';
      const input = el('input', { id, value: obj[f.name] });
      input.value = obj[f.name];
      input.addEventListener('input', () => { obj[f.name] = input.value; changed(); refreshSummaries(input); });
      return fieldWrap(f, input, id);
    }
    case 'text': {
      if (obj[f.name] == null) obj[f.name] = '';
      const ta = el('textarea', { id, rows: 3 });
      ta.value = obj[f.name];
      ta.addEventListener('input', () => { obj[f.name] = ta.value; changed(); });
      return fieldWrap(f, ta, id);
    }
    case 'boolean': {
      if (obj[f.name] == null) obj[f.name] = true;
      const box = el('input', { id, type: 'checkbox' });
      box.checked = !!obj[f.name];
      box.addEventListener('change', () => { obj[f.name] = box.checked; changed(); });
      return el('div', { class: 'field field-check' },
        el('label', { for: id, class: 'check' }, box, el('span', {}, f.label)));
    }
    case 'select': {
      if (obj[f.name] == null) obj[f.name] = f.options[0][0];
      const sel = el('select', { id }, f.options.map(([v, label]) => el('option', { value: v }, label)));
      sel.value = obj[f.name];
      sel.addEventListener('change', () => { obj[f.name] = sel.value; changed(); });
      return fieldWrap(f, sel, id);
    }
    case 'date':
    case 'time': {
      if (obj[f.name] == null) obj[f.name] = '';
      const input = el('input', { id, type: f.type, class: 'input-' + f.type });
      input.value = obj[f.name];
      input.addEventListener('input', () => { obj[f.name] = input.value; changed(); refreshSummaries(input); });
      return fieldWrap(f, input, id);
    }
    case 'image':   return renderImage(f, obj, id);
    case 'object':  return renderObject(f, obj);
    case 'list':    return renderList(f, obj);
    case 'gallery': return renderGallery(f, obj);
  }
  return el('p', {}, 'Champ inconnu : ' + f.name);
}

function renderObject(f, obj) {
  if (!obj[f.name] || typeof obj[f.name] !== 'object') obj[f.name] = {};
  const box = el('section', { class: 'group' }, el('h2', { class: 'group-title' }, f.label));
  for (const sub of f.fields) box.append(renderField(sub, obj[f.name]));
  return box;
}

// ---- Listes -----------------------------------------------------------
function emptyItem(fields) {
  const item = {};
  for (const f of fields) {
    if (f.type === 'list' || f.type === 'gallery') item[f.name] = [];
    else if (f.type === 'boolean') item[f.name] = true;
    else if (f.type === 'select') item[f.name] = f.options[0][0];
    else if (f.type === 'object') item[f.name] = emptyItem(f.fields);
    else item[f.name] = '';
  }
  return item;
}

function renderList(f, obj) {
  if (!Array.isArray(obj[f.name])) obj[f.name] = [];
  const list = obj[f.name];
  const nested = !!f.nested;
  const box = el('section', { class: nested ? 'sublist' : 'group' });
  const itemsBox = el('div', { class: 'items' });
  const openSet = new Set();

  const addBtn = el('button', { type: 'button', class: 'btn btn-add' }, 'Ajouter ' + f.singular);
  addBtn.addEventListener('click', () => {
    const item = emptyItem(f.fields);
    if (f.addToTop) list.unshift(item); else list.push(item);
    const index = f.addToTop ? 0 : list.length - 1;
    // décale les éléments ouverts
    const shifted = [...openSet].map(i => (f.addToTop ? i + 1 : i));
    openSet.clear(); shifted.forEach(i => openSet.add(i)); openSet.add(index);
    draw();
    changed();
    const card = itemsBox.children[index];
    if (card) { card.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); card.querySelector('input,textarea')?.focus(); }
  });

  const buttons = el('div', { class: 'group-buttons' });
  if (f.clearAll) {
    buttons.append(el('button', { type: 'button', class: 'btn btn-small btn-quiet', onclick: () => {
      if (!list.length) return;
      if (!confirm('Effacer les ' + list.length + ' éléments de la liste ? (Rien ne change sur le site tant que vous ne cliquez pas sur « Publier ».)')) return;
      list.splice(0, list.length); openSet.clear(); draw(); changed();
    } }, f.clearAll));
  }
  buttons.append(addBtn);
  const head = el('div', { class: 'group-head' },
    el(nested ? 'h3' : 'h2', { class: 'group-title' }, f.label, el('span', { class: 'count' }, String(list.length))),
    buttons);
  box.append(head);
  if (f.hint) box.append(el('p', { class: 'field-hint' }, f.hint));
  box.append(itemsBox);

  function move(i, delta) {
    const j = i + delta;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    const wasI = openSet.has(i), wasJ = openSet.has(j);
    openSet.delete(i); openSet.delete(j);
    if (wasI) openSet.add(j); if (wasJ) openSet.add(i);
    draw(); changed();
    itemsBox.children[j]?.querySelector('.item-summary')?.focus();
  }

  function draw() {
    head.querySelector('.count').textContent = String(list.length);
    itemsBox.innerHTML = '';
    if (!list.length) {
      itemsBox.append(el('p', { class: 'empty' }, 'Rien pour l’instant. Utilisez « Ajouter ' + f.singular + ' ».'));
      return;
    }
    list.forEach((item, i) => {
      const card = el('details', { class: 'item' });
      if (openSet.has(i) || (f.open && list.length === 1)) card.open = true;
      card.addEventListener('toggle', () => { card.open ? openSet.add(i) : openSet.delete(i); });
      const title = el('span', { class: 'item-title' });
      const thumbSrc = f.thumb ? f.thumb(item) : null;
      const summary = el('summary', { class: 'item-summary' },
        thumbSrc ? el('img', { class: 'item-thumb', src: imageUrl(thumbSrc), alt: '' }) : null,
        title,
        el('span', { class: 'item-tools' },
          f.duplicate ? el('button', { type: 'button', class: 'icon-btn', title: 'Dupliquer', 'aria-label': 'Dupliquer',
            onclick: e => {
              e.preventDefault();
              list.splice(i + 1, 0, JSON.parse(JSON.stringify(item)));
              const shifted = [...openSet].map(k => (k > i ? k + 1 : k));
              openSet.clear(); shifted.forEach(k => openSet.add(k)); openSet.add(i + 1);
              draw(); changed();
              itemsBox.children[i + 1]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } }, '⧉') : null,
          el('button', { type: 'button', class: 'icon-btn', title: 'Monter', 'aria-label': 'Monter', disabled: i === 0,
            onclick: e => { e.preventDefault(); move(i, -1); } }, '↑'),
          el('button', { type: 'button', class: 'icon-btn', title: 'Descendre', 'aria-label': 'Descendre', disabled: i === list.length - 1,
            onclick: e => { e.preventDefault(); move(i, 1); } }, '↓'),
          el('button', { type: 'button', class: 'icon-btn danger', title: 'Supprimer', 'aria-label': 'Supprimer',
            onclick: e => {
              e.preventDefault();
              const name = (f.summary && f.summary(item)) || 'cet élément';
              if (!confirm('Supprimer « ' + name + ' » ?')) return;
              list.splice(i, 1);
              const rest = [...openSet].filter(k => k !== i).map(k => (k > i ? k - 1 : k));
              openSet.clear(); rest.forEach(k => openSet.add(k));
              draw(); changed();
            } }, '✕')));
      card._summary = () => { title.textContent = (f.summary && f.summary(item)) || 'Sans titre'; };
      card._summary();
      const body = el('div', { class: 'item-body' });
      for (const sub of f.fields) body.append(renderField(sub.type === 'list' ? { ...sub, nested: true } : sub, item));
      card.append(summary, body);
      itemsBox.append(card);
    });
  }
  draw();
  return box;
}

// Met à jour le titre replié d'un élément quand on tape dedans
function refreshSummaries(node) {
  let n = node;
  while (n) {
    if (n.tagName === 'DETAILS' && n._summary) n._summary();
    n = n.parentElement;
  }
}

// ---- Images -----------------------------------------------------------
function imageUrl(path) {
  if (!path) return '';
  if (state.staged[path]) return state.staged[path].url;
  if (/^(https?:|data:)/.test(path)) return path;
  return '/' + path.replace(/^\/+/, '');
}

function pickFiles(multiple) {
  return new Promise(resolve => {
    const picker = $('filePicker');
    picker.multiple = !!multiple;
    picker.value = '';
    picker.onchange = () => resolve([...picker.files]);
    picker.click();
  });
}

function renderImage(f, obj, id) {
  if (obj[f.name] == null) obj[f.name] = '';
  const wrap = el('div', { class: 'imgfield' });
  function draw() {
    wrap.innerHTML = '';
    const path = obj[f.name];
    if (path) {
      wrap.append(el('img', { class: 'img-preview', src: imageUrl(path), alt: '' }));
    } else {
      wrap.append(el('div', { class: 'img-empty' }, 'Aucune image'));
    }
    const choose = el('button', { type: 'button', class: 'btn btn-small', 'aria-label': (path ? 'Changer : ' : 'Choisir : ') + f.label.toLowerCase() }, path ? 'Changer l’image' : 'Choisir une image');
    choose.addEventListener('click', async () => {
      const [file] = await pickFiles(false);
      if (!file) return;
      choose.disabled = true; choose.textContent = 'Préparation…';
      try {
        obj[f.name] = await stageImage(file, f.maxSide || 2000);
        changed(); refreshSummaries(wrap);
      } catch (err) { alert(err.message); }
      draw();
      wrap.closest('details')?._summary?.();
    });
    const actions = el('div', { class: 'img-actions' }, choose);
    if (path) actions.append(el('button', { type: 'button', class: 'btn btn-small btn-quiet',
      onclick: () => { obj[f.name] = ''; changed(); draw(); } }, 'Retirer'));
    wrap.append(actions);
  }
  draw();
  return fieldWrap(f, wrap, null);
}

function renderGallery(f, obj) {
  if (!Array.isArray(obj[f.name])) obj[f.name] = [];
  const photos = obj[f.name];
  const box = el('div', { class: 'field' });
  const grid = el('div', { class: 'gallery' });
  const addBtn = el('button', { type: 'button', class: 'btn btn-add' }, 'Ajouter des photos');
  const progress = el('p', { class: 'field-hint', 'aria-live': 'polite' });
  addBtn.addEventListener('click', async () => {
    const files = await pickFiles(true);
    if (!files.length) return;
    addBtn.disabled = true;
    const errors = [];
    for (let i = 0; i < files.length; i++) {
      progress.textContent = `Préparation des photos ${i + 1} sur ${files.length}…`;
      try { photos.push({ image: await stageImage(files[i], 2000), legende: '' }); }
      catch (err) { errors.push(files[i].name + ' : ' + err.message); }
    }
    progress.textContent = errors.length ? 'Certaines photos n’ont pas pu être ajoutées. ' + errors.join(' ') : '';
    addBtn.disabled = false;
    draw(); changed();
    box.closest('details')?._summary?.();
  });

  function draw() {
    grid.innerHTML = '';
    if (!photos.length) grid.append(el('p', { class: 'empty' }, 'Aucune photo dans cet album.'));
    photos.forEach((ph, i) => {
      const legend = el('input', { placeholder: 'Légende (facultatif)', 'aria-label': 'Légende de la photo ' + (i + 1) });
      legend.value = ph.legende || '';
      legend.addEventListener('input', () => { ph.legende = legend.value; changed(); });
      grid.append(el('figure', { class: 'gallery-card' },
        el('img', { src: imageUrl(ph.image), alt: '' }),
        legend,
        el('div', { class: 'gallery-tools' },
          el('button', { type: 'button', class: 'icon-btn', title: 'Déplacer avant', 'aria-label': 'Déplacer avant', disabled: i === 0,
            onclick: () => { [photos[i - 1], photos[i]] = [photos[i], photos[i - 1]]; draw(); changed(); } }, '←'),
          el('button', { type: 'button', class: 'icon-btn', title: 'Déplacer après', 'aria-label': 'Déplacer après', disabled: i === photos.length - 1,
            onclick: () => { [photos[i + 1], photos[i]] = [photos[i], photos[i + 1]]; draw(); changed(); } }, '→'),
          el('button', { type: 'button', class: 'icon-btn danger', title: 'Retirer la photo', 'aria-label': 'Retirer la photo',
            onclick: () => { photos.splice(i, 1); draw(); changed(); box.closest('details')?._summary?.(); } }, '✕'))));
    });
  }
  draw();
  box.append(el('div', { class: 'group-head' }, el('span', { class: 'field-label' }, f.label), addBtn), progress, grid);
  return box;
}

// Réduit la photo dans le navigateur (plus rapide à envoyer, site plus léger)
async function stageImage(file, maxSide) {
  if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name)) {
    throw new Error('Ce fichier n’est pas une image.');
  }
  if (/svg/.test(file.type)) throw new Error('Les images SVG ne sont pas acceptées : utilisez PNG ou JPEG.');
  let img;
  try { img = await loadImage(file); }
  catch { throw new Error('Format non reconnu par ce navigateur (photo iPhone HEIC ?). Exportez-la en JPEG puis réessayez.'); }

  const w = img.naturalWidth, h = img.naturalHeight;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const keepOriginal = /^image\/(png|gif|webp)$/.test(file.type) && scale === 1 && file.size <= 1.5 * 1024 * 1024;
  const base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'photo';
  const rand = Math.random().toString(36).slice(2, 7);

  let blob, ext;
  if (keepOriginal) {
    blob = file;
    ext = file.type.split('/')[1];
  } else {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d');
    const png = file.type === 'image/png';
    if (!png) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const type = png ? 'image/png' : 'image/jpeg';
    blob = await new Promise(r => canvas.toBlob(r, type, 0.82));
    ext = png ? 'png' : 'jpg';
  }
  if (blob.size > 4 * 1024 * 1024) throw new Error('Image trop lourde, même après réduction (4 Mo maximum).');
  const base64 = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
  const path = `/assets/images/uploads/${new Date().toISOString().slice(0, 10)}-${base.slice(0, 40)}-${rand}.${ext === 'jpeg' ? 'jpg' : ext}`;
  state.staged[path] = { base64, url: URL.createObjectURL(blob) };
  return path;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function slugify(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------
// Publication
// ---------------------------------------------------------------------
function collectStaged(value, out) {
  if (typeof value === 'string') { if (state.staged[value]) out.add(value); }
  else if (Array.isArray(value)) value.forEach(v => collectStaged(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach(v => collectStaged(v, out));
  return out;
}

$('publishBtn').addEventListener('click', async () => {
  const files = dirtyFiles();
  if (!files.length || state.busy) return;
  state.busy = true;
  const btn = $('publishBtn');
  btn.disabled = true; $('discardBtn').disabled = true;
  hideNotice();
  try {
    const payload = {};
    const base = {};
    for (const n of files) { payload[n] = state.data[n]; base[n] = state.shas[n]; }
    const paths = [...collectStaged(payload, new Set())];
    const images = [];
    for (let i = 0; i < paths.length; i++) {
      const p = paths[i];
      if (!state.staged[p].sha) {
        $('publishStatus').textContent = `Envoi des photos : ${i + 1} sur ${paths.length}…`;
        const { sha } = await withSession(() => api('blob', { data: state.staged[p].base64 }));
        state.staged[p].sha = sha;
      }
      images.push({ path: p.replace(/^\/+/, ''), sha: state.staged[p].sha });
    }
    $('publishStatus').textContent = 'Publication…';
    const res = await withSession(() => api('publish', { files: payload, images, base }));
    applyFiles(res.files);            // repart de la version publiée
    changed(); renderTabs(); renderEditor();
    notice('success', res.immediat ? 'Publié. C’est déjà en ligne sur le site.' : 'Publié. Le site sera à jour d’ici une à deux minutes.');
  } catch (err) {
    changed();
    notice('error', 'La publication a échoué : ' + err.message);
  } finally {
    state.busy = false;
    btn.disabled = false; $('discardBtn').disabled = false;
  }
});

$('discardBtn').addEventListener('click', () => {
  if (!confirm('Annuler tous les changements non publiés ?')) return;
  for (const n of Object.keys(state.data)) state.data[n] = JSON.parse(state.original[n]);
  changed(); renderTabs(); renderEditor();
  notice('info', 'Changements annulés.');
});

let noticeTimer;
function notice(kind, text) {
  const n = $('notice');
  n.hidden = false;
  n.className = 'notice notice-' + kind;
  n.textContent = text;
  n.scrollIntoView({ block: 'nearest' });
  clearTimeout(noticeTimer);
  if (kind !== 'error') noticeTimer = setTimeout(hideNotice, 8000);
}
function hideNotice() { $('notice').hidden = true; }

})();
