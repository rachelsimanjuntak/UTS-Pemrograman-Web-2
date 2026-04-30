const http = require('http');
const pool = require('./db');
require('dotenv').config();

const getRequestBody = (req) => {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            resolve(body ? JSON.parse(body) : {});
        });
        req.on('error', err => {
            reject(err);
        });
    });
};

const server = http.createServer(async (req, res) => {
    const time = new Date().toISOString();
    console.log(`[${time}] ${req.method} ${req.url}`);

    res.setHeader('Content-Type', 'application/json');

    const url = req.url;
    const method = req.method;

    try {
        if (url === '/tasks' && method === 'GET') {
            const result = await pool.query('SELECT * FROM tasks ORDER BY id ASC');
            res.writeHead(200);
            res.end(JSON.stringify(result.rows));
        }
        
        else if (url.match(/^\/tasks\/([0-9]+)$/) && method === 'GET') {
            const id = url.split('/')[2];
            const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
            
            if (result.rows.length === 0) {
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Data tugas tidak ditemukan' }));
            } else {
                res.writeHead(200);
                res.end(JSON.stringify(result.rows[0]));
            }
        }
        
        else if (url === '/tasks' && method === 'POST') {
            const body = await getRequestBody(req);
            const { title, description } = body;

            if (!title || title.trim() === '') {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Title tidak boleh kosong' }));
                return;
            }

            const result = await pool.query(
                'INSERT INTO tasks (title, description) VALUES ($1, $2) RETURNING *',
                [title, description]
            );
            res.writeHead(201);
            res.end(JSON.stringify(result.rows[0]));
        }
        
        else if (url.match(/^\/tasks\/([0-9]+)$/) && method === 'PUT') {
            const id = url.split('/')[2];
            const body = await getRequestBody(req);
            const { title, description, is_completed } = body;

            if (!title || title.trim() === '') {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Title tidak boleh kosong' }));
                return;
            }

            const result = await pool.query(
                'UPDATE tasks SET title = $1, description = $2, is_completed = $3 WHERE id = $4 RETURNING *',
                [title, description, is_completed, id]
            );

            if (result.rows.length === 0) {
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Data tugas untuk diupdate tidak ditemukan' }));
            } else {
                res.writeHead(200);
                res.end(JSON.stringify(result.rows[0]));
            }
        }
        
        else if (url.match(/^\/tasks\/([0-9]+)$/) && method === 'DELETE') {
            const id = url.split('/')[2];
            const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);

            if (result.rows.length === 0) {
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Data tugas untuk dihapus tidak ditemukan' }));
            } else {
                res.writeHead(200);
                res.end(JSON.stringify({ message: 'Tugas berhasil dihapus', deleted_task: result.rows[0] }));
            }
        }
        
        else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Endpoint tidak ditemukan' }));
        }

    } catch (err) {
        console.error(err);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Terjadi kesalahan pada server' }));
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Native Node.js Server berjalan di http://localhost:${PORT}`);
});