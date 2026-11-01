import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
for(const name of ['runtime.mjs','installation.mjs']){
 const child=spawnSync(process.execPath,[path.join(here,name)],{stdio:'inherit',env:process.env});
 if(child.error)throw child.error;
 if(child.status!==0){process.exitCode=child.status??1;break;}
}
