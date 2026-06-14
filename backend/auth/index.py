"""
Авторизация ARTE DELI: OTP по телефону, сессии, профиль.
Роутинг через _action в body: send-otp | verify-otp | logout | me | profile
"""
import json, os, random, string, hashlib
from datetime import datetime, timezone, timedelta
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p97754588_arte_deli_site")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token, X-User-Id",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def resp(status, body, extra_headers=None):
    h = {**CORS, "Content-Type": "application/json"}
    if extra_headers:
        h.update(extra_headers)
    return {"statusCode": status, "headers": h, "body": json.dumps(body, ensure_ascii=False, default=str)}

def get_token(event):
    return (event.get("headers") or {}).get("X-Auth-Token") or (event.get("headers") or {}).get("x-auth-token")

def get_user_by_token(conn, token):
    if not token:
        return None
    cur = conn.cursor()
    cur.execute(f"""
        SELECT u.id, u.phone, u.name, u.email, u.birth_date, u.role, u.created_at
        FROM {SCHEMA}.sessions s
        JOIN {SCHEMA}.users u ON u.id = s.user_id
        WHERE s.token = %s AND s.expires_at > NOW()
    """, (token,))
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "phone": row[1], "name": row[2], "email": row[3],
            "birth_date": str(row[4]) if row[4] else None, "role": row[5], "created_at": str(row[6])}

def normalize_phone(phone):
    p = phone.replace(" ","").replace("-","").replace("(","").replace(")","")
    if not p.startswith("+"):
        p = "+7" + p.lstrip("7").lstrip("8")
    return p

def handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    path = event.get("path", "/")
    method = event.get("httpMethod", "GET")
    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass

    # Determine action: from _action field OR from path suffix
    action = body.get("_action", "")
    for seg in ["send-otp", "verify-otp", "logout", "profile", "me"]:
        if seg in path:
            action = seg
            break
    if not action:
        action = "me" if method == "GET" else ""

    conn = get_conn()
    cur = conn.cursor()
    try:
        if action == "send-otp":
            phone = normalize_phone((body.get("phone") or "").strip())
            if len(phone) < 11:
                return resp(400, {"error": "Некорректный номер телефона"})
            code = "".join(random.choices(string.digits, k=4))
            expires = datetime.now(timezone.utc) + timedelta(minutes=10)
            cur.execute(f"INSERT INTO {SCHEMA}.otp_codes (phone,code,expires_at) VALUES (%s,%s,%s)",
                        (phone, code, expires))
            conn.commit()
            return resp(200, {"success": True, "phone": phone, "dev_code": code})

        if action == "verify-otp":
            phone = normalize_phone((body.get("phone") or "").strip())
            code = (body.get("code") or "").strip()
            if not phone or not code:
                return resp(400, {"error": "Укажите телефон и код"})
            cur.execute(f"""SELECT id FROM {SCHEMA}.otp_codes
                WHERE phone=%s AND code=%s AND used=FALSE AND expires_at>NOW()
                ORDER BY created_at DESC LIMIT 1""", (phone, code))
            otp = cur.fetchone()
            if not otp:
                return resp(400, {"error": "Неверный или просроченный код"})
            cur.execute(f"UPDATE {SCHEMA}.otp_codes SET used=TRUE WHERE id=%s", (otp[0],))
            cur.execute(f"SELECT id,name,role FROM {SCHEMA}.users WHERE phone=%s", (phone,))
            row = cur.fetchone()
            if row:
                user_id, name, role = row
            else:
                cur.execute(f"INSERT INTO {SCHEMA}.users (phone,role) VALUES (%s,'customer') RETURNING id,name,role", (phone,))
                user_id, name, role = cur.fetchone()
            raw = f"{user_id}-{datetime.now(timezone.utc)}-{os.urandom(16).hex()}"
            token = hashlib.sha256(raw.encode()).hexdigest()
            expires = datetime.now(timezone.utc) + timedelta(days=30)
            cur.execute(f"INSERT INTO {SCHEMA}.sessions (user_id,token,expires_at) VALUES (%s,%s,%s)",
                        (user_id, token, expires))
            conn.commit()
            return resp(200, {"success": True, "token": token,
                               "user": {"id": user_id, "phone": phone, "name": name, "role": role}})

        if action == "logout":
            token = get_token(event)
            if token:
                cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at=NOW() WHERE token=%s", (token,))
                conn.commit()
            return resp(200, {"success": True})

        if action == "profile":
            token = get_token(event)
            user = get_user_by_token(conn, token)
            if not user:
                return resp(401, {"error": "Не авторизован"})
            cur.execute(f"UPDATE {SCHEMA}.users SET name=%s,email=%s,birth_date=%s,updated_at=NOW() WHERE id=%s",
                        (body.get("name", user["name"]), body.get("email", user["email"]),
                         body.get("birth_date") or None, user["id"]))
            if body.get("address"):
                cur.execute(f"UPDATE {SCHEMA}.user_addresses SET is_default=FALSE WHERE user_id=%s", (user["id"],))
                cur.execute(f"""INSERT INTO {SCHEMA}.user_addresses
                    (user_id,address,apartment,entrance,floor,intercom,is_default)
                    VALUES (%s,%s,%s,%s,%s,%s,TRUE)""",
                    (user["id"], body["address"], body.get("apartment"),
                     body.get("entrance"), body.get("floor"), body.get("intercom")))
            conn.commit()
            return resp(200, {"success": True})

        # default: me
        token = get_token(event)
        user = get_user_by_token(conn, token)
        if not user:
            return resp(401, {"error": "Не авторизован"})
        cur.execute(f"""SELECT id,address,apartment,entrance,floor,intercom,is_default
            FROM {SCHEMA}.user_addresses WHERE user_id=%s ORDER BY is_default DESC,id DESC""", (user["id"],))
        user["addresses"] = [{"id":r[0],"address":r[1],"apartment":r[2],"entrance":r[3],
                               "floor":r[4],"intercom":r[5],"is_default":r[6]} for r in cur.fetchall()]
        return resp(200, {"user": user})

    finally:
        conn.close()