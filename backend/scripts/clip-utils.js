// Shared helpers for the clip build scripts.
// Clips are saved under public/clips with content-hashed names so the file
// name never gives away the answer. The country for each clip only lives in
// clips/manifest.json, which the server reads but never serves.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const BACKEND_DIR = path.join(__dirname, '..');
const CLIPS_DIR = path.join(BACKEND_DIR, 'public', 'clips');
const MANIFEST_PATH = path.join(BACKEND_DIR, 'clips', 'manifest.json');

function loadEnv() {
  const envPath = path.join(BACKEND_DIR, '.env');
  if (fs.existsSync(envPath)) process.loadEnvFile(envPath);
}

function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return { accent: {}, language: {} };
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

// Saves an mp3 buffer and returns its file name, e.g. "a-1f2e3d4c5b6a7980.mp3".
function saveClip(buffer, prefix) {
  const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
  const file = `${prefix}-${hash}.mp3`;
  fs.mkdirSync(CLIPS_DIR, { recursive: true });
  fs.writeFileSync(path.join(CLIPS_DIR, file), buffer);
  return file;
}

// Replaces one section of the manifest ("accent" or "language") and deletes
// clips with that section's prefix that are no longer referenced.
function writeManifestSection(section, prefix, byCountry) {
  const manifest = readManifest();
  manifest[section] = Object.fromEntries(
    Object.entries(byCountry).sort(([a], [b]) => a.localeCompare(b))
  );
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');

  const keep = new Set(Object.values(byCountry).flat().map((clip) => clip.file));
  let removed = 0;
  for (const file of fs.readdirSync(CLIPS_DIR)) {
    if (file.startsWith(`${prefix}-`) && !keep.has(file)) {
      fs.unlinkSync(path.join(CLIPS_DIR, file));
      removed++;
    }
  }
  return { countries: Object.keys(byCountry).length, clips: keep.size, removed };
}

// Runs async work over items with a fixed number in flight at once.
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

module.exports = { BACKEND_DIR, CLIPS_DIR, loadEnv, saveClip, writeManifestSection, mapLimit };
