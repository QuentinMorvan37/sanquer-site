// ---- Menu burger (mobile) ----
const navMenu = document.getElementById('navLinks');
const burger = document.getElementById('burgerBtn');

if (burger && navMenu) {
  burger.addEventListener('click', () => {
    const open = navMenu.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  navMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => navMenu.classList.remove('open'));
  });
}

// ---- Apparition au défilement ----
// (réutilisable pour le contenu chargé depuis data/*.json)
let revealObserver = null;
if ('IntersectionObserver' in window) {
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); revealObserver.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px' });
}
function observeReveals(scope){
  (scope || document).querySelectorAll('.reveal:not(.in)').forEach(el => {
    if (revealObserver) revealObserver.observe(el); else el.classList.add('in');
  });
}
observeReveals();

// ---- Onglets catégories (page Championnat) ----
function activateCategory(catId){
  const tab = document.querySelector('.cat-tab[data-cat="' + catId + '"]');
  const panel = document.querySelector('.cat-panel[data-cat="' + catId + '"]');
  if (!tab || !panel) return;
  document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.cat-panel').forEach(p => p.classList.remove('active'));
  tab.classList.add('active');
  panel.classList.add('active');
}

document.querySelectorAll('.cat-tab').forEach(tab => {
  tab.addEventListener('click', () => activateCategory(tab.dataset.cat));
});

// Ouvre le bon onglet si l'URL contient une ancre (championnat.html#seniors)
if (location.hash) {
  activateCategory(location.hash.replace('#', ''));
}
window.addEventListener('hashchange', () => {
  activateCategory(location.hash.replace('#', ''));
});

// ---- Diaporama "Ça se passe au club" ----
function initSlider(){
  const track = document.getElementById('sliderTrack');
  if (!track) return;
  const slider = track.parentElement;
  const slides = track.querySelectorAll('.slide');
  if (!slides.length) return;
  const dotsWrap = document.getElementById('slideDots');
  const prevBtn = document.getElementById('slidePrev');
  const nextBtn = document.getElementById('slideNext');
  dotsWrap.innerHTML = '';
  let current = 0;
  let autoplay;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', 'Aller à l\u2019actualité ' + (i + 1));
    dot.addEventListener('click', () => { goToSlide(i); restart(); });
    dotsWrap.appendChild(dot);
  });
  const dots = dotsWrap.querySelectorAll('.dot');

  function goToSlide(i){
    current = (i + slides.length) % slides.length;
    track.style.transform = 'translateX(-' + (current * 100) + '%)';
    dots.forEach((d, idx) => d.classList.toggle('active', idx === current));
  }
  function startAutoplay(){
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    autoplay = setInterval(() => goToSlide(current + 1), 5500);
  }
  function stopAutoplay(){ clearInterval(autoplay); }
  function restart(){ stopAutoplay(); startAutoplay(); }

  prevBtn.addEventListener('click', () => { goToSlide(current - 1); restart(); });
  nextBtn.addEventListener('click', () => { goToSlide(current + 1); restart(); });
  slider.addEventListener('mouseenter', stopAutoplay);
  slider.addEventListener('mouseleave', startAutoplay);
  slider.addEventListener('focusin', stopAutoplay);
  slider.addEventListener('focusout', startAutoplay);

  // Navigation clavier
  slider.setAttribute('tabindex', '0');
  slider.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  { goToSlide(current - 1); restart(); }
    if (e.key === 'ArrowRight') { goToSlide(current + 1); restart(); }
  });

  // Balayage tactile
  let startX = null;
  slider.addEventListener('touchstart', e => { startX = e.touches[0].clientX; stopAutoplay(); }, { passive: true });
  slider.addEventListener('touchend', e => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) goToSlide(current + (dx < 0 ? 1 : -1));
    startX = null;
    startAutoplay();
  }, { passive: true });

  startAutoplay();
}

// =====================================================================
//  CONTENU MODIFIABLE DEPUIS L'ADMINISTRATION (/admin/)
//  Chaque zone lit un fichier du dossier data/ :
//    data/accueil.json      → bannière, bandeau, diaporama, panneau d'affichage
//    data/partenaires.json  → logos des partenaires (accueil)
//    data/photos.json       → albums de la page Photos
//    data/presse.json       → articles de la page Presse
//  Si un fichier ne peut pas être lu (ex : page ouverte par double-clic,
//  sans serveur), le contenu écrit dans le HTML reste affiché.
// =====================================================================

