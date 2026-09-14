import { AppstoreOutlined, CheckCircleFilled } from '@ant-design/icons';

// Tarjeta de grupo usada por la pagina de menu (GroupMenuPage).
export default function GroupCard({ group, isActive, count, onPick }) {
  return (
    <button
      type="button"
      onClick={() => onPick(group.id)}
      className={`group-card ${isActive ? 'active' : ''}`}
      aria-label={group.name}
      aria-pressed={isActive}
    >
      <span className="group-card-media">
        {group.cover ? (
          <>
            {group.fit === 'contain' && (
              <img className="group-card-blur" src={group.cover} alt="" aria-hidden="true" />
            )}
            <img
              className={`group-card-img ${group.fit === 'contain' ? 'contain' : ''}`}
              src={group.cover}
              alt=""
            />
          </>
        ) : (
          <span className="group-card-all">
            <AppstoreOutlined />
          </span>
        )}
        {isActive && <CheckCircleFilled className="group-card-check" />}
      </span>
      <span className="group-card-label">
        <span className="group-card-name">{group.name}</span>
        <span className="group-card-count">
          {count} {count === 1 ? 'cancion' : 'canciones'}
        </span>
      </span>
    </button>
  );
}
