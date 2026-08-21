<?php
declare(strict_types=1);

$configFile = __DIR__ . '/config.local.php';
if (!is_file($configFile)) { http_response_code(503); header('Content-Type: application/json'); echo json_encode(['error'=>'API ist nicht konfiguriert.']); exit; }
$config = require $configFile;

function respond(int $status, array $body=[]): never { http_response_code($status); header('Content-Type: application/json; charset=utf-8'); echo json_encode($body, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); exit; }
function body(): array { $v=json_decode(file_get_contents('php://input') ?: '{}', true); if (!is_array($v)) respond(400,['error'=>'Ungültige Anfrage.']); return $v; }
function db(array $c): PDO { static $pdo; if ($pdo instanceof PDO) return $pdo; $pdo=new PDO(sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',$c['db_host'],$c['db_port'],$c['db_name']),$c['db_user'],$c['db_password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]); return $pdo; }
function b64e(string $v): string { return rtrim(strtr(base64_encode($v),'+/','-_'),'='); }
function b64d(string $v): string|false { $v=strtr($v,'-_','+/'); return base64_decode($v . str_repeat('=', (4-strlen($v)%4)%4),true); }
function token(array $claims,string $secret): string { $ttl=($claims['kind']??'')==='teilnehmer'?60*60*24*30:60*60*12; $payload=b64e(json_encode($claims+['exp'=>time()+$ttl],JSON_UNESCAPED_UNICODE)); return $payload.'.'.b64e(hash_hmac('sha256',$payload,$secret,true)); }
function session(string $secret): array { $h=$_SERVER['HTTP_AUTHORIZATION']??($_SERVER['REDIRECT_HTTP_AUTHORIZATION']??(getenv('HTTP_AUTHORIZATION')?:'')); if(!preg_match('/^Bearer\s+(.+)$/i',$h,$m)) respond(401,['error'=>'Bitte erneut anmelden.']); $p=explode('.',$m[1],2); if(count($p)!==2||!hash_equals(b64e(hash_hmac('sha256',$p[0],$secret,true)),$p[1])) respond(401,['error'=>'Ungültige Sitzung.']); $raw=b64d($p[0]); $v=$raw===false?null:json_decode($raw,true); if(!is_array($v)||($v['exp']??0)<time()||empty($v['sub'])||empty($v['kind'])) respond(401,['error'=>'Sitzung abgelaufen.']); return $v; }
function admin(string $secret): array { $s=session($secret); if(($s['kind']??'')!=='admin'||($s['role']??'')!=='admin') respond(403,['error'=>'Nur Admins erlaubt.']); return $s; }
function uuid(): string { $b=random_bytes(16); $b[6]=chr((ord($b[6])&0x0f)|0x40); $b[8]=chr((ord($b[8])&0x3f)|0x80); return vsprintf('%s%s-%s-%s-%s-%s%s%s',str_split(bin2hex($b),4)); }
function validDate(string $v): bool { $d=DateTimeImmutable::createFromFormat('!Y-m-d',$v); return $d!==false&&$d->format('Y-m-d')===$v; }
function actor(string $secret): array { $s=session($secret); if(!in_array($s['kind'],['admin','teilnehmer'],true)) respond(403,['error'=>'Keine Berechtigung.']); return $s; }

$origin=$_SERVER['HTTP_ORIGIN']??'';
if($origin!==''&&in_array($origin,$config['allowed_origins'],true)){ header('Access-Control-Allow-Origin: '.$origin); header('Vary: Origin'); }
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Admin-Secret'); header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS'); header('Cache-Control: no-store');
if(($_SERVER['REQUEST_METHOD']??'')==='OPTIONS'){http_response_code(204);exit;}
$path='/' . trim((string)(parse_url($_SERVER['REQUEST_URI']??'/',PHP_URL_PATH)?:'/'),'/');
if(str_starts_with($path,'/api')) $path='/' . trim(substr($path,4),'/');
$method=$_SERVER['REQUEST_METHOD']??'GET';

