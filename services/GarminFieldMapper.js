/**
 * Garmin Field Mapper Service
 * Maps Garmin API fields to our AthleteActivity model
 */

export class GarminFieldMapper {
  
  /**
   * Map Garmin activity summary data to AthleteActivity model (Phase 1)
   * @param {Object} garminActivity - Raw Garmin activity data from /garmin/activity webhook
   * @param {string} athleteId - Our athlete's ID
   * @returns {Object} Mapped activity data for database
   */
  static mapActivitySummary(garminActivity, athleteId) {
    return {
      athleteId: athleteId,
      
      // Source Information (join key)
      sourceActivityId: garminActivity.activityId?.toString() || null,
      source: 'garmin',
      
      // Core Activity Data (Summary)
      activityType: garminActivity.activityType?.typeKey || null,
      activityName: garminActivity.activityName || null,
      startTime: garminActivity.startTimeLocal ? new Date(garminActivity.startTimeLocal) : null,
      duration: garminActivity.durationInSeconds || null,
      distance: garminActivity.distanceInMeters || null,
      averageSpeed: garminActivity.averageSpeed || null,
      calories: garminActivity.calories || null,
      
      // Performance Metrics (Summary)
      averageHeartRate: garminActivity.averageHeartRate || null,
      maxHeartRate: garminActivity.maxHeartRate || null,
      elevationGain: garminActivity.elevationGain || null,
      steps: garminActivity.steps || null,
      
      // Location Data (Summary)
      startLatitude: garminActivity.startLatitude || null,
      startLongitude: garminActivity.startLongitude || null,
      endLatitude: garminActivity.endLatitude || null,
      endLongitude: garminActivity.endLongitude || null,
      summaryPolyline: garminActivity.summaryPolyline || null,
      
      // Device Information
      deviceName: garminActivity.deviceMetaData?.deviceName || null,
      garminUserId: garminActivity.userId || null,
      
      // Phase 1: Summary Data (JSON for additional fields)
      summaryData: this.mapSummaryData(garminActivity),
      
      // Timestamps
      syncedAt: new Date(),
      lastUpdatedAt: new Date()
    };
  }
  
  /**
   * Map Garmin activity details data to AthleteActivity model (Phase 2)
   * @param {Object} garminDetails - Raw Garmin details data from /garmin/details webhook
   * @returns {Object} Mapped detail data for database update
   */
  static mapActivityDetails(garminDetails) {
    return {
      // Phase 2: Detail Data (JSON for deep metrics)
      detailData: this.mapDetailData(garminDetails),
      hydratedAt: new Date(),
      lastUpdatedAt: new Date()
    };
  }
  
  /**
   * Calculate pace from average speed
   * @param {number} averageSpeed - Speed in m/s
   * @returns {number|null} Pace in min/mile
   */
  static calculatePace(averageSpeed) {
    if (!averageSpeed || averageSpeed <= 0) return null;
    
    // Convert m/s to min/mile
    // 1 mile = 1609.34 meters
    // pace = 26.8224 / averageSpeed (where averageSpeed is in m/s)
    const paceInMinPerMile = 26.8224 / averageSpeed;
    return Math.round(paceInMinPerMile * 100) / 100; // Round to 2 decimal places
  }
  
  /**
   * Map summary data from Garmin activity (Phase 1)
   * @param {Object} garminActivity - Raw Garmin activity data
   * @returns {Object|null} Summary data as JSON
   */
  static mapSummaryData(garminActivity) {
    const summaryData = {};
    
    // Activity category
    if (garminActivity.activityType?.parentTypeId) {
      summaryData.activityCategory = garminActivity.activityType.parentTypeId;
    }
    
    // Device metadata
    if (garminActivity.deviceMetaData) {
      summaryData.deviceMetaData = garminActivity.deviceMetaData;
    }
    
    // Additional fields that might be useful
    if (garminActivity.activityDescription) {
      summaryData.activityDescription = garminActivity.activityDescription;
    }
    
    if (garminActivity.eventType) {
      summaryData.eventType = garminActivity.eventType;
    }
    
    if (garminActivity.activityLevel) {
      summaryData.activityLevel = garminActivity.activityLevel;
    }
    
    // Return null if no summary data
    return Object.keys(summaryData).length > 0 ? summaryData : null;
  }
  
