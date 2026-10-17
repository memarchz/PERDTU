import {readFileSync} from 'node:fs';import path from 'node:path';
import {MODEL_KEY} from './ai-model';import type {Policy} from './matching';
export function matchingPolicy():Policy {const value=JSON.parse(readFileSync(path.resolve(__dirname,'../fixtures/matching-calibration.json'),'utf8'));if(value.modelKey!==MODEL_KEY)throw Error('AI calibration does not match installed model.');return value;}
