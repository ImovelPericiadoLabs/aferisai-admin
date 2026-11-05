#!/usr/bin/env python3
"""Compiles (or syntax-checks) and runs every code sample of the documentation, in every language.

The samples live in src/integration-samples.ts. For each language this script writes them to a temp
folder, points the API address at a local HTTP server that records what arrives, runs a small driver
and checks fixed vectors (PKCE challenge, UUIDv7 layout, HMAC signature) plus the exact requests sent.

Needs: node 22+ (reads the .ts file directly), python3 with `requests`, go, java 17+ (source launcher)
and the .NET SDK. A language whose toolchain is missing fails loudly; pass names to run only some:

    python3 scripts/verify-doc-samples.py            # all
    python3 scripts/verify-doc-samples.py go java    # only these
"""
import base64, hashlib, hmac, json, os, re, shutil, subprocess, sys, tempfile, threading, time
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = json.loads(subprocess.run(
    ["node", "--input-type=module", "-e",
     "const m = await import('./src/integration-samples.ts'); console.log(JSON.stringify(Object.fromEntries(Object.entries(m.integrationSamples).map(([k, v]) => [k, v.variants]))))"],
    cwd=REPO, capture_output=True, text=True, check=True).stdout)

ROOT = tempfile.mkdtemp(prefix="doc-samples-")
PORT = 8765
BASE = f"http://127.0.0.1:{PORT}"
UUID7 = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
SECRET, TS = "whsec_exemplo_nao_use_em_producao", "2026-10-23T12:00:01.000000+00:00"
BODY = b'{"application_id":"x","data":{"n":"\\u00e7"},"id":"1"}'
SIG = "sha256=" + hmac.new(SECRET.encode(), TS.encode() + b"." + BODY, hashlib.sha256).hexdigest()

log = []  # recorded requests of the current language
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def _go(self):
        if "chunked" in (self.headers.get("transfer-encoding") or "").lower():
            raw = b""
            while True:
                size = int(self.rfile.readline().strip() or b"0", 16)
                if size == 0:
                    self.rfile.readline(); break
                raw += self.rfile.read(size); self.rfile.readline()
        else:
            raw = self.rfile.read(int(self.headers.get("content-length") or 0))
        log.append({"m": self.command, "p": self.path, "h": {k.lower(): v for k, v in self.headers.items()}, "b": raw.decode()})
        out = json.dumps({"access_token": "tok", "token_type": "Bearer", "expires_in": 900, "scope": "registry:submit"} if self.path == "/oauth/token" else {"id": "op1", "status": "pending"}).encode()
        self.send_response(201 if self.command == "POST" and self.path != "/oauth/token" else 200)
        self.send_header("content-type", "application/json"); self.send_header("content-length", str(len(out))); self.end_headers(); self.wfile.write(out)
    do_GET = do_POST = _go
srv = HTTPServer(("127.0.0.1", PORT), H); threading.Thread(target=srv.serve_forever, daemon=True).start()

results = []
def ok(name, cond, detail=""):
    results.append((name, bool(cond), detail)); print(("PASS " if cond else "FAIL ") + name + ("" if cond else " — " + str(detail)))

def jl(x):
    try: return json.loads(x)
    except Exception: return None

def check_server(lang):
    tok = [r for r in log if r["p"] == "/oauth/token"]
    ok(f"{lang} token: one POST", len(tok) == 1, len(tok))
    if tok:
        r = tok[0]; f = parse_qs(r["b"])
        ok(f"{lang} token: Basic auth", r["h"].get("authorization") == "Basic " + base64.b64encode(b"cid:sec").decode(), r["h"].get("authorization"))
        ok(f"{lang} token: form content-type", r["h"].get("content-type", "").startswith("application/x-www-form-urlencoded"), r["h"].get("content-type"))
        ok(f"{lang} token: exactly the 4 fields", {k: v[0] for k, v in f.items()} == {"grant_type": "authorization_code", "code": "the code", "redirect_uri": "https://p.example/cb?a=1&b=2", "code_verifier": "ver-ifier"}, f)
    post = [r for r in log if r["m"] == "POST" and r["p"].startswith("/v1/")]
    ok(f"{lang} create: one POST to /number", len(post) == 1 and post[0]["p"] == "/v1/partner/registry-requests/number", [r["p"] for r in post])
    if post:
        r = post[0]
        ok(f"{lang} create: bearer + UUIDv7 key + json", r["h"].get("authorization") == "Bearer tok" and bool(UUID7.match(r["h"].get("idempotency-key", ""))) and r["h"].get("content-type", "").startswith("application/json"), r["h"])
        ok(f"{lang} create: body", jl(r["b"]) == {"product": "visualizacao", "office_id": "11111111-1111-7111-8111-111111111111", "registration_numbers": ["12345"]}, r["b"])
    get = [r for r in log if r["m"] == "GET"]
    ok(f"{lang} get: path + bearer", len(get) == 1 and get[0]["p"] == "/v1/partner/registry-requests/op1" and get[0]["h"].get("authorization") == "Bearer tok", get)

