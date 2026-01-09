import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createPool,
  Pool,
  PoolConnection,
  RowDataPacket,
  OkPacket,
  ResultSetHeader,
} from 'mysql2/promise';
import { QueryError, FieldPacket } from 'mysql2/promise';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.pool = createPool({
      host: this.configService.get('database.host'),
      port: this.configService.get('database.port'),
      user: this.configService.get('database.username'),
      password: this.configService.get('database.password'),
      database: this.configService.get('database.database'),
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
    console.log('✅ Database initialized');
    console.log('Database config:', {
      host: this.configService.get('database.host'),
      port: this.configService.get('database.port'),
      user: this.configService.get('database.username'),
      database: this.configService.get('database.database'),
    });
  }

  async onModuleDestroy() {
    try {
      await this.pool.end();
      console.log('✅ Database connection pool closed');
    } catch (error) {
      console.error(
        '⚠️  Error closing database pool:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
    const start = Date.now();
    const [rows, fields] = await this.pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: Array.isArray(rows) ? rows.length : 1 });
    return { rows: rows as T[] };
  }

  async execute(text: string, params?: any[]): Promise<OkPacket> {
    const start = Date.now();
    const [result] = await this.pool.execute(text, params);
    const duration = Date.now() - start;
    console.log('Executed command', {
      text,
      duration,
      affectedRows: (result as OkPacket).affectedRows,
    });
    return result as OkPacket;
  }

  async getConnection(): Promise<PoolConnection> {
    return await this.pool.getConnection();
  }

  async transaction<T>(callback: (connection: PoolConnection) => Promise<T>): Promise<T> {
    const connection = await this.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
