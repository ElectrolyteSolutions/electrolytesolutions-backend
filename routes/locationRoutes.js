const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

// Get list of all countries
router.get('/countries', locationController.getCountries);

// Get all states in a specific country (e.g., /states/IN)
router.get('/states/:countryCode', locationController.getStatesByCountry);

// Get all cities in a specific country (e.g., /cities/IN)
router.get('/cities/:countryCode', locationController.getCitiesByCountry);

// Get cities in a specific state of a country (e.g., /cities/IN/MH)
router.get('/cities/:countryCode/:stateCode', locationController.getCitiesByState);

// Search for a city within a specific country (e.g., /search/IN?q=mumbai)
router.get('/search/:countryCode', locationController.searchCitiesInCountry);

module.exports = router;