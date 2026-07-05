# Translation System - Complete ✅

## All Website Text is Now Translatable

Every user-facing text element on the Casa Sasa website can now be translated between Czech and English through the `src/language.js` file.

## What's Translatable

### 1. Navigation & Header
- ✅ All navigation menu items
- ✅ Header subtitle
- ✅ Login/Logout buttons
- ✅ Language toggle buttons (CZ/EN)

### 2. Home Page
- ✅ Welcome title and description
- ✅ House features section (bedroom, bathroom, kitchen, garden)
- ✅ Location section
- ✅ Location link text
- ✅ Image alt attributes

### 3. How to Get Here Page
- ✅ Page title
- ✅ Travel by car section
- ✅ Travel by train section
- ✅ Parking section (all bullet points)

### 4. Instructions Page
- ✅ Check-in section
  - Water, Electricity, Gas & Boiler instructions
  - All step-by-step details
- ✅ Check-out section
  - All cleanup and shutdown steps
- ✅ Amenities & Notes section
  - WiFi, Entertainment, Plumbing, Laundry

### 5. Trips & Tips Page
- ✅ Page title and subtitle
- ✅ Filter labels (Start, Type, All options)
- ✅ Trip type options (Hike, City, Ascent, Bike, Attraction)
- ✅ Button labels (Add Trip, Edit, Delete, Map)
- ✅ Local tips section
- ✅ Nearby towns descriptions
- ✅ Bucket list section

### 6. Trip Form Modal
- ✅ Form title (Add/Edit)
- ✅ All field labels
- ✅ All placeholder texts
- ✅ Dropdown options
- ✅ Submit button

### 7. Bucket List Form Modal
- ✅ Form title (Add/Edit)
- ✅ All field labels
- ✅ Placeholder texts
- ✅ Submit button

### 8. Gallery Page
- ✅ Page title and subtitle
- ✅ Upload form labels
- ✅ Upload button

### 9. User Messages & Alerts
- ✅ Unsaved changes warning
- ✅ Trip added/updated success messages
- ✅ Trip delete confirmation
- ✅ Error messages (save failed, delete failed)
- ✅ Rating error messages
- ✅ Bucket list item messages

## Translation Keys Structure

All translations are organized in `src/language.js` under these sections:

```javascript
translations = {
    en: {
        header: { ... },
        nav: { ... },
        auth: { ... },
        home: { ... },
        howToGetHere: { ... },
        instructions: { ... },
        trips: { ... },
        tripForm: { ... },
        bucketListForm: { ... },
        gallery: { ... },
        messages: { ... }
    },
    cz: { ... }
}
```

## How to Add/Update Translations

### 1. Edit `src/language.js`

Find the appropriate section and update both English and Czech:

```javascript
// English
trips: {
    title: "Trips & Tips",
    // ...
}

// Czech
trips: {
    title: "Výlety a Tipy",
    // ...
}
```

### 2. Use Translation Keys in HTML

```html
<!-- Text content -->
<h1 data-i18n="trips.title">Trips & Tips</h1>

<!-- Placeholder text -->
<input data-i18n-placeholder="tripForm.mapUrlPlaceholder" 
       placeholder="e.g., https://...">

<!-- Alt text for images -->
<img data-i18n-alt="home.imageAlt" alt="The city of Moggio">
```

### 3. Use Translation Keys in JavaScript

```javascript
import { t } from './language.js';

// In your code
alert(t('messages.tripAddedSuccess'));
const buttonText = t('trips.addButton');
```

## Translation Attributes Supported

The `updateI18nElements()` function handles:

1. **`data-i18n`** - For text content
   ```html
   <h1 data-i18n="home.title">Welcome</h1>
   ```

2. **`data-i18n-placeholder`** - For input placeholders
   ```html
   <input data-i18n-placeholder="tripForm.urlPlaceholder" />
   ```

3. **`data-i18n-alt`** - For image alt attributes
   ```html
   <img data-i18n-alt="home.imageAlt" />
   ```

## Adding a New Language

To add a third language (e.g., Italian):

1. **Update `src/language.js`:**
   ```javascript
   export const translations = {
       en: { ... },
       cz: { ... },
       it: {
           header: { subtitle: "un appartamento nel cuore delle Alpi italiane" },
           // ... copy all keys from en/cz and translate
       }
   }
   ```

2. **Add language toggle button** in `renderLanguageToggle()`:
   ```javascript
   <a href="#" id="lang-it">IT</a>
   ```

3. **Add click handler**:
   ```javascript
   document.getElementById('lang-it').onclick = (e) => {
       e.preventDefault();
       setLanguage('it');
   };
   ```

## Files Modified for Translation System

### Core Translation System
- ✅ `src/language.js` - All translations and translation functions
  - Added `messages` section for alerts/confirms
  - Added `home.locationLink` and `home.imageAlt`
  - Updated `updateI18nElements()` to handle alt attributes

### HTML Files (data-i18n attributes added)
- ✅ `index.html` - Home page
- ✅ `how-to-get-here.html` - Travel directions
- ✅ `instructions.html` - Check-in/out instructions
- ✅ `trips.html` - Trips, filters, forms
- ✅ `gallery.html` - Gallery upload form

### JavaScript Files (using t() function)
- ✅ `src/trips-logic.js` - All alerts, confirms, and dynamic text
- ✅ `src/navigation.js` - Navigation menu
- ✅ `src/auth.js` - Auth button
- ✅ `src/main.js` - Page initialization

## Language Switching

Users can switch language by clicking **CZ** or **EN** buttons in the top-left corner.

**What happens:**
1. Language preference saved to `localStorage`
2. Page reloads
3. All text updates to selected language
4. Selection persists across sessions

## Testing Translations

1. **Switch to Czech:**
   - Click **CZ** button
   - Verify all text changes to Czech

2. **Check all pages:**
   - Home page
   - How to get here
   - Instructions
   - Trips & Tips
   - Gallery

3. **Test forms:**
   - Open trip form → Check labels are Czech
   - Fill form → Close → Check warning is Czech
   - Submit → Check success message is Czech

4. **Test actions:**
   - Try to delete a trip → Confirm dialog should be Czech
   - Rate a trip → Error messages should be Czech
   - Edit bucket list → All text should be Czech

## Notes

### What's NOT Translated
- **"CASA SASA"** - Brand name, stays the same
- **Page `<title>` tags** - Browser tab titles (could be added if needed)
- **Console.log messages** - Debug messages (intentionally English only)
- **User-generated content** - Trip names, descriptions, etc.

### Static vs Dynamic
- **Static text** (HTML) - Uses `data-i18n` attributes
- **Dynamic text** (JavaScript) - Uses `t()` function
- **Both** automatically update when language changes

## Complete Translation Coverage

✅ **100% of UI text is translatable**
✅ **All user-facing messages are translatable**
✅ **Forms, buttons, labels all support dual language**
✅ **Error messages and confirmations are translatable**

---

**The website is fully bilingual and ready for production!** 🌍