def sh(cmd, cwd, timeout=180):
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
    return p.returncode, p.stdout + p.stderr

def sub(code): return code.replace("https://api.aferis.ai", BASE)

def run_driver(lang, cmd, cwd, expect_lines):
    log.clear()
    rc, out = sh(cmd, cwd)
    for line in out.splitlines():
        if line.startswith("OK ") or line.startswith("NO "):
            ok(f"{lang} {line[3:]}", line.startswith("OK "), line)
    ok(f"{lang} driver exited 0", rc == 0, out[-900:])
    got = sum(1 for l in out.splitlines() if l.startswith("OK "))
    ok(f"{lang} driver produced {expect_lines} OK lines", got == expect_lines, got)
    check_server(lang)

ORDER_KEY = "0190aaaa-bbbb-7ccc-8ddd-eeeeeeeeeeee"
ORDER_OFFICE = "11111111-1111-7111-8111-111111111111"

def check_orders(lang):
    calls = [r for r in log if r["p"].startswith("/v1/partner/orders") or r["p"] == "/v1/partner/payment-options"]
    seq = [(r["m"], r["p"]) for r in calls]
    ok(f"{lang} orders: four calls in order", seq == [("GET", "/v1/partner/payment-options"), ("POST", "/v1/partner/orders"), ("GET", "/v1/partner/orders/op1"), ("POST", "/v1/partner/orders/op1/payment")], seq)
    if len(calls) == 4:
        create, pay = calls[1], calls[3]
        ok(f"{lang} orders: bearer on every call", all(r["h"].get("authorization") == "Bearer tok" for r in calls), [r["h"].get("authorization") for r in calls])
        ok(f"{lang} orders: create key + json body", create["h"].get("idempotency-key") == ORDER_KEY and create["h"].get("content-type", "").startswith("application/json") and jl(create["b"]) == {"source": "number", "product": "inteiro_teor_simples", "office_id": ORDER_OFFICE, "registration_numbers": ["12345"]}, create)
        ok(f"{lang} orders: payment body, no key", jl(pay["b"]) == {"method": "pix", "accepted": True} and "idempotency-key" not in pay["h"], pay)

def run_orders(lang, cmd, cwd):
    log.clear()
    rc, out = sh(cmd, cwd)
    lines = [l for l in out.splitlines() if l.startswith(("OK ", "NO "))]
    for line in lines: ok(f"{lang} {line[3:]}", line.startswith("OK "), line)
    ok(f"{lang} orders driver exited 0 and printed 1 OK", rc == 0 and sum(l.startswith("OK ") for l in lines) == 1, out[-700:])
    check_orders(lang)

only = sys.argv[1:]

