# JWT Token Explained - What It Is and Why 24 Hours?

## 🔐 What is a JWT Token?

**JWT** stands for **JSON Web Token**. It's like a **digital ID card** that proves who you are without having to enter your password every time.

### Real-World Analogy

Think of it like this:
- **Password** = Your driver's license (you show it once to prove identity)
- **JWT Token** = A temporary badge you get after showing your license (you wear it for 7 days)

After you login with your password, the server gives you a JWT token. You use this token for the next 7 days instead of entering your password every time.

---

## 📋 What's Inside a JWT Token?

A JWT token has **3 parts** separated by dots:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwic3RhdHVzIjoiYXBwcm92ZWQiLCJpYXQiOjE3MDEyMzQ1NjcsImV4cCI6MTcwMTgzOTM2N30.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### Structure:

```
[HEADER].[PAYLOAD].[SIGNATURE]
```

### 1. Header (First Part)
```json
{
  "alg": "HS256",    // Algorithm used (HMAC SHA256)
  "typ": "JWT"       // Type of token
}
```
**Encoded as:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`

### 2. Payload (Second Part) - This is the important part!
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "role": "user",              // or "admin"
  "status": "approved",         // or "pending", "rejected"
  "iat": 1701234567,           // Issued at (timestamp)
  "exp": 1701839367            // Expires at (timestamp) - 7 days later!
}
```
**Encoded as:** `eyJpZCI6IjEyMyIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwic3RhdHVzIjoiYXBwcm92ZWQiLCJpYXQiOjE3MDEyMzQ1NjcsImV4cCI6MTcwMTgzOTM2N30`

### 3. Signature (Third Part)
```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  JWT_SECRET
)
```
**Encoded as:** `SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`

The signature proves the token hasn't been tampered with!

---

## 🔄 How JWT Tokens Work in Your System

### Step 1: User Logs In

```javascript
// User enters email and password
POST /api/auth/login
Body: { email: "user@example.com", password: "password123" }
```

### Step 2: Server Creates JWT Token

**Your Code (auth.service.js):**
```javascript
export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,              // User's unique ID
      email: user.email,        // User's email
      role: user.role,          // "user" or "admin"
      status: user.status,      // "pending", "approved", "rejected"
    },
    JWT_SECRET,                 // Secret key (from .env)
    { expiresIn: '7d' }         // Expires in 7 days
  );
};
```

**What happens:**
1. Server takes user info (id, email, role, status)
2. Adds timestamp (when issued)
3. Adds expiration (7 days from now)
4. Signs it with secret key
5. Returns the token

**Response:**
```json
{
  "user": {
    "id": "123e4567...",
    "email": "user@example.com",
    "role": "user",
    "status": "approved"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Step 3: Frontend Stores Token

**Your Code (AuthContext.jsx):**
```javascript
signInWithPassword: async (email, password) => {
  const { user, token: newToken } = await apiLogin(email, password);
  
  // Store token in localStorage
  setAuthToken(newToken);
  setToken(newToken);
  localStorage.setItem('auth_token', newToken);
}
```

**Where it's stored:**
- **Web App:** `localStorage.getItem('auth_token')`
- **Mobile App:** Secure storage (Keychain/Keystore)

### Step 4: Token Sent with Every Request

**Your Code (httpClient.js):**
```javascript
async function request(path, { method = 'GET', body, headers = {} }) {
  const token = await getAccessToken();  // Gets token from localStorage
  
  const defaultHeaders = {};
  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;  // Add token to header
  }
  
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { ...defaultHeaders, ...headers },
    body: JSON.stringify(body)
  });
}
```

**Example Request:**
```http
GET /api/auth/me
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Step 5: Server Verifies Token

**Your Code (middleware/auth.js):**
```javascript
export const requireAuth = async (req, res, next) => {
  // 1. Extract token from header
  const token = parseToken(req);  // Gets "Bearer <token>"
  
  // 2. Verify token
  const decoded = verifyToken(token);
  // This checks:
  //   - Token signature is valid (not tampered)
  //   - Token hasn't expired (still within 7 days)
  //   - Token was signed with correct secret key
  
  // 3. Get user from database
  const user = await findUserById(decoded.id);
  
  // 4. Attach user to request
  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status
  };
  
  // 5. Continue to route handler
  next();
};
```

**Your Code (auth.service.js):**
```javascript
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
    // This automatically:
    // - Verifies signature
    // - Checks expiration
    // - Returns decoded payload if valid
  } catch (err) {
    throw new Error('Invalid or expired token');
  }
};
```

