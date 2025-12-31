import express from "express";
import fetch from "node-fetch";
import slugify from "slugify";

const app = express();
app.use(express.json());

const songs = {};

/* =========================
   Helpers
========================= */

async function getSpotifyMeta(spotifyUrl) {
  const res = await fetch(
    `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`
  );
  if (!res.ok) throw new Error("Spotify oEmbed failed");
  const data = await res.json();

  return {
    title: data.title || "Unknown Track",
    cover: data.thumbnail_url
  };
}

function baseUrl(req) {
  return `${req.protocol}://${req.get("host")}`;
}

/* =========================
   Admin
========================= */

app.post("/songs", async (req, res) => {
  const { spotifyUrl, appleMusicUrl } = req.body;
  if (!spotifyUrl || !appleMusicUrl) {
    return res.status(400).json({ error: "Both URLs required" });
  }

  const meta = await getSpotifyMeta(spotifyUrl);
  const slug = slugify(meta.title, { lower: true, strict: true });

  songs[slug] = {
    slug,
    ...meta,
    spotifyUrl,
    appleMusicUrl
  };

  const base = baseUrl(req);

  res.json({
    title: meta.title,
    cover: meta.cover,
    urls: {
      spotify: `${base}/${slug}/spotify`,
      apple: `${base}/${slug}/apple`
    }
  });
});

/* =========================
   MAIN PROFILE PAGE
========================= */

app.get("/", (req, res) => {
  const songList = Object.values(songs)
    .map(
      s => `
      <div class="card">
        <img src="${s.cover}" />
        <div class="info">
          <h3>${s.title}</h3>
          <div class="buttons">
            <a href="/${s.slug}/spotify" class="spotify">Spotify</a>
            <a href="/${s.slug}/apple" class="apple">Apple Music</a>
          </div>
        </div>
      </div>`
    )
    .join("");

  res.send(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Kia – Music</title>

<style>
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, Inter, sans-serif;
  background: #0b0b0b;
  color: white;
}

header {
  text-align: center;
  padding: 48px 20px 24px;
}

header h1 {
  margin: 0;
  font-size: 32px;
  letter-spacing: 1px;
}

header p {
  opacity: 0.6;
}

.grid {
  max-width: 960px;
  margin: auto;
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.card {
  background: #121212;
  border-radius: 18px;
  overflow: hidden;
}

.card img {
  width: 100%;
  display: block;
}

.info {
  padding: 16px;
}

h3 {
  font-size: 16px;
  margin: 0 0 12px;
}

.buttons {
  display: flex;
  gap: 12px;
}

.buttons a {
  flex: 1;
  text-align: center;
  padding: 12px;
  border-radius: 12px;
  font-weight: 600;
  text-decoration: none;
}

.spotify {
  background: #1db954;
  color: #000;
}

.apple {
  background: #ffffff;
  color: #000;
}
</style>
</head>

<body>
<header>
  <h1>KIA</h1>
  <p>Listen on your favorite platform</p>
</header>

<div class="grid">
  ${songList || "<p style='opacity:.5'>No songs yet</p>"}
</div>
</body>
</html>`);
});

/* =========================
   REDIRECT LOADING PAGE
========================= */

app.get("/:slug/:platform", (req, res) => {
  const { slug, platform } = req.params;
  const song = songs[slug];

  if (!song) return res.status(404).send("Not found");

  const target =
    platform === "spotify"
      ? song.spotifyUrl
      : platform === "apple"
      ? song.appleMusicUrl
      : null;

  if (!target) return res.status(404).send("Invalid platform");

  res.send(`<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
body {
  margin: 0;
  background: black;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: Inter, sans-serif;
  color: white;
}

.bg {
  position: absolute;
  inset: 0;
  background-image: url("${song.cover}");
  background-size: cover;
  background-position: center;
  filter: blur(30px) brightness(.4);
}

.content {
  position: relative;
  text-align: center;
}

img.cover {
  width: min(80vw, 320px);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0,0,0,.6);
}

.loader {
  margin: 24px auto 0;
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255,255,255,.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

p {
  opacity: .7;
  margin-top: 12px;
}
</style>
<script>
setTimeout(() => {
  window.location.href = "${target}";
}, 2000);
</script>
</head>

<body>
<div class="bg"></div>
<div class="content">
  <img class="cover" src="${song.cover}" />
  <div class="loader"></div>
  <p>Opening ${platform === "spotify" ? "Spotify" : "Apple Music"}…</p>
</div>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Kia link server running");
});
