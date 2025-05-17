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
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    )
  }

  function exportKey(key, type) {
    return crypto.subtle.exportKey(type, key).then((buffer) => {
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
      const header = type === "pkcs8" ? "PRIVATE KEY" : "PUBLIC KEY"
      return `-----BEGIN ${header}-----\n${base64.match(/.{1,64}/g).join("\n")}\n-----END ${header}-----`
    })
  }

  const [ik, spk, ...opks] = await Promise.all([
    generateKeyPair(),
    generateKeyPair(),
    generateKeyPair(),
    generateKeyPair(),
    generateKeyPair(),
    generateKeyPair(),
    generateKeyPair(),
  ])

  const ikPub = await exportKey(ik.publicKey, "spki")
  const ikPriv = await exportKey(ik.privateKey, "pkcs8")

  const spkPub = await exportKey(spk.publicKey, "spki")
  const spkPriv = await exportKey(spk.privateKey, "pkcs8")

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
      IK: ikPriv,
      SPK: spkPriv,
      OPKs: opkPairs.map((o) => o.priv),
    },
  }
}
