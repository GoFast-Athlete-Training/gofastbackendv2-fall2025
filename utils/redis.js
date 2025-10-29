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

const client = redis.createClient({
  url: redisUrl
});

client.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

// Fallback in-memory store for development
const fallbackStore = new Map();

export const storeCodeVerifier = async (athleteId, codeVerifier, ttlSeconds = 600) => {
  try {
    if (client.isOpen) {
      await client.setEx(`garmin_code_verifier:${athleteId}`, ttlSeconds, codeVerifier);
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
    if (client.isOpen) {
      const codeVerifier = await client.get(`garmin_code_verifier:${athleteId}`);
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
    if (client.isOpen) {
      await client.del(`garmin_code_verifier:${athleteId}`);
    }
    fallbackStore.delete(`garmin_code_verifier:${athleteId}`);
    console.log(`✅ Code verifier deleted for athleteId: ${athleteId}`);
  } catch (error) {
    console.error('❌ Failed to delete code verifier:', error);
  }
};

// Connect to Redis
client.connect().catch(console.error);

export default client;