---

## ⏰ Why 24 Hours?

### Current Setting

**Your Code:**
```javascript
const JWT_EXPIRES_IN = '24h';  // Token expires in 24 hours (improved security)
```

### Why 24 Hours?

**Balance between Security and User Experience:**

| Duration | Pros | Cons |
|----------|------|------|
| **1 hour** | Very secure | Users must login frequently (annoying) |
| **24 hours** | ✅ Secure & balanced | ✅ Users login daily (good security) |
| **7 days** | Convenient | Less secure (stolen token works longer) |
| **30 days** | Very convenient | Less secure (stolen token works longer) |
| **Never expires** | Very convenient | Very insecure (stolen token works forever) |

### Why 24 Hours is Good:

1. **User Experience:**
   - Users login once per day (reasonable)
   - Mobile apps stay logged in during active use
   - Good balance between convenience and security

2. **Security:**
   - If token is stolen, it only works for 24 hours maximum
   - Forces daily re-authentication
   - Significantly limits damage window
   - Better security than longer expiration times

3. **Industry Standard:**
   - Many security-focused apps use 24 hours
   - Good balance for applications handling sensitive data

### You Can Change It!

If you want a different duration, change this in `server/src/services/auth.service.js`:

```javascript
// Current
const JWT_EXPIRES_IN = '7d';

// Options:
const JWT_EXPIRES_IN = '1h';    // 1 hour
const JWT_EXPIRES_IN = '24h';   // 1 day
const JWT_EXPIRES_IN = '14d';   // 2 weeks
const JWT_EXPIRES_IN = '30d';   // 1 month
```

**Format options:**
- `'1h'` = 1 hour
- `'1d'` = 1 day
- `'7d'` = 7 days
- `'30d'` = 30 days
- `'365d'` = 1 year

---

## 🔒 Security Features

### 1. Signature Verification

The token is **signed** with a secret key (`JWT_SECRET`). This means:

✅ **Server can verify** the token wasn't tampered with
✅ **If someone changes** the payload, signature won't match
✅ **Token is rejected** if signature is invalid

**Example:**
```javascript
// Valid token
const token = jwt.sign({ id: "123" }, JWT_SECRET);
jwt.verify(token, JWT_SECRET);  // ✅ Works

// Tampered token
const fakeToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQ1NiJ9.fake";
jwt.verify(fakeToken, JWT_SECRET);  // ❌ Throws error
```

### 2. Expiration Check

The token has an `exp` (expiration) field built-in:

```json
{
  "exp": 1701839367  // Unix timestamp: Jan 1, 2024 12:00:00 AM
}
```

**What happens when expired:**
```javascript
// Token expired
jwt.verify(expiredToken, JWT_SECRET);
// ❌ Throws: "TokenExpiredError: jwt expired"
```

**Your code handles this:**
```javascript
// middleware/auth.js
try {
  const decoded = verifyToken(token);  // Checks expiration automatically
} catch (jwtError) {
  return next(createError(401, 'Invalid or expired token'));
}

// AuthContext.jsx - Shows friendly message
if (err?.status === 401) {
  sessionStorage.setItem('session_expired', 'true');
  // Clears token and redirects to login
}

// Login.jsx - Displays message
useEffect(() => {
  const sessionExpired = sessionStorage.getItem('session_expired');
  if (sessionExpired === 'true') {
    setStatus({ 
      type: 'error', 
      message: 'Your session has expired. Please log in again.' 
    });
  }
}, []);
```

### 3. No Password Storage

**Important:** The JWT token does **NOT** contain the password!

```json
{
  "id": "123",
  "email": "user@example.com",
  "role": "user",
  "status": "approved"
  // ❌ NO password field!
}
```

### 4. Secret Key Protection

The `JWT_SECRET` is stored in environment variables (`.env` file):

```env
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
```

**Never commit this to Git!** It's in `.gitignore`.

---

## 🔄 Token Lifecycle

### Day 1: User Logs In
```
User enters password → Server creates token → Token expires in 24 hours
Token stored: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
Expires: Jan 2, 2024 12:00 PM (24 hours later)
```

### Within 24 Hours: User Uses App
```
Every API request includes token
Server verifies token (checks signature + expiration)
✅ Token still valid → Request succeeds
```

### After 24 Hours: Token Expires
```
User makes API request
Server checks token expiration
❌ Token expired → Returns 401 Unauthorized
Frontend detects 401 → Shows message: "Your session has expired. Please log in again."
Frontend clears token → Redirects to login page
```

