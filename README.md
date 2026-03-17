# Geometry Drawing Tool

[Try it now](Live: https://guy4261.github.io/hebweek/). Built solely by [`continue.dev`](https://continue.dev).

A browser-based geometry drawing tool with ruler and compass functionality, built with vanilla JavaScript, HTML5 Canvas, and CSS.

## Features

### 🎯 Point Tool
- Click anywhere on the canvas to place points
- Points serve as anchors for lines and circles

### 📏 Ruler (Line Tool)
- Connect any two points with straight lines
- Lines can be used as radius measurements for the compass tool

### 🧭 Compass Tool
- Select a point as the center
- Select a line to use its length as the radius
- Draw perfect circles with precise measurements

### ✨ Automatic Intersections
- When circles intersect, intersection points are automatically created
- Intersection points (displayed in red) can be used just like regular points
- Connect them with lines or use them as centers for new circles

### 👆 Select & Move
- Click to select points
- Drag with mouse to reposition
- Use arrow keys for precise movement (hold Shift for 10x speed)
- When points move, connected lines and circles update dynamically
- Right-click or press Delete/Backspace to remove points

## How to Use

1. **Open the tool**: Simply open `index.html` in any modern web browser
2. **Choose a tool**: Click a tool button or use keyboard shortcuts
3. **Draw**: Follow the on-screen instructions for each tool

### Keyboard Shortcuts
- `P` - Point tool
- `L` - Line tool
- `C` - Compass tool
- `S` - Select tool
- `Delete` or `Backspace` - Delete selected point
- `Arrow keys` - Move selected point (hold Shift for faster movement)
- `Esc` - Cancel current operation

## Browser Support

Works in all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

## Technical Details

- **Zero dependencies**: Built with vanilla JavaScript
- **Responsive design**: Adapts to different screen sizes
- **Canvas-based rendering**: Smooth, hardware-accelerated graphics
- **Clean architecture**: Separated concerns (geometry math, UI, rendering)

## Files

- `index.html` - Main HTML structure and layout
- `styles.css` - All styling and responsive design
- `geometry.js` - Geometric calculations and data structures
- `app.js` - Main application logic and rendering

## Future Enhancements

Potential features for future versions:
- Angle measurement tool
- Perpendicular and parallel line construction
- Save/load constructions
- Export as PNG or SVG
- Undo/redo functionality
- Snap to grid option
- Label points and measurements

## License

MIT License - Feel free to use and modify as needed.