const BASE = location.pathname.includes('/pages/') ? '../' : '';

function escapeHTML(str){
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML.replace(/"/g, '&quot;');
}

const EXTERNAL = /^(https?:|mailto:|tel:|data:|\/\/)/i;

// Lien saisi dans l'admin → lien valable depuis la page courante
function resolveLink(u){
  if (!u) return '#';
  if (EXTERNAL.test(u) || u.startsWith('#')) return u;
  return BASE + u.replace(/^\/+/, '');
}
function linkAttrs(u){
  const target = /^https?:/i.test(u || '') ? ' target="_blank" rel="noopener"' : '';
  return `href="${escapeHTML(resolveLink(u))}"${target}`;
}

// Chemin d'image saisi dans l'admin (/assets/images/...) → chemin depuis la page
function resolveAsset(p){
  if (!p) return '';
  if (EXTERNAL.test(p)) return p;
  return BASE + p.replace(/^\/+/, '');
}

// Sur Netlify (adresse en .netlify.app), les photos sont redimensionnées et
// compressées à la volée (Netlify Image CDN). Chez un autre hébergeur, ou en
// cas d'échec, l'image d'origine est utilisée.
const CAN_RESIZE = /\.netlify\.app$/.test(location.hostname);

function imgHTML(p, alt, width, attrs){
  const original = resolveAsset(p);
  const src = (width && CAN_RESIZE && !EXTERNAL.test(p))
    ? '/.netlify/images?url=' + encodeURIComponent('/' + p.replace(/^\/+/, '')) + '&w=' + width
    : original;
  return `<img src="${escapeHTML(src)}" data-original="${escapeHTML(original)}" alt="${escapeHTML(alt)}"` +
    ` loading="lazy" decoding="async" onerror="this.onerror=null;this.src=this.dataset.original" ${attrs || ''}>`;
}

function fetchData(name){
  return fetch(BASE + 'data/' + name + '.json', { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
}

const hasItems = a => Array.isArray(a) && a.length > 0;

// ---- Accueil ----------------------------------------------------------
function renderAccueil(data){
  // Grande bannière « À la une »
  const banner = document.getElementById('promoBanner');
  const b = data.banniere;
  if (banner && b) {
    if (b.actif === false) {
      banner.hidden = true;
    } else if (b.image) {
      const img = imgHTML(b.image, b.alt || '', 2100);
      banner.innerHTML = b.lien
        ? `<a class="promo-img" ${linkAttrs(b.lien)}>${img}</a>`
        : `<div class="promo-img">${img}</div>`;
    }
  }

  // Bandeau défilant
  const ticker = document.getElementById('tickerInner');
  if (ticker && hasItems(data.ticker)) {
    ticker.innerHTML = data.ticker.map(item => `
      <a class="ticker-item" ${linkAttrs(item.lien)}>
        <span class="ticker-date mono">${escapeHTML(item.date)}</span>
        <span class="ticker-title">${escapeHTML(item.titre)}</span>
      </a>`).join('');
  }

  // Diaporama « Ça se passe au club »
  const track = document.getElementById('sliderTrack');
  if (track && hasItems(data.actualites)) {
    track.innerHTML = data.actualites.map(item => `
      <div class="slide">
        <div class="ph">${item.image
          ? imgHTML(item.image, item.titre, 1600, 'class="slide-img"')
          : `<span>Photo à insérer — ${escapeHTML(item.titre)}</span>`}</div>
        <div class="slide-caption">
          <span class="tag">${escapeHTML(item.tag)}</span>
          <h3>${escapeHTML(item.titre)}</h3>
          <p>${escapeHTML(item.texte)}</p>
          ${item.lien ? `<a class="slide-more" ${linkAttrs(item.lien)}>En savoir plus &rarr;</a>` : ''}
        </div>
      </div>`).join('');
  }

  // Panneau d'affichage « À ne pas manquer »
  const panneau = document.getElementById('panneau');
  if (panneau && hasItems(data.panneau)) {
    panneau.innerHTML = data.panneau.map(item => `
      <div class="avis reveal">
        <span class="avis-stamp">${escapeHTML(item.etiquette)}</span>
        <h3>${escapeHTML(item.titre)}</h3>
        <p>${escapeHTML(item.texte)}</p>
        ${hasItems(item.boutons) ? `<div class="avis-links">${item.boutons.map(btn =>
          `<a class="btn ${btn.style === 'rouge' ? 'btn-rouge' : 'btn-ghost'}" ${linkAttrs(btn.lien)}>${escapeHTML(btn.texte)}</a>`
        ).join('')}</div>` : ''}
      </div>`).join('');
    observeReveals(panneau);
  }
}

function renderPartenaires(data){
  const grid = document.getElementById('partnerGrid');
  if (!grid || !hasItems(data.partenaires)) return;
  grid.innerHTML = data.partenaires.map(p => {
    const inner = p.logo ? imgHTML(p.logo, p.nom, 300) : escapeHTML(p.nom);
    return p.lien
      ? `<a class="partner-logo" ${linkAttrs(p.lien)} title="${escapeHTML(p.nom)}">${inner}</a>`
      : `<div class="partner-logo" title="${escapeHTML(p.nom)}">${inner}</div>`;
  }).join('');
}

// ---- Page Photos ------------------------------------------------------
let lightboxItems = [];

function renderGalerie(data){
  const galerie = document.getElementById('galerie');
  if (!galerie || !Array.isArray(data.albums)) return;
  const albums = data.albums
    .map(a => ({ ...a, photos: (a.photos || []).filter(ph => ph && ph.image) }))
    .filter(a => a.photos.length);
  if (!albums.length) return;

  lightboxItems = [];
  galerie.innerHTML = albums.map(album => `
    <div class="album reveal">
      <div class="album-head">
        <h3>${escapeHTML(album.titre)}</h3>
        ${album.date ? `<span class="album-date">${escapeHTML(album.date)}</span>` : ''}
      </div>
      ${album.description ? `<p class="album-desc">${escapeHTML(album.description)}</p>` : ''}
      <div class="gallery-grid">
        ${album.photos.map(ph => {
          const i = lightboxItems.push({ image: ph.image, legende: ph.legende || '', album: album.titre }) - 1;
          const alt = ph.legende || album.titre;
          return `<button type="button" class="gallery-item" data-index="${i}" aria-label="Agrandir : ${escapeHTML(alt)}">${imgHTML(ph.image, alt, 700)}</button>`;
        }).join('')}
      </div>
    </div>`).join('');
  observeReveals(galerie);
  galerie.querySelectorAll('.gallery-item').forEach(btn =>
    btn.addEventListener('click', () => openLightbox(+btn.dataset.index, btn)));
}

let lb = null, lbIndex = 0, lbReturnFocus = null;

function buildLightbox(){
  lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.hidden = true;
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Photo agrandie');
  lb.innerHTML = `
    <button type="button" class="lb-btn lb-close" aria-label="Fermer">&times;</button>
    <button type="button" class="lb-btn lb-prev" aria-label="Photo précédente">&#8249;</button>
    <figure><img alt=""><figcaption></figcaption></figure>
    <button type="button" class="lb-btn lb-next" aria-label="Photo suivante">&#8250;</button>`;
  document.body.appendChild(lb);
  lb.querySelector('.lb-close').addEventListener('click', closeLightbox);
  lb.querySelector('.lb-prev').addEventListener('click', () => showLightbox(lbIndex - 1));
  lb.querySelector('.lb-next').addEventListener('click', () => showLightbox(lbIndex + 1));
  lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showLightbox(lbIndex - 1);
    if (e.key === 'ArrowRight') showLightbox(lbIndex + 1);
  });
  let startX = null;
  lb.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) showLightbox(lbIndex + (dx < 0 ? 1 : -1));
    startX = null;
  }, { passive: true });
}

