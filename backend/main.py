import os
import json
import hmac
import hashlib
from urllib.parse import parse_qs

from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__)
CORS(app)

BOT_TOKEN = os.environ.get("BOT_TOKEN")
DATABASE_URL = os.environ.get("DATABASE_URL")


def get_db_connection():
    return psycopg2.connect(
        DATABASE_URL,
        cursor_factory=RealDictCursor
    )


# =====================================================
# AUTH
# =====================================================

def save_user(telegram_id: int, username: str | None, first_name: str | None):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO users (telegram_id, username, first_name)
        VALUES (%s, %s, %s)
        ON CONFLICT (telegram_id)
        DO UPDATE SET
            username = EXCLUDED.username,
            first_name = EXCLUDED.first_name
        """,
        (telegram_id, username, first_name)
    )

    conn.commit()
    cur.close()
    conn.close()


def check_telegram_auth(init_data: str) -> bool:
    parsed_data = parse_qs(init_data)

    if "hash" not in parsed_data:
        return False

    received_hash = parsed_data.pop("hash")[0]

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


@app.route("/auth/telegram", methods=["POST"])
def auth_telegram():
    payload = request.get_json(force=True, silent=True) or {}
    init_data = payload.get("initData")

    if not init_data or not check_telegram_auth(init_data):
        return jsonify({"status": "error"}), 403

    parsed = parse_qs(init_data)
    user = json.loads(parsed["user"][0])

    save_user(user["id"], user.get("username"), user.get("first_name"))

    return jsonify({"status": "ok", "telegram_id": user["id"]})


# =====================================================
# TASKS
# =====================================================

@app.route("/tasks", methods=["GET"])
def get_tasks():
    telegram_id = request.args.get("telegram_id", type=int)
    date_str = request.args.get("date")

    if not telegram_id or not date_str:
        return jsonify({"tasks": []})

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, text, date, done, updated_at
        FROM tasks
        WHERE telegram_id = %s AND date = %s
        ORDER BY id DESC
        """,
        (telegram_id, date_str)
    )

    tasks = cur.fetchall()
    cur.close()
    conn.close()

    return jsonify({"tasks": tasks})


@app.route("/tasks", methods=["POST"])
def create_task():
    data = request.get_json(force=True)

    text = data.get("text")
    date = data.get("date")
    telegram_id = data.get("telegram_id")

    if not text or not date or not telegram_id:
        return jsonify({"status": "error"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO tasks (telegram_id, text, date)
        VALUES (%s, %s, %s)
        RETURNING id, text, date, done, updated_at
        """,
        (telegram_id, text, date)
    )

    task = cur.fetchone()
    conn.commit()

    cur.close()
    conn.close()

    return jsonify(task), 201


@app.route("/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    data = request.get_json(force=True)
    text = data.get("text")
    telegram_id = data.get("telegram_id")

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        UPDATE tasks
        SET text = %s,
            updated_at = NOW()
        WHERE id = %s AND telegram_id = %s
        RETURNING id, text, date, done, updated_at
        """,
        (text, task_id, telegram_id)
    )

    task = cur.fetchone()
    conn.commit()

    cur.close()
    conn.close()

    return jsonify(task)


@app.route("/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    telegram_id = request.args.get("telegram_id", type=int)

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        "DELETE FROM tasks WHERE id = %s AND telegram_id = %s",
        (task_id, telegram_id)
    )

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"status": "deleted"})
