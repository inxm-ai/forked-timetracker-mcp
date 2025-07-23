describe('Test Setup', () => {
  it('should run tests successfully', () => {
    expect(true).toBe(true)
  })

  it('should have proper test environment', () => {
    expect(process.env.NODE_ENV).toBe('test')
  })

  it('should have access to mock functions', () => {
    const mockFn = jest.fn()
    mockFn('test')
    expect(mockFn).toHaveBeenCalledWith('test')
  })
})