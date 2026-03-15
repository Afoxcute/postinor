import path from 'path';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';

import registerRoutes from './routes/register';
import yakoaRoutes from './routes/yakoaRoutes';
import licenseRoutes from './routes/license';
import infringementRoutes from './routes/infringement';
import storachaRoutes from './routes/storacha';

// Load .env from backend project root so STORACHA_KEY, STORACHA_PROOF, etc. are found
const envPath = path.resolve(__dirname, '..', '.env');
const loaded = dotenv.config({ path: envPath });
if (loaded.error && process.env.NODE_ENV !== 'test') {
  console.warn('No .env file at', envPath, '(using process env only)');
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// API Routes
app.use('/api/register', registerRoutes);
app.use('/api/yakoa', yakoaRoutes);
app.use('/api/license', licenseRoutes);
app.use('/api/infringement', infringementRoutes);
app.use('/api/storacha', storachaRoutes);

// Default route (optional)
app.get('/', (_req, res) => {
  res.send('✅ Yakoa + Flow backend is running!');
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running at http://localhost:${PORT}`);
});
