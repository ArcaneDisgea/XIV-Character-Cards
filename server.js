const cacheManager = require('cache-manager');
const express = require('express');
const fetch = require('node-fetch');
const fsStore = require('cache-manager-fs-binary');
const rateLimit = require("express-rate-limit");

const { CardCreator } = require('./create-card');

const port = process.env.PORT || 5000;
const xivApiKey = typeof process.env.XIV_API_KEY === 'string' && process.env.XIV_API_KEY !== '' ? process.env.XIV_API_KEY : undefined;
const supportedLanguages = ['en', 'ja', 'de', 'fr'];

const app = express();
const creator = new CardCreator(xivApiKey);

// Initialize caching on disk
const diskCache = cacheManager.caching({
  store: fsStore,
  options: {
    reviveBuffers: true,
    binaryAsStream: false,
    ttl: 14400, // s = 4h
    maxsize: 1000000000, // bytes = 1 GB
    path: 'diskcache',
    preventfill: true,
  }
});

// Rate limit all requests that result in XIV API calls
const limiter = rateLimit({
  windowMs: 1000, // ms = 1s
  max: 20, // default XIV API request limit
  keyGenerator: () => 'global',
});

async function getCharacterIdByName(world, name, retries = 1) {
  if (retries === -1) return undefined;

  const searchUrl = new URL('https://xivapi.com/character/search');
  searchUrl.searchParams.set('name', name)
  searchUrl.searchParams.set('server', world)
  if (xivApiKey != null) searchUrl.searchParams.set('private_key', xivApiKey)

  const response = await fetch(searchUrl.toString());
  const data = await response.json();

  if (data.Results[0] === undefined) return getCharacterIdByName(world, name, --retries);

  return data.Results[0].ID;
}

async function cacheCreateCard(characterId, customImage, language) {
  const cacheKey = `img:${characterId}:${customImage}:${language}`;

  return diskCache.wrap(cacheKey, async () => {
    await creator.ensureInit().catch(error => { throw new Error(`Init failed with: ${error}`) });
    const image = await creator.createCard(characterId, customImage, language).catch(error => { throw new Error(`Create card failed with: ${error}`) });

    return {
      binary: {
        image,
      },
    };
  });
}

function getOriginalQueryString(req) {
  const url = new URL(req.originalUrl, 'http://example.org');
  return url.search;
}

app.get('/prepare/id/:characterId', limiter, (req, res, next) => {
  const language = typeof req.query.lang === 'string' && supportedLanguages.includes(req.query.lang) ? req.query.lang : supportedLanguages[0];

  cacheCreateCard(req.params.characterId, null, language)
    .then(() => {
      res.status(200).json({
        status: 'ok',
        url: `/characters/id/${req.params.characterId}.png`,
      });
    })
    .catch(next);
});

app.get('/prepare/name/:world/:characterName', limiter, (req, res, next) => {
  getCharacterIdByName(req.params.world, req.params.characterName)
    .then(characterId => {
      if (characterId == null) {
        res.status(404).send({ status: 'error', reason: 'Character not found.' });
      } else {
        res.redirect(`/prepare/id/${characterId}${getOriginalQueryString(req)}`);
      }
    })
    .catch(next);
});

app.get('/characters/id/:characterId.png', limiter, (req, res, next) => {
  const language = typeof req.query.lang === 'string' && supportedLanguages.includes(req.query.lang) ? req.query.lang : supportedLanguages[0];

  cacheCreateCard(req.params.characterId, null, language)
    .then(result => {
      const image = result.binary.image;

      res.writeHead(200, {
        'Cache-Control': 'public, max-age=14400',
        'Content-Length': Buffer.byteLength(image),
        'Content-Type': 'image/png',
      });

      res.end(image, 'binary');
    })
    .catch(next);
});

app.get('/characters/id/:characterId', (req, res) => {
  res.redirect(`/characters/id/${req.params.characterId}.png${getOriginalQueryString(req)}`);
});

app.get('/characters/name/:world/:characterName.png', limiter, (req, res, next) => {
  getCharacterIdByName(req.params.world, req.params.characterName)
    .then(characterId => {
      if (characterId == null) {
        res.status(404).send({ status: 'error', reason: 'Character not found.' });
      } else {
        res.redirect(`/characters/id/${characterId}${getOriginalQueryString(req)}`);
      }
    })
    .catch(next);
});

app.get('/characters/name/:world/:characterName', (req, res) => {
  res.redirect(`/characters/name/${req.params.world}/${req.params.characterName}.png${getOriginalQueryString(req)}`);
});

app.get('/', async (req, res) => {
  res.redirect('https://github.com/xivapi/XIV-Character-Cards');
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    status: 'error',
    reason: error instanceof Error ? error.stack : String(error),
  });
});

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
  creator.ensureInit().then(() => console.log('CardCreator initialization complete'));
});
