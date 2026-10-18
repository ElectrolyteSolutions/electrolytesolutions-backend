const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// ==================== Public Collection & Metadata Routes ====================
router.get('/collections', productController.getCollections);
router.post('/collections', productController.createCollection);

// ==================== Public Catalog & Filtering Routes ====================
router.get('/list', productController.getProductslist);
router.get('/types', productController.getTypes); // ⚡ Moved above /:slug to avoid route collision

// ==================== Public Single Product Route ====================
router.get('/:slug', productController.getProductBySlug);

// ==================== Protected Admin Inventory Mutation Routes ====================
router.get('/', protect, authorizeRoles('admin'), productController.getProducts);
router.post('/', protect, authorizeRoles('admin'), productController.createProduct);
router.put('/:id', protect, authorizeRoles('admin'), productController.updateProduct);
router.delete('/:id', protect, authorizeRoles('admin'), productController.deleteProduct);

module.exports = router;