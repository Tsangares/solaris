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
const mouseConstraint = MouseConstraint.create(engine, {
  mouse: mouse,
  constraint: {
    render: { visible: false }
  }
});
World.add(engine.world, [mouseConstraint]);

mouseConstraint.mouse.element.removeEventListener("mousewheel", mouseConstraint.mouse.mousewheel);
mouseConstraint.mouse.element.removeEventListener("DOMMouseScroll", mouseConstraint.mouse.mousewheel);
// Run the engine

let global_stars = [];
let global_minX = 0;
let global_minY = 0;
let global_center = { x: 0, y: 0 };

fetch('/locations').then(res => res.json()).then((response) => {
  let stars = response.stars;

  stars.forEach((star) => {
    let natres = star.naturalResources.science;
    let {x,y} = star.location;
    let circle = Bodies.circle(x,y, natres / 3, {
      isStatic: true,
      render: {
        fillStyle: star.is_home? '#fff' : 'transparent',
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
  let global_center = { x: (maxX + minX) / 2, y: (maxY + minY) / 2 };
  const center = global_center;
  //Reset the size of the canvas
  render.canvas.width = width;
  render.canvas.height = height;
  //Translate the canvas to the center
  render.context.translate(width / 2 - center.x, height / 2 - center.y);
  global_minX = minX * 1.1;
  global_minY = minY * 1.1;
});

const get_mouse_pos = (event) => {
  const rect = render.canvas.getBoundingClientRect();
  var scale = render.canvas.width / parseFloat(rect.width);
  var x = (event.clientX - rect.left) * scale - canvas.width / 2 - global_center.x;
  var y = (event.clientY - rect.top) * scale - canvas.height / 2 - global_center.y;
  return { x, y, scale };
};

let satellites = {};


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
    //star.render.fillStyle = '#fff';
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

  //World.add(engine.world, [circle,constraint]);
  /* If circle is not in satellites as a key then add an empty list in the dictionary satellites */
  //if (!satellites[star.id]) satellites[star.id] = [circle]
  //else satellites[star.id].push(circle)
});

Matter.Runner.run(engine)
// Run the renderer
Render.run(render);