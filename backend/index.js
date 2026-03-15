const express = require('express')
const rateLimit = require("express-rate-limit");
const { loadEnvFile } = require('node:process');
const {TranslationServiceClient} = require('@google-cloud/translate');

const translationClient = new TranslationServiceClient();

const projectId = 'accent-guessr';
const location = 'global';

async function translateText(word, sourceLanguageCode, targetLanguageCode) {
    const request = {
        parent: `projects/${projectId}/locations/${location}`,
        contents: [word],
        mimeType: 'text/plain',
        sourceLanguageCode,
        targetLanguageCode,
    };

    const [response] = await translationClient.translateText(request);
    
    for (const translation of response.translations) {
        console.log(`Translation: ${translation.translatedText}`);
    }

    return response.translations
    
}

const app = express()
const port = 3000

loadEnvFile('./.env')

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
});

app.use(limiter);

app.get('/audio', async (req, res) => {
  const { word, language, country } = req.query;

  if (!word) {
    return res.status(400).json({ message: "Missing required parameter: word" });
  } else if (!country) {
    return res.status(400).json({ message: "Missing required parameter: country" });
  }

  let url = `https://apifree.forvo.com/key/${process.env.FORVO_API_KEY}/format/json/action/word-pronunciations/word/${encodeURIComponent(word)}`;

  if (language) url += `/language/${language}`;
  if (country) url += `/country/${country}`;
  url += '/order/rate-desc';
  url += '/limit/2';

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({ message: "Forvo API request failed" });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})