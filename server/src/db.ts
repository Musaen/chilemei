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

// 建表：用户 / 店铺 / 菜品 / 地址 / 收藏 / 拉黑 / 忌口 / 订单 / 订单明细
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
  banner TEXT NOT NULL
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
  sold_out INTEGER NOT NULL DEFAULT 0
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
  delivery_time INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id),
  dish_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  qty INTEGER NOT NULL,
  emoji TEXT NOT NULL
);
`);
