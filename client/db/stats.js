const redis = require('./redis');

/**
 * Updates the blueprint inventory in the cache
 * @param {string} type - e.g., 'anvil', 'osprey'
 * @param {number} count - Total blueprints
 */
async function syncBlueprints(type, count) {
  const key = `stash:blueprints:${type}`;
  await redis.set(key, count);
  console.log(`Synced ${type}: ${count}`);
}

/**
 * Retrieves the "Grand Master" kill counts
 */
async function getKillStats() {
  const kills = await redis.get('stats:total_kills');
  return kills || 0;
}

module.exports = { syncBlueprints, getKillStats };
