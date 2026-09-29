<?php
// =====================================================================
//  Identifiants de l'espace bénévoles — HÉBERGEUR CLASSIQUE (PHP)
//
//  1. Copiez ce fichier sous le nom config.php (dans le même dossier admin/).
//  2. Remplissez l'identifiant et le mot de passe.
//  3. Envoyez config.php UNIQUEMENT chez l'hébergeur (par FTP),
//     JAMAIS sur GitHub : le dépôt est public.
//
//  (Sur Netlify, ce fichier ne sert pas : les identifiants se règlent
//  dans Project configuration → Environment variables.)
// =====================================================================
return [
    'identifiant'  => 'mon-identifiant',

    // Mot de passe en clair (le plus simple) :
    'mot_de_passe' => 'mon-mot-de-passe',

    // … ou, à la place, son empreinte (plus sûr) : laissez 'mot_de_passe'
    // vide et collez ici le résultat de password_hash('...', PASSWORD_DEFAULT).
    'mot_de_passe_hash' => '',

    // Une longue suite de caractères au hasard (64 conseillés).
    // La changer déconnecte tout le monde.
    'cle_session'  => '',
];
