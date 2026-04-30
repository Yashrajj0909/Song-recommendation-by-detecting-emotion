const video = document.getElementById('webcam');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const trackList = document.getElementById('track-list');
const moodValue = document.getElementById('mood-value');
const confidenceBar = document.getElementById('confidence-bar');
const engineStatus = document.getElementById('engine-status');
const contextualTitle = document.getElementById('contextual-title');

// Manual Override Elements
const manualMoodBtn = document.getElementById('manual-mood-btn');
const moodOptions = document.getElementById('mood-options');
const moodButtons = document.querySelectorAll('#mood-options button');

// Language Selector
const languageSelect = document.getElementById('language-select');

// Reset Button
const resetEngineBtn = document.getElementById('reset-engine-btn');

// Player Elements
const nowPlayingBar = document.getElementById('now-playing-bar');
const playerAlbumArt = document.getElementById('player-album-art');
const playerTrackTitle = document.getElementById('player-track-title');
const playerTrackArtist = document.getElementById('player-track-artist');
const mainPlayBtn = document.getElementById('main-play-btn');
const playerLikeBtn = document.getElementById('player-like-btn');
const playerProgressBar = document.getElementById('player-progress-bar');
const playerProgressFill = document.getElementById('player-progress-fill');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl = document.getElementById('total-time');
const spotifyLink = document.getElementById('spotify-link');

// View Elements
const mainPlaylistView = document.getElementById('main-playlist-view');
const profileFavoritesView = document.getElementById('profile-favorites-view');
const favoritesTrackList = document.getElementById('favorites-track-list');
const navHome = document.getElementById('nav-home');
const navProfile = document.getElementById('nav-profile');

// Genre Filter Elements
const filterButtons = document.querySelectorAll('.filter-btn');

// Camera Controls
const openCameraBtn = document.getElementById('open-camera-btn');
const closeCameraBtn = document.getElementById('close-camera-btn');
const viewfinderContainer = document.querySelector('.viewfinder-container');

let lastEmotion = null;
let currentGenre = 'pop';
let currentLanguage = 'english';
let currentActivity = 'none';
let ws = null;
let historyChart = null;
let isManualMode = false;
let currentTrackList = [];
let currentTrackIndex = -1;
let cameraStream = null;
let favoriteTracks = JSON.parse(localStorage.getItem('favoriteTracks') || '[]');
let currentTrack = null;

// V2 State
let showLandmarks = false;
let moodShiftValue = 0;
let isPartyMode = false;
let genreHistory = { pop: 0, rock: 0, dance: 0, chill: 0 };
let genreHeatmap = null;

// Environment Data
const weatherData = [
    { temp: "22°C", desc: "Clear", icon: "☀️" },
    { temp: "18°C", desc: "Cloudy", icon: "☁️" },
    { temp: "24°C", desc: "Sunny", icon: "☀️" },
    { temp: "15°C", desc: "Rainy", icon: "🌧️" }
];

// Audio Visualizer State
let audioCtx = null;
let analyser = null;
let source = null;
let animationId = null;
let currentAudio = null;

// Locking Mechanism
let isLocked = false;
let lockStartTime = null;
let currentLockMood = null;
const LOCK_DURATION = 5000; // 5 seconds

// Anti-flicker: Emotion stabilization
let emotionBuffer = [];
const BUFFER_SIZE = 3; 

const moodConfig = {
    happy: { title: "Upbeat & Energetic", color: "#ffeb3b", bg1: "#FFD700", bg2: "#FF8C00" },
    sad: { title: "Calm & Lo-Fi", color: "#2196f3", bg1: "#1a237e", bg2: "#4a148c" },
    angry: { title: "Intense & Powerful", color: "#f44336", bg1: "#b71c1c", bg2: "#7f0000" },
    neutral: { title: "Chill & Focused", color: "#00f2ff", bg1: "#87CEEB", bg2: "#00BFFF" },
    surprise: { title: "Fresh & Unexpected", color: "#e91e63", bg1: "#e91e63", bg2: "#9c27b0" },
    disgust: { title: "Deep & Raw", color: "#795548", bg1: "#3e2723", bg2: "#1b5e20" },
    fear: { title: "Atmospheric & Moody", color: "#673ab7", bg1: "#4a148c", bg2: "#311b92" }
};

