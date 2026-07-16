import { List, Avatar, Typography } from 'antd';
import {
  PlayCircleFilled,
  PauseCircleFilled,
} from '@ant-design/icons';

const { Text } = Typography;

export default function Playlist({ songs, currentSong, isPlaying, onSelect }) {
  return (
    <List
      dataSource={songs}
      style={{
        maxHeight: '40vh',
        overflowY: 'auto',
        borderRadius: 16,
      }}
      renderItem={(song) => {
        const isActive = currentSong?.id === song.id;
        return (
          <List.Item
            key={song.id}
            onClick={() => onSelect(song)}
            style={{
              cursor: 'pointer',
              padding: '12px 16px',
              borderRadius: 12,
              marginBottom: 4,
              background: isActive
                ? 'rgba(var(--accent-rgb, 233, 30, 140), 0.15)'
                : 'transparent',
              transition: 'all 0.2s',
            }}
            className="playlist-item"
          >
            <List.Item.Meta
              avatar={
                <Avatar
                  shape="square"
                  size={48}
                  src={song.cover || undefined}
                  style={{ borderRadius: 8 }}
                >
                  {!song.cover && song.title.charAt(0)}
                </Avatar>
              }
              title={
                <Text
                  strong
                  style={{
                    color: isActive ? 'var(--accent-color)' : undefined,
                    fontSize: 16,
                  }}
                >
                  {song.title}
                </Text>
              }
              description={
                <Text style={{ fontSize: 13 }}>{song.artist}</Text>
              }
            />
            {isActive && isPlaying ? (
              <PauseCircleFilled
                style={{ fontSize: 28, color: 'var(--accent-color)' }}
              />
            ) : isActive ? (
              <PlayCircleFilled
                style={{ fontSize: 28, color: 'var(--accent-color)' }}
              />
            ) : null}
          </List.Item>
        );
      }}
    />
  );
}
