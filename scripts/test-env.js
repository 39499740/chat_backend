#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DOCKER_COMPOSE_TEST = 'docker-compose.test.yml';
const ENV_TEST_FILE = '.env.test';

function copyEnvFile() {
  if (!fs.existsSync(ENV_TEST_FILE)) {
    console.error('Environment file not found:', ENV_TEST_FILE);
    process.exit(1);
  }

  const envContent = fs.readFileSync(ENV_TEST_FILE, 'utf8');
  fs.writeFileSync('.env', envContent, 'utf8');
  console.log('✅ Environment configuration copied from', ENV_TEST_FILE);
}

function startTestServices() {
  console.log('🚀 Starting test services...');
  try {
    execSync(`docker-compose -f ${DOCKER_COMPOSE_TEST} up -d`, {
      stdio: 'inherit',
    });
    console.log('✅ Test services started');

    console.log('⏳ Waiting for services to be ready...');
    waitForService('MySQL', 'mysql-test', 3308, 60);
    waitForService('Redis', 'redis-test', 6380, 30);
    waitForService('MinIO', 'minio-test', 9001, 30);

    console.log('✅ All services are ready!');
  } catch (error) {
    console.error('❌ Failed to start test services:', error);
    process.exit(1);
  }
}

function stopTestServices() {
  console.log('🛑 Stopping test services...');
  try {
    execSync(`docker-compose -f ${DOCKER_COMPOSE_TEST} down`, {
      stdio: 'inherit',
    });
    console.log('✅ Test services stopped');
  } catch (error) {
    console.error('⚠️  Failed to stop test services:', error);
    process.exit(1);
  }
}

function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  try {
    execSync(
      'docker exec chat_mysql_test mysql -uchat_user -pchat_password chat_backend_test -e "TRUNCATE TABLE users; TRUNCATE TABLE conversations; TRUNCATE TABLE messages; TRUNCATE TABLE notifications;"',
      {
        stdio: 'inherit',
      },
    );
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('⚠️  Failed to cleanup test data:', error);
  }
}

function waitForService(name, container, port, timeout) {
  const startTime = Date.now();
  const timeoutMs = timeout * 1000;

  while (true) {
    try {
      execSync(`nc -z localhost ${port}`, { stdio: 'ignore' });
      console.log(`✅ ${name} is ready`);
      return;
    } catch (error) {
      if (Date.now() - startTime > timeoutMs) {
        console.error(`❌ ${name} failed to start within ${timeout}s`);
        throw new Error(`${name} timeout`);
      }
      process.stdout.write('.');
      process.stdout.flush && process.stdout.flush();
    }

    execSync('sleep 1', { stdio: 'ignore' });
  }
}

function showStatus() {
  console.log('\n📊 Test Environment Status\n');

  try {
    const mysqlStatus = execSync('docker ps --filter name=chat_mysql_test --format "{{.Status}}"', {
      stdio: 'pipe',
      encoding: 'utf8',
    }).trim();
    console.log(`MySQL Test: ${mysqlStatus}`);

    const redisStatus = execSync('docker ps --filter name=chat_redis_test --format "{{.Status}}"', {
      stdio: 'pipe',
      encoding: 'utf8',
    }).trim();
    console.log(`Redis Test: ${redisStatus}`);

    const minioStatus = execSync('docker ps --filter name=chat_minio_test --format "{{.Status}}"', {
      stdio: 'pipe',
      encoding: 'utf8',
    }).trim();
    console.log(`MinIO Test: ${minioStatus}`);
  } catch (error) {
    console.log('Unable to get service status (services might not be running)');
  }
}

const command = process.argv[2];

switch (command) {
  case 'start':
    copyEnvFile();
    startTestServices();
    break;

  case 'stop':
    stopTestServices();
    break;

  case 'restart':
    stopTestServices();
    copyEnvFile();
    startTestServices();
    break;

  case 'cleanup':
    cleanupTestData();
    break;

  case 'status':
    showStatus();
    break;

  default:
    console.log('Usage: node test-env.js [command]');
    console.log('');
    console.log('Commands:');
    console.log('  start   - Start test services');
    console.log('  stop    - Stop test services');
    console.log('  restart - Restart test services');
    console.log('  cleanup - Clean up test data');
    console.log('  status  - Show service status');
    console.log('');
    console.log('Examples:');
    console.log('  node test-env.js start');
    console.log('  node test-env.js stop');
    console.log('  node test-env.js cleanup');
    process.exit(1);
}
