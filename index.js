import express from 'express';
import fetch from 'node-fetch';
import slugify from 'slugify';

const app = express();
app.use(express.json());

const songs = {};

// Helper to get Spotify metadata via oEmbed
async function getSpotifyMeta(spotifyUrl) {
    try {
        const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`;
        const response = await fetch(oembedUrl);
        if (!response.ok) throw new Error(`Spotify oEmbed failed: ${response.status}`);
        const data = await response.json();
        return {
            title: data.title || 'Unknown Track',
            cover: data.thumbnail_url || null
        };
    } catch (error) {
        console.error('Error fetching Spotify metadata:', error);
        return { title: 'Unknown Track', cover: null };
    }
}

// Admin endpoint to add a song
app.post('/songs', async (req, res) => {
    const { spotifyUrl, appleMusicUrl } = req.body;
    
    if (!spotifyUrl || !appleMusicUrl) {
        return res.status(400).json({ error: 'Both spotifyUrl and appleMusicUrl are required' });
    }

    try {
        // Get metadata from Spotify
        const { title, cover } = await getSpotifyMeta(spotifyUrl);
        
        // Create slug from title
        const slug = slugify(title, { lower: true, strict: true });
        
        // Store the song
        songs[slug] = {
            title,
            cover,
            spotifyUrl,
            appleMusicUrl,
            createdAt: new Date().toISOString()
        };

        // Get the current domain dynamically
        const protocol = req.protocol;
        const host = req.get('host');
        const baseUrl = `${protocol}://${host}`;
        
        res.json({
            title,
            cover,
            urls: {
                spotify: `${baseUrl}/${slug}/spotify`,
                apple: `${baseUrl}/${slug}/apple`
            }
        });
    } catch (error) {
        console.error('Error processing song:', error);
        res.status(500).json({ error: 'Failed to process song' });
    }
});

// Fan endpoints
app.get('/:slug/spotify', (req, res) => {
    const { slug } = req.params;
    const song = songs[slug];
    
    if (!song) {
        return res.status(404).json({ error: 'Song not found' });
    }
    
    res.redirect(302, song.spotifyUrl);
});

app.get('/:slug/apple', (req, res) => {
    const { slug } = req.params;
    const song = songs[slug];
    
    if (!song) {
        return res.status(404).json({ error: 'Song not found' });
    }
    
    res.redirect(302, song.appleMusicUrl);
});

// Optional: List all songs (for debugging)
app.get('/songs', (req, res) => {
    res.json(songs);
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Smart Link Service for Artist Kia',
        endpoints: {
            admin: 'POST /songs',
            fan: 'GET /:slug/spotify and GET /:slug/apple',
            list: 'GET /songs'
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
