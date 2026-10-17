import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {deploymentEnvironment,writeDeploymentEnvironment} from './init-deploy.mjs';

test('local deployment creates isolated strong credentials and consistent origins',()=>{
 const a=deploymentEnvironment({origin:'http://localhost:18080',localDb:true}),b=deploymentEnvironment({origin:'http://localhost:18080',localDb:true});
 assert.equal(a.PUBLIC_ORIGIN,'http://localhost:18080');assert.equal(a.HTTP_PORT,'18080');assert.equal(a.HTTP_BIND_ADDRESS,'127.0.0.1');
 assert.ok(a.JWT_SECRET.length>=32);assert.notEqual(a.JWT_SECRET,b.JWT_SECRET);assert.notEqual(a.POSTGRES_PASSWORD,b.POSTGRES_PASSWORD);
 const db=new URL(a.DATABASE_URL);assert.equal(db.hostname,'postgres');assert.equal(db.password,a.POSTGRES_PASSWORD);assert.equal(db.pathname,'/perdtu');
});
test('deployment origin rejects credentials, paths and non-HTTP protocols',()=>{
 for(const origin of ['file:///tmp','https://a.test/path','https://user:password@a.test','https://a.test?x=1','https://a.test/#x','https://a.test\nJWT_SECRET=bad'])assert.throws(()=>deploymentEnvironment({origin}));
 assert.equal(deploymentEnvironment({origin:'https://example.test/'}).PUBLIC_ORIGIN,'https://example.test');
 assert.throws(()=>deploymentEnvironment({origin:'https://example.test:8443'}),/443/);
});
test('environment creation refuses to overwrite an existing file',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'perdtu-deploy-test-')),target=path.join(root,'.env.production');
 try{await writeFile(target,'original-secret');await assert.rejects(writeDeploymentEnvironment(target,{origin:'http://localhost:8080',localDb:true}),/exist/i);assert.equal(await readFile(target,'utf8'),'original-secret');}
 finally{await rm(root,{recursive:true,force:true});}
});
