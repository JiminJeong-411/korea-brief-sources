import {config} from './cloud';
import defaults from './feeds.json';
import {mergeSourceCatalog} from './source-policy.mjs';
export async function configuredFeeds(){return mergeSourceCatalog(defaults,await config('feeds',[]));}
