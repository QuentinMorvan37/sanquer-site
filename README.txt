Arborescence du site — PL Sanquer Brest Basketball
====================================================

/index.html                 → Accueil (ticker, diaporama, panneau d'affichage,
                               résultats, navigation rapide, partenaires)
/pages/club.html            → Le Club (histoire réelle 1946-2026, valeurs, bureau)
/pages/equipes.html         → Nos Équipes (structure réelle 2025-26 : Séniors A-D,
                               U18/U15/U13/U11/U9, Filles, Baby, Loisir)
/pages/championnat.html     → Championnat (onglets ancrés : #seniors #filles #u18
                               #u15 #u13 #ecole — classements d'exemple à connecter)
/pages/formation.html       → Formation (école de basket + summer camps HelloAsso)
/pages/infos.html           → Infos pratiques (NOUVEAU) : #inscription #categories
                               #planning #salles #bibus #convocations
/pages/boutique.html        → Boutique (accessible via la barre du haut + footer)
/pages/partenariat.html     → Partenariat + dons HelloAsso
/pages/presse.html          → Presse (2 vrais articles liés à sanquerbasket.fr)
/pages/photos.html          → Photos
/pages/contact.html         → Contact

/assets/css/styles.css      → Feuille de style (partagée)
/assets/js/script.js        → Menu, diaporama (swipe + clavier), onglets, reveal,
                               affichage du contenu de data/*.json, visionneuse photos
/assets/images/             → À REMPLIR : logo.jpg + logos partenaires
                               (mêmes noms de fichiers que dans votre version).

Liens réels déjà branchés :
- Inscription en ligne :   https://inscription.plmsanquer.org/
- Dossiers PDF enfant/adulte + tarifs 2026-2027 (site actuel du club)
- Dons + summer camps :    HelloAsso (patronage-laique-sanquer)
- Articles de presse :     sanquerbasket.fr

À compléter (repérables via "à compléter" / "à définir" dans les pages) :
- Coachs, plannings d'entraînement, adresse exacte des salles, lignes Bibus,
  e-mail officiel, liens Facebook/Instagram, visuel convocations hebdo.
- Catégories d'âge 2026-2027 : à re-vérifier sur ffbb.com chaque saison.

Identité visuelle :
- Display "Big Shoulders Stencil" (fallback Anton), corps IBM Plex Sans,
  données IBM Plex Mono. Rayon 2px, cartes à coins coupés (haut-gauche /
  bas-droite), tampons rouges (eyebrows), couture diagonale rouge/bleu.

Espace bénévoles (administration) :
- /admin/                   → page d'administration (identifiant + mot de passe)
- /netlify/functions/admin.mjs → serveur de l'admin sur Netlify (publie sur GitHub)
- /admin/api.php            → serveur de l'admin chez un hébergeur PHP (écrit sur place)
- /admin/config.exemple.php → modèle des identifiants pour l'hébergeur (config.php)
- /data/accueil.json        → bannière, bandeau, diaporama, « À ne pas manquer »
- /data/photos.json         → albums de la page Photos
- /data/presse.json         → articles de la page Presse
- /data/partenaires.json    → logos des partenaires (accueil)
- /assets/images/uploads/   → photos envoyées depuis l'admin
Mode d'emploi complet : GUIDE-ESPACE-BENEVOLES.md

Pour visualiser : lancez un petit serveur à la racine du dépôt
(python3 -m http.server 8080) puis ouvrez http://localhost:8080/.
Un double-clic sur index.html affiche le site, mais sans les contenus
gérés depuis l'admin.
