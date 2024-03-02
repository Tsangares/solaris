
function draw_limits(stars) {
    const is_contested = (distanceA,distanceB) => Math.floor(distanceA) != Math.floor(distanceB);
    //get distances between each star
    let any_contested = false;
    let distances = [];
    for (let i = 0; i < stars.length; i++) {
      for (let j = 0; j < stars.length; j++) {
        if (i !== j) {
          let dx = stars[i].location.x - stars[j].location.x;
          let dy = stars[i].location.y - stars[j].location.y;
          let distance = Math.sqrt(dx*dx + dy*dy);
          dx = (stars[i].location.x-stars[i].location.x) - (stars[j].location.x-stars[i].location.x);
          dy = (stars[i].location.y-stars[i].location.y) - (stars[j].location.y-stars[i].location.y);
          let relative_distance = Math.sqrt(dx*dx + dy*dy);
          if (is_contested(distance, relative_distance)) {
            ctx.strokeStyle = '#ff0000';
            //Draw a line between the stars
            ctx.beginPath();
            ctx.moveTo(stars[i].location.x, stars[i].location.y);
            ctx.lineTo(stars[j].location.x, stars[j].location.y);
            ctx.stroke();
            //Log warning that a star is contested.
            console.log('Star', stars[i].id, 'is contested by', stars[j].id);
            any_contested = True;
          }
        }
      }
    }
    // log if any is contested or not
    if (!any_contested) {
      console.log('No stars are contested');
    }
  }