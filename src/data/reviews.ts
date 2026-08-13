import type { Review, Store } from '../types';
import { STORES } from './stores';

// 评价种子数据：每个店铺生成 4-6 条评价，让店铺评价墙开箱即用

const NICKNAMES = [
  '干饭小王',
  '五道口居民',
  '宿舍干饭王',
  '加班到九点',
  '无辣不欢',
  '轻食达人',
  '三里屯干饭人',
  '北漂干饭人',
  '奶茶续命者',
  '小笼包十级学者',
];

const TAGS_POOL = ['味道好', '分量足', '包装好', '送达快', '值得回购', '口味稳定'];

/** 评价文案：{dish} 会替换为店铺招牌菜名 */
const TEXTS = [
  '「{dish}」味道很正，分量也足，包装特别严实，送到还是热的。',
  '第二次点了，口味很稳定，配送比预计还快了几分钟。',
  '整体不错，就是高峰期等得久了一点，但味道值得等。',
  '好吃！已经安利给室友了，下次还点这家。',
  '分量对得起价格，备注的要求商家都认真看了，好评。',
  '第一次点这家，超出预期，收藏了，下次回购。',
];

/** 根据店铺数据生成种子评价（确定性伪随机，刷新不变） */
export function buildSeedReviews(stores: Store[] = STORES): Review[] {
  const reviews: Review[] = [];
  const now = Date.now();
  stores.forEach((store, si) => {
    const count = 4 + (si % 3); // 每家 4-6 条
    const hero = store.dishes.find((d) => d.tags.includes('招牌')) ?? store.dishes[0];
    for (let i = 0; i < count; i++) {
      const rating = 4 + ((si + i) % 2); // 4 或 5 星
      const template = TEXTS[(si * 3 + i) % TEXTS.length];
      reviews.push({
        id: `seed_review_${store.id}_${i}`,
        storeId: store.id,
        rating,
        tags: [TAGS_POOL[(si + i) % TAGS_POOL.length], TAGS_POOL[(si + i + 2) % TAGS_POOL.length]],
        text: template.replace('{dish}', hero?.name ?? '招牌菜'),
        createdAt: now - (i + 1) * 86400000 * (2 + (si % 4)) - si * 3600000,
        nickname: NICKNAMES[(si + i) % NICKNAMES.length],
      });
    }
  });
  return reviews;
}

/** 种子评价（模块加载时生成一次） */
export const SEED_REVIEWS: Review[] = buildSeedReviews();
