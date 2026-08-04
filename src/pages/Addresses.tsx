import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import { useToast } from '../context/ToastContext';
import Header from '../components/Header';

// 地址管理：列表、新增、删除（删除前需用户确认）

export default function Addresses() {
  const navigate = useNavigate();
  const { addresses, addAddress, removeAddress } = useProfile();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', detail: '', tag: '家' });

  const handleAdd = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.detail.trim()) {
      showToast('请完整填写地址信息');
      return;
    }
    addAddress(form);
    setForm({ name: '', phone: '', detail: '', tag: '家' });
    setShowForm(false);
    showToast('地址已添加');
  };

  const handleRemove = (id: string) => {
    // 删除前先征得用户确认
    if (window.confirm('确定删除这个地址吗？')) {
      removeAddress(id);
      showToast('地址已删除');
    }
  };

  return (
    <div className="page addresses-page">
      <Header title="收货地址" />
      <div className="addr-list addr-list--page">
        {addresses.map((a) => (
          <div className="addr-card" key={a.id}>
            <span className="addr-tag">{a.tag}</span>
            <div className="addr-main">
              <div className="addr-name">
                {a.name} {a.phone}
              </div>
              <div className="addr-detail">{a.detail}</div>
            </div>
            <button className="addr-delete" aria-label="删除地址" onClick={() => handleRemove(a.id)}>
              🗑
            </button>
          </div>
        ))}
        {addresses.length === 0 && (
          <div className="empty-state">
            <div className="empty-emoji">📍</div>
            <p>还没有收货地址</p>
          </div>
        )}
      </div>

      <button className="primary-btn full-btn" onClick={() => setShowForm((v) => !v)}>
        ＋ 新增地址
      </button>

      {showForm && (
        <div className="addr-form addr-form--page">
          <input placeholder="收货人姓名" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="手机号" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="详细地址（小区 + 楼栋 + 门牌）" value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} />
          <div className="addr-form-tags">
            {['家', '公司', '学校'].map((t) => (
              <button
                key={t}
                className={form.tag === t ? 'addr-form-tag addr-form-tag--active' : 'addr-form-tag'}
                onClick={() => setForm({ ...form, tag: t })}
              >
                {t}
              </button>
            ))}
          </div>
          <button className="primary-btn" onClick={handleAdd}>
            保存地址
          </button>
          <button className="secondary-btn" onClick={() => setShowForm(false)}>
            取消
          </button>
        </div>
      )}

      <button className="ghost-btn back-home-btn" onClick={() => navigate('/profile')}>
        ‹ 返回我的
      </button>
    </div>
  );
}
