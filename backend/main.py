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
CORS(app)


# =========================
# Environment variables
# =========================

BOT_TOKEN = os.environ.get("BOT_TOKEN")
DATABASE_URL = os.environ.get("DATABASE_URL")

print("=== ENV CHECK ===")
print("BOT_TOKEN PRESENT:", bool(BOT_TOKEN))
print("DATABASE_URL PRESENT:", bool(DATABASE_URL))
print("=================")


# =========================
# Database
# =========================

def get_db_connection():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set")

    return psycopg2.connect(
        DATABASE_URL,
        cursor_factory=RealDictCursor
    )


def save_user(telegram_id: int, username: str | None, first_name: str | None):
    print("=== DB SAVE USER ===")
    print("telegram_id:", telegram_id)
    print("username:", username)
    print("first_name:", first_name)

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

    print("DB SAVE SUCCESS")
    print("====================")


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
    print("=== TELEGRAM AUTH CHECK ===")

    if not BOT_TOKEN:
        print("BOT_TOKEN IS MISSING")
        return False

    print("RAW initData:")
    print(init_data)

    parsed_data = parse_qs(init_data, strict_parsing=True)
    print("PARSED initData:")
    print(parsed_data)

    if "hash" not in parsed_data:
        print("HASH NOT FOUND")
        return False

    received_hash = parsed_data.pop("hash")[0]
    print("RECEIVED HASH:", received_hash)

    data_check_string = "\n".join(
        f"{key}={value[0]}"
        for key, value in sorted(parsed_data.items())
    )

    print("DATA CHECK STRING:")
    print(data_check_string)

    secret_key = hashlib.sha256(BOT_TOKEN.encode()).digest()

    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()

    print("CALCULATED HASH:", calculated_hash)
    print("HASH MATCH:", calculated_hash == received_hash)
    print("==========================")

    return calculated_hash == received_hash


# =========================
# Telegram auth endpoint
# =========================

@app.route("/auth/telegram", methods=["POST"])
def auth_telegram():
    print("=== /auth/telegram CALLED ===")

    payload = request.json
    print("REQUEST JSON:", payload)

    if not payload:
        print("NO JSON BODY")
        return jsonify({"status": "error", "reason": "no json"}), 400

    init_data = payload.get("initData")

    if not init_data:
        print("NO initData FIELD")
        return jsonify({"status": "error", "reason": "no initData"}), 400

    # 1️⃣ Проверка подписи
    if not check_telegram_auth(init_data):
        print("TELEGRAM AUTH FAILED")
        return jsonify({"status": "error", "reason": "invalid hash"}), 403

    # 2️⃣ Парсинг user
    parsed = parse_qs(init_data)
    user_raw = parsed.get("user", [None])[0]

    if not user_raw:
        print("NO USER FIELD")
        return jsonify({"status": "error", "reason": "no user"}), 400

    user = json.loads(user_raw)

    telegram_id = user["id"]
    username = user.get("username")
    first_name = user.get("first_name")

    print("USER PARSED:")
    print("telegram_id:", telegram_id)
    print("username:", username)
    print("first_name:", first_name)

    # 3️⃣ Сохранение в БД
    save_user(
        telegram_id=telegram_id,
        username=username,
        first_name=first_name
    )

    print("AUTH SUCCESS")
    print("============================")

    return jsonify({
        "status": "ok",
        "telegram_id": telegram_id,
        "username": username,
        "first_name": first_name
    })
