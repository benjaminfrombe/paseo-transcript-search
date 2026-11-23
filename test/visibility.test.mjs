import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const flush = async () => { for (let i=0;i<8;i++) await Promise.resolve(); };
async function load(entry, stubs = {}) {
  const built = await build({ entryPoints: [entry], bundle:true, write:false, platform:"node",format:"cjs",
    external:["react","react-native","@getpaseo/plugin","@tanstack/react-query"] });
  const m={exports:{}};
  new Function("require","module","exports",built.outputFiles[0].text)(id => id in stubs ? stubs[id] : id==="react-native" ? {Platform:{OS:"web"}} : require(id),m,m.exports);
  return m.exports;
}
test("hidden clients skip identity retries and identify immediately when visible; cleanup removes listeners", async () => {
  const originalDoc=globalThis.document, interval=globalThis.setInterval, clear=globalThis.clearInterval;
  const listeners=new Set(); let tick, reads=0;
  globalThis.document={visibilityState:"hidden",addEventListener(_name,fn){listeners.add(fn);},removeEventListener(_name,fn){listeners.delete(fn);}};
  globalThis.setInterval=fn=>{tick=fn;return 1;};globalThis.clearInterval=()=>{tick=null;};
  try {
    const {registerHost}=await load("client/federation.ts");
    const stop=registerHost({rpc:async()=>{reads++;throw new Error("not ready");}});
    await flush();tick();await flush();assert.equal(reads,0);
    globalThis.document.visibilityState="visible";for(const listener of listeners)listener();await flush();assert.equal(reads,1);
    globalThis.document.visibilityState="hidden";for(const listener of listeners)listener();tick();await flush();assert.equal(reads,1);
    stop();assert.equal(listeners.size,0);assert.equal(tick,null);
  } finally {globalThis.document=originalDoc;globalThis.setInterval=interval;globalThis.clearInterval=clear;}
});
test("index queries stop while hidden or disabled, and resume on visibility changes", async () => {
  const originalDoc=globalThis.document; const listeners=new Set();let queries;
  globalThis.document={visibilityState:"hidden",addEventListener(_name,fn){listeners.add(fn);},removeEventListener(_name,fn){listeners.delete(fn);}};
  let cleanup;
  try {
    const {useIndexStatus}=await load("client/use-index-status.ts",{
      react:{useSyncExternalStore(subscribe,snapshot){cleanup??=subscribe(()=>{});return snapshot();}},
      "@tanstack/react-query":{useQueries(o){queries=o.queries;return [{}];}},
    });
    const hosts=[{serverId:"dev-box",generation:1,label:"Dev"}];
    useIndexStatus(hosts,true);assert.equal(queries[0].enabled,false);assert.equal(queries[0].refetchInterval,false);
    globalThis.document.visibilityState="visible";
    useIndexStatus(hosts,true);assert.equal(queries[0].enabled,true);assert.equal(queries[0].refetchInterval,5000);
    useIndexStatus(hosts,false);assert.equal(queries[0].enabled,false);assert.equal(queries[0].refetchInterval,false);
    cleanup();assert.equal(listeners.size,0);
  } finally {globalThis.document=originalDoc;}
});