try {
  $pdo=db($config);
  if($method==='GET'&&$path==='/health'){ $pdo->query('select 1'); respond(200,['status'=>'ok']); }
  if($method==='GET'&&$path==='/data'){
    $profiles=$pdo->query('select id,vorname,name,ortswehr from profiles order by name,vorname')->fetchAll();
    $teilnehmer=$pdo->query('select id,vorname,name,ortswehr from teilnehmer order by name,vorname')->fetchAll();
    $termine=$pdo->query('select id,titel,date_format(datum,"%Y-%m-%d") datum,if(uhrzeit is null,null,time_format(uhrzeit,"%H:%i:%s")) uhrzeit,hinweis from termine order by datum')->fetchAll();
    $r=$pdo->query('select termin_id,profile_id,teilnehmer_id,teilnehmer_vorname,teilnehmer_name,teilnehmer_ortswehr,status,rolle from rueckmeldungen')->fetchAll();
    respond(200,['profiles'=>$profiles,'teilnehmer'=>$teilnehmer,'termine'=>$termine,'rueckmeldungen'=>$r]);
  }
  if($method==='POST'&&$path==='/auth/login'){
    $b=body(); $email=mb_strtolower(trim((string)($b['email']??''))); $password=(string)($b['password']??'');
    $q=$pdo->prepare('select id,email,password_hash,vorname,name,ortswehr,role from profiles where lower(email)=? limit 1'); $q->execute([$email]); $p=$q->fetch();
    if(!$p||!password_verify($password,$p['password_hash'])) respond(401,['error'=>'E-Mail oder Passwort ist ungültig.']);
    $claims=['sub'=>$p['id'],'kind'=>'admin','role'=>$p['role']]; $t=token($claims,(string)$config['session_secret']); unset($p['password_hash']);
    respond(200,['token'=>$t,'user'=>['id'=>$p['id'],'email'=>$p['email']],'profile'=>$p]);
  }
  if($method==='POST'&&$path==='/teilnahme/session'){
    $b=body(); $v=trim((string)($b['vorname']??'')); $n=trim((string)($b['name']??'')); $o=trim((string)($b['ortswehr']??'')); $code=trim((string)($b['code']??''));
    if(!hash_equals((string)$config['teilnahme_access_code'],$code)||mb_strlen($v)<1||mb_strlen($n)<1||!in_array($o,['Felm','Rathmannsdorf-Felmerholz'],true)||mb_strlen($v)>120||mb_strlen($n)>120) respond(401,['error'=>'Angaben oder Zugangscode sind ungültig.']);
    $key=hash('sha256',mb_strtolower($v).'|'.mb_strtolower($n).'|'.mb_strtolower($o)); $q=$pdo->prepare('select id,vorname,name,ortswehr from teilnehmer where identity_key=?'); $q->execute([$key]); $p=$q->fetch();
    if(!$p){$p=['id'=>uuid(),'vorname'=>$v,'name'=>$n,'ortswehr'=>$o];$q=$pdo->prepare('insert into teilnehmer(id,vorname,name,ortswehr,identity_key) values(?,?,?,?,?)');$q->execute([$p['id'],$v,$n,$o,$key]);}
    respond(200,$p+['token'=>token(['sub'=>$p['id'],'kind'=>'teilnehmer'],(string)$config['session_secret'])]);
  }
  if($method==='PUT'&&$path==='/rueckmeldungen'){
    $s=actor((string)$config['session_secret']); $b=body(); $termin=(string)($b['termin_id']??''); $status=(string)($b['status']??''); $rolle=$b['rolle']??null;
    if(!in_array($status,['ja','nein','unsicher'],true)||($rolle!==null&&!in_array($rolle,['pa_traeger','maschinist','beide'],true))) respond(422,['error'=>'Rückmeldung ist ungültig.']);
    $terminQuery=$pdo->prepare('select titel,date_format(datum,"%Y-%m-%d") datum from termine where id=?');$terminQuery->execute([$termin]);$terminRow=$terminQuery->fetch();if(!$terminRow)respond(404,['error'=>'Termin nicht gefunden.']);if($terminRow['datum']==='2026-10-03'&&$terminRow['titel']==='Weisswurst Frühstück von der Gemeindewehrführung')$rolle=null;
    if($s['kind']==='teilnehmer'){$q=$pdo->prepare('select vorname,name,ortswehr from teilnehmer where id=?');$q->execute([$s['sub']]);$p=$q->fetch();if(!$p)respond(401,['error'=>'Teilnehmer nicht gefunden.']);$q=$pdo->prepare('insert into rueckmeldungen(termin_id,profile_id,teilnehmer_id,teilnehmer_vorname,teilnehmer_name,teilnehmer_ortswehr,status,rolle) values(?,null,?,?,?,?,?,?) on duplicate key update status=values(status),rolle=values(rolle),teilnehmer_vorname=values(teilnehmer_vorname),teilnehmer_name=values(teilnehmer_name),teilnehmer_ortswehr=values(teilnehmer_ortswehr)');$q->execute([$termin,$s['sub'],$p['vorname'],$p['name'],$p['ortswehr'],$status,$rolle]);}
    else {$q=$pdo->prepare('insert into rueckmeldungen(termin_id,profile_id,teilnehmer_id,status,rolle) values(?,?,null,?,?) on duplicate key update status=values(status),rolle=values(rolle)');$q->execute([$termin,$s['sub'],$status,$rolle]);}
    respond(200,['status'=>'saved']);
  }
  if($method==='PUT'&&$path==='/profile'){
    $s=session((string)$config['session_secret']); if($s['kind']!=='admin')respond(403,['error'=>'Keine Berechtigung.']); $b=body();$v=trim((string)($b['vorname']??''));$n=trim((string)($b['name']??''));$o=trim((string)($b['ortswehr']??''));if($n===''||mb_strlen($n)>120||mb_strlen($v)>120||!in_array($o,['Felm','Rathmannsdorf-Felmerholz'],true))respond(422,['error'=>'Profilangaben prüfen.']);$q=$pdo->prepare('update profiles set vorname=?,name=?,ortswehr=? where id=?');$q->execute([$v,$n,$o,$s['sub']]);respond(200,['profile'=>['id'=>$s['sub'],'vorname'=>$v,'name'=>$n,'ortswehr'=>$o]]);
  }
  if($method==='POST'&&$path==='/termine'){
    $s=admin((string)$config['session_secret']);$b=body();$title=trim((string)($b['titel']??''));$date=(string)($b['datum']??'');$time=trim((string)($b['uhrzeit']??''))?:null;$note=trim((string)($b['hinweis']??''))?:null;if($title===''||mb_strlen($title)>200||!validDate($date)||($time!==null&&!preg_match('/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/',$time)))respond(422,['error'=>'Terminangaben prüfen.']);$id=uuid();$q=$pdo->prepare('insert into termine(id,titel,datum,uhrzeit,hinweis,created_by) values(?,?,?,?,?,?)');$q->execute([$id,$title,$date,$time,$note,$s['sub']]);respond(201,['id'=>$id]);
  }
  if($method==='DELETE'&&preg_match('#^/termine/([a-f0-9-]{36})$#i',$path,$m)){admin((string)$config['session_secret']);$q=$pdo->prepare('delete from termine where id=?');$q->execute([$m[1]]);respond(200,['status'=>'deleted']);}
  respond(404,['error'=>'Nicht gefunden.']);
} catch(PDOException $e){error_log($e->getMessage());$p=['error'=>'Datenbankfehler.'];if(hash_equals((string)$config['admin_secret'],$_SERVER['HTTP_X_ADMIN_SECRET']??''))$p['diagnostic']=$e->getMessage();respond(500,$p);} catch(Throwable $e){error_log($e->getMessage());respond(500,['error'=>'Interner Fehler.']);}
