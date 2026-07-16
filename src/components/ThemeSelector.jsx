import { Segmented } from 'antd';
import themes from '../themes';

const themeKeys = Object.keys(themes);

export default function ThemeSelector({ currentTheme, onChange }) {
  const options = themeKeys.map((key) => ({
    label: (
      <span style={{ fontSize: 15, padding: '2px 4px', whiteSpace: 'nowrap' }}>
        {themes[key].icon} {themes[key].name}
      </span>
    ),
    value: key,
  }));

  return (
    <Segmented
      options={options}
      value={currentTheme}
      onChange={onChange}
      style={{ maxWidth: '100%' }}
      size="middle"
    />
  );
}
