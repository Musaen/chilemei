import express from 'express';
import cors from 'cors';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { signToken, verifyToken } from './auth';
import type { TokenPayload } from './auth';
import type { Address, Dish, Order, OrderItem, Store } from '../../src/types';

// API 路由定义

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

/** 演示短信验证码（真实项目接入短信服务商） */
const smsCodes = new Map<string, { code: string; exp: number }>();

/** 生成订单号 */
function makeOrderId(): string {
  return 'CLM' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

/** 生成地址 id */
function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** 数据库行 → 店铺对象 */
function rowToStore(row: Record<string, unknown>): Store {
  return {
    id: String(row.id),
    name: String(row.name),
    emoji: String(row.emoji),
    category: String(row.category),
    rating: Number(row.rating),
    monthlySales: Number(row.monthly_sales),
    deliveryTime: Number(row.delivery_time),
    deliveryFee: Number(row.delivery_fee),
    minOrder: Number(row.min_order),
    distance: Number(row.distance),
    tags: JSON.parse(String(row.tags)) as string[],
    notice: String(row.notice),
    banner: String(row.banner),
    dishes: [],
  };
}

/** 数据库行 → 菜品对象 */
function rowToDish(row: Record<string, unknown>): Dish {
  return {
    id: String(row.id),
    name: String(row.name),
    desc: String(row.desc),
    price: Number(row.price),
    originalPrice: row.original_price == null ? undefined : Number(row.original_price),
    emoji: String(row.emoji),
    sales: Number(row.sales),
    tags: JSON.parse(String(row.tags)) as string[],
    avoid: JSON.parse(String(row.avoid)) as string[],
    soldOut: Boolean(row.sold_out),
  };
}

/** 登录校验中间件 */
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    res.status(401).json({ error: '未登录或登录已过期' });
    return;
  }
  req.user = payload;
  next();
}

/** 健康检查 */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'chilemei-api' });
});

// ===== 鉴权 =====

/** 发送验证码（演示：固定返回 123456） */
app.post('/api/auth/send-code', (req, res) => {
  const phone = String(req.body?.phone ?? '').trim();
  if (!/^1\d{10}$/.test(phone)) {
    res.status(400).json({ error: '手机号格式不正确' });
    return;
  }
  const code = '123456';
  smsCodes.set(phone, { code, exp: Date.now() + 10 * 60 * 1000 });
  console.log(`[演示短信] 向 ${phone} 发送验证码：${code}`);
  res.json({ ok: true, demoCode: code });
});

/** 验证码登录：不存在则自动注册 */
app.post('/api/auth/login', (req, res) => {
  const phone = String(req.body?.phone ?? '').trim();
  const code = String(req.body?.code ?? '').trim();
  if (!/^1\d{10}$/.test(phone)) {
    res.status(400).json({ error: '手机号格式不正确' });
    return;
  }
  const record = smsCodes.get(phone);
  if (!record || record.code !== code || record.exp < Date.now()) {
    res.status(400).json({ error: '验证码错误或已过期' });
    return;
  }
  smsCodes.delete(phone);

  // 用户不存在则创建
  let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as
    | Record<string, unknown>
    | undefined;
  if (!user) {
    db.prepare('INSERT INTO users (phone, nickname, created_at) VALUES (?, ?, ?)').run(
      phone,
      '干饭人' + phone.slice(-4),
      Date.now(),
    );
    user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as Record<string, unknown>;
  }

  const uid = Number(user.id);
  const token = signToken({ uid, phone });
  res.json({ token, user: { id: uid, phone, nickname: String(user.nickname) } });
});

/** 当前用户信息 */
app.get('/api/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, phone, nickname FROM users WHERE id = ?').get(req.user!.uid) as
    | Record<string, unknown>
    | undefined;
  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }
  res.json({ user: { id: user.id, phone: user.phone, nickname: user.nickname } });
});

/** 修改昵称 */
app.put('/api/me/nickname', requireAuth, (req, res) => {
  const nickname = String(req.body?.nickname ?? '').trim() || '干饭人';
  db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(nickname.slice(0, 12), req.user!.uid);
  res.json({ ok: true, nickname });
});

