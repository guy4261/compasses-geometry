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

/**
 * Calculate intersection point between two lines
 * Returns null if lines are parallel or don't intersect
 */
function getLineLineIntersection(line1, line2) {
    const x1 = line1.point1.x;
    const y1 = line1.point1.y;
    const x2 = line1.point2.x;
    const y2 = line1.point2.y;
    const x3 = line2.point1.x;
    const y3 = line2.point1.y;
    const x4 = line2.point2.x;
    const y4 = line2.point2.y;

    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

    // Lines are parallel or coincident
    if (Math.abs(denominator) < 0.0001) {
        return [];
    }

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

    // Check if intersection is within both line segments
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        const intersectionX = x1 + t * (x2 - x1);
        const intersectionY = y1 + t * (y2 - y1);
        return [new Point(intersectionX, intersectionY, true)];
    }

    return [];
}

/**
 * Calculate intersection points between a line and a circle
 */
function getLineCircleIntersection(line, circle) {
    const x1 = line.point1.x;
    const y1 = line.point1.y;
    const x2 = line.point2.x;
    const y2 = line.point2.y;
    const cx = circle.center.x;
    const cy = circle.center.y;
    const r = circle.radius;

    // Line direction vector
    const dx = x2 - x1;
    const dy = y2 - y1;

    // Vector from line start to circle center
    const fx = x1 - cx;
    const fy = y1 - cy;

    // Quadratic equation coefficients: a*t^2 + b*t + c = 0
    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;

    const discriminant = b * b - 4 * a * c;

    // No intersection
    if (discriminant < 0) {
        return [];
    }

    const sqrtDiscriminant = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDiscriminant) / (2 * a);
    const t2 = (-b + sqrtDiscriminant) / (2 * a);

    const intersections = [];

    // Check if t1 is within the line segment
    if (t1 >= 0 && t1 <= 1) {
        const intersectionX = x1 + t1 * dx;
        const intersectionY = y1 + t1 * dy;
        intersections.push(new Point(intersectionX, intersectionY, true));
    }

    // Check if t2 is within the line segment and different from t1
    if (t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > 0.0001) {
        const intersectionX = x1 + t2 * dx;
        const intersectionY = y1 + t2 * dy;
        intersections.push(new Point(intersectionX, intersectionY, true));
    }

    return intersections;
}
