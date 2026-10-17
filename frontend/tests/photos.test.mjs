import {test} from 'node:test';import assert from 'node:assert/strict';
import {addPhoto,movePhoto,removePhoto,releasePreviews} from '../lib/photos.mjs';
test('keeps four stable ids and refuses a fifth without losing prior uploads',()=>{let list=[];for(let n=0;n<4;n++)list=addPhoto(list,{id:String(n),previewUrl:'blob:'+n});assert.throws(()=>addPhoto(list,{id:'5'}));assert.deepEqual(list.map(p=>p.id),['0','1','2','3']);});
test('reorders/removes by stable id and preserves successful prior uploads',()=>{const list=[{id:'a'},{id:'b'},{id:'c'}];assert.deepEqual(movePhoto(list,'c',-1).map(p=>p.id),['a','c','b']);assert.deepEqual(removePhoto(list,'b').map(p=>p.id),['a','c']);assert.deepEqual(movePhoto(list,'a',-1),list);});
test('releases created object URLs once and leaves remote previews intact',()=>{const released=[];releasePreviews(new Set(['blob:a','blob:b']),url=>released.push(url));assert.deepEqual(released,['blob:a','blob:b']);});
