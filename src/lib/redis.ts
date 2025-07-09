// Browser-compatible Redis simulation using localStorage and EventTarget for real-time features
// In a production environment, this would be replaced with actual Redis backend calls

// Redis configuration (for future backend implementation)
const REDIS_URL = 'redis://redis-15049.c274.us-east-1-3.ec2.redns.redis-cloud.com:15049';

// Event emitter for real-time features
const eventEmitter = new EventTarget();

// Browser storage simulation
class BrowserRedis {
  private storage = localStorage;
  private subscribers = new Map<string, Set<(message: string) => void>>();

  async connect() {
    console.log('Redis Client Connected (Browser Mode)');
    return true;
  }

  async disconnect() {
    console.log('Redis Client Disconnected (Browser Mode)');
    return true;
  }

  async setEx(key: string, seconds: number, value: string): Promise<boolean> {
    try {
      const expiry = Date.now() + (seconds * 1000);
      const data = { value, expiry };
      this.storage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Failed to set key:', error);
      return false;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const item = this.storage.getItem(key);
      if (!item) return null;

      const data = JSON.parse(item);

      // Check if expired
      if (data.expiry && Date.now() > data.expiry) {
        this.storage.removeItem(key);
        return null;
      }

      return data.value;
    } catch (error) {
      console.error('Failed to get key:', error);
      return null;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      this.storage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Failed to delete key:', error);
      return false;
    }
  }

  async publish(channel: string, message: string): Promise<boolean> {
    try {
      // Simulate real-time publishing using custom events
      const event = new CustomEvent('redis-message', {
        detail: { channel, message }
      });
      eventEmitter.dispatchEvent(event);

      // Also notify direct subscribers
      const channelSubscribers = this.subscribers.get(channel);
      if (channelSubscribers) {
        channelSubscribers.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            console.error('Subscriber callback error:', error);
          }
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to publish message:', error);
      return false;
    }
  }

  async subscribe(channel: string, callback: (message: string) => void) {
    try {
      if (!this.subscribers.has(channel)) {
        this.subscribers.set(channel, new Set());
      }
      this.subscribers.get(channel)!.add(callback);

      return {
        unsubscribe: () => {
          const channelSubscribers = this.subscribers.get(channel);
          if (channelSubscribers) {
            channelSubscribers.delete(callback);
            if (channelSubscribers.size === 0) {
              this.subscribers.delete(channel);
            }
          }
        }
      };
    } catch (error) {
      console.error('Failed to subscribe:', error);
      return null;
    }
  }

  duplicate() {
    return new BrowserRedis();
  }
}

// Create Redis client instance
export const redis = new BrowserRedis();

// Connect to Redis (browser mode)
export const connectRedis = async () => {
  return await redis.connect();
};

// Disconnect from Redis
export const disconnectRedis = async () => {
  return await redis.disconnect();
};

// Session management
export const SESSION_PREFIX = 'session:';
export const NOTIFICATION_PREFIX = 'notification:';
export const MESSAGE_PREFIX = 'message:';

// Session utilities
export const setSession = async (sessionId: string, userId: string, expirationSeconds = 86400): Promise<boolean> => {
  try {
    return await redis.setEx(`${SESSION_PREFIX}${sessionId}`, expirationSeconds, userId);
  } catch (error) {
    console.error('Failed to set session:', error);
    return false;
  }
};

export const getSession = async (sessionId: string): Promise<string | null> => {
  try {
    return await redis.get(`${SESSION_PREFIX}${sessionId}`);
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
};

export const deleteSession = async (sessionId: string): Promise<boolean> => {
  try {
    return await redis.del(`${SESSION_PREFIX}${sessionId}`);
  } catch (error) {
    console.error('Failed to delete session:', error);
    return false;
  }
};

// Notification utilities
export const publishNotification = async (userId: string, notification: any): Promise<boolean> => {
  try {
    return await redis.publish(`${NOTIFICATION_PREFIX}${userId}`, JSON.stringify(notification));
  } catch (error) {
    console.error('Failed to publish notification:', error);
    return false;
  }
};

export const subscribeToNotifications = async (userId: string, callback: (notification: any) => void) => {
  try {
    const subscriber = redis.duplicate();
    await subscriber.connect();

    return await subscriber.subscribe(`${NOTIFICATION_PREFIX}${userId}`, (message) => {
      try {
        const notification = JSON.parse(message);
        callback(notification);
      } catch (error) {
        console.error('Failed to parse notification:', error);
      }
    });
  } catch (error) {
    console.error('Failed to subscribe to notifications:', error);
    return null;
  }
};

// Message utilities
export const publishMessage = async (roomId: string, message: any): Promise<boolean> => {
  try {
    return await redis.publish(`${MESSAGE_PREFIX}${roomId}`, JSON.stringify(message));
  } catch (error) {
    console.error('Failed to publish message:', error);
    return false;
  }
};

export const subscribeToMessages = async (roomId: string, callback: (message: any) => void) => {
  try {
    const subscriber = redis.duplicate();
    await subscriber.connect();

    return await subscriber.subscribe(`${MESSAGE_PREFIX}${roomId}`, (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        callback(parsedMessage);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });
  } catch (error) {
    console.error('Failed to subscribe to messages:', error);
    return null;
  }
};

// Cache utilities
export const setCache = async (key: string, value: any, expirationSeconds = 3600): Promise<boolean> => {
  try {
    return await redis.setEx(key, expirationSeconds, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to set cache:', error);
    return false;
  }
};

export const getCache = async (key: string): Promise<any | null> => {
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Failed to get cache:', error);
    return null;
  }
};

export const deleteCache = async (key: string): Promise<boolean> => {
  try {
    return await redis.del(key);
  } catch (error) {
    console.error('Failed to delete cache:', error);
    return false;
  }
};

// Initialize Redis connection
connectRedis();

export default redis;
