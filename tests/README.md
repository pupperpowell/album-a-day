# Authentication Route Tests

This directory contains comprehensive tests for the authentication routes in the Album-a-Day application.

## Test Structure

```
tests/
├── setup.ts              # Test setup and mocking utilities
├── test-helpers.ts       # Helper functions for testing
├── run-tests.ts          # Test runner script
├── auth/
│   ├── login.test.ts     # Tests for POST /api/auth/login
│   ├── register.test.ts  # Tests for POST /api/auth/register
│   └── session.test.ts   # Tests for GET/DELETE /api/auth/session
└── README.md             # This file
```

## Test Coverage

### Login Route (`/api/auth/login`)

- ✅ Validation of required fields (username, password)
- ✅ Authentication with invalid credentials
- ✅ Authentication with valid credentials
- ✅ Session cookie creation
- ✅ Error handling for database failures
- ✅ Cookie security options

### Register Route (`/api/auth/register`)

- ✅ Validation of required fields (username, password)
- ✅ Password length validation (minimum 6 characters)
- ✅ Username uniqueness validation
- ✅ Successful user registration
- ✅ Session creation after registration
- ✅ Error handling for database failures
- ✅ Cookie security options

### Session Route (`/api/auth/session`)

- ✅ GET: Session validation
- ✅ GET: Invalid session handling
- ✅ GET: User retrieval with valid session
- ✅ GET: Session refresh
- ✅ DELETE: Session logout
- ✅ DELETE: Session cookie clearing
- ✅ Error handling for database failures

## Running Tests

### Run All Tests

```bash
bun run test
```

### Run Tests in Watch Mode

```bash
bun run test:watch
```

### Run Only Authentication Tests

```bash
bun run test:auth
```

### Run Tests with Coverage

```bash
bun run test:coverage
```

### Run Specific Test File

```bash
bun tests/run-tests.ts --test=./tests/auth/login.test.ts
```

## Test Environment

The tests use a mocked Redis client to avoid requiring a real Redis instance during testing. The mock is configured in `tests/setup.ts` and provides:

- In-memory storage for users and sessions
- Support for all Redis operations used by the authentication system
- Automatic cleanup between tests

## Mocking Strategy

The tests mock the `AuthUtils` class to isolate the route handlers from the underlying authentication logic. This allows us to:

1. Test various scenarios without needing real data
2. Simulate error conditions
3. Verify that routes call the correct utility methods
4. Ensure proper error handling and response formatting

## Test Data

Test helpers in `test-helpers.ts` provide utilities for:

- Creating mock NextRequest objects
- Generating test users and sessions
- Extracting and parsing response data
- Setting up test scenarios

## Debugging Tests

To debug individual tests, you can:

1. Run a specific test file: `bun tests/run-tests.ts --test=./tests/auth/login.test.ts`
2. Add `console.log` statements in the test files
3. Use the `--verbose` flag in the test runner
4. Check the mock calls and responses in the test assertions

## Adding New Tests

When adding new authentication routes or features:

1. Create a new test file in the appropriate directory
2. Follow the existing test patterns and structure
3. Use the helper functions for consistent test setup
4. Mock any external dependencies
5. Test both success and failure scenarios
6. Verify response status codes, headers, and body content

## Best Practices

- Each test should be independent and not rely on other tests
- Use descriptive test names that explain what is being tested
- Test edge cases and error conditions
- Verify both the response data and HTTP status codes
- Clean up mock data between tests
- Use the provided helper functions for consistent testing
