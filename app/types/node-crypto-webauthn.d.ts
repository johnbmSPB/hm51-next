import "node:crypto";

type BrowserJsonWebKey = JsonWebKey;

declare module "node:crypto" {
  export function createPublicKey(key: {
    key: BrowserJsonWebKey;
    format: "jwk";
  }): KeyObject;
}
