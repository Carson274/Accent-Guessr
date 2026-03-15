const express = require('express')
const rateLimit = require("express-rate-limit");
const { loadEnvFile } = require('node:process');
const { GoogleAuth } = require('google-auth-library');
const { TranslationServiceClient } = require('@google-cloud/translate');
const { COUNTRY_MAP, COMMON_WORDS } = require('./constants');

const auth = new GoogleAuth({
  keyFilename: './service-account-creds.json',
  scopes: ['https://www.googleapis.com/auth/cloud-translation'],
});

const translationClient = new TranslationServiceClient({ auth });

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
const location = 'global';

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

async function getForvoAudio(word, language, country) {
  let url = `https://apifree.forvo.com/key/${process.env.FORVO_API_KEY}/format/json/action/word-pronunciations/word/${encodeURIComponent(word)}`;
  url += `/language/${language}`;
  url += `/country/${country}`;
  url += '/order/rate-desc';
  url += '/limit/1';

  const response = await fetch(url);
  if (!response.ok) throw new Error("Forvo API request failed");

  const data = await response.json();
  if (!data.items?.length) throw new Error("No pronunciations found");

  return data.items[0].pathmp3;
}

const app = express()
const port = 3000

loadEnvFile('./.env')

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
});


app.use(limiter);
app.use(express.json());

// usedCountries should be a comma-separated list of Alpha-3 country codes e.g. "USA,FRA"
app.get('/audio', async (req, res) => {
  const { usedCountries: usedCountriesRaw } = req.query;

  const usedCountries = usedCountriesRaw
    ? usedCountriesRaw.split(",").map(c => c.trim().toUpperCase())
    : [];

  const availableCountries = Object.entries(COUNTRY_MAP).filter(
    ([code, { language }]) => !usedCountries.includes(code) && language !== 'en'
    );

  if (!availableCountries.length) {
    return res.status(400).json({ message: "All countries have been used" });
  }

  const word = COMMON_WORDS[Math.floor(Math.random() * COMMON_WORDS.length)];

  const shuffled = availableCountries.sort(() => Math.random() - 0.5);

  for (const [countryCode, { language }] of shuffled) {
    try {
      const translatedWord = await translateText(word, language);
      const audioUrl = await getForvoAudio(translatedWord, language, countryCode);
      return res.json({ audioUrl, countryCode });
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