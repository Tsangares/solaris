
/*
//On Mouse Click Fill Star
canvas.addEventListener('click', function(event) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    const {x,y,scale} = get_mouse_pos(canvas, event);
  
    //Place dot on cursor
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, 2 * Math.PI);
    ctx.fill();
  
  
    //Get distances to stars
    let distances = global_stars.map(star => {
      let dx = star.location.x - x;
      let dy = star.location.y - y;
      return Math.sqrt(dx*dx + dy*dy);
    });
  
    //Get Nearest Star
    let min = Math.min(...distances);
    let index = distances.indexOf(min);
    let star = global_stars[index];
    if (star) {
      let natres = star.naturalResources.science;
      ctx.beginPath();
      ctx.arc(star.location.x, star.location.y, natres/3, 0, 2 * Math.PI);
  
      ctx.fill();
    }
  });
  

//On touchscreen drag
canvas.addEventListener('touchmove', function(event) {
    //STop event bubling
    if (event.touches.length>1) return;
    event.preventDefault();
    //Get mouse coords using get_mouse_pos
    //get touch coordinates
    var touch = event.touches[0];
    const rect = canvas.getBoundingClientRect()
    var scale = canvas.width / parseFloat(rect.width);
    var x = (touch.clientX - rect.left) * scale - canvas.width/2;
    var y = (touch.clientY - rect.top) * scale - canvas.height/2;
  
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
    //Draw a circle around the star proportionate to natres
  
    if (star && star.naturalResources.science/3*scale >= min) {
      let natres = star.naturalResources.science;
      ctx.beginPath();
      ctx.arc(star.location.x, star.location.y, natres/3, 0, 2 * Math.PI);
      ctx.fill();
    }
  
  });

  */
 //Depricated