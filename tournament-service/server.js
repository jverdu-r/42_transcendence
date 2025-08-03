const express = require('express');
const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json()); // To parse JSON bodies

app.get('/', (req, res) => {
  res.send('Tournament Service is running!');
});

// Add POST /api/tournaments endpoint
app.post('/api/tournaments', (req, res) => {
  const tournament = req.body;
  // For now, just echo received data and success
  res.status(201).json({ message: 'Tournament created successfully!', tournament });
});

app.listen(PORT, () => {
  console.log(`Tournament Service listening on port ${PORT}`);
});
