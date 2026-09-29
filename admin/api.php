<?php
// =====================================================================
//  Espace bénévoles — version pour hébergeur classique (PHP 7.4 ou plus)
//
//  Fait la même chose que netlify/functions/admin.mjs, mais enregistre
//  directement les fichiers sur l'hébergement : pas de Netlify, pas de
//  GitHub, les changements sont en ligne immédiatement.
//
//  Identifiant et mot de passe : fichier admin/config.php
//  (modèle : admin/config.exemple.php).
// =====================================================================
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

const DATA_FILES = ['accueil', 'photos', 'presse', 'partenaires'];
const UPLOAD_PATH = '/^assets\/images\/uploads\/[a-z0-9][a-z0-9-]{0,80}\.(jpg|jpeg|png|webp|gif)$/';
const MAX_IMAGE_BYTES = 4194304;
const MAX_IMAGES_PER_PUBLISH = 60;
const SESSION_HOURS = 12;

$ROOT = dirname(__DIR__);
$STAGING = $ROOT . '/data/.envois';

function out(int $status, array $data): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function fail(int $status, string $message, array $extra = []): void {
    out($status, ['error' => $message] + $extra);
}
function b64url(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function b64url_decode(string $s): string { return (string) base64_decode(strtr($s, '-_', '+/')); }

// ---------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------
$cfgFile = __DIR__ . '/config.php';
if (!is_file($cfgFile)) {
    fail(500, 'Le fichier admin/config.php est manquant sur l’hébergement (voir admin/config.exemple.php).');
}
$cfg = require $cfgFile;
$USER = strtolower(trim((string) ($cfg['identifiant'] ?? '')));
$HASH = (string) ($cfg['mot_de_passe_hash'] ?? '');
$PLAIN = (string) ($cfg['mot_de_passe'] ?? '');
$SECRET = (string) ($cfg['cle_session'] ?? '');
if ($USER === '' || ($HASH === '' && $PLAIN === '')) {
    fail(500, 'L’identifiant ou le mot de passe n’est pas renseigné dans admin/config.php.');
}
if (strlen($SECRET) < 32) $SECRET = hash('sha256', 'sanquer|' . $HASH . $PLAIN . '|' . __FILE__);

// ---------------------------------------------------------------------
// Sessions signées
// ---------------------------------------------------------------------
function sign_token(array $payload, string $secret): string {
    $body = b64url(json_encode($payload));
    return $body . '.' . b64url(hash_hmac('sha256', $body, $secret, true));
}
function verify_token(string $token, string $secret): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 2) return null;
    [$body, $mac] = $parts;
    if (!hash_equals(b64url(hash_hmac('sha256', $body, $secret, true)), $mac)) return null;
    $p = json_decode(b64url_decode($body), true);
    return (is_array($p) && ($p['exp'] ?? 0) > time() * 1000) ? $p : null;
}
function request_token(array $body): string {
    // Certains hébergeurs suppriment l'en-tête Authorization : le jeton est
    // donc aussi envoyé dans le corps de la requête.
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($h === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) if (strtolower($k) === 'authorization') $h = $v;
    }
    $t = trim(preg_replace('/^Bearer\s+/i', '', $h));
    return $t !== '' ? $t : (string) ($body['token'] ?? '');
}

// ---------------------------------------------------------------------
// Fichiers
// ---------------------------------------------------------------------
function read_files(string $root): array {
    $out = [];
    foreach (DATA_FILES as $n) {
        $f = "$root/data/$n.json";
        $raw = is_file($f) ? (string) file_get_contents($f) : '{}';
        $content = json_decode($raw, true);
        if (!is_array($content)) fail(500, "Le fichier data/$n.json est illisible.");
        $out[$n] = ['sha' => sha1($raw), 'content' => (object) $content];
    }
    return $out;
}
function write_atomic(string $file, string $data): void {
    $dir = dirname($file);
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) fail(500, "Impossible de créer le dossier $dir.");
    $tmp = $file . '.tmp-' . bin2hex(random_bytes(4));
    if (@file_put_contents($tmp, $data, LOCK_EX) === false || !@rename($tmp, $file)) {
        @unlink($tmp);
        fail(500, 'Impossible d’écrire ' . basename($file) . ' : vérifiez les droits d’écriture des dossiers data/ et assets/images/uploads/ chez l’hébergeur.');
    }
}
function clean_staging(string $dir): void {
    if (!is_dir($dir)) return;
    foreach ((array) glob("$dir/*.envoi") as $f) if (filemtime($f) < time() - 86400) @unlink($f);
}

