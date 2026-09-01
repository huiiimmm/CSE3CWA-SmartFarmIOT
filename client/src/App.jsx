import { useState, useEffect } from 'react'
import './App.css'

function App() {

  const [allCrops, setAllCrops] = useState([]);
  const [cropName, setCropName] = useState([]);
  const [cropLocation, setCropLocation] = useState([]);
 
  const [cropReadings, setCropReadings] = useState([]);
  const [latestCropReading, setLatestCropReading] = useState([]);

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

  const getLatestCropReading = (readings) => {
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

  useEffect(() => {
    const fetchCropData = async () => {
      try {
        const response = await fetch("/api/crop-cards");

        if (!response.ok) {
          throw new Error("Failed to load crop data");
        }

        const cropData = await response.json();

        setAllCrops(Array.isArray(cropData) ? cropData : []);
	console.log(cropData);
      } catch (error) {
        console.error("Failed to load crop data:", error);
        setAllCrops([]);
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

	const latestReadings = getLatestCropReading(cropReadings);
	setLatestCropReading(latestReadings);

      } catch (error) {
	console.error("Failed to load crop readings:", error);
	setCropReadings([]);
	setValidation("Unable to load crop readings. PLease refresh and try again");
      }
    };

    fetchCropReadings();
    fetchCropData();
  }, []);

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
              <div className="stat"><span className="label">Crop cards</span><span>4</span></div>
              <div className="stat"><span className="label">Last refresh</span><span>12m ago</span></div>
            </div>
            <div>
              <button>Refresh sensor data</button>
              <button className="primary">Add crop card</button>
            </div>
          </div>
 
          <p><em>Sensor feed unavailable — showing the last known readings.</em> <button>Try again</button></p>
 
          <div className="card">
            <div>
              {allCrops.map((crop) => (
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
			<td className="label">Notes</td>
			<td>{crop.notes || "no notes"}</td>
		      </tr>
		    </tbody>
		  </table>
		  <div className="actions">
		    <button>View sensor history</button>
		    <span>
		      <button>Edit</button>
		      <button>Delete</button>
		    </span>
		  </div>
		</div>
	      ))}    
            </div>
           </div>
        </section>
 
        <section>
          <h2>Sensor history (five readings, newest first)</h2>
         </section> 
      </div>
    </div>
  )
}

export default App
