import { useNavigate } from 'react-router-dom';

// 页面顶栏：返回按钮 + 标题 + 右侧自定义区域

interface HeaderProps {
  title: string;
  right?: React.ReactNode;
  onBack?: () => void;
  transparent?: boolean; // 透明背景（用于店铺详情等带渐变头部页面）
}

export default function Header({ title, right, onBack, transparent }: HeaderProps) {
  const navigate = useNavigate();
  return (
    <header className={transparent ? 'header header--transparent' : 'header'}>
      <button
        className="icon-btn"
        aria-label="返回"
        onClick={() => (onBack ? onBack() : navigate(-1))}
      >
        ‹
      </button>
      <div className="header-title">{title}</div>
      <div className="header-right">{right}</div>
    </header>
  );
}
