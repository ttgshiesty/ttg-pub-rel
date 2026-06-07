import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { loadSecrets } from './utils/loadSecrets.js';

import mongoose from 'mongoose';
import session from 'express-session';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import MongoStore from 'connect-mongo';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';
import fetch from 'node-fetch';
import logger from './utils/logger.js';
import { UserDataAPI } from './services/userDataApi.js';
import { buildStatsOverview } from './services/statsAggregator.js';
import { startSCRAPPYBot } from './services/discordBot.js';
import { MetaForgeCatalog } from './services/metaforgeCatalog.js';
import { startAutoSyncService } from './services/autoSync.js';

import extensionRoutes from './routes/extension.js';
import embarkRoutes from './routes/embark.js';
import marketplaceRoutes from './routes/marketplace.js';
import playerRoutes from './routes/player.js';
import discordRoutes from './routes/discord.js';
import { startMonitoring } from './utils/memoryMonitor.js';
import arctrackerRoutes from './routes/arctracker.js';
import catalogRoutes from './routes/catalog.js';
import publicProfileRoutes from './routes/publicProfile.js';
import statsRoutes from './routes/stats.js';
import raiderSyncRoutes from './routes/raiderSync.js';
import healthRoutes from './routes/health.js';
import metaforgeRoutes from './routes/metaforge.js';
import mapProgressRoutes from './routes/mapProgress.js';
import g2gRoutes from './routes/g2g.js';
import { User } from './models/User.js';
import { BlueprintFind } from './models/BlueprintFind.js';
import { AutoSyncSettings } from './models/AutoSyncSettings.js';
import { SyncData } from './models/SyncData.js';
import {
  atlasReportFromFind,
  getAtlasBlueprintSummary,
  loadAtlasRowsWithMongo,
  searchAtlasBlueprintSummaries,
} from './services/atlasBlueprints.js';
import { getAssetOrigin } from './utils/assetUrl.js';

