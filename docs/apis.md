# API Documentation

## Base URL
```
http://localhost:{PORT}/api
```

## Common Response Format

All API responses follow this structure:

```typescript
{
  success: boolean;
  data?: T;      // Present when success is true
  error?: string; // Present when success is false
}
```

### Success Response Example
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response Example
```json
{
  "success": false,
  "error": "Error message here"
}
```

---

## Endpoints

### 1. Health Check

Check if the API and database are running.

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "connected"
}
```

**Error Response (503):**
```json
{
  "status": "ERROR",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "disconnected"
}
```

---

### 2. Create Verification Session

Creates a new verification session with PAN card information.

**Endpoint:** `POST /api/verification-sessions`

**Request Body:**
```json
{
  "external_txn_id": "TXN123456",
  "pan_number": "ABCDE1234F",
  "full_name": "John Doe",
  "father_name": "Father Name",
  "date_of_birth": "1990-01-15",
  "source_party": "partner_name"
}
```

**Request Fields:**
- `external_txn_id` (string, required): External transaction ID
- `pan_number` (string, required): PAN card number
- `full_name` (string, required): Full name as per PAN
- `father_name` (string, required): Father's name
- `date_of_birth` (string, required): Date of birth (YYYY-MM-DD format)
- `source_party` (string, required): Source party identifier

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "session_uid": "550e8400-e29b-41d4-a716-446655440000",
    "external_txn_id": "TXN123456",
    "status": "pending",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Failed to create verification session"
}
```

---

### 3. Upload PAN Card Images

Uploads PAN card front and back images for verification.

**Endpoint:** `POST /api/pan-card`

**Request Body:**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "front_image": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "back_image": "data:image/png;base64,iVBORw0KGgoAAAANS..." 
}
```

**Request Fields:**
- `session_id` (string, required): Session UID from verification session creation
- `front_image` (string, required): Base64 encoded front image of PAN card (with data URI prefix)
- `back_image` (string, optional): Base64 encoded back image of PAN card (with data URI prefix)

**Image Format:**
- Format: Base64 encoded string with data URI prefix
- Example: `data:image/png;base64,<base64_string>`
- Supported formats: PNG, JPEG, JPG

**Success Response (201):**
Returned only when `verificationStatus` is `true` (extracted data matches business partner data).
```json
{
  "success": true,
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "frontVerification": {
      "fullName": "JOHN DOE",
      "dateOfBirth": "15/01/1990",
      "fatherName": "FATHER NAME",
      "idNumber": "ABCDE1234F"
    },
    "verificationStatus": true
  }
}
```

**Verification Failed Response (200):**
Returned when `verificationStatus` is `false` (extracted data does not match business partner data).
```json
{
  "success": false,
  "error": "PAN card verification failed: extracted data does not match business partner data",
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "frontVerification": {
      "fullName": "JOHN DOE",
      "dateOfBirth": "15/01/1990",
      "fatherName": "FATHER NAME",
      "idNumber": "ABCDE1234F"
    },
    "verificationStatus": false
  }
}
```

**Response Fields:**
- `sessionId`: Session UID
- `frontVerification`: Extracted data from PAN card
  - `fullName`: Full name extracted from PAN
  - `dateOfBirth`: Date of birth extracted
  - `fatherName`: Father's name extracted
  - `idNumber`: PAN number extracted
- `verificationStatus`: Boolean indicating if extracted data matches the provided PAN data
  - When `true`: Response has `success: true` (status 201)
  - When `false`: Response has `success: false` (status 200) with error message

**Error Response (400):**
```json
{
  "success": false,
  "error": "session_id and front_image are required"
}
```

**Error Response (500):**
```json
{
  "success": false,
  "error": "Failed to upload PAN card image"
}
```

---

### 4. Upload Selfie

Uploads a selfie image for liveness check and face matching.

**Endpoint:** `POST /api/selfie`

**Request Body:**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "image": "data:image/png;base64,iVBORw0KGgoAAAANS..."
}
```

**Request Fields:**
- `session_id` (string, required): Session UID
- `image` (string, required): Base64 encoded selfie image (with data URI prefix)