function showLightbox(i){
  const n = lightboxItems.length;
  lbIndex = (i + n) % n;
  const item = lightboxItems[lbIndex];
  const fig = lb.querySelector('figure');
  fig.innerHTML = imgHTML(item.image, item.legende || item.album, 1800).replace(' loading="lazy"', '') +
    `<figcaption>${escapeHTML(item.legende)}<span class="mono">${escapeHTML(item.album)} &middot; ${lbIndex + 1}/${n}</span></figcaption>`;
  lb.querySelector('.lb-prev').hidden = lb.querySelector('.lb-next').hidden = n < 2;
}

function openLightbox(i, trigger){
  if (!lb) buildLightbox();
  lbReturnFocus = trigger;
  showLightbox(i);
  lb.hidden = false;
  document.body.classList.add('lb-open');
  lb.querySelector('.lb-close').focus();
}

function closeLightbox(){
  lb.hidden = true;
  document.body.classList.remove('lb-open');
  if (lbReturnFocus) lbReturnFocus.focus();
}

// ---- Page Presse ------------------------------------------------------
function renderPresse(data){
  const grid = document.getElementById('presseGrid');
  if (!grid || !hasItems(data.articles)) return;
  grid.innerHTML = data.articles.map(a => {
    const tag = [a.source, a.date].filter(Boolean).map(escapeHTML).join(' &middot; ');
    const body = `
      ${a.image ? `<div class="card-media">${imgHTML(a.image, a.titre, 800)}</div>` : ''}
      <span class="tag mono">${tag}</span>
      <h3>${escapeHTML(a.titre)}</h3>
      <p>${escapeHTML(a.resume)}${a.lien ? ' Lire l&rsquo;article &rarr;' : ''}</p>`;
    return a.lien
      ? `<a class="card reveal" ${linkAttrs(a.lien)}>${body}</a>`
      : `<article class="card reveal">${body}</article>`;
  }).join('');
  observeReveals(grid);
}

