import os
import json
import hmac
import hashlib
import time
from urllib.parse import parse_qs

from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BOT_TOKEN = os.environ.get("BOT_TOKEN")


def debug(msg, data=None):
    print("\n========== DEBUG ==========")
    print(msg)
    if data is not None:
        print(data)
    print("===========================\n")


def check_telegram_auth(init_data: str):
    parsed = parse_qs(init_data)

    if "hash" not in parsed:
        return False, "hash missing"

    received_hash = parsed.pop("hash")[0]
    parsed.pop("signature", None)

    data_check_string = "\n".join(
        f"{k}={v[0]}" for k, v in sorted(parsed.items())
    )

    secret_key = hashlib.sha256(BOT_TOKEN.encode()).digest()

    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()

    if calculated_hash != received_hash:
        return False, {
            "calculated": calculated_hash,
            "received": received_hash,
            "data_check_string": data_check_string
        }

    return True, parsed



@app.route("/auth/telegram", methods=["POST"])
def auth_telegram():
    payload = request.get_json(force=True, silent=True) or {}
    init_data = payload.get("initData")

    if not init_data:
        return jsonify({"status": "error", "reason": "initData missing"}), 400

    ok, result = check_telegram_auth(init_data)

    if not ok:
        return jsonify({
            "status": "error",
            "details": result
        }), 403

    user = json.loads(result["user"][0])

    return jsonify({
        "status": "ok",
        "telegram_id": user["id"],
        "username": user.get("username"),
        "first_name": user.get("first_name")
    })