async function fetchWithTimeout(url, options = {}, timeout = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
await loadSecrets();

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';
const SESSION_MAX_AGE =
  Number.parseInt(process.env.SESSION_MAX_AGE_MS || '', 10) ||
  30 * 24 * 60 * 60 * 1000;
const SESSION_EXPIRY_MS = SESSION_MAX_AGE;
const DIST_PATH = path.join(__dirname, '../client/dist');
const ATLAS_PATH = path.join(__dirname, '../atlas');
const assetOrigin = getAssetOrigin();

// Mode flags
const isBotOnly =
  process.env.BOT_ONLY === 'true' || process.argv.includes('--bot-only');
const isWebOnly =
  process.env.WEB_ONLY === 'true' || process.argv.includes('--web-only');

// ============================================================================
// Environment Variable Validation
// ============================================================================

function validateEnvironment() {
  const errors = [];

  // MongoDB
  const mongoUri = process.env.MONGO_URL || process.env.MONGODB_URI;
  if (!mongoUri) {
    errors.push('MONGO_URL or MONGODB_URI must be set in environment');
  }

  // Session
  if (!process.env.SESSION_SECRET) {
    errors.push('SESSION_SECRET must be set in environment');
  }

  // Discord OAuth
  const discordClientId = process.env.DISCORD_CLIENT_ID?.trim();
  const discordClientSecret = process.env.DISCORD_CLIENT_SECRET?.trim();
  const discordRedirectUri = process.env.DISCORD_REDIRECT_URI?.trim();

  if (!discordClientId || !discordClientSecret || !discordRedirectUri) {
    errors.push(
      'DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, and DISCORD_REDIRECT_URI must be set',
    );
  }

  // Discord Bot (only required if not in web-only mode)
  if (!isWebOnly && !process.env.DISCORD_BOT_TOKEN?.trim()) {
    errors.push('DISCORD_BOT_TOKEN is required when not in WEB_ONLY mode');
  }

  if (errors.length > 0) {
    console.error('[FATAL] Environment validation failed:');
    errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }

  return {
    mongoUri,
    discordClientId: cleanEnvVar(discordClientId),
    discordClientSecret: cleanEnvVar(discordClientSecret),
    discordRedirectUri: cleanEnvVar(discordRedirectUri),
  };
}

/**
 * Clean environment variable values by removing quotes, whitespace, and comments
 */
function cleanEnvVar(value) {
  return (
    value
      ?.split('#')[0]
      .replace(/['"\s\n\r]/g, '')
      .trim() || ''
  );
}

// Validate and get cleaned config
const config = validateEnvironment();

// ============================================================================
// MongoDB Connection
// ============================================================================
const GlobalSettings = mongoose.model(
  'GlobalSettings',
  new mongoose.Schema({
    appKey: String,
    masterUserKey: String,
    masterStoreKey: String,
    updatedAt: { type: Date, default: Date.now },
  }),
);

const getAppKey = () =>
  (process.env.ARCTRACKER_APP || process.env.ARCTRACKER_APP_KEY || '').trim();
const getMasterUserKey = () =>
  (
    process.env.ARCTRACKER_KEY ||
    process.env.ARCTRACKER_USER_KEY ||
    process.env.ARC_TRACKER_USER_KEY ||
    ''
  ).trim();
const getMasterStoreKey = () =>
  (process.env.STORE_KEY || process.env.STORE_USER_KEY || '').trim() ||
  getMasterUserKey();
const getMasterMetaforgeId = () => (process.env.METAFORGE_ID || '').trim();

async function getUserArcKey(userId) {
  const user = await User.findOne({ id: userId });
  return user?.arcTrackerKey || getMasterUserKey();
}

let dbConnected = false;

async function connectToMongoDB() {
  try {
    await mongoose.connect(config.mongoUri);
    dbConnected = true;

    // Initialize MetaForge catalog cache
    MetaForgeCatalog.init().catch((e) =>
      console.warn('[MetaForgeCatalog] Init failed:', e.message),
    );

    // Start memory monitoring
    startMonitoring({
      intervalMs: 120000,
      warningThreshold: 400 * 1024 * 1024,
    });
    startAutoSyncService();
  } catch (err) {
    console.error('[DB] MongoDB connection error:', err);
    process.exit(1);
  }
}

// ============================================================================
// Express App Setup
// ============================================================================

const app = express();

// Trust proxy when behind a reverse proxy
app.set('trust proxy', 1);

// CORS configuration
const allowedWebOrigin = process.env.APP_URL || process.env.CORS_ORIGIN;

const corsOptions = {
  origin(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    // Allow all chrome-extension origins
    if (origin.startsWith('chrome-extension://')) {
      return callback(null, true);
    }

    // Allow local development
    if (
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:') ||
      origin.startsWith('http://127.0.0.1:49172')
    ) {
      return callback(null, true);
    }

    // Allow configured app origin
    if (!allowedWebOrigin || origin === allowedWebOrigin) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'APP_KEY',
    'USER_KEY',
    'X-Extension-Version',
    'X-Client-Version',
    'X-Extension-ID',
    'X-Token-Hash',
  ],
};

logger.info('Server is initializing...');

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'img-src': [
          "'self'",
          'data:',
          'https://raw.githubusercontent.com',
          'https://cdn.discordapp.com',
          'https://cdn.arctracker.io',
          'https://arcdata.mahcks.com',
          'https://*.shiesty.me',
          'https://assets.shiesty.me',
          'https://cdn.metaforge.app',
          'https://metaforge.app',
          'https://*.s3.amazonaws.com',
          'https://*.s3.us-east-1.amazonaws.com',
          'https://*.s3.us-east-2.amazonaws.com',
          assetOrigin,
        ],
        'connect-src': [
          "'self'",
          'https://api.embark.games',
          'https://id.embark.games',
          'https://arctracker.io',
          'https://arctracker.io/api/',
          'https://ardb',
          'https://metaforge.app/arc-raiders/api',
        ],
        'script-src': ["'self'", "'unsafe-inline'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: isProduction,
  }),
);

// Logging
app.use(
  morgan(
    '[HTTP] :method :url :status :res[content-length] - :response-time ms',
  ),
);

// CORS and body parsing
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json());

// ============================================================================
// Session Configuration
// ============================================================================

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: config.mongoUri,
      touchAfter: 24 * 3600,
    }),
    proxy: true,
    cookie: {
      secure: isProduction ? 'auto' : false,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
    },
    name: 'shiesty.sid',
  }),
);

// ============================================================================
// Passport Authentication
// ============================================================================

