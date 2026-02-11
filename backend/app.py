from flask import Flask, request, jsonify, session
from auth import verify_telegram_auth
from db import upsert_user
import os

app = Flask(__name__)
app.secret_key = os.environ["FLASK_SECRET_KEY"]

@app.post("/auth/telegram")
def telegram_auth():
    payload = request.get_json()

    if not payload:
        return jsonify({"error": "bad request"}), 400

    try:
        user = verify_telegram_auth(payload.copy())
    except Exception:
        return jsonify({"error": "unauthorized"}), 401

    upsert_user(user)

    session["user_id"] = user["id"]

    return jsonify({"status": "ok"})
