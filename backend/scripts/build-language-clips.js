// Builds the Language mode clips with Google Cloud Translation and Text-to-Speech.
//
// For each country in ALL_COUNTRY_MAP that isn't English-speaking, this picks
// the best Google voice for its language (Chirp 3 HD, then Neural2, then
// WaveNet), translates a few sentences, and saves the spoken audio as mp3s.
// Languages with no voice better than Google's basic "Standard" voices are left out.
//
// Usage: npm run clips:language   (needs GCP_SERVICE_ACCOUNT_JSON in backend/.env)
const textToSpeech = require('@google-cloud/text-to-speech');
const { Translate } = require('@google-cloud/translate').v2;
const { ALL_COUNTRY_MAP, SENTENCES } = require('../constants');
const { loadEnv, saveClip, writeManifestSection, mapLimit } = require('./clip-utils');

const SENTENCES_PER_LANGUAGE = 6;

// Google voice locale for each language code in ALL_COUNTRY_MAP.
const LANGUAGE_LOCALES = {
  af: 'af-ZA', am: 'am-ET', ar: 'ar-XA', bg: 'bg-BG', bn: 'bn-IN', bs: 'hr-HR', ca: 'ca-ES',
  cs: 'cs-CZ', da: 'da-DK', de: 'de-DE', el: 'el-GR', es: 'es-US', et: 'et-EE', fi: 'fi-FI',
  fr: 'fr-FR', he: 'he-IL', hi: 'hi-IN', hr: 'hr-HR', hu: 'hu-HU', id: 'id-ID', is: 'is-IS',
  it: 'it-IT', ja: 'ja-JP', ko: 'ko-KR', lt: 'lt-LT', lv: 'lv-LV', ms: 'ms-MY', nl: 'nl-NL',
  no: 'nb-NO', pl: 'pl-PL', pt: 'pt-PT', ro: 'ro-RO', ru: 'ru-RU', sk: 'sk-SK', sl: 'sl-SI',
  sr: 'sr-RS', sv: 'sv-SE', sw: 'sw-KE', th: 'th-TH', tl: 'fil-PH', tr: 'tr-TR', uk: 'uk-UA',
  ur: 'ur-IN', vi: 'vi-VN', zh: 'cmn-CN',
};

// Countries that get a regional voice instead of the language default.
const COUNTRY_LOCALES = { ESP: 'es-ES', GNQ: 'es-ES', BRA: 'pt-BR', BEL: 'nl-BE', TWN: 'cmn-TW' };

// Google Translate targets that differ from the language code.
const TRANSLATE_TARGETS = { 'cmn-CN': 'zh-CN', 'cmn-TW': 'zh-TW' };

const TIERS = [
  { name: 'Chirp 3 HD', test: (v) => v.name.includes('Chirp3-HD') },
  { name: 'Neural2', test: (v) => v.name.includes('Neural2') },
  { name: 'WaveNet', test: (v) => v.name.includes('Wavenet') },
];
const PREFERRED = { FEMALE: ['Kore', 'Aoede', 'Leda'], MALE: ['Charon', 'Puck', 'Orus'] };

// Picks a female and a male voice from the best tier available for a locale.
function pickVoices(allVoices, locale) {
  const voices = allVoices.filter((v) => v.languageCodes.includes(locale));
  for (const tier of TIERS) {
    const inTier = voices.filter(tier.test).sort((a, b) => a.name.localeCompare(b.name));
    if (!inTier.length) continue;
    const picked = ['FEMALE', 'MALE']
      .map((gender) => {
        const ofGender = inTier.filter((v) => v.ssmlGender === gender);
        return PREFERRED[gender].map((p) => ofGender.find((v) => v.name.endsWith(`-${p}`))).find(Boolean) ?? ofGender[0];
      })
      .filter(Boolean);
    return { tier: tier.name, voices: picked.length ? picked : [inTier[0]] };
  }
  return null;
}

// Retries Google calls that hit the per-minute quota (gRPC code 8, HTTP 429).
async function withRetry(fn) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const rateLimited = e.code === 8 || e.code === 429 || /quota|rate/i.test(e.message);
      if (!rateLimited || attempt >= 6) throw e;
      await new Promise((r) => setTimeout(r, 5000 * 2 ** (attempt - 1)));
    }
  }
}

// Same sentences every run for a given locale, different between locales.
function pickSentences(key) {
  let seed = [...key].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;
  const random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const shuffled = [...SENTENCES];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, SENTENCES_PER_LANGUAGE);
}

async function main() {
  loadEnv();
  if (!process.env.GCP_SERVICE_ACCOUNT_JSON) throw new Error('GCP_SERVICE_ACCOUNT_JSON is not set in backend/.env');
  const credentials = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_JSON);
  const tts = new textToSpeech.TextToSpeechClient({ credentials });
  const translate = new Translate({ credentials, projectId: credentials.project_id });

  const [{ voices: allVoices }] = await tts.listVoices({});

  // Group countries that share a voice locale and translation target.
  const groups = new Map();
  const skipped = [];
  for (const [country, { language, name }] of Object.entries(ALL_COUNTRY_MAP)) {
    if (language === 'en') continue;
    const locale = COUNTRY_LOCALES[country] ?? LANGUAGE_LOCALES[language];
    const choice = locale && pickVoices(allVoices, locale);
    if (!choice) {
      skipped.push(`${name} (${language})`);
      continue;
    }
    const target = TRANSLATE_TARGETS[locale] ?? language;
    const key = `${locale}|${target}`;
    if (!groups.has(key)) groups.set(key, { locale, target, ...choice, countries: [] });
    groups.get(key).countries.push(country);
  }

  const byCountry = {};
  await mapLimit([...groups.values()], 2, async (group) => {
    const sentences = pickSentences(`${group.locale}|${group.target}`);
    const [translations] = await withRetry(() =>
      translate.translate(sentences, { from: 'en', to: group.target, format: 'text' })
    );

    const clips = [];
    for (const [i, text] of translations.entries()) {
      const voice = group.voices[i % group.voices.length];
      const [response] = await withRetry(() =>
        tts.synthesizeSpeech({
          input: { text },
          voice: { languageCode: group.locale, name: voice.name },
          audioConfig: { audioEncoding: 'MP3' },
        })
      );
      const file = saveClip(Buffer.from(response.audioContent), 'l');
      clips.push({ file, locale: group.locale, voice: voice.name, text });
    }
    for (const country of group.countries) byCountry[country] = clips;
    console.log(`  ${group.locale} (${group.tier}, ${group.target}): ${group.countries.join(', ')}`);
  });

  const summary = writeManifestSection('language', 'l', byCountry);
  console.log(`Done: ${summary.clips} clips for ${summary.countries} countries (${summary.removed} old clips removed).`);
  console.log(`No good Google voice, left out (${skipped.length}): ${skipped.join(', ')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
