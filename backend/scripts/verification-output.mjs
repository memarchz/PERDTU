import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../../.superpowers/verification/',import.meta.url);
export function verificationPath(filename){if(!/^[a-z0-9-]+\.json$/.test(filename))throw Error('Invalid verification filename');mkdirSync(root,{recursive:true});return fileURLToPath(new URL(filename,root));}
