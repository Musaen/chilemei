import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 数据库初始化：使用 Node 内置 SQLite，免安装原生依赖

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../data');
mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.CHILEMEI_DB ?? path.join(dataDir, 'chilemei.db');

export const db = new DatabaseSync(dbPath);

// 开启 WAL 模式，提高并发读写体验
db.exec('PRAGMA journal_mode = WAL;');

// 建表：用户 / 店铺 / 菜品 / 地址 / 收藏 / 拉黑 / 忌口 / 订单 / 订单明细 / 优惠券 / 评价
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL DEFAULT '干饭人',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  category TEXT NOT NULL,
  rating REAL NOT NULL,
  monthly_sales INTEGER NOT NULL,
  delivery_time INTEGER NOT NULL,
  delivery_fee REAL NOT NULL,
  min_order REAL NOT NULL,
  distance REAL NOT NULL,
  tags TEXT NOT NULL,
  notice TEXT NOT NULL,
  banner TEXT NOT NULL,
  open_hours TEXT NOT NULL DEFAULT '00:00-23:59',
  address TEXT NOT NULL DEFAULT '',
  license TEXT NOT NULL DEFAULT '',
  promos TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS dishes (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id),
  name TEXT NOT NULL,
  desc TEXT NOT NULL,
  price REAL NOT NULL,
  original_price REAL,
  emoji TEXT NOT NULL,
  sales INTEGER NOT NULL,
  tags TEXT NOT NULL,
  avoid TEXT NOT NULL,
  sold_out INTEGER NOT NULL DEFAULT 0,
  specs TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS addresses (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  detail TEXT NOT NULL,
  tag TEXT NOT NULL DEFAULT '家'
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id INTEGER NOT NULL REFERENCES users(id),
  store_id TEXT NOT NULL REFERENCES stores(id),
  PRIMARY KEY (user_id, store_id)
);

CREATE TABLE IF NOT EXISTS blocked_stores (
  user_id INTEGER NOT NULL REFERENCES users(id),
  store_id TEXT NOT NULL REFERENCES stores(id),
  PRIMARY KEY (user_id, store_id)
);

CREATE TABLE IF NOT EXISTS meal_excludes (
  user_id INTEGER NOT NULL REFERENCES users(id),
  key TEXT NOT NULL,
  PRIMARY KEY (user_id, key)
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  store_id TEXT NOT NULL REFERENCES stores(id),
  subtotal REAL NOT NULL,
  delivery_fee REAL NOT NULL,
  discount REAL NOT NULL,
  total REAL NOT NULL,
  address_name TEXT NOT NULL,
  address_phone TEXT NOT NULL,
  address_detail TEXT NOT NULL,
  address_tag TEXT NOT NULL DEFAULT '家',
  note TEXT NOT NULL DEFAULT '',
  placed_at INTEGER NOT NULL,
  delivery_time INTEGER NOT NULL,
  promo_discount REAL NOT NULL DEFAULT 0,
  coupon_discount REAL NOT NULL DEFAULT 0,
  coupon_id TEXT,
  utensils TEXT NOT NULL DEFAULT '按需',
  cancelled INTEGER NOT NULL DEFAULT 0,
  urges INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id),
  dish_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  qty INTEGER NOT NULL,
  emoji TEXT NOT NULL,
  spec_key TEXT,
  spec_text TEXT
);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  threshold REAL NOT NULL,
  amount REAL NOT NULL,
  valid_days INTEGER NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_coupons (
  user_id INTEGER NOT NULL REFERENCES users(id),
  coupon_id TEXT NOT NULL REFERENCES coupons(id),
  claimed_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_order_id TEXT,
  PRIMARY KEY (user_id, coupon_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  user_id INTEGER,
  order_id TEXT,
  store_id TEXT NOT NULL REFERENCES stores(id),
  rating INTEGER NOT NULL,
  tags TEXT NOT NULL,
  text TEXT NOT NULL,
  nickname TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
`);

// ===== 增量迁移：给旧库补充新字段（不删除任何已有数据） =====

/** 若表缺少指定列则 ALTER TABLE 补上 */
function ensureColumn(table: string, column: string, ddl: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

ensureColumn('stores', 'open_hours', "open_hours TEXT NOT NULL DEFAULT '00:00-23:59'");
ensureColumn('stores', 'address', "address TEXT NOT NULL DEFAULT ''");
ensureColumn('stores', 'license', "license TEXT NOT NULL DEFAULT ''");
ensureColumn('stores', 'promos', "promos TEXT NOT NULL DEFAULT '[]'");
ensureColumn('dishes', 'specs', "specs TEXT NOT NULL DEFAULT '[]'");
ensureColumn('orders', 'promo_discount', 'promo_discount REAL NOT NULL DEFAULT 0');
ensureColumn('orders', 'coupon_discount', 'coupon_discount REAL NOT NULL DEFAULT 0');
ensureColumn('orders', 'coupon_id', 'coupon_id TEXT');
ensureColumn('orders', 'utensils', "utensils TEXT NOT NULL DEFAULT '按需'");
ensureColumn('orders', 'cancelled', 'cancelled INTEGER NOT NULL DEFAULT 0');
ensureColumn('orders', 'urges', 'urges INTEGER NOT NULL DEFAULT 0');
ensureColumn('order_items', 'spec_key', 'spec_key TEXT');
ensureColumn('order_items', 'spec_text', 'spec_text TEXT');
