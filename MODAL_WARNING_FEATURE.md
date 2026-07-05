# Modal Close Warning Feature

## Feature Added

Added confirmation dialogs when trying to close modals that contain unsaved form data.

## What It Does

When you fill out a form in a modal and then accidentally:
- Click the **X** (close button)
- Click **outside the modal** (on the gray background)

...the system will now:
1. Check if you've entered any data in the form
2. Show a confirmation dialog: **"You have unsaved changes. Are you sure you want to close?"**
3. If you click **Cancel** → Modal stays open, your data is preserved
4. If you click **OK** → Modal closes, data is lost

## Forms Protected

### 1. Trip Form Modal
**Checked fields:**
- Trip Name
- Author
- URL to route
- Length (km)
- Elevation (m)
- Description
- Selected photos

**Trigger:** Any of these fields has content

### 2. Bucket List Form Modal
**Checked fields:**
- Item Name
- Description
- URL (optional)

**Trigger:** Any of these fields has content

## When Warning DOES Show

```
Scenario 1: Partially filled form
- User enters "Monte Pisimoni" in Trip Name
- User clicks outside modal
- ⚠️ Warning: "You have unsaved changes. Are you sure you want to close?"

Scenario 2: Photo selected
- User selects 3 photos
- User clicks X button
- ⚠️ Warning appears

Scenario 3: Any field has data
- User enters "5" in Length field
- User clicks outside
- ⚠️ Warning appears
```

## When Warning Does NOT Show

```
Scenario 1: Empty form
- User opens modal
- User clicks outside immediately
- ✅ Modal closes without warning (no data to lose)

Scenario 2: After successful submit
- User fills form
- User clicks "Add Trip"
- Form is reset automatically
- ✅ Modal closes without warning
```

## Implementation Details

### Helper Functions

**`isFormDirty()`** - For trip form
```javascript
function isFormDirty() {
    // Checks if any input has value
    // Checks if any files are selected
    // Returns true if form has data
}
```

**`isBucketFormDirty()`** - For bucket list form
```javascript
function isBucketFormDirty() {
    // Checks name, description, URL fields
    // Returns true if any field has value
}
```

### Close Handlers Updated

**Before:**
```javascript
closeBtn.onclick = () => {
    modal.style.display = 'none';  // Always closes
};
```

**After:**
```javascript
closeBtn.onclick = () => {
    if (isFormDirty()) {
        if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
            return;  // Stay open if user cancels
        }
    }
    modal.style.display = 'none';
};
```

## User Experience

### Good UX
- ✅ Prevents accidental data loss
- ✅ Only shows warning when necessary (form has data)
- ✅ Clear message explains what will happen
- ✅ Easy to cancel and go back

### No Annoying Pop-ups
- ❌ Empty form → No warning (nothing to lose)
- ❌ After successful submit → No warning (already saved)
- ❌ When clicking "Add Trip" button → No warning (intentional submit)

## Testing

### Test Case 1: Trip Form Warning
1. Click "+ Add New Trip"
2. Enter "Test Trip" in Trip Name
3. Click outside the modal (on gray area)
4. **Expected:** Warning dialog appears
5. Click "Cancel"
6. **Expected:** Modal stays open, "Test Trip" still in field

### Test Case 2: No Warning When Empty
1. Click "+ Add New Trip"
2. Don't enter anything
3. Click outside the modal
4. **Expected:** Modal closes immediately, no warning

### Test Case 3: Photo Selected Triggers Warning
1. Click "+ Add New Trip"
2. Click "Choose Files" and select a photo
3. Click X button
4. **Expected:** Warning appears

### Test Case 4: Bucket List Form
1. Click "+ Add Item" in Bucket List
2. Enter "Visit Tarvisio" in Item Name
3. Click outside modal
4. **Expected:** Warning appears

## Browser Compatibility

The `confirm()` dialog is supported in all browsers:
- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

## Future Enhancements (Optional)

Could be improved with:
- Custom styled modal instead of browser confirm()
- Auto-save to localStorage
- Restore form data if accidentally closed
- Different messages for different forms

## Files Modified

- ✅ `src/trips-logic.js`
  - Added `isFormDirty()` function
  - Added `isBucketFormDirty()` function
  - Updated trip form modal close handlers
  - Updated bucket list form modal close handlers

---

**The warning system is now active! Try filling out a form and clicking outside to see it in action.** ⚠️