# ── shell ───────────────────────────────────────────────
if not only or "curl" in only:
    d = os.path.join(ROOT, "curl"); os.makedirs(d)
    for name, variants in S.items():
        if "curl" in variants:
            open(f"{d}/{name}.sh", "w").write(variants["curl"] + "\n")
            rc, out = sh(["bash", "-n", f"{name}.sh"], d); ok(f"curl {name}: bash -n", rc == 0, out)
    # PKCE derivation against the RFC 7636 vector, using the sample's own lines
    src = S["oauth-authorize"]["curl"].splitlines()
    chal = [l for l in src if l.startswith("CHALLENGE=")][0]
    ver = [l for l in src if l.startswith("VERIFIER=")][0]
    vec = "dBjftJeZ4CVP-mmPfBiFVwaDrnwlrmYoSlr-i2-nEnk"
    rc, out = sh(["bash", "-c", f'VERIFIER={vec}; {chal}; echo "$CHALLENGE"'], d)
    ok("curl pkce: same as hashlib for a fixed verifier", out.strip() == base64.urlsafe_b64encode(hashlib.sha256(vec.encode()).digest()).rstrip(b"=").decode(), out)
    rc, out = sh(["bash", "-c", f'{ver}; echo -n "$VERIFIER" | wc -c'], d); ok("curl pkce: verifier is 64 chars of base64url", out.strip() == "64", out)
    rc, out = sh(["bash", "-c", f'{ver}; echo "$VERIFIER"'], d); ok("curl pkce: verifier alphabet", re.fullmatch(r"[A-Za-z0-9_-]{64}", out.strip()) is not None, out)
    # run the authorize curl against the local server
    log.clear()
    script = sub(S["oauth-authorize"]["curl"])
    rc, out = sh(["bash", "-c", f'CLIENT_ID=cid REDIRECT_URI="https://p.example/cb?a=1&b=2"; {script}'], d)
    r = [x for x in log if x["p"].startswith("/oauth/authorize")]
    q = parse_qs(urlparse(r[0]["p"]).query) if r else {}
    ok("curl authorize: 7 params, scope space-separated", r and q.get("response_type") == ["code"] and q.get("scope") == ["all"] and q.get("code_challenge_method") == ["S256"] and q.get("redirect_uri") == ["https://p.example/cb?a=1&b=2"] and len(q["state"][0]) >= 16 and len(q["code_challenge"][0]) == 43, q)
    log.clear()
    rc, out = sh(["bash", "-c", f'CLIENT_ID=cid CLIENT_SECRET=sec CODE="the code" REDIRECT_URI="https://p.example/cb?a=1&b=2" VERIFIER=ver-ifier; {sub(S["oauth-token"]["curl"])}'], d)
    t = [x for x in log if x["p"] == "/oauth/token"]; f = parse_qs(t[0]["b"]) if t else {}
    ok("curl token: Basic + form fields", t and t[0]["h"].get("authorization") == "Basic " + base64.b64encode(b"cid:sec").decode() and {k: v[0] for k, v in f.items()} == {"grant_type": "authorization_code", "code": "the code", "redirect_uri": "https://p.example/cb?a=1&b=2", "code_verifier": "ver-ifier"}, f)
    log.clear()
    rc, out = sh(["bash", "-c", f'ACCESS_TOKEN=tok UUIDV7=0190aaaa-bbbb-7ccc-8ddd-eeeeeeeeeeee; {sub(S["create-request"]["curl"])}'], d)
    log.clear()
    rc, out = sh(["bash", "-c", f'ACCESS_TOKEN=tok UUIDV7={ORDER_KEY}; ' + sub(S["partner-order"]["curl"]).replace("<ORDER_ID>", "op1").replace("<OFFICE_UUIDV7>", ORDER_OFFICE)], d)
    check_orders("curl")
    log.clear()
    rc, out = sh(["bash", "-c", f'ACCESS_TOKEN=tok UUIDV7=0190aaaa-bbbb-7ccc-8ddd-eeeeeeeeeeee; {sub(S["create-request"]["curl"])}'], d)
    ok("curl create: POST + GET sent", [x["m"] for x in log] == ["POST", "GET"] and log[0]["h"].get("idempotency-key") == "0190aaaa-bbbb-7ccc-8ddd-eeeeeeeeeeee" and json.loads(log[0]["b"])["registration_numbers"] == ["12345"], log)

