const { Country, State, City } = require('country-state-city');

// 1. Get All Countries (Useful for a country picker)
exports.getCountries = (req, res) => {
    try {
        const countries = Country.getAllCountries();
        res.status(200).json(countries);
    } catch (error) {
        res.status(500).json({ message: "Error fetching countries", error });
    }
};

// 2. Get All States in a Country
exports.getStatesByCountry = (req, res) => {
    try {
        const { countryCode } = req.params; // e.g., 'IN', 'US'
        const states = State.getStatesOfCountry(countryCode.toUpperCase());
        res.status(200).json(states);
    } catch (error) {
        res.status(500).json({ message: "Error fetching states", error });
    }
};

// 3. Get All Cities in a Country (Caution: High data volume)
exports.getCitiesByCountry = (req, res) => {
    try {
        const { countryCode } = req.params;
        const cities = City.getCitiesOfCountry(countryCode.toUpperCase());
        res.status(200).json(cities);
    } catch (error) {
        res.status(500).json({ message: "Error fetching cities", error });
    }
};

// 4. Get Cities by State and Country
exports.getCitiesByState = (req, res) => {
    try {
        const { countryCode, stateCode } = req.params;
        const cities = City.getCitiesOfState(countryCode.toUpperCase(), stateCode.toUpperCase());
        res.status(200).json(cities);
    } catch (error) {
        res.status(500).json({ message: "Error fetching cities", error });
    }
};

// 5. Global Search for a city within a country
exports.searchCitiesInCountry = (req, res) => {
    try {
        const { countryCode } = req.params;
        const { q } = req.query; // ?q=Mum
        
        if (!q) return res.status(400).json({ message: "Search query is required" });

        const cities = City.getCitiesOfCountry(countryCode.toUpperCase());
        const filtered = cities
            .filter(city => city.name.toLowerCase().includes(q.toLowerCase()))
            .slice(0, 30); // Limit results for performance

        res.status(200).json(filtered);
    } catch (error) {
        res.status(500).json({ message: "Error searching cities", error });
    }
};