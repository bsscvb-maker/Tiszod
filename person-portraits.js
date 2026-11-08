(() => {
 'use strict';
 const prefix='person-photo:';
 const nameKey=name=>String(name).trim().toLowerCase();
 const range="'Identification Records'!D1:E2000";
 function parse(rows){
  const portraits=new Map();
  for(const [key,value] of rows){
   if(typeof key!=='string'||!key.startsWith(prefix)||typeof value!=='string')continue;
   if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value))continue;
   portraits.set(nameKey(key.slice(prefix.length)),value);
  }
  return portraits;
 }
 window.thPersonPortraits={range,parse,nameKey};
})();
