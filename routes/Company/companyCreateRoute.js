// Company Upsert Route - Single Tenant Setup
// POST /api/company/create
// Auth: verifyFirebaseToken middleware required
// Upsert GoFastCompany record (SINGLE TENANT - only one company exists)

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

/**
 * Upsert GoFastCompany (Single Tenant)
 * POST /api/company/create
 * Auth: verifyFirebaseToken required
 * Body: { companyName, address, city, state, website, description }
 * 
 * Flow:
 * 1. Verify Firebase token (middleware)
 * 2. Find CompanyStaff by firebaseId (ANY authenticated staff can upsert)
 * 3. Find existing GoFastCompany (should only be one - single tenant)
 * 4. If exists, update it
 * 5. If not exists, create it (first-time setup)
 * 6. Ensure staff.companyId is set (direct relation, no junction table)
 * 
 * Note: SINGLE TENANT - Only one GoFastCompany exists. Once created, it lives forever.
 * Any authenticated staff can upsert (create on first run, update thereafter).
 * After first upsert, company exists forever - staff just link to it.
 */
router.post('/create', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid; // From verified Firebase token
    const { companyName, address, city, state, website, description } = req.body;
    
    console.log('🚀 COMPANY UPSERT: ===== UPSERTING COMPANY (SINGLE TENANT) =====');
    console.log('🚀 COMPANY UPSERT: Firebase ID:', firebaseId);
    console.log('🚀 COMPANY UPSERT: Company Name:', companyName);
    
    // Find CompanyStaff - ANY authenticated staff can upsert (single tenant)
    const staff = await prisma.companyStaff.findUnique({
      where: { firebaseId },
      include: {
        company: true
      }
    });
    
    if (!staff) {
      console.log('❌ COMPANY UPSERT: Staff not found');
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
        message: 'CompanyStaff record not found. Please create staff first.'
      });
    }
    
    console.log('✅ COMPANY UPSERT: Staff found:', staff.id);
    console.log('✅ COMPANY UPSERT: Staff role:', staff.role || 'No role');
    console.log('✅ COMPANY UPSERT: Staff companyId:', staff.companyId || 'None');
    
    // SINGLE TENANT: Find existing GoFastCompany (should only be one)
    const existingCompany = await prisma.goFastCompany.findFirst();
    const isNewCompany = !existingCompany;
    
    // Prepare company data
    const companyData = {
      companyName: companyName || (existingCompany?.companyName || 'GoFast Inc'),
      address: address !== undefined ? address : (existingCompany?.address || '2604 N. George Mason Dr.'),
      city: city !== undefined ? city : (existingCompany?.city || 'Arlington'),
      state: state !== undefined ? state : (existingCompany?.state || 'VA'),
      website: website !== undefined ? website : (existingCompany?.website || 'gofastcrushgoals.com'),
      description: description !== undefined ? description : (existingCompany?.description || null)
    };
    
    let company;
    if (existingCompany) {
      // Update existing company (single tenant - company lives forever)
      console.log('📝 COMPANY UPSERT: Updating existing company:', existingCompany.id);
      company = await prisma.goFastCompany.update({
        where: { id: existingCompany.id },
        data: companyData
      });
      console.log('✅ COMPANY UPSERT: Company updated');
    } else {
      // Create company (first-time setup - only happens once, then lives forever)
      console.log('📝 COMPANY UPSERT: Creating company (FIRST TIME SETUP - will exist forever)...');
      company = await prisma.goFastCompany.create({
        data: {
          containerId: `gofast-${Date.now()}`, // Unique containerId
          ...companyData
        }
      });
      console.log('✅ COMPANY UPSERT: Company created (single tenant - will exist forever):', company.id);
    }
    
    // Ensure staff.companyId is set and link staff to company
    // Auto-assign "Founder" role if this is the first staff member creating the company
    if (!staff.companyId || staff.companyId !== company.id) {
      console.log('📝 COMPANY UPSERT: Linking staff to company:', company.id);
      const updateData = { companyId: company.id };
      
      // If staff has no role and this is a new company creation, assign Founder role
      if (!staff.role && isNewCompany) {
        console.log('📝 COMPANY UPSERT: Auto-assigning Founder role (first staff member creating company)');
        updateData.role = 'Founder';
      }
      
      await prisma.companyStaff.update({
        where: { id: staff.id },
        data: updateData
      });
      console.log('✅ COMPANY UPSERT: Staff linked to company');
    }
    
    console.log('✅ COMPANY UPSERT: ===== COMPANY UPSERTED SUCCESSFULLY =====');
    
    res.json({
      success: true,
      message: isNewCompany 
        ? 'Company created successfully (single tenant - will exist forever)' 
        : 'Company updated successfully',
      company: {
        id: company.id,
        containerId: company.containerId,
        companyName: company.companyName,
        address: company.address,
        city: company.city,
        state: company.state,
        website: company.website,
        description: company.description,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt
      }
    });
    
  } catch (error) {
    console.error('❌ COMPANY UPSERT: ===== ERROR =====');
    console.error('❌ COMPANY UPSERT: Error message:', error.message);
    console.error('❌ COMPANY UPSERT: Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: 'Failed to upsert company',
      message: error.message
    });
  }
});

export default router;

