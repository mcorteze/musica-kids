import { useState } from 'react';
import { Button, Drawer, List, Avatar, Typography } from 'antd';
import { BgColorsOutlined } from '@ant-design/icons';
import themes from '../themes';

const { Text } = Typography;
const themeKeys = Object.keys(themes);

export default function ThemeSelector({ currentTheme, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        icon={<BgColorsOutlined />}
        onClick={() => setOpen(true)}
        size="large"
        style={{ borderRadius: 12, fontWeight: 600 }}
      >
        {themes[currentTheme].icon} Tema
      </Button>

      <Drawer
        title="Elegir tema"
        placement="right"
        onClose={() => setOpen(false)}
        open={open}
        width={280}
        styles={{ body: { padding: '8px 0' } }}
      >
        <List
          dataSource={themeKeys}
          renderItem={(key) => {
            const t = themes[key];
            const isActive = key === currentTheme;
            return (
              <List.Item
                onClick={() => { onChange(key); setOpen(false); }}
                style={{
                  cursor: 'pointer',
                  padding: '14px 20px',
                  background: isActive ? `${t.token.colorPrimary}15` : 'transparent',
                  borderLeft: isActive ? `4px solid ${t.token.colorPrimary}` : '4px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      style={{
                        background: t.token.colorPrimary,
                        fontSize: 22,
                        borderRadius: 10,
                      }}
                    >
                      {t.icon}
                    </Avatar>
                  }
                  title={
                    <Text strong style={{ fontSize: 16 }}>
                      {t.name}
                    </Text>
                  }
                />
              </List.Item>
            );
          }}
        />
      </Drawer>
    </>
  );
}
