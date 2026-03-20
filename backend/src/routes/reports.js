const express  = require('express');
const router   = express.Router();
const fs       = require('fs');
const path     = require('path');
const multer   = require('multer');

const DATA_DIR     = path.join(__dirname, '../../data');
const UPLOADS_DIR  = path.join(DATA_DIR, 'uploads');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');

// Ensure dirs exist
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Multer — store uploaded images in data/uploads/
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename:    (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (_req, file, cb) => {
    cb(null, /^image\//.test(file.mimetype));
  },
});

function load() {
  try {
    if (!fs.existsSync(REPORTS_FILE)) return {};
    return JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf8'));
  } catch { return {}; }
}

function save(reports) {
  fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2));
}

// GET /api/reports?ramp=<name>
router.get('/', (req, res) => {
  const all = load();
  const { ramp } = req.query;
  res.json(ramp ? (all[ramp] || []) : all);
});

// POST /api/reports  (multipart/form-data)
router.post('/', upload.single('photo'), (req, res) => {
  const { ramp, rating, species, count, notes, angler } = req.body;
  if (!ramp)   return res.status(400).json({ error: 'ramp is required' });
  if (!rating) return res.status(400).json({ error: 'rating is required' });

  const all = load();
  if (!all[ramp]) all[ramp] = [];

  const report = {
    id:        Date.now(),
    ramp,
    rating,
    species:   species  || null,
    count:     count != null ? parseInt(count, 10) || 0 : null,
    notes:     (notes  || '').trim().slice(0, 500),
    angler:    (angler || '').trim().slice(0, 50) || 'Anonymous',
    photo:     req.file ? `/api/reports/photo/${req.file.filename}` : null,
    timestamp: new Date().toISOString(),
  };

  all[ramp].unshift(report);
  all[ramp] = all[ramp].slice(0, 100);
  save(all);

  res.status(201).json(report);
});

// GET /api/reports/photo/:filename — serve uploaded images
router.get('/photo/:filename', (req, res) => {
  const file = path.join(UPLOADS_DIR, path.basename(req.params.filename));
  if (!fs.existsSync(file)) return res.status(404).end();
  res.sendFile(file);
});

module.exports = router;
