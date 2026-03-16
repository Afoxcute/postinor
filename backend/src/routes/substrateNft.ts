import express from 'express';
import { handleSubstrateNftRegistration } from '../controllers/substrateNftController';
import { asyncHandler } from '../utils1/asyncHandler';

const router = express.Router();

// Register Substrate NFT with Yakoa for infringement detection
router.post('/register', asyncHandler(handleSubstrateNftRegistration));

export default router;

