const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

router.get('/', productController.getProducts);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);
router.get('/collections',productController.getCollections)
router.post('/collections',productController.createCollection)
router.get('/list',productController.getProductslist)
router.get('/:slug',productController.getProductBySlug)

module.exports = router;