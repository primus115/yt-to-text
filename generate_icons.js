// This script generates simple placeholder icons for the extension
// Run with Node.js: node generate_icons.js

const fs = require('fs');
const path = require('path');

// Function to create a simple SVG icon
function createSvgIcon(size) {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#cc0000" />
    <text x="50%" y="50%" font-family="Arial" font-size="${size/3}px" 
          fill="white" text-anchor="middle" dominant-baseline="middle">YT</text>
    <rect x="${size*0.6}" y="${size*0.6}" width="${size*0.3}" height="${size*0.3}" fill="white" />
  </svg>`;
}

// Function to convert SVG to PNG (this is a placeholder - in a real scenario you'd use a library like sharp)
// For this example, we'll just save the SVG files with .png extension
function saveSvgAsPng(svg, filePath) {
  fs.writeFileSync(filePath, svg);
  console.log(`Created ${filePath}`);
}

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

// Generate icons of different sizes
const sizes = [16, 48, 128];
sizes.forEach(size => {
  const svg = createSvgIcon(size);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  saveSvgAsPng(svg, filePath);
});

console.log('Icon generation complete!');