// ===== 店铺与菜品 =====

/** 店铺列表：支持分类 / 关键词 / 排序 */
app.get('/api/stores', (req, res) => {
  const category = String(req.query.category ?? '全部');
  const keyword = String(req.query.keyword ?? '').trim();
  const sort = String(req.query.sort ?? '综合');

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (category && category !== '全部') {
    conditions.push('s.category = ?');
    params.push(category);
  }
  if (keyword) {
    conditions.push(
      '(s.name LIKE ? OR s.tags LIKE ? OR EXISTS (SELECT 1 FROM dishes d WHERE d.store_id = s.id AND d.name LIKE ?))',
    );
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  let orderBy = 's.distance ASC';
  if (sort === '评分') orderBy = 's.rating DESC';
  if (sort === '销量') orderBy = 's.monthly_sales DESC';
  if (sort === '配送最快') orderBy = 's.delivery_time ASC';

  const sql = `SELECT s.* FROM stores s ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''} ORDER BY ${orderBy}`;
  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  // 列表同时内嵌菜品，前端无需再逐个请求详情
  const stores = rows.map((row) => {
    const store = rowToStore(row);
    const dishes = db
      .prepare('SELECT * FROM dishes WHERE store_id = ? ORDER BY sales DESC')
      .all(store.id) as Record<string, unknown>[];
    store.dishes = dishes.map(rowToDish);
    return store;
  });
  res.json({ stores });
});

/** 店铺详情（含菜品） */
app.get('/api/stores/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id) as
    | Record<string, unknown>
    | undefined;
  if (!row) {
    res.status(404).json({ error: '店铺不存在' });
    return;
  }
  const store = rowToStore(row);
  const dishes = db
    .prepare('SELECT * FROM dishes WHERE store_id = ? ORDER BY sales DESC')
    .all(store.id) as Record<string, unknown>[];
  store.dishes = dishes.map(rowToDish);
  res.json({ store });
});

// ===== 地址 =====

/** 地址列表 */
app.get('/api/addresses', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY id')
    .all(req.user!.uid) as Record<string, unknown>[];
  const addresses: Address[] = rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    phone: String(r.phone),
    detail: String(r.detail),
    tag: String(r.tag),
  }));
  res.json({ addresses });
});

/** 新增地址 */
app.post('/api/addresses', requireAuth, (req, res) => {
  const { name, phone, detail, tag } = req.body ?? {};
  if (!String(name ?? '').trim() || !String(phone ?? '').trim() || !String(detail ?? '').trim()) {
    res.status(400).json({ error: '地址信息不完整' });
    return;
  }
  const id = makeId('addr');
  db.prepare('INSERT INTO addresses (id, user_id, name, phone, detail, tag) VALUES (?, ?, ?, ?, ?, ?)').run(
    id,
    req.user!.uid,
    String(name).trim(),
    String(phone).trim(),
    String(detail).trim(),
    String(tag ?? '家'),
  );
  res.json({
    address: { id, name: String(name).trim(), phone: String(phone).trim(), detail: String(detail).trim(), tag: String(tag ?? '家') },
  });
});

/** 删除地址（校验归属） */
app.delete('/api/addresses/:id', requireAuth, (req, res) => {
  const result = db
    .prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user!.uid);
  if (result.changes === 0) {
    res.status(404).json({ error: '地址不存在' });
    return;
  }
  res.json({ ok: true });
});

// ===== 收藏 / 拉黑 =====

/** 收藏列表（店铺 id） */
app.get('/api/favorites', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT store_id FROM favorites WHERE user_id = ?')
    .all(req.user!.uid) as Record<string, unknown>[];
  res.json({ ids: rows.map((r) => String(r.store_id)) });
});

