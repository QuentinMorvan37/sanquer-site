# Espace bénévoles — PL Sanquer Brest Basketball

L'espace bénévoles permet de modifier le site sans toucher au code :
convocations du week-end, page d'accueil, albums photos, presse et partenaires.

- Adresse : **`https://votre-site/admin/`** (lien « Espace bénévoles » en bas de chaque page)
- Connexion : **un identifiant et un mot de passe**, sans compte Netlify ni GitHub.
- Le site fonctionne **sur Netlify** (aperçu actuel) **et chez n'importe quel
  hébergeur avec PHP** (OVH, o2switch, Hostinger, Ionos…) : l'admin détecte
  tout seul où il se trouve. Voir la partie 6 pour le déménagement.

> ⚠️ Ce guide est public (il est sur GitHub) : n'y écrivez jamais le mot de passe.

---

## 1. Comment ça marche

```
Bénévole ─► /admin/ ─► « Publier » ─► fonction /api/admin ─► GitHub ─► Netlify redéploie (~1 min)
            (identifiant + mot de passe vérifiés par la fonction)
```

- L'identifiant et le mot de passe sont stockés **dans les réglages Netlify**,
  jamais dans le code (le dépôt GitHub est public).
- Le contenu est rangé dans `data/*.json` (dont `data/convocations.json`), les photos dans `assets/images/uploads/`.
- Les photos sont réduites automatiquement dans le navigateur (2000 px
  maximum) avant l'envoi.
- Chaque clic sur « Publier » crée **un seul** enregistrement GitHub, donc
  un seul déploiement Netlify, quel que soit le nombre de changements.
  Tout l'historique reste sur GitHub.

---

## 2. Mise en place (une seule fois)

### a) Envoyer les fichiers sur GitHub
Tout le contenu de ce dossier va **à la racine** du dépôt : `index.html`,
`netlify.toml`, `admin/`, `assets/`, `data/`, `pages/` **et `netlify/`**
(qui contient la fonction de connexion). Sans le dossier `netlify/`, la
connexion ne fonctionnera pas.

### b) Créer un jeton GitHub (permet à la fonction d'écrire dans le dépôt)
1. Sur GitHub : photo de profil → **Settings** → **Developer settings** →
   **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Nom : `Espace bénévoles Sanquer`. Expiration : 1 an (notez la date :
   il faudra le renouveler).
3. **Repository access** → *Only select repositories* → choisissez le dépôt du site.
4. **Permissions** → *Repository permissions* → **Contents : Read and write**.
5. **Generate token**, puis copiez le jeton (il ne sera plus affiché).

### c) Renseigner les réglages dans Netlify
*Project configuration → Environment variables → Add a variable*, une par ligne :

| Nom | Valeur |
|---|---|
| `ADMIN_USERNAME` | l'identifiant des bénévoles (ex : `benevoles`) |
| `ADMIN_PASSWORD` | un mot de passe long (12 caractères ou plus) |
| `GITHUB_TOKEN` | le jeton copié à l'étape b |
| `GITHUB_REPO` | `compte/dépôt`, ex : `QuentinMorvan37/SanquerSite` |
| `GITHUB_BRANCH` | seulement si la branche ne s'appelle pas `main` |

Cochez **« Contains secret values »** pour le mot de passe et le jeton.

### d) Redéployer
*Deploys → Trigger deploy → Deploy project*. Les réglages ne sont pris en
compte qu'après un nouveau déploiement.

### e) Tester
Allez sur `/admin/` et connectez-vous. Netlify Identity et Git Gateway ne
servent plus : vous pouvez les désactiver.

**Changer le mot de passe :** modifiez `ADMIN_PASSWORD` dans Netlify puis
redéployez. Toutes les sessions en cours sont alors déconnectées.

---

## 3. Utilisation (pour les bénévoles)

1. Allez sur `/admin/`, entrez l'identifiant et le mot de passe.
2. Choisissez un onglet : **Accueil**, **Photos**, **Presse** ou **Partenaires**.
3. Faites vos changements. Une barre bleue apparaît en bas : rien n'est
   en ligne tant que vous n'avez pas cliqué sur **Publier**.
4. Cliquez sur **Publier**. Le site est à jour d'ici une à deux minutes.

