import express from 'express';
import cors from 'cors';
import { resolve } from 'path';
import { existsSync } from 'fs';
import settingsRoutes from './routes/settings';
import taxonomyRoutes from './routes/taxonomy';
import memoriesRoutes from './routes/memories';
import searchRoutes from './routes/search';
import kgRoutes from './routes/kg';
import queryRoutes from './routes/query';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/settings', settingsRoutes);
app.use('/api/taxonomy', taxonomyRoutes);
app.use('/api/memories', memoriesRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/kg', kgRoutes);
app.use('/api/graph', kgRoutes);
app.use('/api/query', queryRoutes);

const clientDist = resolve(__dirname, '../../client/dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(resolve(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`MemPalace server running on http://localhost:${PORT}`);
});