/** 收藏切换 */
app.post('/api/favorites/:storeId', requireAuth, (req, res) => {
  const storeId = String(req.params.storeId);
  const exists = db
    .prepare('SELECT 1 FROM favorites WHERE user_id = ? AND store_id = ?')
    .get(req.user!.uid, storeId);
  if (exists) {
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND store_id = ?').run(req.user!.uid, storeId);
    res.json({ favorite: false });
  } else {
    db.prepare('INSERT INTO favorites (user_id, store_id) VALUES (?, ?)').run(req.user!.uid, storeId);
    res.json({ favorite: true });
  }
});

/** 拉黑列表（店铺 id） */
app.get('/api/blocked', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT store_id FROM blocked_stores WHERE user_id = ?')
    .all(req.user!.uid) as Record<string, unknown>[];
  res.json({ ids: rows.map((r) => String(r.store_id)) });
});

/** 拉黑切换 */
app.post('/api/blocked/:storeId', requireAuth, (req, res) => {
  const storeId = String(req.params.storeId);
  const exists = db
    .prepare('SELECT 1 FROM blocked_stores WHERE user_id = ? AND store_id = ?')
    .get(req.user!.uid, storeId);
  if (exists) {
    db.prepare('DELETE FROM blocked_stores WHERE user_id = ? AND store_id = ?').run(req.user!.uid, storeId);
    res.json({ blocked: false });
  } else {
    db.prepare('INSERT INTO blocked_stores (user_id, store_id) VALUES (?, ?)').run(req.user!.uid, storeId);
    res.json({ blocked: true });
  }
});

// ===== 忌口偏好 =====

/** 获取忌口偏好 */
app.get('/api/excludes', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT key FROM meal_excludes WHERE user_id = ?')
    .all(req.user!.uid) as Record<string, unknown>[];
  res.json({ excludes: rows.map((r) => String(r.key)) });
});

/** 覆盖忌口偏好 */
app.put('/api/excludes', requireAuth, (req, res) => {
  const excludes = Array.isArray(req.body?.excludes) ? req.body.excludes.map(String) : [];
  db.prepare('DELETE FROM meal_excludes WHERE user_id = ?').run(req.user!.uid);
  const insert = db.prepare('INSERT INTO meal_excludes (user_id, key) VALUES (?, ?)');
  for (const key of excludes) insert.run(req.user!.uid, key);
  res.json({ ok: true, excludes });
});

// ===== 订单 =====

/** 数据库行 → 订单对象 */
function rowToOrder(row: Record<string, unknown>, items: OrderItem[]): Order {
  return {
    id: String(row.id),
    storeId: String(row.store_id),
    storeName: String(row.store_name),
    storeEmoji: String(row.store_emoji),
    items,
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    discount: Number(row.discount),
    total: Number(row.total),
    address: {
      id: String(row.id) + '_addr',
      name: String(row.address_name),
      phone: String(row.address_phone),
      detail: String(row.address_detail),
      tag: String(row.address_tag),
    },
    note: String(row.note),
    placedAt: Number(row.placed_at),
    payMethod: '微信支付',
    deliveryTime: Number(row.delivery_time),
  };
}

