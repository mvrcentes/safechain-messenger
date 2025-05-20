import { concatUint8Arrays, encryptAESGCM, hkdf, importPemKey } from "../crypto"

// ✅ Importa todas las llaves necesarias (privadas y públicas)
export async function importAllKeys({
  IK_priv,
  EK_priv,
  IK_pub,
  SPK_pub,
  OPK_pub,
}) {
  const [IK_A_priv, EK_A_priv, IK_B_pub, SPK_B_pub, OPK_B_pub] =
    await Promise.all([
      importPemKey(
        IK_priv,
        "pkcs8",
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveBits"]
      ),
      importPemKey(
        EK_priv,
        "pkcs8",
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveBits"]
      ),
      importPemKey(
        IK_pub,
        "spki",
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
      ),
      importPemKey(
        SPK_pub,
        "spki",
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
      ),
      importPemKey(
        OPK_pub,
        "spki",
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
      ),
    ])
  return { IK_A_priv, EK_A_priv, IK_B_pub, SPK_B_pub, OPK_B_pub }
}

// ✅ Deriva el secreto compartido K_AB
export async function deriveSharedSecret({
  IK_A_priv,
  EK_A_priv,
  IK_B_pub,
  SPK_B_pub,
  OPK_B_pub,
}) {
  const DH1 = await crypto.subtle.deriveBits(
    { name: "ECDH", public: IK_B_pub },
    EK_A_priv,
    256
  )
  // DH2 removed for compatibility
  const DH3 = await crypto.subtle.deriveBits(
    { name: "ECDH", public: SPK_B_pub },
    EK_A_priv,
    256
  )
  const DH4 = await crypto.subtle.deriveBits(
    { name: "ECDH", public: OPK_B_pub },
    EK_A_priv,
    256
  )

  const K_input = concatUint8Arrays(
    new Uint8Array(DH1),
    new Uint8Array(DH3),
    new Uint8Array(DH4)
  )

  const K_AB = await hkdf(K_input, 32)
  return K_AB
}

// ✅ Cifra el k_group usando AES-GCM y el secreto compartido
export async function encryptKeyWithSharedSecret(kGroup, K_AB) {
  return await encryptAESGCM(kGroup, K_AB)
}
