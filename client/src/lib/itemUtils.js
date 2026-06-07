// Local item image paths mapping
const ITEM_IMAGES = {};

// Initialize from items directory - files are named {itemId}.png
export const getItemImageUrl = (item, fallback = null) => {
  if (!item) return fallback;
  
  // Get item ID from various possible fields
  const itemId = item.itemID || item.id || item.itemId || item._id;
  if (!itemId) return fallback;
  
  // If item already has a local image loaded, return it
  if (ITEM_IMAGES[itemId]) {
    return ITEM_IMAGES[itemId];
  }
  
  // Try to load from local path
  const localPath = `/items/${itemId}.png`;
  
  // Return the local path - the img tag will handle loading
  return localPath;
};

// Helper to get item name from localized object or string
export const getItemName = (item) => {
  if (!item) return "Unknown";
  
  // Try various name fields
  const name = item.name || item.itemName;
  if (!name) return "Unknown";
  
  // Handle localized object { en: "..." }
  if (typeof name === "object" && name.en) {
    return name.en;
  }
  
  return name;
};

// Get item rarity for styling
export const getItemRarity = (item) => {
  return (item.rarity || item.itemRarity || "common").toLowerCase();
};

// Get item value
export const getItemValue = (item) => {
  return item.value || item.price || item.vendorCost || 0;
};

// Get item quantity
export const getItemQty = (item) => {
  return item.quantity || item.count || item.amount || 1;
};
