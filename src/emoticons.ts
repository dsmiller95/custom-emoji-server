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
            const queryResult = await client.query(
                'Insert into emoji (name, image) values ($1, $2)',
                [emojiName, hexData]);
            client.release();
            res.status(200).send('successfully inserted emoji ' + emojiName);
        } catch (err) {
            res.status(500).send('Error ' + err);
        }
    });

async function getValidEmoticons(): Promise<EmoticonMap> {
    const files = await fs.readdir(emojiListPath);
    const result: EmoticonMap = {};
    files.forEach(fileName => {
        const match = fileName.match(emoticonMatch);
        if (match.length > 0) {
            const emoticonName = match[0];
            result[emoticonName] = emojiListPath + fileName;
        }
    });
    return result;
}

emoticonRouter.use((req, res, next) => {
    const origin = res.get('origin') || 'https://teams.microsoft.com';
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

emoticonRouter.get('/emoticons', async (req, res, next) => {
    const emojisMap = await getValidEmoticons();
    res.send(Object.keys(emojisMap));
});

emoticonRouter.get('/emoticon/:emoticon', async (req, res, next) => {
    const emoticonName = req.params.emoticon;
    console.log(`getting ${emoticonName}`);

    let imageData: Buffer;
    try {
        const client = await pool.connect();
        const result = await client.query(
            'select image from emoji where name = $1',
            [emoticonName]);
        const rows = result.rows;
        if (rows.length === 0) {
            res.sendStatus(404);
            return;
        }
        imageData = rows[0].image;
    } catch (err) {
        res.status(500).send('Error ' + err);
        return;
    }

    res.set('Content-Type', 'image/gif');
    res.send(imageData);
});
