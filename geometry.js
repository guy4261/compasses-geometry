/**
 * Geometry calculation utilities for the drawing tool
 */

class Point {
    constructor(x, y, isIntersection = false) {
        this.x = x;
        this.y = y;
        this.id = `point-${Date.now()}-${Math.random()}`;
        this.isIntersection = isIntersection;
    }

    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    equals(other) {
        return this === other || this.id === other.id;
    }
}

class Line {
    constructor(point1, point2) {
        this.point1 = point1;
        this.point2 = point2;
        this.id = `line-${Date.now()}-${Math.random()}`;
    }

    get length() {
        return this.point1.distanceTo(this.point2);
    }

    containsPoint(point) {
        return this.point1.equals(point) || this.point2.equals(point);
    }
}

class Circle {
    constructor(center, radius) {
        this.center = center;
        this.radius = radius;
        this.id = `circle-${Date.now()}-${Math.random()}`;
    }

    containsPoint(point) {
        return this.center.equals(point);
    }
}

/**
 * Calculate intersection points between two circles
 */
function getCircleCircleIntersection(circle1, circle2) {
    const dx = circle2.center.x - circle1.center.x;
    const dy = circle2.center.y - circle1.center.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    // No intersection cases
    if (d > circle1.radius + circle2.radius || // Too far apart
        d < Math.abs(circle1.radius - circle2.radius) || // One inside the other
        d === 0) { // Same center
        return [];
    }

    // Calculate intersection points
    const a = (circle1.radius * circle1.radius - circle2.radius * circle2.radius + d * d) / (2 * d);
    const h = Math.sqrt(circle1.radius * circle1.radius - a * a);

    const x2 = circle1.center.x + (dx * a) / d;
    const y2 = circle1.center.y + (dy * a) / d;

    const intersectionX1 = x2 + (h * dy) / d;
    const intersectionY1 = y2 - (h * dx) / d;

    const intersectionX2 = x2 - (h * dy) / d;
    const intersectionY2 = y2 + (h * dx) / d;

    const points = [new Point(intersectionX1, intersectionY1, true)];

    // Only add second point if it's different (tangent case gives same point)
    if (Math.abs(intersectionX1 - intersectionX2) > 0.1 || 
        Math.abs(intersectionY1 - intersectionY2) > 0.1) {
        points.push(new Point(intersectionX2, intersectionY2, true));
    }

    return points;
}

/**
 * Find the closest point to a given position
 */
function findClosestPoint(points, x, y, threshold = 15) {
    let closest = null;
    let minDistance = threshold;

    for (const point of points) {
        const distance = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2);
        if (distance < minDistance) {
            minDistance = distance;
            closest = point;
        }
    }

    return closest;
}

/**
 * Find the closest line to a given position
 */
function findClosestLine(lines, x, y, threshold = 10) {
    let closest = null;
    let minDistance = threshold;

    for (const line of lines) {
        const distance = distanceToLineSegment(x, y, line.point1, line.point2);
        if (distance < minDistance) {
            minDistance = distance;
            closest = line;
        }
    }

    return closest;
}

/**
 * Calculate distance from a point to a line segment
 */
function distanceToLineSegment(x, y, p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
        return Math.sqrt((x - p1.x) ** 2 + (y - p1.y) ** 2);
    }

    let t = ((x - p1.x) * dx + (y - p1.y) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));

    const projX = p1.x + t * dx;
    const projY = p1.y + t * dy;

    return Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);
}

/**
 * Check if two points are approximately at the same position
 */
function arePointsClose(p1, p2, threshold = 5) {
    return Math.abs(p1.x - p2.x) < threshold && Math.abs(p1.y - p2.y) < threshold;
}