app.use(passport.initialize());
app.use(passport.session());

logger.info('[Config] Discord OAuth initialized');

passport.use(
  new DiscordStrategy(
    {
      clientID: config.discordClientId,
      clientSecret: config.discordClientSecret,
      callbackURL: config.discordRedirectUri,
      scope: ['identify', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await User.findOneAndUpdate(
          { id: profile.id },
          {
            username: profile.username,
            avatar: profile.avatar,
            lastActive: new Date(),
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        done(null, user);
      } catch (err) {
        console.error('[Auth] Discord verify error:', err);
        done(null, false, {
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
  ),
);

passport.serializeUser((user, done) => {
  const discordId =
    typeof user === 'string'
      ? user
      : user?.get?.('id') ||
        (user && typeof user.id === 'string' ? user.id : null);
  if (!discordId) {
    return done(new Error('serializeUser: no Discord id on user'));
  }
  done(null, String(discordId));
});

passport.deserializeUser(async (id, done) => {
  try {
    const discordId = typeof id === 'string' ? id : id?.id;
    if (!discordId || typeof discordId !== 'string') {
      return done(null, null);
    }
    const user = await User.findOne({ id: discordId });
    if (user) {
      return done(null, {
        id: user.get('id'),
        username: user.username,
        avatar: user.avatar,
      });
    }
    done(null, null);
  } catch (err) {
    done(err, null);
  }
});

// ============================================================================
// Auth Routes
// ============================================================================

function getSafeReturnTo(value) {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

app.get('/api/auth/discord', (req, res, next) => {
  const returnTo = getSafeReturnTo(req.query.returnTo);
  if (returnTo) {
    req.session.returnTo = returnTo;
  }
  req.session.oauthStart = Date.now();
  logger.info(
    `[Auth] Discord OAuth start — Session ID: ${req.sessionID}, secure: ${req.secure}, proto: ${req.headers['x-forwarded-proto']}`,
  );
  req.session.save((err) => {
    if (err) return next(err);
    passport.authenticate('discord')(req, res, next);
  });
});

app.get('/api/auth/discord/callback', (req, res, next) => {
  logger.info(
    `[Auth] Discord OAuth callback — Session ID: ${req.sessionID}, has user: ${!!req.user}`,
  );

  passport.authenticate(
    'discord',
    { failureMessage: true },
    (err, user, info) => {
      if (err) {
        logger.error(
          '[Auth] Discord token exchange error:',
          err.message || err,
        );
        delete req.session.oauthStart;
        req.session.save((saveErr) => {
          if (saveErr)
            logger.error(
              '[Auth] Session save error after token failure:',
              saveErr.message,
            );
          res.redirect('/?error=auth_failed');
        });
        return;
      }

      if (!user) {
        logger.warn(
          '[Auth] Discord auth failure:',
          info?.message || 'no user returned',
        );
        return res.redirect('/?error=auth_failed');
      }

      req.logIn(user, (loginErr) => {
        if (loginErr) {
          logger.error('[Auth] logIn error:', loginErr.message || loginErr);
          return res.redirect('/?error=auth_failed');
        }

        req.session.loginAt = Date.now();
        delete req.session.oauthStart;
        req.session.save((saveErr) => {
          if (saveErr) {
            logger.error('[Auth] Session save error:', saveErr.message);
            return res.redirect('/?error=session_save_failed');
          }
          const returnTo = getSafeReturnTo(req.session.returnTo) || '/';
          delete req.session.returnTo;
          res.redirect(returnTo);
        });
      });
    },
  )(req, res, next);
});

// GET /api/v2/user/rounds — fetch logged-in user's ArcTracker rounds
app.get('/api/v2/user/rounds', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res
        .status(401)
        .json({ error: 'Discord login required' });
    }

    const rounds = await UserDataAPI.getRounds(req.user.id, {
      limit: req.query.limit ? Number(req.query.limit) : 5000,
      offset: req.query.offset ? Number(req.query.offset) : 0,
      outcome: req.query.outcome,
      map: req.query.map,
      season: req.query.season ? Number(req.query.season) : undefined,
      dateFrom: req.query.date_from,
      dateTo: req.query.date_to,
      sort: req.query.sort,
    });

    const rows = Array.isArray(rounds?.rounds)
      ? rounds.rounds
      : Array.isArray(rounds)
        ? rounds
        : [];
    res.json({ data: { rounds: rows }, rounds: rows, count: rows.length });
  } catch (err) {
    console.error('[Rounds v2] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/debug/arctracker-all — fetch all ArcTracker endpoints at once
app.get('/api/debug/arctracker-all', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user?.id }).select(
      '+arctrackerUserKey',
    );
    const userKey = user?.arctrackerUserKey;

    if (!userKey) {
      return res.status(400).json({ error: 'No ArcTracker key linked' });
    }
    const appKey = getAppKey();
    const headers = {
      'X-App-Key': appKey,
      Authorization: `Bearer ${userKey}`,
    };

    // Helper to fetch from ArcTracker API
    async function fetchArcTracker(endpoint, query = '', userId) {
      const trackerAppKey = getAppKey();
      if (!trackerAppKey) throw new Error('ArcTracker App key missing.');

      // Fetch key from database if userId is provided, else fallback to env
      const trackerUserKey = userId
        ? await getUserArcKey(userId)
        : getMasterUserKey();

      if (!trackerUserKey) {
        throw new Error(
          'ArcTracker User key missing. Link your account in settings.',
        );
      }

      const urlObj = new URL(`https://arctracker.io/api/v2/user/${endpoint}`);
      const params = new URLSearchParams(query);
      if (!params.has('locale')) params.set('locale', 'en');
      urlObj.search = params.toString();

      console.log(`[ArcTracker] Fetching secure ${urlObj.toString()}`);
      try {
        const response = await fetchWithTimeout(urlObj.toString(), {
          headers: {
            'X-App-Key': trackerAppKey,
            Authorization: `Bearer ${trackerUserKey}`,
          },
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            // Return a mock object so the app doesn't fatally crash
            console.warn(
              `[ArcTracker] 401 Unauthorized for ${endpoint}. Using empty mock data.`,
            );
            return {
              data: null,
              error: true,
              code: 401,
              message: 'Unauthorized API Key',
            };
          }
          const errorText = await response.text();
          throw new Error(
            `ArcTracker API error (${response.status}): ${response.statusText}`,
          );
        }
        return await response.json();
      } catch (error) {
        console.error(
          `[ArcTracker] Fetch failed for ${endpoint}:`,
          error.message,
        );
        throw error;
      }
    }

    // Fetch all endpoints in parallel
    const [profile, rounds, stash, loadout, quests, hideout] =
      await Promise.all([
        fetch('https://arctracker.io/api/v2/user/profile', { headers })
          .then((r) => r.json())
          .catch((e) => ({ error: e.message })),
        fetch('https://arctracker.io/api/v2/user/rounds?limit=5000', {
          headers,
        })
          .then((r) => r.json())
          .catch((e) => ({ error: e.message })),
        fetch('https://arctracker.io/api/v2/user/stash?perPage=5000', {
          headers,
        })
          .then((r) => r.json())
          .catch((e) => ({ error: e.message })),
        fetch('https://arctracker.io/api/v2/user/loadout', { headers })
          .then((r) => r.json())
          .catch((e) => ({ error: e.message })),
        fetch('https://arctracker.io/api/v2/user/quests', { headers })
          .then((r) => r.json())
          .catch((e) => ({ error: e.message })),
        fetch('https://arctracker.io/api/v2/user/hideout', { headers })
          .then((r) => r.json())
          .catch((e) => ({ error: e.message })),
      ]);

    // Calculate stats from rounds
    const roundsData = Array.isArray(rounds.data?.rounds)
      ? rounds.data.rounds
      : [];
    const stats = roundsData.reduce(
      (acc, r) => {
        acc.totalRaids++;
        const s = (r.status || '').toLowerCase();
        if (s === 'extracted' || s.includes('extract')) acc.extractions++;
        if (s === 'failed' || s === 'died') acc.deaths++;
        acc.arcKills += Number(r.arcKills || 0);
        acc.playerKills += Number(r.playerKills || 0);
        acc.damage += Number(r.damageDealt || 0);
        acc.lootValue += Number(r.netProfit || 0);
        acc.score += Number(r.xp || 0);
        return acc;
      },
      {
        totalRaids: 0,
        extractions: 0,
        deaths: 0,
        arcKills: 0,
        playerKills: 0,
        damage: 0,
        lootValue: 0,
        score: 0,
      },
    );

    // Calculate stash value
    const stashItems = stash.data?.items || [];
    const stashValue = stashItems.reduce(
      (sum, item) =>
        sum +
        (item.value || item.price || item.itemValue || 0) *
          (item.quantity || item.amount || 1),
      0,
    );

    res.json({
      profile: profile.data,
      rounds: {
        count: roundsData.length,
        firstRound: roundsData[0],
        calculatedStats: stats,
      },
      stash: {
        itemCount: stashItems.length,
        currencies: stash.data?.currencies,
        calculatedValue: stashValue,
        firstItem: stashItems[0],
      },
      loadout: loadout.data,
      quests: quests.data,
      hideout: hideout.data,
      summary: {
        level: profile.data?.playerLevel,
        username: profile.data?.username,
        totalRaids: stats.totalRaids,
        arcKills: stats.arcKills,
        playerKills: stats.playerKills,
        stashValue: stashValue,
        credits: stash.data?.currencies?.credits,
        tokens: stash.data?.currencies?.tokens,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/user', (req, res) => res.json(req.user || null));

// GET /api/version — returns current data version + last sync timestamps
// so the frontend can detect when user stats changed and prompt a refresh.
app.get('/api/version', async (req, res) => {
  try {
    const raw = await fs.readFile(
      path.resolve(__dirname, '../version.json'),
      'utf-8',
    );
    const versionData = JSON.parse(raw);

    const serverTime = Date.now();
    let lastSyncedAt = null;
    let inventoryLastUpdated = null;

    if (req.user?.id) {
      const settings = await AutoSyncSettings.findOne({
        userId: req.user.id,
      }).lean();
      lastSyncedAt = settings?.lastSyncedAt
        ? new Date(settings.lastSyncedAt).getTime()
        : null;

      const inventoryDoc = await SyncData.findOne({
        userId: req.user.id,
        source: 'extension_inventoryLatest',
      })
        .sort({ syncedAt: -1 })
        .select('syncedAt')
        .lean();
      inventoryLastUpdated = inventoryDoc?.syncedAt
        ? new Date(inventoryDoc.syncedAt).getTime()
        : null;
    }

    res.json({
      version: {
        version: versionData.userDataVersion || '0',
      },
      lastUpdated: {
        lastUpdated: lastSyncedAt,
        inventoryLastUpdated: inventoryLastUpdated,
        serverTime,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read version' });
  }
});

app.get('/api/auth/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy((destroyErr) => {
      if (destroyErr)
        logger.error('[Auth] Session destroy error on logout:', destroyErr);
      res.clearCookie('shiesty.sid');
      res.redirect('/');
    });
  });
});

// ============================================================================
// Session Expiry Middleware — force re-auth after 24 h
// ============================================================================

app.use('/api', (req, res, next) => {
  // Skip auth-initiating and public routes
  const publicPaths = [
    '/api/auth/',
    '/api/events',
    '/api/catalog',
    '/api/health',
  ];
  if (publicPaths.some((p) => req.path.startsWith(p.replace('/api', ''))))
    return next();

  if (req.user && req.session?.loginAt) {
    const age = Date.now() - req.session.loginAt;
    if (age > SESSION_EXPIRY_MS) {
      logger.info(
        `[Auth] Session expired for user ${req.user.id} after ${Math.round(age / 3600000)}h — forcing logout`,
      );
      return req.logout(() => {
        req.session.destroy(() => {
          res.clearCookie('shiesty.sid');
          res.status(401).json({
            expired: true,
            error: 'Session expired. Please sign in again.',
          });
        });
      });
    }
  }
  next();
});

// ============================================================================
// API Routes
// ============================================================================

app.use('/api/extension', extensionRoutes);
app.use('/api/embark', embarkRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/player', playerRoutes);
app.use('/api/discord', discordRoutes);
app.use('/api/arctracker', arctrackerRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/public', publicProfileRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/raider-sync', raiderSyncRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/metaforge', metaforgeRoutes);
app.use('/api/map-progress', mapProgressRoutes);
app.use('/api/g2g', g2gRoutes);

async function loadGeneratedEventsData() {
  const eventsPath = path.join(__dirname, '../events.json');

  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    try {
      const doc = await mongoose.connection.db
        .collection('gameData')
        .findOne({ _id: 'events' });
      if (doc?.payload) return doc.payload;
      logger.warn(
        '[Events] Mongo gameData events payload missing; falling back to local events.json',
      );
    } catch (mongoErr) {
      logger.warn(
        '[Events] Mongo events lookup failed; falling back to local events.json:',
        mongoErr.message,
      );
    }
  }

  const raw = await fs.readFile(eventsPath, 'utf8');
  return JSON.parse(raw);
}

// Generated map events — produced from root map-events.json by the update-data workflow.
app.get('/api/events', async (_req, res) => {
  try {
    const payload = await loadGeneratedEventsData();
    const events = Array.isArray(payload?.events) ? payload.events : [];
    const fetchedAt = payload?.generatedAt || new Date().toISOString();

    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    res.set('X-Events-Fetched-At', fetchedAt);
    res.set('X-Events-Upstream-Ok', '1');
    res.set('X-Events-Count', String(payload?.eventCount ?? events.length));
    res.json(payload);
  } catch (err) {
    logger.error('[Events] Failed to load generated events:', err.message);
    res.set('X-Events-Upstream-Ok', '0');
    res.status(503).json({
      generatedAt: null,
      eventCount: 0,
      events: [],
      error: 'Generated events unavailable',
    });
  }
});

// Sync endpoint
app.post('/api/v1/sync', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Discord login required' });
  }

  try {
    let user = await User.findOne({ id: req.user.id });
    if (!user) {
      user = new User({
        id: req.user.id,
        username: req.user.username,
        avatar: req.user.avatar,
      });
    }

    const [profile, stats, stash] = await Promise.all([
      UserDataAPI.getProfile(req.user.id).catch(() => null),
      buildStatsOverview(req.user.id).catch(() => null),
      UserDataAPI.getStash(req.user.id).catch(() => null),
    ]);

    if (profile) {
      user.embarkId = profile.id || user.embarkId || user.lastActive;
      user.displayName = profile.displayName || profile.name || user.username;
    }

    if (stats) {
      const canonical = stats.canonicalStats || stats.totals || {};
      user.totalRaids =
        canonical.totalRounds ?? stats.performance?.totalRounds ?? user.totalRaids;
      user.successfulExtractions =
        canonical.totalExtracted ??
        stats.performance?.successfulRaids ??
        user.successfulExtractions;
      user.totalKills =
        canonical.totalKills ?? stats.combat?.kills ?? user.totalKills;
      user.arcKills =
        canonical.totalArcKills ?? stats.combat?.arcKills ?? user.arcKills;
      user.playerKills =
        canonical.totalPlayerKills ??
        stats.combat?.playerKills ??
        user.playerKills;
      user.netProfit =
        canonical.totalNetValue ?? stats.economy?.netProfit ?? user.netProfit;
      user.credits =
        stats.currency?.credits ??
        stats.wallet_and_economy?.creds_balance ??
        user.credits;
      user.tokens =
        stats.currency?.tokens ??
        stats.wallet_and_economy?.tokens_balance ??
        user.tokens;
    }

    if (stash?.items) {
      const stashValue = stash.items.reduce((sum, item) => {
        return sum + (item.value || item.price || 0) * (item.quantity || 1);
      }, 0);
      user.stashValue = stashValue;
    }

    user.lastActive = new Date();
    await user.save();

    res.json({ success: true });
  } catch (err) {
    console.error('[Sync] Error:', err);
    res.status(500).json({ error: err.message || 'Sync failed' });
  }
});

// ============================================================================
// Health Check
// ============================================================================

app.get('/ping', (req, res) => {
  if (!dbConnected) {
    return res.status(503).json({ status: 'down', db: 'disconnected' });
  }
  res.json({
    status: 'ok',
    db: 'connected',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/admin/memory', async (req, res) => {
  const usage = process.memoryUsage();
  const os = await import('os');
  res.json({
    heapUsed: (usage.heapUsed / 1024 / 1024).toFixed(2) + 'MB',
    heapTotal: (usage.heapTotal / 1024 / 1024).toFixed(2) + 'MB',
    rss: (usage.rss / 1024 / 1024).toFixed(2) + 'MB',
    external: (usage.external / 1024 / 1024).toFixed(2) + 'MB',
    systemTotal: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2) + 'GB',
    systemFree: (os.freemem() / 1024 / 1024 / 1024).toFixed(2) + 'GB',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// Atlas Mongo/local-data adapter
// ============================================================================

function applyPostgrestLimit(req, rows) {
  const limit = Number(req.query.limit);
  if (Number.isFinite(limit) && limit >= 0) return rows.slice(0, limit);

  const range = req.get('range');
  if (range) {
    const [start, end] = range.split('-').map((value) => Number(value));
    if (Number.isFinite(start) && Number.isFinite(end)) {
      return rows.slice(start, end + 1);
    }
  }
  return rows;
}

function getEqParam(req, key) {
  const value = req.query[key];
  if (typeof value !== 'string') return null;
  return value.startsWith('eq.') ? value.slice(3) : null;
}

app.get('/atlas-db/rest/v1/arc_blueprints', async (req, res) => {
  try {
    const rows = await loadAtlasRowsWithMongo();
    res.set('Content-Range', `0-${Math.max(0, rows.length - 1)}/${rows.length}`);
    res.json(applyPostgrestLimit(req, rows));
  } catch (err) {
    console.error('[AtlasDB] arc_blueprints error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.get('/atlas-db/rest/v1/arc_reports_pending', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 500);
    const finds = await BlueprintFind.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json(finds.map(atlasReportFromFind));
  } catch (err) {
    console.error('[AtlasDB] arc_reports_pending fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.post('/atlas-db/rest/v1/arc_reports_pending', async (req, res) => {
  try {
    const body = Array.isArray(req.body) ? req.body[0] : req.body || {};
    const parsedName = String(body.blueprint || '').trim();
    if (!parsedName || !String(body.map || '').trim()) {
      return res.status(400).json({ message: 'blueprint and map are required' });
    }
    const find = await BlueprintFind.create({
      userId: String(body.user_id || req.user?.id || 'atlas-anonymous'),
      userName: String(body.discord_tag || req.user?.username || 'Atlas user'),
      blueprintId: parsedName.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      blueprintName: parsedName,
      map: String(body.map || '').trim(),
      condition: String(body.condition || 'Any').trim(),
      container: String(body.container || '').trim(),
      location: String(body.location_on_map || '').trim(),
      locked:
        body.behind_locked === true ||
        String(body.behind_locked || '').toLowerCase() === 'yes',
      notes: '',
      source: 'manual',
    });
    res.status(201).json([atlasReportFromFind(find)]);
  } catch (err) {
    console.error('[AtlasDB] arc_reports_pending create error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.patch('/atlas-db/rest/v1/arc_reports_pending', async (req, res) => {
  try {
    const id = getEqParam(req, 'id');
    if (!id) return res.status(400).json({ message: 'id filter required' });
    const update = {};
    if (Number.isFinite(Number(req.body.upvotes))) {
      update['votes.up'] = Number(req.body.upvotes);
    }
    if (Number.isFinite(Number(req.body.downvotes))) {
      update['votes.down'] = Number(req.body.downvotes);
    }
    const find = await BlueprintFind.findByIdAndUpdate(id, update, {
      new: true,
    }).lean();
    if (!find) return res.status(404).json({ message: 'report not found' });
    res.json([atlasReportFromFind(find)]);
  } catch (err) {
    console.error('[AtlasDB] arc_reports_pending update error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/atlas/blueprints', async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();
    const limit = Math.min(Number(req.query.limit) || 10, 25);
    if (query) {
      return res.json(await searchAtlasBlueprintSummaries(query, limit));
    }

    const rows = await loadAtlasRowsWithMongo();
    const counts = new Map();
    for (const row of rows) {
      const name = row.blueprint || row.Blueprint;
      if (!name) continue;
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    res.json(
      Array.from(counts.entries())
        .map(([name, reports]) => ({ name, reports }))
        .sort((a, b) => b.reports - a.reports || a.name.localeCompare(b.name))
        .slice(0, limit),
    );
  } catch (err) {
    console.error('[AtlasAPI] blueprint list error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/atlas/blueprints/:name', async (req, res) => {
  try {
    const summary = await getAtlasBlueprintSummary(req.params.name);
    if (!summary) {
      return res.status(404).json({ message: 'blueprint not found' });
    }
    res.json(summary);
  } catch (err) {
    console.error('[AtlasAPI] blueprint summary error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.get('/atlas-db/rest/v1/arc_report_votes', (req, res) => {
  res.json([]);
});

app.post('/atlas-db/rest/v1/arc_report_votes', (req, res) => {
  res.status(201).json([]);
});

app.get('/atlas-db/rest/v1/arc_user_limits', (req, res) => {
  res.json([]);
});

app.post('/atlas-db/rest/v1/rpc/get_my_submission_status', (req, res) => {
  res.json({
    used: 0,
    limit: 25,
    remaining: 25,
  });
});

app.post('/atlas-db/rest/v1/rpc/set_user_limit', (req, res) => {
  res.json(null);
});

app.post('/atlas-db/rest/v1/rpc/remove_user_limit', (req, res) => {
  res.json(null);
});

app.get('/atlas-db/auth/v1/authorize', (req, res) => {
  const returnTo = getSafeReturnTo(req.query.redirect_to) || '/atlas/index.html';
  res.redirect(`/api/auth/discord?returnTo=${encodeURIComponent(returnTo)}`);
});

app.post('/atlas-db/auth/v1/logout', (req, res) => {
  req.logout(() => {
    req.session?.destroy(() => {
      res.clearCookie('shiesty.sid');
      res.status(204).end();
    });
  });
});

// ============================================================================
// Static Files & SPA Fallback
// ============================================================================

// Root Blueprint Atlas files. Keep this before the SPA fallback so
// /atlas/index.html serves the actual copied Atlas instead of React index.html.
app.use(
  '/atlas',
  express.static(ATLAS_PATH, {
    maxAge: 0,
    etag: true,
  }),
);

// The copied Atlas bundle references a few root-relative assets.
for (const atlasAsset of [
  'discord.svg',
  'google.svg',
  'looting-mk3-safekeeper.png',
  'tactical-mk3-revival.png',
]) {
  app.get(`/${atlasAsset}`, (req, res) => {
    res.sendFile(path.join(ATLAS_PATH, atlasAsset));
  });
}

// Hashed assets (Vite fingerprinted filenames) — cache forever
app.use(
  '/assets',
  express.static(path.join(DIST_PATH, 'assets'), {
    maxAge: '1y',
    immutable: true,
  }),
);

// Everything else (index.html, sw.js, manifest) — always revalidate
app.use(express.static(DIST_PATH, { maxAge: 0, etag: true }));

// API 404 handler
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// SPA fallback for non-API routes
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(DIST_PATH, 'index.html'));
});

// ============================================================================
// Global Error Handler
// ============================================================================

app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err);

  if (res.headersSent) {
    return next(err);
  }

  if (err.message && err.message.includes('No valid token')) {
    return res.status(403).json({ error: err.message, needsExtension: true });
  }

  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ============================================================================
// Server Startup
// ============================================================================

let server;

if (!isBotOnly) {
  server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`[Server] Listening on port ${PORT}`);
  });
}

// ============================================================================
// Process Handlers
// ============================================================================

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
  setTimeout(() => process.exit(1), 500);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
});

function gracefulShutdown(_signal) {
  const closeHttp = () =>
    new Promise((resolve, reject) => {
      if (server) {
        server.close((err) => (err ? reject(err) : resolve()));
      } else {
        resolve();
      }
    });

  closeHttp()
    .then(async () => {
      try {
        if (global.discordClient) {
          await global.discordClient.destroy();
        }

        await mongoose.connection.close();

        process.exit(0);
      } catch (err) {
        console.error('[Shutdown] Error:', err.message);
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error('[Shutdown] Error closing server:', err);
      process.exit(1);
    });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ============================================================================
// Discord Bot (SCRAPPY — events panels, blueprint lookup, prefix commands)
// ============================================================================
// startSCRAPPYBot() handles its own Client, login, and slash command
// registration. It is started AFTER the DB is connected so it can query
// guild configs immediately.

// ============================================================================
// Initialize Application
// ============================================================================

connectToMongoDB().then(() => {
  // Start the SCRAPPY bot only after DB is ready
  if (!isWebOnly) {
    startSCRAPPYBot();
  }
});
