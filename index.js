import express from "express";
import fetch from "node-fetch";
import slugify from "slugify";

const app = express();
app.use(express.json());

// Simple in-memory storage
const songs = {};

// ---- HELPER FUNCTION (GOES HERE) ----
async function getSpotifyMeta(spotifyUrl) {
  const res = await fetch(
    `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch Spotify metadata");
  }

  const data = await res.json();

  return {
    title: data.title,
    cover: data.thumbnail_url
  };
}

// ---- ADMIN: ADD SONG ----
app.post("/songs", async (req, res) => {
  try {
    const { spotifyUrl, appleMusicUrl } = req.body;

    if (!spotifyUrl || !appleMusicUrl) {
      return res.status(400).json({
        error: "spotifyUrl and appleMusicUrl are required"
      });
    }

    const meta = await getSpotifyMeta(spotifyUrl);

    const slug = slugify(meta.title, {
      lower: true,
      strict: true
    });

    songs[slug] = {
      title: meta.title,
      cover: meta.cover,
      spotifyUrl,
      appleMusicUrl
    };

    res.json({
      title: meta.title,
      cover: meta.cover,
      urls: {
        spotify: `https://kia.link/${slug}/spotify`,
        apple: `https://kia.link/${slug}/apple`
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- FAN LINKS ----
app.get("/:slug/spotify", (req, res) => {
  const song = songs[req.params.slug];
  if (!song) return res.status(404).send("Not found");

  res.redirect(302, song.spotifyUrl);
});

app.get("/:slug/apple", (req, res) => {
  const song = songs[req.params.slug];
  if (!song) return res.status(404).send("Not found");

  res.redirect(302, song.appleMusicUrl);
});

// ---- START SERVER ----
app.listen(process.env.PORT || 3000, () => {
  console.log("Kia link server running");
});
