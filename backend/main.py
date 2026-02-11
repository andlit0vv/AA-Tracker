from flask import Flask, request, jsonify
from telegram_webapp_auth import validate_init_data
import os

app = Flask(__name__)

BOT_TOKEN = os.environ.get("BOT_TOKEN")  # ТОТ ЖЕ, ЧТО В TELEGRAM

@app.route("/auth/signin", methods=["POST"])
def auth_signin():
    data = request.get_json()

    if not data or "initData" not in data:
        return jsonify(False), 400

    init_data = data["initData"]

    # Проверка подписи Telegram
    is_valid = validate_init_data(
        init_data=init_data,
        bot_token=BOT_TOKEN
    )

    if not is_valid:
        return jsonify(False), 403

    # Парсим user.id вручную
    from urllib.parse import parse_qs
    parsed = parse_qs(init_data)

    user_data = parsed.get("user")
    if not user_data:
        return jsonify(False), 400

    import json
    user = json.loads(user_data[0])
    telegram_id = user["id"]

    # 👉 ТУТ твоя логика:
    # - сохранить пользователя
    # - найти в БД
    # - создать сессию / JWT / cookie

    print("Telegram ID:", telegram_id)

    return jsonify(True)
