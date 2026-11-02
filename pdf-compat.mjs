/* Compatibility helpers required by the bundled PDF.js, including its worker. */
if(!Uint8Array.prototype.toHex)Uint8Array.prototype.toHex=function(){return Array.from(this,b=>b.toString(16).padStart(2,'0')).join('')};
for(const C of [Map,WeakMap]){
 if(!C.prototype.getOrInsertComputed)C.prototype.getOrInsertComputed=function(k,f){if(!this.has(k))this.set(k,f(k));return this.get(k)};
 if(!C.prototype.getOrInsert)C.prototype.getOrInsert=function(k,v){if(!this.has(k))this.set(k,v);return this.get(k)};
}
if(!Uint8Array.fromBase64)Uint8Array.fromBase64=function(value){const s=atob(value.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(s,c=>c.charCodeAt(0))};
if(!Uint8Array.prototype.toBase64)Uint8Array.prototype.toBase64=function(){let s='';for(let i=0;i<this.length;i+=8192)s+=String.fromCharCode(...this.subarray(i,i+8192));return btoa(s)};
