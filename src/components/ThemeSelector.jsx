import { Segmented } from 'antd';
import themes from '../themes';

const themeKeys = Object.keys(themes);

export default function ThemeSelector({ currentTheme, onChange }) {
  const options = themeKeys.map((key) => ({
    label: (
      <span style={{ fontSize: 18, padding: '4px 8px' }}>
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
      style={{ marginBottom: 16 }}
      size="large"
    />
  );
}
