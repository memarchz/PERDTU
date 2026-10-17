import {randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

export function deploymentEnvironment({origin='http://localhost:8080',localDb=false}={}) {
  if(typeof origin!=='string'||/[\r\n]/.test(origin))throw Error('Use a plain HTTP(S) origin.');
  const url=new URL(origin);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('Use only an HTTP(S) origin, without a path, credentials, query or fragment.');
  if(url.protocol==='https:'&&url.port)throw Error('This HTTPS deployment uses standard port 443; omit a custom port.');
  const password=randomBytes(32).toString('hex');
  return {
    PUBLIC_ORIGIN:url.origin,
    DATABASE_URL:localDb?`postgresql://perdtu:${password}@postgres:5432/perdtu?schema=public`:'REPLACE_WITH_PRIVATE_RDS_POSTGRESQL_URL',
    JWT_SECRET:randomBytes(48).toString('hex'),
    IMAGE_REGISTRY:'perdtu',IMAGE_TAG:'local',
    HTTP_BIND_ADDRESS:'127.0.0.1',HTTP_PORT:url.protocol==='http:'?(url.port||'80'):'8080',
    HTTPS_BIND_ADDRESS:'0.0.0.0',
    ...(localDb?{POSTGRES_PASSWORD:password}:{}),
  };
}
export async function writeDeploymentEnvironment(target,options) {
  const values=deploymentEnvironment(options);
  await mkdir(path.dirname(target),{recursive:true});
  await writeFile(target,'# Private deployment configuration. Do not commit.\n'+Object.entries(values).map(([key,value])=>`${key}=${value}`).join('\n')+'\n',{flag:'wx',mode:0o600});
  return values;
}
async function main(){
  const args=process.argv.slice(2);let origin='http://localhost:8080',localDb=false;
  for(let i=0;i<args.length;i++){
    if(args[i]==='--origin'&&args[i+1])origin=args[++i];
    else if(args[i]==='--local-db')localDb=true;
    else throw Error('Usage: npm run deploy:init -- [--origin https://your-domain] [--local-db]');
  }
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  await writeDeploymentEnvironment(path.join(root,'deploy','.env.production'),{origin,localDb});
  console.log('Created deploy/.env.production with random credentials; existing files are never overwritten.');
  if(!localDb)console.log('Set DATABASE_URL to your private RDS connection before starting containers.');
  console.log('Follow docs/DEPLOYMENT.md. No containers or cloud resources have been started.');
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)main().catch(error=>{console.error(error.code==='EEXIST'?'deploy/.env.production already exists; it was not changed.':error.message);process.exitCode=1;});
