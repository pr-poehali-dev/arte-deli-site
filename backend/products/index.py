"""
Продукты, истории и промокоды ARTE DELI.
Роутинг через path suffix ИЛИ _action в body.
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

def get_user_by_token(cur, token):
    if not token:
        return None
    cur.execute(f"""SELECT u.id, u.role FROM {SCHEMA}.sessions s
        JOIN {SCHEMA}.users u ON u.id=s.user_id
        WHERE s.token=%s AND s.expires_at>NOW()""", (token,))
    row = cur.fetchone()
    return {"id": row[0], "role": row[1]} if row else None

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
        parts = [p for p in path.split("/") if p]
        last = parts[-1] if parts else ""
        action = body.get("_action", last)

        # GET promos
        if action == "promos" and method == "GET":
            cur.execute(f"""SELECT id,code,title,description,type,value,min_order,
                is_active,for_new_users,for_birthday,emoji,created_at
                FROM {SCHEMA}.promos WHERE is_active=TRUE ORDER BY id""")
            promos = [{"id":r[0],"code":r[1],"title":r[2],"description":r[3],"type":r[4],
                       "value":r[5],"min_order":r[6],"is_active":r[7],"for_new_users":r[8],
                       "for_birthday":r[9],"emoji":r[10],"created_at":str(r[11])} for r in cur.fetchall()]
            return resp(200, {"promos": promos})

        # POST check-promo
        if action == "check-promo":
            code = (body.get("code") or "").strip().upper()
            subtotal = body.get("subtotal", 0)
            if not code:
                return resp(400, {"error": "Укажите промокод"})
            cur.execute(f"""SELECT id,type,value,min_order,title
                FROM {SCHEMA}.promos WHERE code=%s AND is_active=TRUE""", (code,))
            row = cur.fetchone()
            if not row:
                return resp(404, {"error": "Промокод не найден или недействителен"})
            p_id, p_type, p_value, p_min, p_title = row
            if subtotal < p_min:
                return resp(400, {"error": f"Минимальная сумма заказа {p_min} ₽"})
            discount = int(subtotal * p_value / 100) if p_type == "percent" else (p_value if p_type == "fixed" else 0)
            return resp(200, {"valid": True, "code": code, "title": p_title,
                              "type": p_type, "value": p_value, "discount": discount})

        # GET stories
        if action == "stories" and method == "GET":
            cur.execute(f"""SELECT id,title,emoji,bg_gradient,image_url,content,
                button_text,button_link,is_active,sort_order,views
                FROM {SCHEMA}.stories WHERE is_active=TRUE ORDER BY sort_order""")
            stories = [{"id":r[0],"title":r[1],"emoji":r[2],"bg":r[3],"image_url":r[4],
                        "content":r[5],"button_text":r[6],"button_link":r[7],
                        "is_active":r[8],"sort_order":r[9],"views":r[10]} for r in cur.fetchall()]
            return resp(200, {"stories": stories})

        # POST partner
        if action == "partner":
            place = (body.get("place_name") or body.get("place") or "").strip()
            phone = (body.get("phone") or "").strip()
            if not place or not phone:
                return resp(400, {"error": "Укажите название заведения и телефон"})
            cur.execute(f"""INSERT INTO {SCHEMA}.partner_requests (place_name,phone,email,comment)
                VALUES (%s,%s,%s,%s) RETURNING id""",
                (place, phone, body.get("email"), body.get("comment")))
            req_id = cur.fetchone()[0]
            conn.commit()
            return resp(201, {"success": True, "id": req_id})

        # POST seed (admin only)
        if action == "seed":
            token = get_token(event)
            user = get_user_by_token(cur, token)
            if not user or user["role"] != "admin":
                return resp(403, {"error": "Только для администратора"})
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.products")
            count = cur.fetchone()[0]
            if count > 0:
                return resp(200, {"message": f"Уже заполнено ({count} товаров)"})
            pizzas = [
                ('Чикен Барбекю','Курица, соус барбекю, красный лук, маринованные огурчики, сыр моцарелла','Тесто, соус барбекю, куриное филе, красный лук, огурчики маринованные, моцарелла',680,'pizza','32 см','🍗','{popular}',1),
                ('Салями с Курицей','Салями, куриное филе, болгарский перец, томаты, моцарелла','Тесто, томатный соус, салями, куриное филе, перец болгарский, томаты, моцарелла',540,'pizza','32 см','🍕','{hit}',2),
                ('Пепперони','Классическая пепперони с пикантной колбасой','Тесто, томатный соус, пепперони, моцарелла',500,'pizza','32 см','🌶️','{classic}',3),
                ('Охотничья','Охотничьи колбаски, бекон, грибы, лук, томаты, сыр','Тесто, томатный соус, охотничьи колбаски, бекон, грибы, лук, томаты, моцарелла',660,'pizza','32 см','🏹','{hit}',4),
                ('Мясная','Три вида мяса: говядина, курица, ветчина','Тесто, томатный соус, говядина, куриное филе, ветчина, лук, моцарелла',560,'pizza','32 см','🥩','{}',5),
                ('Маргарита','Классика итальянской кухни. Томаты, базилик, моцарелла','Тесто, томатный соус, томаты, базилик, моцарелла',440,'pizza','32 см','🍅','{classic}',6),
                ('Курица с Грибами','Нежное куриное филе с ароматными лесными грибами','Тесто, сливочный соус, куриное филе, грибы, лук, моцарелла',520,'pizza','32 см','🍄','{}',7),
                ('Карбонара','Бекон, сливочный соус, яйцо, пармезан','Тесто, сливочный соус, бекон, яйцо, пармезан, моцарелла',580,'pizza','32 см','🥓','{new}',8),
                ('Диабло','Острая пицца с халапеньо, чили и пикантным мясом','Тесто, острый томатный соус, пепперони, халапеньо, перец чили, моцарелла',540,'pizza','32 см','🔥','{hot}',9),
                ('Деревенская','Картофель, бекон, сметанный соус, зелень','Тесто, сметанный соус, картофель, бекон, зелёный лук, укроп, моцарелла',680,'pizza','32 см','🌿','{popular}',10),
                ('Гавайская','Курица, ананас, сладкий соус','Тесто, томатный соус, куриное филе, ананас консервированный, моцарелла',540,'pizza','32 см','🍍','{}',11),
                ('Ветчина Грибы','Нежная ветчина с грибами и сливочным соусом','Тесто, сливочный соус, ветчина, грибы, лук, моцарелла',520,'pizza','32 см','🍖','{}',12),
            ]
            for p in pizzas:
                cur.execute(f"""INSERT INTO {SCHEMA}.products
                    (name,description,composition,price,category,size,emoji,tags,sort_order)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)""", p)
            cur.execute(f"""INSERT INTO {SCHEMA}.promos (code,title,description,type,value,for_new_users,emoji)
                VALUES ('ПЕРВЫЙ','Скидка 15%% на первый заказ','Только для новых клиентов','percent',15,TRUE,'✨')""")
            cur.execute(f"""INSERT INTO {SCHEMA}.promos (code,title,description,type,value,for_birthday,emoji)
                VALUES ('ХЭППИ','Скидка 15%% в День Рождения','Укажи дату рождения в профиле','percent',15,TRUE,'🎂')""")
            stories_data = [('Акции','🔥','from-orange-600 to-red-700',1),('Новинки','🍕','from-green-700 to-green-900',2),
                            ('Подарки','🎁','from-yellow-600 to-orange-700',3),('День рождения','🎂','from-pink-600 to-rose-800',4),
                            ('Хиты','🏆','from-amber-600 to-yellow-700',5)]
            for s in stories_data:
                cur.execute(f"INSERT INTO {SCHEMA}.stories (title,emoji,bg_gradient,sort_order) VALUES (%s,%s,%s,%s)", s)
            conn.commit()
            return resp(201, {"success": True, "products": len(pizzas)})

        # GET product by id
        if method == "GET" and action and action.isdigit():
            cur.execute(f"""SELECT id,name,description,composition,price,category,size,
                emoji,image_url,tags,is_available,sort_order
                FROM {SCHEMA}.products WHERE id=%s""", (int(action),))
            row = cur.fetchone()
            if not row:
                return resp(404, {"error": "Товар не найден"})
            return resp(200, {"product": {"id":row[0],"name":row[1],"description":row[2],
                "composition":row[3],"price":row[4],"category":row[5],"size":row[6],
                "emoji":row[7],"image_url":row[8],"tags":list(row[9]) if row[9] else [],
                "is_available":row[10],"sort_order":row[11]}})

        # PUT product by id (admin)
        if method == "PUT":
            token = get_token(event)
            user = get_user_by_token(cur, token)
            if not user or user["role"] not in ("admin","manager","content"):
                return resp(403, {"error": "Нет доступа"})
            prod_id = body.get("id") or (int(action) if action.isdigit() else None)
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

        # POST create product (admin)
        if method == "POST":
            token = get_token(event)
            user = get_user_by_token(cur, token)
            if not user or user["role"] not in ("admin","manager","content"):
                return resp(403, {"error": "Нет доступа"})
            name = (body.get("name") or "").strip()
            price = body.get("price")
            if not name or not price:
                return resp(400, {"error": "Укажите название и цену"})
            cur.execute(f"""INSERT INTO {SCHEMA}.products
                (name,description,composition,price,category,size,emoji,tags,sort_order,is_available)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
                (name, body.get("description"), body.get("composition"), int(price),
                 body.get("category","pizza"), body.get("size","32 см"),
                 body.get("emoji","🍕"), body.get("tags",[]), body.get("sort_order",0), True))
            prod_id = cur.fetchone()[0]
            conn.commit()
            return resp(201, {"success": True, "id": prod_id})

        # Default GET: list products
        qs = event.get("queryStringParameters") or {}
        category = qs.get("category")
        if category:
            cur.execute(f"""SELECT id,name,description,composition,price,category,size,
                emoji,image_url,tags,is_available,sort_order
                FROM {SCHEMA}.products WHERE is_available=TRUE AND category=%s ORDER BY sort_order""", (category,))
        else:
            cur.execute(f"""SELECT id,name,description,composition,price,category,size,
                emoji,image_url,tags,is_available,sort_order
                FROM {SCHEMA}.products WHERE is_available=TRUE ORDER BY sort_order""")
        rows = cur.fetchall()
        products = [{"id":r[0],"name":r[1],"description":r[2],"composition":r[3],
                     "price":r[4],"category":r[5],"size":r[6],"emoji":r[7],
                     "image_url":r[8],"tags":list(r[9]) if r[9] else [],
                     "is_available":r[10],"sort_order":r[11]} for r in rows]
        return resp(200, {"products": products, "total": len(products)})

    finally:
        conn.close()
