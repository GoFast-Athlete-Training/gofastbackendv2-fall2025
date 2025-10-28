import express from "express";

const router = express.Router();

// POST /api/garmin/activity - Handle activity data webhooks
router.post("/activity", async (req, res) => {
  try {
    const { userId, activityId, activityType, timestamp, data } = req.body;
    
    console.log('Garmin activity webhook received:', { 
      userId, 
      activityId, 
      activityType, 
      timestamp 
    });
    
    // Handle different activity types
    switch (activityType) {
      case 'running':
        console.log('Running activity received:', data);
        // TODO: Process running data
        // TODO: Calculate pace, distance, calories
        // TODO: Store in database
        break;
      case 'cycling':
        console.log('Cycling activity received:', data);
        // TODO: Process cycling data
        break;
      case 'walking':
        console.log('Walking activity received:', data);
        // TODO: Process walking data
        break;
      default:
        console.log('Unknown activity type:', activityType);
    }
    
    res.json({
      success: true,
      message: 'Activity processed',
      activityId: activityId,
      activityType: activityType,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Garmin activity webhook error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process activity' 
    });
  }
});

// GET /api/garmin/activities - Fetch user activities
router.get("/activities", async (req, res) => {
  try {
    const { userId, accessToken, limit = 10 } = req.query;
    
    if (!userId || !accessToken) {
      return res.status(400).json({ error: "userId and accessToken are required" });
    }
    
    // TODO: Use accessToken to fetch activities from Garmin API
    // TODO: Filter and format activity data
    // TODO: Return formatted activities
    
    res.json({
      success: true,
      message: 'Activities fetched',
      activities: [], // TODO: Return actual activities
      count: 0
    });
    
  } catch (error) {
    console.error('Garmin activities fetch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch activities' 
    });
  }
});

// POST /api/garmin/activity/sync - Manual activity sync
router.post("/activity/sync", async (req, res) => {
  try {
    const { userId, accessToken } = req.body;
    
    if (!userId || !accessToken) {
      return res.status(400).json({ error: "userId and accessToken are required" });
    }
    
    console.log('Manual activity sync requested for user:', userId);
    
    // TODO: Trigger manual sync with Garmin API
    // TODO: Fetch latest activities
    // TODO: Update user's activity data
    
    res.json({
      success: true,
      message: 'Activity sync initiated',
      userId: userId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Garmin activity sync error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to sync activities' 
    });
  }
});

export default router;
