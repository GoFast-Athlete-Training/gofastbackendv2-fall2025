// Redis helper for storing short-lived code verifiers
import redis from 'redis';

// Parse REDIS_URL properly - handle command line format
let redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// If it's a command line format, extract the actual URL
if (redisUrl.includes('redis-cli')) {
  const urlMatch = redisUrl.match(/redis:\/\/[^@]+@[^:]+:\d+/);
  if (urlMatch) {
    redisUrl = urlMatch[0];
  } else {
    console.warn('⚠️ Could not parse REDIS_URL, using fallback');
    redisUrl = 'redis://localhost:6379';
  }
}

console.log('🔍 Redis URL:', redisUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials

// Fallback in-memory store for development
const fallbackStore = new Map();
let client = null;
let isConnected = false;

// Create Redis client with better error handling
const createRedisClient = () => {
  if (client && isConnected) return client;
  
  try {
    client = redis.createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.warn('⚠️ Redis max reconnection attempts reached, using fallback');
            return false;
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    client.on('error', (err) => {
      console.error('❌ Redis Client Error:', err.message);
      isConnected = false;
    });

    client.on('connect', () => {
      console.log('✅ Redis Client Connected');
      isConnected = true;
    });

    client.on('ready', () => {
      console.log('✅ Redis Client Ready');
      isConnected = true;
    });

    client.on('end', () => {
      console.log('⚠️ Redis Client Disconnected');
      isConnected = false;
    });

    // Connect asynchronously
    client.connect().catch(err => {
      console.warn('⚠️ Redis connection failed, using fallback:', err.message);
      isConnected = false;
    });

  } catch (error) {
    console.warn('⚠️ Redis client creation failed, using fallback:', error.message);
    isConnected = false;
  }

  return client;
};

// Initialize client
createRedisClient();

export const storeCodeVerifier = async (athleteId, codeVerifier, ttlSeconds = 600) => {
  try {
    const redisClient = createRedisClient();
    if (redisClient && isConnected && redisClient.isOpen) {
      await redisClient.setEx(`garmin_code_verifier:${athleteId}`, ttlSeconds, codeVerifier);
      console.log(`✅ Code verifier stored in Redis for athleteId: ${athleteId}`);
    } else {
      // Fallback to in-memory store
      fallbackStore.set(`garmin_code_verifier:${athleteId}`, codeVerifier);
      console.log(`⚠️ Code verifier stored in memory fallback for athleteId: ${athleteId}`);
    }
  } catch (error) {
    console.error('❌ Failed to store code verifier:', error);
    // Fallback to in-memory store
    fallbackStore.set(`garmin_code_verifier:${athleteId}`, codeVerifier);
  }
};

export const getCodeVerifier = async (athleteId) => {
  try {
    const redisClient = createRedisClient();
    if (redisClient && isConnected && redisClient.isOpen) {
      const codeVerifier = await redisClient.get(`garmin_code_verifier:${athleteId}`);
      if (codeVerifier) {
        console.log(`✅ Code verifier retrieved from Redis for athleteId: ${athleteId}`);
        return codeVerifier;
      }
    }
    
    // Fallback to in-memory store
    const fallbackValue = fallbackStore.get(`garmin_code_verifier:${athleteId}`);
    if (fallbackValue) {
      console.log(`⚠️ Code verifier retrieved from memory fallback for athleteId: ${athleteId}`);
      return fallbackValue;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Failed to get code verifier:', error);
    return null;
  }
};

export const deleteCodeVerifier = async (athleteId) => {
  try {
    const redisClient = createRedisClient();
    if (redisClient && isConnected && redisClient.isOpen) {
      await redisClient.del(`garmin_code_verifier:${athleteId}`);
    }
    fallbackStore.delete(`garmin_code_verifier:${athleteId}`);
    console.log(`✅ Code verifier deleted for athleteId: ${athleteId}`);
  } catch (error) {
    console.error('❌ Failed to delete code verifier:', error);
  }
};

export default createRedisClient;
