import express from "express";
import fetch from "node-fetch";
import slugify from "slugify";

const app = express();
app.use(express.json());

const ARTIST = {
  name: "KIA",
  avatar: "https://i.scdn.co/image/ab67616100005174709b394e256c344cb2dbff11", // change later
  bio: "Young"
};

let mainLinks = [
  { label: "Instagram", url: "https://instagram.com/" },
  { label: "Spotify", url: "https://spotify.com/" }
];

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

/* =========================
   Admin
========================= */

app.post("/api/songs", async (req, res) => {
  const { spotifyUrl, appleMusicUrl } = req.body;
  if (!spotifyUrl || !appleMusicUrl) {
    return res.status(400).json({ error: "Both URLs required" });
  }

  const meta = await getSpotifyMeta(spotifyUrl);
  const slug = slugify(meta.title, { lower: true, strict: true });

  songs[slug] = {
    slug,
    title: meta.title,
    cover: meta.cover,
    spotifyUrl,
    appleMusicUrl
  };

  res.json({ success: true, song: songs[slug] });
});

app.put("/api/links", (req, res) => {
  const { links } = req.body;

  if (!Array.isArray(links)) {
    return res.status(400).json({ error: "Links must be an array" });
  }

  mainLinks = links.filter(l => l.label && l.url);
  res.json({ success: true, mainLinks });
});

/* =========================
   MAIN PROFILE PAGE
========================= */

app.get("/", (req, res) => {
  const linksHtml = mainLinks
    .map(
      l => `<a href="${l.url}" target="_blank" rel="noopener">${l.label}</a>`
    )
    .join("");

  const songCards = Object.values(songs)
    .map(
      s => `
      <a class="card" href="/${s.slug}">
        <img src="${s.cover}" />
        <h3>${s.title}</h3>
      </a>`
    )
    .join("");

  res.send(`<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${ARTIST.name}</title>

<style>
:root {
  --bg: #0b0b0b;
  --fg: white;
  --card: rgba(255,255,255,0.05);
}

.light {
  --bg: #f4f4f4;
  --fg: #000;
  --card: white;
}

body {
  margin: 0;
  font-family: Inter, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--fg);
  overflow-x: hidden;
}

/* Animated gradient */
.gradient {
  position: fixed;
  inset: 0;
  background: linear-gradient(120deg, #7f00ff, #e100ff, #00c6ff);
  background-size: 400% 400%;
  animation: move 15s ease infinite;
  opacity: .25;
  z-index: -1;
}

@keyframes move {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

header {
  text-align: center;
  padding: 48px 24px 24px;
}

header img {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 16px;
}

header h1 { margin: 0; letter-spacing: 2px; }

header p {
  opacity: .7;
  max-width: 400px;
  margin: 12px auto 0;
}

/* MAIN LINKS */
.links {
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

.links a {
  padding: 12px 18px;
  border-radius: 999px;
  background: rgba(255,255,255,0.15);
  color: inherit;
  text-decoration: none;
  font-weight: 600;
}

/* SONG GRID */
.grid {
  max-width: 900px;
  margin: 20px auto 60px;
  padding: 20px;
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.card {
  text-decoration: none;
  color: inherit;
  background: var(--card);
  border-radius: 18px;
  overflow: hidden;
  transition: transform .2s;
}

.card:hover { transform: translateY(-4px); }

.card img {
  width: 100%;
  display: block;
}

.card h3 {
  padding: 14px;
  font-size: 15px;
}

/* THEME TOGGLE */
.toggle {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
}
</style>

<script>
function toggleTheme() {
  const t = document.body.classList.toggle("light");
  localStorage.setItem("theme", t ? "light" : "dark");
}

document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.theme === "light") {
    document.body.classList.add("light");
  }
});
</script>
</head>

<body>
<div class="gradient"></div>

<button class="toggle" onclick="toggleTheme()">⏾</button>

<header>
  <img src="${ARTIST.avatar}" />
  <h1>${ARTIST.name}</h1>
  <p>${ARTIST.bio}</p>

  <div class="links">
    ${linksHtml || "<span style='opacity:.4'>No links yet</span>"}
  </div>
</header>

<div class="grid">
  ${songCards || "<p style='opacity:.4;text-align:center'>No songs yet</p>"}
</div>

</body>
</html>`);
});

/* =========================
   REDIRECT LOADING PAGE
========================= */

app.get("/:slug", (req, res) => {
  const song = songs[req.params.slug];
  if (!song) return res.status(404).send("Not found");

  res.send(`<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${song.title}</title>

<style>
body {
  margin: 0;
  background: black;
  color: white;
  font-family: Inter, sans-serif;
}

.bg {
  position: fixed;
  inset: 0;
  background-image: url("${song.cover}");
  background-size: cover;
  background-position: center;
  filter: blur(40px) brightness(.3);
}

main {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

img {
  width: min(80vw, 320px);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0,0,0,.6);
}

h1 { margin: 24px 0 8px; }

p { opacity: .6; margin-bottom: 24px; }

.buttons {
  display: flex;
  gap: 16px;
}

a {
  padding: 14px 24px;
  border-radius: 14px;
  font-weight: 600;
  text-decoration: none;
}

.spotify { background: #1db954; color: black; }
.apple { background: white; color: black; }
</style>
</head>

<body>
<div class="bg"></div>

<main>
  <img src="${song.cover}" />
  <h1>${song.title}</h1>
  <p>${ARTIST.name}</p>
  <div class="buttons">
    <a class="spotify" href="/${song.slug}/spotify">Spotify</a>
    <a class="apple" href="/${song.slug}/apple">Apple Music</a>
  </div>
</main>
</body>
</html>`);
});

/* =========================
   PLATFORM REDIRECTS
========================= */

app.get("/:slug/spotify", (req, res) => {
  const song = songs[req.params.slug];
  if (!song) return res.status(404).send("Not found");
  res.redirect(song.spotifyUrl);
});

app.get("/:slug/apple", (req, res) => {
  const song = songs[req.params.slug];
  if (!song) return res.status(404).send("Not found");
  res.redirect(song.appleMusicUrl);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Kia link server running");
});
