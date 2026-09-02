--- Setup ---
After downloading the zip, proceed to start the 2 front and backend servers

backendend server startup goes as follows:

1. navigate to SmartFarm/server
2. input "npm run dev" to start the backend server

Express routing also runs with this setup. 

frontend server startup goes as follows:

1. navigate to SmartFarm/client
2. input "npm run dev" to start the frontend server

--- URLs ---

backend URL: http://localhost:3000
frontend URL: http://localhost:5173

--- Database ---

Database's are automatically initialised upon starting the backend server. 
ALl changes can be done simply through the frontend UI

--- API ---

API routing goes as follows

1. frontend sends requests through vite (located in client/vite.config.js), which strips "api" from request url's
2. vite then forwards the request to the express backend (located in server/src/server.js), which handles the request
3. The express request then communicates with the database to make the changes. 
4. The change then navigates backwards through the communication steps to make the necessary change to the frontend. 

--- AI tools used ---

chatGPT, ClaudeAI

sensor reading prompt: 

"sensor reading json rules" generate 5 varied sensor readings for each following crop, Tomato, Lettuce, Wheat, Maize.

AI tended to always include "/api/" for database methods, however, seeing as I was stripping the "/api/" from requests through vite, I didn't include in my database methods.  
In an attempt to keep everything in one file, AI included css styles in the jsx app when I was trying to improve the visuals. So I refactored and seperated the two into seperate .jsx and .css files

--- timestamp ordering ---

Timestamp ordering was achieved by filtering through specific crops (via crop_name matching) and directly comparing dates (via crop-a.date - cropb.date)
The function (sortCropReadings) then returned the list of crops in order of recent -> latest date. 
getRecentReadingsForCrop and getRecentReadingsPerCrop then ensured that there were no more than 5 sensor readings for specific crops and all crops respectively.

--- Project Limitation ---

A key limitation is the simplicity of the sensor readings. There are no live video feeds which can be used to observe the crops without having to be on the site itself, 
and the readings themselves don't consider the true plant health, but only potential plant health. Issues, such as discolouration from disease, cannot be observed through this dashboard. 