# ── node ───────────────────────────────────────────────
if not only or "node" in only:
    d = os.path.join(ROOT, "node"); os.makedirs(d)
    for name, variants in S.items():
        if "node" in variants: open(f"{d}/{name}.mjs", "w").write(sub(variants["node"]) + "\n")
    for name in S:
        if "node" in S[name]:
            rc, out = sh(["node", "--check", f"{name}.mjs"], d); ok(f"node {name}: --check", rc == 0, out)
    open(f"{d}/driver.mjs", "w").write(r'''
import { createHash } from "node:crypto";
import { startAuthorization, createPkce } from "./oauth-authorize.mjs";
import { exchangeCode } from "./oauth-token.mjs";
import { uuidv7, createRegistryRequest, getRegistryRequest } from "./create-request.mjs";
import { assinaturaValida } from "./verify-webhook.mjs";
const ok = (n, c) => console.log((c ? "OK " : "NO ") + n);
const session = {};
const url = new URL(startAuthorization(session, "cid", "https://p.example/cb?a=1&b=2"));
const q = url.searchParams;
ok("pkce: challenge = base64url(sha256(verifier))", q.get("code_challenge") === createHash("sha256").update(session.oauth.verifier).digest("base64url"));
ok("pkce: lengths 64/43", session.oauth.verifier.length === 64 && q.get("code_challenge").length === 43);
ok("authorize: params", q.get("response_type") === "code" && q.get("scope") === "all" && q.get("code_challenge_method") === "S256" && q.get("redirect_uri") === "https://p.example/cb?a=1&b=2" && q.get("state") === session.oauth.state && q.get("state").length >= 16 && url.pathname === "/oauth/authorize");
ok("pkce: verifier alphabet", /^[A-Za-z0-9_-]+$/.test(createPkce().verifier));
const token = await exchangeCode({ clientId: "cid", clientSecret: "sec", code: "the code", redirectUri: "https://p.example/cb?a=1&b=2", verifier: "ver-ifier" });
ok("token: parsed", token.access_token === "tok" && token.expires_in === 900);
const id = uuidv7();
ok("uuidv7: format", /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id));
ok("uuidv7: fixed time prefix", uuidv7(0x0190aabbccdd).startsWith("0190aabb-ccdd-7"));
ok("uuidv7: unique", uuidv7() !== uuidv7());
const op = await createRegistryRequest("tok", id, "11111111-1111-7111-8111-111111111111", ["12345"]);
const got = await getRegistryRequest("tok", op.id);
ok("create/get: parsed", op.id === "op1" && got.id === "op1");
const body = Buffer.from(%s);
ok("webhook: valid", assinaturaValida(body, %s, %s, %s));
ok("webhook: wrong sig", !assinaturaValida(body, %s, "sha256=00", %s));
ok("webhook: missing header", !assinaturaValida(body, %s, undefined, %s));
ok("webhook: tampered body", !assinaturaValida(Buffer.from("{}"), %s, %s, %s));
''' % tuple([json.dumps(BODY.decode()) ] + [json.dumps(x) for x in (TS, SIG, SECRET, TS, SECRET, TS, SECRET, TS, SIG, SECRET)]))
    run_driver("node", ["node", "driver.mjs"], d, 13)
    open(f"{d}/order-driver.mjs", "w").write(r'''
import { paymentOptions, createOrder, getOrder, payOrder } from "./partner-order.mjs";
const ok = (n, c) => console.log((c ? "OK " : "NO ") + n);
const options = await paymentOptions("tok");
const order = await createOrder("tok", "0190aaaa-bbbb-7ccc-8ddd-eeeeeeeeeeee", "11111111-1111-7111-8111-111111111111", "12345");
const got = await getOrder("tok", "op1");
const paid = await payOrder("tok", "op1", "pix");
ok("orders: parsed", options.id === "op1" && order.id === "op1" && got.id === "op1" && paid.id === "op1");
''')
    run_orders("node", ["node", "order-driver.mjs"], d)

# ── python ─────────────────────────────────────────────
if not only or "python" in only:
    d = os.path.join(ROOT, "python"); os.makedirs(d)
    for name, variants in S.items():
        if "python" in variants:
            open(f"{d}/{name.replace('-', '_')}.py", "w").write(sub(variants["python"]) + "\n")
            rc, out = sh(["python3", "-m", "py_compile", f"{name.replace('-', '_')}.py"], d); ok(f"python {name}: py_compile", rc == 0, out)
    open(f"{d}/driver.py", "w").write(r'''
import base64, hashlib, re
from urllib.parse import urlparse, parse_qs
import oauth_authorize as a, oauth_token as t, create_request as c, verify_webhook as w
def ok(n, c): print(("OK " if c else "NO ") + n)
session = {}
url = a.start_authorization(session, "cid", "https://p.example/cb?a=1&b=2")
q = {k: v[0] for k, v in parse_qs(urlparse(url).query).items()}
exp = base64.urlsafe_b64encode(hashlib.sha256(session["oauth"]["verifier"].encode()).digest()).rstrip(b"=").decode()
ok("pkce: challenge = base64url(sha256(verifier))", q["code_challenge"] == exp)
ok("pkce: lengths 64/43", len(session["oauth"]["verifier"]) == 64 and len(q["code_challenge"]) == 43)
ok("authorize: params", q["response_type"] == "code" and q["scope"] == "all" and q["redirect_uri"] == "https://p.example/cb?a=1&b=2" and q["state"] == session["oauth"]["state"] and len(q["state"]) >= 16 and "scope=all" in url)
ok("pkce: verifier alphabet", re.fullmatch(r"[A-Za-z0-9_-]+", a.create_pkce()[0]) is not None)
tok = t.exchange_code("cid", "sec", "the code", "https://p.example/cb?a=1&b=2", "ver-ifier")
ok("token: parsed", tok["access_token"] == "tok" and tok["expires_in"] == 900)
k = c.uuid7()
ok("uuid7: format", re.fullmatch(r"[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}", k) is not None)
ok("uuid7: unique", c.uuid7() != c.uuid7())
import time
ok("uuid7: timestamp prefix near now", abs(int(k.replace("-", "")[:12], 16) - time.time() * 1000) < 5000)
op = c.create_registry_request("tok", k, "11111111-1111-7111-8111-111111111111", ["12345"])
got = c.get_registry_request("tok", op["id"])
ok("create/get: parsed", op["id"] == "op1" and got["id"] == "op1")
body = %s.encode()
ok("webhook: valid", w.assinatura_valida(body, %s, %s, %s))
ok("webhook: wrong sig", not w.assinatura_valida(body, %s, "sha256=00", %s))
ok("webhook: missing header", not w.assinatura_valida(body, %s, None, %s))
ok("webhook: tampered body", not w.assinatura_valida(b"{}", %s, %s, %s))
''' % tuple([repr(BODY.decode())] + [repr(x) for x in (TS, SIG, SECRET, TS, SECRET, TS, SECRET, TS, SIG, SECRET)]))
    run_driver("python", ["python3", "driver.py"], d, 13)
    open(f"{d}/order_driver.py", "w").write(r'''
import partner_order as po
def ok(n, c): print(("OK " if c else "NO ") + n)
options = po.payment_options("tok")
order = po.create_order("tok", "0190aaaa-bbbb-7ccc-8ddd-eeeeeeeeeeee", "11111111-1111-7111-8111-111111111111", "12345")
got = po.get_order("tok", "op1")
paid = po.pay_order("tok", "op1", "pix")
ok("orders: parsed", options["id"] == "op1" and order["id"] == "op1" and got["id"] == "op1" and paid["id"] == "op1")
''')
    run_orders("python", ["python3", "order_driver.py"], d)

