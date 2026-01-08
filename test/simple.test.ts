describe('Test Framework', () => {
  it('should run a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should verify jest is working', () => {
    const testValue = 'test';
    expect(testValue).toBe('test');
  });
});
