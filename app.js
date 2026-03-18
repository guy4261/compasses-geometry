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
        this.hoveredPoint = null;
        this.draggedModal = null;
        this.modalDragOffset = { x: 0, y: 0 };
        
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

        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));
        this.canvas.addEventListener('contextmenu', (e) => this.handleContextMenu(e));

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

        // Update cursor
        if (tool === 'select') {
            this.canvas.classList.add('select-mode');
        } else {
            this.canvas.classList.remove('select-mode');
        }

        this.updateInstructions();
        this.render();
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
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    handleMouseDown(e) {
        if (e.button !== 0) return; // Only left click
        if (this.isDraggingModal) return; // Don't interact with canvas while dragging modal
        
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
        if (this.isDragging) {
            this.isDragging = false;
            this.canvas.classList.remove('dragging');
        }
    }

    handleMouseLeave(e) {
        this.isDragging = false;
        this.canvas.classList.remove('dragging');
        this.hoveredPoint = null;
        this.render();
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
        }
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
