<?php
/**
 * Veröffentlicht einen Devlog-Beitrag als MineTrax-News (Kategorie "Dev", type 1).
 *
 * Läuft auf dem Webserver, wird von .github/workflows/devlog-publish.yml per SSH aufgerufen:
 *   php minetrax_publish_devlog.php /var/www/minetrax /tmp/devlog/2026-10-23.md [autor-user-id]
 *
 * Beitragsdatei: Frontmatter mit "title:" und optional "draft: true", danach der Markdown-Text.
 * Idempotent: Der Slug ist "devlog-YYYY-MM-DD". Existiert er schon, wird der Beitrag aktualisiert
 * statt doppelt angelegt.
 */

if ($argc < 3) {
    fwrite(STDERR, "Nutzung: php minetrax_publish_devlog.php <minetrax-pfad> <beitrag.md> [autor-id]\n");
    exit(2);
}

[$_, $base, $file] = $argv;
$authorId = $argv[3] ?? null;

if (!preg_match('/(\d{4}-\d{2}-\d{2})\.md$/', $file, $m)) {
    fwrite(STDERR, "Dateiname muss YYYY-MM-DD.md sein\n");
    exit(2);
}
$slug = 'devlog-' . $m[1];

$raw = file_get_contents($file);
if ($raw === false || !preg_match('/\A---\R(.*?)\R---\R(.*)\z/s', $raw, $parts)) {
    fwrite(STDERR, "Frontmatter (--- title: ... ---) fehlt\n");
    exit(2);
}
$meta = [];
foreach (preg_split('/\R/', $parts[1]) as $line) {
    if (preg_match('/^(\w+):\s*(.*)$/', $line, $kv)) {
        $meta[$kv[1]] = trim($kv[2], " \"'");
    }
}
$title = $meta['title'] ?? null;
$body = trim($parts[2]) . "\n";
$draft = in_array(strtolower($meta['draft'] ?? 'false'), ['true', 'yes', '1'], true);
if (!$title || strlen($body) < 50) {
    fwrite(STDERR, "Titel oder Text fehlt\n");
    exit(2);
}

require $base . '/vendor/autoload.php';
$app = require $base . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

if (!$authorId) {
    // Fallback: Autor des letzten Beitrags übernehmen
    $authorId = \App\Models\News::query()->whereNotNull('created_by')->latest('id')->value('created_by')
        ?? \App\Models\User::query()->orderBy('id')->value('id');
}

$news = \App\Models\News::query()->where('slug', $slug)->first();
$data = [
    'title' => $title,
    'body' => $body,
    'type' => 1, // NewsType::Dev
    'is_pinned' => false,
    'is_commentable' => true,
    'updated_by' => $authorId,
];

if ($news) {
    if ($draft) {
        $data['published_at'] = null;
    } elseif (!$news->published_at) {
        $data['published_at'] = now();
    }
    $news->update($data);
    echo "Aktualisiert: {$slug} (id {$news->id})" . ($draft ? ' [Entwurf]' : '') . "\n";
} else {
    $news = \App\Models\News::create($data + [
        'slug' => $slug,
        'created_by' => $authorId,
        'published_at' => $draft ? null : now(),
    ]);
    echo "Angelegt: {$slug} (id {$news->id})" . ($draft ? ' [Entwurf]' : '') . "\n";
}
