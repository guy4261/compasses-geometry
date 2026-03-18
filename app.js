/**
 * Main application logic for the Geometry Drawing Tool
 */

class GeometryApp {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Drawing state
        this.points = [];
        this.lines = [];
        this.circles = [];
        
        // Tool state
        this.currentTool = 'point';
        this.selectedPoint = null;
        this.tempSelection = null; // For line and compass tools
        
        // Interaction state
        this.isDragging = false;
        this.isDraggingModal = false;
        this.isPanning = false;
        this.hoveredPoint = null;
        this.draggedModal = null;
        this.modalDragOffset = { x: 0, y: 0 };
        this.lastPanPoint = { x: 0, y: 0 };
        
        // Zoom and pan state
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        
        // UI elements
        this.contextMenu = document.getElementById('context-menu');
        this.instructions = document.getElementById('instructions');
        
        this.setupCanvas();
        this.setupEventListeners();
        this.setupModals();
        this.updateInstructions();
        this.render();
    }

    setupCanvas() {
        // Set canvas to full viewport size
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupEventListeners() {
        // Tool buttons
        document.getElementById('tool-point').addEventListener('click', () => this.setTool('point'));
        document.getElementById('tool-line').addEventListener('click', () => this.setTool('line'));
        document.getElementById('tool-compass').addEventListener('click', () => this.setTool('compass'));
        document.getElementById('tool-select').addEventListener('click', () => this.setTool('select'));
        document.getElementById('clear-all').addEventListener('click', () => this.clearAll());
        
        // Zoom buttons
        document.getElementById('zoom-in').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out').addEventListener('click', () => this.zoomOut());
        document.getElementById('zoom-reset').addEventListener('click', () => this.resetZoom());

        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));
        this.canvas.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));

        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('click', (e) => {
            if (!this.contextMenu.contains(e.target)) {
                this.hideContextMenu();
            }
        });

        // Context menu
        this.contextMenu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action === 'delete' && this.selectedPoint) {
                this.deletePoint(this.selectedPoint);
                this.hideContextMenu();
            }
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.render();
        });
    }

    setupModals() {
        const modals = document.querySelectorAll('.modal');
        
        modals.forEach(modal => {
            const header = modal.querySelector('.modal-header');
            const minimizeBtn = modal.querySelector('[data-action="minimize"]');
            
            // Dragging functionality
            header.addEventListener('mousedown', (e) => {
                if (e.target.closest('.modal-control-btn')) return;
                
                this.isDraggingModal = true;
                this.draggedModal = modal;
                
                const rect = modal.getBoundingClientRect();
                this.modalDragOffset = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
                
                modal.style.transition = 'none';
                e.preventDefault();
            });
            
            // Minimize functionality
            minimizeBtn.addEventListener('click', () => {
                modal.classList.toggle('minimized');
            });
        });
        
        // Global mouse events for modal dragging
        document.addEventListener('mousemove', (e) => {
            if (this.isDraggingModal && this.draggedModal) {
                const x = e.clientX - this.modalDragOffset.x;
                const y = e.clientY - this.modalDragOffset.y;
                
                // Keep modal within viewport bounds
                const maxX = window.innerWidth - this.draggedModal.offsetWidth;
                const maxY = window.innerHeight - 40; // Keep at least header visible
                
                this.draggedModal.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
                this.draggedModal.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
                this.draggedModal.style.right = 'auto';
                this.draggedModal.style.bottom = 'auto';
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isDraggingModal && this.draggedModal) {
                this.draggedModal.style.transition = '';
                this.isDraggingModal = false;
                this.draggedModal = null;
            }
        });
    }

    setTool(tool) {
        this.currentTool = tool;
        this.tempSelection = null;
        this.selectedPoint = null;
        
        // Update button states
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`tool-${tool}`).classList.add('active');

        this.updateCanvasCursor();
        this.updateInstructions();
        this.render();
    }

    updateCanvasCursor() {
        this.canvas.classList.remove('select-mode', 'dragging');
        
        if (this.isPanning) {
            this.canvas.style.cursor = 'grabbing';
        } else if (this.currentTool === 'select') {
            this.canvas.classList.add('select-mode');
            this.canvas.style.cursor = 'default';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }
    }

    updateInstructions() {
        const instructions = {
            point: 'Click to place a point',
            line: this.tempSelection ? 'Click a second point to draw a line' : 'Click a point to start a line',
            compass: this.tempSelection ? 'Click a line to set the radius' : 'Click a point to set the center',
            select: 'Click to select, drag to move, right-click or Delete to remove'
        };

        document.querySelector('.instruction-text').textContent = instructions[this.currentTool];
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        
        // Transform from screen coordinates to world coordinates
        return {
            x: (canvasX - this.panX) / this.zoom,
            y: (canvasY - this.panY) / this.zoom
        };
    }

    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.panX) / this.zoom,
            y: (screenY - this.panY) / this.zoom
        };
    }

    worldToScreen(worldX, worldY) {
        return {
            x: worldX * this.zoom + this.panX,
            y: worldY * this.zoom + this.panY
        };
    }

    handleMouseDown(e) {
        if (this.isDraggingModal) return; // Don't interact with canvas while dragging modal
        
        // Middle mouse button or space+left click for panning
        if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
            this.isPanning = true;
            const rect = this.canvas.getBoundingClientRect();
            this.lastPanPoint = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            this.canvas.style.cursor = 'grabbing';
            e.preventDefault();
            return;
        }
        
        if (e.button !== 0) return; // Only left click for tools
        
        const pos = this.getMousePos(e);
        
        switch (this.currentTool) {
            case 'point':
                this.addPoint(pos.x, pos.y);
                break;
                
            case 'line':
                this.handleLineTool(pos.x, pos.y);
                break;
                
            case 'compass':
                this.handleCompassTool(pos.x, pos.y);
                break;
                
            case 'select':
                const point = findClosestPoint(this.points, pos.x, pos.y);
                if (point) {
                    this.selectedPoint = point;
                    this.isDragging = true;
                    this.canvas.classList.add('dragging');
                } else {
                    this.selectedPoint = null;
                }
                this.render();
                break;
        }
    }

    handleMouseMove(e) {
        if (this.isDraggingModal) return; // Don't interact with canvas while dragging modal
        
        // Handle panning
        if (this.isPanning) {
            const rect = this.canvas.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            
            const deltaX = currentX - this.lastPanPoint.x;
            const deltaY = currentY - this.lastPanPoint.y;
            
            this.panX += deltaX;
            this.panY += deltaY;
            
            this.lastPanPoint = { x: currentX, y: currentY };
            this.render();
            return;
        }
        
        const pos = this.getMousePos(e);

        // Handle dragging in select mode
        if (this.isDragging && this.selectedPoint) {
            this.selectedPoint.x = pos.x;
            this.selectedPoint.y = pos.y;
            this.updateIntersections();
            this.render();
            return;
        }

        // Update hover state for all tools
        const hoveredPoint = findClosestPoint(this.points, pos.x, pos.y);
        if (hoveredPoint !== this.hoveredPoint) {
            this.hoveredPoint = hoveredPoint;
            this.render();
        }
    }

    handleMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.updateCanvasCursor();
        }
        
        if (this.isDragging) {
            this.isDragging = false;
            this.canvas.classList.remove('dragging');
        }
    }

    handleMouseLeave(e) {
        this.isDragging = false;
        this.isPanning = false;
        this.canvas.classList.remove('dragging');
        this.updateCanvasCursor();
        this.hoveredPoint = null;
        this.render();
    }

    handleWheel(e) {
        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Get world position before zoom
        const worldPos = this.screenToWorld(mouseX, mouseY);
        
        // Update zoom
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const newZoom = Math.max(0.1, Math.min(10, this.zoom * zoomFactor));
        
        if (newZoom !== this.zoom) {
            this.zoom = newZoom;
            
            // Adjust pan to keep mouse position fixed
            const newScreenPos = this.worldToScreen(worldPos.x, worldPos.y);
            this.panX += mouseX - newScreenPos.x;
            this.panY += mouseY - newScreenPos.y;
            
            this.updateZoomDisplay();
            this.render();
        }
    }

    handleContextMenu(e) {
        e.preventDefault();
        
        const pos = this.getMousePos(e);
        const point = findClosestPoint(this.points, pos.x, pos.y);
        
        if (point) {
            this.selectedPoint = point;
            this.showContextMenu(e.clientX, e.clientY);
            this.render();
        }
    }

    handleKeyDown(e) {
        if (!this.selectedPoint) return;

        const moveDistance = e.shiftKey ? 10 : 1;

        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                this.selectedPoint.y -= moveDistance;
                this.updateIntersections();
                this.render();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.selectedPoint.y += moveDistance;
                this.updateIntersections();
                this.render();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.selectedPoint.x -= moveDistance;
                this.updateIntersections();
                this.render();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.selectedPoint.x += moveDistance;
                this.updateIntersections();
                this.render();
                break;
            case 'Delete':
            case 'Backspace':
                e.preventDefault();
                this.deletePoint(this.selectedPoint);
                break;
            case 'p':
            case 'P':
                this.setTool('point');
                break;
            case 'l':
            case 'L':
                this.setTool('line');
                break;
            case 'o':
            case 'O':
                this.setTool('compass');
                break;
            case 'i':
            case 'I':
                this.setTool('select');
                break;
            case 'Escape':
                this.tempSelection = null;
                this.selectedPoint = null;
                this.updateInstructions();
                this.render();
                break;
            case '+':
            case '=':
                this.zoomIn();
                break;
            case '-':
            case '_':
                this.zoomOut();
                break;
            case '0':
                this.resetZoom();
                break;
        }
    }

    zoomIn() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const worldPos = this.screenToWorld(centerX, centerY);
        
        this.zoom = Math.min(10, this.zoom * 1.2);
        
        const newScreenPos = this.worldToScreen(worldPos.x, worldPos.y);
        this.panX += centerX - newScreenPos.x;
        this.panY += centerY - newScreenPos.y;
        
        this.updateZoomDisplay();
        this.render();
    }

    zoomOut() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const worldPos = this.screenToWorld(centerX, centerY);
        
        this.zoom = Math.max(0.1, this.zoom / 1.2);
        
        const newScreenPos = this.worldToScreen(worldPos.x, worldPos.y);
        this.panX += centerX - newScreenPos.x;
        this.panY += centerY - newScreenPos.y;
        
        this.updateZoomDisplay();
        this.render();
    }

    resetZoom() {
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.updateZoomDisplay();
        this.render();
    }

    updateZoomDisplay() {
        const zoomPercent = Math.round(this.zoom * 100);
        document.getElementById('zoom-level').textContent = `${zoomPercent}%`;
    }

    addPoint(x, y, isIntersection = false) {
        // Don't add if too close to existing point
        const existing = findClosestPoint(this.points, x, y, 8);
        if (existing) return existing;

        const point = new Point(x, y, isIntersection);
        this.points.push(point);
        this.render();
        return point;
    }

    handleLineTool(x, y) {
        const point = findClosestPoint(this.points, x, y);
        
        if (!point) return;

        if (!this.tempSelection) {
            this.tempSelection = point;
            this.updateInstructions();
            this.render();
        } else {
            if (point !== this.tempSelection) {
                // Check if line already exists
                const lineExists = this.lines.some(line => 
                    (line.point1 === this.tempSelection && line.point2 === point) ||
                    (line.point2 === this.tempSelection && line.point1 === point)
                );

                if (!lineExists) {
                    this.lines.push(new Line(this.tempSelection, point));
                    this.updateIntersections();
                }
            }
            this.tempSelection = null;
            this.updateInstructions();
            this.render();
        }
    }

    handleCompassTool(x, y) {
        if (!this.tempSelection) {
            // Select center point
            const point = findClosestPoint(this.points, x, y);
            if (point) {
                this.tempSelection = point;
                this.updateInstructions();
                this.render();
            }
        } else {
            // Select line for radius
            const line = findClosestLine(this.lines, x, y, 15);
            if (line) {
                const circle = new Circle(this.tempSelection, line.length);
                this.circles.push(circle);
                this.updateIntersections();
                this.tempSelection = null;
                this.updateInstructions();
                this.render();
            }
        }
    }

    updateIntersections() {
        // Remove all old intersection points
        this.points = this.points.filter(p => !p.isIntersection);

        // Calculate all circle-circle intersections
        for (let i = 0; i < this.circles.length; i++) {
            for (let j = i + 1; j < this.circles.length; j++) {
                const intersections = getCircleCircleIntersection(this.circles[i], this.circles[j]);
                
                for (const intersection of intersections) {
                    // Check if an intersection point already exists nearby
                    const existing = findClosestPoint(this.points, intersection.x, intersection.y, 5);
                    if (!existing) {
                        this.points.push(intersection);
                    }
                }
            }
        }

        // Calculate all line-line intersections
        for (let i = 0; i < this.lines.length; i++) {
            for (let j = i + 1; j < this.lines.length; j++) {
                const intersections = getLineLineIntersection(this.lines[i], this.lines[j]);
                
                for (const intersection of intersections) {
                    // Check if an intersection point already exists nearby
                    const existing = findClosestPoint(this.points, intersection.x, intersection.y, 5);
                    if (!existing) {
                        this.points.push(intersection);
                    }
                }
            }
        }

        // Calculate all line-circle intersections
        for (let i = 0; i < this.lines.length; i++) {
            for (let j = 0; j < this.circles.length; j++) {
                const intersections = getLineCircleIntersection(this.lines[i], this.circles[j]);
                
                for (const intersection of intersections) {
                    // Check if an intersection point already exists nearby
                    const existing = findClosestPoint(this.points, intersection.x, intersection.y, 5);
                    if (!existing) {
                        this.points.push(intersection);
                    }
                }
            }
        }
    }

    deletePoint(point) {
        // Remove the point
        this.points = this.points.filter(p => p !== point);
        
        // Remove lines connected to this point
        this.lines = this.lines.filter(line => !line.containsPoint(point));
        
        // Remove circles centered on this point
        this.circles = this.circles.filter(circle => !circle.containsPoint(point));
        
        // Update intersections
        this.updateIntersections();
        
        this.selectedPoint = null;
        this.render();
    }

    clearAll() {
        if (this.points.length === 0 && this.lines.length === 0 && this.circles.length === 0) {
            return;
        }

        if (confirm('Clear all points, lines, and circles?')) {
            this.points = [];
            this.lines = [];
            this.circles = [];
            this.selectedPoint = null;
            this.tempSelection = null;
            this.render();
        }
    }

    showContextMenu(x, y) {
        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;
        this.contextMenu.classList.remove('hidden');
    }

    hideContextMenu() {
        this.contextMenu.classList.add('hidden');
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save the current context state
        this.ctx.save();
        
        // Apply zoom and pan transformations
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoom, this.zoom);

        // Draw grid (subtle)
        this.drawGrid();

        // Draw circles
        for (const circle of this.circles) {
            this.drawCircle(circle);
        }

        // Draw lines
        for (const line of this.lines) {
            this.drawLine(line);
        }

        // Draw points
        for (const point of this.points) {
            const isSelected = point === this.selectedPoint;
            const isHovered = point === this.hoveredPoint;
            const isTemp = point === this.tempSelection;
            this.drawPoint(point, isSelected, isHovered, isTemp);
        }

        // Draw temporary line preview
        if (this.currentTool === 'line' && this.tempSelection && this.hoveredPoint) {
            this.drawPreviewLine(this.tempSelection, this.hoveredPoint);
        }

        // Draw temporary compass preview
        if (this.currentTool === 'compass' && this.tempSelection) {
            this.drawCompassPreview(this.tempSelection);
        }
        
        // Restore the context state
        this.ctx.restore();
    }

    drawGrid() {
        const gridSize = 50;
        this.ctx.strokeStyle = '#f0f0f0';
        this.ctx.lineWidth = 1;

        // Vertical lines
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawPoint(point, isSelected = false, isHovered = false, isTemp = false) {
        const radius = point.isIntersection ? 4 : 6;
        
        // Draw outer ring for selected/hovered/temp
        if (isSelected || isHovered || isTemp) {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, radius + 4, 0, Math.PI * 2);
            
            if (isSelected) {
                this.ctx.strokeStyle = '#667eea';
                this.ctx.lineWidth = 3;
            } else if (isTemp) {
                this.ctx.strokeStyle = '#ffa500';
                this.ctx.lineWidth = 2;
            } else {
                this.ctx.strokeStyle = '#999';
                this.ctx.lineWidth = 2;
            }
            
            this.ctx.stroke();
        }

        // Draw point
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        
        if (point.isIntersection) {
            this.ctx.fillStyle = '#ff6b6b';
        } else {
            this.ctx.fillStyle = '#333';
        }
        
        this.ctx.fill();

        // Draw white center dot
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, radius - 2, 0, Math.PI * 2);
        this.ctx.fillStyle = 'white';
        this.ctx.fill();
    }

    drawLine(line) {
        this.ctx.beginPath();
        this.ctx.moveTo(line.point1.x, line.point1.y);
        this.ctx.lineTo(line.point2.x, line.point2.y);
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    drawCircle(circle) {
        this.ctx.beginPath();
        this.ctx.arc(circle.center.x, circle.center.y, circle.radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#4a90e2';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    drawPreviewLine(point1, point2) {
        this.ctx.beginPath();
        this.ctx.moveTo(point1.x, point1.y);
        this.ctx.lineTo(point2.x, point2.y);
        this.ctx.strokeStyle = '#999';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawCompassPreview(centerPoint) {
        // Draw a small circle indicator at center
        this.ctx.beginPath();
        this.ctx.arc(centerPoint.x, centerPoint.y, 15, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#ffa500';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([3, 3]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new GeometryApp();
});
