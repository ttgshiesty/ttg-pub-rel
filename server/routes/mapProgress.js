import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { User } from '../models/User.js';

const router = express.Router();

router.use(requireAuth);

function normalizeMapProgress(progress) {
  const maps = {};
  if (progress?.maps && typeof progress.maps === 'object') {
    for (const [mapId, slice] of Object.entries(progress.maps)) {
      const pins = {};
      if (slice?.p && typeof slice.p === 'object') {
        for (const [pinId, visited] of Object.entries(slice.p)) {
          if (visited) pins[pinId] = true;
        }
      }
      if (Object.keys(pins).length > 0) maps[mapId] = { p: pins };
    }
  }
  return { version: 1, maps };
}

function mergeMapProgress(a, b) {
  const merged = normalizeMapProgress(a);
  const incoming = normalizeMapProgress(b);
  for (const [mapId, slice] of Object.entries(incoming.maps)) {
    merged.maps[mapId] = {
      p: {
        ...(merged.maps[mapId]?.p ?? {}),
        ...(slice.p ?? {}),
      },
    };
  }
  return normalizeMapProgress(merged);
}

router.get('/', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id })
      .select('mapProgress')
      .lean();
    res.json(normalizeMapProgress(user?.mapProgress));
  } catch (err) {
    console.error('[MapProgress] get error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/', async (req, res) => {
  try {
    const mode = req.query.mode === 'replace' ? 'replace' : 'merge';
    const incoming = normalizeMapProgress(req.body);
    const user = await User.findOne({ id: req.user.id }).select('mapProgress');
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.mapProgress =
      mode === 'replace'
        ? incoming
        : mergeMapProgress(user.mapProgress, incoming);
    await user.save();

    res.json(normalizeMapProgress(user.mapProgress));
  } catch (err) {
    console.error('[MapProgress] save error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
