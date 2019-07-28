import express from 'express';

const PORT = process.env.PORT || 5000;
const app = express();

app.get('/', (req, res) => res.send('Hello Emoji Users!!'));

app.listen(PORT, () => console.log(`Listening on ${PORT}`));
