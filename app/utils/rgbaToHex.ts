/**
 * Converts an RGBA color value to a hexadecimal color string.
 *
 * @param {number} r - The red color value (0-255).
 * @param {number} g - The green color value (0-255).
 * @param {number} b - The blue color value (0-255).
 * @param {number} [a=1] - The alpha (transparency) value (0-1). Optional, defaults to 1 (fully opaque).
 * @returns {string} The hexadecimal color string (e.g., "#RRGGBBAA" or "#RRGGBB").
 * @throws {Error} Throws an error if any color value is out of range.
 */
export default function rgbaToHex(r: number, g: number, b: number, a: number = 1): string {
    // Validate input values
    if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
      throw new Error("Invalid RGB color values. Values must be between 0 and 255.");
    }
    if (a < 0 ) {
      //throw new Error("Invalid alpha value. Alpha must be between 0 and 1.");
        a=0;
    } else if (a > 1) {
        a=1;
    }
  
    // Convert RGB to hex
    const rHex = r.toString(16).padStart(2, "0");
    const gHex = g.toString(16).padStart(2, "0");
    const bHex = b.toString(16).padStart(2, "0");
  
    // Convert alpha to hex (0-255)
    const aHex = Math.round(a * 255).toString(16).padStart(2, "0");
  
    // Return hex string
    if (a === 1) {
      return `#${rHex}${gHex}${bHex}`;
    } else {
      return `#${rHex}${gHex}${bHex}${aHex}`;
    }
  }