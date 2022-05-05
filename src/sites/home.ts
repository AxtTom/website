import { Site } from "../site";

export let site: Site = {
    name: 'Home',
    path: '/',
    render(req, res): string {
        return `<h1 style="text-align: center;">Welcome!</h1>`;
    }
}