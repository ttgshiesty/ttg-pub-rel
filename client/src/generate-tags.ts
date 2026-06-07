import * as fs from 'fs';
import * as path from 'path';
import { TagGenerator } from './lib/tagGenerator';
import { TagReasonAnalyzer } from './lib/tagReasoning';
import type { Quest, WorkshopUpgrades, Project } from './types/tags';

/**
 * Build-time tag generation script
 *
 * Loads all data sources (quests, workshops, items) and generates
 * tags for all items using the recursive utility detection algorithm.
 */

const DATA_DIR = path.join(__dirname, '../data');
const QUESTS_ALL_FILE = path.join(DATA_DIR, 'quests-all.json');
const ITEMS_DIR = path.join(DATA_DIR, 'items');
const OUTPUT_FILE = path.join(DATA_DIR, 'item-tags-computed.json');
const REASONS_OUTPUT_FILE = path.join(DATA_DIR, 'item-tag-reasons.json');

function loadQuests(): Quest[] {
  logger.info('📂 Loading quests-all.json...');

  const questData = JSON.parse(fs.readFileSync(QUESTS_ALL_FILE, 'utf8'));
  const quests: Quest[] = Array.isArray(questData)
    ? questData
    : Object.values(questData);
  logger.info(`✓ Loaded ${quests.length} quests`);
  return quests;
}

function loadWorkshopUpgrades(): WorkshopUpgrades {
  const workshopPath = path.join(DATA_DIR, 'workshop_upgrades.json');
  logger.info('📂 Loading workshop upgrades...');

  const workshops = JSON.parse(fs.readFileSync(workshopPath, 'utf8'));

  // Count total requirements
  let totalReqs = 0;
  Object.values(workshops).forEach((station: any) => {
    Object.values(station).forEach((reqs: any) => {
      totalReqs += reqs.length;
    });
  });

  logger.info(
    `✓ Loaded ${Object.keys(workshops).length} workshop stations (${totalReqs} total requirements)`,
  );
  return workshops;
}

function loadItems(): any[] {
  const itemsPath = path.join(DATA_DIR, 'items.json');
  logger.info('📂 Loading items...');

  const items = fs.existsSync(itemsPath)
    ? JSON.parse(fs.readFileSync(itemsPath, 'utf8'))
    : fs
        .readdirSync(ITEMS_DIR)
        .filter((f) => f.endsWith('.json'))
        .map((file) => JSON.parse(fs.readFileSync(path.join(ITEMS_DIR, file), 'utf8')));
  logger.info(`✓ Loaded ${items.length} items`);

  return items;
}

function loadProjects(): Project[] {
  const projectsPath = path.join(DATA_DIR, 'projects.json');
  logger.info('📂 Loading projects...');

  const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));

  // Count total phase requirements
  let totalPhases = 0;
  let totalReqs = 0;
  projects.forEach((project: Project) => {
    totalPhases += project.phases.length;
    project.phases.forEach((phase) => {
      totalReqs += phase.requirementItemIds?.length || 0;
    });
  });

  logger.info(
    `✓ Loaded ${projects.length} project(s) with ${totalPhases} phases (${totalReqs} total requirements)`,
  );
  return projects;
}

function generateTags(): void {
  logger.info('\n🚀 Starting tag generation...\n');

  // Load all data
  const quests = loadQuests();
  const workshopUpgrades = loadWorkshopUpgrades();
  const projects = loadProjects();
  const items = loadItems();

  // Generate tags
  logger.info('\n🔍 Analyzing item dependencies...');
  const generator = new TagGenerator(quests, workshopUpgrades, projects, items);
  const tags = generator.generateTags();

  // Statistics
  const stats = {
    keep: 0,
    sell: 0,
    recycle: 0,
    total: 0,
  };

  Object.values(tags).forEach((tag) => {
    stats[tag]++;
    stats.total++;
  });

  logger.info('\n📊 Tag Statistics:');
  logger.info(
    `  Keep:    ${stats.keep} items (${((stats.keep / stats.total) * 100).toFixed(1)}%)`,
  );
  logger.info(
    `  Sell:    ${stats.sell} items (${((stats.sell / stats.total) * 100).toFixed(1)}%)`,
  );
  logger.info(
    `  Recycle: ${stats.recycle} items (${((stats.recycle / stats.total) * 100).toFixed(1)}%)`,
  );
  logger.info(`  Total:   ${stats.total} items tagged`);

  // Save tags to file
  logger.info(`\n💾 Saving tags to ${OUTPUT_FILE}...`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(tags, null, 2), 'utf8');

  // Generate reasons
  logger.info(`\n🔍 Analyzing tag reasons...`);
  const reasonAnalyzer = new TagReasonAnalyzer(
    quests,
    workshopUpgrades,
    projects,
    items,
    tags,
  );
  const reasons = reasonAnalyzer.generateAllReasons();

  const reasonStats = Object.values(reasons).reduce(
    (acc, r) => {
      acc[r.tag] = (acc[r.tag] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  logger.info(`✓ Generated reasons for ${Object.keys(reasons).length} items`);
  logger.info(`  Keep reasons:    ${reasonStats.keep || 0} items`);
  logger.info(`  Recycle reasons: ${reasonStats.recycle || 0} items`);

  // Save reasons to file
  logger.info(`\n💾 Saving reasons to ${REASONS_OUTPUT_FILE}...`);
  fs.writeFileSync(
    REASONS_OUTPUT_FILE,
    JSON.stringify(reasons, null, 2),
    'utf8',
  );

  logger.info('✅ Tag generation complete!\n');

  // Show some examples
  logger.info('📋 Example tags:');
  const exampleItems = [
    'metal_parts',
    'antiseptic',
    'duct_tape',
    'rubber_parts',
    'plastic_parts',
  ];

  exampleItems.forEach((itemId) => {
    if (tags[itemId]) {
      const item = items.find((i: any) => i.id === itemId);
      const name = item?.name?.en || itemId;
      logger.info(`  ${name.padEnd(20)} → ${tags[itemId]}`);
    }
  });

  // Debug: Show dependency tree for a "keep" item
  const keepItem = Object.keys(tags).find((id) => tags[id] === 'keep');
  if (keepItem) {
    logger.info(`\n🔗 Dependency tree for "${keepItem}" (first 5 levels):`);
    const tree = generator.getDependencyTree(keepItem, 5);
    tree.slice(0, 10).forEach((node) => {
      const indent = '  '.repeat(node.depth);
      logger.info(
        `${indent}${node.itemId} (${node.reason}${node.source ? ': ' + node.source : ''})`,
      );
    });
  }
}

// Run
try {
  generateTags();
} catch (error) {
  console.error('❌ Error generating tags:', error);
  process.exit(1);
}