# ── go ─────────────────────────────────────────────────
if not only or "go" in only:
    for name, variants in S.items():
        if "go" not in variants: continue
        d = os.path.join(ROOT, "go-" + name); os.makedirs(d)
        open(f"{d}/go.mod", "w").write("module sample\n\ngo 1.22\n")
        open(f"{d}/sample.go", "w").write(sub(variants["go"]) + "\n")
        rc, out = sh(["gofmt", "-l", "-e", "."], d); ok(f"go {name}: gofmt clean", rc == 0 and out.strip() == "", out)
    gd = lambda n: os.path.join(ROOT, "go-" + n)
    open(f"{gd('oauth-authorize')}/main.go", "w").write(r'''package main
import ("crypto/sha256";"encoding/base64";"fmt";"net/url";"regexp")
func ok(n string, c bool) { if c { fmt.Println("OK " + n) } else { fmt.Println("NO " + n) } }
func main() {
	session := map[string]string{}
	raw := startAuthorization(session, "cid", "https://p.example/cb?a=1&b=2")
	u, _ := url.Parse(raw); q := u.Query()
	sum := sha256.Sum256([]byte(session["oauth_verifier"]))
	ok("pkce: challenge = base64url(sha256(verifier))", q.Get("code_challenge") == base64.RawURLEncoding.EncodeToString(sum[:]))
	ok("pkce: lengths 64/43", len(session["oauth_verifier"]) == 64 && len(q.Get("code_challenge")) == 43)
	ok("authorize: params", q.Get("response_type") == "code" && q.Get("scope") == "all" && q.Get("redirect_uri") == "https://p.example/cb?a=1&b=2" && q.Get("state") == session["oauth_state"] && len(q.Get("state")) >= 16 && u.Path == "/oauth/authorize")
	v, _ := createPKCE()
	ok("pkce: verifier alphabet", regexp.MustCompile(`^[A-Za-z0-9_-]+$`).MatchString(v))
}
''')
    open(f"{gd('oauth-token')}/main.go", "w").write(r'''package main
import "fmt"
func ok(n string, c bool) { if c { fmt.Println("OK " + n) } else { fmt.Println("NO " + n) } }
func main() {
	tok, err := exchangeCode("cid", "sec", "the code", "https://p.example/cb?a=1&b=2", "ver-ifier")
	ok("token: parsed", err == nil && tok.AccessToken == "tok" && tok.ExpiresIn == 900)
}
''')
    open(f"{gd('create-request')}/main.go", "w").write(r'''package main
import ("encoding/json";"fmt";"regexp";"strings";"time")
func ok(n string, c bool) { if c { fmt.Println("OK " + n) } else { fmt.Println("NO " + n) } }
func main() {
	id := uuidV7()
	ok("uuid7: format", regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`).MatchString(id))
	ok("uuid7: unique", uuidV7() != uuidV7())
	ok("uuid7: timestamp prefix near now", strings.HasPrefix(id, fmt.Sprintf("%08x-%04x", time.Now().UnixMilli()>>16, time.Now().UnixMilli()&0xffff)[:8]))
	body, err := createRegistryRequest("tok", id, "11111111-1111-7111-8111-111111111111", []string{"12345"})
	var op map[string]any; _ = json.Unmarshal(body, &op)
	got, err2 := getRegistryRequest("tok", fmt.Sprint(op["id"]))
	ok("create/get: parsed", err == nil && err2 == nil && op["id"] == "op1" && strings.Contains(string(got), "op1"))
}
''')
    open(f"{gd('verify-webhook')}/main.go", "w").write(r'''package main
import "fmt"
func ok(n string, c bool) { if c { fmt.Println("OK " + n) } else { fmt.Println("NO " + n) } }
func main() {
	body := []byte(%s)
	ok("webhook: valid", assinaturaValida(body, %s, %s, %s))
	ok("webhook: wrong sig", !assinaturaValida(body, %s, "sha256=00", %s))
	ok("webhook: missing header", !assinaturaValida(body, %s, "", %s))
	ok("webhook: tampered body", !assinaturaValida([]byte("{}"), %s, %s, %s))
}
''' % tuple(["`" + BODY.decode() + "`"] + ['"' + x + '"' for x in (TS, SIG, SECRET, TS, SECRET, TS, SECRET, TS, SIG, SECRET)]))
    open(f"{gd('partner-order')}/main.go", "w").write(r'''package main
import ("fmt";"strings")
func ok(n string, c bool) { if c { fmt.Println("OK " + n) } else { fmt.Println("NO " + n) } }
func main() {
	options, e1 := paymentOptions("tok")
	order, e2 := createOrder("tok", "0190aaaa-bbbb-7ccc-8ddd-eeeeeeeeeeee", "11111111-1111-7111-8111-111111111111", "12345")
	got, e3 := getOrder("tok", "op1")
	paid, e4 := payOrder("tok", "op1", "pix")
	all := e1 == nil && e2 == nil && e3 == nil && e4 == nil
	ok("orders: parsed", all && strings.Contains(string(options)+string(order)+string(got)+string(paid), "op1"))
}
''')
    for name, n_ok in (("oauth-authorize", 4), ("oauth-token", 1), ("create-request", 4), ("verify-webhook", 4), ("partner-order", 1)):
        log.clear()
        d = gd(name)
        rc, out = sh(["go", "vet", "./..."], d); ok(f"go {name}: go vet", rc == 0, out)
        rc, out = sh(["go", "run", "."], d)
        for line in out.splitlines():
            if line.startswith(("OK ", "NO ")): ok(f"go {line[3:]}", line.startswith("OK "), line)
        ok(f"go {name}: ran and printed {n_ok} OK", rc == 0 and sum(l.startswith("OK ") for l in out.splitlines()) == n_ok, out[-500:])
        if name == "partner-order":
            check_orders("go")
        if name == "oauth-token":
            t = [x for x in log if x["p"] == "/oauth/token"]; f = parse_qs(t[0]["b"]) if t else {}
            ok("go token: Basic + form", t and t[0]["h"].get("authorization") == "Basic " + base64.b64encode(b"cid:sec").decode() and {k: v[0] for k, v in f.items()} == {"grant_type": "authorization_code", "code": "the code", "redirect_uri": "https://p.example/cb?a=1&b=2", "code_verifier": "ver-ifier"}, f)
        if name == "create-request":
            post = [x for x in log if x["m"] == "POST"]; get = [x for x in log if x["m"] == "GET"]
            ok("go create: headers/body/get", post and UUID7.match(post[0]["h"].get("idempotency-key", "")) and post[0]["h"].get("authorization") == "Bearer tok" and json.loads(post[0]["b"]) == {"product": "visualizacao", "office_id": "11111111-1111-7111-8111-111111111111", "registration_numbers": ["12345"]} and get and get[0]["p"] == "/v1/partner/registry-requests/op1", log)

