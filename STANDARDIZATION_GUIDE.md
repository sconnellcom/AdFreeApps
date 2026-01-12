# App Header and Menu Standardization Guide

This document describes the standardized header and menu system implemented across AdFreeApps applications.

## Overview

All apps (except `draw` and `game-tracker` which are excluded per requirements) now use a consistent header with:
- App icon and title (left-aligned)
- Hamburger menu (right-aligned)
- Dropdown menu with standard and app-specific items

## Reference Implementation

The **metronome** app serves as the complete reference implementation with all three components (HTML, CSS, JavaScript) fully integrated and tested.

## Standard Menu Items

Every app menu includes:
1. 💎 **Apps** - Links to home page (/)
2. 🎨 **Change Theme** - Opens theme color picker submenu
3. ⓘ **About This App** - Links to the app's about page

Apps can add additional menu items as needed (e.g., metronome has Statistics and Activity Log).

## Implementation Components

### 1. HTML Structure

```html
<!-- Standardized Header -->
<div class="header-row">
    <div class="header-left">
        <span class="app-icon">[ICON]</span>
        <h1>[App Name]</h1>
    </div>
    <div class="header-right">
        <button id="menuBtn" class="menu-btn" title="Menu">
            <span class="hamburger-icon">
                <span></span>
                <span></span>
                <span></span>
            </span>
        </button>
    </div>
</div>

<!-- Menu Dropdown -->
<div id="menuDropdown" class="menu-dropdown" style="display: none;">
    <a href="../" class="menu-item">
        <span class="menu-icon">💎</span>
        <span class="menu-label">Apps</span>
    </a>
    <button id="themeMenuItem" class="menu-item menu-item-button">
        <span class="menu-icon" id="themeMenuIcon">💜</span>
        <span class="menu-label">Change Theme</span>
    </button>
    <div id="themeSubmenu" class="theme-submenu" style="display: none;">
        <!-- Theme color buttons -->
    </div>
    <a href="about/" class="menu-item">
        <span class="menu-icon">ⓘ</span>
        <span class="menu-label">About This App</span>
    </a>
    <!-- Additional app-specific menu items here -->
</div>
```

### 2. CSS Styles

See `/tmp/header-menu-styles.css` for the complete CSS that needs to be added to each app's stylesheet.

Key classes:
- `.header-row`, `.header-left`, `.header-right` - Header layout
- `.app-icon` - App icon styling
- `.menu-btn`, `.hamburger-icon` - Hamburger button
- `.menu-dropdown`, `.menu-item` - Menu dropdown and items
- `.theme-submenu`, `.theme-btn` - Theme picker submenu

### 3. JavaScript Integration

Each app needs to:
1. Get references to menu elements (menuBtn, menuDropdown, themeMenuItem, themeSubmenu, themeMenuIcon)
2. Set up event listeners for menu interactions
3. Update theme icon when theme changes
4. Handle app-specific menu items

Example theme icon mapping:
```javascript
const themeIcons = {
    'default': '💜', 'black': '⚫', 'blue': '🔵', 'blue-dark': '🌊',
    'light': '🍋', 'dark': '🫒', 'warm-light': '🌻', 'warm-dark': '🍂',
    'red': '❤️', 'red-dark': '🌹', 'pink': '💗', 'pink-dark': '🌸'
};
```

## Home Page Changes

The home page (index.html) has been updated to:
1. Move theme picker from fixed position to last app card
2. Add "Learn More" link in footer that goes to /about/
3. Display theme dropdown above the card to prevent off-screen issues
4. Update theme icon dynamically based on selection

## Implementation Status

### Completed ✅
- index.html (home page)
- metronome (full implementation - HTML, CSS, JS)

### In Progress
- tuner (HTML updated, needs CSS/JS)

### Pending
- timer
- pad
- level
- scrollfix
- tachistoscope
- morse-code
- tasker

### Excluded (Per Requirements)
- draw
- game-tracker

## Testing Checklist

For each app, verify:
- [ ] Header displays with icon and title on left, menu button on right
- [ ] Clicking menu button opens dropdown
- [ ] "Apps" link navigates to home page
- [ ] "Change Theme" opens color picker submenu
- [ ] Selecting a theme changes colors and updates menu icon
- [ ] "About This App" navigates to about page
- [ ] App-specific menu items work correctly
- [ ] Clicking outside menu closes it
- [ ] Menu doesn't go off screen on mobile

## Notes

- Theme selection is synchronized across all apps using `localStorage.setItem('appTheme', theme)`
- The diamond icon (💎) represents the AdFreeApps logo/home
- Theme icons provide visual feedback for current theme selection
- All apps maintain their existing functionality; only the header/menu presentation changes
