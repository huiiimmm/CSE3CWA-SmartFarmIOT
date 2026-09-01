const express = require("express");
const { createProxyMiddleware } = require('http-proxy-middleware');

const cors = require("cors");
const db = require("./db");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.get('/favicon.ico', (req, res) => res.status(204).end());

app.get('/', (req, res) => {
    res.send('<h1>SmartFarm Server is Running!</h1>');
});

app.get('/crop-cards', (req, res) => {
  try {
	const crops = db.prepare('SELECT * FROM crop_card').all();
	res.json(crops);
  } catch (error) {
	res.status(500).json({ error: error.message });
  }
});

app.get('/crop-readings', (req, res) => {
  try {
    const filePath = path.join(_dirname, "sensor-readings.json");
    fs.readFile(filePath, "utf8", (err, data) => {
	if (err) {
	  console.error("Error reading sensor data:", err);
	  return res.status(500).json({
	   error: "failed to read sensor readings"
	});
	}
	try {
	  const readings = JSON.parse(data);
	  res.json(readings);
	} catch (parseError) {
	  console.error("invalid JSON:", parseError);
	  res.status(500).json({
	    error: "Invalid sensor readings JSON"
	  }):
	}
    });
  });
  } catch (error) {
    res.status(500).json ({ error: error.message });
  }
}

const apiProxy = createProxyMiddleware({
  target: 'http://127.0.0.1:5000',
  changeOrigin: true,
  pathRewrite: {
        '^/api': '',
  },
});

app.use('/api', apiProxy);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
