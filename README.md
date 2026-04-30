# MoodMelody — Emotion-Based Music Platform

MoodMelody is an intelligent music recommendation platform that uses real-time facial emotion detection to curate personalized playlists. By analyzing your expressions via webcam, the app identifies your current mood and suggests tracks that either match your feelings or help shift them to a desired state.

## 🚀 Features

- **Real-time Emotion Detection**: Uses high-performance computer vision (FER & MediaPipe) to detect 7 core emotions: Happy, Sad, Angry, Neutral, Surprise, Fear, and Disgust.
- **Smart Recommendations**: Integrated with Spotify (mock/real) to provide high-quality track suggestions based on detected moods.
- **Mood Journey**: A unique "Mood Shift" slider that allows you to choose between staying in your current mood or transitioning to an opposite emotional state.
- **Activity Context**: Specialized modes for "Focus" (Neutral/Ambient) and "Workout" (High-energy/Upbeat).
- **Party Mode**: Real-time detection for multiple faces, perfect for group sessions.
- **Biometric UI**: A futuristic glassmorphism interface featuring live facial landmark meshes, confidence meters, and emotion stabilization.
- **Privacy First**: All image processing happens locally or via secure WebSockets, with no permanent storage of camera frames.

## 🛠️ Tech Stack

### Backend
- **FastAPI**: High-performance Python web framework for APIs and WebSockets.
- **OpenCV & FER**: Real-time video processing and facial expression recognition.
- **MediaPipe**: Advanced facial landmark detection and mesh generation.
- **Uvicorn**: ASGI server for production-grade performance.

### Frontend
- **Modern JavaScript (ES6+)**: Reactive UI logic and WebSocket communication.
- **Glassmorphism CSS**: Cutting-edge UI design with blur effects and neon accents.
- **Chart.js**: Visual representation of emotional data and genre heatmaps.
- **HTML5 Canvas**: Low-latency rendering for facial landmarks and scanning overlays.

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.10+
- Webcam access
- (Optional) Spotify API Credentials

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Yashrajj0909/Song-recommendation-by-detecting-emotion.git
   cd Song-recommendation-by-detecting-emotion
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```

4. **Environment Variables**:
   Create a `.env` file in the `backend/` directory based on `.env.example`:
   ```env
   SPOTIPY_CLIENT_ID='your_id'
   SPOTIPY_CLIENT_SECRET='your_secret'
   ```

## 🏃 Running the Project

You can start the project using NPM or directly via Python:

### Using NPM (Recommended)
```bash
npm run dev
```

### Using Python
```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Once started, open your browser and navigate to `http://localhost:8000`.

## 📸 Usage
1. Click the **Camera Icon** to start the Biometric Engine.
2. Allow webcam access when prompted.
3. Wait for the engine to analyze your expression (status will show "ANALYZING").
4. Once a mood is "LOCKED", your personalized playlist will appear on the right.
5. Use the **Mood Journey** slider to shift your vibe!

---
Developed by [Yashraj](https://github.com/Yashrajj0909)
