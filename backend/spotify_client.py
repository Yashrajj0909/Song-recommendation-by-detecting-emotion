import os
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from dotenv import load_dotenv
import copy

load_dotenv()

class SpotifyClient:
    def __init__(self):
        client_id = os.getenv("SPOTIFY_CLIENT_ID")
        client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
        
        self.enabled = False
        if client_id and client_secret:
            try:
                auth_manager = SpotifyClientCredentials(client_id=client_id, client_secret=client_secret)
                self.sp = spotipy.Spotify(auth_manager=auth_manager)
                self.enabled = True
                print("Spotify API client initialized.")
            except Exception as e:
                print(f"Failed to initialize Spotify API client: {e}")
        else:
            print("Spotify credentials missing. Using mock data.")

        # Mapping emotions to Spotify seed genres
        self.emotion_to_genres = {
            "happy": ["pop", "party", "dance"],
            "sad": ["sad", "acoustic", "soul"],
            "angry": ["metal", "rock", "hard-rock"],
            "neutral": ["ambient", "chill", "piano"],
            "surprise": ["electronic", "disco", "techno"],
            "disgust": ["blues", "grunge"],
            "fear": ["classical", "soundtrack", "ambient"]
        }

        # Language mapping for search queries
        self.language_to_query = {
            "english": "",
            "hindi": "hindi ",
            "spanish": "spanish ",
            "french": "french ",
            "japanese": "japanese ",
            "korean": "korean "
        }

    def get_tracks(self, emotion, genre=None, language="english", limit=10):
        """
        Fetches tracks from Spotify based on the detected emotion, selected genre, and language.
        Returns a list of {title, artist, album_art, preview_url, track_url, lyric_snippet}
        """
        if not self.enabled:
            return self._get_mock_tracks(emotion, genre, language, limit)

        try:
            # Use the selected genre filter if provided, otherwise use the emotion-based default
            search_genres = [genre] if genre else self.emotion_to_genres.get(emotion, ["pop"])
            lang_prefix = self.language_to_query.get(language.lower(), "")
            
            # Use search for better language and genre combination
            query = f"{lang_prefix}{search_genres[0]}"
            results = self.sp.search(q=query, type='track', limit=limit)
            tracks_data = results["tracks"]["items"]
            
            tracks = []
            for track in tracks_data:
                tracks.append({
                    "title": track["name"],
                    "artist": track["artists"][0]["name"],
                    "album_art": track["album"]["images"][0]["url"] if track["album"]["images"] else "https://picsum.photos/seed/music/200",
                    "preview_url": track["preview_url"],
                    "track_url": track["external_urls"]["spotify"],
                    "lyric_snippet": self._get_mock_lyric(emotion) # API doesn't usually provide lyrics directly
                })
            return tracks
        except Exception as e:
            print(f"Error fetching Spotify recommendations: {e}")
            return self._get_mock_tracks(emotion, genre, language, limit)

    def _get_mock_lyric(self, emotion):
        lyrics = {
            "happy": "Because I'm happy... Clap along if you feel like happiness is the truth",
            "sad": "Hello darkness, my old friend... I've come to talk with you again",
            "angry": "I'm on the highway to hell! No stop signs, speed limit...",
            "neutral": "It's a beautiful day in the neighborhood, a beautiful day for a neighbor",
            "surprise": "I got a feeling... that tonight's gonna be a good night",
            "disgust": "I'm a creep, I'm a weirdo... What the hell am I doing here?",
            "fear": "Is this the real life? Is this just fantasy? Caught in a landslide..."
        }
        return lyrics.get(emotion, "Music is the language of the soul...")

    def _get_mock_tracks(self, emotion, genre=None, language="english", limit=10):
        """Fallback mock data if API is unavailable or credentials missing."""
        # Using verified Spotify CDN URLs or high-quality placeholders
        mock_data = {
            "english": {
                "pop": [
                    {"title": "Happy", "artist": "Pharrell Williams", "album_art": "https://i.scdn.co/image/ab67616d0000b2733969ef6966601f016d44a1e9", "preview_url": None, "track_url": "#"},
                    {"title": "Shake It Off", "artist": "Taylor Swift", "album_art": "https://i.scdn.co/image/ab67616d0000b273679626359f136e09c1551c91", "preview_url": None, "track_url": "#"},
                    {"title": "Uptown Funk", "artist": "Mark Ronson ft. Bruno Mars", "album_art": "https://i.scdn.co/image/ab67616d0000b27378d30e5210c4d29490a06806", "preview_url": None, "track_url": "#"},
                    {"title": "Can't Stop the Feeling!", "artist": "Justin Timberlake", "album_art": "https://i.scdn.co/image/ab67616d0000b27382b683a45c6e8647702a488c", "preview_url": None, "track_url": "#"},
                    {"title": "Flowers", "artist": "Miley Cyrus", "album_art": "https://i.scdn.co/image/ab67616d0000b273f4e2fcf97482931121fe5f1f", "preview_url": None, "track_url": "#"},
                    {"title": "As It Was", "artist": "Harry Styles", "album_art": "https://i.scdn.co/image/ab67616d0000b273b46f74097655d7f353caab14", "preview_url": None, "track_url": "#"},
                    {"title": "Anti-Hero", "artist": "Taylor Swift", "album_art": "https://i.scdn.co/image/ab67616d0000b273bb577c289c6542905a2e6f3b", "preview_url": None, "track_url": "#"},
                    {"title": "Starboy", "artist": "The Weeknd", "album_art": "https://i.scdn.co/image/ab67616d0000b2734718c52efda06656d350914c", "preview_url": None, "track_url": "#"},
                    {"title": "Levitating", "artist": "Dua Lipa", "album_art": "https://i.scdn.co/image/ab67616d0000b273bd26ede130aac0c3a59b4da4", "preview_url": None, "track_url": "#"},
                    {"title": "Blinding Lights", "artist": "The Weeknd", "album_art": "https://i.scdn.co/image/ab67616d0000b273c564917a86307687841c6182", "preview_url": None, "track_url": "#"}
                ],
                "rock": [
                    {"title": "Bohemian Rhapsody", "artist": "Queen", "album_art": "https://i.scdn.co/image/ab67616d0000b273ce64a7d0e34b17208d234a97", "preview_url": None, "track_url": "#"},
                    {"title": "Believer", "artist": "Imagine Dragons", "album_art": "https://i.scdn.co/image/ab67616d0000b2731adb3197022e37905a396e95", "preview_url": None, "track_url": "#"},
                    {"title": "Smells Like Teen Spirit", "artist": "Nirvana", "album_art": "https://i.scdn.co/image/ab67616d0000b273e175a13e536c89d55d64a921", "preview_url": None, "track_url": "#"},
                    {"title": "Sweet Child O' Mine", "artist": "Guns N' Roses", "album_art": "https://i.scdn.co/image/ab67616d0000b27321e064146e66775f0a28308d", "preview_url": None, "track_url": "#"},
                    {"title": "Highway to Hell", "artist": "AC/DC", "album_art": "https://i.scdn.co/image/ab67616d0000b2730b59a6064299763789434551", "preview_url": None, "track_url": "#"},
                    {"title": "Thunderstruck", "artist": "AC/DC", "album_art": "https://i.scdn.co/image/ab67616d0000b27361c561a07655d7f353caab14", "preview_url": None, "track_url": "#"},
                    {"title": "Radioactive", "artist": "Imagine Dragons", "album_art": "https://i.scdn.co/image/ab67616d0000b2734a78c52efda06656d350914c", "preview_url": None, "track_url": "#"},
                    {"title": "Do I Wanna Know?", "artist": "Arctic Monkeys", "album_art": "https://i.scdn.co/image/ab67616d0000b273333ee09a2384a2039a45139d", "preview_url": None, "track_url": "#"},
                    {"title": "Back In Black", "artist": "AC/DC", "album_art": "https://i.scdn.co/image/ab67616d0000b27366b561a07655d7f353caab14", "preview_url": None, "track_url": "#"},
                    {"title": "Paint It, Black", "artist": "The Rolling Stones", "album_art": "https://i.scdn.co/image/ab67616d0000b273760928956973e2a2f854a8", "preview_url": None, "track_url": "#"}
                ],
                "dance": [
                    {"title": "Titanium", "artist": "David Guetta ft. Sia", "album_art": "https://i.scdn.co/image/ab67616d0000b2736969ef6966601f016d44a1e9", "preview_url": None, "track_url": "#"},
                    {"title": "Wake Me Up", "artist": "Avicii", "album_art": "https://i.scdn.co/image/ab67616d0000b2730e64a7d0e34b17208d234a97", "preview_url": None, "track_url": "#"},
                    {"title": "Levels", "artist": "Avicii", "album_art": "https://i.scdn.co/image/ab67616d0000b2730b59a6064299763789434551", "preview_url": None, "track_url": "#"},
                    {"title": "One Kiss", "artist": "Calvin Harris ft. Dua Lipa", "album_art": "https://i.scdn.co/image/ab67616d0000b273c564917a86307687841c6182", "preview_url": None, "track_url": "#"},
                    {"title": "Scary Monsters and Nice Sprites", "artist": "Skrillex", "album_art": "https://i.scdn.co/image/ab67616d0000b27378d30e5210c4d29490a06806", "preview_url": None, "track_url": "#"},
                    {"title": "Lean On", "artist": "Major Lazer", "album_art": "https://i.scdn.co/image/ab67616d0000b273333ee09a2384a2039a45139d", "preview_url": None, "track_url": "#"},
                    {"title": "Animals", "artist": "Martin Garrix", "album_art": "https://i.scdn.co/image/ab67616d0000b27361c561a07655d7f353caab14", "preview_url": None, "track_url": "#"},
                    {"title": "Don't You Worry Child", "artist": "Swedish House Mafia", "album_art": "https://i.scdn.co/image/ab67616d0000b2734a78c52efda06656d350914c", "preview_url": None, "track_url": "#"},
                    {"title": "Clarity", "artist": "Zedd ft. Foxes", "album_art": "https://i.scdn.co/image/ab67616d0000b273bd26ede130aac0c3a59b4da4", "preview_url": None, "track_url": "#"},
                    {"title": "Stay the Night", "artist": "Zedd ft. Hayley Williams", "album_art": "https://i.scdn.co/image/ab67616d0000b273f4e2fcf97482931121fe5f1f", "preview_url": None, "track_url": "#"}
                ],
                "chill": [
                    {"title": "Weightless", "artist": "Marconi Union", "album_art": "https://i.scdn.co/image/ab67616d0000b273315a0928956973e2a2f854a8", "preview_url": None, "track_url": "#"},
                    {"title": "Chill Out", "artist": "Lofi Girl", "album_art": "https://i.scdn.co/image/ab67616d0000b273620067674261763789434551", "preview_url": None, "track_url": "#"},
                    {"title": "River Flows In You", "artist": "Yiruma", "album_art": "https://i.scdn.co/image/ab67616d0000b273c090858e65840a049d5669f6", "preview_url": None, "track_url": "#"},
                    {"title": "Gymnopédie No. 1", "artist": "Erik Satie", "album_art": "https://i.scdn.co/image/ab67616d0000b2734718c52efda06656d350914c", "preview_url": None, "track_url": "#"},
                    {"title": "Claire de Lune", "artist": "Claude Debussy", "album_art": "https://i.scdn.co/image/ab67616d0000b273bb577c289c6542905a2e6f3b", "preview_url": None, "track_url": "#"},
                    {"title": "Midnight City", "artist": "M83", "album_art": "https://i.scdn.co/image/ab67616d0000b273b46f74097655d7f353caab14", "preview_url": None, "track_url": "#"},
                    {"title": "Space Song", "artist": "Beach House", "album_art": "https://i.scdn.co/image/ab67616d0000b273295964860477093375865f37", "preview_url": None, "track_url": "#"},
                    {"title": "Wait", "artist": "M83", "album_art": "https://i.scdn.co/image/ab67616d0000b273f089182312675971a1793735", "preview_url": None, "track_url": "#"},
                    {"title": "Lullaby", "artist": "Low", "album_art": "https://i.scdn.co/image/ab67616d0000b27382b683a45c6e8647702a488c", "preview_url": None, "track_url": "#"},
                    {"title": "Sunset Lover", "artist": "Petit Biscuit", "album_art": "https://i.scdn.co/image/ab67616d0000b27370889218d6e355c7a42095f5", "preview_url": None, "track_url": "#"}
                ]
            },
            "hindi": {
                "pop": [
                    {"title": "Zinda", "artist": "Siddharth Mahadevan", "album_art": "https://i.scdn.co/image/ab67616d0000b27303d8f8d95103a8d42a42e51a", "preview_url": None, "track_url": "#"},
                    {"title": "Kala Chashma", "artist": "Badshah", "album_art": "https://i.scdn.co/image/ab67616d0000b273e90435947a505f03932e67f0", "preview_url": None, "track_url": "#"},
                    {"title": "Dil Chahta Hai", "artist": "Shankar Mahadevan", "album_art": "https://i.scdn.co/image/ab67616d0000b27339d10e5210c4d29490a06806", "preview_url": None, "track_url": "#"},
                    {"title": "London Thumakda", "artist": "Labh Janjua", "album_art": "https://i.scdn.co/image/ab67616d0000b27378d30e5210c4d29490a06806", "preview_url": None, "track_url": "#"},
                    {"title": "Badri Ki Dulhania", "artist": "Dev Negi", "album_art": "https://i.scdn.co/image/ab67616d0000b273f4e2fcf97482931121fe5f1f", "preview_url": None, "track_url": "#"},
                    {"title": "Jai Ho", "artist": "A.R. Rahman", "album_art": "https://i.scdn.co/image/ab67616d0000b273c564917a86307687841c6182", "preview_url": None, "track_url": "#"},
                    {"title": "Kar Gayi Chull", "artist": "Badshah", "album_art": "https://i.scdn.co/image/ab67616d0000b273333ee09a2384a2039a45139d", "preview_url": None, "track_url": "#"},
                    {"title": "The Humma Song", "artist": "Badshah", "album_art": "https://i.scdn.co/image/ab67616d0000b27361c561a07655d7f353caab14", "preview_url": None, "track_url": "#"},
                    {"title": "Aankh Marey", "artist": "Neha Kakkar", "album_art": "https://i.scdn.co/image/ab67616d0000b273bd26ede130aac0c3a59b4da4", "preview_url": None, "track_url": "#"},
                    {"title": "High Rated Gabru", "artist": "Guru Randhawa", "album_art": "https://i.scdn.co/image/ab67616d0000b2734a78c52efda06656d350914c", "preview_url": None, "track_url": "#"}
                ],
                "rock": [
                    {"title": "Rock On!!", "artist": "Farhan Akhtar", "album_art": "https://i.scdn.co/image/ab67616d0000b2731adb3197022e37905a396e95", "preview_url": None, "track_url": "#"},
                    {"title": "Nadaan Parindey", "artist": "Mohit Chauhan", "album_art": "https://i.scdn.co/image/ab67616d0000b273295964860477093375865f37", "preview_url": None, "track_url": "#"},
                    {"title": "Sadda Haq", "artist": "Mohit Chauhan", "album_art": "https://i.scdn.co/image/ab67616d0000b273f089182312675971a1793735", "preview_url": None, "track_url": "#"},
                    {"title": "Pichle Saat Dinon Mein", "artist": "Farhan Akhtar", "album_art": "https://i.scdn.co/image/ab67616d0000b27382b683a45c6e8647702a488c", "preview_url": None, "track_url": "#"},
                    {"title": "Bhaag D.K. Bose", "artist": "Ram Sampath", "album_art": "https://i.scdn.co/image/ab67616d0000b27370889218d6e355c7a42095f5", "preview_url": None, "track_url": "#"},
                    {"title": "Dhuaan", "artist": "Arijit Singh", "album_art": "https://i.scdn.co/image/ab67616d0000b273bb577c289c6542905a2e6f3b", "preview_url": None, "track_url": "#"},
                    {"title": "Socha Hai", "artist": "Farhan Akhtar", "album_art": "https://i.scdn.co/image/ab67616d0000b273ce64a7d0e34b17208d234a97", "preview_url": None, "track_url": "#"},
                    {"title": "Dil Mere", "artist": "The Local Train", "album_art": "https://i.scdn.co/image/ab67616d0000b27361c561a07655d7f353caab14", "preview_url": None, "track_url": "#"},
                    {"title": "Choo Lo", "artist": "The Local Train", "album_art": "https://i.scdn.co/image/ab67616d0000b273333ee09a2384a2039a45139d", "preview_url": None, "track_url": "#"},
                    {"title": "Aaftab", "artist": "The Local Train", "album_art": "https://i.scdn.co/image/ab67616d0000b2734a78c52efda06656d350914c", "preview_url": None, "track_url": "#"}
                ],
                "dance": [
                    {"title": "Baby Doll", "artist": "Kanika Kapoor", "album_art": "https://i.scdn.co/image/ab67616d0000b273bd26ede130aac0c3a59b4da4", "preview_url": None, "track_url": "#"},
                    {"title": "Abhi Toh Party Shuru Hui Hai", "artist": "Badshah", "album_art": "https://i.scdn.co/image/ab67616d0000b273f4e2fcf97482931121fe5f1f", "preview_url": None, "track_url": "#"},
                    {"title": "Garmi", "artist": "Neha Kakkar", "album_art": "https://i.scdn.co/image/ab67616d0000b273c564917a86307687841c6182", "preview_url": None, "track_url": "#"},
                    {"title": "Ghungroo", "artist": "Arijit Singh", "album_art": "https://i.scdn.co/image/ab67616d0000b273333ee09a2384a2039a45139d", "preview_url": None, "track_url": "#"},
                    {"title": "Badtameez Dil", "artist": "Benny Dayal", "album_art": "https://i.scdn.co/image/ab67616d0000b27378d30e5210c4d29490a06806", "preview_url": None, "track_url": "#"},
                    {"title": "Makhna", "artist": "Yo Yo Honey Singh", "album_art": "https://i.scdn.co/image/ab67616d0000b27361c561a07655d7f353caab14", "preview_url": None, "track_url": "#"},
                    {"title": "Coca Cola", "artist": "Tony Kakkar", "album_art": "https://i.scdn.co/image/ab67616d0000b2734a78c52efda06656d350914c", "preview_url": None, "track_url": "#"},
                    {"title": "Dilbar", "artist": "Neha Kakkar", "album_art": "https://i.scdn.co/image/ab67616d0000b273bd26ede130aac0c3a59b4da4", "preview_url": None, "track_url": "#"},
                    {"title": "Saki Saki", "artist": "Neha Kakkar", "album_art": "https://i.scdn.co/image/ab67616d0000b273f4e2fcf97482931121fe5f1f", "preview_url": None, "track_url": "#"},
                    {"title": "Kamariya", "artist": "Darshan Raval", "album_art": "https://i.scdn.co/image/ab67616d0000b273c564917a86307687841c6182", "preview_url": None, "track_url": "#"}
                ],
                "chill": [
                    {"title": "Pee Loon", "artist": "Mohit Chauhan", "album_art": "https://i.scdn.co/image/ab67616d0000b273295964860477093375865f37", "preview_url": None, "track_url": "#"},
                    {"title": "Raataan Lambiyan", "artist": "Jubin Nautiyal", "album_art": "https://i.scdn.co/image/ab67616d0000b273f089182312675971a1793735", "preview_url": None, "track_url": "#"},
                    {"title": "Dil Diyan Gallan", "artist": "Atif Aslam", "album_art": "https://i.scdn.co/image/ab67616d0000b27382b683a45c6e8647702a488c", "preview_url": None, "track_url": "#"},
                    {"title": "Tum Se Hi", "artist": "Mohit Chauhan", "album_art": "https://i.scdn.co/image/ab67616d0000b27370889218d6e355c7a42095f5", "preview_url": None, "track_url": "#"},
                    {"title": "Kabira", "artist": "Arijit Singh", "album_art": "https://i.scdn.co/image/ab67616d0000b273bb577c289c6542905a2e6f3b", "preview_url": None, "track_url": "#"},
                    {"title": "Kesariya", "artist": "Arijit Singh", "album_art": "https://i.scdn.co/image/ab67616d0000b273ce64a7d0e34b17208d234a97", "preview_url": None, "track_url": "#"},
                    {"title": "Tera Ban Jaunga", "artist": "Akhil Sachdeva", "album_art": "https://i.scdn.co/image/ab67616d0000b27361c561a07655d7f353caab14", "preview_url": None, "track_url": "#"},
                    {"title": "Makhna", "artist": "Arijit Singh", "album_art": "https://i.scdn.co/image/ab67616d0000b273333ee09a2384a2039a45139d", "preview_url": None, "track_url": "#"},
                    {"title": "Qaafirana", "artist": "Arijit Singh", "album_art": "https://i.scdn.co/image/ab67616d0000b2734a78c52efda06656d350914c", "preview_url": None, "track_url": "#"},
                    {"title": "Iktara", "artist": "Amit Trivedi", "album_art": "https://i.scdn.co/image/ab67616d0000b273bd26ede130aac0c3a59b4da4", "preview_url": None, "track_url": "#"}
                ]
            }
        }
        
        lang_data = mock_data.get(language.lower(), mock_data["english"])
        
        # Deep copy to avoid modifying the original mock data
        if genre and genre.lower() in lang_data:
            res = copy.deepcopy(lang_data[genre.lower()])
        else:
            emotion_genres = self.emotion_to_genres.get(emotion, ["pop"])
            res = []
            for g in emotion_genres:
                if g in lang_data:
                    res.extend(copy.deepcopy(lang_data[g]))
            
            if not res:
                res = copy.deepcopy(lang_data.get("pop", []))

        # Assign sample preview URLs to all mock tracks
        sample_urls = [
            "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
            "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
            "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
            "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"
        ]
        
        for i, track in enumerate(res):
            track["preview_url"] = sample_urls[i % len(sample_urls)]
            track["lyric_snippet" ] = self._get_mock_lyric(emotion)

        # If still too few, pad with chill
        if len(res) < limit:
            res.extend(copy.deepcopy(lang_data.get("chill", [])))
            
        return res[:limit]