// ---------------------------------------------------------------------
// Requête
// ---------------------------------------------------------------------
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail(405, 'Méthode non autorisée.');
$body = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($body)) fail(400, 'Requête invalide.');
$action = (string) ($body['action'] ?? '');

if ($action === 'login') {
    $u = strtolower(trim((string) ($body['username'] ?? '')));
    $p = (string) ($body['password'] ?? '');
    $okUser = hash_equals($USER, $u);
    $okPass = $HASH !== '' ? password_verify($p, $HASH) : hash_equals($PLAIN, $p);
    if (!($okUser && $okPass)) { sleep(1); fail(401, 'Identifiant ou mot de passe incorrect.'); }
    $exp = (time() + SESSION_HOURS * 3600) * 1000;
    out(200, ['token' => sign_token(['u' => $USER, 'exp' => $exp], $SECRET), 'expires' => $exp]);
}

if (!verify_token(request_token($body), $SECRET)) {
    fail(401, 'Session expirée : reconnectez-vous.', ['session' => false]);
}

switch ($action) {
    case 'load':
        out(200, ['files' => read_files($ROOT)]);

    case 'blob':
        $data = (string) ($body['data'] ?? '');
        $bytes = base64_decode($data, true);
        if ($bytes === false || $bytes === '') fail(400, 'Image illisible.');
        if (strlen($bytes) > MAX_IMAGE_BYTES) fail(413, 'Image trop lourde, même après réduction.');
        if (@getimagesizefromstring($bytes) === false) fail(400, 'Ce fichier n’est pas une image valide.');
        $sha = sha1($bytes);
        write_atomic("$STAGING/$sha.envoi", $bytes);
        clean_staging($STAGING);
        out(200, ['sha' => $sha]);

    case 'publish':
        $files = $body['files'] ?? [];
        $images = $body['images'] ?? [];
        $base = $body['base'] ?? [];
        if (!is_array($files) || !is_array($images)) fail(400, 'Rien à publier.');
        if (!$files && !$images) fail(400, 'Rien à publier.');
        foreach ($files as $n => $content) {
            if (!in_array($n, DATA_FILES, true)) fail(400, "Fichier non autorisé : $n");
            if (!is_array($content)) fail(400, "Contenu invalide pour $n");
        }
        if (count($images) > MAX_IMAGES_PER_PUBLISH) fail(400, 'Trop de photos d’un coup (' . MAX_IMAGES_PER_PUBLISH . ' maximum).');
        foreach ($images as $img) {
            $path = (string) ($img['path'] ?? '');
            $sha = (string) ($img['sha'] ?? '');
            if (!preg_match(UPLOAD_PATH, $path) || !preg_match('/^[a-f0-9]{40}$/', $sha)) fail(400, "Photo invalide : $path");
            if (!is_file("$STAGING/$sha.envoi") && !is_file("$ROOT/$path")) fail(400, "Photo introuvable, renvoyez-la : $path");
        }
        $current = read_files($ROOT);
        foreach (array_keys($files) as $n) {
            if (isset($base[$n]) && $base[$n] !== $current[$n]['sha']) {
                fail(409, 'Quelqu’un d’autre a publié une modification entre-temps. Rechargez la page pour récupérer la dernière version, puis refaites vos changements.');
            }
        }
        foreach ($images as $img) {
            $src = "$STAGING/{$img['sha']}.envoi";
            if (is_file($src)) write_atomic("$ROOT/{$img['path']}", (string) file_get_contents($src));
        }
        foreach ($files as $n => $content) {
            write_atomic("$ROOT/data/$n.json",
                json_encode($content, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");
        }
        foreach ($images as $img) @unlink("$STAGING/{$img['sha']}.envoi");
        out(200, ['files' => read_files($ROOT), 'immediat' => true]);

    default:
        fail(400, 'Action inconnue.');
}
