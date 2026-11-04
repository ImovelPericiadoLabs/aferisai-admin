import type { CodeSample } from "./docs-model";

/**
 * Code samples shared by the partner documentation and the webhook reference. Each one was compiled
 * (or syntax-checked) and run against a local HTTP server in every language it ships in, with fixed
 * vectors for PKCE, UUIDv7 and the HMAC signature; see docs/design-system/docs-framework.md.
 */
export const integrationSamples = {
  "oauth-authorize": {
    title: "Gerar state e PKCE e abrir a autorização",
    description:
      "Cria o state, o verificador e o desafio PKCE S256 no servidor e monta a URL de autorização.",
    variants: {
      curl: `# 1. Gere state e PKCE no backend (aqui com OpenSSL)
STATE=$(openssl rand -hex 16)
VERIFIER=$(openssl rand -base64 48 | tr '+/' '-_' | tr -d '=\\n')
CHALLENGE=$(printf '%s' "$VERIFIER" | openssl dgst -sha256 -binary | openssl base64 -A | tr '+/' '-_' | tr -d '=')

# 2. Guarde STATE e VERIFIER na sessão do titular, no servidor, e abra a autorização
API_URL="https://api.aferis.ai"
curl --get "$API_URL/oauth/authorize" \\
  --data-urlencode "response_type=code" \\
  --data-urlencode "client_id=$CLIENT_ID" \\
  --data-urlencode "redirect_uri=$REDIRECT_URI" \\
  --data-urlencode "scope=all" \\
  --data-urlencode "state=$STATE" \\
  --data-urlencode "code_challenge=$CHALLENGE" \\
  --data-urlencode "code_challenge_method=S256"`,
      node: `import { createHash, randomBytes } from "node:crypto";

const API_URL = "https://api.aferis.ai";

export function createPkce() {
  const verifier = randomBytes(48).toString("base64url"); // 64 caracteres
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function authorizationUrl({ clientId, redirectUri, scopes, state, challenge }) {
  const url = new URL("/oauth/authorize", API_URL);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(" "),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

// No servidor: guarde state e verifier na sessão do titular e redirecione o navegador.
export function startAuthorization(session, clientId, redirectUri) {
  const state = randomBytes(16).toString("hex"); // mínimo de 16 caracteres
  const { verifier, challenge } = createPkce();
  session.oauth = { state, verifier };
  return authorizationUrl({
    clientId,
    redirectUri,
    scopes: ["all"],
    state,
    challenge,
  });
}`,
      python: `import base64
import hashlib
import secrets
from urllib.parse import quote, urlencode

API_URL = "https://api.aferis.ai"


def create_pkce() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(48)  # 64 caracteres
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
    return verifier, challenge


def authorization_url(client_id, redirect_uri, scopes, state, challenge) -> str:
    query = urlencode(
        {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": " ".join(scopes),
            "state": state,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        },
        quote_via=quote,
    )
    return f"{API_URL}/oauth/authorize?{query}"


def start_authorization(session: dict, client_id: str, redirect_uri: str) -> str:
    # No servidor: guarde state e verifier na sessão do titular.
    state = secrets.token_hex(16)  # mínimo de 16 caracteres
    verifier, challenge = create_pkce()
    session["oauth"] = {"state": state, "verifier": verifier}
    return authorization_url(
        client_id, redirect_uri, ["all"], state, challenge
    )`,
      java: `import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

class OAuthStart {
  static final String API_URL = "https://api.aferis.ai";
  static final SecureRandom RANDOM = new SecureRandom();

  static String randomBase64Url(int bytes) {
    byte[] data = new byte[bytes];
    RANDOM.nextBytes(data);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(data);
  }

  static String challengeFor(String verifier) throws Exception {
    byte[] digest = MessageDigest.getInstance("SHA-256")
        .digest(verifier.getBytes(StandardCharsets.US_ASCII));
    return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
  }

  static String encode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
  }

  static String authorizationUrl(String clientId, String redirectUri, String scope,
      String state, String challenge) {
    Map<String, String> params = new LinkedHashMap<>();
    params.put("response_type", "code");
    params.put("client_id", clientId);
    params.put("redirect_uri", redirectUri);
    params.put("scope", scope);
    params.put("state", state);
    params.put("code_challenge", challenge);
    params.put("code_challenge_method", "S256");
    String query = params.entrySet().stream()
        .map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
        .collect(Collectors.joining("&"));
    return API_URL + "/oauth/authorize?" + query;
  }

  // No servidor: guarde state e verifier na sessão do titular e redirecione o navegador.
  static String start(Map<String, String> session, String clientId, String redirectUri)
      throws Exception {
    String state = randomBase64Url(24); // 32 caracteres; o mínimo é 16
    String verifier = randomBase64Url(48); // 64 caracteres
    session.put("oauth_state", state);
    session.put("oauth_verifier", verifier);
    return authorizationUrl(clientId, redirectUri, "registry:submit registry:read",
        state, challengeFor(verifier));
  }
}`,
      csharp: `using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

static class OAuthStart
{
    const string ApiUrl = "https://api.aferis.ai";

    static string Base64Url(byte[] data) =>
        Convert.ToBase64String(data).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    public static (string Verifier, string Challenge) CreatePkce()
    {
        var verifier = Base64Url(RandomNumberGenerator.GetBytes(48)); // 64 caracteres
        var challenge = Base64Url(SHA256.HashData(Encoding.ASCII.GetBytes(verifier)));
        return (verifier, challenge);
    }

    public static string AuthorizationUrl(string clientId, string redirectUri, string scope,
        string state, string challenge)
    {
        var parameters = new Dictionary<string, string>
        {
            ["response_type"] = "code",
            ["client_id"] = clientId,
            ["redirect_uri"] = redirectUri,
            ["scope"] = scope,
            ["state"] = state,
            ["code_challenge"] = challenge,
            ["code_challenge_method"] = "S256",
        };
        var query = string.Join("&", parameters.Select(item =>
            $"{Uri.EscapeDataString(item.Key)}={Uri.EscapeDataString(item.Value)}"));
        return $"{ApiUrl}/oauth/authorize?{query}";
    }

    // No servidor: guarde state e verifier na sessão do titular e redirecione o navegador.
    public static string Start(IDictionary<string, string> session, string clientId, string redirectUri)
    {
        var state = Base64Url(RandomNumberGenerator.GetBytes(24)); // 32 caracteres; o mínimo é 16
        var (verifier, challenge) = CreatePkce();
        session["oauth_state"] = state;
        session["oauth_verifier"] = verifier;
        return AuthorizationUrl(clientId, redirectUri, "registry:submit registry:read", state, challenge);
    }
}`,
      go: `package main

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"net/url"
	"strings"
)

const apiURL = "https://api.aferis.ai"

func randomString(size int) string {
	data := make([]byte, size)
	if _, err := rand.Read(data); err != nil {
		panic(err)
	}
	return base64.RawURLEncoding.EncodeToString(data)
}

func createPKCE() (verifier, challenge string) {
	verifier = randomString(48) // 64 caracteres
	sum := sha256.Sum256([]byte(verifier))
	challenge = base64.RawURLEncoding.EncodeToString(sum[:])
	return verifier, challenge
}

func authorizationURL(clientID, redirectURI, scope, state, challenge string) string {
	query := url.Values{}
	query.Set("response_type", "code")
	query.Set("client_id", clientID)
	query.Set("redirect_uri", redirectURI)
	query.Set("scope", scope)
	query.Set("state", state)
	query.Set("code_challenge", challenge)
	query.Set("code_challenge_method", "S256")
	return apiURL + "/oauth/authorize?" + strings.ReplaceAll(query.Encode(), "+", "%20")
}

// No servidor: guarde state e verifier na sessão do titular e redirecione o navegador.
func startAuthorization(session map[string]string, clientID, redirectURI string) string {
	state := randomString(24) // 32 caracteres; o mínimo é 16
	verifier, challenge := createPKCE()
	session["oauth_state"] = state
	session["oauth_verifier"] = verifier
	return authorizationURL(clientID, redirectURI, "registry:submit registry:read", state, challenge)
}`,
    },
  },
  "oauth-token": {
    title: "Trocar o code por um token",
    description:
      "Troca o code recebido no retorno por um token de acesso, com o client_id e o segredo em HTTP Basic.",
    variants: {
      curl: `API_URL="https://api.aferis.ai"
curl --request POST "$API_URL/oauth/token" \\
  --user "$CLIENT_ID:$CLIENT_SECRET" \\
  --data-urlencode "grant_type=authorization_code" \\
  --data-urlencode "code=$CODE" \\
  --data-urlencode "redirect_uri=$REDIRECT_URI" \\
  --data-urlencode "code_verifier=$VERIFIER"`,
      node: `const API_URL = "https://api.aferis.ai";

export async function exchangeCode({ clientId, clientSecret, code, redirectUri, verifier }) {
  const basic = Buffer.from(\`\${clientId}:\${clientSecret}\`).toString("base64");
  const response = await fetch(\`\${API_URL}/oauth/token\`, {
    method: "POST",
    headers: {
      Authorization: \`Basic \${basic}\`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(\`OAuth recusou a troca: \${body.error}\`);
  return body; // { access_token, token_type: "Bearer", expires_in: 900, scope }
}`,
      python: `import requests

API_URL = "https://api.aferis.ai"


def exchange_code(client_id, client_secret, code, redirect_uri, verifier) -> dict:
    response = requests.post(
        f"{API_URL}/oauth/token",
        auth=(client_id, client_secret),
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "code_verifier": verifier,
        },
        timeout=10,
    )
    body = response.json()
    if not response.ok:
        raise RuntimeError(f"OAuth recusou a troca: {body.get('error')}")
    return body  # {"access_token": ..., "token_type": "Bearer", "expires_in": 900, "scope": ...}`,
      java: `import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

class OAuthToken {
  static final String API_URL = "https://api.aferis.ai";
  static final HttpClient HTTP = HttpClient.newHttpClient();

  static String form(Map<String, String> fields) {
    return fields.entrySet().stream()
        .map(e -> URLEncoder.encode(e.getKey(), StandardCharsets.UTF_8) + "="
            + URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8))
        .collect(Collectors.joining("&"));
  }

  // Devolve o JSON da resposta; leia access_token com a sua biblioteca JSON.
  static String exchangeCode(String clientId, String clientSecret, String code,
      String redirectUri, String verifier) throws Exception {
    String basic = Base64.getEncoder().encodeToString(
        (clientId + ":" + clientSecret).getBytes(StandardCharsets.UTF_8));
    Map<String, String> fields = new LinkedHashMap<>();
    fields.put("grant_type", "authorization_code");
    fields.put("code", code);
    fields.put("redirect_uri", redirectUri);
    fields.put("code_verifier", verifier);
    HttpRequest request = HttpRequest.newBuilder(URI.create(API_URL + "/oauth/token"))
        .timeout(Duration.ofSeconds(10))
        .header("Authorization", "Basic " + basic)
        .header("Content-Type", "application/x-www-form-urlencoded")
        .POST(HttpRequest.BodyPublishers.ofString(form(fields)))
        .build();
    HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
    if (response.statusCode() != 200) {
      throw new IllegalStateException("OAuth recusou a troca: " + response.body());
    }
    return response.body();
  }
}`,
      csharp: `using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

static class OAuthToken
{
    const string ApiUrl = "https://api.aferis.ai";
    static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(10) };

    public static async Task<JsonElement> ExchangeCodeAsync(string clientId, string clientSecret,
        string code, string redirectUri, string verifier)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{ApiUrl}/oauth/token");
        var basic = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", basic);
        request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["code"] = code,
            ["redirect_uri"] = redirectUri,
            ["code_verifier"] = verifier,
        });
        using var response = await Http.SendAsync(request);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.Clone();
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"OAuth recusou a troca: {body.GetProperty("error")}");
        return body; // access_token, token_type, expires_in, scope
    }
}`,
      go: `package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const apiURL = "https://api.aferis.ai"

type tokenResponse struct {
	AccessToken string \`json:"access_token"\`
	TokenType   string \`json:"token_type"\`
	ExpiresIn   int    \`json:"expires_in"\`
	Scope       string \`json:"scope"\`
}

func exchangeCode(clientID, clientSecret, code, redirectURI, verifier string) (*tokenResponse, error) {
	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("code", code)
	form.Set("redirect_uri", redirectURI)
	form.Set("code_verifier", verifier)

	request, err := http.NewRequest(http.MethodPost, apiURL+"/oauth/token", strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	request.SetBasicAuth(clientID, clientSecret)
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("OAuth recusou a troca: HTTP %d", response.StatusCode)
	}
	var token tokenResponse
	if err := json.NewDecoder(response.Body).Decode(&token); err != nil {
		return nil, err
	}
	return &token, nil
}`,
    },
  },
  "create-request": {
    title: "Criar e consultar um pedido registral",
    description:
      "Cria o pedido com uma Idempotency-Key UUIDv7 e o consulta pelo id devolvido.",
    variants: {
      curl: `API_URL="https://api.aferis.ai"

# Gere um UUIDv7 novo para cada pedido novo e guarde-o antes de enviar
curl --request POST "$API_URL/v1/partner/registry-requests/number" \\
  --header "Authorization: Bearer $ACCESS_TOKEN" \\
  --header "Idempotency-Key: $UUIDV7" \\
  --header "Content-Type: application/json" \\
  --data '{
    "product": "visualizacao",
    "office_id": "<OFFICE_UUIDV7>",
    "registration_numbers": ["12345"]
  }'

# Consulte o pedido pelo id devolvido
curl "$API_URL/v1/partner/registry-requests/<OPERATION_ID>" \\
  --header "Authorization: Bearer $ACCESS_TOKEN"`,
      node: `import { randomBytes } from "node:crypto";

const API_URL = "https://api.aferis.ai";

// UUIDv7: 48 bits de milissegundos + bits aleatórios (RFC 9562)
export function uuidv7(now = Date.now()) {
  const bytes = randomBytes(16);
  bytes.writeUIntBE(now, 0, 6);
  bytes[6] = (bytes[6] & 0x0f) | 0x70; // versão 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante
  const h = bytes.toString("hex");
  return \`\${h.slice(0, 8)}-\${h.slice(8, 12)}-\${h.slice(12, 16)}-\${h.slice(16, 20)}-\${h.slice(20)}\`;
}

async function call(accessToken, path, options = {}) {
  const response = await fetch(\`\${API_URL}\${path}\`, {
    ...options,
    headers: { Authorization: \`Bearer \${accessToken}\`, ...options.headers },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json();
  if (!response.ok) throw Object.assign(new Error(body.detail ?? body.title), { problem: body });
  return body;
}

// Gere a chave uma vez por pedido novo e guarde-a antes de enviar: se a resposta se
// perder, reenvie o mesmo corpo com a mesma chave e o servidor devolve o pedido já criado.
export function createRegistryRequest(accessToken, idempotencyKey, officeId, registrationNumbers) {
  return call(accessToken, "/v1/partner/registry-requests/number", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      product: "visualizacao",
      office_id: officeId,
      registration_numbers: registrationNumbers,
    }),
  });
}

export function getRegistryRequest(accessToken, operationId) {
  return call(accessToken, \`/v1/partner/registry-requests/\${operationId}\`);
}`,
      python: `import os
import time
import uuid

import requests

API_URL = "https://api.aferis.ai"


def uuid7() -> str:
    # UUIDv7: 48 bits de milissegundos + bits aleatórios (RFC 9562).
    # No Python 3.14 ou mais novo, use uuid.uuid7().
    raw = bytearray(os.urandom(16))
    raw[0:6] = (time.time_ns() // 1_000_000).to_bytes(6, "big")
    raw[6] = (raw[6] & 0x0F) | 0x70  # versão 7
    raw[8] = (raw[8] & 0x3F) | 0x80  # variante
    return str(uuid.UUID(bytes=bytes(raw)))


def call(access_token: str, method: str, path: str, **kwargs) -> dict:
    headers = {"Authorization": f"Bearer {access_token}", **kwargs.pop("headers", {})}
    response = requests.request(method, f"{API_URL}{path}", headers=headers, timeout=15, **kwargs)
    body = response.json()
    if not response.ok:
        raise RuntimeError(body.get("detail") or body.get("title"))
    return body


def create_registry_request(access_token, idempotency_key, office_id, registration_numbers):
    # Gere a chave uma vez por pedido novo e guarde-a antes de enviar: se a resposta se
    # perder, reenvie o mesmo corpo com a mesma chave e o servidor devolve o pedido já criado.
    return call(
        access_token,
        "POST",
        "/v1/partner/registry-requests/number",
        headers={"Idempotency-Key": idempotency_key},
        json={
            "product": "visualizacao",
            "office_id": office_id,
            "registration_numbers": registration_numbers,
        },
    )


def get_registry_request(access_token, operation_id):
    return call(access_token, "GET", f"/v1/partner/registry-requests/{operation_id}")`,
      java: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.UUID;

class RegistryRequests {
  static final String API_URL = "https://api.aferis.ai";
  static final HttpClient HTTP = HttpClient.newHttpClient();
  static final SecureRandom RANDOM = new SecureRandom();

  // UUIDv7: 48 bits de milissegundos + bits aleatórios (RFC 9562)
  static UUID uuidV7() {
    byte[] b = new byte[16];
    RANDOM.nextBytes(b);
    long ms = System.currentTimeMillis();
    for (int i = 0; i < 6; i++) b[i] = (byte) (ms >>> (8 * (5 - i)));
    b[6] = (byte) ((b[6] & 0x0F) | 0x70); // versão 7
    b[8] = (byte) ((b[8] & 0x3F) | 0x80); // variante
    ByteBuffer buffer = ByteBuffer.wrap(b);
    return new UUID(buffer.getLong(), buffer.getLong());
  }

  static String send(HttpRequest.Builder builder, String accessToken) throws Exception {
    HttpRequest request = builder
        .timeout(Duration.ofSeconds(15))
        .header("Authorization", "Bearer " + accessToken)
        .build();
    HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
    if (response.statusCode() >= 400) {
      throw new IllegalStateException("HTTP " + response.statusCode() + ": " + response.body());
    }
    return response.body(); // JSON do pedido
  }

  // Gere a chave uma vez por pedido novo e guarde-a antes de enviar: se a resposta se
  // perder, reenvie o mesmo corpo com a mesma chave e o servidor devolve o pedido já criado.
  static String create(String accessToken, UUID idempotencyKey, String officeId,
      String registrationNumber) throws Exception {
    String json = """
        {"product": "visualizacao", "office_id": "%s", "registration_numbers": ["%s"]}
        """.formatted(officeId, registrationNumber);
    return send(HttpRequest.newBuilder(URI.create(API_URL + "/v1/partner/registry-requests/number"))
        .header("Idempotency-Key", idempotencyKey.toString())
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(json)), accessToken);
  }

  static String get(String accessToken, String operationId) throws Exception {
    return send(HttpRequest.newBuilder(
        URI.create(API_URL + "/v1/partner/registry-requests/" + operationId)).GET(), accessToken);
  }
}`,
      csharp: `using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Threading.Tasks;

static class RegistryRequests
{
    const string ApiUrl = "https://api.aferis.ai";
    static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(15) };

    // UUIDv7: 48 bits de milissegundos + bits aleatórios (RFC 9562)
    public static string UuidV7()
    {
        var b = RandomNumberGenerator.GetBytes(16);
        var ms = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        for (var i = 0; i < 6; i++) b[i] = (byte)(ms >> (8 * (5 - i)));
        b[6] = (byte)((b[6] & 0x0F) | 0x70); // versão 7
        b[8] = (byte)((b[8] & 0x3F) | 0x80); // variante
        var h = Convert.ToHexString(b).ToLowerInvariant();
        return $"{h[..8]}-{h[8..12]}-{h[12..16]}-{h[16..20]}-{h[20..]}";
    }

    static async Task<string> SendAsync(HttpRequestMessage request, string accessToken)
    {
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        using var response = await Http.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"HTTP {(int)response.StatusCode}: {body}");
        return body; // JSON do pedido
    }

    // Gere a chave uma vez por pedido novo e guarde-a antes de enviar: se a resposta se
    // perder, reenvie o mesmo corpo com a mesma chave e o servidor devolve o pedido já criado.
    public static Task<string> CreateAsync(string accessToken, string idempotencyKey,
        string officeId, string registrationNumber)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"{ApiUrl}/v1/partner/registry-requests/number")
        {
            Content = JsonContent.Create(new
            {
                product = "visualizacao",
                office_id = officeId,
                registration_numbers = new[] { registrationNumber },
            }),
        };
        request.Headers.Add("Idempotency-Key", idempotencyKey);
        return SendAsync(request, accessToken);
    }

    public static Task<string> GetAsync(string accessToken, string operationId) =>
        SendAsync(new HttpRequestMessage(HttpMethod.Get,
            $"{ApiUrl}/v1/partner/registry-requests/{operationId}"), accessToken);
}`,
      go: `package main

