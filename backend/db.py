import os
import psycopg2

def get_connection():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def upsert_user(user: dict) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO telegram_users (telegram_id, username, firstname)
                VALUES (%s, %s, %s)
                ON CONFLICT (telegram_id)
                DO UPDATE SET
                    username = EXCLUDED.username,
                    firstname = EXCLUDED.firstname;
                """,
                (
                    user["id"],
                    user.get("username"),
                    user.get("first_name")
                )
            )
