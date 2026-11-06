import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const repair=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const modules=fs.readdirSync(path.join(repair,'modules')).filter(name=>/^\d\d_[a-z_]+\.sql$/.test(name)).sort();
const output='-- GENERATED from modules/*.sql by tests/compose.mjs. Apply only through guarded apply.sql.\n\n'+
 modules.map(name=>fs.readFileSync(path.join(repair,'modules',name),'utf8')).join('\n\n');
fs.writeFileSync(path.join(repair,'changes.sql'),output);
console.log(JSON.stringify({composed:true,modules:modules.length}));
