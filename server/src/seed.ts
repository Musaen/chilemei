import { db } from './db';
import { STORES } from '../../src/data/stores';
import { COUPON_TEMPLATES } from '../../src/data/coupons';
import { SEED_REVIEWS } from '../../src/data/reviews';

// 种子数据：把前端 mock 数据导入数据库（已存在时跳过，--force 可强制重建）

/** 导入种子数据；返回导入的店铺数 */
export function seedDatabase(force = false): number {
  const existing = (db.prepare('SELECT COUNT(*) AS c FROM stores').get() as { c: number }).c;
  if (existing > 0 && !force) {
    console.log(`店铺数据已存在（${existing} 家），跳过店铺导入。`);
    // 幂等补齐店铺新增字段（营业时间/地址/资质/满减），不触碰订单等业务数据
    const updateStore = db.prepare(
      'UPDATE stores SET open_hours = ?, address = ?, license = ?, promos = ? WHERE id = ?',
    );
    const updateDish = db.prepare('UPDATE dishes SET specs = ? WHERE id = ?');
    for (const store of STORES) {
      updateStore.run(store.openHours, store.address, store.license, JSON.stringify(store.promos ?? []), store.id);
      for (const dish of store.dishes) {
        updateDish.run(JSON.stringify(dish.specs ?? []), dish.id);
      }
    }
  } else {
    if (force) {
      db.exec(
        'DELETE FROM reviews; DELETE FROM user_coupons; DELETE FROM coupons; DELETE FROM order_items; DELETE FROM orders; DELETE FROM meal_excludes; DELETE FROM blocked_stores; DELETE FROM favorites; DELETE FROM addresses; DELETE FROM dishes; DELETE FROM stores;',
      );
    }

    const insertStore = db.prepare(`
      INSERT INTO stores (id, name, emoji, category, rating, monthly_sales, delivery_time, delivery_fee, min_order, distance, tags, notice, banner, open_hours, address, license, promos)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertDish = db.prepare(`
      INSERT INTO dishes (id, store_id, name, desc, price, original_price, emoji, sales, tags, avoid, sold_out, specs)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const store of STORES) {
      insertStore.run(
        store.id,
        store.name,
        store.emoji,
        store.category,
        store.rating,
        store.monthlySales,
        store.deliveryTime,
        store.deliveryFee,
        store.minOrder,
        store.distance,
        JSON.stringify(store.tags),
        store.notice,
        store.banner,
        store.openHours,
        store.address,
        store.license,
        JSON.stringify(store.promos ?? []),
      );
      for (const dish of store.dishes) {
        insertDish.run(
          dish.id,
          store.id,
          dish.name,
          dish.desc,
          dish.price,
          dish.originalPrice ?? null,
          dish.emoji,
          dish.sales,
          JSON.stringify(dish.tags),
          JSON.stringify(dish.avoid ?? []),
          dish.soldOut ? 1 : 0,
          JSON.stringify(dish.specs ?? []),
        );
      }
    }
  }

  // 优惠券模板：幂等补齐（已存在则忽略，不影响用户已领的券）
  const insertCoupon = db.prepare(
    'INSERT OR IGNORE INTO coupons (id, title, threshold, amount, valid_days, sort) VALUES (?, ?, ?, ?, ?, ?)',
  );
  COUPON_TEMPLATES.forEach((tpl, i) => {
    insertCoupon.run(tpl.id, tpl.title, tpl.threshold, tpl.amount, tpl.validDays, i);
  });

  // 评价种子数据：幂等补齐（id 唯一，重复执行不产生脏数据）
  const insertReview = db.prepare(
    'INSERT OR IGNORE INTO reviews (id, user_id, order_id, store_id, rating, tags, text, nickname, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  for (const r of SEED_REVIEWS) {
    insertReview.run(r.id, null, null, r.storeId, r.rating, JSON.stringify(r.tags), r.text, r.nickname, r.createdAt);
  }

  const dishCount = STORES.reduce((s, x) => s + x.dishes.length, 0);
  console.log(
    `种子数据导入完成：${STORES.length} 家店铺，${dishCount} 道菜品，${COUPON_TEMPLATES.length} 张券模板，${SEED_REVIEWS.length} 条评价`,
  );
  return STORES.length;
}

// 直接运行时执行（tsx src/seed.ts）
if (process.argv[1]?.endsWith('seed.ts')) {
  seedDatabase(process.argv.includes('--force'));
}
