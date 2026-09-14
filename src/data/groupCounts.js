import groups, { ALL_GROUPS } from './groups';
import songs from './songs';

// songs y groups son estaticos: el conteo se calcula una sola vez (usado por
// GroupMenuPage a traves de GroupCard).
const counts = groups.reduce((acc, g) => {
  acc[g.id] = g.id === ALL_GROUPS
    ? songs.length
    : songs.filter((s) => s.groups?.includes(g.id)).length;
  return acc;
}, {});

export default counts;