// Initialize Webcam
async function initWebcam() {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 720 }, 
                height: { ideal: 720 },
                aspectRatio: { ideal: 1 }
            } 
        });
        video.srcObject = cameraStream;
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            engineStatus.innerText = "ENGINE ACTIVE";
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                initWebSocket();
            } else {
                captureAndSend();
            }
        };
        viewfinderContainer.classList.remove('hidden');
        openCameraBtn.classList.add('hidden');
    } catch (err) {
        console.error("Error accessing webcam:", err);
        engineStatus.innerText = "CAMERA ERROR";
        engineStatus.parentElement.classList.add('error');
    }
}

function stopWebcam() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    video.srcObject = null;
    viewfinderContainer.classList.add('hidden');
    openCameraBtn.classList.remove('hidden');
    engineStatus.innerText = "CAMERA OFF";
}

// Update Time and Weather
function updateEnvironment() {
    const now = new Date();
    const timeClock = document.getElementById('current-time-clock');
    const dateEl = document.getElementById('current-date');
    
    if (timeClock) timeClock.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (dateEl) dateEl.innerText = now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

    if (!window.lastWeatherUpdate || now - window.lastWeatherUpdate > 600000) {
        const weather = weatherData[Math.floor(Math.random() * weatherData.length)];
        const iconEl = document.getElementById('weather-icon');
        const tempEl = document.getElementById('weather-temp');
        const descEl = document.getElementById('weather-desc');
        if (iconEl) iconEl.innerText = weather.icon;
        if (tempEl) tempEl.innerText = weather.temp;
        if (descEl) descEl.innerText = weather.desc;
        window.lastWeatherUpdate = now;
    }
}

// Initialize Genre Heatmap
function initGenreHeatmap() {
    const canvas = document.getElementById('genreHeatmap');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    genreHeatmap = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: ['Pop', 'Rock', 'Dance', 'Chill'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: [
                    'rgba(0, 242, 255, 0.5)',
                    'rgba(255, 235, 59, 0.5)',
                    'rgba(244, 67, 54, 0.5)',
                    'rgba(33, 150, 243, 0.5)'
                ],
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    display: false
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#fff', font: { size: 10 } }
                }
            }
        }
    });
}

function updateGenreHeatmap(genre) {
    if (!genreHeatmap) return;
    const index = ['pop', 'rock', 'dance', 'chill'].indexOf(genre.toLowerCase());
    if (index !== -1) {
        genreHistory[genre.toLowerCase()]++;
        genreHeatmap.data.datasets[0].data[index] = genreHistory[genre.toLowerCase()];
        genreHeatmap.update();
    }
}

