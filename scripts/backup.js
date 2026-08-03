// Simple Node.js backup script
// Usage: node /app/scripts/backup.js

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const RETENTION_DAYS = parseInt(process.argv[2] || '30', 10);
const BACKUP_DIR = process.env.BACKUP_DIR || '/backups';

// Build timestamp YYYYMMDD_HHMMSS using local components
function makeTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const TIMESTAMP = makeTimestamp();
const BACKUP_NAME = `backup_${TIMESTAMP}`;

console.log(`[${new Date().toISOString()}] Starting backup: ${BACKUP_NAME}`);

async function backup() {
  const prisma = new PrismaClient();
  try {
    // Dump core tables
    const tables = [
      'users', 'categories', 'documents', 'document_summaries',
      'document_flowcharts', 'document_chunks', 'citations', 'mcp_tokens',
      'activities', 'notifications',
    ];

    const dump = {};
    let rowCount = 0;
    for (const table of tables) {
      try {
        const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "${table}"`);
        dump[table] = rows;
        rowCount += Array.isArray(rows) ? rows.length : 0;
      } catch (e) {
        console.warn(`Skipped ${table}: ${e.message}`);
      }
    }

    const json = JSON.stringify(dump);
    const gz = zlib.gzipSync(Buffer.from(json));
    const pgFile = path.join(BACKUP_DIR, `${BACKUP_NAME}_postgres.json.gz`);
    fs.writeFileSync(pgFile, gz);
    console.log(`[${new Date().toISOString()}] Postgres: ${path.basename(pgFile)} (${(gz.length / 1024).toFixed(1)} KB, ${Object.keys(dump).length} tables, ${rowCount} rows)`);
  } catch (e) {
    console.error('Postgres backup failed:', e.message);
  }

  await prisma.$disconnect();

  // Metadata
  try {
    const metaFile = path.join(BACKUP_DIR, `${BACKUP_NAME}_meta.json`);
    fs.writeFileSync(metaFile, JSON.stringify({
      timestamp: TIMESTAMP,
      date: new Date().toISOString(),
      name: BACKUP_NAME,
      retentionDays: RETENTION_DAYS,
    }, null, 2));
    console.log(`[${new Date().toISOString()}] Metadata: ${path.basename(metaFile)}`);
  } catch (e) {
    console.error('Metadata failed:', e.message);
  }

  // Cleanup
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const cutoff = Date.now() - RETENTION_DAYS * 86400 * 1000;
    let removed = 0;
    for (const f of files) {
      if (!f.startsWith('backup_')) continue;
      const fullPath = path.join(BACKUP_DIR, f);
      const stat = fs.statSync(fullPath);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(fullPath);
        removed++;
      }
    }
    const remaining = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('backup_')).length;
    console.log(`[${new Date().toISOString()}] Cleanup: removed ${removed}, remaining ${remaining}`);
  } catch (e) {
    console.error('Cleanup failed:', e.message);
  }

  console.log(`[${new Date().toISOString()}] Backup complete: ${BACKUP_NAME}`);
}

backup().catch((e) => {
  console.error('Backup failed:', e);
  process.exit(1);
});