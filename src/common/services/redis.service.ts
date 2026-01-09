import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;
  private isConnected = false;

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    try {
      this.client = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
        password: process.env.REDIS_PASSWORD || 'redis_password',
      });

      this.client.on('error', (err) => {
        this.logger.error(`Redis Client Error: ${err.message}`);
      });

      this.client.on('connect', () => {
        this.logger.log('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        this.logger.warn('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      this.logger.error(
        `Failed to connect to Redis: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      this.logger.log('Redis client disconnected');
    }
  }

  getClient(): RedisClientType {
    if (!this.isConnected) {
      throw new Error('Redis client is not connected');
    }
    return this.client;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const client = this.getClient();
    if (ttl) {
      await client.setEx(key, ttl, value);
    } else {
      await client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.get(key);
  }

  async del(key: string): Promise<number> {
    const client = this.getClient();
    return await client.del(key);
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const client = this.getClient();
    return await client.expire(key, seconds);
  }

  async lPush(key: string, ...values: string[]): Promise<number> {
    const client = this.getClient();
    return await client.lPush(key, values);
  }

  async rPush(key: string, ...values: string[]): Promise<number> {
    const client = this.getClient();
    return await client.rPush(key, values);
  }

  async lRange(key: string, start: number, stop: number): Promise<string[]> {
    const client = this.getClient();
    return await client.lRange(key, start, stop);
  }

  async lLen(key: string): Promise<number> {
    const client = this.getClient();
    return await client.lLen(key);
  }
}
