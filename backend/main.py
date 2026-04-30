import base64
import time
import json
from collections import deque
from datetime import datetime

import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from emotion_detector import EmotionDetector
from spotify_client import SpotifyClient

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
detector = EmotionDetector()
spotify = SpotifyClient()

# In-memory history (last 10 minutes)
# Stores: {"timestamp": float, "emotion": str, "confidence": float}
history = deque(maxlen=300) # Assuming ~1 log per 2 seconds, 300 entries = 10 mins

@app.get("/")
async def get_index():
    return FileResponse("../frontend/index.html")

@app.get("/api/recommend")
async def recommend(emotion: str, genre: str = None, language: str = "english", shift: int = 0, activity: str = "none"):
    # shift 0 = stay, 100 = full shift (opposite emotion)
    target_emotion = emotion
    
    # Apply Activity Context
    if activity == "focus":
        # Focus mode tends towards neutral/ambient
        target_emotion = "neutral"
    elif activity == "workout":
        # Workout mode tends towards happy/energetic
        target_emotion = "happy"
    
    if shift > 50:
        # Simple logic for "Mood Shift": Happy <-> Sad, Angry <-> Chill
        opposites = {
            "happy": "sad",
            "sad": "happy",
            "angry": "neutral",
            "neutral": "surprise",
            "surprise": "neutral",
            "fear": "happy",
            "disgust": "neutral"
        }
        target_emotion = opposites.get(target_emotion, target_emotion)
    
    tracks = spotify.get_tracks(target_emotion, genre=genre, language=language, limit=10)
    return {"emotion": target_emotion, "original_emotion": emotion, "genre": genre, "language": language, "tracks": tracks, "activity": activity}

@app.get("/api/history")
async def get_history():
    return list(history)

@app.websocket("/ws/emotion")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Receive base64 frame from client
            raw_data = await websocket.receive_text()
            try:
                data_json = json.loads(raw_data)
                image_data = data_json.get("image")
                party_mode = data_json.get("party_mode", False)
            except:
                image_data = raw_data
                party_mode = False
            
            # Remove base64 header if present
            if "," in image_data:
                image_data = image_data.split(",")[1]
            
            # Decode image
            img_bytes = base64.b64decode(image_data)
            nparr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is not None:
                # Detect emotion
                result = detector.detect(frame, party_mode=party_mode)
                
                if result:
                    if party_mode and isinstance(result, list):
                        # Aggregate emotions for "Party Mode"
                        all_emotions = {}
                        for face in result:
                            for emo, score in face["raw_emotions"].items():
                                all_emotions[emo] = all_emotions.get(emo, 0) + score
                        
                        # Normalize
                        num_faces = len(result)
                        avg_emotions = {k: v / num_faces for k, v in all_emotions.items()}
                        top_avg_emotion = max(avg_emotions, key=avg_emotions.get)
                        
                        final_result = {
                            "emotion": top_avg_emotion,
                            "confidence": avg_emotions[top_avg_emotion],
                            "raw_emotions": avg_emotions,
                            "num_faces": num_faces,
                            "bbox": result[0]["bbox"] # Just use first face for landmarks
                        }
                    else:
                        final_result = result

                    # Log to history
                    history_entry = {
                        "timestamp": time.time(),
                        "emotion": final_result.get("emotion"),
                        "confidence": final_result.get("confidence", 0),
                        "activity": final_result.get("activity", "sitting")
                    }
                    history.append(history_entry)
                    
                    # Send result back to client
                    await websocket.send_json(final_result)
                else:
                    await websocket.send_json({"emotion": None, "activity": "sitting"})
                    
    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        try:
            await websocket.close()
        except:
            pass

# Serve static files from frontend directory
app.mount("/static", StaticFiles(directory="../frontend"), name="static")
