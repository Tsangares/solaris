/*Fetch /sim and see if json response with key 'contested' is true*/
/* Get element by id 'sim' */
const sim = document.getElementById('sim');
function get_sim(){
    fetch('/simulate').then(res => res.json()).then((response) => {
        /* Add span to sim with result and prompt*/
        console.log(response)
        let span = document.createElement('span');
        span.innerHTML = response.contested ? '!Precision ERROR!' : 'No Precision error';
        sim.appendChild(span);
        get_sim();
    });
}
get_sim();