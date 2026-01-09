import { execSync } from 'child_process';

export default async function globalSetup() {
  console.log('Setting up E2E test environment...');

  try {
    await cleanupTestData();

    console.log('Starting application server...');
    execSync('npm run start:prod', {
      stdio: 'inherit',
      timeout: 30000,
    });

    console.log('Application server started successfully');
  } catch (error) {
    console.error('Failed to start application server:', error);
    throw error;
  }

  console.log('Waiting for server to be ready...');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log('E2E test environment setup complete');
}

async function cleanupTestData() {
  try {
    const cleanupSQL = `
      DELETE FROM users WHERE username LIKE 'e2e_user_%' OR email LIKE 'e2e_%@example.com';
      DELETE FROM user_sessions WHERE user_id LIKE '00000000-0000-0000-0000-%';
      DELETE FROM user_settings WHERE user_id LIKE '00000000-0000-0000-0000-%';
      DELETE FROM friendships WHERE user_id LIKE '00000000-0000-0000-0000-%' OR friend_id LIKE '00000000-0000-0000-0000-%';
      DELETE FROM friend_requests WHERE sender_id LIKE '00000000-0000-0000-0000-%' OR receiver_id LIKE '00000000-0000-0000-0000-%';
      DELETE FROM blocked_users WHERE blocker_id LIKE '00000000-0000-0000-0000-%' OR blocked_id LIKE '00000000-0000-0000-0000-%';
      DELETE FROM conversation_members WHERE user_id LIKE '00000000-0000-0000-0000-%';
      DELETE FROM conversations WHERE id LIKE '00000000-0000-0000-0000-%' OR created_at > DATE_SUB(NOW(), INTERVAL 1 DAY);
      DELETE FROM message_receipts WHERE message_id LIKE '00000000-0000-0000-0000-%';
      DELETE FROM messages WHERE id LIKE '00000000-0000-0000-0000-%' OR created_at > DATE_SUB(NOW(), INTERVAL 1 DAY);
      DELETE FROM comment_likes WHERE user_id LIKE '00000000-0000-0000-0000-%';
      DELETE FROM post_likes WHERE user_id LIKE '00000000-0000-0000-0000-%';
      DELETE FROM comments WHERE user_id LIKE '00000000-0000-0000-0000-%';
      DELETE FROM posts WHERE user_id LIKE '00000000-0000-0000-0000-%' OR created_at > DATE_SUB(NOW(), INTERVAL 1 DAY);
      DELETE FROM notifications WHERE user_id LIKE '00000000-0000-0000-0000-%';
      DELETE FROM media_files WHERE user_id LIKE '00000000-0000-0000-0000-%';
      DELETE FROM call_records WHERE caller_id LIKE '00000000-0000-0000-0000-%' OR callee_id LIKE '00000000-0000-0000-0000-%';
    `;

    execSync(
      `docker exec chat_mysql mysql -uchat_user -pchat_password chat_backend -e "${cleanupSQL}"`,
      {
        stdio: 'inherit',
        timeout: 30000,
      },
    );

    console.log('✅ Test data cleaned up successfully');
  } catch (error) {
    console.warn('⚠️  Warning: Failed to cleanup test data:', error);
  }
}
