export async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function encryptWithPublicKey(publicKeyPem, message) {
  const encoder = new TextEncoder()
  const encodedMessage = encoder.encode(message)

  // Convert PEM to binary
  const pemHeader = "-----BEGIN PUBLIC KEY-----"
  const pemFooter = "-----END PUBLIC KEY-----"
  const pemContents = publicKeyPem
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "")
  const binaryDerString = atob(pemContents)
  const binaryDer = new Uint8Array(
    [...binaryDerString].map((char) => char.charCodeAt(0))
  )

  const key = await crypto.subtle.importKey(
    "spki",
    binaryDer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["encrypt"]
  )

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    key,
    encodedMessage
  )

  return btoa(String.fromCharCode(...new Uint8Array(encrypted)))
}

export async function decryptWithPrivateKey(
  privateKeyPem,
  encryptedMessageBase64
) {
  const pemHeader = "-----BEGIN PRIVATE KEY-----"
  const pemFooter = "-----END PRIVATE KEY-----"
  const pemContents = privateKeyPem
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "")
  const binaryDerString = atob(pemContents)
  const binaryDer = new Uint8Array(
    [...binaryDerString].map((char) => char.charCodeAt(0))
  )

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["decrypt"]
  )

  const encryptedData = Uint8Array.from(atob(encryptedMessageBase64), (c) =>
    c.charCodeAt(0)
  )

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    key,
    encryptedData
  )

  return new TextDecoder().decode(decrypted)
}

export async function generatePreKeys() {
  async function generateKeyPair() {
    return crypto.subtle.generateKey(
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true,
      ["deriveKey", "deriveBits"]
    )
  }

  function exportKey(key, type) {
    return crypto.subtle.exportKey(type, key).then((buffer) => {
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
      const header = type === "pkcs8" ? "PRIVATE KEY" : "PUBLIC KEY"
      return `-----BEGIN ${header}-----\n${base64
        .match(/.{1,64}/g)
        .join("\n")}\n-----END ${header}-----`
    })
  }

  const [ik, spk, ...opks] = await Promise.all([
    generateKeyPair(),
    generateKeyPair(),
    generateKeyPair(),
    generateKeyPair(),
    generateKeyPair(),
  ])

  const ikPub = await exportKey(ik.publicKey, "spki")
  const spkPub = await exportKey(spk.publicKey, "spki")

  const opkPairs = await Promise.all(
    opks.map(async (kp) => ({
      pub: await exportKey(kp.publicKey, "spki"),
      priv: await exportKey(kp.privateKey, "pkcs8"),
    }))
  )

  return {
    publicKeys: [
      { type: "IK", publicKey: ikPub },
      { type: "SPK", publicKey: spkPub },
      ...opkPairs.map((opk) => ({ type: "OPK", publicKey: opk.pub })),
    ],
    privateKeys: {
      IK: await exportKey(ik.privateKey, "pkcs8"),
      SPK: await exportKey(spk.privateKey, "pkcs8"),
      OPKs: await Promise.all(
        opks.map((kp) => exportKey(kp.privateKey, "pkcs8"))
      ),
      IK_pub: await exportKey(ik.publicKey, "spki"),
    },
  }
}

export async function importPublicKey(pem) {
  const pemContents = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, "")
    .replace(/-----END PUBLIC KEY-----/, "")
    .replace(/\s/g, "")
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0))

  return crypto.subtle.importKey(
    "spki",
    binaryDer,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  )
}

export async function importPrivateKey(pem) {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "")
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0))

  return crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  )
}

// Generalized PEM key import function
export async function importPemKey(
  pem,
  format,
  algorithm,
  extractable,
  usages
) {
  const pemContents = pem
    .replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s/g, "")
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0))

  return crypto.subtle.importKey(
    format,
    binaryDer,
    algorithm,
    extractable,
    usages
  )
}

export async function safeImportPublicKey(pem) {
  if (typeof pem !== "string") {
    throw new Error("❌ La clave pública PEM no es un string válido.")
  }

  const pemContents = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, "")
    .replace(/-----END PUBLIC KEY-----/, "")
    .replace(/\s/g, "")

  try {
    const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0))

    return crypto.subtle.importKey(
      "spki",
      binaryDer,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      []
    )
  } catch (err) {
    console.error("❌ Error al importar la clave pública (safe):", err)
    throw new Error("❌ Error al decodificar e importar la clave pública.")
  }
}

