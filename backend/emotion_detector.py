from fer.fer import FER
import cv2
import numpy as np
from collections import deque

# Try to import MediaPipe, but provide a fallback if it fails or is missing solutions
try:
    import mediapipe as mp
    try:
        from mediapipe.python.solutions import face_mesh as mp_face_mesh
        HAS_MEDIAPIPE = True
    except ImportError:
        # Some versions of MediaPipe (0.10+) on Python 3.12 might not expose solutions this way
        try:
            import mediapipe.solutions.face_mesh as mp_face_mesh
            HAS_MEDIAPIPE = True
        except ImportError:
            HAS_MEDIAPIPE = False
except ImportError:
    HAS_MEDIAPIPE = False

class EmotionDetector:
    def __init__(self):
        # Initialize FER with MTCNN for better accuracy
        from fer.fer import FER
        self.detector = FER(mtcnn=True)
        
        # Initialize MediaPipe FaceMesh if available
        self.face_mesh = None
        if HAS_MEDIAPIPE:
            try:
                self.face_mesh = mp_face_mesh.FaceMesh(
                    static_image_mode=False,
                    max_num_faces=4,
                    refine_landmarks=True,
                    min_detection_confidence=0.5,
                    min_tracking_confidence=0.5
                )
            except Exception as e:
                print(f"Failed to initialize MediaPipe FaceMesh: {e}")
                self.face_mesh = None
        
        # Activity Detection State
        self.landmark_history = deque(maxlen=10) # Track last 10 frames of landmarks
        self.movement_threshold_walking = 0.05
        self.movement_threshold_working = 0.01

    def detect(self, frame, party_mode=False):
        """
        Detects emotion and landmarks in a single frame.
        Returns: {emotion, confidence, bbox, landmarks, activity} or list of results if party_mode
        """
        try:
            # 1. Emotion Detection (FER)
            results = self.detector.detect_emotions(frame)
            
            # 2. Landmark Detection (MediaPipe)
            all_landmarks = []
            if self.face_mesh:
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mesh_results = self.face_mesh.process(rgb_frame)
                
                if mesh_results.multi_face_landmarks:
                    for face_landmarks in mesh_results.multi_face_landmarks:
                        # Extract 468 landmarks (simplified for 68 key points if needed)
                        landmarks = [[lm.x, lm.y, lm.z] for lm in face_landmarks.landmark]
                        all_landmarks.append(landmarks)
            else:
                # Mock landmarks based on FER box if available
                if results:
                    bbox = results[0]["box"]
                    # Generate some random/mock landmarks for UI
                    mock_landmarks = []
                    for _ in range(68):
                        mock_landmarks.append([
                            (bbox[0] + np.random.random() * bbox[2]) / frame.shape[1],
                            (bbox[1] + np.random.random() * bbox[3]) / frame.shape[0],
                            0
                        ])
                    all_landmarks.append(mock_landmarks)
            
            # 3. Activity Detection Logic
            activity = "sitting"
            if all_landmarks:
                current_main_face = np.array(all_landmarks[0])
                self.landmark_history.append(current_main_face)
                
                if len(self.landmark_history) > 1:
                    # Calculate mean movement across all landmarks
                    movements = []
                    for i in range(1, len(self.landmark_history)):
                        diff = np.linalg.norm(self.landmark_history[i] - self.landmark_history[i-1], axis=1)
                        movements.append(np.mean(diff))
                    
                    avg_movement = np.mean(movements)
                    if avg_movement > self.movement_threshold_walking:
                        activity = "walking"
                    elif avg_movement > self.movement_threshold_working:
                        activity = "working"
                    else:
                        activity = "sitting"

            if not results:
                return {"emotion": None, "landmarks": all_landmarks[0] if all_landmarks else None, "activity": activity}

            if party_mode:
                # Return all detected faces
                face_results = []
                for i, res in enumerate(results):
                    bbox = res["box"]
                    emotions = res["emotions"]
                    top_emotion = max(emotions, key=emotions.get)
                    
                    # Match landmarks to faces by proximity (simplistic)
                    face_landmarks = all_landmarks[i] if i < len(all_landmarks) else None
                    
                    face_results.append({
                        "emotion": top_emotion,
                        "confidence": float(emotions[top_emotion]),
                        "bbox": [int(x) for x in bbox],
                        "raw_emotions": {k: float(v) for k, v in emotions.items()},
                        "landmarks": face_landmarks,
                        "activity": activity
                    })
                return face_results

            # Single face mode
            res = results[0]
            bbox = res["box"]
            emotions = res["emotions"]
            
            boosted_emotions = emotions.copy()
            for e in boosted_emotions:
                if e not in ['neutral', 'happy']:
                    boosted_emotions[e] *= 1.3
            
            top_emotion = max(boosted_emotions, key=boosted_emotions.get)
            confidence = emotions[top_emotion]

            return {
                "emotion": top_emotion,
                "confidence": float(confidence),
                "raw_emotions": {k: float(v) for k, v in emotions.items()},
                "bbox": [int(x) for x in bbox],
                "landmarks": all_landmarks[0] if all_landmarks else None,
                "activity": activity
            }
        except Exception as e:
            print(f"Error in emotion detection: {e}")
            return None
