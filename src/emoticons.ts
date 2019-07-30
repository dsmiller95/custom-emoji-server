import * as bodyParser from 'body-parser';
import express, { Router } from 'express';
import { default as fsWithCallbacks } from 'fs';
import { Pool } from 'pg';
const fs = fsWithCallbacks.promises;

export const emoticonRouter = express.Router();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
});

interface EmoticonMap { [emoticon: string]: string; }
const emoticonMatch = /[^~]+/;
const emojiListPath = './assets/emoji/';

emoticonRouter.use((req, res, next) => {
    const origin = res.get('origin') || 'https://teams.microsoft.com';
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

emoticonRouter.post('/emoticon/:emoticon',
    bodyParser.raw({
        limit: '1mb',
        type: 'image/*'
    }), async (req, res) => {
        const data: Buffer = req.body;
        const hexData = '\\x' + data.toString('hex');
        const emojiName = req.params.emoticon;
        try {
            const client = await pool.connect();
            await client.query(
                'Insert into emoji (name, image) values ($1, $2)',
                [emojiName, hexData]);
            client.release();
            res.status(200).send('successfully inserted emoji ' + emojiName);
        } catch (err) {
            res.status(500).send('Error ' + err);
        }
    });

emoticonRouter.delete('/emoticon/:emoticon', async (req, res) => {
    const emojiName = req.params.emoticon;
    try {
        const client = await pool.connect();
        await client.query(
            'delete from emoji where name = $1',
            [emojiName]);
        client.release();
        res.status(200).send('deleted emoji ' + emojiName);
    } catch (err) {
        res.status(500).send('Error ' + err);
    }
});

emoticonRouter.get('/emoticon/:emoticon', async (req, res) => {
    const emoticonName = req.params.emoticon;
    console.log(`getting ${emoticonName}`);

    let imageData: Buffer;
    try {
        const client = await pool.connect();
        const result = await client.query(
            'select image from emoji where name = $1',
            [emoticonName]);
        if (!result || !result.rows || result.rows.length === 0) {
            res.status(404).send('not found');
            return;
        }
        const rows = result.rows;
        imageData = rows[0].image;
    } catch (err) {
        res.status(500).send('Error ' + err);
        return;
    }

    res.set('Content-Type', 'image/gif');
    res.send(imageData);
});

emoticonRouter.get('/emoticons', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('select name from emoji');
        const rows: Array<{ name: string }> = result.rows;
        res.send(rows.map(row => row.name));
    } catch (err) {
        res.status(500).send('Error ' + err);
        return;
    }
});