// ---- Page Convocations ------------------------------------------------
const SALLE_DOMICILE = 'Salle Georges-Vigier, Brest';

function parseDay(d){ const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? new Date(+m[1], m[2] - 1, +m[3]) : null; }
const fmtDay = d => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtHour = h => (h || '').replace(':', 'h');
const teamKey = t => (t || '').trim().toLowerCase();

function renderConvocations(data){
  const box = document.getElementById('convocationsListe');
  if (!box) return;
  const matchs = (data.matchs || []).filter(m => m && (m.equipe || m.adversaire))
    .map(m => ({ ...m, _day: parseDay(m.date) }))
    .sort((a, b) => ((a._day || 0) - (b._day || 0)) || (a.heure_match || '').localeCompare(b.heure_match || ''));

  if (!matchs.length && !data.message && !data.affiche) return; // on garde le message « bientôt en ligne »

  const days = matchs.map(m => m._day).filter(Boolean);
  const first = days.length ? new Date(Math.min(...days)) : null;
  const last = days.length ? new Date(Math.max(...days)) : null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const passe = last && last < today;

  let periode = '';
  if (first && last) {
    periode = first.getTime() === last.getTime()
      ? fmtDay(first)
      : `du ${fmtDay(first)} au ${fmtDay(last)}`;
  }

  const equipes = [];
  matchs.forEach(m => { if (m.equipe && !equipes.some(e => teamKey(e) === teamKey(m.equipe))) equipes.push(m.equipe.trim()); });

  const card = m => {
    const dom = m.lieu !== 'exterieur';
    const salle = (m.salle || '').trim() || (dom ? SALLE_DOMICILE : '');
    const adresse = [salle, (m.adresse || '').trim()].filter(Boolean).join(', ');
    const carte = adresse ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}` : '';
    return `
      <article class="convoc-card" data-equipe="${escapeHTML(teamKey(m.equipe))}">
        <div class="convoc-time">
          <span class="convoc-label">Match</span>
          <b>${escapeHTML(fmtHour(m.heure_match) || '—')}</b>
          ${m.heure_rdv ? `<span class="convoc-rdv">RDV ${escapeHTML(fmtHour(m.heure_rdv))}</span>` : ''}
        </div>
        <div class="convoc-main">
          <div class="convoc-top">
            <h4>${escapeHTML(m.equipe || 'Équipe')}</h4>
            <span class="convoc-lieu ${dom ? 'dom' : 'ext'}">${dom ? 'Domicile' : 'Extérieur'}</span>
          </div>
          ${m.adversaire ? `<p class="convoc-vs">${dom ? 'reçoit' : 'se déplace à'} <strong>${escapeHTML(m.adversaire)}</strong></p>` : ''}
          ${salle ? `<p class="convoc-salle">${escapeHTML(adresse)}${carte ? ` · <a href="${carte}" target="_blank" rel="noopener">Itinéraire</a>` : ''}</p>` : ''}
          ${m.remarque ? `<p class="convoc-note">${escapeHTML(m.remarque)}</p>` : ''}
          ${m.joueurs ? `<p class="convoc-joueurs"><span>Convoqués :</span> ${escapeHTML(m.joueurs)}</p>` : ''}
        </div>
      </article>`;
  };

  const groups = [];
  matchs.forEach(m => {
    const key = m._day ? m._day.toDateString() : 'sans-date';
    let g = groups.find(x => x.key === key);
    if (!g) groups.push(g = { key, day: m._day, items: [] });
    g.items.push(m);
  });

  box.innerHTML = `
    ${periode ? `<p class="convoc-periode">Week-end ${escapeHTML(periode.startsWith('du') ? periode : 'du ' + periode)}</p>` : ''}
    ${passe ? `<p class="convoc-alerte">Ces convocations concernent le week-end passé. Celles du prochain week-end seront publiées en fin de semaine.</p>` : ''}
    ${data.message ? `<div class="convoc-message">${escapeHTML(data.message).replace(/\n/g, '<br>')}</div>` : ''}
    ${equipes.length > 1 ? `<div class="convoc-filtres" role="group" aria-label="Filtrer par équipe">
        <button type="button" class="convoc-chip" data-equipe="" aria-pressed="true">Toutes les équipes</button>
        ${equipes.map(e => `<button type="button" class="convoc-chip" data-equipe="${escapeHTML(teamKey(e))}" aria-pressed="false">${escapeHTML(e)}</button>`).join('')}
      </div>` : ''}
    ${groups.map(g => `
      <div class="convoc-day">
        <h3>${g.day ? escapeHTML(fmtDay(g.day)) : 'Date à préciser'}</h3>
        <div class="convoc-list">${g.items.map(card).join('')}</div>
      </div>`).join('')}
    ${data.affiche ? `<figure class="convoc-affiche"><a href="${escapeHTML(resolveAsset(data.affiche))}" target="_blank" rel="noopener">${imgHTML(data.affiche, 'Affiche des convocations', 1600)}</a><figcaption>Affiche des convocations (cliquez pour agrandir)</figcaption></figure>` : ''}
  `;

  // Filtre par équipe (mémorisé dans l'adresse : on peut partager le lien de son équipe)
  const chips = box.querySelectorAll('.convoc-chip');
  const apply = key => {
    chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.equipe === key)));
    box.querySelectorAll('.convoc-card').forEach(c => { c.hidden = !!key && c.dataset.equipe !== key; });
    box.querySelectorAll('.convoc-day').forEach(d => { d.hidden = !d.querySelector('.convoc-card:not([hidden])'); });
  };
  chips.forEach(c => c.addEventListener('click', () => {
    apply(c.dataset.equipe);
    history.replaceState(null, '', c.dataset.equipe ? '#equipe=' + encodeURIComponent(c.dataset.equipe) : location.pathname);
  }));
  const fromHash = decodeURIComponent((location.hash.match(/equipe=([^&]+)/) || [])[1] || '');
  if (fromHash && [...chips].some(c => c.dataset.equipe === fromHash)) apply(fromHash);
}

// ---- Chargement -------------------------------------------------------
function loadContenuDynamique(){
  const tasks = [];
  const onError = name => err => console.warn('Contenu data/' + name + '.json non chargé :', err.message);

  if (document.getElementById('sliderTrack') || document.getElementById('tickerInner')) {
    tasks.push(fetchData('accueil').then(renderAccueil).catch(onError('accueil'))
      .finally(initSlider));
  }
  if (document.getElementById('partnerGrid')) {
    tasks.push(fetchData('partenaires').then(renderPartenaires).catch(onError('partenaires')));
  }
  if (document.getElementById('galerie')) {
    tasks.push(fetchData('photos').then(renderGalerie).catch(onError('photos')));
  }
  if (document.getElementById('convocationsListe')) {
    tasks.push(fetchData('convocations').then(renderConvocations).catch(onError('convocations')));
  }
  if (document.getElementById('presseGrid')) {
    tasks.push(fetchData('presse').then(renderPresse).catch(onError('presse')));
  }
  return Promise.all(tasks);
}

loadContenuDynamique();

// ---- Année automatique dans le pied de page ----
const yearSpan = document.getElementById('footYear');
if (yearSpan) yearSpan.textContent = new Date().getFullYear();
