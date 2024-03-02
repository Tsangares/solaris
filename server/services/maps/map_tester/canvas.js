

const canvas = document.getElementById('canvas');
const anim_canvas = document.getElementById('animation-canvas');
const anim_ctx = anim_canvas.getContext('2d');
const ctx = canvas.getContext('2d');

ctx.fillStyle = '#ffffff';
ctx.strokeStyle = '#ffffff';
ctx.fillStyle = '#000033';
ctx.fillRect(0, 0, canvas.width, canvas.height);

let global_stars = []
let global_minX = 0;
let global_minY = 0;

//Initialize locations
fetch('/locations').then(res => res.json()).then((response) => {
  let stars = response.stars;
  let locations = stars.map(star => star.location);
  let minX = Math.min(...locations.map(location => location.x));
  let minY = Math.min(...locations.map(location => location.y));
  let maxX = Math.max(...locations.map(location => location.x));
  let maxY = Math.max(...locations.map(location => location.y));
  let width = (maxX - minX)*1.1;
  let height = (maxY - minY)*1.1;
  console.log(minX,minY,maxX,maxY);
  //Reset the size of the canvas
  canvas.width = width;
  canvas.height = height;
  anim_canvas.width = width;
  anim_canvas.height = height;
  border = 1 + .1
  global_minX = minX*border;
  global_minY = minY*border;
  ctx.translate(width/2, height/2);
  anim_ctx.translate(width/2, height/2);

  ctx.fillStyle = '#000033';
  ctx.fillRect(-width/2, -height/2, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';

  stars.forEach((star) => {
    global_stars.push(star);
    /*Draw a point*/
    let natres = star.naturalResources.science;
    anim_ctx.beginPath();
    //ctx.arc(star.location.x, star.location.y, 1, 0, 2 * Math.PI);
    //ctx.fill();
    //draw a circle around the star proportionate to natres

    anim_ctx.strokeStyle = '#ffffff';
    anim_ctx.arc(star.location.x, star.location.y, natres/3, 0, 2 * Math.PI);
    anim_ctx.stroke()
  });
  //requestAnimationFrame(animate_stars);
});

const get_mouse_pos = (canvas, event) => {
  const rect = canvas.getBoundingClientRect()
  var scale = canvas.width / parseFloat(rect.width);
  var x = (event.clientX - rect.left) * scale - canvas.width/2;
  var y = (event.clientY - rect.top) * scale - canvas.height/2;
  return {x,y,scale};
};


//On Mouse Move Draw Line
canvas.addEventListener('mousemove', function(event) {
  const {x,y,scale} = get_mouse_pos(canvas, event);
  //Fill nearest star
  let distances = global_stars.map(star => {
    let dx = star.location.x - x;
    let dy = star.location.y - y;
    return Math.sqrt(dx*dx + dy*dy);
  });
  let min = Math.min(...distances);
  let index = distances.indexOf(min);
  let star = global_stars[index];
  if (!star) return;
  //Draw a line from the star to the cursor
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(star.location.x, star.location.y);
  ctx.stroke();

  if (star && star.naturalResources.science/3*scale >= min) {
    let natres = star.naturalResources.science;
    anim_ctx.fillStyle = '#ffffff';
    anim_ctx.beginPath();
    anim_ctx.arc(star.location.x, star.location.y, natres/3, 0, 2 * Math.PI);
    anim_ctx.fill();
  }

});
