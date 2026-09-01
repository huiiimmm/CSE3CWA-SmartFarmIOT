const Database = require("better-sqlite3");

const db = new Database("database.sqlite");

db.exec(`
  DROP TABLE IF EXISTS crop_card;
  CREATE TABLE IF NOT EXISTS crop_card(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crop_name TEXT NOT NULL UNIQUE CHECK (crop_name IN ('Tomato', 'Lettuce', "Wheat", 'Maize')),
    location TEXT NOT NULL,
    target_min REAL NOT NULL CHECK (target_min >= 0 AND target_min <= 100),
    target_max REAL NOT NULL CHECK (target_max >= 0 AND target_max <= 100),
    normal_water REAL NOT NULL CHECK (normal_water > 0 AND normal_water <= 10000),
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (target_min < target_max)
  );
  CREATE UNIQUE INDEX IF NOT EXISTS unique_crop_card
  ON crop_card(crop_name);

  INSERT OR IGNORE INTO crop_card (crop_name, location, target_min, target_max, normal_water)
  VALUES 
    ('Tomato', 'Greenhouse A', 55, 75, 500),
    ('Lettuce', 'Greenhouse B', 60, 80, 400),
    ('Wheat', 'North Field', 35, 55, 300);
`);

module.exports = db;