/** 订单列表（当前用户，新的在前） */
app.get('/api/orders', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT o.*, s.name AS store_name, s.emoji AS store_emoji
       FROM orders o JOIN stores s ON s.id = o.store_id
       WHERE o.user_id = ? ORDER BY o.placed_at DESC`,
    )
    .all(req.user!.uid) as Record<string, unknown>[];
  const orders = rows.map((row) => {
    const items = db
      .prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id')
      .all(String(row.id)) as Record<string, unknown>[];
    const orderItems: OrderItem[] = items.map((i) => ({
      dishId: String(i.dish_id),
      name: String(i.name),
      price: Number(i.price),
      qty: Number(i.qty),
      emoji: String(i.emoji),
    }));
    return rowToOrder(row, orderItems);
  });
  res.json({ orders });
});

/** 订单详情（校验归属） */
app.get('/api/orders/:id', requireAuth, (req, res) => {
  const row = db
    .prepare(
      `SELECT o.*, s.name AS store_name, s.emoji AS store_emoji
       FROM orders o JOIN stores s ON s.id = o.store_id
       WHERE o.id = ? AND o.user_id = ?`,
    )
    .get(req.params.id, req.user!.uid) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json({ error: '订单不存在' });
    return;
  }
  const items = db
    .prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id')
    .all(String(row.id)) as Record<string, unknown>[];
  const orderItems: OrderItem[] = items.map((i) => ({
    dishId: String(i.dish_id),
    name: String(i.name),
    price: Number(i.price),
    qty: Number(i.qty),
    emoji: String(i.emoji),
  }));
  res.json({ order: rowToOrder(row, orderItems) });
});

/** 创建订单：服务端按数据库价格计算金额，保证价格可信 */
app.post('/api/orders', requireAuth, (req, res) => {
  const { storeId, items, addressId, note } = req.body ?? {};

  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(String(storeId ?? '')) as
    | Record<string, unknown>
    | undefined;
  if (!store) {
    res.status(404).json({ error: '店铺不存在' });
    return;
  }
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: '订单不能为空' });
    return;
  }
  const address = db
    .prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?')
    .get(String(addressId ?? ''), req.user!.uid) as Record<string, unknown> | undefined;
  if (!address) {
    res.status(400).json({ error: '收货地址无效' });
    return;
  }

  // 汇总订单项并计算小计（价格以数据库为准）
  const orderItems: OrderItem[] = [];
  let subtotal = 0;
  for (const item of items) {
    const dish = db
      .prepare('SELECT * FROM dishes WHERE id = ? AND store_id = ?')
      .get(String(item?.dishId ?? ''), store.id) as Record<string, unknown> | undefined;
    if (!dish) {
      res.status(400).json({ error: `菜品不存在：${String(item?.dishId ?? '')}` });
      return;
    }
    if (Boolean(dish.sold_out)) {
      res.status(400).json({ error: `菜品已售罄：${String(dish.name)}` });
      return;
    }
    const qty = Math.max(1, Math.floor(Number(item?.qty) || 0));
    const price = Number(dish.price);
    subtotal += price * qty;
    orderItems.push({ dishId: String(dish.id), name: String(dish.name), price, qty, emoji: String(dish.emoji) });
  }

  // 优惠规则：首单立减 5 元 + 满 30 免配送费
  const deliveryFee = Number(store.delivery_fee);
  const orderCount = (
    db.prepare('SELECT COUNT(*) AS c FROM orders WHERE user_id = ?').get(req.user!.uid) as { c: number }
  ).c;
  const firstOrderDiscount = orderCount === 0 ? 5 : 0;
  const freeDelivery = subtotal >= 30;
  const discount = firstOrderDiscount + (freeDelivery ? deliveryFee : 0);
  const total = Math.max(0, subtotal + deliveryFee - discount);

  const orderId = makeOrderId();
  const placedAt = Date.now();

  db.exec('BEGIN');
  try {
    db.prepare(
      `INSERT INTO orders (id, user_id, store_id, subtotal, delivery_fee, discount, total, address_name, address_phone, address_detail, address_tag, note, placed_at, delivery_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      orderId,
      req.user!.uid,
      String(store.id),
      subtotal,
      deliveryFee,
      discount,
      total,
      String(address.name),
      String(address.phone),
      String(address.detail),
      String(address.tag),
      String(note ?? '').slice(0, 200),
      placedAt,
      Number(store.delivery_time),
    );
    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, dish_id, name, price, qty, emoji) VALUES (?, ?, ?, ?, ?, ?)',
    );
    for (const item of orderItems) {
      insertItem.run(orderId, item.dishId, item.name, item.price, item.qty, item.emoji);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('创建订单失败', err);
    res.status(500).json({ error: '创建订单失败' });
    return;
  }

  const row = db
    .prepare(
      `SELECT o.*, s.name AS store_name, s.emoji AS store_emoji
       FROM orders o JOIN stores s ON s.id = o.store_id WHERE o.id = ?`,
    )
    .get(orderId) as Record<string, unknown>;
  res.status(201).json({ order: rowToOrder(row, orderItems) });
});

/** 统一 404 与错误处理 */
app.use((_req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('服务异常', err);
  res.status(500).json({ error: '服务内部错误' });
});
