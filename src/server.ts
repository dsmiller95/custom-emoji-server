import express from 'express';
import { Pool } from 'pg';

import { emoticonRouter } from './emoticons';

const PORT = process.env.PORT || 5000;
const app = express();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
});

app.get('/', (req, res) => res.send('Hello Emoji Users!!'));

app.get('/db', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM test_table');
        res.send(result ? result.rows : 'nothing here');
        client.release();
    } catch (err) {
        console.error(err);
        res.send('Error ' + err);
    }
});

app.use('/', emoticonRouter);

app.listen(PORT, () => console.log(`Listening on ${PORT}`));