// Generalized and safe PEM key import function
export async function safeImportPemKey({
  pem,
  format = "spki",
  algorithm = { name: "ECDH", namedCurve: "P-256" },
  extractable = true,
  usages = [],
}) {
  if (typeof pem !== "string") {
    throw new Error("❌ La clave PEM proporcionada no es un string válido.")
  }

  const pemContents = pem
    .replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s/g, "")
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0))

  return crypto.subtle.importKey(
    format,
    binaryDer,
    algorithm,
    extractable,
    usages
  )
}

export async function deriveECDHSecret(privateKeyPem, publicKeyPem) {
  const privateKey = await importPrivateKey(privateKeyPem)
  const publicKey = await importPublicKey(publicKeyPem)

  const sharedSecret = await crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: publicKey,
    },
    privateKey,
    256
  )

  return new Uint8Array(sharedSecret)
}

// X3DH helpers for frontend group key distribution
export async function generateEphemeralKey() {
  return crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  )
}

export function concatUint8Arrays(...arrays) {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

export async function hkdf(inputKeyingMaterial, length = 32) {
  const salt = new Uint8Array(length).fill(0)
  const ikmKey = await crypto.subtle.importKey(
    "raw",
    inputKeyingMaterial,
    "HKDF",
    false,
    ["deriveBits"]
  )
  const derived = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info: new Uint8Array([]),
    },
    ikmKey,
    length * 8
  )
  return new Uint8Array(derived)
}

export function encryptAESGCM(plaintext, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12)) // 96-bit IV recomendado para AES-GCM
  return crypto.subtle
    .importKey("raw", key, "AES-GCM", false, ["encrypt"])
    .then((cryptoKey) =>
      crypto.subtle
        .encrypt({ name: "AES-GCM", iv }, cryptoKey, plaintext)
        .then((encrypted) => {
          const combined = new Uint8Array(iv.length + encrypted.byteLength)
          combined.set(iv)
          combined.set(new Uint8Array(encrypted), iv.length)
          return btoa(String.fromCharCode(...combined))
        })
    )
}

export async function exportKey(key, type = "spki") {
  const exported = await crypto.subtle.exportKey(type, key)
  const base64 = btoa(String.fromCharCode(...new Uint8Array(exported)))

  const header = type === "pkcs8" ? "PRIVATE KEY" : "PUBLIC KEY"
  const pem = `-----BEGIN ${header}-----\n${base64
    .match(/.{1,64}/g)
    .join("\n")}\n-----END ${header}-----`

  return pem
}

export async function decryptAESGCM(encryptedBase64, keyBytes) {
  const raw = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0))
  const iv = raw.slice(0, 12)
  const data = raw.slice(12)

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  )

  console.log("🔑 Clave importada:", key)

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    key,
    data
  )

  console.log({ decrypted })

  return new TextDecoder().decode(decrypted)
}

/**
 * Decrypt AES-GCM ciphertext (Base64) and return raw bytes.
 * Use for decrypting binary data (like group keys).
 */
export async function decryptAESGCMBytes(encryptedBase64, keyBytes) {
  const raw = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0))
  const iv = raw.slice(0, 12)
  const data = raw.slice(12)

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  )

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    key,
    data
  )
  return new Uint8Array(decrypted)
}

export function uint8ToBase64(u8Arr) {
  return btoa(String.fromCharCode(...u8Arr))
}

export function base64ToUint8(base64Str) {
  const cleaned = base64Str.replace(/\s+/g, "")
  try {
    return Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0))
  } catch (err) {
    console.error("❌ Error al convertir base64:", cleaned)
    throw err
  }
}

export async function hashPublicKey(pem) {
  if (typeof pem !== "string") {
    throw new Error("❌ La clave debe ser un string")
  }

  const clean = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, "")
    .replace(/-----END PUBLIC KEY-----/, "")
    .replace(/\s+/g, "") // 🔥 elimina todos los espacios y saltos

  if (!/^[A-Za-z0-9+/=]+$/.test(clean)) {
    console.error("❌ Base64 inválido:", clean)
    const preview = clean.slice(0, 100)
    throw new Error(
      `Clave pública contiene caracteres inválidos. Fragmento: ${preview}`
    )
  }

  const raw = base64ToUint8(clean)
  console.log("🔍 Base64 limpio:", clean)
  console.log("🧬 Uint8Array (raw):", raw)

  const hashBuffer = await crypto.subtle.digest("SHA-256", raw)
  const hashArray = new Uint8Array(hashBuffer)
  console.log("📦 Hash Uint8Array:", hashArray)
  const hashBase64 = btoa(String.fromCharCode(...hashArray))
  console.log("🔑 Hash final (Base64):", hashBase64)

  return hashBase64
}
