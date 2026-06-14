"""
Админ-панель ARTE DELI.
Роутинг через _action в query string (GET) или body (POST/PUT).
Действия: dashboard | orders | order_status | products | product_update | product_create
         promos | promo_update | promo_create | users | stories | story_update
         partners | partner_status | settings | settings_update
"""
import json, os
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p97754588_arte_deli_site")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token, X-User-Id, Authorization",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def resp(status, body):
    return {"statusCode": status, "headers": {**CORS, "Content-Type": "application/json"},
            "body": json.dumps(body, ensure_ascii=False, default=str)}

def get_token(event):
    h = event.get("headers") or {}
    return h.get("X-Auth-Token") or h.get("x-auth-token")

def get_user(cur, token):
    if not token:
        return None
    cur.execute(f"""SELECT u.id, u.role FROM {SCHEMA}.sessions s
        JOIN {SCHEMA}.users u ON u.id=s.user_id
        WHERE s.token=%s AND s.expires_at>NOW()""", (token,))
    row = cur.fetchone()
    return {"id": row[0], "role": row[1]} if row else None

ADMIN_ROLES = ("admin", "manager")
ALL_STAFF = ("admin", "manager", "cook", "courier", "content")

def get_action(event, body):
    qs = event.get("queryStringParameters") or {}
    return (qs.get("_action") or body.get("_action") or "").strip()

def handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

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
        user = get_user(cur, token)
        if not user or user["role"] not in ALL_STAFF:
            return resp(403, {"error": "Нет доступа. Требуется роль сотрудника."})

        action = get_action(event, body)
        qs = event.get("queryStringParameters") or {}

        # ── DASHBOARD ──────────────────────────────────────────────────────
        if action == "dashboard":
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.orders")
            total_orders = cur.fetchone()[0]
            cur.execute(f"SELECT COALESCE(SUM(total),0) FROM {SCHEMA}.orders WHERE status!='cancelled'")
            revenue = cur.fetchone()[0]
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users WHERE role='customer'")
            total_clients = cur.fetchone()[0]
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.orders WHERE status='processing'")
            new_orders = cur.fetchone()[0]
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.orders WHERE DATE(created_at)=CURRENT_DATE")
            today_orders = cur.fetchone()[0]
            cur.execute(f"SELECT COALESCE(SUM(total),0) FROM {SCHEMA}.orders WHERE DATE(created_at)=CURRENT_DATE AND status!='cancelled'")
            today_revenue = cur.fetchone()[0]
            cur.execute(f"""SELECT id,customer_name,customer_phone,status,total,delivery_type,created_at
                FROM {SCHEMA}.orders ORDER BY created_at DESC LIMIT 10""")
            recent = [{"id":r[0],"name":r[1],"phone":r[2],"status":r[3],"total":r[4],"delivery_type":r[5],"created_at":str(r[6])}
                      for r in cur.fetchall()]
            return resp(200, {"stats": {"total_orders": total_orders, "revenue": int(revenue),
                              "total_clients": total_clients, "new_orders": new_orders,
                              "today_orders": today_orders, "today_revenue": int(today_revenue)},
                              "recent_orders": recent})

        # ── ORDERS LIST ────────────────────────────────────────────────────
        if action == "orders" and method == "GET":
            if user["role"] not in ADMIN_ROLES + ("cook", "courier"):
                return resp(403, {"error": "Нет доступа"})
            status_f = qs.get("status")
            search = qs.get("search")
            where, vals = [], []
            if status_f:
                where.append("status=%s"); vals.append(status_f)
            if search:
                where.append("(customer_name ILIKE %s OR customer_phone ILIKE %s)")
                vals += [f"%{search}%", f"%{search}%"]
            w = ("WHERE " + " AND ".join(where)) if where else ""
            cur.execute(f"""SELECT id,user_id,status,delivery_type,customer_name,customer_phone,
                address,apartment,entrance,floor,intercom,comment,delivery_time,
                payment_method,promo_code,discount,subtotal,delivery_cost,total,created_at,updated_at
                FROM {SCHEMA}.orders {w} ORDER BY created_at DESC LIMIT 200""", vals)
            orders = []
            for row in cur.fetchall():
                order_id = row[0]
                cur.execute(f"SELECT product_id,product_name,product_emoji,price,quantity,total FROM {SCHEMA}.order_items WHERE order_id=%s", (order_id,))
                items = [{"product_id":r[0],"name":r[1],"emoji":r[2],"price":r[3],"quantity":r[4],"total":r[5]} for r in cur.fetchall()]
                orders.append({"id":row[0],"user_id":row[1],"status":row[2],"delivery_type":row[3],
                               "customer_name":row[4],"customer_phone":row[5],"address":row[6],
                               "apartment":row[7],"entrance":row[8],"floor":row[9],"intercom":row[10],
                               "comment":row[11],"delivery_time":row[12],"payment_method":row[13],
                               "promo_code":row[14],"discount":row[15],"subtotal":row[16],
                               "delivery_cost":row[17],"total":row[18],"created_at":str(row[19]),
                               "updated_at":str(row[20]),"items":items})
            return resp(200, {"orders": orders, "total": len(orders)})

        # ── ORDER STATUS UPDATE ────────────────────────────────────────────
        if action == "order_status":
            if user["role"] not in ADMIN_ROLES + ("courier", "cook"):
                return resp(403, {"error": "Нет доступа"})
            order_id = body.get("order_id") or qs.get("order_id")
            new_status = body.get("status")
            valid = ("processing", "accepted", "delivering", "delivered", "cancelled")
            if not order_id or new_status not in valid:
                return resp(400, {"error": f"Нужен order_id и статус: {', '.join(valid)}"})
            cur.execute(f"UPDATE {SCHEMA}.orders SET status=%s,updated_at=NOW() WHERE id=%s RETURNING id",
                        (new_status, int(order_id)))
            if not cur.fetchone():
                return resp(404, {"error": "Заказ не найден"})
            conn.commit()
            return resp(200, {"success": True, "status": new_status})

        # ── PRODUCTS LIST ──────────────────────────────────────────────────
        if action == "products" and method == "GET":
            cur.execute(f"""SELECT id,name,description,composition,price,category,size,
                emoji,image_url,tags,is_available,sort_order,created_at
                FROM {SCHEMA}.products ORDER BY sort_order,id""")
            products = [{"id":r[0],"name":r[1],"description":r[2],"composition":r[3],
                         "price":r[4],"category":r[5],"size":r[6],"emoji":r[7],
                         "image_url":r[8],"tags":list(r[9]) if r[9] else [],
                         "is_available":r[10],"sort_order":r[11],"created_at":str(r[12])}
                        for r in cur.fetchall()]
            return resp(200, {"products": products})

        # ── PRODUCT UPDATE ─────────────────────────────────────────────────
        if action == "product_update":
            if user["role"] not in ADMIN_ROLES + ("content",):
                return resp(403, {"error": "Нет доступа"})
            prod_id = body.get("id")
            if not prod_id:
                return resp(400, {"error": "Нет id товара"})
            allowed = ("name","description","composition","price","category","size","emoji","tags","is_available","sort_order","image_url")
            fields = [f"{f}=%s" for f in allowed if f in body]
            vals = [body[f] for f in allowed if f in body]
            if not fields:
                return resp(400, {"error": "Нет данных для обновления"})
            fields.append("updated_at=NOW()")
            vals.append(int(prod_id))
            cur.execute(f"UPDATE {SCHEMA}.products SET {', '.join(fields)} WHERE id=%s RETURNING id", vals)
            if not cur.fetchone():
                return resp(404, {"error": "Товар не найден"})
            conn.commit()
            return resp(200, {"success": True})

        # ── PRODUCT CREATE ─────────────────────────────────────────────────
        if action == "product_create":
            if user["role"] not in ADMIN_ROLES + ("content",):
                return resp(403, {"error": "Нет доступа"})
            name = (body.get("name") or "").strip()
            price = body.get("price")
            if not name or not price:
                return resp(400, {"error": "Укажите название и цену"})
            cur.execute(f"""INSERT INTO {SCHEMA}.products
                (name,description,composition,price,category,size,emoji,tags,sort_order,is_available)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,TRUE) RETURNING id""",
                (name, body.get("description",""), body.get("composition",""), int(price),
                 body.get("category","pizza"), body.get("size","32 см"),
                 body.get("emoji","🍕"), body.get("tags",[]), body.get("sort_order",0)))
            prod_id = cur.fetchone()[0]
            conn.commit()
            return resp(201, {"success": True, "id": prod_id})

        # ── PROMOS LIST ────────────────────────────────────────────────────
        if action == "promos" and method == "GET":
            cur.execute(f"""SELECT id,code,title,description,type,value,min_order,
                is_active,is_one_time,for_new_users,for_birthday,emoji,created_at
                FROM {SCHEMA}.promos ORDER BY id""")
            promos = [{"id":r[0],"code":r[1],"title":r[2],"description":r[3],"type":r[4],
                       "value":r[5],"min_order":r[6],"is_active":r[7],"is_one_time":r[8],
                       "for_new_users":r[9],"for_birthday":r[10],"emoji":r[11],"created_at":str(r[12])}
                      for r in cur.fetchall()]
            return resp(200, {"promos": promos})

        # ── PROMO UPDATE ───────────────────────────────────────────────────
        if action == "promo_update":
            if user["role"] not in ADMIN_ROLES:
                return resp(403, {"error": "Нет доступа"})
            promo_id = body.get("id")
            if not promo_id:
                return resp(400, {"error": "Нет id акции"})
            allowed = ("code","title","description","type","value","min_order","is_active","is_one_time","for_new_users","for_birthday","emoji")
            fields = [f"{f}=%s" for f in allowed if f in body]
            vals = [body[f] for f in allowed if f in body]
            if not fields:
                return resp(400, {"error": "Нет данных"})
            vals.append(int(promo_id))
            cur.execute(f"UPDATE {SCHEMA}.promos SET {', '.join(fields)} WHERE id=%s", vals)
            conn.commit()
            return resp(200, {"success": True})

        # ── PROMO CREATE ───────────────────────────────────────────────────
        if action == "promo_create":
            if user["role"] not in ADMIN_ROLES:
                return resp(403, {"error": "Нет доступа"})
            title = (body.get("title") or "").strip()
            if not title:
                return resp(400, {"error": "Укажите название акции"})
            cur.execute(f"""INSERT INTO {SCHEMA}.promos
                (code,title,description,type,value,min_order,is_active,is_one_time,for_new_users,for_birthday,emoji)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
                (body.get("code"), title, body.get("description",""),
                 body.get("type","percent"), body.get("value",0), body.get("min_order",0),
                 body.get("is_active",True), body.get("is_one_time",False),
                 body.get("for_new_users",False), body.get("for_birthday",False),
                 body.get("emoji","✨")))
            promo_id = cur.fetchone()[0]
            conn.commit()
            return resp(201, {"success": True, "id": promo_id})

        # ── USERS ──────────────────────────────────────────────────────────
        if action == "users" and method == "GET":
            cur.execute(f"""SELECT id,phone,name,email,birth_date,role,created_at
                FROM {SCHEMA}.users ORDER BY created_at DESC LIMIT 500""")
            users = [{"id":r[0],"phone":r[1],"name":r[2],"email":r[3],
                      "birth_date":str(r[4]) if r[4] else None,"role":r[5],"created_at":str(r[6])}
                     for r in cur.fetchall()]
            return resp(200, {"users": users})

        # ── STORIES LIST ───────────────────────────────────────────────────
        if action == "stories" and method == "GET":
            cur.execute(f"""SELECT id,title,emoji,bg_gradient,image_url,content,
                button_text,button_link,is_active,sort_order,views,created_at
                FROM {SCHEMA}.stories ORDER BY sort_order,id""")
            stories = [{"id":r[0],"title":r[1],"emoji":r[2],"bg":r[3],"image_url":r[4],
                        "content":r[5],"button_text":r[6],"button_link":r[7],
                        "is_active":r[8],"sort_order":r[9],"views":r[10],"created_at":str(r[11])}
                       for r in cur.fetchall()]
            return resp(200, {"stories": stories})

        # ── STORY UPDATE ───────────────────────────────────────────────────
        if action == "story_update":
            if user["role"] not in ADMIN_ROLES + ("content",):
                return resp(403, {"error": "Нет доступа"})
            story_id = body.get("id")
            if not story_id:
                return resp(400, {"error": "Нет id истории"})
            allowed = ("title","emoji","bg_gradient","image_url","content","button_text","button_link","is_active","sort_order")
            fields = [f"{f}=%s" for f in allowed if f in body]
            vals = [body[f] for f in allowed if f in body]
            if not fields:
                return resp(400, {"error": "Нет данных"})
            vals.append(int(story_id))
            cur.execute(f"UPDATE {SCHEMA}.stories SET {', '.join(fields)} WHERE id=%s RETURNING id", vals)
            if not cur.fetchone():
                return resp(404, {"error": "Story не найдена"})
            conn.commit()
            return resp(200, {"success": True})

        # ── STORY CREATE ───────────────────────────────────────────────────
        if action == "story_create":
            if user["role"] not in ADMIN_ROLES + ("content",):
                return resp(403, {"error": "Нет доступа"})
            title = (body.get("title") or "").strip()
            if not title:
                return resp(400, {"error": "Укажите заголовок"})
            cur.execute(f"""INSERT INTO {SCHEMA}.stories
                (title,emoji,bg_gradient,image_url,content,button_text,button_link,is_active,sort_order)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
                (title, body.get("emoji","🍕"), body.get("bg_gradient","from-orange-600 to-red-700"),
                 body.get("image_url"), body.get("content"), body.get("button_text"),
                 body.get("button_link"), body.get("is_active",True), body.get("sort_order",0)))
            story_id = cur.fetchone()[0]
            conn.commit()
            return resp(201, {"success": True, "id": story_id})

        # ── SETTINGS GET ───────────────────────────────────────────────────
        if action == "settings" and method == "GET":
            cur.execute(f"SELECT key,value FROM {SCHEMA}.site_settings ORDER BY key")
            settings = {r[0]: r[1] for r in cur.fetchall()}
            return resp(200, {"settings": settings})

        # ── SETTINGS UPDATE ────────────────────────────────────────────────
        if action == "settings_update":
            if user["role"] not in ADMIN_ROLES + ("content",):
                return resp(403, {"error": "Нет доступа"})
            updates = body.get("settings", {})
            if not updates:
                return resp(400, {"error": "Нет данных"})
            for key, value in updates.items():
                cur.execute(f"""INSERT INTO {SCHEMA}.site_settings (key, value, updated_at)
                    VALUES (%s, %s, NOW())
                    ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()""",
                    (str(key), str(value) if value is not None else ""))
            conn.commit()
            return resp(200, {"success": True, "updated": len(updates)})

        return resp(400, {"error": f"Неизвестное действие: '{action}'. Укажите _action в query или body."})
    finally:
        conn.close()
