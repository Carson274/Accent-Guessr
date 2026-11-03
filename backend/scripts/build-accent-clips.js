// Builds the Accents mode clips from the Speech Accent Archive
// (https://accent.gmu.edu, CC BY-NC-SA 4.0).
//
// Every speaker in the archive reads the same English paragraph. For each
// speaker listed in clips/accent-speakers.json, this downloads their recording
// from the archive's OSF repository, trims it to the first ~10-14 seconds
// (cut at a natural pause), evens out the volume, and saves it as a small mp3.
//
// Usage: npm run clips:accents   (needs ffmpeg on your PATH)
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { BACKEND_DIR, saveClip, writeManifestSection, mapLimit } = require('./clip-utils');

const OSF_NODE = 'yh23d';
const SPEAKERS_PATH = path.join(BACKEND_DIR, 'clips', 'accent-speakers.json');
const CACHE_DIR = path.join(os.tmpdir(), 'accent-guessr-archive-mp3');

// Where to cut the clip, in seconds after the speaker starts talking.
const MIN_CUT = 9;
const TARGET_CUT = 12;
const MAX_CUT = 14;

// OSF rate-limits downloads (HTTP 429), so retry with backoff, honoring Retry-After.
async function fetchWithRetry(url) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res;
    if (attempt >= 8 || (res.status !== 429 && res.status < 500)) throw new Error(`${res.status} from ${url}`);
    const retryAfter = Number(res.headers.get('retry-after'));
    const waitMs = retryAfter > 0 ? retryAfter * 1000 : Math.min(60000, 3000 * 2 ** (attempt - 1));
    await new Promise((r) => setTimeout(r, waitMs));
  }
}

async function fetchJson(url) {
  return (await fetchWithRetry(url)).json();
}

// A few archive files have a space before the number ("bengali 1.mp3").
const normalizeName = (name) => name.toLowerCase().replace(/\s+/g, '');

// Returns a map of mp3 file name -> download URL from the archive's OSF repo.
async function listArchiveFiles() {
  const root = await fetchJson(`https://api.osf.io/v2/nodes/${OSF_NODE}/files/osfstorage/`);
  const folder = root.data.find((f) => f.attributes.name === 'mp3_files');
  if (!folder) throw new Error('mp3_files folder not found in the OSF repository');

  const files = new Map();
  let url = `${folder.relationships.files.links.related.href}?page[size]=100`;
  while (url) {
    const page = await fetchJson(url);
    for (const f of page.data) files.set(normalizeName(f.attributes.name), f.links.download);
    url = page.links.next;
  }
  return files;
}

async function download(url, dest) {
  if (fs.existsSync(dest)) return;
  const res = await fetchWithRetry(url);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

// Returns the pauses in the first 25 seconds, using ffmpeg's silencedetect.
function detectSilences(input) {
  const result = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-nostats', '-t', '25', '-i', input, '-af', 'silencedetect=noise=-35dB:d=0.2', '-f', 'null', '-'],
    { encoding: 'utf8' }
  );
  if (result.status !== 0) throw new Error(`ffmpeg failed on ${input}: ${result.stderr.slice(-300)}`);

  const silences = [];
  let start = null;
  for (const line of result.stderr.split('\n')) {
    const s = line.match(/silence_start: (-?[\d.]+)/);
    const e = line.match(/silence_end: ([\d.]+)/);
    if (s) start = Math.max(0, parseFloat(s[1]));
    if (e && start !== null) {
      silences.push({ start, end: parseFloat(e[1]) });
      start = null;
    }
  }
  return silences;
}

function trimClip(input) {
  const silences = detectSilences(input);

  // Skip leading silence, keeping a short lead-in.
  const leading = silences.find((s) => s.start <= 0.05);
  const speechStart = leading ? Math.max(0, leading.end - 0.15) : 0;

  // Cut in the middle of the pause closest to TARGET_CUT, or fade out at MAX_CUT.
  const pauses = silences
    .filter((s) => s !== leading)
    .map((s) => ({ ...s, mid: (s.start + s.end) / 2 - speechStart }))
    .filter((s) => s.mid >= MIN_CUT && s.mid <= MAX_CUT)
    .sort((a, b) => Math.abs(a.mid - TARGET_CUT) - Math.abs(b.mid - TARGET_CUT));
  const length = pauses.length ? pauses[0].mid : MAX_CUT;

  const out = path.join(CACHE_DIR, `trim-${process.pid}-${path.basename(input)}`);
  execFileSync(
    'ffmpeg',
    [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-ss', speechStart.toFixed(2), '-t', length.toFixed(2), '-i', input,
      '-af', `afade=t=in:d=0.05,afade=t=out:st=${Math.max(0, length - 0.3).toFixed(2)}:d=0.3,loudnorm=I=-16:TP=-1.5:LRA=11`,
      '-ac', '1', '-ar', '22050', '-b:a', '40k',
      out,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
  const buffer = fs.readFileSync(out);
  fs.unlinkSync(out);
  return { buffer, seconds: length };
}

async function main() {
  const speakers = JSON.parse(fs.readFileSync(SPEAKERS_PATH, 'utf8'));
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  console.log('Listing archive files on OSF...');
  const archive = await listArchiveFiles();
  console.log(`Found ${archive.size} recordings. Building ${speakers.length} clips...`);

  const byCountry = {};
  const failures = [];
  let done = 0;
  await mapLimit(speakers, 2, async (speaker) => {
    try {
      const url = archive.get(normalizeName(speaker.file));
      if (!url) throw new Error('not found in the archive');
      const source = path.join(CACHE_DIR, speaker.file);
      await download(url, source);
      const { buffer, seconds } = trimClip(source);
      const file = saveClip(buffer, 'a');
      (byCountry[speaker.country] ??= []).push({
        file,
        source: speaker.file,
        nativeLanguage: speaker.nativeLanguage,
        birthplace: speaker.birthplace,
        seconds: Number(seconds.toFixed(1)),
      });
    } catch (e) {
      failures.push(`${speaker.file}: ${e.message}`);
    }
    if (++done % 25 === 0) console.log(`  ${done}/${speakers.length}`);
  });

  for (const clips of Object.values(byCountry)) clips.sort((a, b) => a.source.localeCompare(b.source));
  const summary = writeManifestSection('accent', 'a', byCountry);
  console.log(`Done: ${summary.clips} clips for ${summary.countries} countries (${summary.removed} old clips removed).`);
  if (failures.length) {
    console.log(`Skipped ${failures.length}:`);
    for (const f of failures) console.log(`  ${f}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