// Initialize WebSocket
function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}/ws/emotion`);

    ws.onopen = () => {
        console.log("WebSocket connected");
        captureAndSend();
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (!isManualMode) {
            handleEmotionResult(data);
        }
    };

    ws.onclose = () => {
        console.log("WebSocket disconnected, retrying...");
        setTimeout(initWebSocket, 2000);
    };
}

// Capture frame and send to backend
function captureAndSend() {
    if (ws && ws.readyState === WebSocket.OPEN && !isManualMode && cameraStream) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(video, 0, 0);
        
        const base64Frame = tempCanvas.toDataURL('image/jpeg', 0.8);
        ws.send(JSON.stringify({
            image: base64Frame,
            party_mode: isPartyMode
        }));
    }
    if (cameraStream) {
        setTimeout(captureAndSend, 300);
    }
}

// Handle results from backend
function handleEmotionResult(data) {
    if (isLocked) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (data.activity) {
        updateActivityBadge(data.activity);
        currentActivity = data.activity;
    }

    if (data.landmarks && showLandmarks) {
        drawLandmarkMesh(data.landmarks);
    }

    if (data.emotion) {
        engineStatus.innerText = isPartyMode ? "PARTY MODE" : "ANALYZING...";
        
        updateMicroExpressions(data.raw_emotions || { [data.emotion]: data.confidence });

        emotionBuffer.push(data.emotion);
        if (emotionBuffer.length > BUFFER_SIZE) emotionBuffer.shift();

        const stabilizedEmotion = getMostFrequent(emotionBuffer);
        
        if (stabilizedEmotion === currentLockMood) {
            const elapsed = Date.now() - lockStartTime;
            if (elapsed >= LOCK_DURATION) {
                isLocked = true;
                lockStartTime = null;
                engineStatus.innerText = "MOOD FIXED";
                showLockedUI(stabilizedEmotion);
                return;
            }
            updateLockProgress(elapsed);
        } else {
            currentLockMood = stabilizedEmotion;
            lockStartTime = Date.now();
            updateLockProgress(0);
        }

        updateMoodUI(stabilizedEmotion, data.confidence);

        if (stabilizedEmotion !== lastEmotion) {
            fetchRecommendations(stabilizedEmotion);
            lastEmotion = stabilizedEmotion;
        }
    } else {
        engineStatus.innerText = "SCANNING...";
        resetLockProgress();
    }
}

function updateActivityBadge(activity) {
    const badge = document.getElementById('activity-badge');
    if (!badge) {
        // Create it if it doesn't exist
        const container = document.querySelector('.mood-result-panel');
        const badgeHTML = `
            <div id="activity-badge" class="activity-badge">
                <span class="icon">👤</span>
                <span class="label">Activity:</span>
                <span class="value">${activity.toUpperCase()}</span>
            </div>
        `;
        container.insertAdjacentHTML('afterbegin', badgeHTML);
        return;
    }
    const iconMap = {
        sitting: "🪑",
        walking: "🚶",
        working: "💻"
    };
    badge.querySelector('.icon').innerText = iconMap[activity] || "👤";
    badge.querySelector('.value').innerText = activity.toUpperCase();
    badge.className = `activity-badge activity-${activity}`;
}

function drawLandmarkMesh(landmarks) {
    if (!landmarks) return;

    ctx.strokeStyle = 'rgba(0, 242, 255, 0.4)';
    ctx.lineWidth = 0.5;

    // MediaPipe 468 landmarks
    // We can draw a subset or a mesh
    // Let's draw dots for all and lines for the "expert" 68-point feel
    
    // Draw all points as tiny dots
    ctx.fillStyle = 'rgba(0, 242, 255, 0.6)';
    landmarks.forEach((lm, i) => {
        const px = lm[0] * canvas.width;
        const py = lm[1] * canvas.height;
        
        // Only draw certain points for clarity or draw all faintly
        ctx.beginPath();
        ctx.arc(px, py, 0.5, 0, 2 * Math.PI);
        ctx.fill();
    });

    // Draw connecting lines for facial features (simplified mesh)
    const drawConnection = (indices) => {
        ctx.beginPath();
        for (let i = 0; i < indices.length; i++) {
            const lm = landmarks[indices[i]];
            const px = lm[0] * canvas.width;
            const py = lm[1] * canvas.height;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
    };

    // Lips
    drawConnection([61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 61]);
    // Eyes
    drawConnection([33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33]);
    drawConnection([362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398, 362]);
    // Face Oval
    drawConnection([10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10]);
}

function updateMicroExpressions(emotions) {
    const container = document.getElementById('micro-expressions');
    if (!container) return;
    
    const sorted = Object.entries(emotions).sort((a, b) => b[1] - a[1]).slice(0, 5);
    
    container.innerHTML = `
        <div class="probability-metrics">
            <div class="metrics-header">Probability Metrics</div>
            ${sorted.map(([emotion, score]) => `
                <div class="metric-row">
                    <span class="metric-label">${emotion.toUpperCase()}</span>
                    <div class="metric-bar-bg">
                        <div class="metric-bar-fill" style="width: ${Math.round(score * 100)}%; background: ${moodConfig[emotion]?.color || '#fff'}"></div>
                    </div>
                    <span class="metric-value">${Math.round(score * 100)}%</span>
                </div>
            `).join('')}
        </div>
    `;
}

function updateLockProgress(elapsed) {
    const container = document.getElementById('lock-progress-container');
    const fill = document.getElementById('lock-progress-fill');
    if (!container || !fill) return;
    
    container.classList.remove('hidden');
    const progress = (elapsed / LOCK_DURATION) * 100;
    fill.style.width = `${progress}%`;
}

function resetLockProgress() {
    const container = document.getElementById('lock-progress-container');
    const fill = document.getElementById('lock-progress-fill');
    if (!container || !fill) return;
    
    container.classList.add('hidden');
    fill.style.width = '0%';
    lockStartTime = null;
    currentLockMood = null;
}

function showLockedUI(emotion) {
    const progressContainer = document.getElementById('lock-progress-container');
    const lockedBadge = document.getElementById('mood-locked-badge');
    const moodBadge = document.getElementById('current-mood-badge');
    if (progressContainer) progressContainer.classList.add('hidden');
    if (lockedBadge) lockedBadge.classList.remove('hidden');
    if (moodBadge) moodBadge.classList.add('locked');
}

function resetAnalysis() {
    isLocked = false;
    isManualMode = false;
    lastEmotion = null;
    emotionBuffer = [];
    resetLockProgress();
    const lockedBadge = document.getElementById('mood-locked-badge');
    const moodBadge = document.getElementById('current-mood-badge');
    if (lockedBadge) lockedBadge.classList.add('hidden');
    if (moodBadge) moodBadge.classList.remove('locked');
    engineStatus.innerText = "ENGINE ACTIVE";
}

function getMostFrequent(arr) {
    if (arr.length === 0) return null;
    const counts = arr.reduce((acc, val) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
    }, {});
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}

function updateMoodUI(emotion, confidence) {
    const config = moodConfig[emotion] || moodConfig.neutral;
    
    moodValue.innerText = emotion.toUpperCase();
    const percentage = Math.round(confidence * 100);
    confidenceBar.style.width = `${percentage}%`;
    const percentageEl = document.getElementById('confidence-percentage');
    if (percentageEl) percentageEl.innerText = `${percentage}%`;
    contextualTitle.innerText = config.title;
    
    document.documentElement.style.setProperty('--accent-color', config.color);
    
    // Update background based on mood
    if (config.bg1 && config.bg2) {
        document.documentElement.style.setProperty('--current-bg-1', config.bg1);
        document.documentElement.style.setProperty('--current-bg-2', config.bg2);
    }
}

async function fetchRecommendations(emotion) {
    try {
        const response = await fetch(`/api/recommend?emotion=${emotion}&genre=${currentGenre}&language=${currentLanguage}&shift=${moodShiftValue}&activity=${currentActivity}`);
        const data = await response.json();
        currentTrackList = data.tracks; 
        renderTracks(data.tracks);
    } catch (err) {
        console.error("Error fetching tracks:", err);
    }
}

function renderTracks(tracks) {
    if (!tracks || tracks.length === 0) {
        trackList.innerHTML = '<p class="error">No tracks found for this mood.</p>';
        return;
    }

    trackList.innerHTML = tracks.map((track, index) => {
        // Mock some lyric snippets if they don't exist
        const lyrics = [
            "Sun is shining, weather is sweet...",
            "Every little thing is gonna be alright",
            "I feel it coming, babe",
            "Dancing in the moonlight",
            "Just another day in paradise"
        ];
        const snippet = track.lyric_snippet || lyrics[index % lyrics.length];
        
        return `
            <div class="track-card ${currentTrackIndex === index ? 'playing' : ''}" onclick="selectTrack(${index})">
                <div class="track-visualizer-container">
                    <img src="${track.album_art || 'https://picsum.photos/seed/music/80'}" 
                         class="track-art" 
                         alt="Album Art"
                         onerror="this.src='https://picsum.photos/seed/' + Math.random() + '/80'">
                    <div class="wave-container">
                        <div class="wave-bar" style="animation-delay: 0.1s"></div>
                        <div class="wave-bar" style="animation-delay: 0.3s"></div>
                        <div class="wave-bar" style="animation-delay: 0.5s"></div>
                        <div class="wave-bar" style="animation-delay: 0.2s"></div>
                    </div>
                </div>
                <div class="track-info">
                    <div class="track-name">${track.title}</div>
                    <div class="track-artist">${track.artist}</div>
                    <div class="mood-match-lyric">"${snippet}"</div>
                </div>
                <div class="track-actions">
                    <button class="utility-btn ${track.liked ? 'active' : ''}" onclick="event.stopPropagation(); toggleLike(${index})">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="${track.liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function updateBPMSimulation() {
    const bpmEl = document.getElementById('bpm-value');
    if (!bpmEl) return;
    
    // Simulate BPM based on current mood
    let baseBPM = 70;
    if (lastEmotion === 'happy' || lastEmotion === 'angry') baseBPM = 110;
    if (lastEmotion === 'sad') baseBPM = 60;
    
    const randomVariation = Math.floor(Math.random() * 10) - 5;
    bpmEl.innerText = baseBPM + randomVariation;
}

