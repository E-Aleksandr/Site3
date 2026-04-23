const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ===== НАСТРОЙКА БД (с поддержкой Docker volume) =====
const dbDir = path.join(__dirname, 'data');
const dbPath = path.join(dbDir, 'tanks.db');

// Создаем директорию для БД если её нет
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

// Создание таблиц
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    db.run(`
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
    
    console.log('✅ База данных инициализирована:', dbPath);
});

// ===== API ЭНДПОИНТЫ =====

// Получить всех игроков
app.get('/api/players', (req, res) => {
    db.all('SELECT name FROM players ORDER BY name', (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ 
            success: true, 
            players: rows.map(row => row.name) 
        });
    });
});

// Получить прогресс игрока
app.post('/api/progress', (req, res) => {
    const { playerName } = req.body;
    
    if (!playerName) {
        return res.status(400).json({ success: false, error: 'Не указан игрок' });
    }
    
    db.get('SELECT id FROM players WHERE name = ?', [playerName], (err, player) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        
        if (!player) {
            return res.json({ success: true, progress: {}, totalDestroyed: 0 });
        }
        
        db.all(
            'SELECT nation, tank_index, destroyed FROM tank_progress WHERE player_id = ?',
            [player.id],
            (err, rows) => {
                if (err) {
                    return res.status(500).json({ success: false, error: err.message });
                }
                
                const progress = {};
                let totalDestroyed = 0;
                
                rows.forEach(row => {
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
            }
        );
    });
});

// Сохранить прогресс (только для админа)
app.post('/api/save', (req, res) => {
    const { playerName, nation, tankIndex, destroyed, adminToken } = req.body;
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'mytanks2024secret';
    
    if (adminToken !== ADMIN_TOKEN) {
        return res.status(403).json({ 
            success: false, 
            error: 'Доступ запрещен. Только для администратора.' 
        });
    }
    
    if (!playerName || nation === undefined || tankIndex === undefined) {
        return res.status(400).json({ success: false, error: 'Не все параметры указаны' });
    }
    
    db.get('SELECT id FROM players WHERE name = ?', [playerName], (err, player) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        
        const saveProgress = (playerId) => {
            db.run(`
                INSERT INTO tank_progress (player_id, nation, tank_index, destroyed, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(player_id, nation, tank_index) 
                DO UPDATE SET destroyed = ?, updated_at = CURRENT_TIMESTAMP
            `, [playerId, nation, tankIndex, destroyed ? 1 : 0, destroyed ? 1 : 0], (err) => {
                if (err) {
                    return res.status(500).json({ success: false, error: err.message });
                }
                res.json({ success: true });
            });
        };
        
        if (player) {
            saveProgress(player.id);
        } else {
            db.run('INSERT INTO players (name) VALUES (?)', [playerName], function(err) {
                if (err) {
                    return res.status(500).json({ success: false, error: err.message });
                }
                saveProgress(this.lastID);
            });
        }
    });
});

// Добавить игрока (только для админа)
app.post('/api/add-player', (req, res) => {
    const { playerName, adminToken } = req.body;
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'mytanks2024secret';
    
    if (adminToken !== ADMIN_TOKEN) {
        return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }
    
    if (!playerName || playerName.trim() === '') {
        return res.status(400).json({ success: false, error: 'Имя не может быть пустым' });
    }
    
    db.run('INSERT OR IGNORE INTO players (name) VALUES (?)', [playerName.trim()], function(err) {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, playerId: this.lastID });
    });
});

// Раздача HTML
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/view', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'view.html'));
});

app.get('/', (req, res) => {
    res.redirect('/view');
});

// Запуск
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📊 Админ панель: http://localhost:${PORT}/admin`);
    console.log(`👁️ Просмотр: http://localhost:${PORT}/view`);
});
