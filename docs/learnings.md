# Learnings

## Database Connection Check

### `SELECT 1` Query
- Simple SQL query that returns a constant value `1`
- Used for database connectivity testing
- Doesn't access any tables, making it lightweight and fast
- If the query executes successfully, the database connection is working
- If it fails, the connection is broken or unreachable

### How it Works
- Executing `SELECT 1` requires a network round-trip to the database
- If connection is broken → query fails → error is thrown
- If connection works → query succeeds → returns result
- The try/catch block converts rejected Promises to `false` and fulfilled Promises to `true`

## Promises and Async/Await

### `Promise<boolean>` Type
- Means: "A Promise that will resolve to a boolean value"
- `Promise<T>` = Promise that resolves to type T
- Examples:
  - `Promise<boolean>` → resolves to `true` or `false`
  - `Promise<string>` → resolves to a string
  - `Promise<number>` → resolves to a number
  - `Promise<void>` → resolves to nothing (just completion, no return value)

### Async Functions
- `async` functions always return a Promise, even if you return a primitive value
- `return true` in an async function becomes `Promise.resolve(true)`
- You must use `await` or `.then()` to get the actual value

### Await Behavior
- `await` on fulfilled Promise → returns the value
- `await` on rejected Promise → throws an error (caught by try/catch)
- This is why try/catch works with async/await

## Express.js Middleware

### CORS Configuration
```typescript
app.use(cors({ origin: '*' }))
```
- **Default methods**: `['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE']`
- **Default headers**: Only "simple" headers (Accept, Content-Type, etc.)
- To allow all headers: `allowedHeaders: '*'`
- To allow all methods: Omit `methods` property or list explicitly

### JSON Parser
```typescript
app.use(express.json({ limit: '300mb' }))
```
- Parses incoming JSON request bodies
- Makes data available in `req.body`
- `limit` sets maximum request body size (default: 100kb)
- Useful for large payloads like base64-encoded images/videos

## UUID (Universally Unique Identifier)

### UUID v4
- Generates a random, unique identifier string
- Format: `550e8400-e29b-41d4-a716-446655440000` (32 hex digits, 5 groups)
- Used for creating unique session IDs, transaction IDs, etc.
- Very low probability of collisions
- No coordination needed between systems

```typescript
import { v4 as uuidv4 } from 'uuid';
const sessionUid = uuidv4(); // Generates unique ID
```

## Database Transactions

### `sql.begin()` - Transaction Pattern
- Ensures multiple database operations execute atomically
- Either all operations succeed (COMMIT) or all fail (ROLLBACK)
- Prevents partial data states

```typescript
await sql.begin(async (tx) => {
  // All queries using 'tx' are part of the same transaction
  await operation1(tx);
  await operation2(tx);
  // If any fails, both are rolled back
});
```

### Repository Pattern with Transactions
- Repositories can accept optional transaction parameter
- Allows same function to work with or without transactions
- Pattern: `const query = tx || sql;`

```typescript
export const createRecord = async (data: Data, tx?: typeof sql) => {
  const query = tx || sql; // Use transaction if provided, else use sql
  await query`INSERT INTO ...`;
};
```

## SQL Queries

### Array Destructuring from SQL Results
- SQL queries always return arrays (even for single rows)
- Use array destructuring to extract the first element
- Pattern: `const [result] = await query<Type[]>...`

```typescript
// Query returns array: [{ id: 1, name: 'John' }]
const [user] = await sql<User[]>`SELECT * FROM users WHERE id = ${id}`;
// user = { id: 1, name: 'John' } (single object, not array)
```

### RETURNING Clause
- PostgreSQL feature that returns inserted/updated rows
- Avoids need for separate SELECT query
- Returns the data that was just inserted/updated

```sql
INSERT INTO table (name, email) 
VALUES ('John', 'john@example.com')
RETURNING id, name, email, created_at;
```

## TypeScript Utilities

### `Omit<Type, Keys>`
- Utility type that removes specified keys from a type
- Useful when database auto-generates fields (like `created_at`, `id`)
- Example: `Omit<UserModel, 'id' | 'created_at'>` removes those fields

```typescript
// Model has: id, name, email, created_at
// Function accepts: Omit<UserModel, 'id' | 'created_at'>
// So you only need to provide: name, email
```

## Images and Binary Data

### Images are Binary Data
- Images at their core are sequences of bytes (binary data)
- File formats (PNG, JPEG, etc.) are just ways to organize and compress binary data
- On disk: stored as raw bytes
- In memory: represented as Buffer (Node.js) or binary data
- As base64: text encoding of binary data (for transmission over text-based protocols)

### Base64 Encoding
- Base64 is a text representation of binary data
- Used to transmit binary data over text-based protocols (HTTP, JSON)
- Increases size by ~33% compared to raw binary
- Common format: `data:image/png;base64,iVBORw0KGgo...`

### Converting Base64 to File
- Base64 strings must be converted to Buffer before saving to disk
- `fs.writeFileSync()` requires binary data (Buffer), not text
- Process: Base64 string → Buffer → File on disk

```typescript
const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
const buffer = Buffer.from(base64Image, 'base64'); // Convert text to binary
fs.writeFileSync(filePath, buffer); // Write binary data to file
```

### Why Images Travel as Base64
- **JSON doesn't support binary data** - only text, numbers, booleans
- Easy to include in JSON payloads without separate file upload endpoints
- Works with simple HTTP POST requests
- **Trade-off**: Less efficient than multipart/form-data for large files

## HTTP Requests with FormData

### Multipart/Form-Data
- Used for uploading files via HTTP
- More efficient than base64 for large files
- Allows mixing file and text data in one request
- Uses boundaries to separate different parts

```typescript
const formData = new FormData();
formData.append('image', fs.createReadStream(imagePath)); // File stream
formData.append('countryId', 'ind'); // Text field

const response = await axios.post(url, formData, {
  headers: {
    contentType: 'multipart/form-data',
    appId: config.appId,
    appKey: config.appKey,
  }
});
```

### File Streaming
- `fs.createReadStream()` reads file in chunks without loading entire file into memory
- More memory-efficient for large files
- Streams data directly to the HTTP request

## SSL Certificate Verification

### Client-Side Security Setting
- SSL certificate verification is a **client-side decision**, not server-side
- The API owner provides the certificate, but **you decide** whether to verify it
- Protects the client from connecting to fake/malicious servers
- Prevents man-in-the-middle attacks

### `rejectUnauthorized: false`
- Disables SSL certificate verification
- Accepts any certificate (even invalid, expired, or malicious ones)
- **Security risk**: Should only be used in development
- Never use in production

```typescript
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // ⚠️ Only for development!
});
```

