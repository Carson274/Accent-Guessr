const express = require('express')
const path = require('node:path');
const rateLimit = require("express-rate-limit");
const cors = require('cors');
const manifest = require('./clips/manifest.json');

// Audio clips are generated ahead of time (see scripts/) and served from
// public/clips. On Vercel, files in public/ are served by the CDN; locally,
// express.static serves them.

const app = express()
const port = 3000

const allowedOrigins = [
  "http://localhost:5173",
  "https://accent-guessr-git-deployment-carson274s-projects.vercel.app",
  "https://accent-guessr-git-main-carson274s-projects.vercel.app",
  "https://accent-guessr.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
  })
);

app.use('/clips', express.static(path.join(__dirname, 'public', 'clips'), { maxAge: '30d', immutable: true }));

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 35,
});

app.use(limiter);
app.use(express.json());

app.get('/', (_, res) => {
  return res.json({ message: "Hello!" });
});

// Picks a random clip from a country that hasn't been used yet this game.
// usedCountries should be a comma-separated list of Alpha-3 country codes e.g. "USA,FRA"
function sendRandomClip(mode, req, res) {
  const { usedCountries: usedCountriesRaw } = req.query;

  const usedCountries = usedCountriesRaw
    ? usedCountriesRaw.split(",").map(c => c.trim().toUpperCase())
    : [];

  const availableCountries = Object.keys(manifest[mode]).filter((code) => !usedCountries.includes(code));

  if (!availableCountries.length) {
    return res.status(400).json({ message: "All countries have been used" });
  }

  const countryCode = availableCountries[Math.floor(Math.random() * availableCountries.length)];
  const clips = manifest[mode][countryCode];
  const clip = clips[Math.floor(Math.random() * clips.length)];

  return res.json({ audioUrl: `/clips/${clip.file}`, countryCode });
}

// Accent mode: a real speaker from the Speech Accent Archive reading an English passage
app.get('/audio', (req, res) => sendRandomClip('accent', req, res));

// Language mode: a sentence in the country's language, voiced by Google Text-to-Speech
app.get('/language-audio', (req, res) => sendRandomClip('language', req, res));

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