**Image Format:**
- Format: Base64 encoded string with data URI prefix
- Example: `data:image/png;base64,<base64_string>`
- Supported formats: PNG, JPEG, JPG

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "selfiePath": "/path/to/selfie/image.png",
    "isLive": true,
    "faceMatch": true
  }
}
```

**Response Fields:**
- `sessionId`: Session UID
- `selfiePath`: Path where selfie is stored
- `isLive`: Boolean indicating liveness check passed
- `faceMatch`: Boolean indicating face matches with PAN card photo

**Error Response (400) - Validation:**
```json
{
  "success": false,
  "error": "session_id and image are required"
}
```

**Error Response (400) - Verification Failed:**
```json
{
  "success": false,
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "selfiePath": "/path/to/selfie/image.png",
    "isLive": false,
    "faceMatch": false
  },
  "error": "Liveness check failed, Face match failed"
}
```

**Error Response (500):**
```json
{
  "success": false,
  "error": "Failed to upload selfie"
}
```

---

### 5. Upload OTP Video

Uploads a video of the user speaking the OTP for verification.

**Endpoint:** `POST /api/otp-video/upload`

**Request Body:**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "otp": "123456",
  "video": "data:video/mp4;base64,AAAAIGZ0eXBpc29t..."
}
```

**Request Fields:**
- `session_id` (string, required): Session UID
- `otp` (string, required): OTP code to be spoken in the video
- `video` (string, required): Base64 encoded video file (with data URI prefix)

**Video Format:**
- Format: Base64 encoded string with data URI prefix
- Example: `data:video/mp4;base64,<base64_string>`
- Supported formats: MP4, MOV, AVI

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "videoPath": "/path/to/video/file.mp4"
  }
}
```

**Response Fields:**
- `sessionId`: Session UID
- `videoPath`: Path where video is stored

**Error Response (400):**
```json
{
  "success": false,
  "error": "session_id, otp, and video are required"
}
```

**Error Response (500):**
```json
{
  "success": false,
  "error": "Failed to upload OTP video"
}
```

---

### 6. Create Session Metadata

Creates metadata for a verification session (device info, permissions, location).

**Endpoint:** `POST /api/session-metadata`

**Request Body:**
```json
{
  "session_uid": "550e8400-e29b-41d4-a716-446655440000",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "camera_permission": true,
  "microphone_permission": true,
  "location_permission": true,
  "ip_address": "192.168.1.1",
  "device_type": "mobile"
}
```

**Request Fields:**
- `session_uid` (string, required): Session UID
- `latitude` (number, required): Latitude coordinate
- `longitude` (number, required): Longitude coordinate
- `camera_permission` (boolean, required): Camera permission status
- `microphone_permission` (boolean, required): Microphone permission status
- `location_permission` (boolean, required): Location permission status
- `ip_address` (string, required): Client IP address
- `device_type` (string, required): Device type (e.g., "mobile", "desktop", "tablet")

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "session_uid": "550e8400-e29b-41d4-a716-446655440000",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "camera_permission": true,
    "microphone_permission": true,
    "location_permission": true,
    "ip_address": "192.168.1.1",
    "device_type": "mobile",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Failed to create session metadata"
}
```

---

## HTTP Status Codes

- `200` - OK (Success, or verification failed but request processed)
- `201` - Created (Resource created successfully, verification passed)
- `400` - Bad Request (Invalid input or validation error)
- `500` - Internal Server Error (Server error)
- `503` - Service Unavailable (Database disconnected)

---

## Important Notes

### Image/Video Upload
- All images and videos must be sent as **base64 encoded strings** with data URI prefix
- Maximum request body size: **300MB**
- Supported image formats: PNG, JPEG, JPG
- Supported video formats: MP4, MOV, AVI

### Base64 Encoding Example (JavaScript)
```javascript
// For images
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];
const reader = new FileReader();

reader.onload = function(e) {
  const base64String = e.target.result; // Already includes data URI prefix
  // Send base64String in API request
};

reader.readAsDataURL(file);
```

### Session Flow
1. Create verification session → Get `session_uid`
2. Upload PAN card images → Verify PAN data (returns `success: true` only if verification passes)
3. Upload selfie → Liveness check + Face match
4. Upload OTP video → OTP verification
5. (Optional) Create session metadata → Store device/location info

**Note:** For PAN card upload, `success: true` is only returned when the extracted data matches the business partner data. If verification fails, `success: false` is returned with status 200, but the extracted data is still included in the response.

### CORS
- CORS is enabled for all origins (`*`)
- All HTTP methods are allowed
- All headers are allowed

---

## Error Handling

Always check the `success` field in the response:

```javascript
const response = await fetch('/api/verification-sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

const result = await response.json();

if (result.success) {
  // Handle success
  console.log(result.data);
} else {
  // Handle error
  console.error(result.error);
}
```
