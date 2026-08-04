import { db } from './db';
import { STORES } from '../../src/data/stores';

// 种子数据：把前端 mock 数据导入数据库（已存在时跳过，--force 可强制重建）

/** 导入种子数据；返回导入的店铺数 */
export function seedDatabase(force = false): number {
  const existing = (db.prepare('SELECT COUNT(*) AS c FROM stores').get() as { c: number }).c;
  if (existing > 0 && !force) {
    console.log(`店铺数据已存在（${existing} 家），跳过导入。如需重建请加 --force`);
    return existing;
  }

  if (force) {
    db.exec(
      'DELETE FROM order_items; DELETE FROM orders; DELETE FROM meal_excludes; DELETE FROM blocked_stores; DELETE FROM favorites; DELETE FROM addresses; DELETE FROM dishes; DELETE FROM stores;',
    );
  }

  const insertStore = db.prepare(`
    INSERT INTO stores (id, name, emoji, category, rating, monthly_sales, delivery_time, delivery_fee, min_order, distance, tags, notice, banner)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDish = db.prepare(`
    INSERT INTO dishes (id, store_id, name, desc, price, original_price, emoji, sales, tags, avoid, sold_out)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      );
    }
  }

  const dishCount = STORES.reduce((s, x) => s + x.dishes.length, 0);
  console.log(`种子数据导入完成：${STORES.length} 家店铺，${dishCount} 道菜品`);
  return STORES.length;
}

// 直接运行时执行（tsx src/seed.ts）
if (process.argv[1]?.endsWith('seed.ts')) {
  seedDatabase(process.argv.includes('--force'));
}
