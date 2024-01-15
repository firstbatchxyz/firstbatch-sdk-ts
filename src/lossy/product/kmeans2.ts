type Point = number[];

// Calculate squared distance between two points.
function distanceSquared(a: Point, b: Point): number {
  return a.reduce((acc, _, i) => acc + (a[i] - b[i]) * (a[i] - b[i]), 0);
}

// Choose the next centroid with a probability proportional to its distance squared from the nearest existing centroid.
function chooseNextCenter(data: Point[], probabilities: number[]): Point {
  const sum = probabilities.reduce((a, b) => a + b, 0);
  let threshold = Math.random() * sum;
  for (let i = 0; i < data.length; i++) {
    if (threshold < probabilities[i]) {
      return data[i];
    }
    threshold -= probabilities[i];
  }
  return data[data.length - 1];
}

// KMeans++ initialization algorithm for centroids.
function kMeansPlusPlus(data: Point[], k: number): Point[] {
  const centroids: Point[] = [];
  // Start by randomly selecting the first centroid from the data points.
  centroids.push(data[Math.floor(Math.random() * data.length)]);

  for (let c = 1; c < k; c++) {
    const dists = data.map(point => {
      return Math.min(...centroids.map(center => distanceSquared(center, point)));
    });

    const nextCenter = chooseNextCenter(data, dists);
    centroids.push(nextCenter);
  }

  return centroids;
}

// KMeans clustering algorithm.
export function kMeans(data: Point[], k: number, maxIterations: number): Point[] {
  let centroids = kMeansPlusPlus(data, k);
  let previousCentroids: Point[] = [];
  let iterations = 0;

  // Continue until centroids don't change or max iterations reached.
  while (iterations < maxIterations && !isEqual(centroids, previousCentroids)) {
    const clusters: Point[][] = Array(k)
      .fill([])
      .map(() => []);

    // Assign each data point to the nearest centroid.
    for (const point of data) {
      const closestCentroidIndex = centroids
        .map((centroid, index) => [distanceSquared(centroid, point), index])
        .reduce((a, b) => (a[0] < b[0] ? a : b))[1];
      clusters[closestCentroidIndex].push(point);
    }

    previousCentroids = centroids;
    // Recalculate the centroids as the mean of all points in the cluster.
    centroids = clusters.map(cluster => {
      return cluster.reduce((a, b) => a.map((val, i) => val + b[i])).map(val => val / cluster.length);
    });

    iterations++;
  }

  return centroids;
}

// Check if two sets of centroids are identical.
function isEqual(a: Point[], b: Point[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    // TODO: added this line here just in case
    if (a[i].length !== b[i].length) return false;
    for (let j = 0; j < a[i].length; j++) {
      if (a[i][j] !== b[i][j]) return false;
    }
  }
  return true;
}