### Publier les convocations du week-end (chaque semaine)
1. Onglet **Convocations** (il s'ouvre en premier).
2. Cliquez sur **Nouveau week-end (effacer tous les matchs)** pour vider
   les matchs de la semaine passée. Rien ne change sur le site avant « Publier ».
3. **Ajouter un match** : équipe, date, heure du match, heure de
   rendez-vous, domicile ou extérieur, adversaire. À l'extérieur, indiquez
   la salle et son adresse : le site affiche un lien « Itinéraire ».
4. Pour une autre équipe qui joue le même jour, cliquez sur **⧉ Dupliquer**
   puis changez juste ce qui diffère.
5. **Publier**. La page `pages/convocations.html` classe les matchs par jour
   et par heure, et les parents peuvent filtrer sur leur équipe (le lien
   filtré peut être partagé, par exemple sur le groupe WhatsApp de l'équipe).

Joueurs convoqués : le site est public, mettez seulement les prénoms
pour les mineurs. Si les dates sont passées, le site l'indique tout seul
aux visiteurs.

**Ajouter un album :** onglet Photos → *Ajouter un album* → titre et date →
*Ajouter des photos* (vous pouvez en sélectionner plusieurs d'un coup) →
légendes si vous voulez → **Publier**.

**Changer l'ordre :** flèches ↑ ↓ (ou ← → pour les photos d'un album).
Supprimer : ✕.

**Écrire un lien :** une page du site (`pages/infos.html#inscription`) ou
une adresse complète commençant par `https://`.

**Photos :** préférez le format paysage pour l'accueil. Vérifiez le droit
à l'image, surtout pour les mineurs (autorisations parentales).

---

## 4. Budget Netlify

Sur l'offre gratuite, chaque déploiement en production coûte 15 crédits
sur 300 par mois, soit environ **20 publications par mois** (moins si le
site a beaucoup de visites). Si le quota est épuisé, le site est mis en
pause jusqu'au mois suivant.

→ **Regroupez vos changements** et publiez une fois pour plusieurs
modifications. Le suivi se fait dans Netlify → *Usage & billing*.

---

## 5. Dépannage

| Message | Solution |
|---|---|
| « Identifiant ou mot de passe incorrect » | Vérifiez `ADMIN_USERNAME` / `ADMIN_PASSWORD` dans Netlify (la majuscule compte pour le mot de passe). |
| « …ne sont pas encore configurés dans Netlify » | Ajoutez les variables (étape 2c) puis redéployez. |
| « Le service d'administration est introuvable » | Le dossier `netlify/functions/` manque sur GitHub, ou le site n'a pas été redéployé. |
| « Le jeton GitHub est invalide ou expiré » | Créez un nouveau jeton (étape 2b) et remplacez `GITHUB_TOKEN`. |
| « …n'a pas le droit d'écrire » | Le jeton doit avoir *Contents : Read and write* sur le bon dépôt. |
| « Dépôt ou fichier introuvable » | Vérifiez `GITHUB_REPO` (ex : `QuentinMorvan37/SanquerSite`) et `GITHUB_BRANCH`. |
| « Quelqu'un d'autre a publié entre-temps » | Rechargez la page et refaites vos changements. |
| Photo iPhone refusée | Exportez-la en JPEG, ou envoyez-la depuis le téléphone directement. |
| Erreur publiée par mégarde | Corrigez et republiez, ou dans Netlify → *Deploys* → un ancien déploiement → *Publish deploy*. |

---

## 6. Passer chez un hébergeur classique (sans Netlify)

Chez un hébergeur, l'admin enregistre les changements **directement sur
l'hébergement** : pas de GitHub, pas de déploiement, pas de crédits.
C'est en ligne tout de suite. Le fichier `admin/api.php` s'en charge.

1. **Hébergement** : n'importe quelle offre avec **PHP 7.4 ou plus**
   (c'est le cas de presque toutes les offres « web » / mutualisées).
2. **Envoyez tout le site par FTP** (FileZilla, ou le gestionnaire de
   fichiers de l'hébergeur) dans le dossier public (`www/`, `public_html/`…).
   Les dossiers `netlify/` et le fichier `netlify.toml` ne servent pas
   chez un hébergeur : vous pouvez les laisser ou les supprimer.
3. **Envoyez le fichier `config.php`** (fourni à part, avec vos
   identifiants) dans le dossier `admin/` de l'hébergement.
   **Jamais sur GitHub.** Pour le créer vous-même : copiez
   `admin/config.exemple.php` en `admin/config.php` et remplissez-le.
4. **Droits d'écriture** : les dossiers `data/` et `assets/images/uploads/`
   doivent être modifiables par le site (droits **755**, parfois **775**,
   réglables dans FileZilla : clic droit → *Droits d'accès au fichier*).
5. Allez sur `https://votre-domaine/admin/` et connectez-vous.

**Important après le déménagement :** c'est la copie chez l'hébergeur qui
contient les derniers textes et photos. Quand vous renvoyez une nouvelle
version du site par FTP, **n'écrasez pas** les dossiers `data/` et
`assets/images/uploads/`, sinon les changements des bénévoles seront perdus.
Pensez à télécharger ces deux dossiers de temps en temps (sauvegarde).

**Changer le mot de passe chez l'hébergeur :** dans `admin/config.php`,
mettez le nouveau mot de passe dans `'mot_de_passe'` et videz
`'mot_de_passe_hash'`.

| Problème chez l'hébergeur | Solution |
|---|---|
| « Le fichier admin/config.php est manquant » | Envoyez `config.php` dans `admin/` (étape 3). |
| « Impossible d'écrire … » | Droits d'écriture des dossiers `data/` et `assets/images/uploads/` (étape 4). |
| « Le service d'administration est introuvable » | PHP n'est pas activé sur l'offre, ou `admin/api.php` manque. |
| Session expirée à chaque clic | Rare : l'hébergeur bloque un en-tête. Le fichier `admin/.htaccess` fourni règle normalement ce cas ; sinon contactez le support de l'hébergeur. |
