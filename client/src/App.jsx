import { useState, useEffect, useCallback } from 'react'
import './App.css'

function App() {

  const [cropCards, setCropCards] = useState([]);
  const [cropReadings, setCropReadings] = useState([]);
  const [latestCropReadings, setLatestCropReadings] = useState([]);
  const [editingCropCard, setEditingCropCard] = useState(null);
  const [farmStatus, setFarmStatus] = useState({
    status: "No data",
    message: "No crop data available",
    healthy: 0,
    attention: 0,
    critical: 0,
    total: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

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
  const [formError, setFormError] = useState("");

  const sortCropReadings = (readings) => {
    return [...readings].sort((a, b) => {
      const cropCompare = a.crop_name.localeCompare(b.crop_name);

      if (cropCompare !== 0) {
        return cropCompare;
      }
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  };

  const getRecentReadingsPerCrop = (readings, cropCards) => {
    if (!Array.isArray(readings) || !Array.isArray(cropCards)) {
      return {};
    }

    const sortedReadings = sortCropReadings(readings);
    const grouped = {};

    for (const crop of cropCards) {
      const cropName = crop.crop_name;

      const recent = sortedReadings.filter(
        (reading) => String(reading.crop_name).trim().toLowerCase() ===
                     String(cropName).trim().toLowerCase()
      ).slice(0, 5);
      grouped[cropName] = recent;
    }
    return grouped;
  };

  const getRecentReadingsForCrop = (cropName, readings = cropReadings) => {
    return readings
      .filter((reading) => reading.crop_name === cropName)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5);
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
  };

  const getCropCondition = (reading, target_min, target_max, normal_water) => {
    if (!reading) {
      return {
        condition: "No Reading",
        recommendedWater: "N/A",
        alert: null,
        action: "Awaiting sensor data",
      };
    }

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

    const moisture = Number(soil_moisture);
    const min = Number(target_min);
    const max = Number(target_max);

    if (!Number.isFinite(moisture) || !Number.isFinite(min) || !Number.isFinite(max)) {
      return {
        condition: "Unknown",
        recommendedWater: "N/A",
        alert: "Missing target range",
        action: "Check crop card",
      };
    }

    if (moisture < min) {
      return {
        condition: "Dry",
        recommendedWater: normal_water,
        alert: null,
        action: "Water crop",
      };
    }
    if (moisture <= max) {
      return {
        condition: "Healthy",
        recommendedWater: 0,
        alert: null,
        action: "Monitor",
      };
    }
    return {
      condition: "Too Wet",
      recommendedWater: 0,
      alert: null,
      action: "Stop watering",
    };
  };

  const conditionClass = (condition) => {
    switch (condition) {
      case "Healthy":
        return "badge badge-healthy";
      case "Dry":
        return "badge badge-dry";
      case "Too Wet":
        return "badge badge-wet";
      case "Sensor Problem":
      case "Invalid Data":
        return "badge badge-critical";
      default:
        return "badge badge-unknown";
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCropAdditionForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (formError) setFormError("");
  };

  const validateCropForm = (form) => {
    if (!form.crop_name.trim()) return "Choose a crop.";
    if (!form.location.trim()) return "Location is required.";

    const min = Number(form.target_min);
    const max = Number(form.target_max);
    const water = Number(form.normal_water);

    if (form.target_min === "" || !Number.isFinite(min)) return "Minimum moisture must be a number.";
    if (form.target_max === "" || !Number.isFinite(max)) return "Maximum moisture must be a number.";
    if (min < 0 || min > 100 || max < 0 || max > 100) return "Moisture targets must be between 0 and 100%.";
    if (min >= max) return "Minimum moisture must be lower than maximum moisture.";
    if (form.normal_water === "" || !Number.isFinite(water) || water < 0) return "Normal water must be a non-negative number.";

    return "";
  };

  const handleSubmitCropCard = async (e) => {
    e.preventDefault();

    const error = validateCropForm(cropAdditionForm);
    if (error) {
      setFormError(error);
      return;
    }

    setIsSaving(true);
    try {
      const isEditing = editingCropCard !== null;

      const url = isEditing ? `/api/crop-cards/${editingCropCard.id}` : "/api/add-crop-card";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crop_name: cropAdditionForm.crop_name,
          location: cropAdditionForm.location,
          target_min: Number(cropAdditionForm.target_min),
          target_max: Number(cropAdditionForm.target_max),
          normal_water: Number(cropAdditionForm.normal_water),
          notes: cropAdditionForm.notes,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to save crop card");
      }

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
      setFormError("");

      await loadCrops();
    } catch (error) {
      console.error("Error saving crop card:", error);
      setFormError(error.message || "Failed to save crop card. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const findMissingCrops = (readings, cropCards) => {
    const existingCropNames = new Set(
      cropCards.map((crop) => crop.crop_name?.trim().toLowerCase())
    );

    const missingCropNames = new Set();

    readings.forEach((reading) => {
      const cropName = reading.crop_name?.trim();
      if (cropName && !existingCropNames.has(cropName.toLowerCase())) {
        missingCropNames.add(cropName);
      }
    });
    return [...missingCropNames];
  };

  const handleDelete = async (crop) => {
    const confirmed = window.confirm(`Remove the crop card for "${crop.crop_name}"? This can't be undone.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/crop-cards/${crop.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP error, status: ${res.status}`);
      await loadCrops();
    } catch (error) {
      console.error("Failed to delete crop card:", error);
      setValidationMessage("Couldn't delete that crop card. Please try again.");
    }
  };

  const handleViewHistory = (crop) => {
    const readings = getRecentReadingsForCrop(crop.crop_name);
    setSelectedCrop(crop);
    setSelectedCropReadings(readings);
    setShowCropHistory(true);
  };

  const getFarmStatus = (cropCards, latestCropReadings) => {
    if (!Array.isArray(cropCards) || cropCards.length === 0) {
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
      const reading = (latestCropReadings || []).find(
        (r) => r.crop_name === crop.crop_name
      );

      if (!reading) {
        attention++;
        return;
      }

      const moisture = Number(reading.soil_moisture);
      const min = Number(crop.target_min);
      const max = Number(crop.target_max);

      if (!Number.isFinite(moisture) || !Number.isFinite(min) || !Number.isFinite(max)) {
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
      status = "Critical";
      message = `${critical} crop${critical > 1 ? "s" : ""} require immediate attention`;
    } else if (attention > 0) {
      status = "Needs attention";
      message = `${attention} crop${attention > 1 ? "s" : ""} need attention`;
    } else {
      status = "Healthy";
      message = "All crops are within their target moisture range";
    }
    return { status, message, healthy, attention, critical, total };
  };

  const loadCrops = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);

    const fetchCropData = async () => {
      try {
        const response = await fetch("/api/crop-cards");
        if (!response.ok) throw new Error("Failed to load crop data");

        const cropData = await response.json();
        const crops = Array.isArray(cropData) ? cropData : [];
        setCropCards(crops);
        return crops;
      } catch (error) {
        console.error("Failed to load crop data:", error);
        setCropCards([]);
        setValidationMessage("Unable to load crop options. Please refresh and try again.");
        return [];
      }
    };

    const fetchCropReadings = async () => {
      try {
        const response = await fetch("/api/crop-readings");
        if (!response.ok) throw new Error("Failed to load crop readings");

        const rawReadings = await response.json();
        const readings = Array.isArray(rawReadings) ? rawReadings : [];

        const sortedCropReadings = sortCropReadings(readings);
        setCropReadings(sortedCropReadings);

        const latestReadings = getLatestCropReadings(readings);
        setLatestCropReadings(latestReadings);

        return { readings, latestReadings };
      } catch (error) {
        console.error("Failed to load crop readings:", error);
        setCropReadings([]);
        setLatestCropReadings([]);
        setValidationMessage("Unable to load crop readings. Please refresh and try again.");
        return { readings: [], latestReadings: [] };
      }
    };

    const [{ latestReadings }, crops] = await Promise.all([
      fetchCropReadings(),
      fetchCropData(),
    ]);

    setFarmStatus(getFarmStatus(crops, latestReadings));
    setLastUpdated(new Date());
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  const handleEdit = (crop) => {
    setEditingCropCard(crop);
    setFormError("");
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

  const closeCropForm = () => {
    setShowCropAdditionForm(false);
    setEditingCropCard(null);
    setFormError("");
    setCropAdditionForm({
      crop_name: "",
      location: "",
      target_min: "",
      target_max: "",
      normal_water: "",
      notes: "",
    });
  };

  const closeHistory = () => {
    setShowCropHistory(false);
    setSelectedCrop(null);
    setSelectedCropReadings([]);
  };

  useEffect(() => {
    loadCrops();
  }, [loadCrops]);

  // Close whichever popup is open on Escape for keyboard accessibility.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (showCropAdditionForm) closeCropForm();
      if (showCropHistory) closeHistory();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCropAdditionForm, showCropHistory]);

  const missingCrops = findMissingCrops(latestCropReadings, cropCards);
  const readingsByCrop = getRecentReadingsPerCrop(cropReadings, cropCards);

  const formatTimestamp = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  const formatLastUpdated = (date) => {
    if (!date) return "Never";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="fl-simple">
      {validationMessage && (
        <div className="toast" role="alert">
          <span>{validationMessage}</span>
          <button onClick={() => setValidationMessage("")}>Dismiss</button>
        </div>
      )}

      <section>
        <h2>Dashboard</h2>

        <div className="topbar">
          <div>
            <h1><span className="brand-mark">Field</span>Log</h1>
            <p className="subtitle">Crop sensor monitoring</p>
          </div>
          <div className="stats">
            <div className={`stat status-${String(farmStatus.status).replace(/\s+/g, "-")}`}>
              <span className="label">Farm status</span>
              <span>{farmStatus.status}</span>
            </div>
            <div className="stat">
              <span className="label">Crop cards</span>
              <span>{cropCards.length}</span>
            </div>
            <div className="stat">
              <span className="label">Last refresh</span>
              <span>{formatLastUpdated(lastUpdated)}</span>
            </div>
          </div>
          <div className="topbar-actions">
            <button onClick={() => loadCrops(true)} disabled={isRefreshing}>
              {isRefreshing ? "Refreshing…" : "Refresh sensor data"}
            </button>
            <button className="primary" onClick={() => setShowCropAdditionForm(true)}>
              Add crop card
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid">
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        ) : cropCards.length === 0 ? (
          <div className="empty-state">
            No crop cards yet. Add one to start tracking sensor readings.
          </div>
        ) : (
          <div className="grid">
            {cropCards.map((crop) => {
              const latestReading = latestCropReadings.find(
                (reading) => reading.crop_name === crop.crop_name
              );

              const status = getCropCondition(
                latestReading,
                crop.target_min,
                crop.target_max,
                crop.normal_water
              );

              return (
                <div className="crop-card" key={crop.id ?? crop.crop_name}>
                  <div className="crop-card-head">
                    <h3>{crop.crop_name}</h3>
                    <span className={conditionClass(status.condition)}>{status.condition}</span>
                  </div>
                  <p className="location">{crop.location}</p>
                  <table>
                    <tbody>
                      <tr>
                        <td className="label">Target moisture</td>
                        <td className="value">{crop.target_min}–{crop.target_max}%</td>
                      </tr>
                      <tr>
                        <td className="label">Normal water</td>
                        <td className="value">{crop.normal_water} ml/day</td>
                      </tr>
                      <tr>
                        <td className="label">Latest moisture</td>
                        <td className="value">
                          {latestReading ? `${latestReading.soil_moisture}%` : "No reading"}
                        </td>
                      </tr>
                      <tr>
                        <td className="label">Recommended water</td>
                        <td className="value">
                          {status.recommendedWater === "N/A" || status.recommendedWater === undefined
                            ? "N/A"
                            : `${status.recommendedWater} ml/day`}
                        </td>
                      </tr>
                      <tr>
                        <td className="label">Action</td>
                        <td className="value">{status.action}</td>
                      </tr>
                      {crop.notes && (
                        <tr>
                          <td className="label">Notes</td>
                          <td className="value">{crop.notes}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <div className="actions">
                    <button className="small" onClick={() => handleViewHistory(crop)}>
                      View history
                    </button>
                    <span className="action-group">
                      <button className="small" onClick={() => handleEdit(crop)}>Edit</button>
                      <button className="small danger" onClick={() => handleDelete(crop)}>Delete</button>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2>Sensor history (five readings, newest first)</h2>

        {Object.keys(readingsByCrop).length === 0 ? (
          <div className="empty-state">No sensor readings yet.</div>
        ) : (
          Object.entries(readingsByCrop).map(([cropName, readings]) => (
            <div className="sensor-history-card" key={cropName}>
              <h3>{cropName}</h3>
              {readings.length === 0 ? (
                <p style={{ color: "#6b7a6b", fontSize: "13px", margin: 0 }}>No readings recorded.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Soil moisture</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readings.map((reading, index) => (
                      <tr key={`${cropName}-${reading.timestamp}-${index}`}>
                        <td>{formatTimestamp(reading.timestamp)}</td>
                        <td>{reading.soil_moisture}%</td>
                        <td>{reading.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))
        )}
      </section>

      {showCropAdditionForm && (
        <div className="popup-overlay" onClick={closeCropForm}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <button className="popup-close" onClick={closeCropForm} aria-label="Close">
              ×
            </button>

            <h2>{editingCropCard ? "Edit crop card" : "Add crop card"}</h2>

            {formError && <div className="form-error" role="alert">{formError}</div>}

            <form onSubmit={handleSubmitCropCard}>
              <div className="form-field">
                <label htmlFor="crop_name">Crop name</label>
                <select
                  id="crop_name"
                  name="crop_name"
                  value={cropAdditionForm.crop_name}
                  onChange={handleChange}
                  required
                  disabled={editingCropCard != null}
                >
                  <option value="">Select a crop</option>
                  {editingCropCard && !missingCrops.includes(editingCropCard.crop_name) && (
                    <option value={editingCropCard.crop_name}>{editingCropCard.crop_name}</option>
                  )}
                  {missingCrops.map((cropName) => (
                    <option key={cropName} value={cropName}>{cropName}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="location">Location</label>
                <input
                  id="location"
                  type="text"
                  name="location"
                  value={cropAdditionForm.location}
                  onChange={handleChange}
                  placeholder="Enter crop location"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="target_min">Minimum moisture (%)</label>
                  <input
                    id="target_min"
                    type="number"
                    name="target_min"
                    min="0"
                    max="100"
                    value={cropAdditionForm.target_min}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="target_max">Maximum moisture (%)</label>
                  <input
                    id="target_max"
                    type="number"
                    name="target_max"
                    min="0"
                    max="100"
                    value={cropAdditionForm.target_max}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="normal_water">Normal water (ml/day)</label>
                <input
                  id="normal_water"
                  type="number"
                  name="normal_water"
                  min="0"
                  value={cropAdditionForm.normal_water}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={cropAdditionForm.notes}
                  onChange={handleChange}
                />
              </div>

              <div className="popup-actions">
                <button type="button" onClick={closeCropForm}>Cancel</button>
                <button type="submit" className="primary" disabled={isSaving}>
                  {isSaving ? "Saving…" : editingCropCard ? "Save changes" : "Add crop card"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCropHistory && selectedCrop && (
        <div className="popup-overlay" onClick={closeHistory}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <button className="popup-close" onClick={closeHistory} aria-label="Close">
              ×
            </button>

            <h2>{selectedCrop.crop_name} sensor history</h2>
            <p style={{ color: "#6b7a6b", fontSize: "13px", marginTop: 0 }}>
              Last 5 sensor readings
            </p>

            <table>
              <thead>
                <tr>
                  <th>Date / time</th>
                  <th>Moisture</th>
                </tr>
              </thead>
              <tbody>
                {selectedCropReadings.length > 0 ? (
                  selectedCropReadings.map((reading, index) => (
                    <tr key={reading.id ?? `${reading.timestamp}-${index}`}>
                      <td>{formatTimestamp(reading.timestamp)}</td>
                      <td>{reading.soil_moisture}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2">No sensor readings available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