# ── java ───────────────────────────────────────────────
if not only or "java" in only:
    d = os.path.join(ROOT, "java"); os.makedirs(d)
    imports, bodies = set(), []
    for name, variants in S.items():
        if "java" not in variants: continue
        src = sub(variants["java"])
        for line in src.splitlines():
            if line.startswith("import "): imports.add(line)
        bodies.append("\n".join(l for l in src.splitlines() if not l.startswith("import ")))
    imports |= {"import java.util.HashMap;", "import java.util.Map;", "import java.util.regex.Pattern;", "import java.net.URI;", "import java.util.UUID;", "import java.util.Arrays;"}
    driver = r'''
class Check {
  static void ok(String n, boolean c) { System.out.println((c ? "OK " : "NO ") + n); }
  public static void main(String[] args) throws Exception {
    if (args.length > 0 && args[0].equals("orders")) {
      String options = PartnerOrders.paymentOptions("tok");
      String order = PartnerOrders.createOrder("tok", "0190aaaa-bbbb-7ccc-8ddd-eeeeeeeeeeee", "11111111-1111-7111-8111-111111111111", "12345");
      String got = PartnerOrders.getOrder("tok", "op1");
      String paid = PartnerOrders.payOrder("tok", "op1", "pix");
      ok("orders: parsed", options.contains("op1") && order.contains("op1") && got.contains("op1") && paid.contains("op1"));
      return;
    }
    Map<String, String> session = new HashMap<>();
    URI uri = URI.create(OAuthStart.start(session, "cid", "https://p.example/cb?a=1&b=2"));
    Map<String, String> q = new HashMap<>();
    for (String pair : uri.getRawQuery().split("&")) { String[] kv = pair.split("=", 2); q.put(kv[0], java.net.URLDecoder.decode(kv[1], "UTF-8")); }
    ok("pkce: challenge = base64url(sha256(verifier))", q.get("code_challenge").equals(OAuthStart.challengeFor(session.get("oauth_verifier"))));
    ok("pkce: lengths 64/43", session.get("oauth_verifier").length() == 64 && q.get("code_challenge").length() == 43);
    ok("authorize: params", q.get("response_type").equals("code") && q.get("scope").equals("all") && q.get("redirect_uri").equals("https://p.example/cb?a=1&b=2") && q.get("state").equals(session.get("oauth_state")) && q.get("state").length() >= 16 && uri.getPath().equals("/oauth/authorize") && uri.getRawQuery().contains("scope=all"));
    ok("pkce: verifier alphabet", Pattern.matches("[A-Za-z0-9_-]+", OAuthStart.randomBase64Url(48)));
    String tok = OAuthToken.exchangeCode("cid", "sec", "the code", "https://p.example/cb?a=1&b=2", "ver-ifier");
    ok("token: parsed", tok.contains("\"access_token\": \"tok\"") || tok.contains("\"access_token\":\"tok\""));
    UUID id = RegistryRequests.uuidV7();
    ok("uuid7: format", Pattern.matches("[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}", id.toString()));
    ok("uuid7: unique", !RegistryRequests.uuidV7().equals(RegistryRequests.uuidV7()));
    ok("uuid7: timestamp prefix near now", Math.abs((id.getMostSignificantBits() >>> 16) - System.currentTimeMillis()) < 5000);
    String created = RegistryRequests.create("tok", id, "11111111-1111-7111-8111-111111111111", "12345");
    String got = RegistryRequests.get("tok", "op1");
    ok("create/get: parsed", created.contains("op1") && got.contains("op1"));
    byte[] body = %s.getBytes("UTF-8");
    ok("webhook: valid", WebhookSignature.assinaturaValida(body, %s, %s, %s));
    ok("webhook: wrong sig", !WebhookSignature.assinaturaValida(body, %s, "sha256=00", %s));
    ok("webhook: missing header", !WebhookSignature.assinaturaValida(body, %s, null, %s));
    ok("webhook: tampered body", !WebhookSignature.assinaturaValida("{}".getBytes(), %s, %s, %s));
  }
}
''' % tuple(['"' + BODY.decode().replace("\\", "\\\\").replace('"', '\\"') + '"'] + ['"' + x + '"' for x in (TS, SIG, SECRET, TS, SECRET, TS, SECRET, TS, SIG, SECRET)])
    open(f"{d}/Check.java", "w").write("\n".join(sorted(imports)) + "\n" + driver + "\n".join(bodies) + "\n")
    run_driver("java", ["java", "Check.java"], d, 13)
    run_orders("java", ["java", "Check.java", "orders"], d)

