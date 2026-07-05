# Troubleshooting: Trip Form Not Saving

## Issue
When submitting the "Add Trip" form, the trip is not being saved to the database.

## Debugging Steps

### 1. Check Browser Console (MOST IMPORTANT)

Open your browser's Developer Tools (F12) and check the Console tab:

1. Open the website in browser
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Try to submit a trip
5. Look for error messages

**What to look for:**
- Red error messages
- Network errors (CORS, 401, 403, 500)
- `Submitting trip form to: http://...` log
- `Response status: ...` log

### 2. Check Network Tab

In DevTools, go to the **Network** tab:

1. Open Network tab
2. Submit the trip form
3. Look for the `POST /api/trips` request
4. Click on it and check:
   - **Status Code**: Should be `200 OK`
   - **Response**: Should say "Trip added successfully"
   - **Request Payload**: Should contain your form data

**Common Issues:**
- **Status 401** = Not logged in (auth token missing/expired)
- **Status 403** = Logged in but insufficient permissions
- **Status 400** = Validation error (check Response tab for details)
- **Status 500** = Server error (check backend logs)
- **CORS error** = Frontend/backend URL mismatch

### 3. Check Backend Logs

If running backend directly:
```bash
# Backend should show logs in terminal
cd backend
node server.js
# Watch for logs when you submit the form
```

If running with Docker:
```bash
# View backend logs
./manage.sh logs

# Or manually
docker compose logs -f backend
```

**What to look for:**
```
POST /api/trips - Request received
User: { email: 'admin@example.com', role: 'admin' }
Body: { name: 'Test Trip', length: '10', ... }
Files: 0
Validation passed. Inserting trip into database...
Trip added successfully! ID: 6
```

**Common backend errors:**
```
# Not authenticated
Access denied.

# Validation error
Validation failed: Invalid trip type: ascend

# Database error
Database error: SQLITE_ERROR: no such table: trips
```

### 4. Verify You're Logged In

The trip form requires authentication:

1. Check top-right corner - should show **Logout** button
2. If it shows **Login** button, you need to log in first
3. Try logging out and logging back in

```bash
# Check auth cookie in DevTools
# Application > Cookies > auth_token should exist
```

### 5. Check Form Fields

Make sure all required fields are filled:

- ✅ Trip Name
- ✅ Author
- ✅ URL to route
- ✅ Length (km) - must be a number
- ✅ Elevation (m) - must be a number
- ✅ Difficulty - select from dropdown
- ✅ Trip Type - select from dropdown
- ✅ Start from Moggio - select Yes/No
- ✅ Drive Time - number (can be 0)
- ✅ Description

**Common validation errors:**
- Trip type "ascend" → should be "ascent"
- Empty required fields
- Non-numeric values in length/elevation

### 6. Test with Minimal Data

Try submitting with minimal data to isolate the issue:

```
Trip Name: Test Trip
Author: Test
URL: https://example.com
Length: 5
Elevation: 100
Difficulty: easy
Trip Type: hike
Start from Moggio: Yes
Drive Time: 0
Description: Test description
Photos: (none)
```

### 7. Check Database Directly

Verify trips are actually not being saved:

```bash
cd /home/amertl/Projects/casa-sasa/backend
sqlite3 trips.db "SELECT COUNT(*) FROM trips;"
sqlite3 trips.db "SELECT id, name, created_at FROM trips ORDER BY id DESC LIMIT 5;"
```

Or use management script:
```bash
./manage.sh db
SELECT * FROM trips ORDER BY id DESC LIMIT 5;
.exit
```

### 8. Common Fixes

#### Fix 1: Clear Auth Cookie and Re-login
```javascript
// In browser console
document.cookie = 'auth_token=; Max-Age=0'
// Then refresh and login again
```

#### Fix 2: Restart Backend
```bash
# If running directly
# Ctrl+C to stop, then:
cd backend
node server.js

# If running with Docker
./manage.sh restart
```

#### Fix 3: Check CORS Settings

If you see CORS errors:
```bash
# Check backend/.env
# Make sure FRONTEND_URL matches your actual URL
```

#### Fix 4: Verify Database Exists
```bash
ls -lh backend/trips.db
# If missing, backend will create it automatically
# But make sure backend has write permissions
```

## Expected Flow

When you submit the form, this should happen:

1. **Frontend** (browser console):
   ```
   Submitting trip form to: http://localhost:3000/api/trips
   Response status: 200
   ```

2. **Backend** (terminal/logs):
   ```
   POST /api/trips - Request received
   User: { email: 'admin', role: 'admin', ... }
   Body: { name: 'My Trip', length: '10', ... }
   Files: 2
   Validation passed. Inserting trip into database...
   Trip added successfully! ID: 6
   ```

3. **Result**:
   - Alert: "Trip added successfully!"
   - Form closes
   - New trip appears in the trips list

## Still Not Working?

If you've tried all the above and it still doesn't work:

### Collect Debug Information

1. **Browser Console Output** (copy all text from Console tab)
2. **Network Request Details**:
   ```
   Request URL: 
   Status Code: 
   Request Headers: 
   Request Payload: 
   Response: 
   ```
3. **Backend Logs** (last 50 lines):
   ```bash
   ./manage.sh logs | tail -50
   ```

### Check These Files Have Latest Changes

```bash
# Frontend should have logging
grep -n "console.log.*Submitting trip" src/trips-logic.js

# Backend should have logging  
grep -n "console.log.*Request received" backend/server.js
```

### Manual API Test

Test the endpoint directly using curl:

```bash
# Login first to get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"admin123"}' \
  -c cookies.txt

# Try to create a trip
curl -X POST http://localhost:3000/api/trips \
  -b cookies.txt \
  -F "name=Test Trip" \
  -F "length=10" \
  -F "elevation=500" \
  -F "difficulty=easy" \
  -F "description=Test" \
  -F "author=Test" \
  -F "map_url=https://example.com" \
  -F "trip_type=hike" \
  -F "start_from_moggio=true" \
  -F "drive_time=0"
```

If this works but the form doesn't, it's a frontend issue.
If this fails too, it's a backend issue.

## Quick Checklist

- [ ] Browser console shows no errors
- [ ] Network tab shows `POST /api/trips` with status 200
- [ ] Backend logs show "Trip added successfully"
- [ ] You are logged in (Logout button visible)
- [ ] All required form fields are filled
- [ ] Trip type is one of: hike, city, ascent, bike, attraction
- [ ] Length and elevation are numbers
- [ ] Backend server is running
- [ ] Database file exists at `backend/trips.db`
- [ ] No CORS errors in console

---

**Most likely causes:**
1. ❌ Not logged in or auth token expired
2. ❌ Trip type validation failing (using old "ascend" instead of "ascent")
3. ❌ Backend not running
4. ❌ CORS configuration issue
5. ❌ Missing required fields