// Update BPM every 2 seconds
setInterval(updateBPMSimulation, 2000);

// Initialize everything on load
window.addEventListener('load', () => {
    // initWebcam(); // Commented out to prevent auto-start as requested in previous turns
    updateEnvironment();
    setInterval(updateEnvironment, 1000);
    initGenreHeatmap();
    initChart(); // Ensure chart is initialized
    
    // Add Expert Mode listener
    const toggleLandmarksBtn = document.getElementById('toggle-landmarks');
    if (toggleLandmarksBtn) {
        toggleLandmarksBtn.addEventListener('click', () => {
            showLandmarks = !showLandmarks;
            toggleLandmarksBtn.classList.toggle('active', showLandmarks);
        });
    }

    // Party Mode listener
    const partyToggle = document.getElementById('party-mode-toggle');
    if (partyToggle) {
        partyToggle.addEventListener('change', (e) => {
            isPartyMode = e.target.checked;
            engineStatus.innerText = isPartyMode ? "PARTY MODE ACTIVE" : "ENGINE ACTIVE";
        });
    }

    // Mood Shift Slider listener
    const moodSlider = document.getElementById('mood-shift-slider');
    if (moodSlider) {
        moodSlider.addEventListener('input', (e) => {
            moodShiftValue = e.target.value;
            if (lastEmotion) fetchRecommendations(lastEmotion);
        });
    }

    // Navigation Listeners
    if (navHome) navHome.addEventListener('click', () => switchView('home'));
    if (navProfile) navProfile.addEventListener('click', () => switchView('profile'));
    if (playerLikeBtn) playerLikeBtn.addEventListener('click', () => toggleLike());
});

