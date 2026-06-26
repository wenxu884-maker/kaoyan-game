const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.resolve('E:/tengxunai/2026-06-26-15-55-31');
const MIME={
  '.html':'text/html;charset=utf-8',
  '.js':'application/javascript',
  '.css':'text/css',
  '.md':'text/markdown',
  '.mp3':'audio/mpeg',
  '.ogg':'audio/ogg',
  '.wav':'audio/wav',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.svg':'image/svg+xml',
  '.json':'application/json',
  '.ico':'image/x-icon',
};
const server=http.createServer((req,res)=>{
  let url=req.url.split('?')[0];
  if(url==='/')url='/index.html';
  let p=path.resolve(ROOT,'.'+url);
  if(!p.startsWith(ROOT)){res.writeHead(403);res.end('forbidden');return;}
  fs.stat(p,(err,st)=>{
    if(err||!st.isFile()){res.writeHead(404);res.end('not found: '+url);return;}
    const ext=path.extname(p).toLowerCase();
    const t=MIME[ext]||'application/octet-stream';
    const range=req.headers.range;
    if(range){
      const m=/bytes=(\d+)-(\d*)/.exec(range);
      const start=parseInt(m[1],10);
      const end=m[2]?parseInt(m[2],10):st.size-1;
      res.writeHead(206,{
        'Content-Type':t,
        'Content-Range':`bytes ${start}-${end}/${st.size}`,
        'Content-Length':end-start+1,
        'Accept-Ranges':'bytes',
        'Cache-Control':'no-cache',
      });
      fs.createReadStream(p,{start,end}).pipe(res);
    }else{
      res.writeHead(200,{
        'Content-Type':t,
        'Content-Length':st.size,
        'Accept-Ranges':'bytes',
        'Cache-Control':'no-cache',
      });
      fs.createReadStream(p).pipe(res);
    }
  });
});
server.listen(8080,()=>console.log('ready 8080 (with Range + mp3 mime)'));
