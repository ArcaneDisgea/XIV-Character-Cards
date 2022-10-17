# XIV Character Cards

![npm Version](https://img.shields.io/npm/v/xiv-character-cards)
[![Documentation](https://img.shields.io/badge/docs-JSDoc-orange)](https://xivapi.github.io/XIV-Character-Cards/)

Library and API to create fancy cards for FFXIV characters based on their Lodestone data, powered by [xivapi.com](https://xivapi.com/) and hosted at [https://ffxiv-character-cards.herokuapp.com](https://ffxiv-character-cards.herokuapp.com).

![Demo image](https://ffxiv-character-cards.herokuapp.com/characters/id/9575452.png)

## API

All API calls support the `lang` query parameter to create a character card with information in the specified language. The supported languages are the same as [xivapi.com](https://xivapi.com/docs/Common-Features#language), which are English (en), Japanese (ja), German (de) and French (fr).

E.g. a request for a german character card would look like this: ``https://ffxiv-character-cards.herokuapp.com/characters/id/<LODESTONE ID>.png?lang=de``

### Getting a card for a character by its Lodestone ID

``GET https://ffxiv-character-cards.herokuapp.com/characters/id/<LODESTONE ID>.png``

### Getting card for a character by its world and name

``GET https://ffxiv-character-cards.herokuapp.com/characters/name/<WORLD>/<CHARACTER NAME>.png``
<br>**Note:** This is considerably slower than the creation by ID, since the character has to be looked up in the Lodestone first.

<br>

If you are using this API together with an application that requires the API to respond very quickly, like Discord, you may need to ask it to "prepare" the card image for a character beforehand. The API will reply with its status, and in case of success, the URL to the final image.
``{"status":"ok","url":"/characters/id/123456789.png"}``

### Requesting a card to be cached for a character by its Lodestone ID

``GET https://ffxiv-character-cards.herokuapp.com/prepare/id/<LODESTONE ID>``

### Requesting a card to be cached for a character by its world and name

``GET https://ffxiv-character-cards.herokuapp.com/prepare/name/<WORLD>/<CHARACTER NAME>``

## Library

To use the card creator as a library in your Node.JS application, first install it as a dependency with:

```sh
yarn add xiv-character-cards
# or
npm i xiv-character-cards
```

You can then instantiate the class `CardCreator` from the library, call the asynchronous `insureInit()` function to make sure all resources are loaded and then use the asynchronous `createCard()` function with your characters Lodestone ID. You will receive a promise that resolves to a `Buffer` of the PNG image of your card, that you can use in your bot or application.

Check the [library documentation](https://xivapi.github.io/XIV-Character-Cards/) for more details.

> **Note:** The API server is not published as an NPM package, so if you want to host it yourself, clone the [Github repository](https://github.com/xivapi/XIV-Character-Cards) and put the Express.JS webserver defined in the `server.js` file behind a reverse proxy.

### Library example

```js
const { CardCreator } = require("xiv-character-cards");
const { writeFileSync } = require("fs");

const creator = new CardCreator();
const lodestoneId = "13821878";

async function example() {
  await creator.ensureInit();
  return creator.createCard(lodestoneId);
}

example()
  .then(card => {
    writeFileSync(`./${lodestoneId}.png`, card);
  })
  .catch(error => {
    console.error('Creator initialization or card creation failed!');
    console.error(error);
  });
```