**Your Code (AuthContext.jsx):**
```javascript
useEffect(() => {
  const loadProfile = async () => {
    try {
      const user = await fetchCurrentUser();
      setProfile(user);
    } catch (err) {
      // Handle 401 errors (token expired)
      if (err?.status === 401) {
        console.log('🔒 Session expired - clearing session');
        setToken(null);           // Clear token
        setProfile(null);         // Clear user data
        setAuthToken(null);       // Clear from localStorage
      }
    }
  };
  loadProfile();
}, [token]);
```

---

## 🆚 JWT Token vs Password

| Feature | Password | JWT Token |
|---------|----------|-----------|
| **When used** | Only during login | Every API request |
| **Stored where** | Database (hashed) | Client (localStorage/Keychain) |
| **Expires** | Never (until changed) | 7 days |
| **Contains** | Nothing (hashed) | User ID, email, role, status |
| **Security** | Very secure (bcrypt) | Secure (signed, expires) |
| **Purpose** | Prove identity once | Prove identity repeatedly |

---

## 🛡️ What Happens If Token is Stolen?

### Scenario: Someone steals your JWT token

**Bad news:**
- They can make API requests as you
- They have access until token expires (7 days max)

**Good news:**
- They **cannot** change your password (needs current password)
- They **cannot** see your password (not in token)
- Token **expires** in 7 days (limited damage window)
- You can **revoke access** by changing password (forces new login)

### How to Revoke a Token

**Option 1: Change Password**
```javascript
// User changes password
POST /api/auth/update-password
// This doesn't invalidate existing tokens, but...
// If you implement token blacklisting, you can invalidate all tokens
```

**Option 2: Wait for Expiration**
- Token expires in 7 days automatically
- Stolen token becomes useless

**Option 3: Implement Token Blacklisting (Advanced)**
- Store revoked tokens in database
- Check blacklist during verification
- Reject blacklisted tokens

---

## 📱 Mobile App Considerations

### Token Storage

**Web App:**
```javascript
localStorage.setItem('auth_token', token);
```

**Mobile App (React Native):**
```javascript
import * as SecureStore from 'expo-secure-store';

// Store token securely
await SecureStore.setItemAsync('auth_token', token);

// Retrieve token
const token = await SecureStore.getItemAsync('auth_token');
```

**Why Secure Storage?**
- iOS Keychain: Encrypted by OS
- Android Keystore: Hardware-backed encryption
- More secure than localStorage

### Token Refresh (Optional Enhancement)

Currently, tokens expire after 7 days. You could implement **token refresh**:

```javascript
// Current: User must login again after 7 days
// Enhanced: Automatically refresh token before expiration

// If token expires in < 1 day, refresh it
if (tokenExpiresIn < 24 hours) {
  const newToken = await refreshToken(oldToken);
  // User stays logged in seamlessly
}
```

**This is optional** - your current 7-day expiration works fine!

---

## 🔍 How to Inspect a JWT Token

### Online Tool

Go to [jwt.io](https://jwt.io) and paste your token to see:

1. **Header** - Algorithm and type
2. **Payload** - User data, expiration, etc.
3. **Signature** - Verification signature

**Note:** Don't paste real production tokens on public websites!

### Decode in Code

```javascript
// Decode without verification (just to see contents)
const decoded = jwt.decode(token);
console.log(decoded);
// {
//   id: "123e4567...",
//   email: "user@example.com",
//   role: "user",
//   status: "approved",
//   iat: 1701234567,
//   exp: 1701839367
// }
```

---

## ✅ Summary

### What is JWT Token?
- A **signed, encoded** piece of data that proves your identity
- Contains: user ID, email, role, status, expiration
- Replaces password for repeated authentication

### Why 24 Hours?
- **Balance** between security and user experience
- Users login once per day (good security)
- Stolen tokens only work for 24 hours max
- Industry standard for security-focused applications

### How It Works:
1. User logs in with password → Gets JWT token
2. Token stored locally (localStorage/Keychain)
3. Token sent with every API request
4. Server verifies token (signature + expiration)
5. Token expires after 24 hours → Shows message: "Your session has expired. Please log in again."
6. User must login again to get a new token

### Security:
- ✅ Signed with secret key (can't be tampered)
- ✅ Expires automatically (7 days)
- ✅ No password in token
- ✅ Server verifies on every request

**Your system is secure and user-friendly!** 🎉

