const express = require('express')
const rateLimit = require("express-rate-limit");

const app = express()
const port = 3000

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
});

app.use(limiter);

app.get('/', async (req, res) => {
  res.send('Hello World!')
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})