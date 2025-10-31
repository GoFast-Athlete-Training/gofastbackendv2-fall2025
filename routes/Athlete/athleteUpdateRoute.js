// Athlete Update Routes
// API endpoints for updating athlete records

import express from "express";
import AthleteUpdateService from "../../services/AthleteUpdateService.js";
import { ATHLETE_COLUMN_CONFIG } from "../../config/athleteColumnConfig.js";

const router = express.Router();

// GET /api/athlete/config - Get available columns for update
router.get("/config", (req, res) => {
  try {
    const updatableColumns = AthleteUpdateService.getUpdatableColumns();
    
    res.json({
      success: true,
      columns: updatableColumns,
      totalColumns: updatableColumns.length
    });
    
  } catch (error) {
    console.error('❌ Athlete config endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get athlete config'
    });
  }
});

// GET /api/athlete/status/:athleteId - Get athlete update status
router.get("/status/:athleteId", async (req, res) => {
  try {
    const { athleteId } = req.params;
    
    if (!athleteId) {
      return res.status(400).json({
        success: false,
        error: 'Athlete ID is required'
      });
    }
    
    const result = await AthleteUpdateService.getAthleteUpdateStatus(athleteId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
    
  } catch (error) {
    console.error('❌ Athlete status endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get athlete status'
    });
  }
});

// PATCH /api/athlete/update/:athleteId - Update athlete with value-based logic
router.patch("/update/:athleteId", async (req, res) => {
  try {
    const { athleteId } = req.params;
    const updateData = req.body;
    
    if (!athleteId) {
      return res.status(400).json({
        success: false,
        error: 'Athlete ID is required'
      });
    }
    
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Update data is required'
      });
    }
    
    console.log('🔄 Athlete update request:', { athleteId, updateData });
    
    const result = await AthleteUpdateService.updateAthlete(athleteId, updateData);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
    
  } catch (error) {
    console.error('❌ Athlete update endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update athlete'
    });
  }
});

// POST /api/athlete/bulk-update/:athleteId - Bulk update multiple columns
router.post("/bulk-update/:athleteId", async (req, res) => {
  try {
    const { athleteId } = req.params;
    const { columns, data } = req.body;
    
    if (!athleteId) {
      return res.status(400).json({
        success: false,
        error: 'Athlete ID is required'
      });
    }
    
    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Columns array is required'
      });
    }
    
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Update data is required'
      });
    }
    
    // Filter data to only include selected columns
    const filteredData = {};
    for (const column of columns) {
      if (data[column] !== undefined) {
        filteredData[column] = data[column];
      }
    }
    
    console.log('🔄 Athlete bulk update request:', { athleteId, columns, filteredData });
    
    const result = await AthleteUpdateService.updateAthlete(athleteId, filteredData);
    
    if (result.success) {
      res.json({
        ...result,
        updatedColumns: columns,
        totalUpdated: Object.keys(filteredData).length
      });
    } else {
      res.status(400).json(result);
    }
    
  } catch (error) {
    console.error('❌ Athlete bulk update endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update athlete'
    });
  }
});

export default router;