function selectTrack(index) {
    const track = currentTrackList[index];
    if (!track) return;
    
    currentTrackIndex = index;
    currentTrack = track;
    
    // Update like button state
    const isLiked = favoriteTracks.some(t => t.title === track.title && t.artist === track.artist);
    playerLikeBtn.classList.toggle('active', isLiked);
    
    renderTracks(currentTrackList);
    playTrack(track);
}

function toggleLike(index) {
    let trackToToggle;
    if (index !== undefined) {
        trackToToggle = currentTrackList[index];
    } else {
        trackToToggle = currentTrack;
    }
    
    if (!trackToToggle) return;
    
    const favIndex = favoriteTracks.findIndex(t => t.title === trackToToggle.title && t.artist === trackToToggle.artist);
    if (favIndex === -1) {
        favoriteTracks.push({...trackToToggle, liked: true});
        trackToToggle.liked = true;
    } else {
        favoriteTracks.splice(favIndex, 1);
        trackToToggle.liked = false;
    }
    
    localStorage.setItem('favoriteTracks', JSON.stringify(favoriteTracks));
    
    // Update UI
    if (currentTrack && currentTrack.title === trackToToggle.title) {
        playerLikeBtn.classList.toggle('active', trackToToggle.liked);
    }
    renderTracks(currentTrackList);
    if (!profileFavoritesView.classList.contains('hidden')) {
        renderFavorites();
    }
}

function renderFavorites() {
    if (favoriteTracks.length === 0) {
        favoritesTrackList.innerHTML = `
            <div class="empty-state">
                <p>No favorite songs yet. Like a track to see it here!</p>
            </div>
        `;
        return;
    }

    favoritesTrackList.innerHTML = favoriteTracks.map((track, index) => `
        <div class="track-card" onclick="playFavorite(${index})">
            <img src="${track.album_art || 'https://picsum.photos/seed/music/80'}" class="track-art" alt="Album Art">
            <div class="track-info">
                <div class="track-name">${track.title}</div>
                <div class="track-artist">${track.artist}</div>
            </div>
            <div class="track-actions">
                <button class="utility-btn active" onclick="event.stopPropagation(); toggleLikeFavorite(${index})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </button>
            </div>
        </div>
    `).join('');
}

