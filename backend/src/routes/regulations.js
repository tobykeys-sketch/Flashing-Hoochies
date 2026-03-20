const express = require('express');
const router = express.Router();
const { getRegulations, getAllRegulations } = require('../services/regulations');

// GET /api/regulations
router.get('/', (req, res) => {
  res.json(getAllRegulations());
});

// GET /api/regulations/:area (9, 10, or 11)
router.get('/:area', (req, res) => {
  const areaNum = parseInt(req.params.area, 10);
  if (![9, 10, 11].includes(areaNum)) {
    return res.status(400).json({ error: 'Invalid area. Use 9, 10, or 11.' });
  }
  const regs = getRegulations(areaNum);
  res.json(regs);
});

module.exports = router;
