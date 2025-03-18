// src/recognizers/Gesture.js

const MIN_PATH_LENGTH = 10;
const RESAMPLE_COUNT = 64;

class GestureRecognizer {
    constructor(definitions) {
        this.definitions = this.normalizeDefinitions(definitions);
        this.manager = null;
        this.isDrawing = false;
        this.path = [];
    }

    handleEvent(event) {
        if (!['mousedown', 'mouseup', 'mousemove'].includes(event.type)) return;

        if (event.type === 'mousedown' && event.button === 2) { // Right mouse button
            this.isDrawing = true;
            this.path = [[event.clientX, event.clientY]];
            event.preventDefault(); // Prevent context menu
        } else if (event.type === 'mousemove' && this.isDrawing) {
            this.path.push([event.clientX, event.clientY]);
        } else if (event.type === 'mouseup' && this.isDrawing) {
            this.isDrawing = false;
            if (this.path.length > MIN_PATH_LENGTH) {
                this.recognize();
            }
            this.path = [];
        }
    }

    recognize() {
        const resampled = this.resamplePath(this.path, RESAMPLE_COUNT);
        const bestMatch = this.findBestMatch(resampled);

        if (bestMatch.score > 0.7) { // Confidence threshold
            console.log(`Gesture recognized: ${bestMatch.action} (Score: ${bestMatch.score.toFixed(2)})`);
        }
    }

    findBestMatch(resampledPath) {
        let bestMatch = { score: -1, action: null };

        for (const action in this.definitions) {
            const template = this.definitions[action];
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
        for (const action in definitions) {
            normalized[action] = this.resamplePath(definitions[action], RESAMPLE_COUNT);
        }
        return normalized;
    }

    resamplePath(points, n) {
        const I = this.pathLength(points) / (n - 1);
        let D = 0.0;
        const newPoints = [points[0]];
        for (let i = 1; i < points.length; i++) {
            const d = this.pointDistance(points[i - 1], points[i]);
            if ((D + d) >= I) {
                const qx = points[i - 1][0] + ((I - D) / d) * (points[i][0] - points[i - 1][0]);
                const qy = points[i - 1][1] + ((I - D) / d) * (points[i][1] - points[i - 1][1]);
                const q = [qx, qy];
                newPoints.push(q);
                points.splice(i, 0, q);
                D = 0.0;
            } else {
                D += d;
            }
        }
        if (newPoints.length === n - 1) newPoints.push(points[points.length - 1]);
        return this.scaleAndTranslate(newPoints);
    }

    scaleAndTranslate(points) {
        const [minX, minY, maxX, maxY] = this.boundingBox(points);
        const scale = 250 / Math.max(maxX - minX, maxY - minY);
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
        let d = 0;
        for (let i = 0; i < path1.length; i++) {
            d += this.pointDistance(path1[i], path2[i]);
        }
        return d / path1.length;
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
