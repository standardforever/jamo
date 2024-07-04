const express = require('express');
const axios = require('axios');
const requestIp = require('request-ip');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(requestIp.mw());

app.get('/api/hello', async (req, res) => {
    const visitorName = req.query.visitor_name || 'Guest';
    let clientIp = req.clientIp;

    try {
        // If it's a local IP, fetch the public IP
        if (clientIp === '::1' || clientIp === '127.0.0.1') {
            const publicIpResponse = await axios.get('https://api.ipify.org?format=json');
            clientIp = publicIpResponse.data.ip;
        }

        console.log(`Calling ipapi.co: https://ipapi.co/${clientIp}/json/`);
        const locationResponse = await axios.get(`https://ipapi.co/${clientIp}/json/`);
        const location = locationResponse.data.city;

        if (!location) {
            throw new Error('Location not found');
        }

        console.log(`Calling OpenWeatherMap: http://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`);
        const weatherResponse = await axios.get(`http://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`);
        const temperature = weatherResponse.data.main ? Math.round(weatherResponse.data.main.temp) : null;

        if (temperature === null) {
            throw new Error('Weather data not available');
        }

        res.json({
            client_ip: clientIp,
            location: location,
            greeting: `Hello, ${visitorName}! The temperature is ${temperature} degrees Celsius in ${location}`
        });
    } catch (error) {
        console.error('Detailed error:', error);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        }

        if (error.message === 'Location not found') {
            res.status(404).json({ error: 'Unable to determine location' });
        } else if (error.message === 'Weather data not available') {
            res.status(404).json({ error: 'Weather data not available for this location' });
        } else {
            res.status(500).json({ error: 'An error occurred while processing your request' });
        }
    }
});
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});