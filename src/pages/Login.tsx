import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import Header from '../components/Header';

// 登录页：手机号 + 验证码（演示环境固定验证码 123456）

export default function Login() {
  const navigate = useNavigate();
  const { apiMode, apiChecking, login } = useAuth();
  const { showToast } = useToast();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  /** 发送验证码 */
  const sendCode = async () => {
    if (!/^1\d{10}$/.test(phone)) {
      showToast('请输入正确的 11 位手机号');
      return;
    }
    try {
      await api.post('/auth/send-code', { phone });
      setSent(true);
      showToast('验证码已发送（演示码：123456）');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '发送失败，请稍后再试');
    }
  };

  /** 登录 */
  const submit = async () => {
    if (!/^1\d{10}$/.test(phone) || !code) {
      showToast('请填写手机号和验证码');
      return;
    }
    setLoading(true);
    try {
      await login(phone, code);
      showToast('登录成功');
      navigate('/profile');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  // 仍在探测后端：显示连接状态，避免闪「演示模式」
  if (apiChecking) {
    return (
      <div className="page login-page">
        <Header title="登录" />
        <div className="empty-state">
          <div className="empty-emoji">🔄</div>
          <p>正在连接服务…</p>
          <p className="empty-hint">请稍候，正在检查后端是否可用。</p>
        </div>
      </div>
    );
  }

  // 后端不可用（如线上静态演示版）时的说明
  if (!apiMode) {
    return (
      <div className="page login-page">
        <Header title="登录" />
        <div className="empty-state">
          <div className="empty-emoji">🔐</div>
          <p>线上演示版暂未部署后端</p>
          <p className="empty-hint">
            登录需要后端服务。当前公开网页是纯静态演示版，登录功能暂不可用；在本地启动后端（npm run server）后即可体验手机号 + 验证码 123456 登录。
          </p>
          <p className="empty-hint">无需登录也能完整体验点餐、支付、配送、评价等全部功能，数据保存在本机。</p>
          <button className="primary-btn" onClick={() => navigate('/profile')}>
            返回我的
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page login-page">
      <Header title="手机号登录" onBack={() => navigate(-1)} />
      <div className="login-body">
        <div className="login-hero">🍜</div>
        <h1 className="login-title">欢迎来「吃了没」</h1>
        <p className="login-sub">登录后订单、收藏、拉黑和忌口偏好会同步到云端</p>

        <div className="login-field">
          <span className="login-prefix">+86</span>
          <input
            placeholder="请输入手机号"
            value={phone}
            maxLength={11}
            inputMode="numeric"
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
          />
        </div>

        <div className="login-field">
          <input
            placeholder="请输入验证码"
            value={code}
            maxLength={6}
            inputMode="numeric"
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
          <button className={sent ? 'code-btn code-btn--sent' : 'code-btn'} onClick={sendCode} disabled={sent}>
            {sent ? '已发送' : '获取验证码'}
          </button>
        </div>

        {sent && <p className="login-hint">演示环境：验证码固定为 123456</p>}

        <button className={loading ? 'primary-btn full-btn primary-btn--disabled' : 'primary-btn full-btn'} onClick={submit} disabled={loading}>
          {loading ? '登录中…' : '登录'}
        </button>
      </div>
    </div>
  );
}
