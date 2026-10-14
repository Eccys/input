// src/recognizers/Gesture.js

const MIN_PATH_LENGTH = 10;
const RESAMPLE_COUNT = 64;

class GestureRecognizer {
    constructor(definitions = {}) {
        this.definitions = this.normalizeDefinitions(definitions);
        this.manager = null;
        this.isDrawing = false;
        this.suppressContextMenu = false;
        this.path = [];
        this.animationFrameId = null;
    }

    handleEvent(event) {
        if (!event || !['mousedown', 'mouseup', 'mousemove', 'contextmenu'].includes(event.type)) return;

        if (event.type === 'contextmenu') {
            if (this.isDrawing || this.suppressContextMenu) {
                if (typeof event.preventDefault === 'function') {
                    event.preventDefault();
                }
                this.suppressContextMenu = false;
            }
            return;
        }

        if (event.type === 'mousedown' && event.button === 2) { // Right mouse button
            this.isDrawing = true;
            this.suppressContextMenu = false;
            this.path = [[event.clientX, event.clientY]];
            if (typeof event.preventDefault === 'function') {
                event.preventDefault(); // Prevent context menu where supported
            }
        } else if (event.type === 'mousemove' && this.isDrawing) {
            const lastPoint = this.path[this.path.length - 1];
            if (!lastPoint || lastPoint[0] !== event.clientX || lastPoint[1] !== event.clientY) {
                this.path.push([event.clientX, event.clientY]);
            }
        } else if (event.type === 'mouseup' && this.isDrawing) {
            this.isDrawing = false;
            if (this.animationFrameId && typeof cancelAnimationFrame === 'function') {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
            if (this.path.length > 1) {
                this.suppressContextMenu = true;
            }
            if (this.path.length > MIN_PATH_LENGTH) {
                this.recognize();
            }
            this.path = [];
        }
    }

    recognize() {
        const currentPath = this.path.map(p => [p[0], p[1]]);
        const resampled = this.resamplePath(currentPath, RESAMPLE_COUNT);
        const bestMatch = this.findBestMatch(resampled);

        if (bestMatch.score > 0.7 && this.manager && typeof this.manager.dispatch === 'function') { // Confidence threshold
            this.manager.dispatch(bestMatch.action, { 
                type: 'gesture', 
                score: bestMatch.score, 
                path: currentPath 
            });
        }
    }

    findBestMatch(resampledPath) {
        let bestMatch = { score: -1, action: null };
        if (!resampledPath || resampledPath.length === 0) return bestMatch;

        for (const action in this.definitions) {
            const template = this.definitions[action];
            if (!template || template.length === 0) continue;
            const distance = this.distanceAtBestAngle(resampledPath, template);
            const score = 1 - distance / (0.5 * Math.sqrt(2 * Math.pow(250, 2))); // Heuristic score
            
            if (score > bestMatch.score) {
                bestMatch = { score, action };
            }
        }
        return bestMatch;
    }

    // Simple geometric template matching (based on $1 recognizer principles)
    distanceAtBestAngle(points, template) {
        let minDistance = Infinity;
        for (let angle = -45; angle <= 45; angle += 5) {
            const rotated = this.rotateBy(points, angle);
            const d = this.pathDistance(rotated, template);
            minDistance = Math.min(minDistance, d);
        }
        return minDistance;
    }

    // --- Path normalization and comparison functions ---

    normalizeDefinitions(definitions) {
        const normalized = {};
        if (!definitions) return normalized;
        for (const action in definitions) {
            if (Array.isArray(definitions[action]) && definitions[action].length > 0) {
                normalized[action] = this.resamplePath(definitions[action], RESAMPLE_COUNT);
            }
        }
        return normalized;
    }

    resamplePath(points, n = RESAMPLE_COUNT) {
        if (!Array.isArray(points) || points.length === 0 || n <= 0) {
            return [];
        }
        // Clone input points so caller arrays/templates are never mutated in-place
        const pts = points.map(p => [p[0], p[1]]);
        if (n === 1) {
            return this.scaleAndTranslate([pts[0]]);
        }

        const totalLength = this.pathLength(pts);
        if (totalLength === 0) {
            return Array.from({ length: n }, () => [0, 0]);
        }

        const I = totalLength / (n - 1);
        let D = 0.0;
        const newPoints = [[pts[0][0], pts[0][1]]];
        for (let i = 1; i < pts.length; i++) {
            const d = this.pointDistance(pts[i - 1], pts[i]);
            if (d === 0) continue;
            if ((D + d) >= I) {
                const qx = pts[i - 1][0] + ((I - D) / d) * (pts[i][0] - pts[i - 1][0]);
                const qy = pts[i - 1][1] + ((I - D) / d) * (pts[i][1] - pts[i - 1][1]);
                const q = [qx, qy];
                newPoints.push(q);
                pts.splice(i, 0, q);
                D = 0.0;
            } else {
                D += d;
            }
        }
        while (newPoints.length < n) {
            const last = pts[pts.length - 1];
            newPoints.push([last[0], last[1]]);
        }
        if (newPoints.length > n) {
            newPoints.length = n;
        }
        return this.scaleAndTranslate(newPoints);
    }

    scaleAndTranslate(points) {
        if (!points || points.length === 0) return [];
        const [minX, minY, maxX, maxY] = this.boundingBox(points);
        const span = Math.max(maxX - minX, maxY - minY);
        const scale = span > 0 ? 250 / span : 1;
        const centroid = this.getCentroid(points);
        return points.map(p => [
            (p[0] - centroid[0]) * scale,
            (p[1] - centroid[1]) * scale
        ]);
    }

    rotateBy(points, angle) {
        const radians = angle * (Math.PI / 180);
        const centroid = this.getCentroid(points);
        return points.map(p => [
            (p[0] - centroid[0]) * Math.cos(radians) - (p[1] - centroid[1]) * Math.sin(radians) + centroid[0],
            (p[0] - centroid[0]) * Math.sin(radians) + (p[1] - centroid[1]) * Math.cos(radians) + centroid[1]
        ]);
    }

    pathDistance(path1, path2) {
        const len = Math.min(path1.length, path2.length);
        if (len === 0) return Infinity;
        let d = 0;
        for (let i = 0; i < len; i++) {
            d += this.pointDistance(path1[i], path2[i]);
        }
        return d / len;
    }

    pathLength(points) {
        let d = 0;
        for (let i = 1; i < points.length; i++) {
            d += this.pointDistance(points[i - 1], points[i]);
        }
        return d;
    }

    pointDistance(p1, p2) {
        return Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));
    }

    boundingBox(points) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const [x, y] of points) {
            minX = Math.min(minX, x); minY = Math.min(minY, y);
            maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
        return [minX, minY, maxX, maxY];
    }

    getCentroid(points) {
        const x = points.reduce((sum, p) => sum + p[0], 0) / points.length;
        const y = points.reduce((sum, p) => sum + p[1], 0) / points.length;
        return [x, y];
    }
}

export default GestureRecognizer;

