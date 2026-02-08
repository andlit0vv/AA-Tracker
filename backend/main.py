from flask import Flask, request, jsonify
from flask_cors import CORS
from urllib.parse import parse_qs
import json

app = Flask(__name__)
CORS(app)

@app.route("/ping")
def ping():
    return {"status": "ok"}

@app.route("/auth/telegram", methods=["POST"])
def auth_telegram():
    init_data = request.json.get("initData")

    parsed = parse_qs(init_data)
    user = json.loads(parsed["user"][0])

    print("TELEGRAM USER ID:", user["id"])
    print("USERNAME:", user.get("username"))
    print("FIRST NAME:", user.get("first_name"))

    return jsonify({"status": "ok"})
