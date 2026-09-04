import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { upload } from '../middleware/upload';

import {
  adminListWatches,
  adminGetWatch,
  adminCreateWatch,
  adminUpdateWatch,
  adminDeleteWatch,
  adminBulkDeleteWatches,
} from '../controllers/watchController';
import {
  adminListCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  adminReorderCategories,
} from '../controllers/categoryController';
import {
  adminListBrands,
  adminCreateBrand,
  adminUpdateBrand,
  adminDeleteBrand,
} from '../controllers/brandController';
import {
  adminListCollections,
  adminCreateCollection,
  adminUpdateCollection,
  adminDeleteCollection,
} from '../controllers/collectionController';
import {
  adminListInquiries,
  adminUpdateInquiry,
  adminDeleteInquiry,
} from '../controllers/inquiryController';
import { uploadMedia, uploadMultipleMedia } from '../controllers/mediaController';
import { getDashboardStats } from '../controllers/dashboardController';
import { adminListCustomers, adminGetCustomer } from '../controllers/customerController';
import analyticsRoutes from './analyticsRoutes';

const router = Router();

router.use(requireAuth);

router.get('/dashboard', getDashboardStats);

// Visitor analytics. Inherits requireAuth from above.
router.use('/analytics', analyticsRoutes);

router.get('/watches', adminListWatches);
router.get('/watches/:id', adminGetWatch);
router.post('/watches', adminCreateWatch);
router.put('/watches/:id', adminUpdateWatch);
// Before the :id routes it shares a prefix with, so "bulk-delete" is never
// read as a product id.
router.post('/watches/bulk-delete', adminBulkDeleteWatches);
router.delete('/watches/:id', adminDeleteWatch);

router.get('/categories', adminListCategories);
router.post('/categories', adminCreateCategory);
router.put('/categories/reorder', adminReorderCategories);
router.put('/categories/:id', adminUpdateCategory);
router.delete('/categories/:id', adminDeleteCategory);

router.get('/brands', adminListBrands);
router.post('/brands', adminCreateBrand);
router.put('/brands/:id', adminUpdateBrand);
router.delete('/brands/:id', adminDeleteBrand);

router.get('/collections', adminListCollections);
router.post('/collections', adminCreateCollection);
router.put('/collections/:id', adminUpdateCollection);
router.delete('/collections/:id', adminDeleteCollection);

// Registered storefront customers. Read-only: this panel reports, it does not
// administer someone else's account.
router.get('/customers', adminListCustomers);
router.get('/customers/:id', adminGetCustomer);

router.get('/inquiries', adminListInquiries);
router.put('/inquiries/:id', adminUpdateInquiry);
router.delete('/inquiries/:id', adminDeleteInquiry);

router.post('/media/upload', upload.single('file'), uploadMedia);
router.post('/media/upload-multiple', upload.array('files', 10), uploadMultipleMedia);

export default router;
