/**
 * Artillery 预处理器
 * 用于在性能测试前准备数据或初始化上下文
 */

module.exports = {
  // 在每个场景开始前调用
  beforeRequest: (requestContext, events, done) => {
    // 可以在这里添加自定义的逻辑
    // 例如：动态生成测试数据、修改请求等

    // 示例：为每个虚拟用户添加唯一标识
    if (!requestContext.vars.$processEnvironment) {
      requestContext.vars.$processEnvironment = process.env.NODE_ENV || 'test';
    }

    return done();
  },

  // 在每个场景结束后调用
  afterResponse: (requestContext, events, done) => {
    // 可以在这里添加响应处理逻辑
    // 例如：记录响应时间、验证响应等

    const { statusCode } = requestContext;

    // 记录状态码
    if (statusCode >= 200 && statusCode < 300) {
      // 成功
    } else if (statusCode >= 400 && statusCode < 500) {
      // 客户端错误
    } else if (statusCode >= 500) {
      // 服务器错误
    }

    return done();
  },
};
