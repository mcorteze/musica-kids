import groups from '../data/groups';
import counts from '../data/groupCounts';
import GroupCard from './GroupCard';

// Pagina de entrada en todos los responsives: reemplaza el viejo boton+modal
// de "elegir musica" (App.jsx controla si se ve con showGroupMenu).
export default function GroupMenuPage({ activeGroup, onPick }) {
  return (
    <div className="group-menu-page">
      <h1 className="group-menu-title">Elige tu musica</h1>
      <div className="group-menu-grid">
        {groups.map((g) => (
          <GroupCard
            key={g.id}
            group={g}
            isActive={g.id === activeGroup}
            count={counts[g.id]}
            onPick={onPick}
          />
        ))}
      </div>
    </div>
  );
}
