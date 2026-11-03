// Builds the Accents mode clips from the Speech Accent Archive
// (https://accent.gmu.edu, CC BY-NC-SA 4.0).
//
// Every speaker in the archive reads the same English paragraph. For each
// speaker listed in clips/accent-speakers.json, this downloads their recording
// from the archive's OSF repository, cuts out the paragraph's last two
// sentences (the part that doesn't mention anyone by name), evens out the
// volume, and saves it as a small mp3.
//
// Where those sentences start and end is stored per speaker in
// accent-speakers.json. For new speakers without times, this runs
// find-passage.py, which uses Whisper to find them.
//
// Usage: npm run clips:accents
// Needs ffmpeg, plus Python with openai-whisper for new speakers.
// WHISPER_PYTHON (default "python3") and WHISPER_MODEL (default "small.en",
// or a path to a downloaded model file) choose how Whisper runs.
const { execFileSync, spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');
const { BACKEND_DIR, saveClip, writeManifestSection, mapLimit } = require('./clip-utils');

const OSF_NODE = 'yh23d';
const SPEAKERS_PATH = path.join(BACKEND_DIR, 'clips', 'accent-speakers.json');
const CACHE_DIR = path.join(os.tmpdir(), 'accent-guessr-archive-mp3');
const MAX_SECONDS = 18;

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

// Returns a map of normalized mp3 file name -> download URL from the archive's OSF repo.
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

// Runs find-passage.py on the given recordings. Resolves to a map of file -> { start, end } or { error }.
function findPassages(files) {
  const python = process.env.WHISPER_PYTHON || 'python3';
  const model = process.env.WHISPER_MODEL || 'small.en';
  const script = path.join(__dirname, 'find-passage.py');

  return new Promise((resolve, reject) => {
    const child = spawn(python, ['-I', script, model, ...files], { stdio: ['ignore', 'pipe', 'pipe'] });
    const results = new Map();
    let stderr = '';
    child.stderr.on('data', (chunk) => (stderr = (stderr + chunk).slice(-2000)));
    readline.createInterface({ input: child.stdout }).on('line', (line) => {
      const result = JSON.parse(line);
      results.set(result.file, result);
      if (results.size % 25 === 0) console.log(`  ${results.size}/${files.length}`);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0 && results.size < files.length) {
        reject(new Error(`find-passage.py exited with ${code}:\n${stderr}`));
      } else {
        resolve(results);
      }
    });
  });
}

// Returns the pauses in a recording, using ffmpeg's silencedetect.
function detectSilences(input) {
  const result = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-nostats', '-i', input, '-af', 'silencedetect=noise=-35dB:d=0.15', '-f', 'null', '-'],
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

// Cuts the passage out of a recording. Whisper's word times can be a little
// off, so each edge snaps to a nearby pause so no words get clipped. Slow
// speakers whose two sentences run past MAX_SECONDS only get the first one.
function trimClip(input, passage) {
  const silences = detectSilences(input);

  // Only snap to a pause right before "We", so the end of the previous sentence ("...brother Bob") stays out.
  const pauseBefore = silences
    .filter((s) => s.end >= passage.start - 0.4 && s.end <= passage.start + 0.25)
    .at(-1);
  const start = Math.max(0, pauseBefore ? pauseBefore.end - 0.1 : passage.start - 0.1);

  const tooLong = passage.end - start > MAX_SECONDS - 0.5;
  const speechEnd = tooLong && passage.firstEnd ? passage.firstEnd : passage.end;
  const pauseAfter = silences.find((s) => s.start >= speechEnd - 0.3 && s.start <= speechEnd + 1.0);
  const end = pauseAfter ? pauseAfter.start + 0.2 : speechEnd + 0.3;
  const length = Math.min(end - start, MAX_SECONDS);

  const out = path.join(CACHE_DIR, `trim-${process.pid}-${path.basename(input)}`);
  execFileSync(
    'ffmpeg',
    [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-ss', start.toFixed(2), '-t', length.toFixed(2), '-i', input,
      '-af', `afade=t=in:d=0.05,afade=t=out:st=${Math.max(0, length - 0.25).toFixed(2)}:d=0.25,loudnorm=I=-16:TP=-1.5:LRA=11`,
      '-ac', '1', '-ar', '22050', '-b:a', '40k',
      out,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
  const buffer = fs.readFileSync(out);
  fs.unlinkSync(out);
  return { buffer, start, seconds: length };
}

async function main() {
  const speakers = JSON.parse(fs.readFileSync(SPEAKERS_PATH, 'utf8'));
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const sourcePath = (speaker) => path.join(CACHE_DIR, speaker.file);
  const failures = new Map();

  console.log('Listing archive files on OSF...');
  const archive = await listArchiveFiles();
  console.log(`Found ${archive.size} recordings. Downloading ${speakers.length} speakers...`);
  await mapLimit(speakers, 2, async (speaker) => {
    try {
      const url = archive.get(normalizeName(speaker.file));
      if (!url) throw new Error('not found in the archive');
      await download(url, sourcePath(speaker));
    } catch (e) {
      failures.set(speaker.file, e.message);
    }
  });

  const unaligned = speakers.filter((s) => !failures.has(s.file) && (s.start === undefined || s.end === undefined));
  if (unaligned.length) {
    console.log(`Finding the passage in ${unaligned.length} new recordings with Whisper...`);
    const results = await findPassages(unaligned.map(sourcePath));
    for (const speaker of unaligned) {
      const result = results.get(sourcePath(speaker));
      if (result && result.error === undefined) {
        speaker.start = result.start;
        speaker.end = result.end;
        if (result.firstEnd !== undefined) speaker.firstEnd = result.firstEnd;
      } else {
        failures.set(speaker.file, `passage not found: ${result?.error ?? 'no result'}`);
      }
    }
    fs.writeFileSync(SPEAKERS_PATH, JSON.stringify(speakers, null, 2) + '\n');
  }

  const ready = speakers.filter((s) => !failures.has(s.file));
  console.log(`Building ${ready.length} clips...`);
  const byCountry = {};
  await mapLimit(ready, 6, async (speaker) => {
    try {
      const { buffer, start, seconds } = trimClip(sourcePath(speaker), speaker);
      const file = saveClip(buffer, 'a');
      (byCountry[speaker.country] ??= []).push({
        file,
        source: speaker.file,
        nativeLanguage: speaker.nativeLanguage,
        birthplace: speaker.birthplace,
        sourceStart: Number(start.toFixed(2)),
        seconds: Number(seconds.toFixed(1)),
      });
    } catch (e) {
      failures.set(speaker.file, e.message);
    }
  });

  for (const clips of Object.values(byCountry)) clips.sort((a, b) => a.source.localeCompare(b.source));
  const summary = writeManifestSection('accent', 'a', byCountry);
  console.log(`Done: ${summary.clips} clips for ${summary.countries} countries (${summary.removed} old clips removed).`);
  if (failures.size) {
    console.log(`Skipped ${failures.size}:`);
    for (const [file, reason] of failures) console.log(`  ${file}: ${reason}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
