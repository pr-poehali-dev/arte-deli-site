"""
Админ-панель ARTE DELI.
GET  /admin/dashboard   — статистика (заказы, выручка, клиенты)
GET  /admin/orders      — все заказы с фильтрами
PUT  /admin/orders/{id}/status — сменить статус
GET  /admin/products    — все товары (включая недоступные)
PUT  /admin/products/{id} — обновить товар
GET  /admin/promos      — все промокоды
POST /admin/promos      — создать промокод
PUT  /admin/promos/{id} — обновить промокод
GET  /admin/partners    — заявки партнёров
PUT  /admin/partners/{id}/status — статус заявки
GET  /admin/users       — список клиентов
GET  /admin/stories     — stories
PUT  /admin/stories/{id} — обновить story
"""
import json, os
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p97754588_arte_deli_site")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token, X-User-Id",
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

ADMIN_ROLES = ("admin","manager")
ALL_STAFF = ("admin","manager","cook","courier","content")

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
        user = get_user(cur, token)
        if not user or user["role"] not in ALL_STAFF:
            return resp(403, {"error": "Нет доступа. Требуется роль сотрудника."})

        parts = [p for p in path.split("/") if p]
        section = parts[1] if len(parts) > 1 else parts[0] if parts else ""

        # GET /admin/dashboard
        if section == "dashboard" and method == "GET":
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.orders")
            total_orders = cur.fetchone()[0]
            cur.execute(f"SELECT COALESCE(SUM(total),0) FROM {SCHEMA}.orders WHERE status != 'cancelled'")
            revenue = cur.fetchone()[0]
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users WHERE role='customer'")
            total_clients = cur.fetchone()[0]
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.orders WHERE status='processing'")
            new_orders = cur.fetchone()[0]
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.partner_requests WHERE status='new'")
            new_partners = cur.fetchone()[0]
            cur.execute(f"""SELECT id,customer_name,customer_phone,status,total,created_at
                FROM {SCHEMA}.orders ORDER BY created_at DESC LIMIT 10""")
            recent = [{"id":r[0],"name":r[1],"phone":r[2],"status":r[3],"total":r[4],"created_at":str(r[5])}
                      for r in cur.fetchall()]
            return resp(200, {
                "stats": {"total_orders": total_orders, "revenue": int(revenue),
                          "total_clients": total_clients, "new_orders": new_orders,
                          "new_partners": new_partners},
                "recent_orders": recent
            })

        # GET /admin/orders
        if section == "orders" and method == "GET" and len(parts) <= 2:
            qs = event.get("queryStringParameters") or {}
            status_f = qs.get("status")
            search = qs.get("search")
            where = []
            vals = []
            if status_f:
                where.append("status=%s")
                vals.append(status_f)
            if search:
                where.append("(customer_name ILIKE %s OR customer_phone ILIKE %s)")
                vals += [f"%{search}%", f"%{search}%"]
            w = ("WHERE " + " AND ".join(where)) if where else ""
            cur.execute(f"""SELECT id,user_id,status,delivery_type,customer_name,customer_phone,
                address,subtotal,discount,delivery_cost,total,payment_method,promo_code,
                delivery_time,comment,created_at,updated_at
                FROM {SCHEMA}.orders {w} ORDER BY created_at DESC LIMIT 200""", vals)
            orders = [{"id":r[0],"user_id":r[1],"status":r[2],"delivery_type":r[3],
                       "customer_name":r[4],"customer_phone":r[5],"address":r[6],
                       "subtotal":r[7],"discount":r[8],"delivery_cost":r[9],"total":r[10],
                       "payment_method":r[11],"promo_code":r[12],"delivery_time":r[13],
                       "comment":r[14],"created_at":str(r[15]),"updated_at":str(r[16])}
                      for r in cur.fetchall()]
            return resp(200, {"orders": orders, "total": len(orders)})

        # PUT /admin/orders/{id}/status
        if section == "orders" and "status" in parts and method == "PUT":
            if user["role"] not in ADMIN_ROLES + ("courier","cook"):
                return resp(403, {"error": "Нет доступа"})
            order_id = None
            for p in parts:
                try:
                    order_id = int(p)
                    break
                except Exception:
                    pass
            new_status = body.get("status")
            valid = ("processing","accepted","delivering","delivered","cancelled")
            if new_status not in valid:
                return resp(400, {"error": f"Статус: {', '.join(valid)}"})
            cur.execute(f"UPDATE {SCHEMA}.orders SET status=%s,updated_at=NOW() WHERE id=%s RETURNING id",
                        (new_status, order_id))
            if not cur.fetchone():
                return resp(404, {"error": "Заказ не найден"})
            conn.commit()
            return resp(200, {"success": True, "status": new_status})

        # GET /admin/products
        if section == "products" and method == "GET" and len(parts) <= 2:
            cur.execute(f"""SELECT id,name,description,composition,price,category,size,
                emoji,image_url,tags,is_available,sort_order,created_at
                FROM {SCHEMA}.products ORDER BY sort_order""")
            products = [{"id":r[0],"name":r[1],"description":r[2],"composition":r[3],
                         "price":r[4],"category":r[5],"size":r[6],"emoji":r[7],
                         "image_url":r[8],"tags":list(r[9]) if r[9] else [],
                         "is_available":r[10],"sort_order":r[11],"created_at":str(r[12])}
                        for r in cur.fetchall()]
            return resp(200, {"products": products})

        # PUT /admin/products/{id}
        if section == "products" and method == "PUT":
            if user["role"] not in ADMIN_ROLES + ("content",):
                return resp(403, {"error": "Нет доступа"})
            prod_id = None
            for p in parts:
                try:
                    prod_id = int(p)
                    break
                except Exception:
                    pass
            if not prod_id:
                return resp(400, {"error": "Нет ID"})
            allowed = ("name","description","composition","price","category","size","emoji","tags","is_available","sort_order","image_url")
            fields = [f"{f}=%s" for f in allowed if f in body]
            vals = [body[f] for f in allowed if f in body]
            if not fields:
                return resp(400, {"error": "Нет данных"})
            fields.append("updated_at=NOW()")
            vals.append(prod_id)
            cur.execute(f"UPDATE {SCHEMA}.products SET {', '.join(fields)} WHERE id=%s", vals)
            conn.commit()
            return resp(200, {"success": True})

        # GET /admin/promos
        if section == "promos" and method == "GET":
            cur.execute(f"""SELECT id,code,title,description,type,value,min_order,
                is_active,is_one_time,for_new_users,for_birthday,emoji,created_at
                FROM {SCHEMA}.promos ORDER BY id""")
            promos = [{"id":r[0],"code":r[1],"title":r[2],"description":r[3],"type":r[4],
                       "value":r[5],"min_order":r[6],"is_active":r[7],"is_one_time":r[8],
                       "for_new_users":r[9],"for_birthday":r[10],"emoji":r[11],"created_at":str(r[12])}
                      for r in cur.fetchall()]
            return resp(200, {"promos": promos})

        # POST /admin/promos
        if section == "promos" and method == "POST":
            if user["role"] not in ADMIN_ROLES:
                return resp(403, {"error": "Нет доступа"})
            title = body.get("title","").strip()
            ptype = body.get("type","percent")
            if not title:
                return resp(400, {"error": "Укажите название"})
            cur.execute(f"""INSERT INTO {SCHEMA}.promos
                (code,title,description,type,value,min_order,is_active,is_one_time,for_new_users,for_birthday,emoji)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
                (body.get("code"), title, body.get("description"), ptype,
                 body.get("value",0), body.get("min_order",0), body.get("is_active",True),
                 body.get("is_one_time",False), body.get("for_new_users",False),
                 body.get("for_birthday",False), body.get("emoji","✨")))
            promo_id = cur.fetchone()[0]
            conn.commit()
            return resp(201, {"success": True, "id": promo_id})

        # PUT /admin/promos/{id}
        if section == "promos" and method == "PUT":
            if user["role"] not in ADMIN_ROLES:
                return resp(403, {"error": "Нет доступа"})
            promo_id = None
            for p in parts:
                try:
                    promo_id = int(p)
                    break
                except Exception:
                    pass
            allowed = ("code","title","description","type","value","min_order","is_active","is_one_time","for_new_users","for_birthday","emoji")
            fields = [f"{f}=%s" for f in allowed if f in body]
            vals = [body[f] for f in allowed if f in body]
            if not fields:
                return resp(400, {"error": "Нет данных"})
            vals.append(promo_id)
            cur.execute(f"UPDATE {SCHEMA}.promos SET {', '.join(fields)} WHERE id=%s", vals)
            conn.commit()
            return resp(200, {"success": True})

        # GET /admin/partners
        if section == "partners" and method == "GET":
            cur.execute(f"SELECT id,place_name,phone,email,comment,status,created_at FROM {SCHEMA}.partner_requests ORDER BY created_at DESC")
            partners = [{"id":r[0],"place_name":r[1],"phone":r[2],"email":r[3],
                         "comment":r[4],"status":r[5],"created_at":str(r[6])} for r in cur.fetchall()]
            return resp(200, {"partners": partners})

        # PUT /admin/partners/{id}/status
        if section == "partners" and "status" in parts and method == "PUT":
            if user["role"] not in ADMIN_ROLES:
                return resp(403, {"error": "Нет доступа"})
            req_id = None
            for p in parts:
                try:
                    req_id = int(p)
                    break
                except Exception:
                    pass
            new_status = body.get("status")
            valid = ("new","contacted","rejected","approved")
            if new_status not in valid:
                return resp(400, {"error": f"Статус: {', '.join(valid)}"})
            cur.execute(f"UPDATE {SCHEMA}.partner_requests SET status=%s WHERE id=%s", (new_status, req_id))
            conn.commit()
            return resp(200, {"success": True})

        # GET /admin/users
        if section == "users" and method == "GET":
            cur.execute(f"""SELECT id,phone,name,email,birth_date,role,created_at
                FROM {SCHEMA}.users ORDER BY created_at DESC LIMIT 500""")
            users = [{"id":r[0],"phone":r[1],"name":r[2],"email":r[3],
                      "birth_date":str(r[4]) if r[4] else None,"role":r[5],"created_at":str(r[6])}
                     for r in cur.fetchall()]
            return resp(200, {"users": users})

        # GET /admin/stories
        if section == "stories" and method == "GET":
            cur.execute(f"""SELECT id,title,emoji,bg_gradient,image_url,content,
                button_text,button_link,is_active,sort_order,views,created_at
                FROM {SCHEMA}.stories ORDER BY sort_order""")
            stories = [{"id":r[0],"title":r[1],"emoji":r[2],"bg":r[3],"image_url":r[4],
                        "content":r[5],"button_text":r[6],"button_link":r[7],
                        "is_active":r[8],"sort_order":r[9],"views":r[10],"created_at":str(r[11])}
                       for r in cur.fetchall()]
            return resp(200, {"stories": stories})

        # PUT /admin/stories/{id}
        if section == "stories" and method == "PUT":
            if user["role"] not in ADMIN_ROLES + ("content",):
                return resp(403, {"error": "Нет доступа"})
            story_id = None
            for p in parts:
                try:
                    story_id = int(p)
                    break
                except Exception:
                    pass
            allowed = ("title","emoji","bg_gradient","image_url","content","button_text","button_link","is_active","sort_order")
            fields = [f"{f}=%s" for f in allowed if f in body]
            vals = [body[f] for f in allowed if f in body]
            if not fields:
                return resp(400, {"error": "Нет данных"})
            vals.append(story_id)
            cur.execute(f"UPDATE {SCHEMA}.stories SET {', '.join(fields)} WHERE id=%s", vals)
            conn.commit()
            return resp(200, {"success": True})

        return resp(404, {"error": "Not found"})
    finally:
        conn.close()
