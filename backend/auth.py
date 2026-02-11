import hashlib
import hmac
import os
import time

BOT_TOKEN = os.environ["BOT_TOKEN"]

def verify_telegram_auth(data: dict) -> dict:
    auth_date = int(data.get("auth_date", 0))

    if time.time() - auth_date > 86400:
        raise ValueError("Authorization expired")

    received_hash = data.pop("hash")

    data_check_string = "\n".join(
        f"{key}={data[key]}" for key in sorted(data)
    )

    secret_key = hashlib.sha256(BOT_TOKEN.encode()).digest()

    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash):
        raise ValueError("Invalid Telegram hash")

    return data

