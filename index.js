'use strict';

var Queue = require('tinyqueue');

module.exports = knn;

function knn(tree, queryPoint, n) {
    var node = tree.data,
        result = [],
        toBBox = tree.toBBox,
        i, child;

    var queue = new Queue(null, compareDist);

    while (node) {
        for (i = 0; i < node.children.length; i++) {
            child = node.children[i];
            queue.push({
                node: child,
                isItem: node.leaf,
                dist: boxDistance(queryPoint, node.leaf ? toBBox(child) : child.bbox, calcHaversineRelativeDist)
            });
        }

        while (queue.length && queue.peek().isItem) {
            result.push(queue.pop().node);
            if (result.length === n) return result;
        }

        node = queue.pop();
        if (node) node = node.node;
    }

    return result;
}

function compareDist(a, b) {
    return a.dist - b.dist;
}

/**
 * Calculate the distance to a bounding box from point p
 */
function boxDistance(p, box, algorithm) {
	var d = Infinity;
	var x1 = box[0], y1 = box[1], x2 = box[2], y2 = box[3];
	var px = p[0], py = p[1];
	
	if(typeof algorithm === "undefined") algorithm = calcEuclidianSquaredDist;
	
	// if the point is inside the bbox, we can't be sure of their order so set distance to 0
	if(px >= x1 && px <= x2 && py >= y1 && py <= y2) {
		d = 0;
	} else if (py >= y1 && py <= y2) { // not inside bbox but within y bounds
		var x1EdgeMinDist = algorithm(p, [x1,py]);
		var x2EdgeMinDist =  algorithm(p, [x2,py]);
		
		if(x1EdgeMinDist < x2EdgeMinDist) {
			d = x1EdgeMinDist;
		} else { // use x2 edge
			d = x2EdgeMinDist;
		}
	
	} else if (px >= x1 && px <= x2) { // not inside bbox but within x bounds
		var y1EdgeMinDist = algorithm(p, [px,y1]);
		var y2EdgeMinDist = algorithm(p, [px,y2]);
		
		if(y1EdgeMinDist < y2EdgeMinDist) {
			d = y1EdgeMinDist;
		} else { // use y2 edge
			d = y2EdgeMinDist;
		}
	} else { // not within bbox nor either axis bounds so use the corners
		var boxCornerDist = [
			algorithm(target, [x1,y1]),
			algorithm(target, [x1,y2]),
			algorithm(target, [x2,y1]),
			algorithm(target, [x2,y2])
		].sort();
		
		d = boxCornerDist[0];
	}
	return d;
}

function calcEuclidianSquaredDist(a, b) {
	var dx = a[0]-b[0], dy = a[1]-b[1];
	return dx*dx+dy*dy;
}

/**
* Calculate the relative distance using the Haversine formula.
* http://www.movable-type.co.uk/scripts/latlong.html
* https://en.wikipedia.org/wiki/Haversine_formula
* 
* returns the square of half the chord length beween a and b
*/
function calcHaversineRelativeDist(a, b) {
	var lat1 = a[1], lat2 = b[1];
	var lon1 = a[0], lon2 = b[0];

	var phi1 = lat1*Math.PI/180;
	var phi2 = lat2*Math.PI/180;
	var deltaPhi = (lat2-lat1)*Math.PI/180;
	var deltaLambda = (lon2-lon1)*Math.PI/180;

	return = Math.sin(deltaphi/2) * Math.sin(deltaPhi/2) +
			Math.cos(phi1) * Math.cos(phi2) *
			Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
}

/**
 * Calculate the relative distance using the Spherical Law of Cosines
 * http://www.movable-type.co.uk/scripts/latlong.html
 * 
 * returns the arc angle in radians
 */
function calcSphericalLawOfCosinesRelativeDist(a, b) {
	var lat1 = a[1], lat2 = b[1];
	var lon1 = a[0], lon2 = b[0];
	var phi1 = lat1*Math.PI/180, phi2 = lat2*Math.PI/180, 
		deltaLambda = (lon2-lon1)*Math.PI/180;

	return Math.acos(Math.sin(phi1)*Math.sin(phi2)+Math.cos(phi1)*Math.cos(phi2)*Math.cos(deltaLambda));
}

/**
* Calculate the relative distance using the Equirectangular formula.
* Higher performance than true distance with little loss in accuracy
* http://www.movable-type.co.uk/scripts/latlong.html
* https://en.wikipedia.org/wiki/Equirectangular_projection
* 
* returns the square of the arc angle in radians
*/
function calcEquirectangularRelativeDist(a, b) {
	var lambda2 = Math.PI/180*b[0], lambda1 = Math.PI/180*a[0];
	var phi2 = Math.PI/180*b[1], phi1 = Math.PI/180*a[1];

	var x = (lambda2-lambda1) * Math.cos((phi1+phi2)/2);
	var y = (phi2-phi1);

	return x*x+y*y;
}
