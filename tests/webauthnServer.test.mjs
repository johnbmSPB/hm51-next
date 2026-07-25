import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
  randomBytes,
  sign,
} from "node:crypto";
import test from "node:test";

import {
  verifyAuthenticationCeremony,
  verifyRegistrationCeremony,
} from "../app/lib/webauthnServer.ts";

function b64(value) {
  return Buffer.from(value).toString("base64url");
}

function cborLength(major, length) {
  if (length < 24) return Buffer.from([(major << 5) | length]);
  if (length < 256) return Buffer.from([(major << 5) | 24, length]);
  if (length < 65536) {
    const result = Buffer.alloc(3);
    result[0] = (major << 5) | 25;
    result.writeUInt16BE(length, 1);
    return result;
  }
  throw new Error("test cbor length too large");
}

function cbor(value) {
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    const bytes = Buffer.from(value);
    return Buffer.concat([cborLength(2, bytes.length), bytes]);
  }
  if (typeof value === "string") {
    const text = Buffer.from(value, "utf8");
    return Buffer.concat([cborLength(3, text.length), text]);
  }
  if (typeof value === "number") {
    if (value >= 0) return cborLength(0, value);
    return cborLength(1, -1 - value);
  }
  if (value instanceof Map) {
    const parts = [cborLength(5, value.size)];
    for (const [key, item] of value.entries()) parts.push(cbor(key), cbor(item));
    return Buffer.concat(parts);
  }
  throw new Error(`unsupported test cbor value: ${typeof value}`);
}

function state(kind, challenge, credentialId = "") {
  return {
    version: 1,
    kind,
    challenge,
    login: "evgeni",
    rpID: "hm51-next.vercel.app",
    origin: "https://hm51-next.vercel.app",
    ...(credentialId ? { credentialId } : {}),
    expiresAt: Date.now() + 60_000,
  };
}

test("registration extracts the authenticator key from attested data", () => {
  const { publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const jwk = publicKey.export({ format: "jwk" });
  const credentialIdBytes = randomBytes(32);
  const credentialId = b64(credentialIdBytes);
  const challenge = b64(randomBytes(32));
  const ceremony = state("register", challenge);

  const clientDataJSON = Buffer.from(
    JSON.stringify({
      type: "webauthn.create",
      challenge,
      origin: ceremony.origin,
      crossOrigin: false,
    })
  );

  const coseKey = new Map([
    [1, 2],
    [3, -7],
    [-1, 1],
    [-2, Buffer.from(jwk.x, "base64url")],
    [-3, Buffer.from(jwk.y, "base64url")],
  ]);
  const rpHash = createHash("sha256").update(ceremony.rpID).digest();
  const fixed = Buffer.alloc(37);
  rpHash.copy(fixed, 0);
  fixed[32] = 0x45;
  fixed.writeUInt32BE(0, 33);
  const credentialLength = Buffer.alloc(2);
  credentialLength.writeUInt16BE(credentialIdBytes.length);
  const authData = Buffer.concat([
    fixed,
    Buffer.alloc(16),
    credentialLength,
    credentialIdBytes,
    cbor(coseKey),
  ]);
  const attestationObject = cbor(
    new Map([
      ["fmt", "none"],
      ["attStmt", new Map()],
      ["authData", authData],
    ])
  );

  const credential = verifyRegistrationCeremony(
    {
      id: credentialId,
      rawId: credentialId,
      type: "public-key",
      response: {
        clientDataJSON: b64(clientDataJSON),
        attestationObject: b64(attestationObject),
        transports: ["internal"],
      },
    },
    ceremony,
    "Evgeni"
  );

  assert.equal(credential.credentialId, credentialId);
  assert.equal(credential.algorithm, -7);
  assert.equal(credential.publicKeyJwk.x, jwk.x);
  assert.equal(credential.publicKeyJwk.y, jwk.y);
  assert.equal(credential.login, "evgeni");
});

test("authentication verifies the device signature and advances the counter", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const jwk = publicKey.export({ format: "jwk" });
  const credentialId = b64(randomBytes(32));
  const challenge = b64(randomBytes(32));
  const ceremony = state("authenticate", challenge, credentialId);
  const clientDataJSON = Buffer.from(
    JSON.stringify({
      type: "webauthn.get",
      challenge,
      origin: ceremony.origin,
      crossOrigin: false,
    })
  );
  const authenticatorData = Buffer.alloc(37);
  createHash("sha256").update(ceremony.rpID).digest().copy(authenticatorData, 0);
  authenticatorData[32] = 0x05;
  authenticatorData.writeUInt32BE(2, 33);
  const signedData = Buffer.concat([
    authenticatorData,
    createHash("sha256").update(clientDataJSON).digest(),
  ]);
  const signature = sign("sha256", signedData, privateKey);

  const updated = verifyAuthenticationCeremony(
    {
      id: credentialId,
      rawId: credentialId,
      type: "public-key",
      response: {
        clientDataJSON: b64(clientDataJSON),
        authenticatorData: b64(authenticatorData),
        signature: b64(signature),
        userHandle: null,
      },
    },
    ceremony,
    {
      version: 1,
      login: "evgeni",
      credentialId,
      publicKeyJwk: jwk,
      algorithm: -7,
      counter: 1,
      transports: ["internal"],
      rpID: ceremony.rpID,
      createdAt: Date.now() - 1_000,
      updatedAt: Date.now() - 1_000,
    }
  );

  assert.equal(updated.counter, 2);
});

test("authentication rejects a response for another challenge", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const credentialId = b64(randomBytes(32));
  const expected = state("authenticate", b64(randomBytes(32)), credentialId);
  const wrongChallenge = b64(randomBytes(32));
  const clientDataJSON = Buffer.from(
    JSON.stringify({
      type: "webauthn.get",
      challenge: wrongChallenge,
      origin: expected.origin,
      crossOrigin: false,
    })
  );
  const authenticatorData = Buffer.alloc(37);
  createHash("sha256").update(expected.rpID).digest().copy(authenticatorData, 0);
  authenticatorData[32] = 0x05;
  const signature = sign(
    "sha256",
    Buffer.concat([
      authenticatorData,
      createHash("sha256").update(clientDataJSON).digest(),
    ]),
    privateKey
  );

  assert.throws(
    () =>
      verifyAuthenticationCeremony(
        {
          id: credentialId,
          rawId: credentialId,
          type: "public-key",
          response: {
            clientDataJSON: b64(clientDataJSON),
            authenticatorData: b64(authenticatorData),
            signature: b64(signature),
          },
        },
        expected,
        {
          version: 1,
          login: "evgeni",
          credentialId,
          publicKeyJwk: publicKey.export({ format: "jwk" }),
          algorithm: -7,
          counter: 0,
          transports: ["internal"],
          rpID: expected.rpID,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
      ),
    /WEBAUTHN_CLIENT_DATA_INVALID/
  );
});
