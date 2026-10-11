/* KasaNidhi V3 artwork loader. The GitHub connector stores the optimized WebP artwork as base64 text assets; this reconstructs them in-browser without the low-resolution V2 image treatment. */
(async()=>{
  const spec={
    '/assets/family-segregation.webp':['/v3/assets/family.b64'],
    '/assets/paper-to-recycling.webp':['/v3/assets/paper.b64'],
    '/assets/circular-flow.webp':['/v3/assets/circular-a.b64','/v3/assets/circular-b.b64']
  };
  const urls={};
  await Promise.all(Object.entries(spec).map(async([src,parts])=>{
    try{
      const b64=(await Promise.all(parts.map(p=>fetch(p).then(r=>{if(!r.ok)throw new Error(p);return r.text()})))).join('').trim();
      urls[src]='data:image/webp;base64,'+b64;
    }catch(e){console.warn('KasaNidhi artwork load failed',src,e)}
  }));
  const apply=root=>{
    const nodes=[];
    if(root?.matches?.('img'))nodes.push(root);
    root?.querySelectorAll?.('img').forEach(x=>nodes.push(x));
    nodes.forEach(img=>{const raw=img.getAttribute('src');if(urls[raw]&&img.src!==urls[raw])img.src=urls[raw]});
  };
  apply(document);
  new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)apply(n)}))).observe(document.documentElement,{childList:true,subtree:true});
})();