import (
	"bytes"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const apiURL = "https://api.aferis.ai"

var httpClient = &http.Client{Timeout: 15 * time.Second}

// UUIDv7: 48 bits de milissegundos + bits aleatórios (RFC 9562)
func uuidV7() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	ms := uint64(time.Now().UnixMilli())
	for i := 0; i < 6; i++ {
		b[i] = byte(ms >> (8 * (5 - i)))
	}
	b[6] = b[6]&0x0f | 0x70 // versão 7
	b[8] = b[8]&0x3f | 0x80 // variante
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

func send(request *http.Request, accessToken string) ([]byte, error) {
	request.Header.Set("Authorization", "Bearer "+accessToken)
	response, err := httpClient.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	body, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, err
	}
	if response.StatusCode >= 400 {
		return nil, fmt.Errorf("HTTP %d: %s", response.StatusCode, body)
	}
	return body, nil // JSON do pedido
}

// Gere a chave uma vez por pedido novo e guarde-a antes de enviar: se a resposta se
// perder, reenvie o mesmo corpo com a mesma chave e o servidor devolve o pedido já criado.
func createRegistryRequest(accessToken, idempotencyKey, officeID string, numbers []string) ([]byte, error) {
	payload, err := json.Marshal(map[string]any{
		"product":              "visualizacao",
		"office_id":            officeID,
		"registration_numbers": numbers,
	})
	if err != nil {
		return nil, err
	}
	request, err := http.NewRequest(http.MethodPost, apiURL+"/v1/partner/registry-requests/number", bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	request.Header.Set("Idempotency-Key", idempotencyKey)
	request.Header.Set("Content-Type", "application/json")
	return send(request, accessToken)
}

func getRegistryRequest(accessToken, operationID string) ([]byte, error) {
	request, err := http.NewRequest(http.MethodGet, apiURL+"/v1/partner/registry-requests/"+operationID, nil)
	if err != nil {
		return nil, err
	}
	return send(request, accessToken)
}`,
    },
  },
  "verify-webhook": {
    title: "Validar a assinatura do webhook",
    description:
      "Recalcula o HMAC-SHA256 sobre o carimbo e os bytes exatos recebidos e compara em tempo constante.",
    variants: {
      node: `import { createHmac, timingSafeEqual } from "node:crypto";

// rawBody: os bytes exatos recebidos (não reserialize o JSON)
// carimbo: o cabeçalho X-Aferis-Timestamp, tal como veio
export function assinaturaValida(rawBody, carimbo, cabecalho, segredo) {
  const assinado = Buffer.concat([Buffer.from(carimbo + "."), rawBody]);
  const esperado = "sha256=" + createHmac("sha256", segredo).update(assinado).digest("hex");
  const a = Buffer.from(esperado);
  const b = Buffer.from(cabecalho ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}
// Recomendado: rejeite o evento se o carimbo estiver muito distante da hora atual
// (por exemplo, mais de 5 minutos) para barrar repetições antigas.`,
      python: `import hashlib
import hmac

def assinatura_valida(raw_body: bytes, carimbo: str, cabecalho: str, segredo: str) -> bool:
    # raw_body: os bytes exatos recebidos (não reserialize o JSON)
    # carimbo: o cabeçalho X-Aferis-Timestamp, tal como veio
    assinado = carimbo.encode("ascii") + b"." + raw_body
    esperado = "sha256=" + hmac.new(segredo.encode("ascii"), assinado, hashlib.sha256).hexdigest()
    return hmac.compare_digest(esperado, cabecalho or "")
# Recomendado: rejeite o evento se o carimbo estiver muito distante da hora atual
# (por exemplo, mais de 5 minutos) para barrar repetições antigas.`,
      java: `import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

class WebhookSignature {
  // rawBody: os bytes exatos recebidos (não reserialize o JSON)
  // carimbo: o cabeçalho X-Aferis-Timestamp, tal como veio
  static boolean assinaturaValida(byte[] rawBody, String carimbo, String cabecalho,
      String segredo) throws Exception {
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(segredo.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    mac.update((carimbo + ".").getBytes(StandardCharsets.UTF_8));
    mac.update(rawBody);
    String esperado = "sha256=" + HexFormat.of().formatHex(mac.doFinal());
    return MessageDigest.isEqual(
        esperado.getBytes(StandardCharsets.UTF_8),
        (cabecalho == null ? "" : cabecalho).getBytes(StandardCharsets.UTF_8));
  }
  // Recomendado: rejeite o evento se o carimbo estiver muito distante da hora atual
  // (por exemplo, mais de 5 minutos) para barrar repetições antigas.
}`,
      csharp: `using System;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

static class WebhookSignature
{
    // rawBody: os bytes exatos recebidos (não reserialize o JSON)
    // carimbo: o cabeçalho X-Aferis-Timestamp, tal como veio
    public static bool AssinaturaValida(byte[] rawBody, string carimbo, string? cabecalho, string segredo)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(segredo));
        var assinado = Encoding.ASCII.GetBytes(carimbo + ".").Concat(rawBody).ToArray();
        var esperado = "sha256=" + Convert.ToHexString(hmac.ComputeHash(assinado)).ToLowerInvariant();
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(esperado),
            Encoding.UTF8.GetBytes(cabecalho ?? ""));
    }
    // Recomendado: rejeite o evento se o carimbo estiver muito distante da hora atual
    // (por exemplo, mais de 5 minutos) para barrar repetições antigas.
}`,
      go: `package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
)

// rawBody: os bytes exatos recebidos (não reserialize o JSON)
// carimbo: o cabeçalho X-Aferis-Timestamp, tal como veio
func assinaturaValida(rawBody []byte, carimbo, cabecalho, segredo string) bool {
	mac := hmac.New(sha256.New, []byte(segredo))
	mac.Write([]byte(carimbo + "."))
	mac.Write(rawBody)
	esperado := "sha256=" + hex.EncodeToString(mac.Sum(nil))
	return subtle.ConstantTimeCompare([]byte(esperado), []byte(cabecalho)) == 1
}

// Recomendado: rejeite o evento se o carimbo estiver muito distante da hora atual
// (por exemplo, mais de 5 minutos) para barrar repetições antigas.`,
    },
  },
} satisfies Record<string, CodeSample>;

export type IntegrationSampleId = keyof typeof integrationSamples;
