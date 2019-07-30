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
                [emojiName, hexData],
                (err, result) => {
                    res.status(500).send('Sql error when inserting image' + err);
                });
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
    const emoticons = await getValidEmoticons();
    const path = emoticons[emoticonName];
    if (!path) {
        res.sendStatus(404);
        return;
    }

    const fileData = await fs.readFile(path);

    res.set('Content-Type', 'image/gif');
    res.send(fileData);
});
