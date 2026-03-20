const express = require('express');
const cors = require('cors');

const conditionsRouter  = require('./routes/conditions');
const regulationsRouter = require('./routes/regulations');
const reportsRouter     = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Routes
app.use('/api/conditions',  conditionsRouter);
app.use('/api/regulations', regulationsRouter);
app.use('/api/reports',     reportsRouter);

app.listen(PORT, () => {
  console.log(`Puget Fishing backend running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  GET /api/health');
  console.log('  GET /api/conditions');
  console.log('  GET /api/conditions/refresh');
  console.log('  GET /api/regulations');
  console.log('  GET /api/regulations/:area  (9, 10, or 11)');
});
