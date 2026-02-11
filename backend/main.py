import os
import json
import hmac
import hashlib
from urllib.parse import parse_qs

import psycopg2
from psycopg2.extras import RealDictCursor

from flask import Flask, request, jsonify
from flask_cors import CORS


# =========================
# App init
# =========================

app = Flask(__name__)

CORS(
    app,
    origins=[
        "https://andlit0vv.github.io"
    ]
)


# =========================
# Environment
# =========================

BOT_TOKEN = "8401980133:AAG74o2GcCi2WjceR-p99DRbjFSIfgjuWU4"
DATABASE_URL = os.environ.get("DATABASE_URL")


# =========================
# Database
# =========================

def get_db_connection():
    return psycopg2.connect(
        DATABASE_URL,
        cursor_factory=RealDictCursor
    )


def save_user(telegram_id: int, username: str | None, first_name: str | None):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO users (user_id, telegram_id, username, first_name)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (user_id)
        DO UPDATE SET
            username = EXCLUDED.username,
            first_name = EXCLUDED.first_name
        """,
        (telegram_id, telegram_id, username, first_name)
    )

    conn.commit()
    cur.close()
    conn.close()


# =========================
# Healthcheck
# =========================

@app.route("/ping")
def ping():
    return {"status": "ok"}


# =========================
# Telegram auth utils
# =========================

def check_telegram_auth(init_data: str) -> bool:
    parsed_data = parse_qs(init_data)

    if "hash" not in parsed_data:
        return False

    received_hash = parsed_data.pop("hash")[0]
    # parsed_data.pop("signature", None)

    data_check_string = "\n".join(
        f"{key}={value[0]}"
        for key, value in sorted(parsed_data.items())
    )

    secret_key = hmac.new(
        key=b"WebAppData",
        msg=BOT_TOKEN.encode(),
        digestmod=hashlib.sha256
    ).digest()

    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()

    return calculated_hash == received_hash




# =========================
# Auth endpoint
# =========================

@app.route("/auth/telegram", methods=["POST"])
def auth_telegram():
    payload = request.get_json(force=True, silent=True) or {}
    init_data = payload.get("initData")

    print("INIT DATA RAW:", init_data)

    if not init_data:
        return jsonify({"status": "error", "reason": "no initData"}), 400

    if not check_telegram_auth(init_data):
        return jsonify({"status": "error", "reason": "invalid hash"}), 403

    parsed = parse_qs(init_data)
    user = json.loads(parsed["user"][0])

    telegram_id = user["id"]
    username = user.get("username")
    first_name = user.get("first_name")

    save_user(
        telegram_id=telegram_id,
        username=username,
        first_name=first_name
    )

    return jsonify({
        "status": "ok",
        "telegram_id": telegram_id,
        "username": username,
        "first_name": first_name
    })
