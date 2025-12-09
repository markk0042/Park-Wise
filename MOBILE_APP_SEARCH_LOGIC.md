# Mobile App Vehicle Search Logic

This document contains the search logic that handles vehicles with multiple registrations (e.g., "191-MH-2848 / 202-D-19949").

## Problem
When a vehicle has multiple registrations stored as "191-MH-2848 / 202-D-19949", searching for just "191-MH-2848" should still find the vehicle. The web app now handles this, but the mobile app needs the same logic.

## Solution: Search Function

Here's the complete search function that handles split registrations:

```javascript
/**
 * Search for a vehicle by registration plate
 * Handles cases where vehicles have multiple registrations (e.g., "191-MH-2848 / 202-D-19949")
 * 
 * @param {string} searchTerm - The registration plate to search for (e.g., "191-MH-2848")
 * @param {Array} vehicles - Array of all vehicles from the database
 * @returns {Object|null} - The matched vehicle object, or null if not found
 */
function searchVehicle(searchTerm, vehicles) {
  if (!searchTerm || !vehicles || vehicles.length === 0) {
    return null;
  }

  const searchUpper = searchTerm.trim().toUpperCase();
  const searchLower = searchTerm.trim().toLowerCase();

  // Step 1: Try exact registration match (case insensitive)
  let vehicle = vehicles.find(v => 
    v.registration_plate?.toLowerCase() === searchLower && v.is_active
  );

  // Step 2: If no exact match, check for registrations with "/" separator (multiple registrations)
  // This handles cases like "191-MH-2848" matching "191-MH-2848 / 202-D-19949"
  if (!vehicle) {
    vehicle = vehicles.find(v => {
      if (!v.is_active) return false;
      const regUpper = v.registration_plate?.toUpperCase() || '';
      
      // First, try substring match
      // This handles cases like "191-MH-2848" matching "191-MH-2848 / 202-D-19949"
      if (regUpper.includes(searchUpper)) {
        return true;
      }
      
      // Also check if registration contains "/" and search term matches any part exactly
      // Split by "/" and also handle spaces around "/"
      // Example: "191-MH-2848 / 202-D-19949" or "191-MH-2848/202-D-19949"
      if (regUpper.includes('/')) {
        const regParts = regUpper
          .split(/\s*\/\s*/)  // Split by "/" with optional spaces
          .map(p => p.trim())
          .filter(p => p.length > 0);
        
        // Check if any part exactly matches the search term
        const partMatch = regParts.some(part => part === searchUpper);
        return partMatch;
      }
      
      return false;
    });
    
    // If found a vehicle with multiple registrations, use it but update the registration
    if (vehicle) {
      vehicle = {
        ...vehicle,
        registration_plate: searchTerm.toUpperCase() // Use the searched registration
      };
    }
  }

  // Step 3: If still no match, try permit number search
  if (!vehicle) {
    const matchingVehicles = vehicles
      .filter(v => v.is_active)
      .filter(v => {
        return v.permit_number?.toLowerCase().includes(searchLower);
      });
    
    if (matchingVehicles.length > 0) {
      vehicle = {
        ...matchingVehicles[0],
        registration_plate: searchTerm.toUpperCase()
      };
    }
  }

  // Step 4: If still no match, check if search term matches a permit number exactly
  if (!vehicle) {
    const permitMatch = vehicles.find(v => 
      v.permit_number && 
      v.permit_number.trim().toUpperCase() === searchTerm.trim().toUpperCase() &&
      v.is_active
    );
    
    if (permitMatch) {
      vehicle = permitMatch;
    }
  }

  return vehicle;
}
```

## Usage Example

```javascript
// Example usage in React Native or mobile app
const handleSearch = (searchTerm) => {
  // Get vehicles from your database/state
  const vehicles = [...]; // Your vehicles array from Supabase
  
  const matchedVehicle = searchVehicle(searchTerm, vehicles);
  
  if (matchedVehicle) {
    // Vehicle found - show permit details
    console.log('Found:', matchedVehicle.registration_plate);
    console.log('Permit:', matchedVehicle.permit_number);
    console.log('Type:', matchedVehicle.parking_type);
  } else {
    // Vehicle not found - show as unregistered
    console.log('Unregistered vehicle');
  }
};
```

## Key Features

1. **Exact Match First**: Tries to find an exact match for the registration plate
2. **Substring Match**: If no exact match, checks if the search term is contained in any registration (handles "191-MH-2848" in "191-MH-2848 / 202-D-19949")
3. **Split Registration Check**: Explicitly splits registrations by "/" and checks each part
4. **Permit Number Fallback**: Also searches by permit number if registration doesn't match
5. **Case Insensitive**: Handles uppercase/lowercase variations

## Testing

Test with these scenarios:
- Search "191-MH-2848" → Should find "191-MH-2848 / 202-D-19949"
- Search "202-D-19949" → Should find "191-MH-2848 / 202-D-19949"
- Search "191-MH-2848 / 202-D-19949" → Should find the full registration
- Search a single registration → Should find vehicles with only that registration

## Notes

- Make sure vehicles are filtered by `is_active === true` before searching
- The function returns the vehicle object with the `registration_plate` updated to match what was searched (for logging purposes)
- This logic matches exactly what the web app uses in `QuickRegistrationLog.jsx`