window.playFavorite = (index) => {
    currentTrackList = [...favoriteTracks];
    selectTrack(index);
};

window.toggleLikeFavorite = (index) => {
    const track = favoriteTracks[index];
    const originalListIndex = currentTrackList.findIndex(t => t.title === track.title && t.artist === track.artist);
    toggleLike(originalListIndex !== -1 ? originalListIndex : undefined);
};

function switchView(view) {
    if (view === 'home') {
        mainPlaylistView.classList.remove('hidden');
        profileFavoritesView.classList.add('hidden');
        navHome.classList.add('active');
        navProfile.classList.remove('active');
    } else if (view === 'profile') {
        mainPlaylistView.classList.add('hidden');
        profileFavoritesView.classList.remove('hidden');
        navHome.classList.remove('active');
        navProfile.classList.add('active');
        renderFavorites();
    }
}

navHome.addEventListener('click', () => switchView('home'));
navProfile.addEventListener('click', () => switchView('profile'));
playerLikeBtn.addEventListener('click', () => toggleLike());

function playTrack(track) {
    nowPlayingBar.classList.remove('hidden');
    playerAlbumArt.src = track.album_art || 'https://picsum.photos/seed/music/80';
    playerTrackTitle.innerText = track.title;
    playerTrackArtist.innerText = track.artist;
    spotifyLink.href = track.track_url;

    const audioUrl = (track.preview_url && track.preview_url !== "None") 
        ? track.preview_url 
        : "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

    if (currentAudio) {
        currentAudio.pause();
    }

    currentAudio = new Audio(audioUrl);
    setupVisualizer(currentAudio);

    currentAudio.addEventListener('timeupdate', updateProgressBar);
    currentAudio.addEventListener('loadedmetadata', () => {
        totalTimeEl.innerText = formatTime(currentAudio.duration);
    });
    currentAudio.addEventListener('ended', nextTrack);

    currentAudio.play().then(() => {
        setPlayerPlaying(true);
        updateGenreHeatmap(currentGenre);
    }).catch(err => {
        console.error("Playback failed:", err);
    });
}

function setupVisualizer(audio) {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
    }

    if (source) {
        try { source.disconnect(); } catch(e) {}
    }
    source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    analyser.fftSize = 64;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = document.getElementById('audio-visualizer');
    if (!canvas) return;
    const vctx = canvas.getContext('2d');

    function draw() {
        animationId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        vctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;
            vctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-color');
            vctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }

    if (animationId) cancelAnimationFrame(animationId);
    draw();
}

function setPlayerPlaying(isPlaying) {
    if (isPlaying) {
        mainPlayBtn.querySelector('.play-icon').classList.add('hidden');
        mainPlayBtn.querySelector('.pause-icon').classList.remove('hidden');
    } else {
        mainPlayBtn.querySelector('.play-icon').classList.remove('hidden');
        mainPlayBtn.querySelector('.pause-icon').classList.add('hidden');
    }
}

function togglePlayback() {
    if (!currentAudio) return;
    if (currentAudio.paused) {
        currentAudio.play();
        setPlayerPlaying(true);
    } else {
        currentAudio.pause();
        setPlayerPlaying(false);
    }
}

function nextTrack() {
    if (currentTrackList.length === 0) return;
    currentTrackIndex = (currentTrackIndex + 1) % currentTrackList.length;
    selectTrack(currentTrackIndex);
}

function prevTrack() {
    if (currentTrackList.length === 0) return;
    currentTrackIndex = (currentTrackIndex - 1 + currentTrackList.length) % currentTrackList.length;
    selectTrack(currentTrackIndex);
}

