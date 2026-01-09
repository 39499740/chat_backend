import { execSync } from 'child_process';

export default async function globalTeardown() {
  console.log('Tearing down E2E test environment...');

  try {
    // 停止应用服务器
    console.log('Stopping application server...');
    execSync('pkill -f "node.*nest start"', {
      stdio: 'inherit',
      timeout: 5000,
    });

    console.log('Application server stopped successfully');
  } catch (error) {
    console.error('Failed to stop application server:', error);
  }

  console.log('E2E test environment teardown complete');
}
