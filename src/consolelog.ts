import * as fs from 'fs';

function config() {
    if (!fs.existsSync('logs/')) {
        fs.mkdirSync('logs/');
    }
    const consolelog = console.log;
    const consoleerr = console.error;
    console.log = (x) => {
        const today = new Date();
        try {
            fs.appendFileSync(
                'logs/' + today.getFullYear().toString().padStart(4, '0') +
                '-' + (today.getMonth()+1).toString().padStart(2, '0') +
                '-' + today.getDate().toString().padStart(2, '0') +
                '.log', 
                '[' + today.getHours().toString().padStart(2, '0') + 
                ":" + today.getMinutes().toString().padStart(2, '0') + 
                ":" + today.getSeconds().toString().padStart(2, '0') + 
                ']' + JSON.stringify(x) + 
                '\n'
            );
        }
        catch {
            fs.appendFileSync(
                'logs/' + today.getFullYear().toString().padStart(4, '0') +
                '-' + (today.getMonth()+1).toString().padStart(2, '0') +
                '-' + today.getDate().toString().padStart(2, '0') +
                '.log', 
                '[' + today.getHours().toString().padStart(2, '0') + 
                ":" + today.getMinutes().toString().padStart(2, '0') + 
                ":" + today.getSeconds().toString().padStart(2, '0') + 
                ']' + x + 
                '\n'
            );
        }
        consolelog(x);
    }
    console.error = (x) => {
        const today = new Date();
        try {
            fs.appendFileSync(
                'logs/' + today.getFullYear().toString().padStart(4, '0') +
                '-' + (today.getMonth()+1).toString().padStart(2, '0') +
                '-' + today.getDate().toString().padStart(2, '0') +
                '.err.log', 
                '[' + today.getHours().toString().padStart(2, '0') + 
                ":" + today.getMinutes().toString().padStart(2, '0') + 
                ":" + today.getSeconds().toString().padStart(2, '0') + 
                ']' + x + 
                '\n'
            );
        }
        catch {
            fs.appendFileSync(
                'logs/' + today.getFullYear().toString().padStart(4, '0') +
                '-' + (today.getMonth()+1).toString().padStart(2, '0') +
                '-' + today.getDate().toString().padStart(2, '0') +
                '.err.log', 
                '[' + today.getHours().toString().padStart(2, '0') + 
                ":" + today.getMinutes().toString().padStart(2, '0') + 
                ":" + today.getSeconds().toString().padStart(2, '0') + 
                ']' + JSON.stringify(x) + 
                '\n'
            );
        }
        consoleerr(x);
    }
}

export { config };
