import { useState, useEffect } from 'react'
import './App.css'

function App() {

  const [cropCards, setCropCards] = useState([]);
  const [cropReadings, setCropReadings] = useState([]);
  const [latestCropReadings, setLatestCropReadings] = useState([]);
  const [editingCropCard, setEditingCropCard] = useState(null);
  const [farmStatus, setFarmStatus] = useState({  
    status: "No data",
    healthy: 0,
    attention: 0,
    critical: 0,
    total: 0,
  });

  const [showCropAdditionForm, setShowCropAdditionForm] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [selectedCropReadings, setSelectedCropReadings] = useState([]);
  const [showCropHistory, setShowCropHistory] = useState(false);

  const [cropAdditionForm, setCropAdditionForm] = useState({
    crop_name: "",
    location: "",
    target_min: "",
    target_max: "",
    normal_water: "",
    notes: "",
  });

  const [validationMessage, setValidationMessage] = useState("");
  
  const sortCropReadings = (readings) => {
    return [...readings].sort((a, b) => {
      const cropCompare = a.crop_name.localeCompare(b.crop_name);

      if (cropCompare !== 0) {
	return cropCompare;
      }
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  }

  const getRecentReadingsPerCrop = (readings, cropCards) => {
    if (!Array.isArray(readings) || !Array.isArray(cropCards)) {
      return{};
    }

    const sortedReadings = sortCropReadings(readings);
    const grouped = {};

    for (const crop of cropCards) {
      const cropName = crop.crop_name;

      const cropReadings = sortedReadings.filter(
	(reading) => String(reading.crop_name).trim().toLowerCase() ===
		     String(cropName).trim().toLowerCase()
	).slice(0, 5);
      grouped[cropName] = cropReadings;
    }
  return grouped;
  };

  const getRecentReadingsForCrop = (cropName) => {
    return cropReadings.filter((reading) => reading.crop_name === cropName).sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);
  };

  const getLatestCropReadings = (readings) => {
    const latest = {};
    for (const reading of readings) {
      const cropName = reading.crop_name;

      if (
	!latest[cropName] || 
	new Date(reading.timestamp) > new Date(latest[cropName].timestamp)
      ) {
	latest[cropName] = reading;
      }
    }
  return Object.values(latest);
  }

  const getCropCondition = (reading, target_min, target_max, normal_water) => {
    const { sensor_status, soil_moisture, temperature, rainfall } = reading;
  
    if (sensor_status === "Offline" || sensor_status === "Faulty") {
      return {
        condition: "Sensor Problem",
        recommendedWater: "N/A",
        alert: "Check sensor",
        action: "Check sensor",
      };
    }

    if (
      sensor_status === "Online" &&
      (
        soil_moisture < 0 ||
        soil_moisture > 100 ||
        temperature < 0 ||
        temperature > 50 ||
        rainfall < 0 ||
        rainfall > 50
      )
    ) {
      const invalidFields = [];

      if (soil_moisture < 0 || soil_moisture > 100) {
        invalidFields.push("soil moisture");
      }

      if (temperature < 0 || temperature > 50) {
        invalidFields.push("temperature");
      }

      if (rainfall < 0 || rainfall > 50) {
        invalidFields.push("rainfall");
      }

      return {
        condition: "Invalid Data",
        recommendedWater: "N/A",
        alert: `Invalid ${invalidFields.join(", ")}`,
        action: "Check reading",
      };
    }
    if (soil_moisture < target_min) {
      return {
        condition: "Dry",
        recommendedWater: normal_water,
        alert: null,
        action: "Water crop",
      };
    }
    if (soil_moisture >= target_min && soil_moisture <= target_max) {
      return {
        condition: "Healthy",
        recommendedWater: 0,
        alert: null,
        action: "Monitor",
      };
    }
    if (soil_moisture > target_max) {
      return {
        condition: "Too Wet",
        recommendedWater: 0,
        alert: null,
        action: "Stop watering",
      };
    }

    return null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCropAdditionForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleSubmitCropCard = async (e) => {
    e.preventDefault();
    try {
      const isEditing = editingCropCard !== null;

      const url = isEditing ? `/api/crop-cards/${editingCropCard.id}` : "/api/add-crop-card";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
	method,
	headers: {"Content-Type": "application/json",},
	body: JSON.stringify({
	  crop_name: cropAdditionForm.crop_name,
	  location: cropAdditionForm.location,
	  target_min: Number(cropAdditionForm.target_min),
	  target_max: Number(cropAdditionForm.target_max),
	  normal_water: cropAdditionForm.normal_water,
	  notes: cropAdditionForm.notes,
	}),
      });
    const data = await response.json();
    if(!response.ok) {
      throw new Error(data.error || "Failed to save crop card");
    }

    console.log(isEditing ? "Updated crop card:" : "Created crop card:", data.record);

    alert(isEditing ? "Crop card updated successfully!" : "crop card added successfully!");

    setCropAdditionForm({
      crop_name: "",
      location: "",
      target_min: "",
      target_max: "",
      normal_water: "",
      notes: "",
    });
    setEditingCropCard(null);
    setShowCropAdditionForm(false);

    await loadCrops();
    } catch (error) {
      console.error("Error saving crop card:", error);
      alert("Failed to save crop card");
    }
  };

  const findMissingCrops = (readings, cropCards) => {
    const existingCropNames = new Set(cropCards.map((crop) => crop.crop_name?.trim().toLowerCase()));

    const missingCropNames = new Set();

    readings.forEach((reading) => { 
      const cropName = reading.crop_name?.trim();
      if (
	cropName &&
	!existingCropNames.has(cropName.toLowerCase())
      ) {
	missingCropNames.add(cropName);
      }
    });
    return [...missingCropNames];
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/crop-cards/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP error, status: ${res.status}`);
      await loadCrops();
    } catch (error) {
      console.error("Failed to delete crop card:", error);
    }
  }

  const handleViewHistory = (crop) => {
    console.log("selected crop:", crop);
    console.log("All readings:", cropReadings);

    const readings = getRecentReadingsForCrop(crop.crop_name);
    console.log("Recent readings:", readings);

    setSelectedCrop(crop);
    setSelectedCropReadings(readings);
    setShowCropHistory(true);
  };

  const loadCrops = async () => {
    const fetchCropData = async () => {
      try {
        const response = await fetch("/api/crop-cards");

        if (!response.ok) {
          throw new Error("Failed to load crop data");
        }

        const cropData = await response.json();

        const crops = Array.isArray(cropData) ? cropData : [];

        setCropCards(crops);
	console.log("Crop cards:", crops);
	return crops;

      } catch (error) {
        console.error("Failed to load crop data:", error);
        setCropCards([]);
        setValidationMessage(
          "Unable to load crop options. Please refresh and try again"
        );
	return[];
      }
    };

    const fetchCropReadings = async () => {
      try {
        const response = await(fetch("/api/crop-readings"));
	if (!response.ok) {
	  throw new Error("Failed to load crop readings");
	}
	const cropReadings = await response.json();

	const readings = Array.isArray(cropReadings) ? cropReadings : [];

	const sortedCropReadings = sortCropReadings(readings);
	setCropReadings(sortedCropReadings);
	console.log("sorted crop readings:", sortedCropReadings);

	const latestReadings = getLatestCropReadings(cropReadings);
	setLatestCropReadings(latestReadings);
	console.log("Latest crop readings:", latestReadings);
	return {readings, latestReadings,};

      } catch (error) {
	console.error("Failed to load crop readings:", error);
	setCropReadings([]);
	setLatestCropReadings([]);
	setValidation("Unable to load crop readings. PLease refresh and try again");
      }
    };

    const [{readings, latestReadings}, crops] = await Promise.all([
      fetchCropReadings(),
      fetchCropData(),
    ]);
    const recentReadings = getRecentReadingsPerCrop(readings);
    const farmStatus = getFarmStatus(crops, latestReadings);
    setFarmStatus(farmStatus);
  };

  const getFarmStatus = (cropCards, latestCropReadings) => {
    if (
      !Array.isArray(cropCards) ||
      !Array.isArray(latestCropReadings) ||
      cropCards.length ===0
    ) {
     return {
	status: "No data",
	message: "No crop data available",
	healthy: 0,
	attention: 0,
	critical: 0,
	total: 0,
      };
    }

    let healthy = 0;
    let attention = 0;
    let critical = 0;

    cropCards.forEach((crop) => {
      const reading = latestCropReadings.find(
	(r) => r.crop_name === crop.crop_name
      );

      if (!reading) {
	attention++;
	return;
      }

      const moisture = Number(reading.soil_moisture);
      const min = Number(crop.target_min);
      const max = Number(crop.target_max);

      if (
	!Number.isFinite(moisture) ||
	!Number.isFinite(min) ||
	!Number.isFinite(max)
      ) {
	attention++;
	return;
      }

      if (moisture >= min && moisture <= max) {
	healthy++;
	return;
      }

      const deviation = moisture < min ? min - moisture : moisture - max;

      if (deviation >= 20) {
	critical++;
      } else {
	attention++;
      }
    });

    const total = cropCards.length;

    let status;
    let message;

    if (critical > 0) {
      status = "critical";
      message = `${critical} crop${critical > 1 ? "s" : ""} require immediate attention`;
    } else if (attention > 0) {
      status = "Needs attention";
      message = `${attention} crop${attention > 1 ? "s" : ""} need attention`;
    } else {
      status = "Healthy";
      message = "All crops are within their target moisture range";
    }
    return {
      status,
      message,
      healthy,
      attention,
      critical,
      total,
    };
  };

  const handleEdit = (crop) => {
    setEditingCropCard(crop);

    setCropAdditionForm({
      crop_name: crop.crop_name,
      location: crop.location,
      target_min: crop.target_min,
      target_max: crop.target_max,
      normal_water: crop.normal_water,
      notes: crop.notes || "",
    });
    setShowCropAdditionForm(true);
  };

  useEffect(() => {
    loadCrops();
  }, []);

  const missingCrops = findMissingCrops(latestCropReadings, cropCards);

  return ( 
    <div>
      <style>{`
        .fl-simple {
          font-family: sans-serif;
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
          color: #222;
        }
        .fl-simple h1, .fl-simple h2, .fl-simple h3 { margin: 0 0 4px; }
        .fl-simple section { margin-bottom: 40px; }
        .fl-simple section > h2 {
          font-size: 14px;
          color: #666;
          border-bottom: 1px solid #ccc;
          padding-bottom: 6px;
          margin-bottom: 16px;
        }
        .fl-simple hr { border: none; border-top: 1px solid #ccc; margin: 16px 0; }
 
        .fl-simple .topbar {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 12px;
          border-bottom: 1px solid #ccc;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .fl-simple .stats { display: flex; gap: 20px; }
        .fl-simple .stat { font-size: 14px; }
        .fl-simple .stat span { display: block; }
        .fl-simple .stat .label { color: #666; font-size: 12px; }
 
        .fl-simple button {
          font-family: inherit;
          font-size: 14px;
          padding: 6px 12px;
          border: 1px solid #999;
          background: #fff;
          cursor: pointer;
        }
        .fl-simple button.primary { background: #333; color: #fff; border-color: #333; }
 
        .fl-simple .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 16px;
        }
 
        .fl-simple .card {
          border: 1px solid #999;
          padding: 12px;
        }
        .fl-simple .card h3 { font-size: 16px; }
        .fl-simple .card .location { color: #666; font-size: 13px; margin: 0 0 8px; }
        .fl-simple .card table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 8px; }
        .fl-simple .card table td { padding: 2px 4px 2px 0; }
        .fl-simple .card table td.label { color: #666; }
        .fl-simple .card .actions { display: flex; justify-content: space-between; border-top: 1px solid #ccc; padding-top: 8px; margin-top: 8px; }
        .fl-simple .card ul { margin: 4px 0; padding-left: 18px; font-size: 13px; }
 
        .fl-simple .form-field { margin-bottom: 10px; display: flex; flex-direction: column; gap: 2px; font-size: 14px; }
        .fl-simple .form-field label { font-weight: bold; font-size: 13px; }
        .fl-simple .form-field input, .fl-simple .form-field select, .fl-simple .form-field textarea {
          font-family: inherit; font-size: 14px; padding: 5px; border: 1px solid #999;
        }
        .fl-simple .error { color: #b00; font-size: 12px; }
 
        .fl-simple .history-row { border: 1px solid #999; padding: 10px; margin-bottom: 10px; }
        .fl-simple .history-row .top { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
 
        .fl-simple .toast { border: 1px solid #999; padding: 8px 12px; margin-bottom: 6px; font-size: 14px; }
      `}</style>
 
      <div className="fl-simple">
 
        <section>
          <h2>Dashboard</h2>
 
          <div className="topbar">
            <div>
              <h1>FieldLog</h1>
              <p style={{ margin: "2px 0 0", color: "#666", fontSize: "13px" }}>Crop sensor monitoring</p>
            </div>
            <div className="stats">
              <div className="stat"><span className="label">Farm status</span><span>{farmStatus.status}</span></div>
              <div className="stat"><span className="label">Crop cards</span><span>{cropCards.length}</span></div>
              <div className="stat"><span className="label">Last refresh</span><span>12m ago</span></div>
            </div>
            <div>
              <button onClick={() => {getLatestCropReadings(); loadCrops();}}>Refresh sensor data</button>
              <button className="primary" onClick={() => setShowCropAdditionForm(true)}>Add crop card</button>
            </div>
          </div>
 
          <div className="card">
            <div>
              {cropCards.map((crop) => {
		const latestReadings = latestCropReadings.find(
		  (reading) => reading.crop_name === crop.crop_name
		);

		const status = latestReadings ? 
			       getCropCondition(
			         latestReadings, 
			         crop.target_min,
				 crop.target_max,
				 crop.normal_water
			       ) : null;
	        return (
		<div className="card" key={crop.id}>
		  <h3>{crop.crop_name}</h3>
		  <p className="location">{crop.location}</p>
		  <table>
		    <tbody>
		      <tr>
			<td className="label">Target moisturses</td>
			<td>{crop.target_min}-{crop.target_max}%</td>
		      </tr>
		      <tr>
			<td className="label">Normal Water</td>
			<td>{crop.normal_water} ml/day</td>
		      </tr>
		      <tr>
			<td className="label">Latest Moisutre</td>
			<td>
			  {latestReadings ? `${latestReadings.soil_moisture}%` : "No reading"}
			</td>
		      </tr>
		      <tr>
			<td className="label">Condition</td>
			<td>{status ? status.condition : "No reading"}</td>
		      </tr>
		      <tr>
			<td className="label">Recommended Water</td>
			<td>{status ? status.recommendedWater === "N/A" ? "N/A" : `${status.recommendedWater} ml/day` : "N/A"}</td>
		      </tr>
		      <tr>
			<td className="label">Action</td>
			<td>{status ? status.action : "No Reading"}</td>
		      </tr>
		      <tr>
			<td className="label">Notes</td>
			<td>{crop.notes || "no notes"}</td>
		      </tr>
		    </tbody>
		  </table>
		  <div className="actions">
		    <button onClick={() => handleViewHistory(crop)}>View sensor history</button>
		    <span>
		      <button onClick={() => handleEdit(crop)}>Edit</button>
		      <button onClick={() => handleDelete(crop.id)}>Delete</button>
		    </span>
		  </div>
		</div>
		);
	      })}  
            </div>
           </div> 
        </section>
 
        <section>
          <h2>Sensor history (five readings, newest first)</h2>

	  {Object.entries(
	    getRecentReadingsPerCrop(cropReadings, cropCards)
	  ).map(([cropName, readings]) => (
	    <div className="sensor-history-card" key={cropName}>
	      <h3>{cropName}</h3>
	      <table>
		<thead>
		  <tr>
		    <th>Timestamp</th>
		    <th>Soil moisture</th>
		    <th>Condition</th>
		  </tr>
		</thead>
		<tbody>
		  {readings.map((reading, index) => (
		    <tr key={`${cropName}-${reading.timestamp}-${index}`}>
		      <td>{reading.timestamp}</td>
		      <td>{reading.soil_moisture}%</td>
		      <td>{reading.notes}</td>
		    </tr>
		  ))}
		</tbody>
	      </table>
	    </div>
	  ))}
	</section> 
{showCropAdditionForm && (
<div className="popup-overlay">
    <div className="popup">
      <button
        className="popup-close"
        onClick={() => setShowCropAdditionForm(false)}
      >
        ×
      </button>

      <h2>{editingCropCard ? "Edit crop card" : "Add crop card"}</h2>

      <form onSubmit={handleSubmitCropCard}>
        <label>
          Crop name
          <select
            name="crop_name"
            value={cropAdditionForm.crop_name}
            onChange={handleChange}
            required
	    disabled={editingCropCard != null}
          >
	<option value="">Select a crop</option>
	{editingCropCard &&
	  !missingCrops.includes(editingCropCard.crop_name) && (
	    <option value={editingCropCard.crop_name}>
	      {editingCropCard.crop_name}
	    </option>
	  )}

	{missingCrops.map((cropName) => (
	  <option key={cropName} value={cropName}>
	    {cropName}
	  </option>
	))}
        </select>
        </label>

        <label>
          Location
          <input
            type="text"
	    name="location"
            value={cropAdditionForm.location}
            onChange={handleChange}
	    placeholder="Enter crop location"
            required
          />
        </label>

        <label>
          Minimum moisture
          <input
            type="number"
	    name="target_min"
            value={cropAdditionForm.target_min}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Maximum moisture
          <input
            type="number"
	    name="target_max"
            value={cropAdditionForm.target_max}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Normal water (ml/day)
          <input
            type="number"
	    name="normal_water"
            value={cropAdditionForm.normal_water}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Notes
          <textarea
            value={cropAdditionForm.notes}
	    name="notes"
            onChange={handleChange}
          />
        </label>

        <div className="popup-actions">
          <button
            type="button"
            onClick={() => setShowCropAdditionForm(false)}
          >
            Cancel
          </button>

          <button type="submit" className="primary">
            {editingCropCard ? "Save changes" : "Add crop card"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
{showCropHistory && selectedCrop && (
  <div className="popup-overlay">
    <div className="popup">

      <button
        className="popup-close"
        onClick={() => {
          setShowCropHistory(false);
          setSelectedCrop(null);
        }}
      >
        ×
      </button>

      <h2>
        {selectedCrop.crop_name} Sensor History
      </h2>

      <p>
        Last 5 sensor readings
      </p>

      <table>
        <thead>
          <tr>
            <th>Date / Time</th>
            <th>Moisture</th>
          </tr>
        </thead>

        <tbody>
          {getRecentReadingsForCrop(selectedCrop.crop_name).length > 0 ? (
            getRecentReadingsForCrop(selectedCrop.crop_name).map(
              (reading) => (
                <tr key={reading.id}>
                  <td>{reading.timestamp}</td>
                  <td>{reading.soil_moisture}%</td>
                </tr>
              )
            )
          ) : (
            <tr>
              <td colSpan="2">
                No sensor readings available
              </td>
            </tr>
          )}
        </tbody>
      </table>

    </div>
  </div>
)}


      </div>
    </div>
  );
}

export default App;