  /**
   * Map detail data from Garmin activity details (Phase 2)
   * @param {Object} garminDetails - Raw Garmin details data
   * @returns {Object|null} Detail data as JSON
   */
  static mapDetailData(garminDetails) {
    const detailData = {};
    
    // Lap summaries
    if (garminDetails.lapSummaries) {
      detailData.lapSummaries = garminDetails.lapSummaries;
    }
    
    // Split summaries
    if (garminDetails.splitSummaries) {
      detailData.splitSummaries = garminDetails.splitSummaries;
    }
    
    // Cadence data
    if (garminDetails.averageRunCadence || garminDetails.averageCadence) {
      detailData.cadence = {
        average: garminDetails.averageRunCadence || garminDetails.averageCadence,
        max: garminDetails.maxRunCadence || garminDetails.maxCadence
      };
    }
    
    // Power data
    if (garminDetails.averagePower || garminDetails.maxPower) {
      detailData.power = {
        average: garminDetails.averagePower,
        max: garminDetails.maxPower
      };
    }
    
    // Training effect
    if (garminDetails.aerobicTrainingEffect || garminDetails.anaerobicTrainingEffect) {
      detailData.trainingEffect = {
        aerobic: garminDetails.aerobicTrainingEffect,
        anaerobic: garminDetails.anaerobicTrainingEffect,
        label: garminDetails.trainingEffectLabel
      };
    }
    
    // Heart rate zones
    if (garminDetails.timeInHeartRateZones) {
      detailData.heartRateZones = garminDetails.timeInHeartRateZones;
    }
    
    // Raw samples (optional streams)
    if (garminDetails.samples) {
      detailData.samples = garminDetails.samples;
    }
    
    // Return null if no detail data
    return Object.keys(detailData).length > 0 ? detailData : null;
  }
  
  /**
   * Map source-specific metadata
   * @param {Object} garminActivity - Raw Garmin activity data
   * @returns {Object} Source metadata
   */
  static mapSourceMetadata(garminActivity) {
    const metadata = {};
    
    // Device information
    if (garminActivity.deviceMetaData?.deviceName) {
      metadata.deviceName = garminActivity.deviceMetaData.deviceName;
    }
    
    // Activity category
    if (garminActivity.activityType?.parentTypeId) {
      metadata.activityCategory = garminActivity.activityType.parentTypeId;
    }
    
    // Performance extras
    const performanceExtras = {};
    if (garminActivity.averageRunCadence) {
      performanceExtras.averageCadence = garminActivity.averageRunCadence;
    }
    if (garminActivity.maxRunCadence) {
      performanceExtras.maxCadence = garminActivity.maxRunCadence;
    }
    if (garminActivity.averagePower) {
      performanceExtras.averagePower = garminActivity.averagePower;
    }
    if (garminActivity.maxPower) {
      performanceExtras.maxPower = garminActivity.maxPower;
    }
    
    if (Object.keys(performanceExtras).length > 0) {
      metadata.performanceExtras = performanceExtras;
    }
    
    // Physiological metrics
    const physioMetrics = {};
    if (garminActivity.trainingEffectLabel) {
      physioMetrics.trainingEffectLabel = garminActivity.trainingEffectLabel;
    }
    if (garminActivity.aerobicTrainingEffect) {
      physioMetrics.aerobicTrainingEffect = garminActivity.aerobicTrainingEffect;
    }
    if (garminActivity.anaerobicTrainingEffect) {
      physioMetrics.anaerobicTrainingEffect = garminActivity.anaerobicTrainingEffect;
    }
    
    if (Object.keys(physioMetrics).length > 0) {
      metadata.physioMetrics = physioMetrics;
    }
    
    // Weather data
    if (garminActivity.weather) {
      metadata.weather = {
        tempAvg: garminActivity.weather.tempAvg,
        tempMin: garminActivity.weather.tempMin,
        tempMax: garminActivity.weather.tempMax
      };
    }
    
    // Activity name (optional display field)
    if (garminActivity.activityName) {
      metadata.activityName = garminActivity.activityName;
    }
    
    return metadata;
  }
  
  /**
   * Map Garmin permissions to our model
   * @param {Object} garminPermissions - Raw Garmin permissions
   * @returns {Object} Mapped permissions
   */
  static mapPermissions(garminPermissions) {
    return {
      read: garminPermissions.read || false,
      write: garminPermissions.write || false,
      scope: garminPermissions.scope || null,
      grantedAt: new Date(),
      lastChecked: new Date()
    };
  }
  
  /**
   * Validate mapped activity data
   * @param {Object} mappedActivity - Mapped activity data
   * @returns {Object} Validation result
   */
  static validateActivity(mappedActivity) {
    const errors = [];
    const warnings = [];
    
    // Required fields
    if (!mappedActivity.athleteId) {
      errors.push('athleteId is required');
    }
    
    if (!mappedActivity.sourceActivityId) {
      errors.push('sourceActivityId is required');
    }
    
    // Warning for missing core data
    if (!mappedActivity.activityType) {
      warnings.push('activityType is missing');
    }
    
    if (!mappedActivity.startTime) {
      warnings.push('startTime is missing');
    }
    
    if (!mappedActivity.duration) {
      warnings.push('duration is missing');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export default GarminFieldMapper;
