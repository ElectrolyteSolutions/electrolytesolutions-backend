const express = require('express');
const router = express.Router();
const {
  createCollection,
  getAllCollections,
  getCollectionById,
  updateCollection,
  deleteCollection
} = require('../controllers/collectionController');

router.route('/')
  .post(createCollection)
  .get(getAllCollections);

// Corrected from ':/id' to '/:id'
router.route('/:id')
  .get(getCollectionById)
  .put(updateCollection)
  .delete(deleteCollection);

module.exports = router;