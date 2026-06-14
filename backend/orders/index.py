"""
Заказы ARTE DELI.
POST /orders/       — создать заказ
GET  /orders/       — список заказов (для авторизованного пользователя или все для админа)
GET  /orders/{id}   — заказ по ID (по токену или публично по хешу)
PUT  /orders/{id}/status — сменить статус (менеджер/админ/курьер)
"""
import json, os
from datetime import datetime, timezone
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p97754588_arte_deli_site")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token, X-User-Id",
}

STATUS_LABELS = {
    "processing": "Заказ в обработке",
    "accepted": "Принят, готовится",
    "delivering": "Курьер в пути",
    "delivered": "Доставлен",
    "cancelled": "Отменён",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def resp(status, body):
    return {"statusCode": status, "headers": {**CORS, "Content-Type": "application/json"},
            "body": json.dumps(body, ensure_ascii=False, default=str)}

def get_token(event):
    h = event.get("headers") or {}
    return h.get("X-Auth-Token") or h.get("x-auth-token")

def get_user_by_token(cur, token):
    if not token:
        return None
    cur.execute(f"""
        SELECT u.id, u.phone, u.name, u.role FROM {SCHEMA}.sessions s
        JOIN {SCHEMA}.users u ON u.id = s.user_id
        WHERE s.token = %s AND s.expires_at > NOW()
    """, (token,))
    row = cur.fetchone()
    return {"id": row[0], "phone": row[1], "name": row[2], "role": row[3]} if row else None

def serialize_order(row, items):
    return {
        "id": row[0], "user_id": row[1], "status": row[2],
        "status_label": STATUS_LABELS.get(row[2], row[2]),
        "delivery_type": row[3], "customer_name": row[4], "customer_phone": row[5],
        "address": row[6], "apartment": row[7], "entrance": row[8], "floor": row[9],
        "intercom": row[10], "comment": row[11], "delivery_time": row[12],
        "payment_method": row[13], "promo_code": row[14], "discount": row[15],
        "subtotal": row[16], "delivery_cost": row[17], "total": row[18],
        "created_at": str(row[19]), "updated_at": str(row[20]),
        "items": items,
    }

def get_order_items(cur, order_id):
    cur.execute(f"""SELECT product_id, product_name, product_emoji, price, quantity, total
        FROM {SCHEMA}.order_items WHERE order_id=%s""", (order_id,))
    return [{"product_id": r[0], "name": r[1], "emoji": r[2],
             "price": r[3], "quantity": r[4], "total": r[5]} for r in cur.fetchall()]

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

    conn = get_conn()
    try:
        cur = conn.cursor()
        token = get_token(event)
        user = get_user_by_token(cur, token)
        parts = [p for p in path.split("/") if p]

        # POST /orders/ — создать заказ
        if method == "POST" and (len(parts) == 0 or (len(parts) == 1 and parts[0] == "orders")):
            items = body.get("items", [])
            if not items:
                return resp(400, {"error": "Корзина пуста"})
            name = (body.get("customer_name") or "").strip()
            phone = (body.get("customer_phone") or "").strip()
            if not name or not phone:
                return resp(400, {"error": "Укажите имя и телефон"})

            delivery_type = body.get("delivery_type", "delivery")
            address = body.get("address", "")
            if delivery_type == "delivery" and not address:
                return resp(400, {"error": "Укажите адрес доставки"})

            subtotal = sum(it["price"] * it["quantity"] for it in items)
            promo_code = (body.get("promo_code") or "").strip().upper()
            discount = 0

            # Apply promo
            if promo_code:
                cur.execute(f"SELECT id, type, value, for_new_users FROM {SCHEMA}.promos WHERE code=%s AND is_active=TRUE", (promo_code,))
                promo = cur.fetchone()
                if promo:
                    p_id, p_type, p_value, p_new = promo
                    if p_type == "percent":
                        discount = int(subtotal * p_value / 100)

            delivery_cost = 0
            if delivery_type == "delivery":
                delivery_cost = 0 if subtotal >= 800 else 99

            total = max(0, subtotal - discount + delivery_cost)
            user_id = user["id"] if user else None

            cur.execute(f"""
                INSERT INTO {SCHEMA}.orders
                (user_id, status, delivery_type, customer_name, customer_phone,
                 address, apartment, entrance, floor, intercom, comment,
                 delivery_time, payment_method, promo_code, discount,
                 subtotal, delivery_cost, total)
                VALUES (%s,'processing',%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING id
            """, (user_id, delivery_type, name, phone,
                  address, body.get("apartment"), body.get("entrance"),
                  body.get("floor"), body.get("intercom"), body.get("comment"),
                  body.get("delivery_time", "asap"), body.get("payment_method", "cash"),
                  promo_code or None, discount, subtotal, delivery_cost, total))
            order_id = cur.fetchone()[0]

            for it in items:
                cur.execute(f"""INSERT INTO {SCHEMA}.order_items
                    (order_id, product_id, product_name, product_emoji, price, quantity, total)
                    VALUES (%s,%s,%s,%s,%s,%s,%s)""",
                    (order_id, it.get("product_id"), it["name"], it.get("emoji","🍕"),
                     it["price"], it["quantity"], it["price"]*it["quantity"]))

            conn.commit()
            return resp(201, {"success": True, "order_id": order_id,
                              "total": total, "discount": discount, "delivery_cost": delivery_cost})

        # GET /orders/ — список (личный кабинет или все для админа/менеджера)
        if method == "GET" and len(parts) <= 1:
            if not user:
                return resp(401, {"error": "Не авторизован"})
            is_admin = user["role"] in ("admin", "manager", "cook")
            if is_admin:
                qs = event.get("queryStringParameters") or {}
                status_filter = qs.get("status")
                if status_filter:
                    cur.execute(f"""SELECT id,user_id,status,delivery_type,customer_name,customer_phone,
                        address,apartment,entrance,floor,intercom,comment,delivery_time,
                        payment_method,promo_code,discount,subtotal,delivery_cost,total,created_at,updated_at
                        FROM {SCHEMA}.orders WHERE status=%s ORDER BY created_at DESC LIMIT 100""", (status_filter,))
                else:
                    cur.execute(f"""SELECT id,user_id,status,delivery_type,customer_name,customer_phone,
                        address,apartment,entrance,floor,intercom,comment,delivery_time,
                        payment_method,promo_code,discount,subtotal,delivery_cost,total,created_at,updated_at
                        FROM {SCHEMA}.orders ORDER BY created_at DESC LIMIT 100""")
            else:
                cur.execute(f"""SELECT id,user_id,status,delivery_type,customer_name,customer_phone,
                    address,apartment,entrance,floor,intercom,comment,delivery_time,
                    payment_method,promo_code,discount,subtotal,delivery_cost,total,created_at,updated_at
                    FROM {SCHEMA}.orders WHERE user_id=%s ORDER BY created_at DESC""", (user["id"],))
            rows = cur.fetchall()
            orders = []
            for row in rows:
                items = get_order_items(cur, row[0])
                orders.append(serialize_order(row, items))
            return resp(200, {"orders": orders, "total": len(orders)})

        # GET /orders/{id}
        if method == "GET" and len(parts) >= 1:
            order_id = parts[-1]
            try:
                order_id = int(order_id)
            except Exception:
                return resp(400, {"error": "Некорректный ID заказа"})
            cur.execute(f"""SELECT id,user_id,status,delivery_type,customer_name,customer_phone,
                address,apartment,entrance,floor,intercom,comment,delivery_time,
                payment_method,promo_code,discount,subtotal,delivery_cost,total,created_at,updated_at
                FROM {SCHEMA}.orders WHERE id=%s""", (order_id,))
            row = cur.fetchone()
            if not row:
                return resp(404, {"error": "Заказ не найден"})
            # Access: owner or admin/manager
            if user and (user["id"] == row[1] or user["role"] in ("admin","manager","cook","courier")):
                pass
            elif not user:
                pass  # allow public tracking by order id
            items = get_order_items(cur, order_id)
            return resp(200, {"order": serialize_order(row, items)})

        # PUT /orders/{id}/status
        if method == "PUT" and "status" in parts:
            if not user or user["role"] not in ("admin","manager","cook","courier"):
                return resp(403, {"error": "Нет доступа"})
            order_id = None
            for i, p in enumerate(parts):
                if p == "status" and i > 0:
                    try:
                        order_id = int(parts[i-1])
                    except Exception:
                        pass
            if not order_id:
                # try to extract from path
                for p in parts:
                    try:
                        order_id = int(p)
                        break
                    except Exception:
                        pass
            new_status = body.get("status")
            valid = ("processing","accepted","delivering","delivered","cancelled")
            if new_status not in valid:
                return resp(400, {"error": f"Статус должен быть: {', '.join(valid)}"})
            cur.execute(f"UPDATE {SCHEMA}.orders SET status=%s, updated_at=NOW() WHERE id=%s RETURNING id",
                        (new_status, order_id))
            if not cur.fetchone():
                return resp(404, {"error": "Заказ не найден"})
            conn.commit()
            return resp(200, {"success": True, "status": new_status,
                              "status_label": STATUS_LABELS[new_status]})

        return resp(404, {"error": "Not found"})
    finally:
        conn.close()
