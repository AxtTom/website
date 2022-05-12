import * as argon from 'argon2';
import * as _ from 'lodash'

(async () => {
    const strings = [
        "Hallo1234",
        "Test1234"
    ];
    
    for (const str in strings) {
        const hash = await argon.hash(str, { hashLength: 32 });

        console.log(hash);
        console.log(await argon.verify(hash, str))
    }
})();