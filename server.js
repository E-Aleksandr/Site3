const express = require('express');
const cors = require('cors');

const { createClient } = require('@libsql/client');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('static'));

const tursoUrl = process.env.TURSO_DB_URL;
const tursoToken = process.env.TURSO_DB_TOKEN;

if (!tursoUrl || !tursoToken) {
    console.error('❌ Ошибка: TURSO_DB_URL или TURSO_DB_TOKEN не заданы в окружении');
}

const db = createClient({
    url: tursoUrl,
    authToken: tursoToken,
});

async function initDatabase() {
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await db.execute(`
            CREATE TABLE IF NOT EXISTS tank_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                nation TEXT NOT NULL,
                tank_index INTEGER NOT NULL,
                destroyed BOOLEAN DEFAULT 0,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(player_id, nation, tank_index),
                FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE
            )
        `);
        
        console.log('✅ Таблицы созданы/проверены');
    } catch (err) {
        console.error('❌ Ошибка инициализации БД:', err.message);
    }
}

initDatabase();

app.get('/api/players', async (req, res) => {
    try {
        const result = await db.execute('SELECT name FROM players ORDER BY name');
        res.json({ 
            success: true, 
            players: result.rows.map(row => row.name) 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/progress', async (req, res) => {
    const { playerName } = req.body;
    
    if (!playerName) {
        return res.status(400).json({ success: false, error: 'Не указан игрок' });
    }
    
    try {
        const playerResult = await db.execute({
            sql: 'SELECT id FROM players WHERE name = ?',
            args: [playerName]
        });
        
        const player = playerResult.rows[0];
        
        if (!player) {
            return res.json({ success: true, progress: {}, totalDestroyed: 0 });
        }
        
        const progressResult = await db.execute({
            sql: 'SELECT nation, tank_index, destroyed FROM tank_progress WHERE player_id = ?',
            args: [player.id]
        });
        
        const progress = {};
        let totalDestroyed = 0;
        
        progressResult.rows.forEach(row => {
            if (!progress[row.nation]) {
                progress[row.nation] = [];
            }
            progress[row.nation][row.tank_index] = row.destroyed === 1;
            if (row.destroyed === 1) totalDestroyed++;
        });
        
        res.json({ 
            success: true, 
            progress: progress,
            totalDestroyed: totalDestroyed
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/save', async (req, res) => {
    const { playerName, nation, tankIndex, destroyed, adminToken } = req.body;
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'Automaton123Dysphoria';
    
    if (adminToken !== ADMIN_TOKEN) {
        return res.status(403).json({ 
            success: false, 
            error: 'Доступ запрещен. Только для администратора.' 
        });
    }
    
    if (!playerName || nation === undefined || tankIndex === undefined) {
        return res.status(400).json({ success: false, error: 'Не все параметры указаны' });
    }
    
    try {
        const playerResult = await db.execute({
            sql: 'SELECT id FROM players WHERE name = ?',
            args: [playerName]
        });
        
        let playerId = playerResult.rows[0]?.id;
        
        if (!playerId) {
            const insertResult = await db.execute({
                sql: 'INSERT INTO players (name) VALUES (?)',
                args: [playerName]
            });
            playerId = insertResult.lastInsertRowid;
        }
        
        await db.execute({
            sql: `
                INSERT INTO tank_progress (player_id, nation, tank_index, destroyed, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(player_id, nation, tank_index) 
                DO UPDATE SET destroyed = ?, updated_at = CURRENT_TIMESTAMP
            `,
            args: [playerId, nation, tankIndex, destroyed ? 1 : 0, destroyed ? 1 : 0]
        });
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/add-player', async (req, res) => {
    const { playerName, adminToken } = req.body;
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'Automaton123Dysphoria';
    
    if (adminToken !== ADMIN_TOKEN) {
        return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }
    
    if (!playerName || playerName.trim() === '') {
        return res.status(400).json({ success: false, error: 'Имя не может быть пустым' });
    }
    
    try {
        const result = await db.execute({
            sql: 'INSERT OR IGNORE INTO players (name) VALUES (?)',
            args: [playerName.trim()]
        });
        
        res.json({ success: true, playerId: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/g83dsh21tdsg9sa', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'admin.html'));
});

app.get('/view', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'view.html'));
});

app.get('/', (req, res) => {
    res.redirect('/view');
});
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📊 Админ панель: http://localhost:${PORT}/admin`);
    console.log(`👁️ Просмотр: http://localhost:${PORT}/view`);
});
