let global_stars = [];
let global_minX = 0;
let global_minY = 0;
let global_width = 0;
let global_height = 0;

fetch('/locations').then(res => res.json()).then((response) => {
    let stars = response.stars;
    global_stars = stars;
    //Get the width and height of the stars
    let locations = stars.map(star => star.location);
    let minX = Math.min(...locations.map(location => location.x)) * 1.1;
    let minY = Math.min(...locations.map(location => location.y)) * 1.1;
    let maxX = Math.max(...locations.map(location => location.x)) * 1.1;
    let maxY = Math.max(...locations.map(location => location.y)) * 1.1;
    let width = (maxX - minX);
    let height = (maxY - minY);
    global_minX = minX * 1.1;
    global_minY = minY * 1.1;
    global_width = width;
    global_height = height;
    let starsData = global_stars.map(star=>star.location);
    load_stars(starsData);
});


const load_stars = (starsData) => {
    let svg = d3.select("#graphics") // Replace with your SVG or container element
        .append("svg")
        .attr("width", global_width)
        .attr("height", global_height)
        .attr("viewBox", global_minX + " " + global_minY + " " + global_width + " " + global_height)
        .style("background-color", "#000033");
        .style("background-color", "#000033");

    // Create stars as SVG circles
    let stars = svg.selectAll("circle")
        .data(starsData)
        .enter()
        .append("circle")
        .attr("cx", function (d) { return d.x; })
        .attr("cy", function (d) { return d.y; })
        .attr("r", function (d) { return d.radius; })
        .style("fill", "white");

    // Mouse move event
    svg.on("mousemove", function (event) {
        let mousePos = d3.pointer(event);
        drawLines(mousePos, starsData);
    });
}

function drawLines(mousePos, starsData) {
    let svg = d3.select("#graphics") // Replace with your SVG or container element
    // Remove existing lines
    svg.selectAll("line").remove();

    // Add new lines
    starsData.forEach(function (star) {
        svg.append("line")
            .attr("x1", star.x)
            .attr("y1", star.y)
            .attr("x2", mousePos[0])
            .attr("y2", mousePos[1])
            .attr("stroke", "white")
            .attr("stroke-width", 1);
    });
}
