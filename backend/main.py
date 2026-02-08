from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/ping")
def ping():
    return {"status": "ok"}

@app.route("/auth/telegram", methods=["POST"])
def auth_telegram():
    data = request.json
    print("RAW DATA FROM FRONTEND:", data)
    return jsonify({"status": "ok"})
