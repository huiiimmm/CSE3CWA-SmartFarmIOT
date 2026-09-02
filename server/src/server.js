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

app.delete("/crop-cards/:id", async (req, res) => {
  const {id} = req.params;

  try {
    const stmt = db.prepare(
      "DELETE FROM crop_card WHERE id = ?"
    );
    const result = stmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        error: "Crop card not found.",
      });
    }

    res.json({
      deleted: id,
    });

  } catch (error) {
    console.error("Failed to delete crop card:", error);
    res.status(500).json({
      error: "Failed to ddelete crop card.",
    });
  }
});

app.put("/crop-cards/:id", (req, res) => {
  const {id} = req.params;

  const {
    crop_name,
    location,
    target_min,
    target_max, 
    normal_water,
    notes
  } = req.body;

  if (
    !crop_name ||
    !location ||
    !target_min ||
    !target_max ||
    !normal_water 
  )  {
    return res.status(400).json({
      error: "missing required data fields",
    });
  }
  db.run(
    `
    UPDATE crop_card
    SET
	crop_name = ?,
	location = ?,
	target_min = ?,
	target_max = ?,
	normal_water = ?,
	notes = ?
    WHERE id = ?
    `,
    [
	crop_name.trim(),
	location.trim(),
	target_min,
	target_max,
	normal_water,
	notes ? notes.trim() : null,
	id,
    ],
    function (error) {
      if (error) {
	console.error("Failed to update crop card:", error);
	return res.status(500).json({
	  error: "Failed to update crop card",
	});
    }
    if (this.changes === 0 ) {
	return res.status(404).json({
	  error: "crop card not found",
	});
    }
    db.get(
      `
      SELECT
	id,
	crop_name,
	location,
	target_min,
	target_max,
	normal_water,
	notes,
	created_at
      FROM crop_card
      WHERE id = ?
      `,
      [id],
      (selectError, updatedCropCard) => {
	if (selectError) {
	  console.error(
	    "Crop card updated but could not be retrieved",
	    selectError
	  );
	return res.status(500).json({
	  error: "Crop card updated but could not be retrieved",
	});
    }
    res.json(updatedCropCard);
    });
  });
});

app.post("/add-crop-card", (req, res) => {
  try {
    const {
      crop_name,
      location,
      target_min,
      target_max,
      normal_water,
      notes
    } = req.body;

    const sqlQuery = `
      INSERT INTO crop_card
      (crop_name, location, target_min, target_max, normal_water, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const stmt = db.prepare(sqlQuery);

    const result = stmt.run(
      crop_name,
      location,
      target_min,
      target_max,
      normal_water,
      notes
    );

    const insertedID = result.lastInsertRowid;

    const savedCrop = db.prepare("SELECT * FROM crop_card WHERE id = ?").get(insertedID);

    res.status(200).json({
      message: "Crop card saved successfully!", 
      record: savedCrop,
    });
  } catch (error) {
    console.error("Database tracking failure:", error);

    res.status(500).json({
      error: "Failed to save data",
    });
  }
});

app.get('/crop-readings', (req, res) => {
  try {
    const filePath = path.join(__dirname, "sensor-readings.json");
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
	  });
	}
    });
  } catch (error) {
    res.status(500).json ({ error: error.message });
  }
});

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
