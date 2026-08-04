import { useNavigate } from 'react-router-dom';
import { getStoreById } from '../data/stores';
import { useProfile } from '../context/ProfileContext';
import { useToast } from '../context/ToastContext';
import Header from '../components/Header';

// 已拉黑店铺管理页：查看与取消拉黑

export default function Blocked() {
  const navigate = useNavigate();
  const { blocked, unblockStore } = useProfile();
  const { showToast } = useToast();
  const stores = blocked.map((id) => getStoreById(id)).filter((s) => s !== undefined);

  return (
    <div className="page blocked-page">
      <Header title="已拉黑店铺" onBack={() => navigate('/profile')} />

      {stores.length === 0 ? (
        <div className="empty-state">
          <div className="empty-emoji">🚫</div>
          <p>还没有拉黑过店铺</p>
          <p className="empty-hint">在店铺页点「拉黑这家店」后，它就不会再出现在首页推荐里</p>
        </div>
      ) : (
        <div className="blocked-list">
          {stores.map((store) => (
            <div className="blocked-item" key={store.id}>
              <div className="blocked-logo" style={{ background: store.banner }}>
                {store.emoji}
              </div>
              <div className="blocked-info">
                <div className="blocked-name">{store.name}</div>
                <div className="blocked-meta">
                  ★ {store.rating} · {store.deliveryTime} 分钟 · 已拉黑
                </div>
              </div>
              <div className="blocked-actions">
                <button
                  className="ghost-btn"
                  onClick={() => {
                    unblockStore(store.id);
                    showToast('已取消拉黑');
                  }}
                >
                  取消拉黑
                </button>
                <button className="ghost-btn ghost-btn--primary" onClick={() => navigate(`/store/${store.id}`)}>
                  去看看
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
