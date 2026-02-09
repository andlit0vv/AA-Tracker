import os
import json
import hmac
import hashlib
from urllib.parse import parse_qs

from flask import Flask, request, jsonify
from flask_cors import CORS


app = Flask(__name__)
CORS(app)

BOT_TOKEN = os.environ.get("BOT_TOKEN")


@app.route("/ping")
def ping():
    return {"status": "ok"}


def check_telegram_auth(init_data: str) -> bool:
    """
    Проверка подписи Telegram initData
    """
    if not BOT_TOKEN:
        raise RuntimeError("BOT_TOKEN is not set")

    parsed_data = parse_qs(init_data, strict_parsing=True)

    if "hash" not in parsed_data:
        return False

    received_hash = parsed_data.pop("hash")[0]

    data_check_string = "\n".join(
        f"{key}={value[0]}"
        for key, value in sorted(parsed_data.items())
    )

    secret_key = hashlib.sha256(BOT_TOKEN.encode()).digest()

    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()

    return calculated_hash == received_hash


@app.route("/auth/telegram", methods=["POST"])
def auth_telegram():
    payload = request.json
    init_data = payload.get("initData")

    if not init_data:
        return jsonify({"status": "error", "reason": "no initData"}), 400

    # 1️⃣ Проверяем подпись
    if not check_telegram_auth(init_data):
        return jsonify({"status": "error", "reason": "invalid hash"}), 403

    # 2️⃣ Парсим данные (теперь им можно доверять)
    parsed = parse_qs(init_data)

    user = json.loads(parsed["user"][0])
    auth_date = parsed.get("auth_date", [None])[0]

    telegram_id = user["id"]
    username = user.get("username")
    first_name = user.get("first_name")

    # 3️⃣ Логи (контроль)
    print("=== TELEGRAM AUTH SUCCESS ===")
    print("TELEGRAM ID:", telegram_id)
    print("USERNAME:", username)
    print("FIRST NAME:", first_name)
    print("AUTH DATE:", auth_date)

    # 4️⃣ Ответ фронтенду
    return jsonify({
        "status": "ok",
        "telegram_id": telegram_id,
        "username": username,
        "first_name": first_name
    })
