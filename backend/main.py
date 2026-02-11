import os
import json
import time
import hmac
import hashlib
from urllib.parse import parse_qs

from flask import Flask, request, jsonify
from flask_cors import CORS


app = Flask(__name__)
CORS(app)

BOT_TOKEN = os.environ.get("BOT_TOKEN")


def log(title, value=None):
    print("\n" + "=" * 60)
    print(title)
    if value is not None:
        if isinstance(value, (dict, list)):
            print(json.dumps(value, indent=2, ensure_ascii=False))
        else:
            print(value)
    print("=" * 60 + "\n")


def check_telegram_webapp_auth(init_data: str):
    debug = {
        "step": None,
        "ok": False,
        "details": {}
    }

    # STEP 0 — BOT TOKEN
    if not BOT_TOKEN:
        debug["step"] = "bot_token_missing"
        return debug

    debug["details"]["bot_token_length"] = len(BOT_TOKEN)

    # STEP 1 — parse_qs
    try:
        parsed = parse_qs(init_data, strict_parsing=True)
        debug["step"] = "parsed"
        debug["details"]["parsed_keys"] = list(parsed.keys())
    except Exception as e:
        debug["step"] = "parse_failed"
        debug["details"]["error"] = str(e)
        return debug

    # STEP 2 — hash exists
    if "hash" not in parsed:
        debug["step"] = "hash_missing"
        return debug

    received_hash = parsed["hash"][0]
    debug["details"]["received_hash"] = received_hash

    # Убираем hash и signature
    parsed.pop("hash", None)
    parsed.pop("signature", None)

    # STEP 3 — auth_date
    try:
        auth_date = int(parsed.get("auth_date", [0])[0])
        now = int(time.time())
        debug["details"]["auth_date"] = auth_date
        debug["details"]["server_time"] = now
        debug["details"]["delta_seconds"] = now - auth_date
    except Exception as e:
        debug["step"] = "auth_date_invalid"
        debug["details"]["error"] = str(e)
        return debug

    # STEP 4 — data_check_string
    data_check_string = "\n".join(
        f"{k}={v[0]}" for k, v in sorted(parsed.items())
    )

    debug["details"]["data_check_string"] = data_check_string

    # STEP 5 — secret key (КРИТИЧЕСКИЙ МОМЕНТ)
    secret_key = hashlib.sha256(BOT_TOKEN.encode()).digest()

    debug["details"]["secret_key_hex"] = secret_key.hex()

    # STEP 6 — calculated hash
    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()

    debug["details"]["calculated_hash"] = calculated_hash

    # STEP 7 — compare
    if calculated_hash != received_hash:
        debug["step"] = "hash_mismatch"
        return debug

    debug["step"] = "ok"
    debug["ok"] = True
    debug["details"]["parsed"] = parsed
    return debug


@app.route("/auth/telegram", methods=["POST"])
def auth_telegram():
    payload = request.get_json(force=True, silent=True) or {}
    init_data = payload.get("initData")

    log("RAW PAYLOAD", payload)
    log("RAW INIT DATA", init_data)

    if not init_data:
        return jsonify({
            "status": "error",
            "reason": "initData missing"
        }), 400

    result = check_telegram_webapp_auth(init_data)

    log("AUTH DEBUG RESULT", result)

    if not result["ok"]:
        return jsonify({
            "status": "error",
            "failed_step": result["step"],
            "details": result["details"]
        }), 403

    parsed = result["details"]["parsed"]
    user = json.loads(parsed["user"][0])

    return jsonify({
        "status": "ok",
        "telegram_id": user["id"],
        "username": user.get("username"),
        "first_name": user.get("first_name")
    })
