/**
 * Database Utilities - 数据库测试工具
 */

import { Pool, PoolClient } from 'pg';

/**
 * 清理测试数据库表
 */
export async function cleanupDatabase(pool: Pool, tables: string[]) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 禁用外键约束
    await client.query('SET CONSTRAINTS ALL DEFERRED');

    // 清空所有表
    for (const table of tables) {
      await client.query(`TRUNCATE TABLE ${table} CASCADE`);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 插入测试数据到指定表
 */
export async function insertTestData(
  pool: Pool,
  table: string,
  data: Record<string, any>[],
): Promise<void> {
  if (data.length === 0) return;

  const columns = Object.keys(data[0]).join(', ');
  const placeholders = data
    .map((_, i) => {
      const values = Object.keys(data[i]).map((_, j) => `$${i * data[0].length + j + 1}`);
      return `(${values.join(', ')})`;
    })
    .join(', ');

  const values = data.flatMap((row) => Object.values(row));

  await pool.query(`INSERT INTO ${table} (${columns}) VALUES ${placeholders}`, values);
}

/**
 * 查询测试数据
 */
export async function queryTestData(
  pool: Pool,
  table: string,
  where: Record<string, any> = {},
): Promise<any[]> {
  const conditions = Object.entries(where)
    .map(([key, value], i) => `${key} = $${i + 1}`)
    .join(' AND ');

  const query = conditions
    ? `SELECT * FROM ${table} WHERE ${conditions}`
    : `SELECT * FROM ${table}`;

  const values = Object.values(where);

  const result = await pool.query(query, values.length > 0 ? values : undefined);
  return result.rows;
}

/**
 * 获取表行数
 */
export async function countRows(pool: Pool, table: string): Promise<number> {
  const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
  return parseInt(result.rows[0].count, 10);
}

/**
 * 重置自增ID序列
 */
export async function resetSequence(
  pool: Pool,
  sequence: string,
  startValue: number = 1,
): Promise<void> {
  await pool.query(`ALTER SEQUENCE ${sequence} RESTART WITH ${startValue}`);
}

/**
 * 创建测试数据库事务
 */
export async function withTransaction<T>(
  pool: Pool,
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('ROLLBACK'); // 测试用事务后回滚
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 生成测试用的SQL值
 */
export function generateTestValue(type: 'string' | 'number' | 'date' | 'boolean' | 'uuid'): any {
  switch (type) {
    case 'string':
      return 'test-value-' + Math.random().toString(36).substring(7);
    case 'number':
      return Math.floor(Math.random() * 1000);
    case 'date':
      return new Date();
    case 'boolean':
      return Math.random() > 0.5;
    case 'uuid':
      return crypto.randomUUID();
    default:
      return null;
  }
}

/**
 * Mock数据库查询
 */
export function mockDbQuery(mockFn: jest.Mock, rows: any[] = [], rowCount?: number) {
  return mockFn.mockResolvedValue({
    rows,
    rowCount: rowCount ?? rows.length,
    command: 'SELECT',
    oid: 0,
    fields: [],
  });
}

/**
 * Mock数据库错误
 */
export function mockDbError(
  mockFn: jest.Mock,
  message: string = 'Database error',
  code: string = 'DB_ERROR',
) {
  const error = new Error(message) as any;
  error.code = code;
  return mockFn.mockRejectedValue(error);
}

/**
 * 批量Mock数据库查询
 */
export function mockDbQueries(mockFn: jest.Mock, results: { rows: any[] }[]) {
  let index = 0;
  return mockFn.mockImplementation(() => {
    const result = results[index];
    index = (index + 1) % results.length;
    return Promise.resolve({
      rows: result.rows,
      rowCount: result.rows.length,
      command: 'SELECT',
      oid: 0,
      fields: [],
    });
  });
}

/**
 * 验证SQL查询（用于断言）
 */
export function verifySqlQuery(
  query: string,
  expectedTable?: string,
  expectedOperation?: string,
): boolean {
  if (expectedTable && !query.toLowerCase().includes(expectedTable.toLowerCase())) {
    return false;
  }
  if (expectedOperation) {
    const operations = {
      select: 'SELECT',
      insert: 'INSERT',
      update: 'UPDATE',
      delete: 'DELETE',
      create: 'CREATE',
      drop: 'DROP',
      alter: 'ALTER',
      truncate: 'TRUNCATE',
    };
    const op = operations[expectedOperation.toLowerCase() as keyof typeof operations];
    if (!op || !query.toUpperCase().includes(op)) {
      return false;
    }
  }
  return true;
}

/**
 * 格式化SQL用于比较（移除多余空格和换行）
 */
export function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * 断言SQL匹配
 */
export function assertSqlMatches(actual: string, expected: string): void {
  expect(normalizeSql(actual)).toBe(normalizeSql(expected));
}

/**
 * 模拟数据库连接池耗尽
 */
export function mockPoolExhaustion(pool: Pool): void {
  (pool as any).connect = jest.fn().mockRejectedValue(new Error('Connection pool exhausted'));
}

/**
 * 模拟数据库连接超时
 */
export function mockConnectionTimeout(pool: Pool): void {
  (pool as any).connect = jest
    .fn()
    .mockImplementation(
      () =>
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 5000)),
    );
}

/**
 * 模拟数据库死锁
 */
export function mockDeadlock(pool: Pool): void {
  const error = new Error('Deadlock detected') as any;
  error.code = '40P01';
  (pool as any).query = jest.fn().mockRejectedValue(error);
}

/**
 * 模拟数据库唯一约束冲突
 */
export function mockUniqueViolation(pool: Pool, constraint: string): void {
  const error = new Error(`Duplicate key value violates unique constraint "${constraint}"`) as any;
  error.code = '23505';
  error.constraint = constraint;
  (pool as any).query = jest.fn().mockRejectedValue(error);
}

/**
 * 模拟数据库外键约束冲突
 */
export function mockForeignKeyViolation(pool: Pool, constraint: string): void {
  const error = new Error(
    `Insert or update on table violates foreign key constraint "${constraint}"`,
  ) as any;
  error.code = '23503';
  error.constraint = constraint;
  (pool as any).query = jest.fn().mockRejectedValue(error);
}

/**
 * 模拟数据库不存在
 */
export function mockTableNotExists(pool: Pool, table: string): void {
  const error = new Error(`relation "${table}" does not exist`) as any;
  error.code = '42P01';
  error.table = table;
  (pool as any).query = jest.fn().mockRejectedValue(error);
}

/**
 * 创建测试数据库schema
 */
export async function createTestSchema(pool: Pool, schemaName: string): Promise<void> {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
}

/**
 * 删除测试数据库schema
 */
export async function dropTestSchema(pool: Pool, schemaName: string): Promise<void> {
  await pool.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
}

/**
 * 备份表数据
 */
export async function backupTableData(
  pool: Pool,
  table: string,
  backupTable: string,
): Promise<void> {
  await pool.query(`CREATE TABLE ${backupTable} AS SELECT * FROM ${table}`);
}

/**
 * 恢复表数据
 */
export async function restoreTableData(
  pool: Pool,
  table: string,
  backupTable: string,
): Promise<void> {
  await pool.query(`TRUNCATE TABLE ${table}`);
  await pool.query(`INSERT INTO ${table} SELECT * FROM ${backupTable}`);
  await pool.query(`DROP TABLE ${backupTable}`);
}
