import path from 'node:path';
import os from 'node:os';

// API 自动化测试：使用独立临时数据库，覆盖鉴权、店铺、地址、偏好、订单全链路

process.env.CHILEMEI_DB = path.join(os.tmpdir(), `clm_test_${Date.now()}.db`);

const { app } = await import('./app');
const { seedDatabase } = await import('./seed');

seedDatabase(true);

const results: { name: string; ok: boolean; detail?: string }[] = [];
function check(name: string, ok: boolean, detail = '') {
  results.push({ name, ok, detail });
}

const server = app.listen(0);
const port = (server.address() as { port: number }).port;
const base = `http://localhost:${port}/api`;

async function req(
  p: string,
  opts: { method?: string; body?: unknown; token?: string } = {},
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(base + p, {
    method: opts.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    // 忽略无 JSON 响应体
  }
  return { status: res.status, body };
}

try {
  // 健康检查
  const health = await req('/health');
  check('健康检查', health.status === 200 && health.body.ok === true);

  // 店铺列表与筛选
  const stores = await req('/stores');
  check('店铺列表 8 家', stores.status === 200 && (stores.body.stores as unknown[]).length === 8);
  const milkTea = await req('/stores?category=奶茶');
  check('分类筛选奶茶 1 家', (milkTea.body.stores as unknown[]).length === 1);
  const burger = await req('/stores?keyword=汉堡');
  check('关键词搜索汉堡 1 家', (burger.body.stores as unknown[]).length === 1);
  const rated = await req('/stores?sort=评分');
  check('评分排序第一名 4.9', (rated.body.stores as { rating: number }[])[0].rating === 4.9);

  // 店铺详情
  const detail = await req('/stores/store_tangshui');
  const detailStore = detail.body.store as { dishes: { soldOut?: boolean }[] };
  check('店铺详情含售罄菜品', Array.isArray(detailStore.dishes) && detailStore.dishes.some((d) => d.soldOut));
  const notFound = await req('/stores/no_such');
  check('店铺不存在返回 404', notFound.status === 404);

  // 鉴权
  const guard = await req('/me');
  check('未登录访问 /me 返回 401', guard.status === 401);

  const badPhone = await req('/auth/send-code', { method: 'POST', body: { phone: '123' } });
  check('非法手机号返回 400', badPhone.status === 400);

  const code = await req('/auth/send-code', { method: 'POST', body: { phone: '13800138000' } });
  check('发送验证码返回演示码', code.status === 200 && code.body.demoCode === '123456');

  const wrongLogin = await req('/auth/login', { method: 'POST', body: { phone: '13800138000', code: '000000' } });
  check('错误验证码登录失败', wrongLogin.status === 400);

  const login = await req('/auth/login', { method: 'POST', body: { phone: '13800138000', code: '123456' } });
  const token = login.body.token as string;
  check('登录成功返回令牌与用户', login.status === 200 && typeof token === 'string' && login.body.user != null);

  const me = await req('/me', { token });
  check('获取当前用户', me.status === 200 && (me.body.user as { phone: string }).phone === '13800138000');

  const nick = await req('/me/nickname', { method: 'PUT', body: { nickname: '测试干饭王' }, token });
  check('修改昵称', nick.status === 200 && nick.body.nickname === '测试干饭王');

  // 地址
  const addr = await req('/addresses', {
    method: 'POST',
    body: { name: '张小明', phone: '13800138000', detail: '北京市海淀区测试路 1 号', tag: '家' },
    token,
  });
  const addressId = (addr.body.address as { id: string }).id;
  check('新增地址', addr.status === 200 && typeof addressId === 'string');
  const addrList = await req('/addresses', { token });
  check('地址列表 1 条', (addrList.body.addresses as unknown[]).length === 1);
  const addrDel = await req(`/addresses/${addressId}`, { method: 'DELETE', token });
  check('删除地址', addrDel.status === 200);

  // 收藏 / 拉黑
  const fav = await req('/favorites/store_hutong', { method: 'POST', token });
  check('收藏切换为 true', fav.body.favorite === true);
  const favList = await req('/favorites', { token });
  check('收藏列表包含店铺', (favList.body.ids as string[]).includes('store_hutong'));
  const favOff = await req('/favorites/store_hutong', { method: 'POST', token });
  check('再次切换取消收藏', favOff.body.favorite === false);

  const blocked = await req('/blocked/store_shaokao', { method: 'POST', token });
  check('拉黑切换为 true', blocked.body.blocked === true);
  const blockedList = await req('/blocked', { token });
  check('拉黑列表包含店铺', (blockedList.body.ids as string[]).includes('store_shaokao'));
  await req('/blocked/store_shaokao', { method: 'POST', token });

  // 忌口偏好
  const excludes = await req('/excludes', { method: 'PUT', body: { excludes: ['辣', '香菜'] }, token });
  check('保存忌口偏好', excludes.status === 200);
  const excludesGet = await req('/excludes', { token });
  check('读取忌口偏好', (excludesGet.body.excludes as string[]).join(',') === '辣,香菜');

  // 订单：首单（满 30 免配送费 + 首单立减）
  const addr2 = await req('/addresses', {
    method: 'POST',
    body: { name: '张小明', phone: '13800138000', detail: '北京市海淀区中关村大街 27 号', tag: '公司' },
    token,
  });
  const addressId2 = (addr2.body.address as { id: string }).id;

  const order1 = await req('/orders', {
    method: 'POST',
    body: {
      storeId: 'store_naicha',
      items: [
        { dishId: 'd_nc_zhenzhu', qty: 1 },
        { dishId: 'd_nc_putao', qty: 1 },
      ],
      addressId: addressId2,
      note: '忌口：辣',
    },
    token,
  });
  const o1 = order1.body.order as { subtotal: number; deliveryFee: number; discount: number; total: number; items: unknown[] };
  check('首单小计 41', order1.status === 201 && o1.subtotal === 41);
  check('首单配送费 2', o1.deliveryFee === 2);
  check('首单优惠 14（满减7+免配送费2+立减5）', o1.discount === 14);
  check('首单实付 29', o1.total === 29);
  check('订单项 2 条', o1.items.length === 2);
  check('订单备注含忌口', (order1.body.order as { note: string }).note === '忌口：辣');

  // 第二单：无首单优惠，未满 30 不免配送费
  const order2 = await req('/orders', {
    method: 'POST',
    body: { storeId: 'store_hutong', items: [{ dishId: 'd_hm_zjm', qty: 1 }], addressId: addressId2, note: '' },
    token,
  });
  const o2 = order2.body.order as { subtotal: number; deliveryFee: number; discount: number; total: number };
  check('第二单小计 28', o2.subtotal === 28);
  check('第二单优惠 0', o2.discount === 0);
  check('第二单实付 31', o2.total === 31);

  // 售罄菜品下单被拒
  const soldOut = await req('/orders', {
    method: 'POST',
    body: { storeId: 'store_tangshui', items: [{ dishId: 'd_ts_banli', qty: 1 }], addressId: addressId2, note: '' },
    token,
  });
  check('售罄菜品下单返回 400', soldOut.status === 400);

  // 订单列表与详情
  const orders = await req('/orders', { token });
  check('订单列表 2 单', (orders.body.orders as unknown[]).length === 2);
  const orderDetail = await req(`/orders/${o1.id}`, { token });
  check('订单详情匹配', orderDetail.status === 200 && (orderDetail.body.order as { id: string }).id === o1.id);

  // 菜品规格：同一道菜不同规格按独立条目计价
  const specOrder = await req('/orders', {
    method: 'POST',
    body: {
      storeId: 'store_naicha',
      items: [
        { dishId: 'd_nc_yangzhi', qty: 1, specKey: 'large|normal_ice' },
        { dishId: 'd_nc_yangzhi', qty: 1, specKey: 'medium|less_ice' },
      ],
      addressId: addressId2,
      note: '',
      utensils: '不要餐具',
    },
    token,
  });
  const so = specOrder.body.order as {
    subtotal: number;
    discount: number;
    total: number;
    utensils: string;
    items: { name: string; price: number; specText?: string }[];
  };
  check('规格订单小计 41（大杯22+中杯19）', specOrder.status === 201 && so.subtotal === 41);
  check('规格订单优惠 9（满减7+免配送费2）', so.discount === 9);
  check('规格订单实付 34', so.total === 34);
  check('规格订单中杯价格 19', so.items.some((i) => i.price === 19 && i.specText?.includes('中杯')));
  check('规格订单餐具写入', so.utensils === '不要餐具');

  // 优惠券：领取 → 下单核销 → 我的券显示已用
  const available = await req('/coupons/available', { token });
  check('领券中心 4 张券', (available.body.available as unknown[]).length === 4);
  const claim = await req('/coupons/cp_8/claim', { method: 'POST', token });
  check('领取满 40 减 8', claim.status === 200);
  const claimedTwice = await req('/coupons/cp_8/claim', { method: 'POST', token });
  check('重复领取被拒', claimedTwice.status === 400);
  const couponOrder = await req('/orders', {
    method: 'POST',
    body: {
      storeId: 'store_naicha',
      items: [
        { dishId: 'd_nc_putao', qty: 1 },
        { dishId: 'd_nc_yangzhi', qty: 1 },
      ],
      addressId: addressId2,
      note: '',
      couponId: 'cp_8',
    },
    token,
  });
  const co = couponOrder.body.order as { subtotal: number; couponDiscount: number; promoDiscount: number; total: number; couponId?: string };
  check('用券订单满减 7', co.promoDiscount === 7);
  check('用券订单券抵扣 8', co.couponDiscount === 8);
  check('用券订单实付 32', co.total === 32);
  check('用券订单记录券 id', co.couponId === 'cp_8');
  const mineCoupons = await req('/coupons/mine', { token });
  const cp8 = (mineCoupons.body.coupons as { id: string; usedAt?: number }[]).find((c) => c.id === 'cp_8');
  check('我的优惠券显示已使用', cp8 != null && cp8.usedAt != null);

  // 取消订单与催单
  const cancelOrder = await req('/orders', {
    method: 'POST',
    body: { storeId: 'store_hutong', items: [{ dishId: 'd_hm_zjm', qty: 1 }], addressId: addressId2, note: '' },
    token,
  });
  const cancelId = (cancelOrder.body.order as { id: string }).id;
  const cancelled = await req(`/orders/${cancelId}/cancel`, { method: 'POST', token });
  check('取消订单成功', cancelled.status === 200 && (cancelled.body.order as { cancelled: boolean }).cancelled === true);
  const cancelAgain = await req(`/orders/${cancelId}/cancel`, { method: 'POST', token });
  check('重复取消被拒', cancelAgain.status === 400);
  const urge1 = await req(`/orders/${o1.id}/urge`, { method: 'POST', token });
  check('催单 1 次生效', (urge1.body.order as { urges: number }).urges === 1);
  const urge2 = await req(`/orders/${o1.id}/urge`, { method: 'POST', token });
  check('催单 2 次生效', (urge2.body.order as { urges: number }).urges === 2);

  // 评价：提交后店铺评价墙可见
  const review = await req('/reviews', {
    method: 'POST',
    body: { storeId: 'store_hutong', orderId: o1.id, rating: 5, tags: ['味道好', '分量足'], text: '测试评价：很好吃' },
    token,
  });
  check('提交评价成功', review.status === 201);
  const storeReviews = await req('/stores/store_hutong/reviews');
  check('店铺评价包含新评价', (storeReviews.body.reviews as { text: string }[]).some((r) => r.text === '测试评价：很好吃'));
  const mineReviews = await req('/reviews/mine', { token });
  check('我的评价 1 条', (mineReviews.body.reviews as unknown[]).length === 1);

  // 第二个用户登录（先发验证码再登录）
  await req('/auth/send-code', { method: 'POST', body: { phone: '13900139000' } });
  const otherLogin = await req('/auth/login', { method: 'POST', body: { phone: '13900139000', code: '123456' } });
  const otherUser = await req(`/orders/${o1.id}`, { token: otherLogin.body.token as string });
  check('他人订单不可见', otherUser.status === 404);

  // 未知接口
  const unknown = await req('/no-such-api');
  check('未知接口返回 404', unknown.status === 404);
} catch (err) {
  check('测试执行异常', false, err instanceof Error ? err.message : String(err));
} finally {
  server.close();
}

let failed = 0;
for (const r of results) {
  if (!r.ok) failed += 1;
  console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}${r.detail ? ' :: ' + r.detail : ''}`);
}
console.log(`\n共 ${results.length} 项，通过 ${results.length - failed} 项`);
process.exit(failed > 0 ? 1 : 0);
