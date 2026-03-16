# AccentGuessr 🗣️
## About
AccentGuessr is a game that allows the player to guess where different languages & accents are from. There are two primary gamemodes:
- **Accents**: Players can listen to a word spoken with an accent and then guess the speaker's country of origin.
- **Language**: Players listen to a full sentence spoken in a foreign language and are tasked with identifying the location of origin.

Players can enjoy AccentGuessr in both singleplayer mode and multiplayer mode.

![Screenshot of AccentGuessr Gameplay](/client/src/images/ReadMeImage.png)

This game leverages the [Forvo](https://api.forvo.com/) API, which is utilized to supply the game with dozens of voice clips across all languages in a variety of pronunciations. Users listen to these audio clips in both singleplayer and multiplayer mode to guess accents and languages.

This application is deployed with [Vercel](https://vercel.com/) and can be accessed via the link [here](https://accent-guessr.vercel.app/).

## Setup
### Backend
In `backend/`, run the following:
```
cd backend && npm install
npm run dev
```
Then, you will need to create a `.env` file in this directory containing variables for your `FORVO_API_KEY` and `GCP_SERVICE_ACCOUNT_JSON`.

### Frontend
In `client/`, run the following:
```
cd client && npm install
npm run dev
```
You will then need to create another `.env` file in this directory that contains variables for your `VITE_PARTYKIT_HOST` and `VITE_BACKEND_URL`.

------

© Carson Secrest - 2026 @ Oregon State University
