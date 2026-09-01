import { useState } from 'react'
import './App.css'

function App() {
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
 
          <div className="grid">
 
            <div className="card">
              <h3>Tomato</h3>
              <p className="location">Greenhouse 2, Bay 3</p>
              <table>
                <tbody>
                  <tr><td className="label">Target moisture</td><td>55–75%</td></tr>
                  <tr><td className="label">Normal water</td><td>2.5 L/day</td></tr>
                  <tr><td className="label">Soil moisture</td><td>64%</td></tr>
                  <tr><td className="label">Temp</td><td>24.1°C</td></tr>
                  <tr><td className="label">Humidity</td><td>58%</td></tr>
                  <tr><td className="label">Light</td><td>610 lx</td></tr>
                  <tr><td className="label">Condition</td><td>Optimal</td></tr>
                  <tr><td className="label">Recommended water</td><td>2.5 L/day</td></tr>
                  <tr><td className="label">Action</td><td>Maintain current schedule</td></tr>
                </tbody>
              </table>
              <div className="actions">
                <button>View sensor history</button>
                <span><button>Edit</button> <button>Delete</button></span>
              </div>
            </div>
 
            <div className="card">
              <h3>Lettuce</h3>
              <p className="location">Field 4, Row 12</p>
              <table>
                <tbody>
                  <tr><td className="label">Target moisture</td><td>60–80%</td></tr>
                  <tr><td className="label">Normal water</td><td>1.2 L/day</td></tr>
                  <tr><td className="label">Soil moisture</td><td>48%</td></tr>
                  <tr><td className="label">Temp</td><td>31.4°C</td></tr>
                  <tr><td className="label">Humidity</td><td>29%</td></tr>
                  <tr><td className="label">Light</td><td>780 lx</td></tr>
                  <tr><td className="label">Condition</td><td>Too dry</td></tr>
                  <tr><td className="label">Recommended water</td><td>1.5 L/day</td></tr>
                  <tr><td className="label">Action</td><td>Water today, above the normal amount</td></tr>
                </tbody>
              </table>
              <ul>
                <li>Soil moisture is below the target range</li>
                <li>Low humidity may speed up water loss</li>
              </ul>
              <div className="actions">
                <button>View sensor history</button>
                <span><button>Edit</button> <button>Delete</button></span>
              </div>
            </div>
 
            <div className="card">
              <h3>Capsicum</h3>
              <p className="location">Greenhouse 1, Bay 1</p>
              <table>
                <tbody>
                  <tr><td className="label">Target moisture</td><td>50–70%</td></tr>
                  <tr><td className="label">Normal water</td><td>2.0 L/day</td></tr>
                  <tr><td className="label">Soil moisture</td><td>83%</td></tr>
                  <tr><td className="label">Temp</td><td>19.8°C</td></tr>
                  <tr><td className="label">Humidity</td><td>71%</td></tr>
                  <tr><td className="label">Light</td><td>340 lx</td></tr>
                  <tr><td className="label">Condition</td><td>Too wet</td></tr>
                  <tr><td className="label">Recommended water</td><td>1.4 L/day</td></tr>
                  <tr><td className="label">Action</td><td>Hold off watering, check drainage</td></tr>
                </tbody>
 	             </table>
              <ul>
                <li>Soil moisture is above the target range</li>
              </ul>
              <div className="actions">
                <button>View sensor history</button>
                <span><button>Edit</button> <button>Delete</button></span>
              </div>
            </div>
          </div>
        </section>
 
        <section>
          <h2>Sensor history (five readings, newest first)</h2>
          <p style={{ color: "#666", fontSize: "13px" }}>Lettuce — Field 4, Row 12</p>
 
          <div className="history-row">
            <div className="top"><span>Today, 14:20</span><span>Too dry</span></div>
            <table>
              <tbody>
                <tr><td className="label">Soil moisture</td><td>48%</td></tr>
                <tr><td className="label">Temp</td><td>31.4°C</td></tr>
                <tr><td className="label">Humidity</td><td>29%</td></tr>
                <tr><td className="label">Light</td><td>780 lx</td></tr>
              </tbody>
            </table>
            <p>Water today, above the normal amount — 1.5 L/day recommended</p>
            <ul>
              <li>Soil moisture is below the target range</li>
              <li>Low humidity may speed up water loss</li>
            </ul>
          </div>
 
          <div className="history-row">
            <div className="top"><span>Today, 11:20</span><span>Optimal</span></div>
            <table>
              <tbody>
                <tr><td className="label">Soil moisture</td><td>66%</td></tr>
                <tr><td className="label">Temp</td><td>26.0°C</td></tr>
                <tr><td className="label">Humidity</td><td>44%</td></tr>
                <tr><td className="label">Light</td><td>690 lx</td></tr>
              </tbody>
            </table>
            <p>Maintain current schedule — 1.2 L/day recommended</p>
          </div>
 
          <div className="history-row">
            <div className="top"><span>Today, 08:20</span><span>Optimal</span></div>
            <table>
              <tbody>
                <tr><td className="label">Soil moisture</td><td>70%</td></tr>
                <tr><td className="label">Temp</td><td>21.3°C</td></tr>
                <tr><td className="label">Humidity</td><td>51%</td></tr>
                <tr><td className="label">Light</td><td>210 lx</td></tr>
              </tbody>
            </table>
            <p>Maintain current schedule — 1.2 L/day recommended</p>
          </div>
 
          <div className="history-row">
            <div className="top"><span>Yesterday, 23:20</span><span>Too wet</span></div>
            <table>
              <tbody>
                <tr><td className="label">Soil moisture</td><td>84%</td></tr>
                <tr><td className="label">Temp</td><td>17.6°C</td></tr>
                <tr><td className="label">Humidity</td><td>62%</td></tr>
                <tr><td className="label">Light</td><td>95 lx</td></tr>
              </tbody>
            </table>
            <p>Hold off watering, check drainage — 0.8 L/day recommended</p>
            <ul>
              <li>Soil moisture is above the target range</li>
              <li>Light levels are low for healthy growth</li>
            </ul>
          </div>
 
          <div className="history-row">
            <div className="top"><span>Yesterday, 20:20</span><span>Optimal</span></div>
            <table>
              <tbody>
                <tr><td className="label">Soil moisture</td><td>67%</td></tr>
                <tr><td className="label">Temp</td><td>22.1°C</td></tr>
                <tr><td className="label">Humidity</td><td>55%</td></tr>
                <tr><td className="label">Light</td><td>140 lx</td></tr>
              </tbody>
            </table>
            <p>Maintain current schedule — 1.2 L/day recommended</p>
          </div>
 
          <button className="primary">Close</button>
        </section> 
      </div>
    </div>
  )
}

export default App
