/* =========================================================
   Raider Sync routes — manage the player's Embark/MetaForge
   linkage. Mounted at /api/raider-sync.
   ========================================================= */

import express from 'express';
import {
  getRaiderSyncProfile,
  saveEmbarkUsername,
  clearEmbarkLink,
  saveMetaForgeProfile,
  saveSyncError,
} from '../services/raiderSync.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();

router.use(requireAuth);

// GET /api/raider-sync/profile — current sync state for the logged-in user
router.get('/profile', async (req, res) => {
  try {
    const profile = await getRaiderSyncProfile(req.user.id);
    res.json(profile);
  } catch (err) {
    console.error('[RaiderSync] profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/raider-sync — Raider Syndicate compatibility alias.
// The imported Next route read a Firebase uid query param; this app uses the
// authenticated Discord session, so uid is intentionally ignored here.
router.get('/', async (req, res) => {
  try {
    const profile = await getRaiderSyncProfile(req.user.id);
    res.json({ ok: true, profile });
  } catch (err) {
    console.error('[RaiderSync] GET alias error:', err);
    res.status(500).json({ error: 'Failed to read profile' });
  }
});

// POST /api/raider-sync/embark-username  body: { embarkUsername }
router.post('/embark-username', async (req, res) => {
  try {
    const { embarkUsername } = req.body || {};
    if (!embarkUsername || typeof embarkUsername !== 'string') {
      return res.status(400).json({ error: 'embarkUsername required' });
    }
    await saveEmbarkUsername(req.user.id, embarkUsername);
    const profile = await getRaiderSyncProfile(req.user.id);
    res.json(profile);
  } catch (err) {
    console.error('[RaiderSync] save username error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/raider-sync — Raider Syndicate compatibility alias.
// Body may include { uid, embarkUsername }; uid is ignored because requireAuth
// already gives us req.user.id for the Mongo User row.
router.post('/', async (req, res) => {
  try {
    const { embarkUsername } = req.body || {};
    if (
      !embarkUsername ||
      typeof embarkUsername !== 'string' ||
      !embarkUsername.trim()
    ) {
      return res.status(400).json({ error: 'Missing or empty embarkUsername' });
    }

    await saveEmbarkUsername(req.user.id, embarkUsername);
    const profile = await getRaiderSyncProfile(req.user.id);
    res.json({ ok: true, profile });
  } catch (err) {
    console.error('[RaiderSync] POST alias error:', err);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// POST /api/raider-sync/metaforge-profile  body: { metaForgeProfileId, embarkId, displayName, platforms, stashValue }
router.post('/metaforge-profile', async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.metaForgeProfileId && !body.profileId && !body.id) {
      return res.status(400).json({ error: 'metaForgeProfileId required' });
    }
    await saveMetaForgeProfile(req.user.id, body);
    const profile = await getRaiderSyncProfile(req.user.id);
    res.json(profile);
  } catch (err) {
    console.error('[RaiderSync] save mf profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/raider-sync/error  body: { message }
router.post('/error', async (req, res) => {
  try {
    await saveSyncError(req.user.id, req.body?.message || 'Unknown error');
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/raider-sync — unlink Embark/MetaForge
router.delete('/', async (req, res) => {
  try {
    await clearEmbarkLink(req.user.id);
    const profile = await getRaiderSyncProfile(req.user.id);
    res.json({ ok: true, profile });
  } catch (err) {
    console.error('[RaiderSync] clear error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
