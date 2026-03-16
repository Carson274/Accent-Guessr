const express = require('express')
const rateLimit = require("express-rate-limit");
const { loadEnvFile } = require('node:process');
const { GoogleAuth } = require('google-auth-library');
const textToSpeech = require('@google-cloud/text-to-speech');
const { ALL_COUNTRY_MAP, COMMON_WORDS, SENTENCES, EN_COUNTRY_MAP } = require('./constants');
const cors = require('cors');

const serviceAccountJson = process.env.GCP_SERVICE_ACCOUNT_JSON;
if (!serviceAccountJson) {
  throw new Error("GCP_SERVICE_ACCOUNT_JSON env var is not set");
}
const serviceAccount = JSON.parse(serviceAccountJson);
const auth = new GoogleAuth({
  credentials: serviceAccount,
  scopes: ['https://www.googleapis.com/auth/cloud-translation'],
});
const ttsClient = new textToSpeech.TextToSpeechClient({
  credentials: serviceAccount,
});

async function synthesizeSpeech(text, languageCode) {
  const [response] = await ttsClient.synthesizeSpeech({
    input: { text },
    voice: { languageCode, ssmlGender: 'NEUTRAL' },
    audioConfig: { audioEncoding: 'MP3' },
  });
  // response.audioContent is a Buffer; convert to base64 data URI
  const base64Audio = response.audioContent.toString('base64');
  return `data:audio/mp3;base64,${base64Audio}`;
}

async function translateText(word, targetLanguageCode) {
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.token}`,
      },
      body: JSON.stringify({
        q: word,
        source: 'en',
        target: targetLanguageCode,
        format: 'text',
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) throw new Error("Translation API request failed");

  return data.data.translations[0].translatedText;
}

async function getForvoAudio(word, country) {
  let url = `https://apifree.forvo.com/key/${process.env.FORVO_API_KEY}/format/json/action/word-pronunciations/word/${encodeURIComponent(word)}`;
  url += '/language/en';
  url += `/country/${country}`;
  url += '/order/rate-desc';
  url += '/limit/1';

  const response = await fetch(url);
  if (!response.ok) throw new Error("Forvo API request failed");

  const data = await response.json();
  if (!data.items?.length) throw new Error(`No pronunciations of ${word} found for ${country}`);

  return data.items[0].pathmp3;
}

const app = express()
const port = 3000

const allowedOrigins = [
  "http://localhost:5173",
  "https://accent-guessr-game.vercel.app",
  "https://accent-guessr-git-deployment-carson274s-projects.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
  })
);

loadEnvFile('./.env')

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 35,
});


app.use(limiter);
app.use(express.json());

// usedCountries should be a comma-separated list of Alpha-3 country codes e.g. "USA,FRA"
app.get('/audio', async (req, res) => {
  const { usedCountries: usedCountriesRaw } = req.query;

  const usedCountries = usedCountriesRaw
    ? usedCountriesRaw.split(",").map(c => c.trim().toUpperCase())
    : [];

  const availableCountries = Object.entries(EN_COUNTRY_MAP).filter(([code]) => !usedCountries.includes(code));

  if (!availableCountries.length) {
    return res.status(400).json({ message: "All countries have been used" });
  }

  const word = COMMON_WORDS[Math.floor(Math.random() * COMMON_WORDS.length)];

  const shuffled = availableCountries.sort(() => Math.random() - 0.5);

  for (const [countryCode] of shuffled) {
    try {
      const audioUrl = await getForvoAudio(word, countryCode);
      console.log("\nFound URL for ", word, countryCode, "- here is the audioUrl:", audioUrl)
      return res.json({ audioUrl, countryCode });
    } catch (e) {
      console.log(e);
      continue;
    }
  }

  return res.status(404).json({ message: "No audio found for any available country" });
})

// Language mode: translate a sentence and synthesize TTS audio
app.get('/language-audio', async (req, res) => {
  const { usedCountries: usedCountriesRaw } = req.query;

  const usedCountries = usedCountriesRaw
    ? usedCountriesRaw.split(",").map(c => c.trim().toUpperCase())
    : [];

  const availableCountries = Object.entries(ALL_COUNTRY_MAP).filter(
    ([code, { language }]) => !usedCountries.includes(code) && language !== 'en'
  );

  if (!availableCountries.length) {
    return res.status(400).json({ message: "All countries have been used" });
  }

  const sentence = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
  const shuffled = availableCountries.sort(() => Math.random() - 0.5);

  for (const [countryCode, { language }] of shuffled) {
    try {
      const translatedSentence = await translateText(sentence, language);
      const audioDataUri = await synthesizeSpeech(translatedSentence, language);
      return res.json({ audioUrl: audioDataUri, countryCode });
    } catch (e) {
      console.log(e);
      continue;
    }
  }

  return res.status(404).json({ message: "No audio found for any available country" });
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})