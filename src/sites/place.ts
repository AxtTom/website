import { Site } from "../site";

export let site: Site = {
    name: 'Place',
    path: '/place',
    render(req, res): string {
        return `
        <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.4.1/socket.io.js" integrity="sha512-MgkNs0gNdrnOM7k+0L+wgiRc5aLgl74sJQKbIWegVIMvVGPc1+gc1L2oK9Wf/D9pq58eqIJAxOonYPVE5UwUFA==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/js-cookie/3.0.1/js.cookie.min.js" integrity="sha512-wT7uPE7tOP6w4o28u1DN775jYjHQApdBnib5Pho4RB0Pgd9y7eSkAV1BTqQydupYDB9GBhTcQQzyNMPMV3cAew==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
        <div id="buttons" style="padding: 0; margin: 0;"></div>
        <canvas id="canvas"></canvas>
        <span id="secret"></span><span id="time" style="text-align: right; float: right;"></span>
        <script>
            const placeTime = ${global.placeTime};
        </script>
        <script src="/static/place.js"></script>
        `;
    }
}