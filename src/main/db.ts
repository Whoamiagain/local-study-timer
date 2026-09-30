import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'node:path';
import type { BlockType, TimerBlock, TimerScheme } from '../renderer/types';

type SchemeRow = Pick<TimerScheme, 'id' | 'name' | 'created_at'>;
type BlockRow = Omit<TimerBlock, 'allow_skip'> & { allow_skip: number };

let database: Database.Database | undefined;

const getDatabase = (): Database.Database => {
  if (!database) {
    throw new Error('The study timer database has not been initialized.');
  }
  return database;
};

const seedSchemes: Array<{
  name: string;
  blocks: Array<{ type: BlockType; duration: number; allowSkip: boolean }>;
}> = [
  {
    name: 'Pomodoro Classic',
    blocks: [
      { type: 'WORK', duration: 25, allowSkip: false },
      { type: 'REST', duration: 5, allowSkip: true },
      { type: 'WORK', duration: 25, allowSkip: false },
      { type: 'REST', duration: 5, allowSkip: true },
      { type: 'WORK', duration: 25, allowSkip: false },
      { type: 'REST', duration: 15, allowSkip: false },
    ],
  },
  {
    name: 'Decaying Attention 50/40/30/20/10',
    blocks: [
      { type: 'WORK', duration: 50, allowSkip: false },
      { type: 'REST', duration: 10, allowSkip: true },
      { type: 'WORK', duration: 40, allowSkip: false },
      { type: 'REST', duration: 10, allowSkip: true },
      { type: 'WORK', duration: 30, allowSkip: false },
      { type: 'REST', duration: 10, allowSkip: true },
      { type: 'WORK', duration: 20, allowSkip: false },
      { type: 'REST', duration: 10, allowSkip: true },
      { type: 'WORK', duration: 10, allowSkip: false },
      { type: 'REST', duration: 10, allowSkip: false },
    ],
  },
];

export const initializeDatabase = (): Database.Database => {
  if (database) {
    return database;
  }

  const activeDatabase = new Database(
    path.join(app.getPath('userData'), 'study_timer.db'),
  );
  database = activeDatabase;

  activeDatabase.pragma('foreign_keys = ON');
  activeDatabase.exec(`
    CREATE TABLE IF NOT EXISTS schemes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scheme_id INTEGER,
      order_index INTEGER,
      type TEXT,
      duration_minutes INTEGER,
      allow_skip INTEGER,
      FOREIGN KEY(scheme_id) REFERENCES schemes(id) ON DELETE CASCADE
    );
  `);

  const schemeCount = activeDatabase
    .prepare('SELECT COUNT(*) AS count FROM schemes')
    .get() as { count: number };

  if (schemeCount.count === 0) {
    const seed = activeDatabase.transaction(() => {
      const insertScheme = activeDatabase.prepare(
        'INSERT INTO schemes (name) VALUES (?)',
      );
      const insertBlock = activeDatabase.prepare(
        'INSERT INTO blocks (scheme_id, order_index, type, duration_minutes, allow_skip) VALUES (?, ?, ?, ?, ?)',
      );

      for (const scheme of seedSchemes) {
        const result = insertScheme.run(scheme.name);
        const schemeId = Number(result.lastInsertRowid);

        scheme.blocks.forEach((block, orderIndex) => {
          insertBlock.run(
            schemeId,
            orderIndex,
            block.type,
            block.duration,
            Number(block.allowSkip),
          );
        });
      }
    });

    seed();
  }

  return activeDatabase;
};

export const getSchemes = (): TimerScheme[] => {
  const db = getDatabase();
  const schemes = db
    .prepare(
      'SELECT id, name, created_at FROM schemes ORDER BY id',
    )
    .all() as SchemeRow[];
  const getBlocks = db.prepare(
    'SELECT id, scheme_id, order_index, type, duration_minutes, allow_skip FROM blocks WHERE scheme_id = ? ORDER BY order_index',
  );

  return schemes.map((scheme) => ({
    ...scheme,
    blocks: (getBlocks.all(scheme.id) as BlockRow[]).map((block) => ({
      ...block,
      allow_skip: Boolean(block.allow_skip),
    })),
  }));
};

export const createScheme = (name: string): number => {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Scheme name cannot be empty.');
  }

  const db = getDatabase();
  const create = db.transaction(() => {
    const result = db
      .prepare('INSERT INTO schemes (name) VALUES (?)')
      .run(trimmedName);
    return Number(result.lastInsertRowid);
  });

  return create();
};

export const updateScheme = (scheme: TimerScheme): void => {
  const db = getDatabase();
  const update = db.transaction(() => {
    const result = db
      .prepare('UPDATE schemes SET name = ? WHERE id = ?')
      .run(scheme.name.trim(), scheme.id);

    if (result.changes === 0) {
      throw new Error(`Scheme ${scheme.id} was not found.`);
    }

    db.prepare('DELETE FROM blocks WHERE scheme_id = ?').run(scheme.id);
    const insertBlockWithId = db.prepare(
      'INSERT INTO blocks (id, scheme_id, order_index, type, duration_minutes, allow_skip) VALUES (?, ?, ?, ?, ?, ?)',
    );
    const insertBlock = db.prepare(
      'INSERT INTO blocks (scheme_id, order_index, type, duration_minutes, allow_skip) VALUES (?, ?, ?, ?, ?)',
    );

    scheme.blocks.forEach((block, orderIndex) => {
      const values = [
        scheme.id,
        orderIndex,
        block.type,
        block.duration_minutes,
        Number(block.allow_skip),
      ] as const;
      const blockId = Number(block.id);

      if (Number.isSafeInteger(blockId) && blockId > 0) {
        insertBlockWithId.run(blockId, ...values);
      } else {
        insertBlock.run(...values);
      }
    });
  });

  update();
};

export const deleteScheme = (id: number): void => {
  getDatabase().prepare('DELETE FROM schemes WHERE id = ?').run(id);
};