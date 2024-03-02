const { Engine, Render, World, Bodies, Query, Mouse, MouseConstraint, Constraint, Body } =  Matter;
const engine = Engine.create();
const render = Render.create({
  element: document.getElementById("graphics"), // Attach the renderer to the body or a specific element
  engine: engine,
  options: {
    wireframes: false, // Set to false for solid shapes
    background: '#000033' // Set your background color
  }
});
const canvas = render.canvas;
engine.world.gravity.x = 0;
engine.world.gravity.y = 0;
let prevMousePosition = { x: 0, y: 0 };

// Add mouse control
const mouse = Mouse.create(render.canvas);
let mouseHoverEvents = [];
let mouseStoppedHoveringEvents = [];
let mouseInactiveEvents = [];
//Add a circle that is constrined to the star with high mass
const mouseBallast = Bodies.circle(0, 0, 10, {
  mass: 100000,
  render: {
    fillStyle: '#ff0000',
    strokeStyle: '#ffffff',
    lineWidth: 2
  }
});
const mouseConstraint = MouseConstraint.create(engine, {
  mouse: mouse,
  constraint: {
    render: { visible: false }
  }
});
mouseConstraint.mouse.body = mouseBallast;
World.add(engine.world, [mouseConstraint, mouseBallast]);

mouseConstraint.mouse.element.removeEventListener("mousewheel", mouseConstraint.mouse.mousewheel);
mouseConstraint.mouse.element.removeEventListener("DOMMouseScroll", mouseConstraint.mouse.mousewheel);
// Run the engine

let global_stars = [];
let global_minX = 0;
let global_minY = 0;

fetch('/locations').then(res => res.json()).then((response) => {
  let stars = response.stars;

  stars.forEach((star) => {
    let natres = star.naturalResources.science;
    let {x,y} = star.location;
    let circle = Bodies.circle(x,y, natres / 3, {
      isStatic: true,
      render: {
        fillStyle: 'transparent',
        strokeStyle: '#ffffff',
        lineWidth: 1.5
      }
    });
    circle.default_radius = natres / 3;
    circle.isGrowing = false;
    World.add(engine.world, [circle]);
    global_stars.push(circle);
  });
  //Get the width and height of the stars
  let locations = stars.map(star => star.location);
  let minX = Math.min(...locations.map(location => location.x)) * 1.1;
  let minY = Math.min(...locations.map(location => location.y)) * 1.1;
  let maxX = Math.max(...locations.map(location => location.x)) * 1.1;
  let maxY = Math.max(...locations.map(location => location.y)) * 1.1;
  let width = (maxX - minX);
  let height = (maxY - minY);
  //Reset the size of the canvas
  render.canvas.width = width;
  render.canvas.height = height;
  //Translate the canvas to the center
  render.context.translate(width / 2, height / 2);
  global_minX = minX * 1.1;
  global_minY = minY * 1.1;
});

const get_mouse_pos = (event) => {
  const rect = render.canvas.getBoundingClientRect();
  var scale = render.canvas.width / parseFloat(rect.width);
  var x = (event.clientX - rect.left) * scale - canvas.width / 2;
  var y = (event.clientY - rect.top) * scale - canvas.height / 2;
  return { x, y, scale };
};

let big_stars = [];

let growRate = 5;
let satellites = {};

const shrinkStars = () => {
  big_stars.forEach(star => {
    if(star.isGrowing){
      //Do nothing
    }if (star.circleRadius > star.default_radius) {
      star.circleRadius *= 0.99;
      star.render.fillStyle = '#00ffff';
      star.render.strokeStyle = '#00ffff';
    } else {
      star.render.fillStyle = 'transparent';
      star.render.strokeStyle = '#ffffff';
      star.circleRadius = star.default_radius;
      big_stars.splice(big_stars.indexOf(star), 1);
    }
  });
}
mouseStoppedHoveringEvents.push((star)=>{
  star.isGrowing=false;
});
mouseInactiveEvents.push(shrinkStars);

const growStar = (star) => {
  //if the collision is in global_stars then grow it
  if (global_stars.includes(star)) {
    if (star.circleRadius < star.default_radius * 2) {
      star.isGrowing = true;
      star.circleRadius *= 1.05;
      star.render.fillStyle = '#ff0000';
    }
    if (big_stars.includes(star)) return;
    else big_stars.push(star);
  }
}
mouseHoverEvents.push(growStar);


//When moving mouse add lines between stars and the cursor
render.canvas.addEventListener('mousemove', function (event) {
  const { x, y, scale } = get_mouse_pos(event);
  prevMousePosition = { x, y };

  //Fill nearest star
  let distances = global_stars.map(star => Math.hypot(star.position.x - x, star.position.y - y));
  let min = Math.min(...distances);
  let index = distances.indexOf(min);
  let star = global_stars[index];
  if (!star) return;
  if (min < star.circleRadius){
    star.render.fillStyle = '#fff';
    return;
  }
  /*Add an invisible circle and bound it to the star but make the line visible*/
  let circle = Bodies.circle(x, y, 1, {
    render: {
      fillStyle: 'transparent',
      strokeStyle: '#ffffff',
      lineWidth: 0, // Set to 0 to make the circle itself invisible
      opacity: 1
    }
  });
  let constraint = Constraint.create({
    bodyA: star,
    bodyB: circle,
    stiffness: 1,
    length: min,
    render: {
      anchors: false,
      strokeStyle: '#fff', // Set the desired color for the constraint (e.g., red)
      lineWidth: 1 // Set the desired line width for the constraint
    }
  });

  World.add(engine.world, [circle,constraint]);
  /* If circle is not in satellites as a key then add an empty list in the dictionary satellites */
  if (!satellites[star.id]) satellites[star.id] = [circle]
  else satellites[star.id].push(circle)
});
let prev_collisions = [];
const checkHovering = ()=>{
  let {x,y} = prevMousePosition;
  const collisions = Query.point(global_stars, { x, y });
  if (collisions.length > 0) {
    //Activate mouse hover events
    prev_collisions=collisions;
    collisions.forEach(collision => mouseHoverEvents.forEach(event => event(collision)));
  }else{
    prev_collisions.forEach(collision => mouseStoppedHoveringEvents.forEach(event => event(collision)));
    //Activate mouse not hovering events.
    mouseInactiveEvents.forEach(event => event());
  }
}
setInterval(checkHovering, 50);

Matter.Runner.run(engine)
// Run the renderer
Render.run(render);