function updateProgressBar() {
    if (!currentAudio) return;
    const progress = (currentAudio.currentTime / currentAudio.duration) * 100;
    playerProgressFill.style.width = `${progress}%`;
    currentTimeEl.innerText = formatTime(currentAudio.currentTime);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

playerProgressBar.addEventListener('click', (e) => {
    if (!currentAudio) return;
    const rect = playerProgressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    currentAudio.currentTime = pos * currentAudio.duration;
});

mainPlayBtn.addEventListener('click', togglePlayback);
document.getElementById('next-btn').addEventListener('click', nextTrack);
document.getElementById('prev-btn').addEventListener('click', prevTrack);

// Chart.js initialization
function initChart() {
    const canvas = document.getElementById('historyChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    historyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Mood Confidence',
                data: [],
                borderColor: '#00f2ff',
                backgroundColor: 'rgba(0, 242, 255, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 2,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { display: false, min: 0, max: 1 },
                x: { display: false }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

async function updateHistory() {
    try {
        const response = await fetch('/api/history');
        const data = await response.json();
        
        if (data.length > 0 && historyChart) {
            historyChart.data.labels = data.map((_, i) => i);
            historyChart.data.datasets[0].data = data.map(entry => entry.confidence);
            historyChart.update('none');

            const historyList = document.getElementById('mood-history-list');
            if (!historyList) return;
            const recentHistory = data.slice(-20).reverse(); 
            
            historyList.innerHTML = recentHistory.map(entry => {
                const config = moodConfig[entry.emotion] || moodConfig.neutral;
                const date = new Date(entry.timestamp * 1000);
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                
                return `
                    <div class="history-item" style="--item-color: ${config.color}">
                        <div class="mood-info">
                            <span class="mood-name">${entry.emotion}</span>
                            <span class="timestamp">${dateStr} | ${timeStr}</span>
                        </div>
                        <div class="confidence-badge" style="color: ${config.color}">
                            ${Math.round(entry.confidence * 100)}%
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (err) {
        console.error("Error updating history chart:", err);
    }
}

// Event Listeners
languageSelect.addEventListener('change', (e) => {
    currentLanguage = e.target.value;
    if (lastEmotion) fetchRecommendations(lastEmotion);
});

resetEngineBtn.addEventListener('click', resetAnalysis);

manualMoodBtn.addEventListener('click', () => {
    moodOptions.classList.toggle('hidden');
    isManualMode = !moodOptions.classList.contains('hidden');
    if (isManualMode) {
        engineStatus.innerText = "MANUAL MODE";
    } else {
        engineStatus.innerText = "ENGINE ACTIVE";
    }
});

moodButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const selectedMood = btn.getAttribute('data-mood');
        updateMoodUI(selectedMood, 1.0);
        fetchRecommendations(selectedMood);
        moodOptions.classList.add('hidden');
        isManualMode = false;
        engineStatus.innerText = "ENGINE ACTIVE";
    });
});

filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentGenre = btn.getAttribute('data-genre');
        if (lastEmotion) fetchRecommendations(lastEmotion);
    });
});

const landmarksToggle = document.getElementById('toggle-landmarks');
if (landmarksToggle) {
    landmarksToggle.addEventListener('click', () => {
        showLandmarks = !showLandmarks;
        landmarksToggle.classList.toggle('active');
    });
}

const moodShiftSlider = document.getElementById('mood-shift-slider');
if (moodShiftSlider) {
    moodShiftSlider.addEventListener('input', (e) => {
        moodShiftValue = e.target.value;
    });
    moodShiftSlider.addEventListener('change', () => {
        if (lastEmotion) fetchRecommendations(lastEmotion);
    });
}

const activitySelect = document.getElementById('activity-select');
if (activitySelect) {
    activitySelect.addEventListener('change', (e) => {
        currentActivity = e.target.value;
        if (lastEmotion) fetchRecommendations(lastEmotion);
    });
}

const partyModeToggle = document.getElementById('party-mode-toggle');
if (partyModeToggle) {
    partyModeToggle.addEventListener('change', (e) => {
        isPartyMode = e.target.checked;
        if (isPartyMode) {
            engineStatus.innerText = "PARTY MODE";
        } else {
            engineStatus.innerText = "ENGINE ACTIVE";
        }
    });
}

if (openCameraBtn) {
    openCameraBtn.addEventListener('click', initWebcam);
}

if (closeCameraBtn) {
    closeCameraBtn.addEventListener('click', stopWebcam);
}

// Start everything
initChart();
initGenreHeatmap();
setInterval(updateEnvironment, 1000);
setInterval(updateHistory, 5000);
updateEnvironment();
