import { runDebug } from './debug';
const params = new URLSearchParams(location.search);
if (params.get('debug')) runDebug(params);
