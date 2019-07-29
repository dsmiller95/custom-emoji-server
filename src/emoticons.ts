import express, { Router } from 'express';
import { Pool } from 'pg';

import { default as fsWithCallbacks } from 'fs';
const fs = fsWithCallbacks.promises;

export const emoticonRouter = express.Router();

interface EmoticonMap { [emoticon: string]: string; }

const emoticonMatch = /[^~]+/;
const emojiListPath = './assets/emoji/';

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
