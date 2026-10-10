import { createApp } from './app.js';
import { migrate } from './db.js';

const PORT = process.env.PORT || 3001;

try {
  await migrate();
  console.log('Schéma de base à jour');
} catch (e) {
  console.error('Migration impossible :', e.message);
  process.exit(1);
}

const app = createApp();
app.listen(PORT, () => {
  console.log(`API démarrée sur http://localhost:${PORT}`);
});
