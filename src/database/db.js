const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

let db;

async function initDB() {
    db = await open({
        filename: path.join(__dirname, '../../database.sqlite'),
        driver: sqlite3.Database
    });

    // Election settings per server
    await db.exec(`
        CREATE TABLE IF NOT EXISTS election_settings (
            guild_id TEXT PRIMARY KEY,
            is_open INTEGER DEFAULT 0,
            booth_channel_id TEXT,
            booth_message_id TEXT,
            reg_channel_id TEXT,
            reg_message_id TEXT
        );

        CREATE TABLE IF NOT EXISTS parties (
            party_id TEXT PRIMARY KEY,
            guild_id TEXT,
            name TEXT,
            emoji TEXT,
            banner_url TEXT,
            owner_id TEXT,
            UNIQUE(guild_id, name)
        );

        CREATE TABLE IF NOT EXISTS voter_registry (
            guild_id TEXT,
            user_id TEXT,
            election_id TEXT UNIQUE,
            registered_at INTEGER,
            PRIMARY KEY (guild_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS votes (
            guild_id TEXT,
            election_id TEXT PRIMARY KEY,
            party_id TEXT,
            voted_at INTEGER
        );
    `);
    return db;
}

function getDB() {
    if (!db) throw new Error("Database engine not initialized.");
    return db;
}

module.exports = { initDB, getDB };