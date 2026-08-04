// 主题色备选方案：切换时通过 CSS 变量实时生效

export interface ThemeColors {
  primary: string; // 主色（按钮 / 强调）
  primaryDark: string; // 主色加深（渐变用）
  primaryLight: string; // 主色浅底（背景块）
}

export interface Theme {
  key: string;
  name: string;
  emoji: string;
  desc: string;
  colors: ThemeColors;
}

export const THEMES: Theme[] = [
  {
    key: 'orange',
    name: '活力橙',
    emoji: '🍊',
    desc: '经典外卖暖橙，最有食欲感',
    colors: { primary: '#FF6B35', primaryDark: '#F2501E', primaryLight: '#FFF0E8' },
  },
  {
    key: 'red',
    name: '番茄红',
    emoji: '🍅',
    desc: '热烈张扬，刺激食欲',
    colors: { primary: '#E5484D', primaryDark: '#C62F3F', primaryLight: '#FDECEC' },
  },
  {
    key: 'green',
    name: '抹茶绿',
    emoji: '🍵',
    desc: '清新健康，适合轻食氛围',
    colors: { primary: '#1F9D61', primaryDark: '#157A49', primaryLight: '#E8F7EF' },
  },
  {
    key: 'blue',
    name: '海盐蓝',
    emoji: '🌊',
    desc: '干净利落，科技感强',
    colors: { primary: '#2563EB', primaryDark: '#1D4ED8', primaryLight: '#EEF3FF' },
  },
  {
    key: 'purple',
    name: '葡萄紫',
    emoji: '🍇',
    desc: '年轻潮流，有记忆点',
    colors: { primary: '#7C3AED', primaryDark: '#6D28D9', primaryLight: '#F3EFFF' },
  },
  {
    key: 'pink',
    name: '莓果粉',
    emoji: '🍓',
    desc: '甜美活泼，适合下午茶氛围',
    colors: { primary: '#EC4899', primaryDark: '#DB2777', primaryLight: '#FDECF5' },
  },
];

/** 按 key 找主题，找不到时回退到第一个 */
export function getTheme(key: string): Theme {
  return THEMES.find((t) => t.key === key) ?? THEMES[0];
}
