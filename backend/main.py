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


def check_telegram_auth_debug(init_data: str):
    result = {
        "step": None,
        "ok": False,
        "details": {}
    }

    # STEP 1 — parse_qs
    try:
        parsed = parse_qs(init_data)
        result["step"] = "parse_qs"
        result["details"]["parsed_keys"] = list(parsed.keys())
    except Exception as e:
        result["step"] = "parse_qs_failed"
        result["details"]["error"] = str(e)
        return result

    # STEP 2 — hash exists
    if "hash" not in parsed:
        result["step"] = "hash_missing"
        return result

    received_hash = parsed.pop("hash")[0]
    parsed.pop("signature", None)

    # STEP 3 — auth_date sanity
    try:
        auth_date = int(parsed.get("auth_date", [0])[0])
        now = int(time.time())
        result["details"]["auth_date"] = auth_date
        result["details"]["server_time"] = now
        result["details"]["delta_seconds"] = now - auth_date
    except Exception as e:
        result["step"] = "auth_date_parse_failed"
        result["details"]["error"] = str(e)
        return result

    # STEP 4 — data_check_string
    data_check_string = "\n".join(
        f"{k}={v[0]}" for k, v in sorted(parsed.items())
    )

    result["details"]["data_check_string"] = data_check_string

    # STEP 5 — secret key
    secret_key = hmac.new(
        key=b"WebAppData",
        msg=BOT_TOKEN.encode(),
        digestmod=hashlib.sha256
    ).digest()

    # STEP 6 — calculated hash
    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()

    result["details"]["calculated_hash"] = calculated_hash
    result["details"]["received_hash"] = received_hash

    # STEP 7 — compare
    if calculated_hash != received_hash:
        result["step"] = "hash_mismatch"
        return result

    result["step"] = "ok"
    result["ok"] = True
    return result


@app.route("/auth/telegram", methods=["POST"])
def auth_telegram():
    payload = request.get_json(force=True, silent=True) or {}
    init_data = payload.get("initData")

    debug("RAW INIT DATA", init_data)

    if not init_data:
        return jsonify({
            "status": "error",
            "reason": "initData missing"
        }), 400

    check = check_telegram_auth_debug(init_data)

    debug("AUTH CHECK RESULT", check)

    if not check["ok"]:
        return jsonify({
            "status": "error",
            "failed_step": check["step"],
            "details": check["details"]
        }), 403

    parsed = parse_qs(init_data)
    user = json.loads(parsed["user"][0])

    return jsonify({
        "status": "ok",
        "telegram_id": user["id"],
        "username": user.get("username"),
        "first_name": user.get("first_name")
    })
