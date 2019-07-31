import express from 'express';

import { emoticonRouter } from './emoticons';

const PORT = process.env.PORT || 5000;
const app = express();

app.get('/', (req, res) => res.send('Hello Emoji Users!!'));

app.use('/', emoticonRouter);

app.listen(PORT, () => console.log(`Listening on ${PORT}`));
