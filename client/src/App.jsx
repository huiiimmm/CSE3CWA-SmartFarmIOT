import { useState, useEffect } from 'react'
import './App.css'

function App() {

  const [cropCards, setCropCards] = useState([]);
  const [cropReadings, setCropReadings] = useState([]);
  const [latestCropReadings, setLatestCropReadings] = useState([]);

  const [showCropAdditionForm, setShowCropAdditionForm] = useState(false);

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
  
  const addCropCard = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/add-crop-card", {
	method: "POST",
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

    console.log("Saved crop card:", data.record);

    alert("Crop card saved successfully!");

    setCropAdditionForm({
      crop_name: "",
      location: "",
      target_min: "",
      target_max: "",
      normal_water: "",
      notes: "",
    });
    loadCrops();
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

  const loadCrops = async () => {
    const fetchCropData = async () => {
      try {
        const response = await fetch("/api/crop-cards");

        if (!response.ok) {
          throw new Error("Failed to load crop data");
        }

        const cropData = await response.json();

        setCropCards(Array.isArray(cropData) ? cropData : []);
	console.log(cropData);
      } catch (error) {
        console.error("Failed to load crop data:", error);
        setCropCards([]);
        setValidationMessage(
          "Unable to load crop options. Please refresh and try again"
        );
      }
    };

    const fetchCropReadings = async () => {
      try {
        const response = await(fetch("/api/crop-readings"));
	if (!response.ok) {
	  throw new Error("Failed to load crop readings");
	}
	const cropReadings = await response.json();
	const sortedCropReadings =  sortCropReadings(Array.isArray(cropReadings) ? cropReadings : []);
	setCropReadings(sortedCropReadings);
	console.log("sorted crop readings:", sortedCropReadings);

	const latestReadings = getLatestCropReadings(cropReadings);
	setLatestCropReadings(latestReadings);
	console.log("Latest crop readings:", latestReadings);

      } catch (error) {
	console.error("Failed to load crop readings:", error);
	setCropReadings([]);
	setLatestCropReadings([]);
	setValidation("Unable to load crop readings. PLease refresh and try again");
      }
    };

    await Promise.all([
      fetchCropReadings(),
      fetchCropData(),
    ]);
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
              <div className="stat"><span className="label">Farm status</span><span>Needs attention</span></div>
              <div className="stat"><span className="label">Crop cards</span><span>{cropCards.length}</span></div>
              <div className="stat"><span className="label">Last refresh</span><span>12m ago</span></div>
            </div>
            <div>
              <button>Refresh sensor data</button>
              <button className="primary" onClick={() => setShowCropAdditionForm(true)}>Add crop card</button>
            </div>
          </div>
 
          <p><em>Sensor feed unavailable — showing the last known readings.</em> <button>Try again</button></p>
 
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
		    <button>View sensor history</button>
		    <span>
		      <button>Edit</button>
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

      <h2>Add Crop Card</h2>

      <form onSubmit={addCropCard}>
        <label>
          Crop name
          <select
            name="crop_name"
            value={cropAdditionForm.crop_name}
            onChange={handleChange}
            required
          >
	<option value="">Select a crop</option>
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

          <button type="submit" className="primary" onClick={addCropCard}>
            Save Crop
          </button>
        </div>
      </form>
    </div>
  </div>
)}


      </div>
    </div>
  );
}

export default App;
