import { execSync } from 'child_process';

export class TestHelpers {
  private static testUserIds: string[] = [];
  private static testConversationIds: string[] = [];
  private static testMessageIds: string[] = [];

  static registerTestId(type: 'user' | 'conversation' | 'message', id: string) {
    if (type === 'user') {
      this.testUserIds.push(id);
    } else if (type === 'conversation') {
      this.testConversationIds.push(id);
    } else if (type === 'message') {
      this.testMessageIds.push(id);
    }
  }

  static async cleanupRegisteredTestIds() {
    try {
      const deleteSQL = this.buildDeleteSQL();
      if (deleteSQL) {
        execSync(
          `docker exec chat_mysql mysql -uchat_user -pchat_password chat_backend -e "${deleteSQL}"`,
          {
            stdio: 'inherit',
            timeout: 30000,
          },
        );
      }

      this.testUserIds = [];
      this.testConversationIds = [];
      this.testMessageIds = [];
    } catch (error) {
      console.warn('⚠️  Warning: Failed to cleanup registered test IDs:', error);
    }
  }

  private static buildDeleteSQL(): string {
    const statements: string[] = [];

    if (this.testUserIds.length > 0) {
      const userIds = this.testUserIds.map((id) => `'${id}'`).join(',');
      statements.push(`DELETE FROM user_sessions WHERE user_id IN (${userIds})`);
      statements.push(`DELETE FROM user_settings WHERE user_id IN (${userIds})`);
      statements.push(
        `DELETE FROM friendships WHERE user_id IN (${userIds}) OR friend_id IN (${userIds})`,
      );
      statements.push(
        `DELETE FROM friend_requests WHERE sender_id IN (${userIds}) OR receiver_id IN (${userIds})`,
      );
      statements.push(
        `DELETE FROM blocked_users WHERE blocker_id IN (${userIds}) OR blocked_id IN (${userIds})`,
      );
      statements.push(`DELETE FROM conversation_members WHERE user_id IN (${userIds})`);
      statements.push(`DELETE FROM notifications WHERE user_id IN (${userIds})`);
      statements.push(`DELETE FROM posts WHERE user_id IN (${userIds})`);
      statements.push(`DELETE FROM comments WHERE user_id IN (${userIds})`);
      statements.push(`DELETE FROM post_likes WHERE user_id IN (${userIds})`);
      statements.push(`DELETE FROM comment_likes WHERE user_id IN (${userIds})`);
      statements.push(`DELETE FROM media_files WHERE user_id IN (${userIds})`);
      statements.push(
        `DELETE FROM call_records WHERE caller_id IN (${userIds}) OR callee_id IN (${userIds})`,
      );
      statements.push(`DELETE FROM users WHERE id IN (${userIds})`);
    }

    if (this.testConversationIds.length > 0) {
      const conversationIds = this.testConversationIds.map((id) => `'${id}'`).join(',');
      statements.push(
        `DELETE FROM conversation_members WHERE conversation_id IN (${conversationIds})`,
      );
      statements.push(`DELETE FROM conversations WHERE id IN (${conversationIds})`);
    }

    if (this.testMessageIds.length > 0) {
      const messageIds = this.testMessageIds.map((id) => `'${id}'`).join(',');
      statements.push(`DELETE FROM message_receipts WHERE message_id IN (${messageIds})`);
      statements.push(`DELETE FROM messages WHERE id IN (${messageIds})`);
    }

    return statements.join('; ');
  }

  static generateTestTimestamp() {
    return Date.now();
  }

  static generateTestEmail() {
    return `e2e_${this.generateTestTimestamp()}@example.com`;
  }

  static generateTestUsername() {
    return `e2e_user_${this.generateTestTimestamp()}`;
  }
}
