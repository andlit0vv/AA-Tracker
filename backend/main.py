from flask import Flask, request, jsonify
import os
import json
from urllib.parse import parse_qs

app = Flask(__name__)

BOT_TOKEN = os.environ.get("BOT_TOKEN")

@app.route("/auth/signin", methods=["POST"])
def auth_signin():
    payload = request.get_json()

    if not payload or "initData" not in payload:
        return jsonify(False), 400

    init_data = payload["initData"]

    if not check_telegram_auth(init_data, BOT_TOKEN):
        return jsonify(False), 403

    parsed = parse_qs(init_data)
    user_raw = parsed.get("user")

    if not user_raw:
        return jsonify(False), 400

    user = json.loads(user_raw[0])
    telegram_id = user["id"]

    print("Telegram user:", telegram_id)

    # тут дальше:
    # - БД
    # - сессия
    # - JWT
    # - cookie

    return jsonify(True)
