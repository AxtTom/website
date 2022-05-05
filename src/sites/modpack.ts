import axios from "axios";
import { Site } from "../site";
import * as https from 'https';

export let site: Site = {
    name: 'Modpack',
    path: '/modpack',
    hideInList: true,
    async render(req, res): Promise<string> {
        return new Promise<string>(async (resolve, reject) => { 
            let response: any = {};
            try {
                response = await axios.get('http://api.axttom.de/mc');
            } catch {}
            const api = await axios.get('http://api.axttom.de/modpack');

            resolve(
                `<source src="/static/modpack.css" type="stylesheet">
                
                IP: <span class="ip">axttom.de:25567</span> <br>
                Status: ${
                    (api.data.running ?
                    '<span style="font-weight: bold; color: green;">Running</span>' :
                    '<span style="font-weight: bold; color: red;">Not running</span>')
                    + (response.data ? '' : '<span style="color: red;"> (API-Mod Down or Server still starting)</span>')
                } <br>
                TeamSpeak: <span class="ip">ts.axttom.de</span> <br>
                <table>
                    <tr>
                        <td>Links:</td>
                        <td><a href="https://www.technicpack.net/modpack/berauschend.1917468" target="_blank">TechnicLauncher</a></td>
                    </tr>
                    <tr>
                        <td></td>
                        <td><a href="https://axttom.de/downloads/Berauschend.zip" target="_blank">Curseforge</a></td>
                    </tr>
                </table>
                <a href="/static/modpack/modlist.txt">Mod List</a>
                <a href="/static/modpack/changelog.txt">Changlelog</a>
                <div>${
                    response.data ?
                    `Players: ${response.data.playerCount} / ${response.data.maxPlayers}
                    <ul>
                        ${(response.data.playerList as string[]).map((player) => `<li>${player}</li>`).join('')}
                    </ul>` :
                    ''
                }</div>`
            );
        });
    }
}