import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { decodeImage, writePhoto, removePhotoFile, photoFilePath } from '../dist/media-store.js';

for (const format of ['png','jpeg','webp']) test(`decodes ${format}, strips metadata and returns a bounded static WebP`,async()=>{
  const source=await sharp({create:{width:2400,height:1200,channels:3,background:'#559977'}}).withMetadata({exif:{IFD0:{Artist:'Test metadata'}}})[format]().toBuffer();
  const result=await decodeImage(source),meta=await sharp(result.buffer).metadata();
  assert.equal(meta.format,'webp');assert.equal(result.mime,'image/webp');assert.equal(result.width,1600);assert.equal(result.height,800);assert.equal(meta.exif,undefined);assert.ok(!meta.pages||meta.pages===1);
});
test('rejects unsupported or malformed file contents regardless of claimed MIME',async()=>{
  for(const input of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>'),Buffer.from('GIF89a'),Buffer.from([0xff,0xd8,0xff,0x00])])await assert.rejects(decodeImage(input));
});
test('rejects sources above five MiB and decoded images above 25 million pixels',async()=>{
  await assert.rejects(decodeImage(Buffer.alloc(5*1024*1024+1)));
  const huge=await sharp({create:{width:5001,height:5000,channels:3,background:'#ffffff'}}).png().toBuffer();
  assert.ok(huge.length<5*1024*1024);await assert.rejects(decodeImage(huge));
});
test('randomized file survives a fresh read and only its exact file is removed',async()=>{
  const input=await sharp({create:{width:4,height:3,channels:3,background:'#ffffff'}}).png().toBuffer();
  const written=await writePhoto(input);
  assert.match(written.filename,/^[0-9a-f-]{36}\.webp$/);
  const meta=await sharp(await readFile(photoFilePath(written.filename))).metadata();assert.equal(meta.format,'webp');assert.equal(meta.width,4);
  await removePhotoFile(written.filename);await assert.rejects(readFile(photoFilePath(written.filename)));
});
test('path-like filenames cannot reach outside the media root',()=>{
  for(const path of ['../outside.webp','C:\\outside.webp','/etc/passwd','..%2foutside.webp','folder/test.webp'])assert.throws(()=>photoFilePath(path));
});

test('rejects a real animated WebP',async()=>{const data=Buffer.alloc(2*4*3);for(let i=0;i<12;i+=3)data[i]=255;for(let i=12;i<data.length;i+=3)data[i+2]=255;const animated=await sharp(data,{raw:{width:2,height:4,channels:3,pageHeight:2}}).webp({loop:0,delay:[100,100]}).toBuffer();assert.equal((await sharp(animated,{animated:true}).metadata()).pages,2);await assert.rejects(decodeImage(animated));});
