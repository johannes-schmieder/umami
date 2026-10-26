const fs = require('node:fs');
const net = require('node:net');
const tls = require('node:tls');
const {spawn} = require('node:child_process');
const root = require('node:path').resolve(__dirname, '..');
const remote = new URL(process.env.DATABASE_URL);
if(remote.hostname!=='aws-0-us-east-1.pooler.supabase.com'||remote.username!=='postgres.zghjvulgjbjeurbkgwti')throw new Error('Unexpected migration target');
const sockets = new Set();
const server = net.createServer(client => {
  client.pause();sockets.add(client);client.on('close',()=>sockets.delete(client));client.on('error',()=>{});
  const upstream=net.connect({host:remote.hostname,port:5432});sockets.add(upstream);upstream.on('close',()=>sockets.delete(upstream));
  upstream.on('error',()=>client.destroy());
  upstream.on('connect',()=>{const request=Buffer.alloc(8);request.writeInt32BE(8);request.writeInt32BE(80877103,4);upstream.write(request);});
  upstream.once('data',reply=>{
    if(reply.length!==1||reply[0]!==83){client.destroy();upstream.destroy();return;}
    const secure=tls.connect({socket:upstream,servername:remote.hostname,rejectUnauthorized:true,ca:fs.readFileSync(root+'/certs/supabase-ca.crt')});
    secure.on('error',()=>client.destroy());
    secure.once('secureConnect',()=>{if(!secure.authorized){secure.destroy();client.destroy();return;}client.pipe(secure).pipe(client);client.resume();});
    client.on('close',()=>secure.destroy());
  });
});
server.listen(0,'127.0.0.1',()=>{
  const local=new URL(remote);local.hostname='127.0.0.1';local.port=String(server.address().port);local.search='?sslmode=disable';
  // Plaintext is restricted to loopback; the remote hop always uses verified TLS.
  const child=spawn(root+'/node_modules/.bin/prisma',['migrate',process.argv[2]||'deploy'],{cwd:root,env:{...process.env,DATABASE_URL:local.toString()},stdio:'inherit'});
  child.on('error',()=>{for(const s of sockets)s.destroy();server.close();process.exitCode=1;});
  child.on('exit',code=>{for(const s of sockets)s.destroy();server.close();process.exitCode=code||0;});
});
