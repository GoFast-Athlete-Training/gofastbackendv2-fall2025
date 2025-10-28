// Athlete Update Service
// Value-based update logic for athlete records

import { PrismaClient } from '@prisma/client';
import { ATHLETE_COLUMN_CONFIG, getAthleteColumnConfig } from '../config/athleteColumnConfig.js';

const prisma = new PrismaClient();

export class AthleteUpdateService {
  
  /**
   * Update athlete with only non-null values
   * @param {string} athleteId - The athlete ID to update
   * @param {Object} updateData - Data to update (only non-null values will be updated)
   * @returns {Object} - Updated athlete record
   */
  static async updateAthlete(athleteId, updateData) {
    try {
      console.log('🔄 AthleteUpdateService - Starting update for athleteId:', athleteId);
      console.log('🔄 AthleteUpdateService - Update data received:', Object.keys(updateData));
      
      // Filter out null/undefined/empty values
      const filteredData = this.filterValidValues(updateData);
      
      if (Object.keys(filteredData).length === 0) {
        console.log('⚠️ AthleteUpdateService - No valid values to update');
        return { success: false, message: 'No valid values to update' };
      }
      
      console.log('🔄 AthleteUpdateService - Filtered data:', Object.keys(filteredData));
      
      // Validate columns exist in config
      const validatedData = this.validateColumns(filteredData);
      
      if (Object.keys(validatedData).length === 0) {
        console.log('⚠️ AthleteUpdateService - No valid columns after validation');
        return { success: false, message: 'No valid columns to update' };
      }
      
      console.log('🔄 AthleteUpdateService - Validated data:', Object.keys(validatedData));
      
      // Update the athlete
      const updatedAthlete = await prisma.athlete.update({
        where: { id: athleteId },
        data: validatedData
      });
      
      console.log('✅ AthleteUpdateService - Successfully updated athlete:', athleteId);
      
      return {
        success: true,
        message: 'Athlete updated successfully',
        athlete: updatedAthlete
      };
      
    } catch (error) {
      console.error('❌ AthleteUpdateService - Update failed:', error);
      return {
        success: false,
        message: 'Failed to update athlete',
        error: error.message
      };
    }
  }
  
  /**
   * Filter out null, undefined, and empty string values
   * @param {Object} data - Raw update data
   * @returns {Object} - Filtered data with only valid values
   */
  static filterValidValues(data) {
    const filtered = {};
    
    for (const [key, value] of Object.entries(data)) {
      // Skip null, undefined, empty strings, and empty objects
      if (value !== null && 
          value !== undefined && 
          value !== '' && 
          !(typeof value === 'object' && Object.keys(value).length === 0)) {
        filtered[key] = value;
      }
    }
    
    return filtered;
  }
  
  /**
   * Validate that columns exist in the athlete config
   * @param {Object} data - Filtered update data
   * @returns {Object} - Validated data with only existing columns
   */
  static validateColumns(data) {
    const validated = {};
    
    for (const [key, value] of Object.entries(data)) {
      const columnConfig = getAthleteColumnConfig('athletes', key);
      
      if (columnConfig && columnConfig.upsertable) {
        validated[key] = value;
      } else {
        console.log(`⚠️ AthleteUpdateService - Skipping invalid column: ${key}`);
      }
    }
    
    return validated;
  }
  
  /**
   * Get available columns for update
   * @returns {Array} - List of updatable columns
   */
  static getUpdatableColumns() {
    const columns = ATHLETE_COLUMN_CONFIG.athletes.columns;
    return Object.entries(columns)
      .filter(([_, config]) => config.upsertable)
      .map(([name, config]) => ({
        name,
        ...config
      }));
  }
  
  /**
   * Get athlete update status (which columns are populated)
   * @param {string} athleteId - The athlete ID to check
   * @returns {Object} - Update status for each column
   */
  static async getAthleteUpdateStatus(athleteId) {
    try {
      const athlete = await prisma.athlete.findUnique({
        where: { id: athleteId },
        select: this.getUpdatableColumns().reduce((acc, col) => {
          acc[col.name] = true;
          return acc;
        }, {})
      });
      
      if (!athlete) {
        return { success: false, message: 'Athlete not found' };
      }
      
      const status = {};
      for (const [key, value] of Object.entries(athlete)) {
        status[key] = {
          populated: value !== null && value !== undefined && value !== '',
          value: value
        };
      }
      
      return {
        success: true,
        status
      };
      
    } catch (error) {
      console.error('❌ AthleteUpdateService - Get status failed:', error);
      return {
        success: false,
        message: 'Failed to get athlete status',
        error: error.message
      };
    }
  }
}

export default AthleteUpdateService;
