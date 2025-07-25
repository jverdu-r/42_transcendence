const express = require('express');
const app = express();
const PORT = process.env.PORT || 8000;

app.get('/', (req, res) => {
  res.send('Tournament Service is running!');
});

app.listen(PORT, () => {
  console.log(`Tournament Service listening on port ${PORT}`);
});
