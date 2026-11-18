import cv2
import pytesseract
import re
import json
import urllib.request
import numpy as np

from ultralytics import YOLO
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

# Tesseract location
pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)

# Load YOLO model once
model = YOLO("best.pt")

# Spring Boot Backend URL (Your Database & Slot Manager!)
SPRING_BOOT_SCAN_URL = "http://127.0.0.1:8080/api/parking/scan"

app = FastAPI(title="SmartPark ANPR API (Connected to Spring Boot DB)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "SmartPark ANPR API is running and linked to Spring Boot DB"}

@app.post("/anpr/recognize")
async def recognize_plate(file: UploadFile = File(...)):
    contents = await file.read()
    image_array = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if image is None:
        return {"success": False, "message": "Invalid image"}

    results = model(image)
    boxes = results[0].boxes

    if len(boxes) == 0:
        return {"success": False, "plateNumber": None, "message": "No number plate detected"}

    best_index = int(boxes.conf.argmax())
    box = boxes[best_index]
    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
    plate_image = image[y1:y2, x1:x2]

    if plate_image.size == 0:
        return {"success": False, "plateNumber": None, "message": "Could not crop number plate"}

    gray = cv2.cvtColor(plate_image, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, None, fx=3, fy=3)

    config = "--psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    text = pytesseract.image_to_string(gray, config=config)
    plate_number = re.sub(r"[^A-Z0-9]", "", text.upper())

    confidence = round(float(box.conf[0]) * 100, 2)

    if not plate_number:
        return {
            "success": False,
            "plateNumber": None,
            "detectionConfidence": confidence,
            "message": "Plate detected but text not readable"
        }

    # AUTOMATICALLY SAVE TO YOUR SPRING BOOT + SPRING JDBC DATABASE!
    parking_db_result = None
    try:
        req_data = json.dumps({"plateNumber": plate_number, "vehicleType": "CAR"}).encode("utf-8")
        req = urllib.request.Request(
            SPRING_BOOT_SCAN_URL,
            data=req_data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            parking_db_result = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        parking_db_result = {"dbSynced": False, "note": str(e)}

    return {
        "success": True,
        "plateNumber": plate_number,
        "detectionConfidence": confidence,
        "message": "Number plate recognized",
        "parkingDatabase": parking_db_result
    }