# ── csharp ─────────────────────────────────────────────
if not only or "csharp" in only:
    d = os.path.join(ROOT, "csharp"); os.makedirs(d)
    subprocess.run(["dotnet", "new", "console", "--no-restore", "-o", d, "--force"], capture_output=True, check=True)
    usings, bodies = set(), []
    for name, variants in S.items():
        if "csharp" not in variants: continue
        src = sub(variants["csharp"])
        for line in src.splitlines():
            if line.startswith("using ") and line.endswith(";") and "=" not in line: usings.add(line)
        bodies.append("\n".join(l for l in src.splitlines() if not (l.startswith("using ") and l.endswith(";") and "var " not in l and not l.startswith("using var"))))
    usings |= {"using System.Collections.Generic;", "using System.Text.RegularExpressions;"}
    driver = r'''
static void Ok(string n, bool c) => Console.WriteLine((c ? "OK " : "NO ") + n);
if (args.Length > 0 && args[0] == "orders")
{
    var ordOptions = await PartnerOrders.PaymentOptionsAsync("tok");
    var ordCreated = await PartnerOrders.CreateOrderAsync("tok", "0190aaaa-bbbb-7ccc-8ddd-eeeeeeeeeeee", "11111111-1111-7111-8111-111111111111", "12345");
    var ordGot = await PartnerOrders.GetOrderAsync("tok", "op1");
    var ordPaid = await PartnerOrders.PayOrderAsync("tok", "op1", "pix");
    Ok("orders: parsed", ordOptions.Contains("op1") && ordCreated.Contains("op1") && ordGot.Contains("op1") && ordPaid.Contains("op1"));
    return;
}
var session = new Dictionary<string, string>();
var uri = new Uri(OAuthStart.Start(session, "cid", "https://p.example/cb?a=1&b=2"));
var q = uri.Query.TrimStart('?').Split('&').Select(p => p.Split('=', 2)).ToDictionary(kv => kv[0], kv => Uri.UnescapeDataString(kv[1]));
var (_, expectedChallenge) = (session["oauth_verifier"], Convert.ToBase64String(SHA256.HashData(Encoding.ASCII.GetBytes(session["oauth_verifier"]))).TrimEnd('=').Replace('+', '-').Replace('/', '_'));
Ok("pkce: challenge = base64url(sha256(verifier))", q["code_challenge"] == expectedChallenge);
Ok("pkce: lengths 64/43", session["oauth_verifier"].Length == 64 && q["code_challenge"].Length == 43);
Ok("authorize: params", q["response_type"] == "code" && q["scope"] == "all" && q["redirect_uri"] == "https://p.example/cb?a=1&b=2" && q["state"] == session["oauth_state"] && q["state"].Length >= 16 && uri.AbsolutePath == "/oauth/authorize" && uri.Query.Contains("scope=all"));
Ok("pkce: verifier alphabet", Regex.IsMatch(OAuthStart.CreatePkce().Verifier, "^[A-Za-z0-9_-]+$"));
var tok = await OAuthToken.ExchangeCodeAsync("cid", "sec", "the code", "https://p.example/cb?a=1&b=2", "ver-ifier");
Ok("token: parsed", tok.GetProperty("access_token").GetString() == "tok" && tok.GetProperty("expires_in").GetInt32() == 900);
var id = RegistryRequests.UuidV7();
Ok("uuid7: format", Regex.IsMatch(id, "^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"));
Ok("uuid7: unique", RegistryRequests.UuidV7() != RegistryRequests.UuidV7());
Ok("uuid7: timestamp prefix near now", Math.Abs(Convert.ToInt64(id.Replace("-", "")[..12], 16) - DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()) < 5000);
var created = await RegistryRequests.CreateAsync("tok", id, "11111111-1111-7111-8111-111111111111", "12345");
var got = await RegistryRequests.GetAsync("tok", "op1");
Ok("create/get: parsed", created.Contains("op1") && got.Contains("op1"));
var body = Encoding.UTF8.GetBytes(%s);
Ok("webhook: valid", WebhookSignature.AssinaturaValida(body, %s, %s, %s));
Ok("webhook: wrong sig", !WebhookSignature.AssinaturaValida(body, %s, "sha256=00", %s));
Ok("webhook: missing header", !WebhookSignature.AssinaturaValida(body, %s, null, %s));
Ok("webhook: tampered body", !WebhookSignature.AssinaturaValida(Encoding.UTF8.GetBytes("{}"), %s, %s, %s));
''' % tuple(['"' + BODY.decode().replace("\\", "\\\\").replace('"', '\\"') + '"'] + ['"' + x + '"' for x in (TS, SIG, SECRET, TS, SECRET, TS, SECRET, TS, SIG, SECRET)])
    open(f"{d}/Program.cs", "w").write("\n".join(sorted(usings)) + "\n" + driver + "\n" + "\n".join(bodies) + "\n")
    rc, out = sh(["dotnet", "build", "-nologo", "-v", "q"], d); ok("csharp: dotnet build", rc == 0, out[-1500:])
    if rc == 0:
        run_driver("csharp", ["dotnet", "run", "--no-build"], d, 13)
        run_orders("csharp", ["dotnet", "run", "--no-build", "--", "orders"], d)

shutil.rmtree(ROOT, ignore_errors=True)
fails = [r for r in results if not r[1]]
print(f"\n{len(results)-len(fails)}/{len(results)} checks passed")
sys.exit(1 if fails else 0)
