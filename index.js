import express from "express";

const app = express();

/**
 * Simple track database
 * In real life you can replace this with:
 * - JSON file
 * - database
 * - dashboard later
 */
const tracks = {
  "sunset": {
    spotify: "https://open.spotify.com/track/SPOTIFY_ID",
    apple: "https://music.apple.com/track/APPLE_ID"
  },
  "night-drive": {
    spotify: "https://open.spotify.com/track/SPOTIFY_ID",
    apple: "https://music.apple.com/track/APPLE_ID"
  }
};

app.get("/t/:track", (req, res) => {
  const { track } = req.params;
  const data = tracks[track];

  if (!data) {
    return res.status(404).send("Track not found");
  }

  const ua = req.headers["user-agent"]?.toLowerCase() || "";
  const isApple = ua.includes("iphone") || ua.includes("ipad") || ua.includes("mac");

  const redirectUrl = isApple ? data.apple : data.spotify;
  res.redirect(302, redirectUrl);
});

app.listen(process.env.PORT || 3000, () =>
  console.log("Redirect server running")
);
